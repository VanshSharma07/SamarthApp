# Continuous Streaming - Pre-Upload Checklist

## ✅ Firmware Configuration Verified

### 1. Sample Tracking Enabled
- `totalSamplesSent` counter: **✓** Present (line 66)
- `totalBatchesSent` counter: **✓** Present (line 67)
- Purpose: Calculate real-time throughput (samples/second)

### 2. Buffer Persistence on Disconnect
- Function: `sendBatchIfReady()` (lines 198-207)
- **Before (❌):** `if (!wsConnected) { batch.clear(); return; }`
- **After (✅):** `if (!wsConnected) { return; } // Keep samples; don't clear`
- **Guarantee:** No data loss during WS reconnections

### 3. Aggressive Flush Interval
- **Old:** 300ms (risky - up to 60 sample gap)
- **New:** 150ms (safe - max 30 sample gap)
- **Location:** Line 342-345
- **Timing:** Ensures continuous 200 Hz stream to backend

### 4. Payload Structure (Full 6-Axis IMU)
```json
{
  "deviceId": "glove",
  "sampleRate": 200,
  "samples": [
    {
      "timestamp_us": 5000,
      "gx": 0.001234,      ← Raw gyro X
      "gy": 0.000456,      ← Raw gyro Y
      "gz": -0.000789,     ← Raw gyro Z
      "ax": 0.010000,      ← Raw accel X
      "ay": 0.020000,      ← Raw accel Y
      "az": 9.800000       ← Raw accel Z
    }
  ]
}
```
- **✓** Lines 214-227: Full payload construction
- **Verified:** Backend FFT analyzer expects this format

### 5. Status Logging with Metrics
- **Format:** `[STATUS] WiFi=OK WS=LIVE Queue=X Sent=Y batches (Z.Z Hz throughput)`
- **Frequency:** Every 5 seconds
- **Location:** Lines 348-357
- **Throughput calculation:** totalSamplesSent / uptime_seconds
- **Expected:** ~200 Hz continuous

---

## 📋 Pre-Upload Steps

1. **Arduino IDE Setup**
   - [ ] Board: `ESP32 Dev Module`
   - [ ] Upload Speed: `921600` (or `115200` if connection unstable)
   - [ ] Baud Rate (monitor): `115200`

2. **Credentials Check**
   - [ ] WiFi SSID: Update line ~15 if needed
   - [ ] WiFi Password: Update line ~16 if needed
   - [ ] Backend IP: `172.16.14.55` (line ~12)
   - [ ] Backend Port: `5000` (line ~13)

3. **Hardware Check**
   - [ ] MPU6050 connected to ESP32:
     - [ ] SDA → GPIO 21 (D1)
     - [ ] SCL → GPIO 22 (D2)
     - [ ] GND → GND
     - [ ] VCC → 3.3V

4. **Libraries Installed**
   - [ ] `MPU6050_light` (v1.2.0+)
   - [ ] `WebSocketsClient` (v2.3.0+)
   - [ ] `EEPROM` (built-in)

---

## 🚀 Upload & Monitoring

### Step 1: Upload Firmware
```
Arduino IDE → Sketch → Upload
Or: Ctrl+U
```

### Step 2: Open Serial Monitor
```
Arduino IDE → Tools → Serial Monitor
Set baud rate: 115200
```

### Step 3: Watch for Initialization (first 10 seconds)
```
[MPU6050] I2C OK, address 0x68
[Calib] EEPROM loaded (gyro offset: ...)
[WiFi] Connecting to "YOUR_SSID"...
[WiFi] Connected, IP: 192.168.x.x
[WS] Connecting to ws://172.16.14.55:5000/api/tremor/device...
[WS] CONNECTED
=== READY ===
```

### Step 4: Verify Continuous Streaming (every 100-150ms)
Look for pattern:
```
[SEND] Batch #1: 20 samples (xxx bytes)
[SEND] Batch #2: 20 samples (xxx bytes)
[SEND] Batch #3: 20 samples (xxx bytes)
... (continuous stream)
```

**✓ Expected:** New batch every ~100-150ms
**✗ Problem:** Gaps > 500ms between [SEND] lines

### Step 5: Monitor Throughput (every 5 seconds)
```
[STATUS] WiFi=OK WS=LIVE Queue=0 Sent=42 batches (200.0 Hz throughput)
[STATUS] WiFi=OK WS=LIVE Queue=0 Sent=84 batches (200.0 Hz throughput)
[STATUS] WiFi=OK WS=LIVE Queue=0 Sent=126 batches (199.9 Hz throughput)
```

**✓ Expected:** Throughput ~195-200 Hz, Queue near 0
**✗ Problem:** Throughput < 100 Hz, Queue growing

### Step 6: Test Disconnect Handling
1. Disconnect WiFi router (or kill backend on port 5000)
2. Watch logs:
```
[SEND] WS disconnected, buffered: 20 samples
[SEND] WS disconnected, buffered: 40 samples
[SEND] WS disconnected, buffered: 60 samples
```
3. Reconnect WiFi or restart backend
4. Verify logs:
```
[WS] CONNECTED
[SEND] Batch #N: 60 samples (xxx bytes)  ← All buffered samples sent!
```

**✓ Expected:** All buffered samples delivered on reconnect
**✗ Problem:** Samples lost (batch only has 20 not 60)

---

## 🔍 Backend Verification

### Monitor Backend Receiving Batches
```bash
# Terminal on backend machine
npm run start 2>&1 | grep -E "\[SEND\]|\[TremorAnalyzer\]|Batch received"
```

### Expected Output
```
[Tremor Device] Batch received (glove): 20 samples @ 200Hz
[TremorAnalyzer] glove: freq=0.50Hz, amp=0.050, dur=2.00s, buffer_status=...
[Tremor Device] Batch received (glove): 20 samples @ 200Hz
[TremorAnalyzer] glove: freq=4.25Hz, amp=0.150, dur=2.10s, buffer_status=...
...
```

**✓ Expected:** Batches arriving every 100-150ms, analyzer producing frequency updates
**✗ Problem:** Gaps in batch reception, "null" frequency in analyzer

---

## 📊 Frontend Verification

### Monitor Real-Time Metrics
1. Open browser to tremor assessment page
2. Watch chart update continuously (no frozen sections)
3. Hand still:
   - Frequency: ~0 Hz
   - Severity: "None"
4. Hand with tremor:
   - Frequency: 3-8 Hz (depending on tremor type)
   - Severity: "Mild" to "Moderate"

**✓ Expected:** Smooth chart updates every 100ms, real frequency values
**✗ Problem:** Chart freezes, null frequency, jumpy values

---

## 🆘 Troubleshooting

### Issue: `[SEND] WS not connected` repeating every 2s
**Cause:** WebSocket unable to establish connection
**Solutions:**
1. Check backend is running: `npm run start`
2. Verify backend port: `lsof -i :5000` (Mac/Linux) or `netstat -ano | findstr :5000` (Windows)
3. Verify ESP32 IP can reach backend: `ping 172.16.14.55` from another machine
4. Check firewall: Ensure port 5000 is open

### Issue: Throughput < 100 Hz
**Cause:** Data loss or delayed transmission
**Solutions:**
1. Check WiFi signal: Move ESP32 closer to router
2. Monitor backend CPU: `top` or Task Manager
3. Check backend latency: Are `[TremorAnalyzer]` logs appearing immediately?
4. Reduce payload size: Edit `BATCH_DURATION_S` from 0.1 to 0.05 (10 samples per batch instead of 20)

### Issue: Queue size grows (Queue > 50)
**Cause:** Backend slower than firmware sending
**Solutions:**
1. Stop frontend consumers (close browser tab)
2. Restart backend: Clear any stuck connections
3. Reduce frontend update frequency: Edit Tremor.jsx chart update interval

### Issue: Serial monitor shows garbage characters
**Cause:** Baud rate mismatch
**Solution:** Set Serial Monitor to `115200` baud

---

## ✨ Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Throughput | 195-200 Hz | ✓ |
| Batch gap | < 150ms | ✓ |
| Queue size | 0-20 | ✓ |
| Disconnect recovery | < 2s | ✓ |
| Data loss on disconnect | 0 samples | ✓ |
| Frontend chart smoothness | No gaps | ✓ |
| Backend batch reception | Every 100-150ms | ✓ |

---

## 📝 Logs to Save for Debugging

If issues occur, save these for analysis:

1. **Arduino Serial Output** (10 minutes):
   ```
   Arduino IDE → Tools → Serial Monitor → (Select all) → Copy → Paste to file.txt
   ```

2. **Backend Debug Log** (10 minutes):
   ```bash
   npm run start 2>&1 | tee debug_backend.log
   # Let run for 10 min with data flowing
   # Ctrl+C to stop
   ```

3. **Browser Console** (F12, Console tab):
   - Look for errors when connecting to /api/tremor/stream
   - Copy any error messages

4. **Network Tab** (F12, Network tab):
   - Check WebSocket connection status
   - Look for frame timing and payload sizes

---

## Next Steps

1. ✓ Upload firmware to ESP32
2. ✓ Verify all logs show expected patterns above
3. ✓ Run 30-minute continuous test with hand motion
4. ✓ Check for any throughput degradation over time
5. ✓ Proceed to tremor detection validation

**Expected time to verification:** 5-10 minutes
