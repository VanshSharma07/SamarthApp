# Hyperventilation Test - Debug Flow Verification

## Steps to Test and Diagnose

### 1. Restart Backend with Logging
```bash
cd backend
npm start
```

**Expected Logs on Startup:**
- `Neuro simulator started (sampleRate=250)`
- No errors about express-ws

### 2. Start a New Test in Frontend

**Watch Backend Console for:**

#### A. Test Creation (POST /start)
```
[startTest] Creating new test...
```

#### B. WebSocket Connection
```
[index.js] HV WebSocket connection attempt, URL: /tests/hyperventilation/stream?testId=<OBJECT_ID>
[HV WS] Client connecting with testId: <OBJECT_ID> from URL: ...
[addClient] testId type: string length: 24 value: "..."
[addClient] Total clients after add: 1
```

**❌ If you don't see these logs:**
- Frontend isn't connecting WebSocket
- Check browser console for connection errors
- Verify URL construction in `useHyperventilationEEGStream.js`

#### C. Data Broadcasting (every ~250ms during phases)
```
[hvWs.broadcast] Called with clients: 1 has eeg_raw: true timestamp: 1702190313000
[hvWs.broadcast] Processing client, testId: <OBJECT_ID>
[hvWs.broadcast] Calling saveSignalFrame with testId: <OBJECT_ID>
[saveSignalFrame] START - testId: <OBJECT_ID> eegData length: 64 timestamp: 1702190313000
[saveSignalFrame] ✓✓✓ SUCCESS - Saved frame for testId: <OBJECT_ID> samples: 64 timestamp: 1702190313000
```

**❌ If clients: 0:**
- WebSocket never connected
- Check testId in frontend

**❌ If has_eeg_raw: false:**
- neuroSimulator not running
- Check neuroService._onSerialData

**❌ If testId is undefined:**
- URL parsing failed
- Check req.query and fallback parsing

**❌ If saveSignalFrame errors:**
- Check MongoDB connection
- Check SignalFrame model

### 3. During Phase Execution

**Watch for continuous frame saves:**
```
[saveSignalFrame] ✓✓✓ SUCCESS - Saved frame... (should appear ~4 times per second)
```

**Count frames in MongoDB:**
```javascript
// In MongoDB shell or Compass
db.signalframes.countDocuments()  // Should be increasing
db.signalframes.findOne({}, {sort: {_id: -1}})  // Check latest frame has testId
```

### 4. Test Completion (POST /complete)

**Expected Logs:**
```
[completeTest] Starting analysis for testId: <OBJECT_ID>
[completeTest] Test found with 3 phases
[completeTest] Querying frames for phase: baseline from ... to ...
[completeTest] Found XXX frames for phase: baseline
[calculateBandPowers] Samples: 38400 Mean: 512.34 Centered range: -18.21 to 19.45
[calculateBandPowers] Result: { delta: 0, theta: 0, alpha: 85, beta: 12, gamma: 3 }
[detectAbnormalities] Phase: baseline Samples: 38400 Mean: 512.34 StdDev: 8.92 Threshold: 22.30
[detectAbnormalities] Result: Spikes: 127 Slowing: 43%
[completeTest] Phase analysis complete. Frames per phase: { baseline: 156, hyperventilation: 158, recovery: 155 }
```

**❌ If "Found 0 frames":**
- Frames were saved with wrong testId
- Check frame saves had correct testId
- Verify phase timestamps match frame timestamps

**❌ If "All band powers: 0":**
- DC offset removal isn't working
- Check calculateBandPowers logic

## Common Issues and Solutions

### Issue 1: WebSocket Never Connects
**Symptoms:** `clients: 0` in broadcast logs
**Solution:** 
- Check frontend WebSocket URL construction
- Verify backend WebSocket route is registered
- Check for CORS issues

### Issue 2: testId is undefined
**Symptoms:** `testId: undefined` in addClient logs
**Solution:**
- Verify frontend passes testId in URL: `?testId=${testId}`
- Check req.query parsing in index.js
- Enable fallback URL parsing

### Issue 3: No Frames Saved
**Symptoms:** `db.signalframes.countDocuments()` returns 0
**Solution:**
- Verify testId is not null in saveSignalFrame
- Check MongoDB connection is active
- Verify SignalFrame model is imported correctly

### Issue 4: Frames Saved but Not Found
**Symptoms:** Frame count > 0 but completeTest finds 0 frames
**Solution:**
- Check testId in frames matches testId in EpilepsyTest
- Verify timestamp ranges match phase boundaries
- Add tolerance buffer to phase queries (already implemented)

### Issue 5: All Metrics Show 0
**Symptoms:** Band powers: 0%, Spikes: 0
**Solution:**
- Check DC offset removal is working (mean should be ~512)
- Verify centered data range is ~-20 to +20
- Check band power thresholds match centered data

## Manual Verification Commands

### Check if frames are being saved
```javascript
// MongoDB Shell
use samarth-neuro
db.signalframes.countDocuments()
db.signalframes.findOne({}, {sort: {_id: -1}})
```

### Check specific test frames
```javascript
// Replace with actual testId
const testId = ObjectId("675865e5c46f8a1234567890")
db.signalframes.find({testId: testId}).count()
db.signalframes.find({testId: testId}).limit(3).pretty()
```

### Check test document
```javascript
db.epilepsytests.findOne({}, {sort: {_id: -1}}).pretty()
```

### Verify phase timing
```javascript
const test = db.epilepsytests.findOne({}, {sort: {_id: -1}})
test.phases.forEach(p => {
  print(p.phaseName + ': ' + p.startTime + ' to ' + p.endTime)
  print('Duration: ' + ((p.endTime - p.startTime) / 1000) + ' seconds')
})
```
