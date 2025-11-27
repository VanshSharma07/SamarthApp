import express from 'express';
import { startAssessment, stopAssessment, getSession, getByPatient, wsStreamHandler } from '../controllers/neuroController.js';
import neuroService from '../services/neuroService.js';

const router = express.Router();

router.post('/assessment/start', express.json(), startAssessment);
router.post('/assessment/stop', stopAssessment);
router.get('/assessment/:sessionId', getSession);
router.get('/assessment/patient/:patientId', getByPatient);

// Export a helper to register WS route once express-ws has been attached to the app.
export function registerNeuroWs(app) {
  if (typeof app.ws === 'function') {
    app.ws('/api/assessment/stream', function(ws, req) {
      wsStreamHandler(ws, req);
    });
  } else {
    console.warn('express-ws not initialized, cannot register neuro WS route');
  }
}

// Register device (ESP32) WebSocket endpoint so devices can stream directly to the server.
export function registerDeviceWs(app) {
  if (typeof app.ws === 'function') {
    app.ws('/api/assessment/device', function(ws, req) {
      // Simple token auth via query param: ?token=XXX (optional)
      try {
        const qs = req.query || {};
        const token = qs.token || null;
        const expected = process.env.NEURO_DEVICE_TOKEN || null;
        if (expected && token !== expected) {
          console.warn('Device rejected: invalid token');
          try { ws.close(); } catch (e) {}
          return;
        }
      } catch (e) {
        // ignore
      }

      console.log('Device WS connected');
      // notify frontend viewers about device connection
      neuroService.broadcast({ type: 'device_status', connected: true });

      ws.on('message', function(msg) {
        // forward raw message lines into neuroService parser pipeline
        try {
          // msg may be Buffer or string
          const txt = (typeof msg === 'string') ? msg : msg.toString('utf8');
          neuroService.ingestLine(txt, { source: 'device' }).catch(() => {});
        } catch (e) { /* ignore malformed */ }
      });

      ws.on('close', function() {
        console.log('Device WS disconnected');
        neuroService.broadcast({ type: 'device_status', connected: false });
      });
    });
  } else {
    console.warn('express-ws not initialized, cannot register device WS route');
  }
}

export default router;
