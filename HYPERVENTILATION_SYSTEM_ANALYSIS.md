# Hyperventilation Test System - In-Depth Analysis

## System Overview

The hyperventilation test is a 3-phase EEG-based assessment system designed to detect epileptic abnormalities through controlled hyperventilation provocation.

---

## 1. FRONTEND DATA COLLECTION FLOW

### 1.1 Component Hierarchy
```
HyperventilationResponseTest (main component)
├── HyperventilationCautionModal (safety warnings)
├── HyperventilationSignalGraph (live EEG visualization)
├── useHyperventilationEEGStream (WebSocket hook)
└── HyperventilationTestResults (results display)
```

### 1.2 Test Lifecycle Flow

#### Phase 1: Initialization
```
User clicks "Start Test" 
  ↓
Modal shows safety warnings & contraindications
  ↓
User checks acknowledgement & clicks "Agree and Proceed"
  ↓
createTest() function:
  - POST /api/tests/hyperventilation/start
  - Receives: testId (MongoDB ObjectId of EpilepsyTest)
  - Sets: testId state
  - Calls: connect() to open WebSocket
  - Sets: phaseIndex = 0 (baseline phase starts)
```

#### Phase 2: Phase Management (Baseline → Hyperventilation → Recovery)
```
For each phase:
  User clicks "Start Phase"
    ↓
  handlePhaseAction('start') called:
    - Sends: POST /api/tests/hyperventilation/phase
    - Data: { testId, phase: 'baseline'|'hyperventilation'|'recovery', action: 'start', timestamp: ISO }
    - Backend: Records phase.startTime in EpilepsyTest
    - Frontend: Starts countdown timer
    - WebSocket: Receiving & broadcasting EEG data from neuroService
    
  [Phase runs for duration]
  
  Phase auto-ends OR user clicks "End Phase"
    ↓
  handlePhaseAction('end') called:
    - Sends: POST /api/tests/hyperventilation/phase
    - Data: { testId, phase: <phase_name>, action: 'end', timestamp: ISO }
    - Backend: Records phase.endTime in EpilepsyTest
    - Frontend: Stops countdown, advances to next phase
    - phaseIndex increments (0 → 1 → 2 → 3)
```

#### Phase 3: Test Completion
```
User clicks "End Test" on any phase OR last phase auto-completes
  ↓
stopTest() function:
  - Sets: loadingResults = true
  - POST /api/tests/hyperventilation/complete
  - Data: { testId }
  - Waits for response with summary object
  - If response.ok && response.summary:
      ✓ Sets: testResults = summary
      → HyperventilationTestResults component renders
      → Auto-saves to assessments
      → Displays results with charts & metrics
  - Else:
      ✗ Shows: "Results are being processed. Please wait."
      → Loading state stuck if response doesn't have summary
  - Finally:
      - Sets: loadingResults = false
      - Sets: phaseIndex = 3
      - Closes WebSocket connection
```

### 1.3 WebSocket Connection

**Location**: `useHyperventilationEEGStream.js`

**Connection Details**:
```javascript
URL: ws://localhost:5000/tests/hyperventilation/stream?testId={testId}
  
OnMessage Handler:
  - Parses incoming JSON from neuroService broadcast
  - Extracts: eeg_raw (array of ~64 samples), bands, hr, spikeDetected
  - Updates React state: eegData, bands (for live charts)
  - NOT storing data locally (all data should be saved on backend)
```

**Critical Issue #1: WebSocket testId Parameter**
- Frontend correctly passes testId as query parameter
- Backend hyperventilationWebSocket.js expects to receive it via req.query
- But this relies on req.query being properly populated by express-ws

---

## 2. BACKEND DATA FLOW

### 2.1 Test Creation
```
POST /api/tests/hyperventilation/start
  
Handler: startTest()
  Input: { userId (optional) }
  
  Creates EpilepsyTest document:
  {
    _id: <ObjectId>,
    userId: <ObjectId>,
    testType: 'hyperventilation',
    startedAt: <Date>,
    status: 'in-progress',
    phases: [],  // Empty initially, filled by phaseAction
    summaryMetrics: {},
    rawDataRef: <string>
  }
  
  Returns: { success: true, testId: <ObjectId> }
```

### 2.2 Phase Timing Recording
```
POST /api/tests/hyperventilation/phase

Handler: phaseAction()
  Input: { testId, phase: 'baseline'|'hyperventilation'|'recovery', action: 'start'|'end', timestamp: ISO }
  
  On action='start':
    - Finds EpilepsyTest by testId
    - Appends to phases array:
      {
        phaseName: 'baseline'|'hyperventilation'|'recovery',
        startTime: <Date from ISO timestamp>,
        endTime: undefined  // Set on 'end' action
      }
  
  On action='end':
    - Finds last incomplete phase with matching name
    - Sets: phases[i].endTime = <Date>
  
  Returns: { success: true }
```

### 2.3 EEG Data Persistence

**Current Architecture**: Data flows through neuroService → neuroService.broadcast() → hvWs.broadcast()

**Location**: `hyperventilationWebSocket.js`

```javascript
broadcast(payload):
  - Receives: payload from neuroService with { eeg_raw: [...], timestamp, bands, hr, ... }
  - For each connected WebSocket client:
    1. Sends data to frontend
    2. Extracts testId from client context (stored on connect)
    3. If testId exists AND payload.eeg_raw exists:
       → Calls saveSignalFrame(testId, eeg_raw, timestamp)
       → Creates SignalFrame document in MongoDB:
          {
            testId: <ObjectId>,
            timestamp: <Number (ms)>,
            eeg: [sample1, sample2, ...]  // ~64 samples per frame
          }
```

**Critical Issue #2: testId Capture**
- Frontend passes testId as URL query parameter
- Backend index.js should pass it to addClient():
  ```javascript
  app.ws('/tests/hyperventilation/stream', function(ws, req) {
    const testId = req.query?.testId;  // This needs to work
    hvWs.addClient(ws, testId);
  });
  ```
- Without proper testId, frames are saved with testId=undefined
- This breaks later frame retrieval in completeTest()

### 2.4 Test Completion & Analysis

```
POST /api/tests/hyperventilation/complete

Handler: completeTest()
  Input: { testId }
  
  1. Fetch EpilepsyTest document
     - Retrieve all phases with startTime and endTime
  
  2. For EACH phase:
     - Query SignalFrame collection:
       ```
       db.signalframes.find({
         testId: <ObjectId>,
         timestamp: { $gte: startTime.getTime(), $lte: endTime.getTime() }
       })
       ```
     - Flatten all eeg arrays from frames
     - Calculate phase metrics:
       * bandPowers: { delta, theta, alpha, beta, gamma } (%)
       * abnormalities: { spikeCount, slowingIndicator }
       * amplitude: { mean, max, min }
       * rhythmicity: { regular, symmetry }
  
  3. If ALL 3 phases have data:
     - Call generateClinicalIndicators():
       * Compare baseline vs hyperventilation vs recovery
       * Detect patterns (alpha suppression, spike increase, etc.)
       * Assign risk level: 'low' | 'moderate' | 'high'
       * Generate findings and clinical notes
  
  4. Create summary object:
     {
       phaseAnalysis: {
         baseline: { bandPowers, abnormalities, amplitude, ... },
         hyperventilation: { ... },
         recovery: { ... }
       },
       clinicalIndicators: { risk_level, findings, comparison, ... },
       epilepsyScreening: {
         riskLevel: <'low'|'moderate'|'high'>,
         screeningFlag: <string>,
         recommendedAction: <string>
       }
     }
  
  5. Save summary to EpilepsyTest.summaryMetrics
  
  6. Return: { success: true, summary: <object> }
```

---

## 3. DATABASE SCHEMA & STORAGE

### 3.1 EpilepsyTest Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  testType: 'hyperventilation',
  startedAt: Date,
  endedAt: Date,
  status: 'in-progress' | 'completed',
  phases: [
    {
      phaseName: 'baseline' | 'hyperventilation' | 'recovery',
      startTime: Date,
      endTime: Date
    }
  ],
  summaryMetrics: {  // Generic object, stores whatever completeTest() puts there
    // Contains: phaseAnalysis, clinicalIndicators, epilepsyScreening
  },
  rawDataRef: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2 SignalFrame Model
```javascript
{
  _id: ObjectId,
  testId: ObjectId (ref: EpilepsyTest),
  timestamp: Number,  // ms since epoch
  eeg: [Number, Number, ...],  // ~64 ADC values per frame
  ecg: [Number, ...],
  hr: Number,
  createdAt: Date,
  updatedAt: Date
}

Index: { testId: 1, timestamp: 1 }  // For phase-based queries
```

### 3.3 Assessment Model
```javascript
{
  _id: ObjectId,
  userId: String,
  type: 'HYPERVENTILATION_TEST' | 'TREMOR' | ...,
  timestamp: Date,
  data: {  // Full phase analysis
    testId: String,
    phases: { baseline: {...}, hyperventilation: {...}, recovery: {...} },
    clinicalIndicators: {...},
    epilepsyScreening: {...}
  },
  metrics: {  // Flattened metrics for quick display
    riskLevel: String,
    screeningFlag: String,
    recommendedAction: String,
    baselineSpikes: Number,
    hyperventilationSpikes: Number,
    recoverySpikes: Number,
    alphaSuppression: Number,
    deltaIncrease: Number
  },
  status: 'COMPLETED',
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4. RESULTS DISPLAY PIPELINE

### 4.1 Results Component Flow

```
HyperventilationTestResults component receives:
  - summary (from backend completeTest response)
  - testId (for reference)
  
useEffect on mount:
  - Calls handleSaveToAssessments()
    ↓
hyperventilationService.saveTestToAssessments():
  - Extracts metrics from summary object
  - Creates Assessment document:
    {
      userId: user.id,
      type: 'HYPERVENTILATION_TEST',
      data: { testId, phases, clinicalIndicators, epilepsyScreening },
      metrics: { flattened metrics for quick display },
      status: 'COMPLETED'
    }
  - POST /api/assessments
  - Backend Assessment.save() stores document
  
Results display:
  - Tab 0: Phase-by-Phase Analysis (band powers, spikes, amplitude)
  - Tab 1: Band Power Comparison Chart
  - Tab 2: Abnormalities/Spikes Chart
  - Tab 3: Clinical Indicators Table
```

### 4.2 Assessment Reports Display

```
AssessmentDetailDialog component:
  - Receives assessment from reports
  - Calls renderHyperventilationMetrics()
  - Displays flattened metrics:
    * Risk Level
    * Screening Flag
    * Baseline/HV/Recovery Spikes
    * Alpha Suppression %
    * Delta Increase %
    * Recommended Action
```

---

## 5. IDENTIFIED ERRORS & ISSUES

### 🔴 CRITICAL ERRORS

#### Error #1: WebSocket testId Capture Failure
**Location**: `backend/src/index.js`
**Issue**: 
```javascript
app.ws('/tests/hyperventilation/stream', function(ws, req) {
  const testId = req.query?.testId;  // Might be undefined
  hvWs.addClient(ws, testId);  // Passes undefined testId
});
```
**Problem**: If `req.query` is undefined or doesn't have testId, frames are saved with `testId: undefined`

**Consequence**: In completeTest(), frame query fails:
```javascript
const frames = await SignalFrame.find({
  testId: t._id,  // Valid testId from EpilepsyTest
  timestamp: { ... }
});
// Returns 0 frames because they were saved with testId: undefined
```

**Result**: ⚠️ **All metrics show 0** (no frames found = no EEG data = empty metrics)

---

#### Error #2: Band Power Calculation Misalignment
**Location**: `backend/src/controllers/hyperventilationTestController.js`
**Issue**: Band power thresholds don't match actual EEG data format
```javascript
// Current code:
if (absVal >= 0.5 && absVal < 4) bandPowers.delta++;  // Looking for 0.5-4
else if (absVal >= 4 && absVal < 8) bandPowers.theta++;

// But EEG data from simulator is ADC values (0-1023), not voltage (±10μV)
// After DC offset removal: centered values are roughly ±200
// These ranges (0.5-4) will match almost nothing!
```

**Result**: ⚠️ **All band power percentages are 0%**

---

#### Error #3: No DC Offset Removal Before Analysis
**Location**: `backend/src/controllers/hyperventilationTestController.js`
**Issue**: EEG analysis doesn't account for DC offset
```javascript
// ADC values come in range 0-1023 (centered around 512)
// Analysis uses raw values without centering
// Spike detection threshold = mean * 2.5 might be 500+ (too high!)
```

**Result**: ⚠️ **Spike detection fails** (threshold too high, no spikes detected)

---

#### Error #4: Missing Timestamp Type Conversion
**Location**: `backend/src/controllers/hyperventilationTestController.js` line 229
**Issue**:
```javascript
const frames = await SignalFrame.find({
  testId: t._id,
  timestamp: { $gte: p.startTime.getTime(), $lte: p.endTime.getTime() }
});
```
**Problem**: Frontend sends ISO string, backend converts to Date object, then calls `.getTime()` - this works. BUT:
- Frame timestamp is saved as Number (ms)
- Query comparisons are Numbers
- Should work fine, but tight tolerances might miss frames if timing is off

**Result**: ⚠️ **Phase boundaries might exclude edge frames** (frames right at phase start/end)

---

#### Error #5: Phase Timestamp Format Mismatch
**Location**: `backend/src/controllers/hyperventilationTestController.js` phaseAction()
**Issue**:
```javascript
// Frontend sends: timestamp as ISO string
const t = await EpilepsyTest.findById(testId);
t.phases.push({ 
  phaseName: phase, 
  startTime: timestamp ? new Date(timestamp) : new Date()  // Converts ISO to Date
});

// But when querying frames later:
timestamp: { $gte: p.startTime.getTime(), ... }  // Converts Date to ms
```
**Problem**: Conversion chain: ISO string → Date object → ms number creates rounding issues

**Result**: ⚠️ **Off-by-a-few-milliseconds timing misalignment**

---

### ⚠️ MAJOR ISSUES

#### Issue #6: No Error Handling in stopTest
**Location**: `frontend/src/pages/Hyperventilation/HyperventilationResponseTest.jsx` line 101-118
**Issue**:
```javascript
const stopTest = async () => {
  try {
    setLoadingResults(true);
    const resp = await fetch('/api/tests/hyperventilation/complete', {...});
    const json = await resp.json();
    if (resp.ok && json.summary) {
      setTestResults(json.summary);
    } else {
      console.error('Unexpected response format or error:', json);
      // ⚠️ testResults stays null!
    }
  } catch (e) { 
    console.error('stopTest error:', e);  
    // ⚠️ testResults stays null, loadingResults is false after finally block
  } finally {
    setLoadingResults(false);  // Fires regardless of success
    ...
  }
};
```

**Result**: 
- If summary missing → Shows "Results are being processed. Please wait." forever
- User can't tell if it failed or still processing

---

#### Issue #7: No Validation of Phase Data Completeness
**Location**: `backend/src/controllers/hyperventilationTestController.js` completeTest()
**Issue**:
```javascript
for (const p of t.phases) {
  if (!p.startTime || !p.endTime) continue;  // Skip incomplete phases
  
  const frames = await SignalFrame.find({...});
  
  if (frames && frames.length > 0) {
    phaseAnalysis[p.phaseName] = phaseSummary;
    allPhaseData[p.phaseName] = phaseSummary;
  }
  // ⚠️ If no frames found, phase just silently skipped
}

// Later:
if (allPhaseData.baseline && allPhaseData.hyperventilation && allPhaseData.recovery) {
  clinicalIndicators = generateClinicalIndicators(...);  // Requires all 3 phases
}
// If any phase missing → Uses default low-risk indicators
```

**Result**: ⚠️ **Silent failure** if frames aren't found (returns generic low-risk result)

---

#### Issue #8: ADC Value Range Assumptions
**Location**: `backend/src/controllers/hyperventilationTestController.js`
**Issue**: Code assumes certain EEG value ranges but doesn't validate
```javascript
// EEG values come from neuroService as raw values
// neuroSimulator produces: eeg = (8*sin(...) + 4*sin(...) + 2*sin(...) + noise)
// Converted to ADC: eegADC = Math.round(512 + eeg)
// Result: values in range 490-530 approximately

// But band power thresholds assume:
if (absVal >= 0.5 && absVal < 4) delta++;  // Will never match!
```

**Result**: ⚠️ **All band power values are 0%** (no EEG falls into any band)

---

### 📋 MINOR ISSUES

#### Issue #9: No Logging for Debugging
**Location**: All files
**Issue**: Very few console.log statements for tracing data flow
**Result**: Hard to diagnose where data is lost

---

#### Issue #10: Raw Data Not Returned in Response
**Location**: `backend/src/controllers/hyperventilationTestController.js` completeTest()
**Issue**: Summary doesn't include raw frame count or EEG data length
**Result**: Can't validate if data was actually captured from frontend

---

#### Issue #11: Timestamp Units Inconsistency
**Location**: Multiple files
**Issue**: 
- Frontend sends: ISO 8601 string
- Backend stores phases: Date objects
- Backend stores frames: Number (ms)
- Inconsistent types throughout
**Result**: Potential serialization/deserialization bugs

---

## 6. DATA FLOW DIAGRAMS

### Successful Happy Path
```
User starts test
  ↓
POST /start creates EpilepsyTest → returns testId
  ↓
WebSocket connects with testId parameter
  ↓
neuroService broadcasts EEG every ~100ms
  ↓
hvWs.broadcast() saves SignalFrame with testId
  ↓
User completes all 3 phases with start/end timestamps
  ↓
POST /complete queries frames by phase timestamps
  ↓
Frames found → Calculate metrics → Generate summary
  ↓
Response has summary → Display results → Save to assessments
  ✓ SUCCESS
```

### Current Failure Path
```
WebSocket connects but testId is undefined (Issue #1)
  ↓
hvWs.broadcast() saves SignalFrame with testId: null
  ↓
POST /complete tries to find frames by testId
  ↓
No frames found (they were saved with different testId)
  ↓
phaseAnalysis remains empty → metrics all 0
  ↓
Summary returned with 0 values
  ↓
Assessment saved with 0 metrics
  ↓
Reports display 0 spikes, 0 band power, 'Unknown' risk level
  ✗ FAILURE
```

---

## 7. RECOMMENDED FIXES (Priority Order)

### Priority 1: CRITICAL - Fix WebSocket testId Capture
- Verify req.query is populated correctly in express-ws
- Add logging to confirm testId is received
- Fallback mechanism if testId is missing

### Priority 2: CRITICAL - Fix Band Power Thresholds
- Determine actual EEG value ranges (after DC removal)
- Adjust calculateBandPowers() thresholds accordingly
- Add DC offset removal before analysis

### Priority 3: CRITICAL - Fix Spike Detection
- Remove DC offset before threshold calculation
- Use proper statistical methods (mean + std dev)
- Test with actual EEG data

### Priority 4: HIGH - Add Robust Error Handling
- Frontend: Show error message if summary is missing
- Backend: Return detailed error with frame count and reasons
- Log frame retrieval attempts for debugging

### Priority 5: HIGH - Add Data Validation
- Verify all 3 phases have frames before calculating metrics
- Return error if insufficient data
- Include diagnostic info in response (frame counts per phase)

### Priority 6: MEDIUM - Timestamp Standardization
- Use consistent timestamp format throughout (ms since epoch)
- Add tolerance buffer to phase queries (±1-2 seconds)
- Document timestamp handling

### Priority 7: MEDIUM - Add Comprehensive Logging
- Log in hyperventilation WebSocket: client connects, testId received, frames saved
- Log in completeTest: phases found, frames queried, frames found, metrics calculated
- Include frame counts in all logs

---

## 8. TESTING CHECKLIST

Before deployment:
- [ ] Run test with simulator, verify frames are saved to DB
- [ ] Check frame testId matches EpilepsyTest._id
- [ ] Verify 3 phases have complete start/end times
- [ ] Verify frame timestamps fall within phase boundaries
- [ ] Check band power percentages sum to 100% (or close)
- [ ] Verify spike counts are > 0 for some phases
- [ ] Check summary returned from /complete endpoint
- [ ] Verify assessment saved to MongoDB
- [ ] Check assessment displays in reports
- [ ] Verify all metrics are non-zero values

