# Hyperventilation Response Test - Architecture Analysis

## Overview
The Hyperventilation Response Test is a neurological assessment that measures EEG and ECG responses during controlled breathing phases. It's designed to detect abnormalities that may be provoked by hyperventilation, particularly relevant for epilepsy screening.

---

## System Architecture

### Frontend Components

#### 1. **HyperventilationResponseTest.jsx** (Main Component)
**Location:** `frontend/src/pages/Hyperventilation/HyperventilationResponseTest.jsx`

**Responsibilities:**
- Manages test lifecycle (intro → phases → completion)
- Controls three phases: baseline, hyperventilation, recovery
- Handles phase timing and UI state transitions

**Key Features:**
- **Phase Structure:**
  - Baseline: 60-120 seconds (default: 60s)
  - Hyperventilation: 120-180 seconds (default: 120s)
  - Recovery: 60-120 seconds (default: 60s)

- **State Management:**
  - `testId`: Unique identifier for test session
  - `phaseIndex`: Current phase (-1=intro, 0-2=phases, 3=complete)
  - `countdown`: Remaining time in current phase
  - `runningPhase`: Whether phase is actively running

- **Data Flow:**
  ```
  Test Start → Creates test (POST /api/tests/hyperventilation/start)
           ↓
  WebSocket Connection → Receives real-time EEG/ECG data
           ↓
  Phase Lifecycle → Start Phase → Run Timer → End Phase
           ↓
  Complete Test → POST /api/tests/hyperventilation/complete
  ```

**UI Elements:**
- Instructions and safety warnings
- Live signal graphs (EEG, ECG)
- Heart rate display
- Band power visualization (delta, theta, alpha, beta, gamma)
- Spike detection indicator (red glow when spike detected)
- Phase control buttons (Start/End Phase, End Test)

---

#### 2. **useHyperventilationEEGStream.js** (Custom Hook)
**Location:** `frontend/src/pages/Hyperventilation/useHyperventilationEEGStream.js`

**Responsibilities:**
- WebSocket connection management for real-time streaming
- EEG/ECG signal processing
- Heart rate and band power calculation

**WebSocket Configuration:**
- URL: `ws://localhost:5000/tests/hyperventilation/stream` (configurable via `VITE_HV_WS`)
- Sends `testId` as query parameter when connecting

**Data Received:**
```javascript
{
  eeg_raw: [number[]],      // Raw EEG samples
  ecg_raw: [number[]],      // Raw ECG samples
  hr: number,               // Heart rate
  bands: {                  // Frequency bands
    delta: number,
    theta: number,
    alpha: number,
    beta: number,
    gamma: number
  },
  spikeDetected: boolean    // Abnormal spike indicator
}
```

**Processing:**
- Maintains rolling window of 1024 samples for each signal
- Updates heart rate in real-time
- Brief visual feedback (800ms) when spike detected

---

#### 3. **HyperventilationSignalGraph.jsx** (Visualization)
**Location:** `frontend/src/pages/Hyperventilation/HyperventilationSignalGraph.jsx`

**Responsibilities:**
- Display live EEG and ECG waveforms
- Show connection status and heart rate
- Real-time chart updates

**Charts:**
- EEG graph: Blue line, low tension for smooth curves
- ECG graph: Pink line, even smoother curves
- Displays connection status: `(connected)` or `(disconnected)`

---

### Backend Components

#### 1. **hyperventilationTestController.js** (Test Management)
**Location:** `backend/src/controllers/hyperventilationTestController.js`

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tests/hyperventilation/start` | POST | Create test session |
| `/api/tests/hyperventilation/phase` | POST | Record phase start/end |
| `/api/tests/hyperventilation/complete` | POST | Finalize test & compute summary |
| `/api/tests/hyperventilation/:testId` | GET | Retrieve test details |

**Workflow:**

1. **startTest()** - Creates test record
   - Input: `userId` (optional)
   - Output: `testId`
   - Creates EpilepsyTest document with status='in-progress'

2. **phaseAction()** - Records phase timing
   - Input: `testId`, `phase` (baseline|hyperventilation|recovery), `action` (start|end), `timestamp`
   - Records phase start/end times in database
   - Action='start': Adds new phase entry
   - Action='end': Sets endTime on last matching phase

3. **completeTest()** - Finalizes test & computes metrics
   - Input: `testId`
   - Calculates average heart rate per phase from SignalFrame data
   - Stores summary: `baselineHR`, `hvHR`, `recoveryHR`
   - Sets status='completed'

4. **getTest()** - Retrieves test data
   - Input: `testId`
   - Returns full test document

---

#### 2. **hyperventilationSignalController.js** (Data Ingestion)
**Location:** `backend/src/controllers/hyperventilationSignalController.js`

**Endpoint:**
- POST `/api/tests/hyperventilation/data` - Ingest signal samples

**Functionality:**
- Receives batch signal samples (EEG, ECG, HR)
- Stores in `SignalFrame` collection
- Each frame includes: `testId`, `timestamp`, `eeg[]`, `ecg[]`, `hr`

---

#### 3. **hyperventilationWebSocket.js** (Real-time Broadcasting)
**Location:** `backend/src/controllers/hyperventilationWebSocket.js`

**Responsibilities:**
- Manages active WebSocket connections
- Broadcasts signal data to all connected clients
- Handles client disconnections

**Key Functions:**
```javascript
addClient(ws)      // Register new WebSocket
broadcast(payload) // Send data to all clients
clientCount()      // Get active connection count
```

---

#### 4. **EpilepsyTest Model**
**Location:** `backend/src/models/EpilepsyTest.js`

**Schema:**
```javascript
{
  userId: ObjectId,
  testType: 'hyperventilation',
  startedAt: Date,
  endedAt: Date,
  status: 'in-progress' | 'completed',
  phases: [{
    phaseName: 'baseline' | 'hyperventilation' | 'recovery',
    startTime: Date,
    endTime: Date
  }],
  summaryMetrics: {
    baselineHR: Number,
    hvHR: Number,
    recoveryHR: Number
  },
  rawDataRef: String
}
```

---

#### 5. **SignalFrame Model**
**Location:** `backend/src/models/SignalFrame.js`

**Schema:**
```javascript
{
  testId: ObjectId,
  timestamp: Date,
  eeg: [Number],
  ecg: [Number],
  hr: Number
}
```
Stores raw signal samples for analysis and archival.

---

### Routes Integration

**File:** `backend/src/routes/hyperventilationTestRoutes.js`

```javascript
router.post('/start', startTest);
router.post('/phase', phaseAction);
router.post('/data', ingestSignalData);
router.post('/complete', completeTest);
router.get('/:testId', getTest);
```

Mounted at: `/api/tests/hyperventilation`

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HyperventilationResponseTest (Main)                            │
│         ↓                              ↓                        │
│  useHyperventilationEEGStream    HyperventilationSignalGraph    │
│  (WebSocket Stream)              (Visualization)                │
│         ↓                                                        │
│  WebSocket: ws://localhost:5000/tests/hyperventilation/stream   │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                  HTTP REST + WebSocket
                                 │
┌────────────────────────────────↓────────────────────────────────┐
│                         BACKEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ hyperventilationTestController                          │   │
│  │ - startTest()    → /start (POST)                        │   │
│  │ - phaseAction()  → /phase (POST)                        │   │
│  │ - completeTest() → /complete (POST)                     │   │
│  │ - getTest()      → /:testId (GET)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Database (MongoDB)                                      │   │
│  │ - EpilepsyTest (test sessions & metadata)              │   │
│  │ - SignalFrame (raw EEG/ECG samples)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ hyperventilationWebSocket                               │   │
│  │ - addClient(ws)                                         │   │
│  │ - broadcast(payload) → Real-time data to all clients   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Test Execution Flow

### Timeline of a Test Session

1. **Initialization (phaseIndex = -1)**
   - User sees intro screen with instructions
   - Safety warning displayed
   - Click "Start Test" button

2. **Test Creation**
   - POST `/api/tests/hyperventilation/start`
   - Backend creates EpilepsyTest document
   - Returns `testId`
   - Frontend connects WebSocket with testId

3. **Baseline Phase (phaseIndex = 0)**
   - Duration: 60 seconds (default)
   - Records normal EEG/ECG without intervention
   - Click "Start Phase" → Countdown begins
   - Real-time signals displayed
   - Click "End Phase" → moves to next phase

4. **Hyperventilation Phase (phaseIndex = 1)**
   - Duration: 120 seconds (default)
   - User instructed: "Breathe deeply and rapidly"
   - Red "STOP IMMEDIATELY" button always visible
   - Monitors for abnormal spikes
   - Countdown auto-ends phase when timer reaches 0

5. **Recovery Phase (phaseIndex = 2)**
   - Duration: 60 seconds (default)
   - Normal breathing, monitor recovery
   - Similar to baseline phase

6. **Test Completion (phaseIndex = 3)**
   - POST `/api/tests/hyperventilation/complete`
   - Backend:
     - Calculates average HR for each phase
     - Creates summary: baselineHR, hvHR, recoveryHR
     - Sets status='completed'
   - Frontend shows summary
   - "Download Report (PDF)" button available

---

## Key Metrics & Indicators

### Heart Rate Monitoring
- Calculated in real-time from ECG signals
- Comparison across phases:
  - **Baseline HR** vs **HV HR**: Typically increases during hyperventilation
  - **Recovery HR**: Should trend back toward baseline

### EEG Band Powers
- **Delta (0-4 Hz)**: Deep sleep activity
- **Theta (4-8 Hz)**: Drowsiness, meditation
- **Alpha (8-12 Hz)**: Relaxed/awake state
- **Beta (12-30 Hz)**: Active, focused state
- **Gamma (30+ Hz)**: High cognitive activity, abnormalities

### Spike Detection
- Real-time abnormality detection
- Visual indicator: Red glowing circle
- 800ms visual feedback when spike detected

---

## Configuration

### Environment Variables

**Frontend (.env):**
```
VITE_HV_WS=ws://your-server:5000/tests/hyperventilation/stream
```

**Backend:**
- WebSocket endpoint: `ws://localhost:5000/tests/hyperventilation/stream`
- REST base: `/api/tests/hyperventilation`

### Default Phase Durations
```javascript
const DEFAULT_PHASES = [
  { name: 'baseline', min: 60, max: 120, default: 60 },
  { name: 'hyperventilation', min: 120, max: 180, default: 120 },
  { name: 'recovery', min: 60, max: 120, default: 60 }
];
```

---

## Data Storage

### Test Session Example
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  testType: 'hyperventilation',
  startedAt: ISODate("2025-12-10T10:00:00.000Z"),
  endedAt: ISODate("2025-12-10T10:05:00.000Z"),
  status: 'completed',
  phases: [
    {
      phaseName: 'baseline',
      startTime: ISODate("2025-12-10T10:00:05.000Z"),
      endTime: ISODate("2025-12-10T10:01:05.000Z")
    },
    {
      phaseName: 'hyperventilation',
      startTime: ISODate("2025-12-10T10:01:10.000Z"),
      endTime: ISODate("2025-12-10T10:03:10.000Z")
    },
    {
      phaseName: 'recovery',
      startTime: ISODate("2025-12-10T10:03:15.000Z"),
      endTime: ISODate("2025-12-10T10:04:15.000Z")
    }
  ],
  summaryMetrics: {
    baselineHR: 68,
    hvHR: 92,
    recoveryHR: 75
  }
}
```

---

## Potential Issues & Considerations

### 1. **WebSocket Connection Reliability**
- Depends on continuous network connectivity
- Client reconnection not implemented
- If connection drops, no more data arrives

### 2. **Data Synchronization**
- Phase timing recorded via HTTP POST
- Signal data streamed via WebSocket
- Could be out-of-sync if messages arrive out-of-order

### 3. **Error Handling**
- Limited error handling in phase transitions
- No automatic retry for failed API calls
- WebSocket errors logged but not displayed to user

### 4. **Performance**
- Maintains 1024-sample rolling window per signal
- Real-time chart updates on every message
- Could be heavy for low-bandwidth connections

### 5. **Data Integrity**
- No validation of phase sequence
- Overlapping or out-of-order phases possible
- No check that test reached all phases

---

## Security Considerations

1. **User Identification**
   - `userId` is optional and not validated
   - No authentication on WebSocket connection
   - Anyone with testId can access stream data

2. **Data Privacy**
   - Raw EEG/ECG data stored in database
   - Sensitive health information requires HIPAA compliance
   - No encryption mentioned

3. **Recommendations**
   - Implement auth middleware on WebSocket route
   - Validate userId ownership before test creation
   - Encrypt sensitive data at rest and in transit

---

## Summary

The **Hyperventilation Response Test** is a well-structured neurological assessment system that:
- ✅ Manages three-phase test sessions with timing control
- ✅ Streams real-time EEG/ECG signals via WebSocket
- ✅ Calculates metrics (HR, band powers, spike detection)
- ✅ Stores comprehensive test data and raw signals
- ⚠️ Lacks robust error handling and reconnection logic
- ⚠️ Has security gaps in authentication/authorization

The system is suitable for supervised clinical testing with proper monitoring.
