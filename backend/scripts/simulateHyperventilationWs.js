import WebSocket from 'ws';

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const HV_WS_BASE = process.env.HV_WS || 'ws://localhost:5000/tests/hyperventilation/stream';
const DEVICE_WS = process.env.DEVICE_WS || 'ws://localhost:5000/api/assessment/device';

const SAMPLE_RATE = process.env.HV_SAMPLE_RATE ? Number(process.env.HV_SAMPLE_RATE) : 250;
const PHASE_SECONDS = 10;
const PHASES = [
  { name: 'baseline', seconds: PHASE_SECONDS, alphaAmp: 22, betaAmp: 4, thetaAmp: 3, noiseAmp: 2.5, spikeChance: 0, hr: 70 },
  { name: 'hyperventilation', seconds: PHASE_SECONDS, alphaAmp: 10, betaAmp: 14, thetaAmp: 10, noiseAmp: 4, spikeChance: 0.003, hr: 95 },
  { name: 'recovery', seconds: PHASE_SECONDS, alphaAmp: 18, betaAmp: 6, thetaAmp: 4, noiseAmp: 2.5, spikeChance: 0, hr: 78 }
];

function getArgValue(prefix) {
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.split('=')[1] : null;
}

function randomNoise(amp) {
  return (Math.random() - 0.5) * amp;
}

function eegSample(tt, phase) {
  const alpha = phase.alphaAmp * Math.sin(2 * Math.PI * 10 * tt);
  const beta = phase.betaAmp * Math.sin(2 * Math.PI * 20 * tt);
  const theta = phase.thetaAmp * Math.sin(2 * Math.PI * 6 * tt);
  let value = alpha + beta + theta + randomNoise(phase.noiseAmp);

  if (phase.spikeChance > 0 && Math.random() < phase.spikeChance) {
    value += (Math.random() > 0.5 ? 1 : -1) * 220;
  }

  return Math.round(value);
}

function createEcgGenerator() {
  let nextBeatAt = 0;
  return function ecgSample(tt, phase, startMs) {
    const nowMs = startMs + (tt * 1000);
    if (!nextBeatAt) {
      nextBeatAt = nowMs + (60000 / phase.hr);
    }

    let ecg = 0.1 * Math.sin(2 * Math.PI * 1 * tt) + randomNoise(0.02);
    if (nowMs >= nextBeatAt) {
      ecg += 1.2 + Math.random() * 0.6;
      nextBeatAt = nowMs + (60000 / phase.hr);
    }
    return Number(ecg.toFixed(3));
  };
}

async function ensureFetch() {
  if (typeof fetch === 'function') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

async function startTest(userId) {
  const doFetch = await ensureFetch();
  const resp = await doFetch(`${API_BASE}/api/tests/hyperventilation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  const data = await resp.json();
  if (!resp.ok || !data.testId) {
    throw new Error(`Failed to start test: ${resp.status} ${JSON.stringify(data)}`);
  }
  return data.testId;
}

function waitForOpen(ws, label) {
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log(`✓ ${label} connected`);
      resolve();
    });
    ws.on('error', err => reject(err));
  });
}

async function simulate() {
  const providedTestId = getArgValue('--testId=');
  const userId = getArgValue('--userId=') || process.env.SIM_USER_ID || undefined;

  const testId = providedTestId || await startTest(userId);
  console.log('Using testId:', testId);

  const hvWs = new WebSocket(`${HV_WS_BASE}?testId=${testId}`);
  hvWs.on('message', () => {});
  await waitForOpen(hvWs, 'HV stream');

  const deviceWs = new WebSocket(DEVICE_WS);
  await waitForOpen(deviceWs, 'Device stream');

  let sampleIndex = 0;
  let phaseIndex = 0;
  let phaseSamples = PHASES[phaseIndex].seconds * SAMPLE_RATE;
  const totalSamples = PHASES.reduce((sum, p) => sum + (p.seconds * SAMPLE_RATE), 0);
  const startMs = Date.now();
  const ecgSampler = createEcgGenerator();

  console.log('Starting simulation:', PHASES.map(p => p.name).join(' -> '));

  const timer = setInterval(() => {
    const phase = PHASES[phaseIndex];
    const t = sampleIndex / SAMPLE_RATE;
    const eeg = eegSample(t, phase);
    const ecg = ecgSampler(t, phase, startMs);
    const payload = { eeg, ecg, timestamp: startMs + Math.round(t * 1000) };

    deviceWs.send(JSON.stringify(payload));

    sampleIndex += 1;
    if (sampleIndex % phaseSamples === 0) {
      console.log(`Phase complete: ${phase.name}`);
      phaseIndex += 1;
      if (phaseIndex < PHASES.length) {
        phaseSamples = PHASES[phaseIndex].seconds * SAMPLE_RATE;
        console.log(`Phase started: ${PHASES[phaseIndex].name}`);
      }
    }

    if (sampleIndex >= totalSamples) {
      clearInterval(timer);
      console.log('Simulation complete');
      try { deviceWs.close(); } catch (e) {}
      try { hvWs.close(); } catch (e) {}
      process.exit(0);
    }
  }, Math.round(1000 / SAMPLE_RATE));
}

simulate().catch(err => {
  console.error('Simulation failed:', err.message || err);
  process.exit(1);
});
