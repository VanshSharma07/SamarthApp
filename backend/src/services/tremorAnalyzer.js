import fftjs from 'fft-js';

const { fft, util: fftUtil } = fftjs;

const DEFAULT_SAMPLE_RATE = 200; // Hz
const WINDOW_SECONDS = 5; // sliding buffer length
const MIN_SECONDS = 3; // minimum data required before computing metrics
const PEAK_BAND = { low: 2, high: 12 }; // Hz band to search for dominant peak
const POWER_BAND = { low: 3, high: 7 }; // Hz band for RMS/energy

function hannWindow(len) {
  const w = new Array(len);
  for (let n = 0; n < len; n++) {
    w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (len - 1)));
  }
  return w;
}

function detrendAndWindow(signal) {
  const n = signal.length;
  const mean = signal.reduce((s, v) => s + v, 0) / n;
  const win = hannWindow(n);
  return signal.map((v, i) => (v - mean) * win[i]);
}

function computeFFT(signal, sampleRate) {
  if (signal.length < 2) return null;
  const padded = signal.slice();
  // zero-pad to power-of-two for fft-js best behavior
  const targetPow = Math.pow(2, Math.ceil(Math.log2(signal.length)));
  while (padded.length < targetPow) padded.push(0);
  const phasors = fft(padded);
  const freqs = fftUtil.fftFreq(phasors, sampleRate);
  const mags = fftUtil.fftMag(phasors);
  return { freqs, mags };
}

function findDominantPeak(freqs, mags, low, high) {
  const half = Math.floor(mags.length / 2);
  let best = { freq: null, mag: 0 };
  for (let i = 1; i < half; i++) {
    const f = Math.abs(freqs[i]);
    if (f < low || f > high) continue;
    if (mags[i] > best.mag) best = { freq: f, mag: mags[i] };
  }
  return best.freq ? best : { freq: null, mag: null };
}

function bandPower(freqs, mags, low, high) {
  const half = Math.floor(mags.length / 2);
  let power = 0;
  for (let i = 1; i < half; i++) {
    const f = Math.abs(freqs[i]);
    if (f < low || f > high) continue;
    power += mags[i] * mags[i];
  }
  return power === 0 ? null : power;
}

class TremorAnalyzer {
  constructor({ windowSeconds = WINDOW_SECONDS, minSeconds = MIN_SECONDS } = {}) {
    this.windowSeconds = windowSeconds;
    this.minSeconds = minSeconds;
    this.devices = new Map(); // deviceId -> { samples: [{t,v}], sampleRate }
    this.viewers = new Set(); // websocket viewers to broadcast summaries
  }

  addViewer(ws) {
    this.viewers.add(ws);
  }

  removeViewer(ws) {
    this.viewers.delete(ws);
  }

  broadcast(summary) {
    const msg = JSON.stringify(summary);
    for (const ws of this.viewers) {
      try { ws.send(msg); } catch (e) { /* ignore send errors */ }
    }
  }

  addSamples(deviceId, samples, sampleRate) {
    const rate = Number(sampleRate) > 0 ? Number(sampleRate) : DEFAULT_SAMPLE_RATE;
    if (!deviceId) deviceId = 'unknown';
    if (!Array.isArray(samples) || samples.length === 0) {
      console.warn(`[TremorAnalyzer] Empty samples array for ${deviceId}`);
      return null;
    }

    const state = this._getState(deviceId, rate);
    // ingest samples: compute gyro magnitude from gx, gy, gz
    for (const s of samples) {
      const tsUs = Number(s.timestamp_us ?? s.t_us ?? s.timestamp ?? Date.now() * 1000);
      const tsMs = Number.isFinite(tsUs) && tsUs > 1e6 ? tsUs / 1000 : Date.now();
      const gx = Number(s.gx) || 0;
      const gy = Number(s.gy) || 0;
      const gz = Number(s.gz) || 0;
      const omega = Math.sqrt(gx * gx + gy * gy + gz * gz);
      state.samples.push({ t: tsMs, v: omega });
    }

    // prune to windowSeconds using timestamps
    const newestTs = state.samples[state.samples.length - 1]?.t ?? Date.now();
    const cutoff = newestTs - this.windowSeconds * 1000;
    while (state.samples.length && state.samples[0].t < cutoff) {
      state.samples.shift();
    }

    // also cap by count derived from sampleRate
    const maxCount = Math.ceil(this.windowSeconds * rate * 1.2); // small slack
    if (state.samples.length > maxCount) {
      state.samples.splice(0, state.samples.length - maxCount);
    }

    const durationSec = state.samples.length > 1 ? (state.samples[state.samples.length - 1].t - state.samples[0].t) / 1000 : 0;
    if (durationSec < this.minSeconds) {
      // Still buffering, not enough data yet
      const summary = {
        type: 'summary',
        deviceId,
        sampleRate: rate,
        windowDurationSec: Number(durationSec.toFixed(3)),
        dominantFrequencyHz: 0,
        dominantAmplitude: 0,
        bandPower3to7Hz: 0,
        bufferStatus: `Buffering (${state.samples.length} samples, need ${Math.round(this.minSeconds * rate)})`,
        timestamp: Date.now()
      };
      this.broadcast(summary);
      return summary;
    }

    // Build uniform signal: assume near-uniform sampling at rate Hz, take last N samples equal to expected length
    const expectedCount = Math.min(state.samples.length, Math.round(durationSec * rate));
    const tail = state.samples.slice(-expectedCount).map(s => s.v);
    const windowed = detrendAndWindow(tail);
    const fftRes = computeFFT(windowed, rate);
    if (!fftRes) {
      console.warn(`[TremorAnalyzer] FFT failed for ${deviceId}`);
      return null;
    }

    const peak = findDominantPeak(fftRes.freqs, fftRes.mags, PEAK_BAND.low, PEAK_BAND.high);
    const bandPwr = bandPower(fftRes.freqs, fftRes.mags, POWER_BAND.low, POWER_BAND.high);

    const summary = {
      type: 'summary',
      deviceId,
      sampleRate: rate,
      windowDurationSec: Number(durationSec.toFixed(3)),
      dominantFrequencyHz: peak.freq ? Number(peak.freq.toFixed(2)) : 0,
      dominantAmplitude: peak.mag ? Number(peak.mag.toFixed(3)) : 0,
      bandPower3to7Hz: bandPwr ? Number(bandPwr.toFixed(3)) : 0,
      timestamp: Date.now()
    };

    console.log(`[TremorAnalyzer] ${deviceId}: freq=${summary.dominantFrequencyHz}Hz, amp=${summary.dominantAmplitude}, dur=${durationSec.toFixed(2)}s`);

    this.broadcast(summary);
    return summary;
  }

  _getState(deviceId, sampleRate) {
    let st = this.devices.get(deviceId);
    if (!st) {
      st = { samples: [], sampleRate };
      this.devices.set(deviceId, st);
    } else {
      st.sampleRate = sampleRate;
    }
    return st;
  }
}

export const tremorAnalyzer = new TremorAnalyzer();
export default tremorAnalyzer;
