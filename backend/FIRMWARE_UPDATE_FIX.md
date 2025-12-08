# Tremor Firmware Update - Fix Null Frequency Issue

## Problem
- Firmware was sending only `timestamp_us` and `mag` (pre-filtered magnitude)
- Backend analyzer expects raw `gx, gy, gz` values to compute FFT for frequency
- Result: No FFT analysis possible → null frequency always

## Solution

### What Changed

#### 1. Firmware (`ESP32_TREMOR_FIRMWARE_SIMPLIFIED.ino`)
- **Still sends:** All raw gyro (gx, gy, gz) and accel (ax, ay, az) values
- **Field names:** Uses `timestamp_us` (not `t_us`) for consistency
- **Removed:** The `mag` field from Sample struct (backend computes it)
- **Added:** Better diagnostic logs every 5 seconds
- **Connection:** Single `initWebSocket()` call (not aggressive reconnect loops)

#### 2. Backend Analyzer (`tremorAnalyzer.js`)
- **Now logs:** Buffer status while collecting samples (e.g., "Buffering (200 samples, need 400)")
- **Returns 0 Hz:** When hand is still (not null) — shows "Buffering" in log
- **Computes:** Gyro magnitude internally: `|ω| = sqrt(gx² + gy² + gz²)`
- **FFT:** Requires 3+ seconds of data before computing (400+ samples @ 200 Hz)

#### 3. Frontend (`Tremor.jsx`)
- **Handles 0 values:** Treats 0 Hz as "None" severity (still hand)
- **Displays:** "Buffering (X samples, need Y)" message until enough data
- **Fixed:** `deriveSeverity()` to handle zero/null values

---

## Expected Behavior

### Hand Still
```
[TremorAnalyzer] glove: freq=0Hz, amp=0.000, dur=3.15s
Frontend displays:
  Frequency: 0 Hz
  Type: None
  Severity: None
```

### Light Tremor (4-5 Hz)
```
[TremorAnalyzer] glove: freq=4.85Hz, amp=0.234, dur=3.45s
Frontend displays:
  Frequency: 4.85 Hz
  Type: Resting
  Severity: Mild
```

### Strong Tremor (7-10 Hz)
```
[TremorAnalyzer] glove: freq=8.23Hz, amp=1.456, dur=3.50s
Frontend displays:
  Frequency: 8.23 Hz
  Type: Postural
  Severity: Moderate
```

---

## Setup Steps

### 1. Upload New Firmware
- Copy contents of `ESP32_TREMOR_FIRMWARE_SIMPLIFIED.ino` into Arduino IDE
- Update WiFi SSID/password if needed
- Update `ws_host` IP if backend is at different address
- Upload to ESP32

### 2. Check Serial Monitor
You should see:
```
=== TREMOR GLOVE START ===
MPU6050 init...
MPU OK
[CALIB] Loaded:
  Gyro: 0.001234 0.000456 -0.000789
  Acc : 0.012345 -0.006789 0.123456
WiFi....... connected
IP: 192.168.1.150
WebSocket init...
=== READY ===

[STATUS] WiFi=OK WS=CONNECTED Batch=20
```

### 3. Check Backend Logs
You should see:
```
[Tremor Device] Connected from 192.168.1.150
[Tremor Device] Batch received (glove): 20 samples @ 200Hz
[TremorAnalyzer] glove: freq=4.32Hz, amp=0.123, dur=3.12s
```

### 4. Frontend Should Show
- Connection: "Connected" (green)
- Device: "glove"
- Charts: Frequency and Amplitude updating every 100ms
- Metrics: Real-time frequency, amplitude, type, severity

---

## Troubleshooting

### Still Seeing Null Frequency
1. Check backend logs for `[TremorAnalyzer]` messages
2. If you see "Buffering" message, wait 3+ seconds with hand moving slightly
3. If no analyzer logs appear:
   - Backend not receiving batches (check WS connection logs)
   - Firmware sending empty samples array (check payload size)

### Firmware Not Connecting to WiFi
- Verify SSID and password in code are correct
- Check you're on 2.4 GHz WiFi (ESP32 doesn't support 5 GHz)
- If still failing after 10s, firmware continues anyway (will retry WebSocket)

### WebSocket Connected But No Data Sent
- Check battery/power to ESP32
- MPU6050 should have LED on (if wired)
- Verify I2C is working: Serial should say "MPU OK"

### Frontend Shows "Buffering..." Forever
- Wait 3+ seconds; FFT needs minimum 3 seconds of data
- Move hand slightly to generate signal (still hand = 0 Hz)
- Check backend logs for analyzer output

---

## Key Differences from Old Firmware

| Aspect | Old | New |
|--------|-----|-----|
| Payload Fields | `t_us`, `mag` | `timestamp_us`, `gx`, `gy`, `gz`, `ax`, `ay`, `az` |
| FFT Computed | Firmware | Backend |
| Reconnect | Every 150ms | Auto (3s intervals) |
| Signal Processing | Pre-filtered mag | Raw gyro, FFT analysis |
| Frequency Display | Null/None | 0 Hz (when still) or actual Hz |

---

## Testing Checklist

- [ ] Firmware compiles without errors
- [ ] Serial monitor shows "=== READY ===" after startup
- [ ] Backend logs show "Batch received"
- [ ] Frontend shows "Connected"
- [ ] After 3+ seconds, frequency shows number (not null)
- [ ] Frequency increases when you move hand
- [ ] Frequency returns to 0 when hand is still
- [ ] Save Assessment works and stores data

