// Simple REST + WS client for gait stream sessions
const API_BASE = 'http://localhost:5000';

export async function startGaitSession(userId) {
  const res = await fetch(`${API_BASE}/api/gait/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  return res.json();
}

export async function completeGaitSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/gait/sessions/${sessionId}/complete`, { method: 'POST' });
  return res.json();
}

export async function getGaitSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/gait/sessions/${sessionId}`);
  return res.json();
}

export async function getClinicalMetrics(sessionId) {
  const res = await fetch(`${API_BASE}/api/gait/sessions/${sessionId}/clinical-metrics`);
  return res.json();
}

export async function getSteps(sessionId, { limit = 100, skip = 0 } = {}) {
  const res = await fetch(`${API_BASE}/api/gait/sessions/${sessionId}/steps?limit=${limit}&skip=${skip}`);
  return res.json();
}

export function connectGaitWebSocket(sessionId) {
  const loc = window.location;
  const wsProto = loc.protocol === 'https:' ? 'wss' : 'ws';
  const base = `${wsProto}://${loc.host}/gait-stream`;
  const ws = new WebSocket(base);
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'register', clientType: 'cv', sessionId }));
  };
  return ws;
}

// Mock Insole Simulator Controls
export async function startSimulator(sessionId) {
  const res = await fetch(`${API_BASE}/api/gait/simulator/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  return res.json();
}

export async function stopSimulator(sessionId) {
  const res = await fetch(`${API_BASE}/api/gait/simulator/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  return res.json();
}

export async function getSimulatorStatus(sessionId) {
  const res = await fetch(`${API_BASE}/api/gait/simulator/status/${sessionId}`);
  return res.json();
}
