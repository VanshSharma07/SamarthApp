# AI Analysis Panel - Component Interaction Diagram

## System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              Analytics Page (Analytics.jsx)                      │       │
│  │                                                                   │       │
│  │  Tab 3: AI Analysis Tab                                         │       │
│  │  ┌──────────────────────────────────────────────────────┐      │       │
│  │  │     AiAnalysisPanel Component                        │      │       │
│  │  │                                                       │      │       │
│  │  │  [Analyse Report with AI] [Export to PDF]          │      │       │
│  │  │                                                       │      │       │
│  │  │  ┌─────────────────┬─────────────────┬──────────────┐│      │       │
│  │  │  │  Parkinson's    │  Bell's Palsy   │  ALS        ││      │       │
│  │  │  │  • Risk: HIGH   │  • Risk: LOW    │  • Risk: MOD││      │       │
│  │  │  │  • Conf: 85%    │  • Conf: 45%    │  • Conf: 62%││      │       │
│  │  │  │  • Indicators   │  • Indicators   │  • Indicators││      │       │
│  │  │  │  • Recomm.      │  • Recomm.      │  • Recomm.  ││      │       │
│  │  │  └─────────────────┴─────────────────┴──────────────┘│      │       │
│  │  │                                                       │      │       │
│  │  │  [Overall Assessment Box]                            │      │       │
│  │  │  [Medical Disclaimer]                                │      │       │
│  │  └──────────────────────────────────────────────────────┘      │       │
│  │                                                                   │      │
│  │  State:                                                          │      │
│  │  • loading: boolean                                             │      │
│  │  • error: string | null                                         │      │
│  │  • aiResults: object | null                                     │      │
│  │  • snackbar: {open, message, severity}                         │      │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    │ fetchAiAnalysis(userId)               │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │     Assessment Service (assessmentService.js)                    │       │
│  │                                                                   │       │
│  │  fetchAiAnalysis(userId)                                        │       │
│  │    └─ api.post(`/assessments/${userId}/ai-analysis`)           │       │
│  │                                                                   │       │
│  │  Other Services:                                                │       │
│  │  • getAssessmentHistory()                                       │       │
│  │  • getBaselineData()                                            │       │
│  │  • saveAssessment()                                             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    │ HTTP POST                              │
│                                    ▼                                        │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Node.js/Express)                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Assessment Routes (assessmentRoutes.js)                        │       │
│  │                                                                   │       │
│  │  POST /assessments/:userId/ai-analysis                         │       │
│  │  ├─ Middleware: auth (JWT validation)                          │       │
│  │  └─ Controller: getAiAnalysis                                  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  Controller: getAiAnalysis (assessmentController.js)           │       │
│  │                                                                   │       │
│  │  1. Validate userId                                            │       │
│  │  2. Query Main Assessment Collection                           │       │
│  │  3. IF < 5 assessments:                                        │       │
│  │     Query 8 Specialized Collections (Parallel):               │       │
│  │     • TremorAssessment                                         │       │
│  │     • SpeechPatternAssessment                                  │       │
│  │     • ResponseTimeAssessment                                   │       │
│  │     • FacialSymmetryAssessment                                 │       │
│  │     • FingerTappingAssessment                                  │       │
│  │     • EyeMovementAssessment                                    │       │
│  │     • GaitAnalysisAssessment                                   │       │
│  │     • NeckMobilityAssessment                                   │       │
│  │  4. Combine & deduplicate results                              │       │
│  │  5. Call AI Service                                             │       │
│  │  6. Return structured response                                 │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  AI Service (aiService.js)                                      │       │
│  │                                                                   │       │
│  │  getAiAnalysisResults(assessments)                             │       │
│  │    ├─ transformAssessmentsData()                               │       │
│  │    │  └─ Normalize 8 assessment types                         │       │
│  │    ├─ createAiPrompt()                                         │       │
│  │    │  └─ Build comprehensive prompt with all metrics          │       │
│  │    ├─ [GEMINI API CALL]                                        │       │
│  │    │  └─ Model: gemini-2.0-flash                              │       │
│  │    └─ parseAiResponse()                                        │       │
│  │       └─ Extract structured JSON with fallbacks               │       │
│  │                                                                   │       │
│  │  Output Structure:                                             │       │
│  │  {                                                              │       │
│  │    parkinsonsDisease: {riskLevel, confidence, indicators, rec} │       │
│  │    bellsPalsy: {riskLevel, confidence, indicators, rec}        │       │
│  │    als: {riskLevel, confidence, indicators, rec}               │       │
│  │    overallAssessment: "text"                                   │       │
│  │    disclaimerNote: "text"                                      │       │
│  │  }                                                              │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ JSON Response
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICE                                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Google Gemini API (gemini-2.0-flash)                                      │
│  ├─ Base URL: https://generativelanguage.googleapis.com/v1beta/models/...  │
│  ├─ Authentication: API Key in query parameter                             │
│  ├─ Request: JSON with prompt and generation config                        │
│  ├─ Configuration:                                                          │
│  │  • temperature: 0.2 (consistent, deterministic)                         │
│  │  • topP: 0.8 (diverse but focused)                                      │
│  │  • topK: 40                                                              │
│  │  • maxOutputTokens: 1024                                                 │
│  │  • responseMimeType: application/json                                    │
│  └─ Response: Structured text in JSON format                               │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Transformation Pipeline

```
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Raw Assessment Data Collection                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  From Database Collections:                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Assessment (Main)              Specialized Collections          │    │
│  │ {                              {                                │    │
│  │   _id: ObjectId,               _id: ObjectId,                   │    │
│  │   userId: "user123",           userId: "user123",              │    │
│  │   type: "TREMOR",              type: "TREMOR_ASSESSMENT",      │    │
│  │   metrics: {...},              metrics: {...},                 │    │
│  │   timestamp: Date,             timestamp: Date,                │    │
│  │   status: "COMPLETED"          status: "COMPLETED"             │    │
│  │ }                              }                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│  Combined Result:                                                        │
│  [                                                                        │
│    {type: "TREMOR", metrics: {...}, timestamp: Date},                   │
│    {type: "SPEECH_PATTERN", metrics: {...}, timestamp: Date},           │
│    {type: "FACIAL_SYMMETRY", metrics: {...}, timestamp: Date},          │
│    {type: "RESPONSE_TIME", metrics: {...}, timestamp: Date},            │
│    ... (up to 8 types)                                                   │
│  ]                                                                        │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 2: transformAssessmentsData()                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Input Processing:                                                       │
│  • Map type names to standard internal types                             │
│  • Handle both camelCase and snake_case metrics                          │
│  • Select most recent assessment for each type                           │
│  • Validate metrics structure                                            │
│                                                                            │
│  Output Structure:                                                       │
│  {                                                                        │
│    tremor: {                      // or null if not available            │
│      timestamp: Date,                                                     │
│      metrics: {                                                           │
│        tremor_frequency: 8.5,                                            │
│        tremor_amplitude: 2.3,                                            │
│        tremor_type: "resting",                                           │
│        severity: "moderate",                                             │
│        overall: { tremorScore: 7 }                                       │
│      }                                                                    │
│    },                                                                     │
│    speech: {                                                             │
│      timestamp: Date,                                                     │
│      metrics: {                                                           │
│        clarity: { score: 8 },                                            │
│        speechRate: { wordsPerMinute: 145 },                              │
│        volumeControl: { score: 7 },                                      │
│        emotion: {confidence: 8, hesitation: 3, stress: 5, monotony: 4} │
│      }                                                                    │
│    },                                                                     │
│    responseTime: { ... },                                                │
│    facialSymmetry: { ... },                                              │
│    fingerTapping: { ... },                                               │
│    eyeMovement: { ... },                                                 │
│    gaitAnalysis: { ... },                                                │
│    neckMobility: { ... }                                                 │
│  }                                                                        │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 3: createAiPrompt()                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Prompt Template:                                                        │
│                                                                            │
│  "Analyze the following patient's neuromotor assessment data...           │
│                                                                            │
│   TREMOR ASSESSMENT (Date: 12/11/2025):                                 │
│   - Frequency: 8.5 Hz                                                    │
│   - Amplitude: 2.3                                                       │
│   - Type: resting                                                        │
│   - Severity: moderate                                                   │
│   - Overall Tremor Score: 7/10                                           │
│                                                                            │
│   SPEECH PATTERN ASSESSMENT (Date: 12/11/2025):                         │
│   - Clarity: 8/10                                                        │
│   - Speech Rate: 145 words per minute                                    │
│   - Volume Control: 7/10                                                 │
│   - Overall Score: 7.5/10                                                │
│   - Confidence: 8/10                                                     │
│   - Hesitation: 3/10                                                     │
│   - Stress: 5/10                                                         │
│   - Monotony: 4/10                                                       │
│                                                                            │
│   [... all 8 assessment types ...]                                       │
│                                                                            │
│   IMPORTANT: Your response MUST be valid JSON without any additional     │
│   text, explanations, or markdown...                                     │
│                                                                            │
│   {                                                                       │
│     'parkinsonsDisease': {...},                                          │
│     'bellsPalsy': {...},                                                 │
│     'als': {...},                                                        │
│     'overallAssessment': '...',                                          │
│     'disclaimerNote': '...'                                              │
│   }"                                                                      │
│                                                                            │
│  Prompt Length: ~3000-5000 characters                                    │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Gemini API Call                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Request:                                                                │
│  POST https://generativelanguage.googleapis.com/v1beta/models/...       │
│  Headers: { 'Content-Type': 'application/json' }                         │
│  Body: {                                                                 │
│    contents: [{                                                          │
│      parts: [{ text: "[PROMPT]" }]                                       │
│    }],                                                                    │
│    generationConfig: {                                                   │
│      temperature: 0.2,                                                   │
│      topP: 0.8,                                                          │
│      topK: 40,                                                           │
│      maxOutputTokens: 1024,                                              │
│      responseMimeType: "application/json"                                │
│    }                                                                      │
│  }                                                                        │
│                                                                            │
│  Response (Typical):                                                     │
│  {                                                                        │
│    candidates: [{                                                        │
│      content: {                                                          │
│        parts: [{                                                         │
│          text: "{                                                        │
│            'parkinsonsDisease': {                                        │
│              'riskLevel': 'moderate',                                    │
│              'confidence': 72,                                           │
│              'indicators': [                                             │
│                'Tremor frequency 8.5 Hz',                               │
│                'Reduced speech clarity',                                │
│                'Monotone speech pattern'                                │
│              ],                                                          │
│              'recommendations': [                                        │
│                'Neurology referral recommended',                        │
│                'Consider movement disorder specialist'                 │
│              ]                                                           │
│            },                                                            │
│            ...                                                           │
│          }"                                                              │
│        }]                                                                │
│      }                                                                    │
│    }]                                                                     │
│  }                                                                        │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 5: parseAiResponse()                                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Input: Raw text string containing JSON                                  │
│                                                                            │
│  Processing Steps:                                                       │
│  1. Try direct JSON.parse()                                              │
│  2. If fails, attempt to extract JSON object                             │
│  3. If partial JSON, reconstruct from text                               │
│  4. If bullet points found, extract structured data                      │
│                                                                            │
│  Output: Normalized Response Object                                      │
│  {                                                                        │
│    parkinsonsDisease: {                                                  │
│      riskLevel: "moderate",      // low|moderate|high                    │
│      confidence: 72,              // 0-100                               │
│      indicators: [                // Array of strings                    │
│        "Tremor frequency 8.5 Hz",                                        │
│        "Reduced speech clarity",                                         │
│        "Monotone speech pattern"                                         │
│      ],                                                                   │
│      recommendations: [           // Array of strings                    │
│        "Neurology referral recommended",                                 │
│        "Consider movement disorder specialist"                          │
│      ]                                                                    │
│    },                                                                     │
│    bellsPalsy: {                                                         │
│      riskLevel: "low",                                                   │
│      confidence: 25,                                                     │
│      indicators: ["No significant facial asymmetry observed"],          │
│      recommendations: ["Continue monitoring facial movements"]          │
│    },                                                                     │
│    als: {                                                                 │
│      riskLevel: "low",                                                   │
│      confidence: 30,                                                     │
│      indicators: ["No bulbar weakness indicators"],                      │
│      recommendations: ["Standard monitoring recommended"]               │
│    },                                                                     │
│    overallAssessment: "Patient shows moderate indicators of potential...",│
│    disclaimerNote: "This is an automated AI analysis and should not..." │
│  }                                                                        │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 6: Frontend Display                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  AiAnalysisPanel receives structured data and renders:                   │
│                                                                            │
│  ┌──────────────────┬──────────────────┬──────────────────┐              │
│  │ Parkinson's      │ Bell's Palsy     │ ALS              │              │
│  ├──────────────────┼──────────────────┼──────────────────┤              │
│  │ [MODERATE]       │ [LOW]            │ [LOW]            │              │
│  │ Confidence: 72%  │ Confidence: 25%  │ Confidence: 30%  │              │
│  │                  │                  │                  │              │
│  │ Indicators:      │ Indicators:      │ Indicators:      │              │
│  │ • Tremor freq..  │ • No significant │ • No bulbar      │              │
│  │ • Reduced speed  │   asymmetry      │   weakness       │              │
│  │ • Monotone voice │                  │                  │              │
│  │                  │ Recomm:          │ Recomm:          │              │
│  │ Recomm:          │ • Monitor facial │ • Standard       │              │
│  │ • Neurology ref  │   movements      │   monitoring     │              │
│  │ • Specialist     │                  │                  │              │
│  └──────────────────┴──────────────────┴──────────────────┘              │
│                                                                            │
│  [Overall Assessment Panel]                                              │
│  [Medical Disclaimer]                                                    │
│  [Export to PDF Button]                                                  │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
                         API Request
                              │
                              ▼
                    ┌──────────────────┐
                    │ getAiAnalysis()  │
                    └────────┬─────────┘
                             │
                    ┌────────▼────────┐
                    │ Validate userId │
                    └────┬────────┬───┘
                         │        │
                    VALID │        │ INVALID
                         │        │
                         ▼        ▼
                    [continue] [400 Bad Request]
                         │
                    ┌────▼────────────────────┐
                    │ Query Main Collection   │
                    └────┬────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         Found >= 5         Found < 5
              │                     │
              │            ┌────────▼──────────────┐
              │            │ Query Specialized     │
              │            │ Collections (Parallel)│
              │            └────────┬──────────────┘
              │                     │
              │            ┌────────▼───────────────┐
              │            │ Combine & Deduplicate  │
              │            └────────┬───────────────┘
              │                     │
              └──────────┬──────────┘
                         │
                    ┌────▼───────────────┐
                    │ Found Assessments? │
                    └────┬────────────┬──┘
                         │            │
                      YES │            │ NO
                         │            │
                         ▼            ▼
                    [continue] [404 Not Found]
                         │
                    ┌────▼──────────────────┐
                    │ getAiAnalysisResults()│
                    └────┬──────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Transform Data      │
              └────┬────────────────┘
                   │
       ┌───────────▼───────────┐
       │ Create AI Prompt      │
       └───┬───────────────────┘
           │
    ┌──────▼────────────────┐
    │ Call Gemini API       │
    └────┬────────┬─────────┘
         │        │
    SUCCESS│       │ FAILURE
         │        │
         ▼        └──────────────────────────────┐
    ┌─────────────────────────────────────────┐  │
    │ Parse AI Response                       │  │
    └────┬────────────────────────────────────┘  │
         │                                        │
    ┌────▼────────────────────────────────────┐  │
    │ Return Structured Analysis              │  │
    └─────────────────────────────────────────┘  │
                                                  │
                                        ┌─────────▼──────────────┐
                                        │ Return Fallback        │
                                        │ Response (all unknown)  │
                                        └────────────────────────┘
                                                  │
                                        ┌─────────▼──────────────┐
                                        │ Log Error Details      │
                                        │ Return 500 Error       │
                                        └────────────────────────┘
```

---

## Performance Timeline

```
User Action          Time      What's Happening
─────────────────────────────────────────────────────────────
Click Analyze        0ms       • Button click event
                               • Loading state set to true
                               • Spinner shows

Send Request         50ms      • Network request starts
                               • Header validation

Backend Processing   100-200ms • userId validation
                               • Query main collection
                               • Query specialized collections (parallel)
                               • Data transformation

Gemini API Call      1000-3000ms • Request sent to Gemini
                               • AI analysis processing
                               • Response received

Response Parsing     100-200ms • JSON parsing
                               • Data validation
                               • Structure normalization

Return to Frontend   50ms      • Network response received

Display Results      200ms     • Loading state to false
                               • Results rendered
                               • UI update complete

Total Time           1.5-3.5s  • User sees complete results
```

---

## Success vs Error Scenarios

### Scenario 1: Happy Path (Success)
```
✓ User has assessments from all 8 types
✓ Assessments have complete metrics
✓ Gemini API responds with valid JSON
✓ All disorders analyzed successfully
Result: Complete analysis with confidence scores displayed
```

### Scenario 2: Limited Assessments (Partial Success)
```
✓ User has assessments from 3-4 types
✓ Some assessments have incomplete metrics
✓ Gemini API completes analysis with available data
✓ Some indicators marked "N/A"
Result: Analysis completed with note about limited data
```

### Scenario 3: No Assessments (Expected Error)
```
✗ No assessments found for user
✗ Query returns empty array
✗ Caught in validation
Result: 404 error "No assessment data found"
        UI shows: "Complete multiple assessments to receive AI-powered analysis"
```

### Scenario 4: API Failure (Graceful Degradation)
```
✓ Assessments collected successfully
✓ Prompt created successfully
✗ Gemini API times out or returns error
✗ getAiAnalysisResults() catches error
Result: 500 error with fallback response
        All disorders: riskLevel="unknown", confidence=0
        UI shows error alert with medical disclaimer
```

### Scenario 5: Authentication Failed (Security)
```
✗ Missing or invalid authentication token
✗ Auth middleware rejects request
Result: 401 Unauthorized (caught before controller)
        User redirected to login page
```
