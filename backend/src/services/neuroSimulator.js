import neuroService from './neuroService.js';

let _timer = null;

export function startSimulator() {
  if (_timer) return;
  const sampleRate = process.env.NEURO_SAMPLING_RATE ? Number(process.env.NEURO_SAMPLING_RATE) : 250;
  let t = 0;
  let hr = 70; // starting heart rate
  let lastBeat = Date.now();
  let beatInterval = 60000 / hr;

  _timer = setInterval(() => {
    const now = Date.now();
    const tt = t / sampleRate;

    // EEG: sum of sinusoids (delta 2Hz, alpha 10Hz, beta 20Hz) + noise
    const eeg = (8 * Math.sin(2 * Math.PI * 2 * tt)) + (4 * Math.sin(2 * Math.PI * 10 * tt)) + (2 * Math.sin(2 * Math.PI * 20 * tt)) + (Math.random() - 0.5) * 2;

    // ECG: baseline small sine + periodic spike for R-peak
    let ecg = 0.2 * Math.sin(2 * Math.PI * 1 * tt) + (Math.random() - 0.5) * 0.05;
    if (now - lastBeat >= beatInterval) {
      // inject a sharp R-peak (single sample large amplitude)
      ecg += 1.2 + Math.random() * 0.6;
      lastBeat = now;
      // vary heart rate slightly
      hr = 60 + Math.round((Math.random() * 20) - 10);
      beatInterval = 60000 / hr;
    }

    // Emit EEG-only CSV line matching Arduino EEG-only firmware: "<adc>,<timestamp>"
    // Convert simulated eeg value to ADC-like integer around 0-1023
    const eegADC = Math.max(0, Math.min(1023, Math.round(512 + eeg)));
    const line = `${eegADC},${now}`;
    try {
      // feed into neuroService's serial data handler
      if (typeof neuroService._onSerialData === 'function') neuroService._onSerialData(line);
    } catch (e) {
      console.error('Simulator feed error', e);
    }
    t += 1;
  }, Math.round(1000 / sampleRate));

  console.log('Neuro simulator started (sampleRate=' + sampleRate + ')');
}

export function stopSimulator() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
    console.log('Neuro simulator stopped');
  }
}
