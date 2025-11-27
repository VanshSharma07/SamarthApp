import EventEmitter from 'events';
import SerialPort from 'serialport';
import pkg from 'fft-js';
const { fft, util: fftUtil } = pkg;
import AssessmentSession from '../models/AssessmentSession.js';
import RealTimeRawData from '../models/RealTimeRawData.js';
import Patient from '../models/Patient.js';

const DEFAULT_SAMPLING_RATE = process.env.NEURO_SAMPLING_RATE ? Number(process.env.NEURO_SAMPLING_RATE) : 250;
const DEFAULT_SERIAL_PORT = process.env.NEURO_SERIAL_PORT || null;
const DEFAULT_BAUD = process.env.NEURO_BAUD ? Number(process.env.NEURO_BAUD) : 115200;

function computeBandPowers(windowSamples, sampleRate) {
  // windowSamples: array of EEG samples
  const N = windowSamples.length;
  if (N === 0) return { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
  // zero-pad to power of two
  const pow2 = 1 << Math.ceil(Math.log2(N));
  const padded = windowSamples.slice();
  while (padded.length < pow2) padded.push(0);
  // remove DC offset before FFT
  const meanVal = padded.reduce((a, b) => a + b, 0) / padded.length;
  for (let i = 0; i < padded.length; i++) padded[i] = padded[i] - meanVal;
  const phasors = fft(padded);
  const mags = fftUtil.fftMag(phasors);
  const freqs = Array(mags.length).fill(0).map((_, i) => i * sampleRate / mags.length);

  function bandPower(lo, hi) {
    let sum = 0;
    for (let i = 0; i < freqs.length; i++) {
      if (freqs[i] >= lo && freqs[i] < hi) sum += mags[i] * mags[i];
    }
    return sum / mags.length;
  }

  return {
    delta: bandPower(0.5, 4),
    theta: bandPower(4, 8),
    alpha: bandPower(8, 13),
    beta: bandPower(13, 30),
    gamma: bandPower(30, 45)
  };
}

function computeHRandRR(ecgBuffer, sampleRate) {
  // Very simple R-peak detection: find local maxima above mean+std and min distance
  if (!ecgBuffer || ecgBuffer.length === 0) return { hr: 0, rrIntervals: [] };
  const mean = ecgBuffer.reduce((a, b) => a + b, 0) / ecgBuffer.length;
  const sq = ecgBuffer.reduce((a, b) => a + (b - mean) * (b - mean), 0) / ecgBuffer.length;
  const std = Math.sqrt(sq);
  const threshold = mean + Math.max(0.3 * std, 0.2);
  const minSamplesBetweenPeaks = Math.floor(0.3 * sampleRate); // at least 300ms between R-peaks
  const peaks = [];
  for (let i = 1; i < ecgBuffer.length - 1; i++) {
    if (ecgBuffer[i] > ecgBuffer[i - 1] && ecgBuffer[i] > ecgBuffer[i + 1] && ecgBuffer[i] > threshold) {
      if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > minSamplesBetweenPeaks) peaks.push(i);
    }
  }
  const rrIntervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const samples = peaks[i] - peaks[i - 1];
    rrIntervals.push(samples / sampleRate * 1000); // ms
  }
  const hr = rrIntervals.length > 0 ? Math.round(60000 / (rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length)) : 0;
  return { hr, rrIntervals };
}

function computeHRVStats(rrIntervals) {
  if (!rrIntervals || rrIntervals.length === 0) return { rmssd: 0, sdnn: 0 };
  // RR intervals in ms
  const diffs = [];
  for (let i = 1; i < rrIntervals.length; i++) diffs.push(rrIntervals[i] - rrIntervals[i - 1]);
  const sqs = diffs.map(d => d * d);
  const rmssd = Math.sqrt(sqs.reduce((a, b) => a + b, 0) / (sqs.length || 1));
  const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const variance = rrIntervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rrIntervals.length;
  const sdnn = Math.sqrt(variance);
  return { rmssd, sdnn };
}

class NeuroService extends EventEmitter {
  constructor() {
    super();
    this.sampleRate = DEFAULT_SAMPLING_RATE;
    this.serialPath = DEFAULT_SERIAL_PORT;
    this.baud = DEFAULT_BAUD;
    this.port = null;
    this.parser = null;
    this.wsClients = new Set();
    this.currentSession = null; // in-memory session state
    this.eegBuffer = [];
    this.ecgBuffer = [];
    this.rrAll = [];
    this.bandSums = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
    this.bandCount = 0;
  }

  addClient(ws) {
    this.wsClients.add(ws);
    ws.on('close', () => this.wsClients.delete(ws));
  }

  // Ingest a raw text line (from device WebSocket or other sources)
  async ingestLine(line, meta = {}) {
    try {
      await this._onSerialData(line);
    } catch (e) {
      // swallow to avoid device disconnects; errors are logged in _onSerialData
    }
  }

  broadcast(payload) {
    const str = JSON.stringify(payload);
    for (const ws of this.wsClients) {
      try { ws.send(str); } catch (e) { /* ignore send errors */ }
    }
  }

  async startSession(patientId) {
    if (!patientId) throw new Error('patientId required');
    if (this.currentSession) throw new Error('Session already running');

    // validate patient exists (non-blocking)
    const patient = await Patient.findById(patientId).lean().exec();
    if (!patient) throw new Error('Patient not found');

    const sessionDoc = await AssessmentSession.create({ patientId, startTime: new Date() });
    this.currentSession = {
      id: sessionDoc._id,
      startTime: Date.now(),
      spikes: []
    };

    this.eegBuffer = [];
    this.ecgBuffer = [];
    this.rrAll = [];
    this.bandSums = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
    this.bandCount = 0;

    // open serial port if path provided
    if (this.serialPath) this._openSerial();

    this.emit('started', { sessionId: sessionDoc._id });
    return sessionDoc;
  }

  async stopSession() {
    if (!this.currentSession) throw new Error('No session running');
    const endTime = new Date();
    // compute averages
    const avgBands = {};
    if (this.bandCount > 0) {
      for (const k of Object.keys(this.bandSums)) avgBands[k] = this.bandSums[k] / this.bandCount;
    } else {
      avgBands.delta = avgBands.theta = avgBands.alpha = avgBands.beta = avgBands.gamma = 0;
    }

    const hrStats = {};
    const allRR = this.rrAll;
    if (allRR.length > 0) {
      const hrs = allRR.map(rr => Math.round(60000 / rr));
      hrStats.min = Math.min(...hrs);
      hrStats.max = Math.max(...hrs);
      hrStats.avg = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
    } else {
      hrStats.min = hrStats.max = hrStats.avg = 0;
    }
    const hrv = computeHRVStats(allRR);

    // persistent session summary
    const summary = {
      endTime,
      avgBands,
      hrStats,
      hrvStats: hrv,
      spikes: this.currentSession.spikes || [],
      overallRiskScore: this._computeRiskScore(avgBands, hrStats, hrv)
    };

    const updated = await AssessmentSession.findByIdAndUpdate(this.currentSession.id, {
      endTime: endTime,
      avgBands: summary.avgBands,
      hrStats: summary.hrStats,
      hrvStats: summary.hrvStats,
      spikes: summary.spikes,
      overallRiskScore: summary.overallRiskScore
    }, { new: true }).lean().exec();

    // clean up serial
    this._closeSerial();
    this.currentSession = null;

    this.emit('stopped', { session: updated });
    return updated;
  }

  async getSession(sessionId) {
    return AssessmentSession.findById(sessionId).lean().exec();
  }

  async getByPatient(patientId) {
    return AssessmentSession.find({ patientId }).sort({ startTime: -1 }).lean().exec();
  }

  _computeRiskScore(bands, hrStats, hrv) {
    // Simple heuristic risk score 0-100 combining alpha suppression, HRV low values and spikes
    let score = 0;
    const alpha = bands.alpha || 0;
    const rmssd = hrv.rmssd || 0;
    // lower alpha -> higher risk contribution
    score += Math.max(0, 30 - alpha / 1000);
    // low RMSSD increases score
    score += Math.max(0, 30 - rmssd / 2);
    // spikes add to score
    score += (this.currentSession.spikes ? this.currentSession.spikes.length : 0) * 5;
    return Math.min(100, Math.round(score));
  }

  _openSerial() {
    try {
      if (this.port && this.port.isOpen) return;
      this.port = new SerialPort(this.serialPath, { baudRate: this.baud, autoOpen: false });
      const Readline = SerialPort.parsers.Readline;
      this.parser = this.port.pipe(new Readline({ delimiter: '\n' }));
      this.parser.on('data', this._onSerialData.bind(this));
      this.port.open(err => {
        if (err) console.error('Failed to open serial port:', err.message);
        else console.log('Serial port opened:', this.serialPath);
      });
    } catch (e) {
      console.error('Error opening serial:', e.message);
    }
  }

  _closeSerial() {
    try {
      if (this.parser) { this.parser.removeAllListeners('data'); this.parser = null; }
      if (this.port && this.port.isOpen) this.port.close();
      this.port = null;
    } catch (e) { /* ignore */ }
  }

  async _onSerialData(line) {
    // Accept JSON lines like {"eeg":0.12,"ecg":0.5,"timestamp":123}
    // or CSV: eeg,ecg,timestamp
    let eegVal = null, ecgVal = null, ts = Date.now();
    try {
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
        const obj = JSON.parse(trimmed);
        if (typeof obj.eeg !== 'undefined') eegVal = Number(obj.eeg);
        if (typeof obj.ecg !== 'undefined') ecgVal = Number(obj.ecg);
        // support PPG or alternate pulse field names in future (not required now)
        if (typeof obj.ppg !== 'undefined' && (ecgVal === null || isNaN(ecgVal))) {
          ecgVal = Number(obj.ppg);
        }
        if (obj.timestamp) ts = Number(obj.timestamp);
      } else {
        const parts = trimmed.split(',').map(p => p.trim());
        // Support formats:
        // 1) eeg,timestamp
        // 2) eeg,ecg,timestamp
        if (parts.length === 1) {
          eegVal = Number(parts[0]);
        } else if (parts.length === 2) {
          // could be eeg,timestamp
          const a = Number(parts[0]);
          const b = Number(parts[1]);
          // heuristics: timestamp will be large (ms), eeg small (ADC)
          if (b > 100000) {
            eegVal = a;
            ts = b;
          } else {
            // assume second is ecg/ppg sample
            eegVal = a;
            ecgVal = b;
          }
        } else if (parts.length >= 3) {
          eegVal = Number(parts[0]);
          ecgVal = Number(parts[1]);
          if (parts[2]) ts = Number(parts[2]);
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    if (eegVal !== null && !isNaN(eegVal)) this.eegBuffer.push(eegVal);
    if (ecgVal !== null && !isNaN(ecgVal)) this.ecgBuffer.push(ecgVal);

    // accumulate realtime raw data periodically (compressed): every 250 samples
    if (this.eegBuffer.length >= Math.max(64, Math.floor(this.sampleRate * 0.25))) {
      // compute band powers on last window
      const window = this.eegBuffer.slice(-Math.floor(this.sampleRate * 2)); // 2s window
      const bands = computeBandPowers(window, this.sampleRate);
      // update running averages
      for (const k of Object.keys(bands)) { this.bandSums[k] += bands[k]; }
      this.bandCount += 1;

      // compute HR from ECG buffer
      const { hr, rrIntervals } = computeHRandRR(this.ecgBuffer.slice(-Math.floor(this.sampleRate * 10)), this.sampleRate);
      if (rrIntervals && rrIntervals.length) this.rrAll.push(...rrIntervals);

      // spike detection (simple amplitude + slope)
      const recent = window.slice(-Math.floor(this.sampleRate * 0.5));
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recent.length;
      const std = Math.sqrt(variance);
      const threshold = mean + 5 * std;
      let spikeDetected = false;
      let spikeInfo = null;
      for (let i = 1; i < recent.length - 1; i++) {
        const slope = Math.abs(recent[i] - recent[i - 1]);
        if (recent[i] > threshold && slope > std * 2) {
          spikeDetected = true;
          spikeInfo = { timestamp: ts, amplitude: recent[i], duration: 0 };
          if (this.currentSession) this.currentSession.spikes.push(spikeInfo);
          break;
        }
      }

      const payload = {
        timestamp: ts,
        eeg_raw: recent.slice(-64),
        ecg_raw: this.ecgBuffer.slice(-64),
        bands,
        hr,
        hrv: computeHRVStats(this.rrAll).rmssd,
        spikeDetected
      };

      // broadcast
      this.broadcast(payload);

      // persist compressed raw sample set for session (async, non-blocking)
      if (this.currentSession) {
        RealTimeRawData.create({ sessionId: this.currentSession.id, timestamp: ts, eeg_raw: payload.eeg_raw, ecg_raw: payload.ecg_raw }).catch(() => { /* ignore */ });
      }
    }
  }
}

const neuroService = new NeuroService();
export default neuroService;
