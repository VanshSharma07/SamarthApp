import neuroService from '../services/neuroService.js';
import Patient from '../models/Patient.js';

export async function startAssessment(req, res) {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ success: false, message: 'patientId required' });
    const session = await neuroService.startSession(patientId);
    return res.json({ success: true, sessionId: session._id });
  } catch (err) {
    console.error('startAssessment error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function stopAssessment(req, res) {
  try {
    const result = await neuroService.stopSession();
    return res.json({ success: true, summary: result });
  } catch (err) {
    console.error('stopAssessment error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await neuroService.getSession(sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    return res.json({ success: true, session });
  } catch (err) {
    console.error('getSession error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getByPatient(req, res) {
  try {
    const { patientId } = req.params;
    const list = await neuroService.getByPatient(patientId);
    return res.json({ success: true, sessions: list });
  } catch (err) {
    console.error('getByPatient error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function wsStreamHandler(ws, req) {
  // Add ws client to neuroService
  neuroService.addClient(ws);
  ws.send(JSON.stringify({ success: true, message: 'connected to neuro-assessment stream' }));
}
