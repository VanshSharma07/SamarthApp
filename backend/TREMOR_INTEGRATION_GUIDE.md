# Tremor Glove Backend Integration Guide

## Overview
The tremor backend is designed to work with ESP32 MPU6050 sensor gloves that stream 200 Hz gyroscope/accelerometer data via WebSocket.

---

## Backend Architecture

### 1. **WebSocket Routes** (`backend/src/routes/tremor.js`)
- **Device Endpoint**: `/api/tremor/device`
  - Accepts JSON batches from ESP32
  - Expected format:
    ```json
    {
      "deviceId": "glove-xxxxx",
      "sampleRate": 200,
      "samples": [
        {"timestamp_us": 5000, "gx": 0.1, "gy": 0.05, "gz": -0.02, "ax": 0.1, "ay": 0.05, "az": 9.8},
        ...
      ]
    }
    ```
  - Sends acknowledgment back to device after receiving batch
  - Forwards data to analyzer and raw buffer service

- **Viewer Endpoint**: `/api/tremor/stream`
  - Receives analyzer summaries
  - Sends to frontend in real-time

### 2. **Tremor Analyzer** (`backend/src/services/tremorAnalyzer.js`)
- Maintains 5-second sliding window per device
- Computes FFT on gyro magnitude: `|ω| = sqrt(gx² + gy² + gz²)`
- Extracts dominant frequency (2–12 Hz band)
- Broadcasts summary to viewers:
  ```json
  {
    "type": "summary",
    "deviceId": "glove-xxxxx",
    "dominantFrequencyHz": 5.2,
    "dominantAmplitude": 1.23,
    "bandPower3to7Hz": 45.6,
    "windowDurationSec": 5.0
  }
  ```

### 3. **Tremor Service** (`backend/src/services/tremorService.js`)
- Buffers raw sensor samples (gx, gy, gz, ax, ay, az)
- Stores per-device structured buffers
- `getLatestRaw()` retrieves data for assessments/saves
- `ingestBatch()` populates buffers from device WS messages

### 4. **Tremor Controller** (`backend/src/controllers/tremorController.js`)
- REST endpoint: `POST /api/tremor/save` – saves assessment to MongoDB
- Automatically attaches raw buffer from device if not in payload
- Stores metrics + raw samples + timestamps

---

## ESP32 Firmware Key Fixes

### Problem: WS connects then immediately disconnects
**Root Cause**: Old firmware called `webSocket.begin()` every 150ms, causing reconnect loops.

### Solution: Updated firmware (`ESP32_TREMOR_FIRMWARE.ino`)
1. **Single WebSocket Initialization**
   - Calls `initWebSocket()` once in `setup()`
   - Built-in auto-reconnect with 3-second delay
   - Avoids aggressive reconnect loops

2. **Connection State Tracking**
   - `wsConnected` flag updated in WebSocket event handler
   - `sendBatchIfReady()` only sends when `wsConnected == true`

3. **Server Acknowledgments**
   - Backend sends `{"type":"ack"}` after receiving batch
   - Firmware logs ACK messages for debugging

4. **Diagnostic Logging**
   - Status line every 5s: WiFi status, WS status, last send time, batch queue size
   - Helps identify connection issues without serial spam

---

## Setup Checklist

### Backend
- [ ] Express server running on port 5000
- [ ] `express-ws` middleware installed
- [ ] MongoDB connected
- [ ] Tremor routes registered in `index.js`

### ESP32 Firmware
- [ ] Update **WiFi SSID** and **password** (currently `Airpro_2.4GHz`)
- [ ] Update **ws_host** IP to match backend (currently `172.16.14.55`)
- [ ] Upload updated firmware to ESP32
- [ ] Verify serial monitor shows:
  ```
  === TREMOR GLOVE STARTUP ===
  MPU6050 OK
  [CALIB] Calibration ready.
  Device ID: glove-xxxxx
  IP: 192.168.x.x
  Initializing WebSocket...
  === SETUP COMPLETE ===
  
  [STATUS] WiFi=OK WS=CONNECTED LastSend=150ms Batch=20
  ```

### Network
- [ ] ESP32 can reach backend IP on port 5000 (test: `ping 172.16.14.55`)
- [ ] No firewall blocking port 5000
- [ ] Both devices on same WiFi network or backend exposed externally

---

## Debugging Steps

### 1. ESP32 Not Connecting to WiFi
- Check SSID/password in firmware
- Serial output will show dots during WiFi connect attempt
- If after 15s still shows "[WiFi] Failed", check router is broadcasting SSID

### 2. ESP32 Connected to WiFi but WS disconnects
- Verify `ws_host` IP is correct (`ping` from ESP32)
- Check backend is listening: `netstat -an | grep 5000` (or `netstat -ano | findstr :5000` on Windows)
- Look at backend logs for connection errors

### 3. Backend Receives Connections but No Batches
- Backend will log: `[Tremor Device] Connected from 192.168.x.x`
- But then: `[Tremor Device] Disconnected: 0 messages received`
- Likely firmware not sending any data; check ESP32 logs for `[SEND]` entries

### 4. Batches Sent but Not Processed
- Backend logs: `[Tremor Device] Batch received (glove-xxxxx): 20 samples @ 200Hz`
- If you don't see this:
  - Check `tremorAnalyzer.addSamples()` and `tremorService.ingestBatch()` don't throw
  - Verify JSON structure matches expected format (especially `samples` array)

### 5. Frontend Not Seeing Data
- Frontend WS endpoint: `/api/tremor/stream`
- Should receive summary payloads with `type: "summary"` and metrics
- Check if 3+ seconds of data buffered (minimum for FFT)

---

## REST Endpoints

### Save Tremor Assessment
```
POST /api/tremor/save
Content-Type: application/json

{
  "userId": "user123",
  "metrics": {
    "tremor_frequency": 5.2,
    "tremor_amplitude": 1.23,
    "tremor_type": "Postural",
    "severity": "Mild"
  },
  "deviceId": "glove-xxxxx",
  "timestamp": "2025-12-08T10:00:00Z"
}
```

### Get Assessment History
```
GET /api/tremor/history?userId=user123&limit=10
```

### Get Raw Sensor Data for Device
```
GET /api/tremor/device/glove-xxxxx/raw
```
Returns last 5120 samples (25.6 seconds @ 200 Hz) with timestamps, gyro, accel values.

---

## Performance Notes
- **Sample Rate**: 200 Hz (5 ms per sample)
- **Batch Size**: 20 samples (100 ms batches)
- **FFT Window**: 1024 samples (5.12 seconds at 200 Hz)
- **Minimum Data**: 400 samples (2 seconds) before FFT is computed
- **Analyzer Buffer**: Last 5120 samples kept in memory per device
- **Service Buffer**: Same, plus structured gx/gy/gz/ax/ay/az arrays for saves

---

## Data Flow Diagram

```
ESP32 (200 Hz sampling)
  ↓
Calibration applied
  ↓
Batch accumulated (20 samples, 100 ms)
  ↓
JSON payload sent via WS to /api/tremor/device
  ↓
Backend parses JSON
  ├─→ tremorAnalyzer.addSamples()
  │    ├─→ 5-sec sliding window
  │    ├─→ Hann windowed FFT on gyro magnitude
  │    └─→ Broadcast summary to /api/tremor/stream
  │
  └─→ tremorService.ingestBatch()
       └─→ Buffer raw samples for saves
  
Frontend /api/tremor/stream WS
  ↓
Receives summary every ~100 ms
  ↓
Display frequency, amplitude, trends
  ↓
User clicks "Save Assessment"
  ↓
POST /api/tremor/save with metrics
  ↓
tremorService.getLatestRaw() attaches raw buffer
  ↓
MongoDB stores TremorAssessment document
```

---

## Firewall / Network Issues

If backend receives repeated quick connections + disconnections:

1. **Disable Windows Firewall temporarily** (for testing):
   ```powershell
   Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled $false
   ```

2. **Verify backend is listening** on all interfaces:
   ```powershell
   netstat -ano | findstr :5000
   ```
   Should show `LISTENING` on port 5000.

3. **Check routing**:
   - From ESP32 perspective, can it reach the backend IP?
   - `ping 172.16.14.55` from another device on the network
   - If you can't ping it, the IP is likely wrong

4. **Router DHCP / DNS**:
   - Ensure backend and ESP32 stay on consistent IPs
   - Consider setting static IP for backend (or use hostname with mDNS)

---

## Monitoring Backend in Real-Time

Terminal 1 (Backend):
```bash
cd d:\Codes\SamarthApp\samarth-web\backend
npm run start
```

Terminal 2 (Tail logs, Windows):
```powershell
Get-Content backend.log -Tail 50 -Wait  # if redirecting stdout
# Or just watch the npm console
```

Look for:
- `[Tremor Device] Connected from ...` — device connected
- `[Tremor Device] Batch received (glove-xxx): 20 samples @ 200Hz` — data flowing
- `[STATUS]` line every 5s on ESP32 console

---

## Next Steps
1. Update ESP32 firmware with the fixed version
2. Restart backend (`npm run start`)
3. Power on ESP32 and monitor both serial outputs
4. Connect frontend and observe metrics streaming
5. Click "Save Assessment" to test full pipeline

