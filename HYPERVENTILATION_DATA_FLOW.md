# Hyperventilation Test System - Complete Data Flow Architecture

## 1. COMPLETE SYSTEM ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                                 │
│                                                                              │
│  ┌──────────────────────┐                                                  │
│  │  HyperventilationTest │                                                  │
│  │  ResponseTest.jsx     │                                                  │
│  │  (Main Component)     │                                                  │
│  └────────────┬─────────┘                                                  │
│               │                                                              │
│    ┌──────────┼──────────────────────────┐                                 │
│    │          │                          │                                 │
│    ▼          ▼                          ▼                                 │
│ ┌──────────┐ ┌──────────────┐  ┌──────────────────────┐                  │
│ │Caution   │ │Signal Graph  │  │useHyperventilation  │                  │
│ │Modal     │ │(live display)│  │EEGStream (WebSocket)│                  │
│ └──────────┘ └──────────────┘  └──────────────────────┘                  │
│                                          │                                 │
│                                   Open WebSocket:                          │
│                              ws://localhost:5000/...                       │
│                              .../hyperventilation/stream                   │
│                                    ?testId=<ObjectId>                       │
│                                          │                                 │
│    ┌──────────────────────────────────────┘                               │
│    │                                                                        │
│    └────────────┬─────────────────────────────┬──────────────┐            │
│                 │                             │              │            │
│        Ongoing Phase Management        Test Completion   Results Display   │
│        ────────────────────────        ─────────────────  ──────────────  │
│        POST /phase (start/end)    POST /complete          HyperventilationTestResults.jsx
│        Every 60 seconds            Once per test         │
│        Records: phase timing       Returns: summary      └─── Auto-save to Assessments
│                                                                    │
└────────────────────────────────────────────────────────────────────┼───────┘
                                                                      │
                                                                      ▼
                         ┌────────────────────────────────────────────────────┐
                         │              BACKEND (Node.js/Express)              │
                         │                                                     │
                         │  API Endpoints:                                     │
                         │  • POST /tests/hyperventilation/start              │
                         │  • POST /tests/hyperventilation/phase              │
                         │  • POST /tests/hyperventilation/complete           │
                         │  • WebSocket /tests/hyperventilation/stream        │
                         │                                                     │
                         └────────────────────────────────────────────────────┘
```

---

## 2. DETAILED SEQUENCE DIAGRAM: ONE COMPLETE TEST

```
Timeline: 0 seconds to 180+ seconds

TIME    FRONTEND                         BACKEND                        DATABASE
────    ────────                         ───────                        ────────

0s      User clicks "Start Test"
        │
        ├─→ createTest()
        │   └─→ POST /start
        │       └─────────────────────────→ startTest()
        │                                    └─→ Create EpilepsyTest
        │                                        Status: 'in-progress'
        │                                        Phases: []
        │                                        └────────────────────→ INSERT into epilepsytests
        │                                            Returns testId
        │←───────────────────────────────┤ Response: {testId: ObjectId}
        │
        └─→ setTestId(ObjectId)
        └─→ connect() opens WebSocket

1s-60s  [BASELINE PHASE]
        │
        User clicks "Start Phase"
        │
        ├─→ handlePhaseAction('start')
        │   └─→ POST /phase
        │       Data: {testId, phase:'baseline', action:'start'}
        │       └─────────────────────────→ phaseAction()
        │                                    └─→ Find EpilepsyTest
        │                                        └─→ phases.push({
        │                                             phaseName: 'baseline',
        │                                             startTime: <Date>,
        │                                             endTime: undefined
        │                                           })
        │                                        └─→ t.save()
        │                                            └────────────────→ UPDATE epilepsytests
        │←───────────────────────────────┤ Response: {success: true}
        │
        ├─→ setRunningPhase(true)
        ├─→ setCountdown(60)
        │
        WebSocket open, receiving data
        │
        neuroService.broadcast()  ← From neuroSimulator (every 4ms)
        └────────────────┐
                         │ eeg_raw: [512, 514, 516, ...]
                         │ timestamp: 1702190313000
                         │ bands: {delta: 5, ...}
                         │
                         ├─→ hvWs.broadcast(payload)
                         │   ├─→ For each connected client:
                         │   │   ├─→ ws.send(JSON)  ← Frontend receives
                         │   │   │   eegData state updated in real-time
                         │   │   │
                         │   │   └─→ saveSignalFrame()
                         │   │       └─→ Create SignalFrame
                         │   │           {
                         │   │             testId: ObjectId (from ws context),
                         │   │             timestamp: 1702190313000,
                         │   │             eeg: [512, 514, 516, ...]
                         │   │           }
                         │   │           └─────────────────→ INSERT into signalframes
                         │   │
                         │   └─→ Repeat every ~10-15ms (60-100 times/second)
        │
        60s later, baseline auto-ends OR user clicks "End Phase"
        │
        └─→ handlePhaseAction('end')
            └─→ POST /phase
                Data: {testId, phase:'baseline', action:'end'}
                └─────────────────────→ phaseAction()
                                        └─→ Find EpilepsyTest
                                            └─→ Find last 'baseline' phase without endTime
                                                └─→ phases[0].endTime = <Date>
                                                └─→ t.save()
                                                    └─────────────────→ UPDATE epilepsytests

60s-120s [HYPERVENTILATION PHASE]
        │
        └─→ Same process as baseline
            POST /phase start
            WebSocket still receiving frames
            INSERT more SignalFrames (with different timestamp ranges)
            POST /phase end
            UPDATE phases[1].endTime

120s-180s [RECOVERY PHASE]
        │
        └─→ Same process as above
            INSERT more SignalFrames
            Complete phases[2]

180s+   User sees "Test Complete" and clicks "End Test"
        │
        ├─→ stopTest()
        │   └─→ POST /complete
        │       Data: {testId}
        │       └──────────────────────→ completeTest()
        │                                 │
        │                                 ├─→ Find EpilepsyTest by testId
        │                                 │
        │                                 └─→ FOR EACH phase (baseline, hv, recovery):
        │                                     │
        │                                     └─→ QUERY SignalFrames
        │                                         WHERE:
        │                                           testId = EpilepsyTest._id
        │                                           timestamp >= phase.startTime.getTime()
        │                                           timestamp <= phase.endTime.getTime()
        │                                         ←────────────────────────── QUERY signalframes
        │                                         Returns: [frame1, frame2, ...]
        │                                         │
        │                                         ├─→ Flatten all eeg arrays: eegAll = [...]
        │                                         │
        │                                         ├─→ calculateBandPowers(eegAll)
        │                                         │   Returns: {delta: 25%, theta: 20%, ...}
        │                                         │
        │                                         ├─→ detectAbnormalities(eegAll)
        │                                         │   Returns: {spikeCount: 3, slowingIndicator: 45%}
        │                                         │
        │                                         └─→ Store in phaseAnalysis.baseline = {...}
        │                                     
        │                                     └─→ AFTER all 3 phases:
        │                                         generateClinicalIndicators(
        │                                           baseline, hyperventilation, recovery
        │                                         )
        │                                         Returns: {
        │                                           risk_level: 'moderate',
        │                                           findings: [...],
        │                                           comparison: {...}
        │                                         }
        │                                     
        │                                     └─→ Create summary object
        │                                     └─→ EpilepsyTest.summaryMetrics = summary
        │                                     └─→ EpilepsyTest.status = 'completed'
        │                                     └─→ t.save()
        │                                         └───────────────────→ UPDATE epilepsytests
        │
        │←───────────────────────────┤ Response: {success: true, summary: {...}}
        │
        └─→ json.summary received ✓
        └─→ setTestResults(summary)
        └─→ Render HyperventilationTestResults component
            │
            ├─→ useEffect on mount
            │   └─→ handleSaveToAssessments()
            │       └─→ hyperventilationService.saveTestToAssessments()
            │           └─→ POST /api/assessments
            │               Data: {
            │                 userId,
            │                 type: 'HYPERVENTILATION_TEST',
            │                 data: {testId, phases, clinicalIndicators},
            │                 metrics: {flattened metrics},
            │                 status: 'COMPLETED'
            │               }
            │               ────────────────────────→ assessmentController.saveAssessment()
            │                                         └─→ Create Assessment document
            │                                         └─→ assessment.save()
            │                                             └─────────────────→ INSERT into assessments
            │
            └─→ Display results with charts
                ├─→ Tab 0: Phase-by-phase analysis
                ├─→ Tab 1: Band power comparison
                ├─→ Tab 2: Abnormalities
                └─→ Tab 3: Clinical indicators
```

---

## 3. DATA STRUCTURES & TRANSFORMATIONS

### Input Data (from EEG Device/Simulator)
```
neuroService broadcasts every ~10-15ms:
{
  timestamp: 1702190313000,      // ms since epoch
  eeg_raw: [512, 514, 516, 515, 513, 511, ...],  // ~64 samples
  bands: {
    delta: 8,
    theta: 12,
    alpha: 25,
    beta: 35,
    gamma: 20
  },
  hr: 72,
  spikeDetected: false
}
```

### Storage in SignalFrame
```
{
  _id: ObjectId,
  testId: ObjectId,           // Link to EpilepsyTest
  timestamp: 1702190313000,   // Absolute time
  eeg: [512, 514, 516, 515, 513, 511, ...],
  ecg: undefined,
  hr: undefined
}

✓ Stored once per broadcast (~100 documents per second)
✓ Total for 3x60s phases = ~18,000 documents
```

### Processing in Backend
```
Input:  All SignalFrames for one phase (e.g., 6000 frames for 60s)
Step 1: Flatten eeg arrays → 384,000 individual samples
Step 2: Analyze samples:
  - calculateBandPowers(384000 samples) → {delta: 22%, theta: 18%, alpha: 32%, beta: 20%, gamma: 8%}
  - detectAbnormalities(384000 samples) → {spikeCount: 127, slowingIndicator: 43%}
  - Calculate amplitude: mean=512.3, max=742, min=289

Output: Phase summary
{
  phaseName: 'baseline',
  duration: 60,
  sampleCount: 384000,
  bandPowers: {delta: 22, theta: 18, alpha: 32, beta: 20, gamma: 8},
  abnormalities: {spikeCount: 127, slowingIndicator: 43, abnormalCount: 127},
  amplitude: {mean: 512.3, max: 742, min: 289},
  rhythmicity: {regular: 'normal', symmetry: 'bilateral'}
}
```

### Comparison & Clinical Analysis
```
Input: Three phase summaries
{
  baseline: {bandPowers: {alpha: 32}, abnormalities: {spikeCount: 127}},
  hyperventilation: {bandPowers: {alpha: 18}, abnormalities: {spikeCount: 245}},
  recovery: {bandPowers: {alpha: 29}, abnormalities: {spikeCount: 135}}
}

Analysis:
- Alpha suppression (BL to HV): 32 - 18 = 14%  ✓ Expected
- Delta increase (BL to HV): 22 - 31 = -9%     ✗ Unexpected
- Spike increase (BL to HV): 245 - 127 = 118   ✓ Abnormal!
- Spikes reduced in recovery: 245 → 135        ✓ Good
- Risk assessment: Increased spikes during HV = HIGH RISK

Output: Clinical indicators
{
  risk_level: 'high',
  findings: [
    'Spike activity increased during hyperventilation',
    'Alpha activity did not suppress as expected'
  ],
  clinical_notes: 'Abnormal EEG response to hyperventilation - suggests possible epileptic tendency'
}
```

### Final Assessment Storage
```
Assessment document:
{
  _id: ObjectId,
  userId: '65738f1a2b3c4d5e6f7g8h9i',
  type: 'HYPERVENTILATION_TEST',
  timestamp: ISODate("2024-12-10T14:01:35.000Z"),
  data: {
    testId: ObjectId(...),
    phases: {
      baseline: {...},
      hyperventilation: {...},
      recovery: {...}
    },
    clinicalIndicators: {...},
    epilepsyScreening: {...}
  },
  metrics: {
    riskLevel: 'high',
    screeningFlag: 'Possible abnormality detected',
    recommendedAction: 'Further evaluation recommended',
    baselineSpikes: 127,
    hyperventilationSpikes: 245,
    recoverySpikes: 135,
    alphaSuppression: 14,
    deltaIncrease: -9
  },
  status: 'COMPLETED'
}
```

---

## 4. ERROR PROPAGATION PATH

### Error #1: WebSocket testId Undefined

```
Step 1: Frontend connects with testId
  URL: ws://...?testId=65739f4a8c1234567890abcd
  ✓ testId is in URL
  
Step 2: Backend receives WebSocket connection
  app.ws(..., (ws, req) => {
    const testId = req.query?.testId;
    // ❌ req.query might be undefined or empty!
  })
  
Step 3: Result
  testId = undefined
  hvWs.addClient(ws, undefined)  ← Stores undefined in client context
  
Step 4: Frames saved with wrong testId
  saveSignalFrame(undefined, eegData, timestamp)
  Frame saved: {testId: undefined, timestamp: ..., eeg: [...]}
  ❌ Frame has no link to EpilepsyTest!
  
Step 5: Test completion query fails
  const frames = await SignalFrame.find({
    testId: ObjectId(...),  ← Looking for actual test ID
    timestamp: {...}
  });
  
  // But frames were saved with testId: undefined
  // Query returns 0 results
  
Step 6: Metrics all zero
  No frames → No EEG data → All calculations = 0
  
Step 7: Assessment shows zeros
  User sees: "Spikes: 0, Risk: Low" (incorrect!)
```

### Error #2: Band Power Thresholds Wrong

```
EEG data from simulator:
  Raw formula: eeg = 8*sin(...) + 4*sin(...) + 2*sin(...) + noise
  Range: approximately -10 to +10
  Converted to ADC: eegADC = Math.round(512 + eeg)
  ADC range: approximately 490-530
  
Centered after mean removal:
  Centered = ADC - mean(ADC)
  Centered range: approximately -15 to +15
  
But calculateBandPowers looks for:
  if (absVal >= 0.5 && absVal < 4)    delta++  // Range 0.5-4
  else if (absVal >= 4 && absVal < 8) theta++  // Range 4-8
  ...
  
Mismatch:
  Data range: -15 to +15
  Looking for: 0.5-4, 4-8, 8-13, 13-30, 30+
  
  Overlap: Only some data falls in 8-13, 13-30 ranges
  Result: delta=0%, theta=0%, alpha=15%, beta=20%, gamma=5% (very wrong!)
```

### Error #3: Spike Detection Threshold

```
Current code:
  const meanValue = eegData.reduce((a, b) => a + Math.abs(b), 0) / eegData.length;
  const threshold = meanValue * 2.5;
  
With ADC data (mean ≈ 512):
  meanValue = 512
  threshold = 512 * 2.5 = 1280
  
No EEG value can exceed 1280 (max is ~530)!
  Result: spikeCount = 0 always
  
Correct approach would be:
  1. Remove DC offset: centered = eegData.map(v => v - mean)
  2. Calculate threshold on centered data: threshold = stdDev * 2.5
  3. Then detect spikes in actual signal
```

---

## 5. INFORMATION FLOW FOR EACH PHASE

### Baseline Phase (0-60s)

```
Timeline visualization:
0s       ← START (phase.startTime set)
│
├─ 0.01s → SignalFrame #1 (64 samples, 512ms of EEG)
├─ 0.02s → SignalFrame #2
├─ ...
├─ 60s → SignalFrame #6000 (approximately)
│
60s ← END (phase.endTime set)

Each frame:
  testId: 65739f4a8c1234567890abcd
  timestamp: 1702190313000 + (n * 10ms)
  eeg: [512, 514, 516, ...] (64 samples)
  
Total data captured:
  6000 frames × 64 samples = 384,000 samples
  Duration: 60 seconds
  Sample rate: 6400 Hz
```

### Hyperventilation Phase (60-120s)

```
Same as baseline, but different phase name and time range
Different EEG characteristics expected:
  - More high-frequency activity (beta)
  - Possible spike activity
  - Less alpha power (suppression)
```

### Recovery Phase (120-180s)

```
Same as baseline, but recovery time range
Expected normalization:
  - Return toward baseline characteristics
  - Spikes should decrease
  - Alpha should recover
```

---

## 6. WHERE DATA GETS LOST OR CORRUPTED

| Step | Expected | Actual (When Error) | Impact |
|------|----------|-------------------|--------|
| WebSocket testId capture | `testId=ObjectId` | `testId=undefined` | Frames unmatchable |
| Frame storage | 18000 frames total | 0 frames found in query | No data available |
| DC offset removal | Mean subtracted | Raw ADC values used | Thresholds way off |
| Band power calculation | 20-40% per band | All zeros or wrong % | Meaningless metrics |
| Spike detection | 100-500 spikes | 0 spikes | No abnormality detected |
| Phase comparison | Delta: +10% | Delta: 0% | No pattern found |
| Risk assessment | 'high' or 'moderate' | 'low' (default) | False negative |
| Assessment save | Real metrics | Zero values | Wrong diagnosis shown |

---

## 7. VERIFICATION CHECKLIST

Before going to production:

```
✓ Phase 1: Data Capture
  [ ] WebSocket receives testId from URL query parameter
  [ ] Frames are saved to SignalFrame collection
  [ ] All frames have valid testId (not null)
  [ ] Frame timestamps are within phase boundaries
  [ ] 60 seconds × 100 frames/sec = ~6000 frames per phase
  [ ] eeg array in each frame has 64 samples
  
✓ Phase 2: Data Retrieval
  [ ] completeTest finds frames by testId
  [ ] Frame count > 0 for each phase
  [ ] Timestamps span the full phase duration
  [ ] Total samples = 384,000+ per phase
  
✓ Phase 3: Data Analysis
  [ ] calculateBandPowers returns percentages summing to ~100%
  [ ] Band power values > 0 (not all zeros)
  [ ] detectAbnormalities returns spikeCount > 0
  [ ] Spike count increases during HV phase
  [ ] Amplitude statistics (mean, max, min) are realistic
  
✓ Phase 4: Clinical Assessment
  [ ] Risk level is not always 'low'
  [ ] Clinical indicators are populated with findings
  [ ] Comparisons show differences between phases
  
✓ Phase 5: Database Storage
  [ ] EpilepsyTest.summaryMetrics contains non-zero values
  [ ] Assessment document created with metrics
  [ ] Assessment appears in reports
```

