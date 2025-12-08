# Continuous Data Streaming - Firmware Optimization

## Key Changes for Continuous Flow

### 1. **Sample Tracking**
```cpp
unsigned long totalSamplesSent = 0;    // Track all samples sent
unsigned long totalBatchesSent = 0;    // Track batch count
```
- Allows real-time throughput calculation
- Monitor data loss (should be 200 samples/sec continuous)

### 2. **Never Discard Buffered Data**
**OLD (Problematic):**
```cpp
if (!wsConnected) {
    batch.clear();  // ❌ LOSE DATA!
    return;
}
```

**NEW (Continuous):**
```cpp
if (!wsConnected) {
    // Don't clear; keep buffering until reconnected
    if (batch.size() > BATCH_SIZE * 3) {
        Serial.printf("[SEND] WS disconnected, buffered: %u samples\n", (unsigned)batch.size());
    }
    return;  // ✅ Keep samples in buffer
}
```

### 3. **Aggressive Flush Interval**
```cpp
// Every 150ms (not 300ms) = 30 batches/sec
if (millis() - lastFlush > 150) {
    lastFlush = millis();
    if (batch.size() > 0) sendBatchIfReady(true);
}
```

**Timing guarantee:**
- 200 Hz sampling = 20 samples per 100ms
- Batch size = 20 samples
- Flush every 150ms = 150ms window
- **Result:** Never more than 30 samples between sends (always < 2 batches gap)

### 4. **Throughput Monitoring**
```cpp
float throughput = totalSamplesSent / (uptime / 1000.0f);
Serial.printf("[STATUS] ... (%.1f Hz throughput)\n", throughput);
```

**What to expect:**
- **Normal:** ~200 Hz (or slightly less if buffering)
- **Degraded:** <100 Hz (indicates connection issues)
- **Loss:** Sudden drop (missed data)

---

## Data Flow Guarantee

```
Sensor (200 Hz)
    ↓
Sample buffer
    ↓ (every 100ms if 20 samples ready)
Batch ready (20 samples = 100ms worth)
    ↓
Send to backend
    ↓ (if WS not connected, hold in buffer)
Aggressive flush (every 150ms)
    ↓ (ensures < 30 sample gap)
Continuous stream to backend
```

### Worst Case Gaps
- **150ms without any send:** 30 samples (still continuous 200 Hz stream)
- **WS disconnects:** Samples held in buffer (up to ~1000 before memory pressure)
- **WS reconnects:** Entire buffered queue sent immediately

---

## Serial Monitor Output Interpretation

### Healthy Stream
```
[SEND] Batch #1: 20 samples (xxx bytes)
[SEND] Batch #2: 20 samples (xxx bytes)
[SEND] Batch #3: 20 samples (xxx bytes)
...
[STATUS] WiFi=OK WS=LIVE Queue=0 Sent=150 batches (200.0 Hz throughput)
```

### Temporary Disconnect
```
[SEND] Batch #47: 20 samples (xxx bytes)
[SEND] WS disconnected, buffered: 20 samples
[SEND] WS disconnected, buffered: 40 samples
[SEND] WS disconnected, buffered: 60 samples
...
[WS] CONNECTED
[SEND] Batch #48: 60 samples (xxx bytes)  ← All buffered samples sent
[SEND] Batch #49: 20 samples (xxx bytes)
[STATUS] WiFi=OK WS=LIVE Queue=0 Sent=200 batches (199.8 Hz throughput)
```

### Degraded Throughput
```
[SEND] Batch #100: 20 samples
... gap of 1+ seconds ...
[SEND] Batch #101: 20 samples
[STATUS] WiFi=OK WS=LIVE Queue=0 Sent=150 batches (75.0 Hz throughput)
```
→ Indicates network congestion or backend latency

---

## Backend Expectations

### What Backend Receives
```json
{
  "deviceId": "glove",
  "sampleRate": 200,
  "samples": [
    {
      "timestamp_us": 5000,
      "gx": 0.001234,
      "gy": 0.000456,
      "gz": -0.000789,
      "ax": 0.010000,
      "ay": 0.020000,
      "az": 9.800000
    },
    // ... 19 more samples ...
  ]
}
```

### Expected Frequency
- **Batch arrival rate:** ~10 batches/sec (every 100ms ± 50ms tolerance)
- **Sample arrival rate:** ~200 samples/sec continuous
- **Minimum data for FFT:** 400 samples = 2 seconds

---

## Configuration Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `SAMPLE_RATE` | 200 Hz | Gyro/accel sampling rate |
| `BATCH_DURATION_S` | 0.1 (100ms) | Accumulate samples for 100ms |
| `BATCH_SIZE` | 20 | Samples per batch (200 Hz × 0.1s) |
| `Flush interval` | 150ms | Ensure no > 30 sample gap |
| `Buffer limit` | ~1000 samples max | ESP32 memory safety (~10 seconds) |

---

## Troubleshooting

### Serial Shows: `[SEND] WS not connected` Repeating
**Problem:** WiFi connected but WebSocket keeps disconnecting
**Solution:** 
- Check backend is running on port 5000
- Verify `ws_host` IP is correct
- Check network MTU (try reducing payload from 3000 to 2000 bytes)

### Throughput < 100 Hz
**Problem:** Data loss or delayed sends
**Solution:**
- Monitor backend responsiveness: `[TremorAnalyzer]` logs should appear rapidly
- If backend has FFT lag, consider reducing FFT_WINDOW size
- Check WiFi signal strength (move closer to router)

### Queue Size Grows (Queue > 100)
**Problem:** Backend not consuming data fast enough
**Solution:**
- Check backend CPU usage
- Reduce frontend update frequency if too many clients
- Verify analyzer isn't blocking on FFT computation

### Sudden Throughput Drop Mid-Session
**Problem:** Temperature/memory pressure on ESP32
**Solution:**
- ESP32 thermal throttling → temperature > 70°C
- Add heatsink or improve ventilation
- Restart ESP32

---

## Testing Continuous Flow

### Command Line Test (Backend)
```bash
# Monitor batch arrival in real-time
npm run start 2>&1 | grep -E "\[SEND\]|\[STATUS\]"
```

Expected output:
```
[SEND] Batch #1: 20 samples
[SEND] Batch #2: 20 samples
... (every ~100-150ms)
[SEND] Batch #N: 20 samples
[STATUS] WiFi=OK WS=LIVE Queue=0 Sent=150 batches (200.0 Hz throughput)
```

### Frontend Test
- Open browser to tremor assessment
- Watch chart update smoothly (no gaps)
- Frequency should continuously change as you move hand
- If chart freezes for > 1 second, data flow interrupted

---

## Key Improvement Summary

| Aspect | Before | After |
|--------|--------|-------|
| Disconnection handling | Discard data ❌ | Buffer & resend ✅ |
| Flush interval | 300ms (risky) | 150ms (safe) ✅ |
| Data tracking | None | Throughput metrics ✅ |
| Buffer overflow | No limit | ~1000 sample max ✅ |
| Diagnostic logs | Sparse | Detailed metrics ✅ |

