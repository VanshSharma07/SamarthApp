# AI Analysis Panel - File Reference & Architecture Map

## 📁 Complete File Structure

### Frontend Files

```
frontend/
├── src/
│   ├── components/
│   │   └── analytics/
│   │       ├── AiAnalysisPanel.jsx ⭐ MAIN UI COMPONENT
│   │       ├── AssessmentCard.jsx
│   │       ├── AssessmentDetailDialog.jsx
│   │       ├── AssessmentSummary.jsx
│   │       ├── ExportReportPanel.jsx
│   │       └── DebugPanel.jsx
│   ├── pages/
│   │   └── Analytics.jsx ⭐ MAIN PAGE (Contains AI Analysis Tab)
│   ├── services/
│   │   ├── assessmentService.js ⭐ API SERVICE LAYER
│   │   ├── api.js (Axios instance)
│   │   └── authService.js
│   ├── utils/
│   │   ├── pdfExport.js ⭐ PDF GENERATION UTILITY
│   │   ├── validationUtils.js
│   │   └── formatUtils.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useLocalStorage.js
│   ├── contexts/
│   │   └── AuthContext.js
│   └── config/
│       └── constants.js
└── package.json
```

### Backend Files

```
backend/
├── src/
│   ├── routes/
│   │   ├── assessmentRoutes.js ⭐ ROUTE DEFINITION
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   └── specialized-assessments.js
│   ├── controllers/
│   │   ├── assessmentController.js ⭐ MAIN CONTROLLER (getAiAnalysis)
│   │   ├── authController.js
│   │   ├── tremorController.js
│   │   ├── speechPatternController.js
│   │   ├── responseTimeController.js
│   │   ├── facialSymmetryController.js
│   │   ├── fingerTappingController.js
│   │   ├── eyeMovementController.js
│   │   ├── gaitAnalysisController.js
│   │   └── neckMobilityController.js
│   ├── services/
│   │   ├── aiService.js ⭐ AI BUSINESS LOGIC
│   │   ├── emailService.js
│   │   └── pdfService.js
│   ├── models/
│   │   ├── Assessment.js ⭐ MAIN ASSESSMENT MODEL
│   │   ├── TremorAssessment.js ⭐ SPECIALIZED MODEL 1
│   │   ├── SpeechPatternAssessment.js ⭐ SPECIALIZED MODEL 2
│   │   ├── ResponseTimeAssessment.js ⭐ SPECIALIZED MODEL 3
│   │   ├── FacialSymmetryAssessment.js ⭐ SPECIALIZED MODEL 4
│   │   ├── FingerTappingAssessment.js ⭐ SPECIALIZED MODEL 5
│   │   ├── EyeMovementAssessment.js ⭐ SPECIALIZED MODEL 6
│   │   ├── GaitAnalysisAssessment.js ⭐ SPECIALIZED MODEL 7
│   │   ├── NeckMobilityAssessment.js ⭐ SPECIALIZED MODEL 8
│   │   ├── Patient.js
│   │   └── User.js
│   ├── middleware/
│   │   ├── auth.js (JWT middleware)
│   │   └── requestLogger.js
│   ├── config/
│   │   └── passport.js
│   └── index.js (Main server file)
├── package.json
└── .env (Contains GEMINI_API_KEY)
```

---

## 🔗 File Dependencies & Flow

### Request Flow

```
User Browser
    ↓
Frontend: Analytics.jsx (User clicks AI Analysis tab)
    ↓
Frontend: AiAnalysisPanel.jsx (Component renders)
    ↓
Frontend: handleAnalyzeReport() function
    ↓
Frontend: assessmentService.fetchAiAnalysis(userId)
    ↓
Frontend: api.post("/assessments/{userId}/ai-analysis")
    ├─ Headers: Authorization Bearer token
    └─ Body: {} (userId in URL path)
    ↓
HTTP Network Request
    ↓
Backend: assessmentRoutes.js (POST /:userId/ai-analysis)
    ├─ Middleware: auth (JWT validation)
    └─ Handler: getAiAnalysis controller
    ↓
Backend: assessmentController.getAiAnalysis()
    ├─ Validate userId
    ├─ Query: Assessment.find()
    ├─ If < 5 results:
    │   ├─ Query: TremorAssessment.find()
    │   ├─ Query: SpeechPatternAssessment.find()
    │   ├─ Query: ResponseTimeAssessment.find()
    │   ├─ Query: FacialSymmetryAssessment.find()
    │   ├─ Query: FingerTappingAssessment.find()
    │   ├─ Query: EyeMovementAssessment.find()
    │   ├─ Query: GaitAnalysisAssessment.find()
    │   └─ Query: NeckMobilityAssessment.find()
    └─ Call: aiService.getAiAnalysisResults()
    ↓
Backend: aiService.getAiAnalysisResults()
    ├─ Call: transformAssessmentsData()
    ├─ Call: createAiPrompt()
    ├─ Call: axios.post() [Gemini API]
    └─ Call: parseAiResponse()
    ↓
External: Google Gemini API (gemini-2.0-flash model)
    ├─ Request: Comprehensive assessment prompt
    ├─ Process: AI analysis (1-3 seconds)
    └─ Response: JSON with risk levels, indicators, recommendations
    ↓
Backend: aiService receives response
    ├─ Parse JSON
    ├─ Validate structure
    └─ Return to controller
    ↓
Backend: assessmentController.getAiAnalysis()
    └─ res.json(aiResults)
    ↓
HTTP Network Response
    ├─ Status: 200 OK
    └─ Body: AI analysis result
    ↓
Frontend: fetchAiAnalysis() receives response
    ├─ return response.data
    └─ Resolve promise
    ↓
Frontend: handleAnalyzeReport() continues
    ├─ setLoading(false)
    ├─ setAiResults(results)
    └─ setSnackbar({...success})
    ↓
Frontend: AiAnalysisPanel re-renders
    └─ Display results in three-column layout
    ↓
User sees AI analysis results on screen
```

---

## 📊 File-to-Feature Mapping

### Feature: "Analyse Report with AI" Button

| Layer | File | Function/Component | Responsibility |
|-------|------|-------------------|-----------------|
| **UI** | AiAnalysisPanel.jsx | handleAnalyzeReport() | Button click handler, state management |
| **UI** | AiAnalysisPanel.jsx | <Button> component | Render clickable button |
| **Service** | assessmentService.js | fetchAiAnalysis() | API call wrapper |
| **API Layer** | api.js | post() | HTTP POST request |
| **Backend** | assessmentRoutes.js | router.post() | Route definition |
| **Backend** | assessmentController.js | getAiAnalysis() | Main logic, orchestration |
| **Database** | Assessment.js | Model | Query main collection |
| **Database** | TremorAssessment.js - NeckMobilityAssessment.js | Models | Query specialized collections |
| **Business Logic** | aiService.js | getAiAnalysisResults() | Coordinate AI analysis |
| **AI** | Gemini API | generateContent | External AI processing |

### Feature: Display Risk Level with Color

| Layer | File | Function/Component | Responsibility |
|-------|------|-------------------|-----------------|
| **UI** | AiAnalysisPanel.jsx | renderRiskLevel() | Helper function |
| **UI** | AiAnalysisPanel.jsx | <Chip> component | MUI chip for display |
| **Data** | aiService.js | parseAiResponse() | Parse risk level from response |
| **Data** | aiService.js | createAiPrompt() | Instruct AI to provide risk levels |
| **AI** | Gemini API | generateContent | Generate risk assessment |

### Feature: Export to PDF

| Layer | File | Function/Component | Responsibility |
|-------|------|-------------------|-----------------|
| **UI** | AiAnalysisPanel.jsx | handleExportPdf() | Button click handler |
| **UI** | AiAnalysisPanel.jsx | <Button> component | Render export button |
| **Export** | pdfExport.js | exportAiAnalysisToPdf() | Main PDF generation |
| **Library** | jsPDF | jsPDF() | PDF document creation |
| **Library** | jspdf-autotable | - | PDF table rendering |

---

## 🔑 Key Functions Reference

### Frontend

#### assessmentService.js
```javascript
fetchAiAnalysis(userId)
  - Makes POST request to backend
  - Throws errors if request fails
  - Returns parsed JSON response
```

#### AiAnalysisPanel.jsx
```javascript
handleAnalyzeReport()
  - Triggers API call
  - Manages loading state
  - Handles errors with snackbar

handleExportPdf()
  - Calls PDF export utility
  - Shows success/error notification

renderRiskLevel(riskLevel)
  - Maps risk level to color and icon
  - Returns MUI Chip component

renderDisorderSection(disorderName, disorderData)
  - Renders complete disorder card
  - Shows indicators and recommendations
```

#### pdfExport.js
```javascript
exportAiAnalysisToPdf(analysisData, patientName)
  - Creates jsPDF document
  - Adds patient info and metadata
  - Renders disorder sections
  - Triggers download
```

### Backend

#### assessmentController.js
```javascript
getAiAnalysis(req, res)
  - Validates userId
  - Fetches assessments from all sources
  - Calls AI service
  - Returns JSON response
```

#### aiService.js
```javascript
getAiAnalysisResults(assessments)
  - Main coordination function
  - Calls transform, prompt, API, parse functions
  - Returns structured analysis

transformAssessmentsData(assessments)
  - Maps database types to internal types
  - Normalizes metric names
  - Selects most recent per type
  - Returns 8-field structure

createAiPrompt(assessmentData)
  - Builds comprehensive prompt
  - Includes all assessment metrics
  - Specifies JSON format requirements
  - Returns prompt string

parseAiResponse(text)
  - Attempts JSON parsing
  - Falls back to text extraction
  - Reconstructs if needed
  - Returns normalized structure
```

---

## 🗄️ Database Collections

### Main Collection
```
Assessment {
  _id: ObjectId
  userId: String (indexed)
  type: String (enum of 8 types)
  metrics: Object (varies by type)
  data: Object (raw data backup)
  timestamp: Date (indexed)
  status: String (enum: COMPLETED, INCOMPLETE)
  createdAt: Date
  updatedAt: Date
}
```

### Specialized Collections (8 total)
```
TremorAssessment {
  _id: ObjectId
  userId: String (indexed)
  metrics: {
    tremor_frequency: Number (Hz)
    tremor_amplitude: Number
    tremor_type: String
    severity: String
    overall: { tremorScore: Number }
  }
  timestamp: Date (indexed)
  status: String
}

SpeechPatternAssessment {
  metrics: {
    clarity: { score: Number }
    speechRate: { wordsPerMinute: Number }
    volumeControl: { score: Number }
    overallScore: Number
    emotion: {
      confidence: Number
      hesitation: Number
      stress: Number
      monotony: Number
    }
  }
}

ResponseTimeAssessment {
  metrics: {
    averageResponseTime: Number (ms)
    fastestResponse: Number
    slowestResponse: Number
    accuracy: Number
    overall: { responseScore: Number }
  }
}

FacialSymmetryAssessment {
  metrics: {
    symmetryScore: Number (0-100)
    eye_symmetry: Number
    mouth_symmetry: Number
    jaw_symmetry: Number
    face_tilt: Number (degrees)
    neurological_indicators: [String]
  }
}

FingerTappingAssessment {
  metrics: {
    tappingRate: Number
    accuracy: Number
    consistency: Number
  }
}

EyeMovementAssessment {
  metrics: {
    trackingAccuracy: Number
    saccadeSpeed: Number
    fixationStability: Number
  }
}

GaitAnalysisAssessment {
  metrics: {
    walkingSpeed: Number
    strideLength: Number
    cadence: Number
    balance: Number
  }
}

NeckMobilityAssessment {
  metrics: {
    rangeOfMotion: Object
    flexibility: Number
  }
}
```

---

## 🔐 Data Security

### Authentication Flow
```
User Login
    ↓
Generate JWT Token (auth.js)
    ↓
Token stored in localStorage (frontend)
    ↓
Token sent in Authorization header for API calls
    ↓
auth middleware validates token (assessmentRoutes.js)
    ↓
If valid: Pass to controller
If invalid: Return 401 Unauthorized
```

### API Key Security
```
.env file (backend only)
    ├─ GEMINI_API_KEY (never exposed to frontend)
    ├─ GEMINI_API_BASE_URL
    └─ DATABASE_URL
    
Environment variables
    └─ Loaded at startup
    └─ Used only in aiService.js
    └─ Never logged or transmitted
```

---

## 📈 Performance Considerations

### Optimization Techniques Used

1. **Database Optimization**
   - Index on userId and status fields
   - `.lean()` for read-only queries
   - Parallel queries with Promise.all()

2. **API Optimization**
   - Gemini model: "2.0-flash" (fastest free tier)
   - Temperature: 0.2 (deterministic, faster)
   - Max tokens: 1024 (prevents excessive output)

3. **Frontend Optimization**
   - Component memoization with useCallback
   - Conditional rendering
   - Lazy loading of assessment data

### Bottleneck Analysis
```
Database Queries: <500ms (optimized with indexes)
Data Transform: <100ms (in-memory)
Prompt Build: <100ms (string concatenation)
Gemini API: 1000-3000ms ← MAIN BOTTLENECK
Response Parse: <100ms (JSON parsing)
Frontend Render: <200ms (React)
Total: ~2-5 seconds
```

---

## 🧪 Test Coverage Map

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| transformAssessmentsData() | ✓ | ✓ | - |
| createAiPrompt() | ✓ | - | - |
| parseAiResponse() | ✓ | ✓ | - |
| fetchAiAnalysis() | ✓ | ✓ | - |
| getAiAnalysis() | ✓ | ✓ | ✓ |
| exportAiAnalysisToPdf() | ✓ | - | ✓ |
| AiAnalysisPanel | ✓ | - | ✓ |

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database collections created
- [ ] Indexes created on all models
- [ ] Gemini API key valid and active
- [ ] CORS headers configured
- [ ] JWT secret key configured
- [ ] Frontend build optimized
- [ ] Backend error handling verified
- [ ] Logging configured
- [ ] PDF export tested
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting configured
- [ ] Backup strategy in place

---

## 📞 Support & Documentation

### Reference Documents
1. **AI_ANALYSIS_PANEL_ANALYSIS.md** - Deep technical analysis
2. **AI_ANALYSIS_PANEL_DIAGRAMS.md** - Visual diagrams and flows
3. **AI_ANALYSIS_PANEL_TESTING.md** - Testing and debugging guide
4. **AI_ANALYSIS_PANEL_SUMMARY.md** - Executive summary

### Key Contact Points
- **Frontend Issues**: Check `AiAnalysisPanel.jsx` and `assessmentService.js`
- **Backend Issues**: Check `assessmentController.js` and `aiService.js`
- **Database Issues**: Check models and indexes
- **API Issues**: Check `.env` configuration and Gemini API documentation

### Common Questions
- Q: How long does analysis take?
  - A: 2-5 seconds (mostly Gemini API time)

- Q: What if user has no assessments?
  - A: Returns 404 error, UI shows "No assessment data available"

- Q: Can users see other users' analyses?
  - A: No, userId from JWT token restricts access

- Q: Is the analysis accurate?
  - A: AI is supplementary only, always include medical disclaimer

---

**Last Updated**: December 11, 2025  
**Document Version**: 1.0  
**Status**: Complete Reference
