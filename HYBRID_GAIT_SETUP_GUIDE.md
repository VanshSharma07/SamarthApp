# Hybrid Gait Analysis - Integration Checklist & Quick Start

## ✅ Completed Implementation

### Backend Services
- [x] **sensorMetricsService.js** - 800+ lines
  - FSR metric extraction (heel strike, toe-off, pressure distribution, pronation)
  - IMU metric extraction (gait rhythm, stability, harmonic ratio, FoG/festination)
  - Gait timing calculations (cadence, stride, stance/swing time)
  - Abnormality detection

- [x] **hybridMetricsMerger.js** - 600+ lines
  - Metric merging (CV + sensor)
  - Insight generation (clinical findings)
  - Summary computation (quick reference scores)
  - Recommendation generation (treatment suggestions)

### Backend Integration
- [x] **gaitAnalysisController.js** (UPDATED)
  - Accepts sensor buffer in POST request
  - Calls sensorMetricsService.processSensorBuffer()
  - Calls hybridMetricsMerger.mergeMetrics()
  - Returns comprehensive hybrid assessment

### Frontend Components
- [x] **HybridGaitInsights.jsx** (NEW)
  - 7-tab multi-section results display
  - Overall score visualization
  - Key metrics summary
  - Detailed insights for each aspect
  - Abnormality flags
  - Clinical recommendations

- [x] **GaitAnalysis.jsx** (UPDATED)
  - Added sensorBufferRef for storing raw packets
  - Buffers sensor data during recording
  - Sends sensor buffer with assessment save
  - Displays HybridGaitInsights component
  - Shows real-time sensor dashboard

### WebSocket Infrastructure
- [x] `/ws/sensors` endpoint in index.js
- [x] Real-time sensor data broadcasting
- [x] Frontend WebSocket client connection

## 🔧 Setup Instructions

### 1. Backend Start

```bash
cd backend
npm install  # If not already done
npm start
```

Expected output:
```
✅ Server running on port 5000
✅ WebSocket server initialized
```

### 2. Frontend Start

```bash
cd frontend
npm install  # If not already done
npm run dev
```

Expected output:
```
VITE v... ready in ... ms
➜ Local: http://localhost:5173/
```

### 3. Test Sensor Connection

In a separate terminal:
```bash
cd .
node test-sensor-client.js
```

Expected output:
```
🚀 Connecting to ws://localhost:5000/ws/sensors
✅ Connected to WebSocket server
📤 Sending sensor packets (0/300)...
✅ Successfully sent 300 sensor packets
```

## 📝 Usage Flow

### Complete Assessment with Sensor Data

1. **Navigate to Gait Analysis** in frontend
2. **Click "Start Recording"**
   - Video capture starts
   - Sensor buffer clears (ready to receive packets)
   - System displays sensor dashboard
3. **Run sensor simulator** (in another terminal)
   - Sensor client sends 10 Hz data stream
   - Frontend buffers all packets in real-time
   - Dashboard shows live FSR and IMU values
4. **Stop Recording** (or auto-stops after 30s)
   - Video capture ends
   - WebSocket buffering stops
   - Sensor buffer locked with final data
5. **Click "Complete Assessment"**
   - CV metrics computed
   - Sensor buffer sent to backend
   - Backend processes sensor data (200 ms)
   - Hybrid metrics computed
   - Results returned and displayed
6. **View Results**
   - Overall score (0-100)
   - 7 detailed tabs with insights
   - Clinical recommendations
   - Abnormality flags

## 🎯 Key Features

### Computed Metrics

**From CV (9 parameters):**
- Hip angle, knee angle, ankle angle
- Trunk lean, step length, step width, arm swing
- Stability score, symmetry score

**From FSR (16 parameters):**
- Heel strike, toe-off, peak pressure
- Pressure distribution (6-zone), contact area
- Pronation/supination, foot asymmetry
- Center of pressure path, ground force

**From IMU (12 parameters):**
- Gait rhythm & regularity, step timing
- ML/AP/vertical sway, stability scores
- Harmonic ratio, FoG severity, festination trend
- Tremor indicators

**Hybrid (20+ computed):**
- Merged joint angles, combined gait timing
- Unified balance & stability metrics
- Pressure & posture integration
- Cross-modal abnormality detection

### Abnormality Detection

| Condition | Detection | Severity | Action |
|-----------|-----------|----------|--------|
| Freezing of Gait | IMU accel low windows | Mild/Mod/Severe | Medical evaluation |
| Festination | Accel trend analysis | Mild/Mod/Severe | Neurologist review |
| Asymmetry | L-R pressure difference | <10% / 10-20% / >20% | Balance training |
| Poor Stability | Low harmonic ratio, high sway | Score-based | PT intervention |
| High Variability | Step inconsistency | <10% / 10-20% / >20% | Fall prevention |

### Clinical Insights Generated

System automatically identifies and explains:
- Gait rhythm abnormalities
- Balance & postural control issues
- Asymmetrical patterns
- Foot mechanics problems
- Acceleration/deceleration patterns
- Weight distribution imbalances

## 📊 Data Structure

### Sensor Buffer (sent from frontend)

```javascript
sensorBuffer: [
  {
    timestamp: 1732743812345,
    deviceId: "left-insole",
    leftFoot: {
      fsr: { sensor1: 430, sensor2: 210, ..., sensor6: 280 }
    },
    rightFoot: {
      fsr: { sensor1: 425, sensor2: 205, ..., sensor6: 275 }
    },
    imu: {
      accel: { x: 0.12, y: -0.31, z: 9.81 },
      gyro: { x: 1.3, y: 0.14, z: -0.09 }
    }
  },
  // ... 300-3000 packets
]
```

### Hybrid Metrics (returned from backend)

```javascript
metrics: {
  // Original CV metrics preserved
  stability: { score: 75, ... },
  balance: { score: 80, ... },
  // New sensor metrics
  sensorMetrics: {
    fsr: {
      left: { heelStrike: {...}, toeOff: {...}, ... },
      right: { ... }
    },
    imu: { gaitRhythm: {...}, stability: {...}, ... },
    gaitTiming: { cadence: 105, stepTime: 0.57, ... },
    abnormalities: [ ... ]
  },
  // Merged insights
  hybrid: {
    jointAngles: {...},
    gaitTiming: {...},
    balance: {...},
    stability: {...},
    symmetry: {...},
    pressure: {...}
  },
  insights: [
    { category: "Gait Rhythm", finding: "...", source: "FSR sensors" },
    // ... more insights
  ],
  recommendations: [
    { priority: "High", category: "Balance Training", recommendation: "..." },
    // ... more recommendations
  ]
}
```

## 🧪 Testing Checklist

### Unit Tests (Manual)
- [ ] Start backend - check logs for no errors
- [ ] Start frontend - verify navigation loads
- [ ] Run test sensor client - confirm WebSocket connection
- [ ] Complete full assessment workflow
- [ ] Verify hybrid metrics in browser console
- [ ] Check database contains sensorMetrics field

### Integration Tests
- [ ] CV metrics computed correctly
- [ ] Sensor buffer stores all packets
- [ ] Backend processes buffer without errors
- [ ] Frontend displays hybrid insights
- [ ] All 7 tabs load with content
- [ ] Recommendations generated

### UI/UX Tests
- [ ] Sensor dashboard updates in real-time
- [ ] Results load within 5 seconds
- [ ] Tabs switch smoothly
- [ ] Charts render correctly
- [ ] Metrics display with proper units
- [ ] No console errors

### Edge Cases
- [ ] Assessment completes without sensor data (graceful fallback)
- [ ] Empty sensor buffer (should not crash)
- [ ] Very long assessment (>5 minutes of data)
- [ ] Network disconnection during transmission
- [ ] Backend error during processing

## 🐛 Troubleshooting

### Issue: WebSocket not connecting

**Solution:**
1. Check backend running: `lsof -i :5000` (macOS/Linux)
2. Verify `/ws/sensors` endpoint in index.js
3. Check browser console for connection error
4. Ensure test client connects first: `node test-sensor-client.js`

### Issue: Sensor metrics all zero

**Solution:**
1. Verify sensor buffer has data: `console.log(sensorBufferRef.current)`
2. Check JSON structure matches specification
3. Review backend logs for processing errors
4. Test with provided test-sensor-client.js

### Issue: Hybrid metrics not in response

**Solution:**
1. Verify sensorBuffer was sent in POST body
2. Check `hybridEnabled: true` in response
3. Review backend controller logs
4. Ensure sensorMetricsService imports are correct

### Issue: Slow performance

**Solution:**
1. Reduce sensor buffer size (currently unlimited)
2. Limit visualization data points
3. Profile backend: `console.time()` / `console.timeEnd()`
4. Check database connection speed

## 📱 Real ESP32 Integration

Once you have real hardware:

1. **Flash ESP32 with sensor firmware**
   - See [FIRMWARE_UPDATE_FIX.md](backend/FIRMWARE_UPDATE_FIX.md)
   - Configure WiFi credentials
   - Set backend IP address

2. **Update test client to accept real data**
   - Modify `test-sensor-client.js` to skip simulation
   - Or remove entirely once real hardware is active

3. **Deploy backend to cloud** (if needed)
   - Update WebSocket URL in frontend
   - Ensure firewall allows port 5000
   - Consider Heroku, AWS, Azure deployment

## 📈 Monitoring & Logging

### Key Logs to Watch

**Frontend Console:**
```
✅ WebSocket connected to /ws/sensors
📊 Sensor data received: {deviceId: "left-insole", ...}
📝 Buffered sensor packet: 45 packets
💾 Saving assessment with 300 sensor samples
✅ Hybrid metrics retrieved from backend
```

**Backend Console:**
```
Received gait analysis assessment request: {userId: "...", hasSensorData: true}
🔬 Processing sensor buffer with 300 samples
✅ Sensor metrics computed
✅ Hybrid metrics created successfully
Gait analysis assessment saved successfully
```

### Debug Environment Variables

```bash
# In backend .env
DEBUG=gait:*
LOG_LEVEL=debug
```

## 📚 Documentation Files

- `HYBRID_GAIT_ANALYSIS_COMPLETE.md` - Full system architecture
- `sensorMetricsService.js` - Inline code comments
- `hybridMetricsMerger.js` - Inline code comments
- `HybridGaitInsights.jsx` - Component documentation

## 🚀 Next Steps

1. **Test with real ESP32 hardware**
2. **Validate metric accuracy** against clinical standards
3. **Collect baseline normative data**
4. **Train clinicians** on interpreting results
5. **Set up longitudinal tracking** for therapy monitoring
6. **Integrate with patient dashboard**

## 💡 Tips & Best Practices

1. **Always clear sensor buffer** at start of assessment
2. **Validate JSON structure** before processing
3. **Log sensor packet count** for debugging
4. **Monitor processing time** for performance
5. **Test graceful fallback** when sensor data missing
6. **Cache computed metrics** if re-running analysis
7. **Compress sensor buffer** before storing in DB

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review backend logs: `npm start` output
3. Check frontend console: F12 → Console tab
4. Inspect network requests: F12 → Network tab
5. Verify sensor data structure in browser DevTools

---

**Status**: ✅ Ready for Testing
**Version**: 1.0
**Last Updated**: 2024
