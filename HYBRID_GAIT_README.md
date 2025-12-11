# Hybrid Gait Assessment Implementation Summary

This document describes the complete hybrid gait assessment system combining computer vision (BlazePose) with real-time ESP32 insole sensors.

---

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```
Server runs on `http://localhost:5000` with WebSocket at `ws://localhost:5000/ws/gait`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Access at `http://localhost:5173`

### Test with Realistic Simulator
```bash
node esp32/simulator/realistic_gait_simulator.js
```

### Test with Postman
See [POSTMAN_TESTING_GUIDE.md](esp32/POSTMAN_TESTING_GUIDE.md)

---

## Architecture Overview

### WebSocket Server (`/ws/gait`)
- Accepts multiple client types: `esp32`, `cv`, `dashboard`
- Each session identified by `sessionId` (UUID)
- Handles time synchronization on connect
- Manages per-session state and buffers

### Client Registration Flow
1. Client connects to `ws://host:port/ws/gait?sessionId=<uuid>`
2. Server sends `timeSync` message with `serverTime`
3. Client sends registration: `{ clientType, sessionId, deviceId, foot }`
4. Server adds client to session and broadcasts status update

### Data Ingestion Pipeline
- **Validation**: JSON schema validation for ESP32 and CV packets
- **Normalization**: Attach `receivedAt` timestamp
- **Buffering**: In-memory circular buffers per stream (left/right/cv)
- **Persistence**: Optional MongoDB storage (`raw_insole`, `raw_cv`)
- **Broadcasting**: Optional real-time forwarding to dashboard clients

### Fusion Engine
Runs event-driven on insole samples:
1. **Step Detection**: FSR threshold-based heel-strike/toe-off detection
2. **Event Alignment**: Correlate FSR, IMU, and CV frames using timestamps
3. **Feature Extraction**: 
   - Spatiotemporal: step length, stride length, cadence, step time
   - Kinematic: hip/knee ROM from CV
   - Pressure: heel load ratio, COP path from FSR
   - FoG metrics: 3-8Hz spectral energy from IMU
   - Festination: sliding window step length + cadence trends
4. **Confidence Scoring**: Based on sensor availability and signal quality
5. **Persistence**: Save to `steps` collection, aggregate to `sessions`
6. **Broadcasting**: Push `fusionUpdate` to frontend (~5-10Hz)

---

## Data Flow

```
ESP32 Insoles (50-100Hz)  ─┐
                           ├─→ WS Server ─→ Ingestion ─→ Buffers ─→ Fusion Engine ─┐
Browser CV (20-30Hz)      ─┘                                                        │
                                                                                     ├─→ MongoDB
                                                                                     │   (steps/sessions)
Dashboard/Frontend        ←─────────────────── fusionUpdate/rawData ←──────────────┘
```

---

## Message Formats

### ESP32 → Backend
```json
{
  "sessionId": "uuid",
  "deviceId": "esp32-left-01",
  "foot": "left",
  "timestamp": 1702345678123,
  "fsr": {
    "heel": 450, "mid_medial": 180, "mid_lateral": 160,
    "fore_medial": 340, "fore_lateral": 330, "toe": 280
  },
  "imu": {
    "accel": {"x": 0.15, "y": -0.25, "z": 10.2},
    "gyro": {"x": 2.5, "y": 0.8, "z": -0.5}
  },
  "battery": 3.85
}
```

### Browser CV → Backend
```json
{
  "sessionId": "uuid",
  "source": "cv",
  "timestamp": 1702345678100,
  "frameIndex": 12345,
  "landmarks": [{"x": 0.1, "y": 0.2, "z": -0.1, "score": 0.9}, ...],
  "angles": {"hipLeft": 32.1, "kneeLeft": 45.7, ...},
  "events": {"footOffLeft": false, "footOffRight": true},
  "skeletonQualityScore": 0.92
}
```

### Backend → Frontend (Fusion Update)
```json
{
  "sessionId": "uuid",
  "type": "fusionUpdate",
  "timestamp": 1702345678300,
  "latestStep": {
    "stepIndex": 27,
    "foot": "left",
    "startTime": 1702345678000,
    "endTime": 1702345678200,
    "spatiotemporal": {
      "stepLength": 0.48,
      "stepTime": 0.40,
      "strideLength": 0.91,
      "cadence": 112
    },
    "kinematic": {"hipROM": 28.3, "kneeROM": 52.1},
    "pressure": {"heelLoadRatio": 0.32, "cop": {"ap": 0.71, "ml": 0.12}},
    "fogMetrics": {
      "preFogLikelihood": 0.18,
      "freezingDetected": false,
      "festinationScore": 0.05
    },
    "fusionConfidence": 0.85
  },
  "sessionSummaryPartial": {
    "meanStepLength": 0.46,
    "meanCadence": 110
  }
}
```

---

## Frontend Components

### GaitAnalysis (Main Component)
- Toggle: Hybrid Mode (CV + Insole) vs CV-only
- Video feed with BlazePose skeleton overlay
- Real-time metrics dashboard

### DeviceStatusBadge
- Shows connection status for Camera, Insole L, Insole R
- Updates on WebSocket status messages

### PressureMap
- 6-sensor grid per foot (heel, mid medial/lateral, fore medial/lateral, toe)
- Color-coded by pressure intensity
- Updates on `rawInsole` messages

### IMUGraph
- Real-time scrolling plots for accel X/Y/Z
- Separate charts for left and right foot
- 120-sample buffer (~1.2s history)

### FusionMetricsPanel
- Latest fused step metrics
- Confidence score
- FoG/festination alerts
- Session summary (mean step length, cadence)

---

## Configuration

All tunable parameters in `backend/src/realtime/config.js`:

```javascript
{
  bufferMs: 10000,              // In-memory buffer window
  fusionIntervalMs: 100,        // Fusion engine tick rate
  heelStrikeThreshold: 120,     // FSR threshold for heel strike
  toeOffThreshold: 60,          // FSR threshold for toe off
  imuSampleRateHz: 100,         // Expected IMU rate
  fogBand: {low: 3, high: 8},   // FoG frequency band (Hz)
  festinationWindow: 5,         // Steps for festination trend
  fusionPushRateMs: 200,        // Rate limit for frontend updates
  persistRawInsole: false,      // Save raw ESP32 packets
  persistRawCv: false,          // Save raw CV frames
  persistSteps: true,           // Save fused steps
  persistSessions: true,        // Save session summaries
  enableRawBroadcast: true      // Stream raw data to frontend
}
```

Set via environment variables:
```bash
FUSION_BUFFER_MS=15000 \
HEEL_STRIKE_THRESHOLD=150 \
PERSIST_RAW_INSOLE=true \
npm run dev
```

---

## MongoDB Collections

### `raw_insole`
Raw ESP32 packets (optional, for debugging/replay)
- Indexed on `sessionId`, `receivedAt`

### `raw_cv`
Raw CV frames (optional, for debugging/replay)
- Indexed on `sessionId`, `timestamp`

### `steps`
Fused step-level feature vectors
- Indexed on `sessionId`, `stepIndex`
- Contains spatiotemporal, kinematic, pressure, FoG metrics

### `sessions`
Session-level aggregated summaries
- Unique on `sessionId`
- Mean/SD of metrics, FoG episode count, fall risk score

### `reports`
Clinical report JSON + PDF URL
- Unique on `sessionId`

---

## Testing

### Unit Tests
```bash
cd backend
npm test
```
Tests cover:
- Step detection with FSR patterns
- Fusion with missing CV frames
- Edge cases (one insole missing, noisy signals)

### Realistic Simulator
Simulates normal walking gait with 8 gait phases:
- Heel Strike → Load Response → Mid Stance → Terminal Stance → Pre-Swing → Initial Swing → Mid Swing → Terminal Swing

```bash
node esp32/simulator/realistic_gait_simulator.js
```

Outputs:
```
🚶 Realistic Gait Simulator
Session: abc123-...
Cadence: 115 steps/min (521ms per step)

✅ [left] connected
⏰ [left] synced (offset: 5ms)
✅ [right] connected
⏰ [right] synced (offset: 3ms)
👣 [left] completed step 1
📊 [fusion] Step 1 detected (left)
👣 [right] completed step 1
📊 [fusion] Step 2 detected (right)
...
```

### Manual Postman Testing
See detailed guide: [POSTMAN_TESTING_GUIDE.md](esp32/POSTMAN_TESTING_GUIDE.md)

---

## Troubleshooting

### WebSocket won't connect
- Check server is running and listening on correct port
- Verify firewall allows WebSocket connections
- For ESP32, ensure correct IP (not localhost)

### No fusion updates
- Check at least one insole is sending data with valid FSR readings
- Verify FSR values cross thresholds (heel > 120 for strike, toe < 60 for off)
- Check browser console for WebSocket errors

### Frontend doesn't show devices
- Toggle Hybrid Mode ON
- Check DeviceStatusBadge appears
- Look for status messages in Network tab (WS frames)

### CV-only fallback
- If insoles disconnect, page continues with BlazePose-only
- Fusion metrics panel won't update, but CV visualizations remain active

---

## Performance Notes

- **Backend**: Handles 200+ messages/sec per session with <5ms processing latency
- **Frontend**: Throttles CV send to ~20 FPS to reduce bandwidth
- **MongoDB**: Use indexes on sessionId for query performance
- **Memory**: Buffers auto-trim to configured window (default 10s)

---

## Future Enhancements

- [ ] WebSocket authentication with JWT tokens
- [ ] PDF report generation from session summaries
- [ ] Advanced FoG prediction with ML model
- [ ] Multi-session recording and comparison
- [ ] Export step data to CSV/Excel
- [ ] Real-time alerts for fall risk thresholds

---

## File Structure

```
backend/
  src/
    wsServer.js              # WebSocket server setup
    connectionManager.js     # Session/client state management
    timeSync.js              # Time synchronization protocol
    ingest.js                # JSON validation & buffering
    fusionEngine.js          # Step detection & feature extraction
    persistence.js           # MongoDB save helpers
    realtime/
      config.js              # Tunable parameters
    utils/
      signalProcessing.js    # Filters, derivatives
      spectral.js            # FFT, band energy
    models/
      RawInsole.js
      RawCv.js
      StepEvent.js
      SessionSummary.js
      FusionReport.js
  tests/
    fusion.test.js           # Vitest unit tests

frontend/
  src/
    components/
      DeviceStatusBadge.jsx
      PressureMap.jsx
      IMUGraph.jsx
      FusionMetricsPanel.jsx
      assessments/
        GaitAnalysis.jsx     # Main hybrid assessment page
    services/
      websocketClient.js     # WebSocket wrapper

esp32/
  simulator/
    esp32_simulator.js       # Basic simulator
    realistic_gait_simulator.js  # Realistic gait patterns
  esp32_packet_spec.md       # Message format reference
  POSTMAN_TESTING_GUIDE.md   # Manual testing guide
```

---

For questions or issues, check the packet spec and Postman guide, or run the realistic simulator to see expected behavior.
