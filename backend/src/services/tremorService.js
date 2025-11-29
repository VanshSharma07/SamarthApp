import TremorAssessment from '../models/TremorAssessment.js';
import fftjs from 'fft-js';
const { fft, util: fftUtil } = fftjs;

// Simple streaming tremor service that accepts raw sensor values
// from devices (ESP32) and computes frequency/amplitude using FFT.

// Buffering and viewers
const deviceBuffers = new Map(); // deviceId -> { samples: [], timestamps: [] }
const viewers = new Set(); // websocket viewers (frontend connections)

// Normalize / sanitize device IDs to a safe canonical form
function sanitizeDeviceId(raw) {
  if (!raw) return 'unknown';
  let s = String(raw);
  // remove common separators and whitespace
  s = s.replace(/[:\-\s]/g, '');
  // keep only alphanumeric and underscore, replace others with underscore
  s = s.replace(/[^A-Za-z0-9_]/g, '_');
  s = s.toLowerCase();
  if (s.length === 0) return 'unknown';
  if (s.length > 64) s = s.slice(0, 64);
  return s;
}

// Configuration
const DEFAULT_SAMPLE_RATE = 50; // Hz (ESP32 sends every ~20ms by default)
const FFT_WINDOW = 256; // number of samples for FFT (power of two)
const MIN_WINDOW = 64;
const BAND_LOW = 0.5;
const BAND_HIGH = 20.0;

function mapTremorTypeFromFrequency(freq) {
  if (!freq || freq <= 0) return 'None';
  if (freq < 2) return 'Very Slow';
  if (freq >=2 && freq < 4) return 'Slow Tremor';
  if (freq >=4 && freq < 7) return 'Resting';
  if (freq >=7 && freq < 12) return 'Postural';
  if (freq >= 12) return 'Action/Intention';
  return 'Irregular';
}

function calculateTremorScore(metrics) {
  let frequencyFactor = 0;
  if (metrics.tremor_frequency > 0) {
    frequencyFactor = Math.min(100, metrics.tremor_frequency * 8.33);
  }
  const amplitudeFactor = Math.min(100, metrics.tremor_amplitude || 0);
  const tremorScore = (frequencyFactor * 0.4 + amplitudeFactor * 0.6);
  return Math.min(100, Math.max(0, tremorScore));
}

function computeFrequencyAndAmplitude(samples, sampleRate = DEFAULT_SAMPLE_RATE) {
  try {
    const N = samples.length;
    if (N < MIN_WINDOW) return null;

    // window the samples (remove DC)
    const mean = samples.reduce((s, v) => s + v, 0) / N;
    const signal = samples.map(v => v - mean);

    // zero-pad or trim to nearest power-of-two length for FFT
    let M = FFT_WINDOW;
    if (N < FFT_WINDOW) {
      // pad
      const padded = signal.slice();
      while (padded.length < M) padded.push(0);
      signal.length = M; // ensure
      for (let i = 0; i < M; i++) signal[i] = padded[i] || 0;
    } else if (N > M) {
      signal.length = M; // trim
    }

    const phasors = fft(signal);
    const frequencies = fftUtil.fftFreq(phasors, sampleRate);
    const magnitudes = fftUtil.fftMag(phasors);

    // Only consider positive freqs
    const half = Math.floor(magnitudes.length / 2);
    let peakIdx = 1;
    let peakMag = 0;
    for (let i = 1; i < half; i++) {
      if (magnitudes[i] > peakMag) {
        peakMag = magnitudes[i];
        peakIdx = i;
      }
    }

    const frequency = Math.abs(frequencies[peakIdx]) || 0;
    // amplitude: normalize peak magnitude relative to RMS
    const rms = Math.sqrt(signal.reduce((a, b) => a + b*b, 0) / signal.length) || 1e-6;
    const amplitude = peakMag / rms;

    return {
      frequency: Number(frequency.toFixed(2)),
      amplitude: Number(amplitude.toFixed(2)),
      peakMagnitude: Number(peakMag.toFixed(2))
    };
  } catch (error) {
    console.error('FFT error', error);
    return null;
  }
}

// Compute Welch PSD for a 1D signal using overlapping windows
function welchPSD(signal, sampleRate, windowSec = 2.0, overlap = 0.5) {
  const N = signal.length;
  const winLen = Math.max(MIN_WINDOW, Math.floor(windowSec * sampleRate));
  const step = Math.floor(winLen * (1 - overlap));
  if (winLen <= 0 || step <= 0 || N < winLen) return null;

  const windows = [];
  for (let start = 0; start + winLen <= N; start += step) {
    windows.push(signal.slice(start, start + winLen));
  }
  if (windows.length === 0) return null;

  // Precompute Hann window
  const hann = new Array(winLen).fill(0).map((_, n) => 0.5 * (1 - Math.cos((2 * Math.PI * n) / (winLen - 1))));

  let psdAcc = null;
  let freqs = null;

  for (const w of windows) {
    // detrend (remove mean)
    const mean = w.reduce((s, v) => s + v, 0) / w.length;
    const x = w.map((v, i) => (v - mean) * hann[i]);

    // zero-pad to FFT_WINDOW if needed
    const M = FFT_WINDOW;
    const padded = x.slice();
    while (padded.length < M) padded.push(0);
    if (padded.length > M) padded.length = M;

    const ph = fft(padded);
    const mags = fftUtil.fftMag(ph);
    // power spectrum (magnitude^2)
    const power = mags.map(m => m * m);

    // convert to one-sided PSD approx by taking first half
    const half = Math.floor(power.length / 2);
    const oneSide = power.slice(0, half);

    if (!psdAcc) {
      psdAcc = oneSide.slice();
      freqs = fftUtil.fftFreq(ph, sampleRate).slice(0, half);
    } else {
      for (let i = 0; i < oneSide.length; i++) psdAcc[i] += oneSide[i];
    }
  }

  // average
  for (let i = 0; i < psdAcc.length; i++) psdAcc[i] /= windows.length;

  return { freqs, psd: psdAcc };
}

function broadcastToViewers(data) {
  const msg = JSON.stringify(data);
  for (const ws of viewers) {
    try { ws.send(msg); } catch (e) {}
  }
}

export const tremorService = {
  async saveAssessment(assessmentData) {
    try {
      if (!assessmentData.userId || !assessmentData.metrics) {
        throw new Error('Missing required fields');
      }

      // Map tremor type
      if (assessmentData.metrics.tremor_type) {
        assessmentData.metrics.tremor_type = mapTremorTypeFromFrequency(assessmentData.metrics.tremor_frequency);
      }

      const tremorScore = calculateTremorScore(assessmentData.metrics);

      const formattedMetrics = {
        ...assessmentData.metrics,
        overall: { tremorScore }
      };

      const assessment = new TremorAssessment({
        userId: assessmentData.userId,
        timestamp: assessmentData.timestamp || new Date(),
        type: assessmentData.type || 'tremor',
        metrics: formattedMetrics
      });

      const saved = await assessment.save();
      if (!saved) throw new Error('Failed to save tremor assessment');

      return { success: true, data: { _id: saved._id, id: saved._id, ...saved.toObject() } };
    } catch (error) {
      console.error('Error in tremorService.saveAssessment:', error);
      throw error;
    }
  },

  async getHistory(userId, limit = 10) {
    try {
      return await TremorAssessment.find({ userId }).sort({ timestamp: -1 }).limit(limit).lean();
    } catch (error) {
      console.error('Error getting tremor assessment history:', error);
      throw error;
    }
  },

  async getBaseline(userId) {
    try {
      if (!userId) throw new Error('User ID is required');
      const baseline = await TremorAssessment.findOne({ userId, status: 'COMPLETED' }).sort({ timestamp: -1 }).lean();
      return baseline;
    } catch (error) {
      console.error('Error getting tremor baseline:', error);
      throw error;
    }
  },

  // Viewer registration for live updates
  registerViewer(ws) { viewers.add(ws); },
  unregisterViewer(ws) { viewers.delete(ws); },

  // Ingest a single sample from a device. deviceId optional.
  async ingestSample(deviceId = 'unknown', value, timestamp = Date.now()) {
    try {
      if (typeof value !== 'number' || Number.isNaN(value)) return;
      const key = sanitizeDeviceId(deviceId || 'unknown');
      let buf = deviceBuffers.get(key);
      if (!buf) {
        buf = { samples: [], timestamps: [] };
        deviceBuffers.set(key, buf);
      }

      buf.samples.push(value);
      buf.timestamps.push(timestamp);

      // Keep buffer bounded
      if (buf.samples.length > FFT_WINDOW * 2) {
        buf.samples.splice(0, buf.samples.length - FFT_WINDOW);
        buf.timestamps.splice(0, buf.timestamps.length - FFT_WINDOW);
      }

      // When we have enough samples, compute metrics
      if (buf.samples.length >= MIN_WINDOW) {
        // estimate sample rate from timestamps
        let sampleRate = DEFAULT_SAMPLE_RATE;
        if (buf.timestamps.length >= 2) {
          const deltas = [];
          for (let i = 1; i < buf.timestamps.length; i++) deltas.push(buf.timestamps[i] - buf.timestamps[i-1]);
          const avgMs = deltas.reduce((a,b)=>a+b,0)/deltas.length;
          if (avgMs > 1) sampleRate = Math.round(1000 / avgMs);
        }

        // pick last FFT_WINDOW samples for analysis
        const slice = buf.samples.slice(-FFT_WINDOW);
        const res = computeFrequencyAndAmplitude(slice, sampleRate);
        if (res) {
          const tremor_freq = res.frequency;
          const tremor_amp = Math.min(100, Math.abs(res.amplitude));
          const tremor_type = mapTremorTypeFromFrequency(tremor_freq);
          const severity = (calculateTremorScore({ tremor_frequency: tremor_freq, tremor_amplitude: tremor_amp }) >= 40) ? 'Moderate' : 'Mild';

          const metrics = {
            tremor_frequency: tremor_freq,
            tremor_amplitude: tremor_amp,
            tremor_type,
            severity,
            peak_count: 1,
            confidence: 1.0
          };

          // broadcast live metrics to viewers
          broadcastToViewers({ type: 'metrics', deviceId: key, metrics, timestamp: Date.now() });
        }
      }
    } catch (error) {
      console.error('Error ingesting sample:', error);
    }
  }
,

  // Ingest a batch of samples. `samples` is an array of objects like { timestamp, gx,gy,gz,ax,ay,az }
  async ingestBatch(deviceId = 'unknown', samples = [], sampleRate = DEFAULT_SAMPLE_RATE) {
    try {
      if (!Array.isArray(samples) || samples.length === 0) return;
      const key = sanitizeDeviceId(deviceId || 'unknown');
      let buf = deviceBuffers.get(key);
      if (!buf) {
        buf = { gx: [], gy: [], gz: [], ax: [], ay: [], az: [], timestamps: [] };
        deviceBuffers.set(key, buf);
      }

      for (const s of samples) {
        // accept both numeric arrays and objects
        const ts = s.timestamp || Date.now();
        const gx = (s.gx !== undefined) ? Number(s.gx) : (s.gy || s.gz) ? 0 : 0;
        const gy = (s.gy !== undefined) ? Number(s.gy) : 0;
        const gz = (s.gz !== undefined) ? Number(s.gz) : (s.value !== undefined ? Number(s.value) : 0);
        const ax = (s.ax !== undefined) ? Number(s.ax) : 0;
        const ay = (s.ay !== undefined) ? Number(s.ay) : 0;
        const az = (s.az !== undefined) ? Number(s.az) : 0;

        buf.gx.push(gx);
        buf.gy.push(gy);
        buf.gz.push(gz);
        buf.ax.push(ax);
        buf.ay.push(ay);
        buf.az.push(az);
        buf.timestamps.push(ts);
      }

      // Keep buffers bounded (store last ~ 5 * FFT_WINDOW samples)
      const maxKeep = FFT_WINDOW * 5;
      for (const k of ['gx','gy','gz','ax','ay','az','timestamps']) {
        if (buf[k].length > maxKeep) buf[k].splice(0, buf[k].length - maxKeep);
      }

      // Compose magnitude signals
      const N = Math.min(buf.gz.length, buf.ax.length);
      const magAcc = new Array(N);
      for (let i = 0; i < N; i++) {
        const vx = buf.ax[i], vy = buf.ay[i], vz = buf.az[i];
        magAcc[i] = Math.sqrt(vx*vx + vy*vy + vz*vz);
      }

      // Choose analysis signal: use gyroscope magnitude if available else accel magnitude
      const gyroMag = new Array(N);
      for (let i = 0; i < N; i++) gyroMag[i] = Math.sqrt(buf.gx[i]*buf.gx[i] + buf.gy[i]*buf.gy[i] + buf.gz[i]*buf.gz[i]);

      // Run Welch PSD on gyroMag and acc magnitude
      const gyroRes = welchPSD(gyroMag, sampleRate);
      const accRes = welchPSD(magAcc, sampleRate);

      let metrics = null;
      if (gyroRes && gyroRes.freqs && gyroRes.psd) {
        // find peak in band
        let bestIdx = -1; let bestVal = 0;
        for (let i = 0; i < gyroRes.freqs.length; i++) {
          const f = Math.abs(gyroRes.freqs[i]);
          if (f < BAND_LOW || f > BAND_HIGH) continue;
          if (gyroRes.psd[i] > bestVal) { bestVal = gyroRes.psd[i]; bestIdx = i; }
        }
        if (bestIdx >= 0) {
          const peakFreq = Math.abs(gyroRes.freqs[bestIdx]);
          // amplitude estimate from sqrt(power)
          const amplitude = Math.sqrt(bestVal);
          const tremor_type = mapTremorTypeFromFrequency(peakFreq);
          const severity = (calculateTremorScore({ tremor_frequency: peakFreq, tremor_amplitude: amplitude }) >= 40) ? 'Moderate' : 'Mild';

          // stability estimate: compute peak per window and variance
          const windowSec = 2.0; const overlap = 0.5;
          const winLen = Math.max(MIN_WINDOW, Math.floor(windowSec * sampleRate));
          const step = Math.floor(winLen * (1 - overlap));
          const peaks = [];
          for (let start = 0; start + winLen <= gyroMag.length; start += step) {
            const slice = gyroMag.slice(start, start + winLen);
            const res = welchPSD(slice, sampleRate);
            if (!res) continue;
            let bi = -1; let bv = 0;
            for (let i = 0; i < res.freqs.length; i++) {
              const f = Math.abs(res.freqs[i]);
              if (f < BAND_LOW || f > BAND_HIGH) continue;
              if (res.psd[i] > bv) { bv = res.psd[i]; bi = i; }
            }
            if (bi >= 0) peaks.push(Math.abs(res.freqs[bi]));
          }
          const stability = peaks.length > 1 ? (1 - (Math.sqrt(peaks.map(p => Math.pow(p - (peaks.reduce((a,b)=>a+b,0)/peaks.length),2)).reduce((a,b)=>a+b,0)/peaks.length) / (peaks.reduce((a,b)=>a+b,0)/peaks.length))) : 0;

          metrics = {
            tremor_frequency: Number(peakFreq.toFixed(2)),
            tremor_amplitude: Number(amplitude.toFixed(2)),
            tremor_type,
            severity,
            peak_count: 1,
            regularity: 0,
            stability: Number(stability.toFixed(2)),
            confidence: 1.0
          };
        }
      }

      if (metrics) {
        // ensure broadcast uses sanitized id
        broadcastToViewers({ type: 'metrics', deviceId: key, metrics, timestamp: Date.now() });
      }
    } catch (error) {
      console.error('Error ingesting batch:', error);
    }
  }
,
  // Return the latest raw buffer for a device (up to maxSamples)
  getLatestRaw(deviceId = 'unknown', maxSamples = FFT_WINDOW * 5) {
    const key = sanitizeDeviceId(deviceId || 'unknown');
    const buf = deviceBuffers.get(key);
    if (!buf) return null;

    // Buffer may be in two shapes: legacy `samples` array of numbers or structured gx/gy/gz arrays
    const result = { sampleRate: DEFAULT_SAMPLE_RATE, samples: [] };
    // estimate sampleRate from timestamps if available
    if (Array.isArray(buf.timestamps) && buf.timestamps.length >= 2) {
      const deltas = [];
      for (let i = 1; i < buf.timestamps.length; i++) deltas.push(buf.timestamps[i] - buf.timestamps[i-1]);
      const avgMs = deltas.reduce((a,b)=>a+b,0)/deltas.length;
      if (avgMs > 0) result.sampleRate = Math.round(1000/avgMs);
    }

    if (buf.samples && Array.isArray(buf.samples) && buf.samples.length > 0) {
      // legacy numeric samples (single value per sample)
      const start = Math.max(0, buf.samples.length - maxSamples);
      for (let i = start; i < buf.samples.length; i++) {
        result.samples.push({ timestamp: buf.timestamps ? buf.timestamps[i] : null, value: buf.samples[i] });
      }
      return result;
    }

    // structured buffers
    const len = Math.min(maxSamples, buf.timestamps.length || 0, buf.gz.length || 0);
    const start = Math.max(0, (buf.timestamps.length || 0) - len);
    for (let i = start; i < start + len; i++) {
      result.samples.push({
        timestamp: buf.timestamps[i] || null,
        gx: buf.gx[i] || 0,
        gy: buf.gy[i] || 0,
        gz: buf.gz[i] || 0,
        ax: buf.ax[i] || 0,
        ay: buf.ay[i] || 0,
        az: buf.az[i] || 0
      });
    }
    return result;
  }
};
