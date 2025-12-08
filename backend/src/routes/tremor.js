import express from 'express';
import { tremorService } from '../services/tremorService.js';
import { tremorController } from '../controllers/tremorController.js';
import { tremorAnalyzer } from '../services/tremorAnalyzer.js';

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
      const remoteIp = req.socket.remoteAddress || 'unknown';
      console.log(`[Tremor Device] Connected from ${remoteIp}`);

      let deviceId = req.query.deviceId || req.headers['x-device-id'] || 'unknown';
      let lastMessageTime = Date.now();
      let messageCount = 0;

      // Send welcome message to device
      try {
        ws.send(JSON.stringify({ type: 'ack', message: 'Connected to tremor server' }));
      } catch (e) {
        console.error(`[Tremor Device] Failed to send welcome ACK: ${e.message}`);
      }

      ws.on('message', function(msg) {
        lastMessageTime = Date.now();
        messageCount++;

        try {
          const txt = (typeof msg === 'string') ? msg : msg.toString('utf8');

          // Expect JSON batch per new firmware spec
          let parsed = null;
          try { parsed = JSON.parse(txt); } catch (e) {
            console.warn(`[Tremor Device] Malformed JSON (${deviceId}): ${txt.substring(0, 50)}`);
            return;
          }

          if (!parsed || typeof parsed !== 'object') {
            console.warn(`[Tremor Device] Not an object (${deviceId})`);
            return;
          }

          if (!Array.isArray(parsed.samples)) {
            console.warn(`[Tremor Device] Missing samples array (${deviceId}), received keys: ${Object.keys(parsed).join(',')}`);
            return;
          }

          if (parsed.deviceId) deviceId = parsed.deviceId;
          const sampleRate = parsed.sampleRate || parsed.sr || null;
          const sampleCount = parsed.samples.length;

          console.log(`[Tremor Device] Batch received (${deviceId}): ${sampleCount} samples @ ${sampleRate}Hz`);

          // Update analyzer; summary will be broadcast to viewers
          try {
            tremorAnalyzer.addSamples(deviceId, parsed.samples, sampleRate);
          } catch (e) {
            console.error(`[Tremor Device] Error processing batch (${deviceId}): ${e.message || e}`);
          }

          // Also store raw buffer for assessments/history
          try {
            tremorService.ingestBatch(deviceId, parsed.samples, sampleRate);
          } catch (e) {
            console.error(`[Tremor Device] Error buffering batch (${deviceId}): ${e.message || e}`);
          }

          // Send acknowledgment back to device so it knows the message was received
          try {
            ws.send(JSON.stringify({ type: 'ack', samples: sampleCount, deviceId }));
          } catch (e) {
            console.error(`[Tremor Device] Failed to send ACK: ${e.message}`);
          }
        } catch (e) {
          console.error(`[Tremor Device] Unexpected error: ${e.message || e}`);
        }
      });

      ws.on('error', function(err) {
        console.error(`[Tremor Device] WebSocket error (${deviceId}): ${err.message || err}`);
      });

      ws.on('close', function() {
        const uptime = Date.now() - lastMessageTime;
        console.log(`[Tremor Device] Disconnected (${deviceId}): ${messageCount} messages received, last message ${uptime}ms ago`);
      });

      // Optionally send a ping every 30s to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          try {
            ws.ping();
          } catch (e) {
            // ping failed, connection likely dead
            clearInterval(pingInterval);
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on('close', () => clearInterval(pingInterval));
    });

    // Viewer endpoint: frontends connect to receive live metrics
    app.ws('/api/tremor/stream', function(ws, req) {
      console.log('[Tremor Viewer] Connected');
      tremorAnalyzer.addViewer(ws);

      ws.on('error', function(err) {
        console.error('[Tremor Viewer] WebSocket error:', err.message || err);
      });

      ws.on('close', function() {
        tremorAnalyzer.removeViewer(ws);
        console.log('[Tremor Viewer] Disconnected');
      });
    });
  } else {
    console.warn('express-ws not initialized, cannot register tremor WS route');
  }
}

export default router;
