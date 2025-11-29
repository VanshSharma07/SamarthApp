import express from 'express';
import { tremorService } from '../services/tremorService.js';
import { tremorController } from '../controllers/tremorController.js';

const router = express.Router();

// REST endpoints
router.post('/save', express.json(), (req, res) => tremorController.save(req, res));
router.get('/history', (req, res) => tremorController.getHistory(req, res));
router.get('/baseline/:userId', (req, res) => tremorController.getBaseline(req, res));

// Fetch latest raw buffer for a device (optional helper for frontend / debugging)
router.get('/device/:deviceId/raw', async (req, res) => {
  const deviceId = req.params.deviceId;
  try {
    const raw = await tremorService.getLatestRaw(deviceId, 20000);
    if (!raw) return res.status(404).json({ error: 'No raw data found for device' });
    return res.json(raw);
  } catch (err) {
    console.error('Failed to fetch raw data for device', deviceId, err);
    return res.status(500).json({ error: 'Failed to fetch raw data' });
  }
});

export function registerTremorWs(app) {
  if (typeof app.ws === 'function') {
    // Device endpoint: ESP32 connects here and sends numeric values (plain text or JSON)
    app.ws('/api/tremor/device', function(ws, req) {
      console.log('Tremor device WS connected');

      ws.on('message', function(msg) {
        try {
          const txt = (typeof msg === 'string') ? msg : msg.toString('utf8');
          // device may send plain number or JSON { value: 1.23, deviceId: 'xxx' }
          let value = null;
          let deviceId = req.query.deviceId || req.headers['x-device-id'] || 'unknown';
          try {
            const parsed = JSON.parse(txt);
            if (parsed && typeof parsed === 'object') {
              // batch of samples?
              if (Array.isArray(parsed.samples) && parsed.samples.length > 0) {
                if (parsed.deviceId) deviceId = parsed.deviceId;
                const sampleRate = parsed.sampleRate || parsed.sr || null;
                tremorService.ingestBatch(deviceId, parsed.samples, sampleRate).catch(() => {});
                return;
              }
              if (parsed.value !== undefined) value = parseFloat(parsed.value);
              if (parsed.deviceId) deviceId = parsed.deviceId;
            }
          } catch (e) {
            // not JSON, try parse as number
            value = parseFloat(txt);
          }

          if (!Number.isNaN(value) && value !== null) {
            tremorService.ingestSample(deviceId, value, Date.now()).catch(() => {});
          }
        } catch (e) { /* ignore malformed */ }
      });

      ws.on('close', function() { console.log('Tremor device WS disconnected'); });
    });

    // Viewer endpoint: frontends connect to receive live metrics
    app.ws('/api/tremor/stream', function(ws, req) {
      console.log('Tremor viewer connected');
      tremorService.registerViewer(ws);

      ws.on('close', function() {
        tremorService.unregisterViewer(ws);
        console.log('Tremor viewer disconnected');
      });
    });
  } else {
    console.warn('express-ws not initialized, cannot register tremor WS route');
  }
}

export default router;
