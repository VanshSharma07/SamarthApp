# Hyperventilation Test - Error Summary & Visual Guide

## Critical Error Chain

```
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND: HyperventilationResponseTest           │
│                                                                   │
│  1. createTest() → POST /start                                   │
│     ✓ Creates EpilepsyTest                                       │
│     ✓ Gets testId                                                │
│     ✓ Calls connect() to open WebSocket                          │
│                                                                   │
│     URL: ws://localhost:5000/tests/hyperventilation/stream       │
│           ?testId=<ObjectId>                                      │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND: WebSocket Handler (index.js)          │
│                                                                   │
│  app.ws('/tests/hyperventilation/stream', (ws, req) => {         │
│    const testId = req.query?.testId;  ⚠️  May be undefined!      │
│    hvWs.addClient(ws, testId);                                   │
│  });                                                              │
│                                                                   │
│  ❌ ERROR #1: testId is undefined if req.query doesn't work      │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            BACKEND: Signal Persistence (hvWs.broadcast)         │
│                                                                   │
│  broadcast(payload) {                                            │
│    for (const [ws, { testId }] of wsClients) {                  │
│      if (testId && payload.eeg_raw) {                           │
│        saveSignalFrame(testId, payload.eeg_raw, timestamp)      │
│      }                                                            │
│    }                                                              │
│  }                                                                │
│                                                                   │
│  Saved Document:                                                 │
│  {                                                                │
│    testId: undefined  ⚠️ ⚠️ ⚠️  PROBLEM!                         │
│    timestamp: 1702190400000,                                     │
│    eeg: [512, 515, 518, ...]                                    │
│  }                                                                │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           BACKEND: Test Completion (completeTest)               │
│                                                                   │
│  const frames = await SignalFrame.find({                         │
│    testId: t._id,  ← Looking for specific testId                │
│    timestamp: { $gte: startTime, $lte: endTime }                │
│  });                                                              │
│                                                                   │
│  // ❌ Returns 0 frames                                          │
│  // Because frames were saved with testId: undefined            │
│                                                                   │
│  if (frames.length === 0) {                                      │
│    phaseAnalysis[phase] = undefined  ← Skipped                  │
│  }                                                                │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            BACKEND: Metric Calculation (completeTest)           │
│                                                                   │
│  ❌ ERROR #2 & #3: Band Power Calculation                        │
│                                                                   │
│  function calculateBandPowers(eegData) {  // eegData = []       │
│    eegData.forEach(value => {                                   │
│      if (absVal >= 0.5 && absVal < 4)    // Thresholds wrong!  │
│        bandPowers.delta++;                // Never matches      │
│    });                                                           │
│    return { delta: 0, theta: 0, ... }  // All zeros!           │
│  }                                                                │
│                                                                   │
│  Actual ADC values: 490-530                                      │
│  Looking for ranges: 0.5-4, 4-8, 8-13...                       │
│  Result: ❌ ZERO MATCH                                          │
│                                                                   │
│  ❌ ERROR #3: No DC Offset Removal                              │
│                                                                   │
│  Spike Detection Threshold = mean * 2.5                         │
│  Without DC removal: mean ≈ 512 (!)                            │
│  Threshold = 1280 (impossibly high!)                           │
│  Result: ❌ ZERO SPIKES DETECTED                               │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          BACKEND: Response to Frontend (completeTest)           │
│                                                                   │
│  return res.json({                                               │
│    success: true,                                                │
│    summary: {                                                    │
│      phaseAnalysis: {                                           │
│        baseline: undefined,                                      │
│        hyperventilation: undefined,                             │
│        recovery: undefined                                      │
│      },                                                          │
│      clinicalIndicators: {                                      │
│        risk_level: 'low',  ← Default                            │
│        findings: [],       ← Empty                              │
│        clinical_notes: ''  ← Generic                            │
│      },                                                          │
│      epilepsyScreening: {                                       │
│        riskLevel: 'low',                                        │
│        screeningFlag: 'No significant abnormality detected'     │
│      }                                                            │
│    }                                                              │
│  });                                                              │
│                                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           FRONTEND: Results Display (stopTest)                  │
│                                                                   │
│  const json = await resp.json();                                 │
│  if (resp.ok && json.summary) {                                 │
│    setTestResults(json.summary);  ✓ Sets with zero metrics      │
│  }                                                                │
│                                                                   │
│  HyperventilationTestResults renders with:                      │
│  ┌──────────────────────────────────────┐                       │
│  │ Risk Level: LOW (misleading!)        │                       │
│  │ Baseline Spikes: 0                   │                       │
│  │ HV Spikes: 0                         │                       │
│  │ Recovery Spikes: 0                   │                       │
│  │ Alpha Suppression: 0%                │                       │
│  │ Delta Increase: 0%                   │                       │
│  │ ────────────────────────────────────│                       │
│  │ Reason: NO SIGNAL FRAMES FOUND      │                       │
│  └──────────────────────────────────────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Impact Matrix

| Error | Location | Impact | Severity | User Experience |
|-------|----------|--------|----------|-----------------|
| **#1: testId undefined** | WebSocket handler | Frames saved with wrong ID | 🔴 CRITICAL | Shows 0 values for all metrics |
| **#2: Band power thresholds** | calculateBandPowers() | All band powers = 0% | 🔴 CRITICAL | Misleading analysis |
| **#3: No DC offset removal** | detectAbnormalities() | Spike count = 0 always | 🔴 CRITICAL | Fails to detect abnormalities |
| **#4: Timestamp rounding** | phaseAction() + query | Frames at boundaries missed | 🔴 CRITICAL | Partial data loss |
| **#5: No error handling** | stopTest() | User waits indefinitely | 🔴 CRITICAL | "Processing..." stuck forever |
| **#6: Silent phase failure** | completeTest() | Missing phases ignored | 🟠 HIGH | Wrong analysis when data missing |
| **#7: No validation** | completeTest() | Returns default result | 🟠 HIGH | Doesn't indicate data problem |
| **#8: ADC assumptions** | Both functions | Calculations invalid | 🟠 HIGH | All metrics wrong |
| **#9: No logging** | All files | Can't debug | 🟡 MEDIUM | Hard to diagnose |
| **#10: No raw data in response** | completeTest() | Can't validate capture | 🟡 MEDIUM | No diagnostic info |
| **#11: Timestamp inconsistency** | Multiple files | Type confusion bugs | 🟡 MEDIUM | Potential serialization errors |

---

## Key Data Points to Check in MongoDB

### When Test is Running (phaseIndex = 0, 1, or 2)

**Collection: epilepsytests**
```javascript
db.epilepsytests.findOne({_id: ObjectId("...")})
{
  _id: ObjectId,
  testType: 'hyperventilation',
  status: 'in-progress',
  phases: [
    {
      phaseName: 'baseline',
      startTime: ISODate("2024-12-10T13:58:33.000Z"),
      endTime: ISODate("2024-12-10T13:59:33.000Z")
    },
    {
      phaseName: 'hyperventilation',
      startTime: ISODate("2024-12-10T13:59:33.000Z"),
      endTime: ISODate("2024-12-10T14:00:33.000Z")
    },
    {
      phaseName: 'recovery',
      startTime: ISODate("2024-12-10T14:00:33.000Z"),
      endTime: ISODate("2024-12-10T14:01:33.000Z")
    }
  ]
}
```

**Collection: signalframes**
```javascript
// LOOK FOR THESE DOCUMENTS:
db.signalframes.find({testId: ObjectId("...")}).limit(3)

// ❌ BAD (shows the problem):
[
  {
    _id: ObjectId,
    testId: null,  // ⚠️ Should be the test ObjectId!
    timestamp: 1702190313000,
    eeg: [512, 515, 518, 520, ...]
  },
  {
    _id: ObjectId,
    testId: null,  // ⚠️ testId is undefined!
    timestamp: 1702190313100,
    eeg: [515, 517, 520, 522, ...]
  }
]

// ✓ GOOD (what it should be):
[
  {
    _id: ObjectId,
    testId: ObjectId("65739f4a8c1234567890abcd"),  // ✓ Correct testId
    timestamp: 1702190313000,
    eeg: [512, 515, 518, 520, ...]
  },
  {
    _id: ObjectId,
    testId: ObjectId("65739f4a8c1234567890abcd"),  // ✓ Same testId
    timestamp: 1702190313100,
    eeg: [515, 517, 520, 522, ...]
  }
]
```

### After Test Completion

**Collection: epilepsytests**
```javascript
db.epilepsytests.findOne({_id: ObjectId("...")})
{
  // ... all above fields ...
  status: 'completed',
  endedAt: ISODate("2024-12-10T14:01:35.000Z"),
  summaryMetrics: {
    // This should contain phaseAnalysis, clinicalIndicators, epilepsyScreening
    // ❌ If empty or has zeros, testId problem confirmed
    phaseAnalysis: {
      baseline: {
        bandPowers: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },  // ⚠️ All zeros!
        abnormalities: { spikeCount: 0, slowingIndicator: 0 }  // ⚠️ All zeros!
      }
      // ... same for hyperventilation, recovery ...
    }
  }
}
```

**Collection: assessments**
```javascript
db.assessments.findOne({type: 'HYPERVENTILATION_TEST'})
{
  userId: "...",
  type: 'HYPERVENTILATION_TEST',
  metrics: {
    riskLevel: 'low',  // ⚠️ Always low if no data
    baselineSpikes: 0,
    hyperventilationSpikes: 0,
    recoverySpikes: 0,
    alphaSuppression: 0,
    deltaIncrease: 0
  }
}
```

---

## Quick Debug Checklist

```bash
# 1. Check if frames are being saved at all
db.signalframes.countDocuments({})  # Should be > 0 during/after test

# 2. Check if testId is present
db.signalframes.find({testId: null}).countDocuments()  # Should be 0
db.signalframes.find({testId: {$exists: true}}).countDocuments()  # Should be > 0

# 3. Check if phases have complete timing
db.epilepsytests.findOne().phases  # All should have startTime AND endTime

# 4. Verify phase time matches frame time
# Get a frame timestamp
var frame = db.signalframes.findOne()
# Check if it falls within phase boundaries
var test = db.epilepsytests.findOne({_id: frame.testId})
# Look at test.phases[0].startTime.getTime() vs frame.timestamp

# 5. Check final metrics
db.epilepsytests.findOne().summaryMetrics  # Should have non-zero values

# 6. Check assessment was saved
db.assessments.findOne({type: 'HYPERVENTILATION_TEST'})  # Should exist
```

---

## Root Cause Summary

| Problem | Root Cause | Why It Matters |
|---------|-----------|-----------------|
| **0 spikes, 0 band power** | testId is undefined when WebSocket connects | Frames can't be found → no data to analyze |
| **All metrics are 0** | Band power thresholds don't match ADC value ranges | No EEG samples fall into frequency bands |
| **No spike detection** | No DC offset removal before threshold calculation | Spike threshold becomes impossibly high |
| **Results stuck** | No error handling in stopTest() | User waits forever if summary missing |
| **Wrong risk level** | Default low-risk returned if data missing | False negative diagnosis |

---

## System Health Diagnosis

Run this in browser console during test:

```javascript
// Check if WebSocket is connected
console.log(wsRef.current?.readyState);  // 1 = OPEN, 0 = CONNECTING, 3 = CLOSED

// Check if testId was captured
console.log(testId);  // Should be non-empty ObjectId string

// Check if data is flowing
console.log('EEG samples received:', eegData.length);  // Should increase over time

// Check phase timing
console.log('Current phase:', DEFAULT_PHASES[phaseIndex].name);
console.log('Phase running:', runningPhase);
console.log('Countdown:', countdown);
```

And in backend console:

```javascript
// Should see logs like:
// "HV WS client connected with testId: 65739f4a8c1234567890abcd"
// "HV WS broadcast to 1 clients, payload has eeg_raw: true"
// "Saved EEG frame for testId: 65739f4a8c1234567890abcd samples: 64"
// "[completeTest] Found 156 frames for phase baseline"
// "[completeTest] Total EEG samples for phase: 10000"
```

