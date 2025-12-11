# AI Analysis Panel - Visual Quick Reference

## 🎯 User Interface Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  ANALYTICS PAGE                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tab Selector:                                          │ │
│  │ [Assessment Results] [Summary] [AI ANALYSIS] [Export] │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 AI ANALYSIS PANEL                            │
│                                                               │
│  ┌──────────────────────┬──────────────────────────────────┐ │
│  │ AI Analysis          │  [Analyse Report] [Export PDF]  │ │
│  │ ═════════════════════┴──────────────────────────────────┘ │
│  │                                                            │
│  │  ┌────────────────┬────────────────┬────────────────┐    │
│  │  │ PARKINSON'S    │ BELL'S PALSY   │ ALS            │    │
│  │  ├────────────────┼────────────────┼────────────────┤    │
│  │  │ [MODERATE]     │ [LOW]          │ [HIGH]         │    │
│  │  │ 72% Confidence │ 25% Confidence │ 85% Confidence │    │
│  │  │                │                │                │    │
│  │  │ Indicators:    │ Indicators:    │ Indicators:    │    │
│  │  │ • Tremor freq  │ • No facial    │ • Speech weak  │    │
│  │  │ • Reduced      │   asymmetry    │ • Motor slow   │    │
│  │  │   clarity      │ • Symmetric    │ • Weakness     │    │
│  │  │ • Monotony     │   movements    │   pattern      │    │
│  │  │                │                │                │    │
│  │  │ Recomm:        │ Recomm:        │ Recomm:        │    │
│  │  │ • Neurology    │ • Monitor      │ • Specialist   │    │
│  │  │   referral     │   movement     │   consult      │    │
│  │  │ • Specialist   │ • Standard     │ • Genetic      │    │
│  │  │   eval         │   monitoring   │   counseling   │    │
│  │  └────────────────┴────────────────┴────────────────┘    │
│  │                                                            │
│  │  ┌──────────────────────────────────────────────────────┐ │
│  │  │ OVERALL ASSESSMENT                                   │ │
│  │  │                                                       │ │
│  │  │ Patient assessment shows moderate indicators of      │ │
│  │  │ potential Parkinson's disease, with mild indicators │ │
│  │  │ of ALS. Bell's Palsy indicators are minimal.        │ │
│  │  │ Recommend neurology consultation and further        │ │
│  │  │ specialist evaluation.                              │ │
│  │  └──────────────────────────────────────────────────────┘ │
│  │                                                            │
│  │  ⓘ This is an automated AI analysis and should not      │ │
│  │    replace professional medical diagnosis.              │ │
│  │                                                            │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 State Machine Diagram

```
┌─────────────┐
│   INITIAL   │
│ (no results,│
│ no loading) │
└──────┬──────┘
       │ Click "Analyse Report"
       ▼
┌─────────────────────┐
│     LOADING         │  ← Show spinner
│ (loading=true,      │     Disable button
│  error=null,        │
│  aiResults=null)    │
└──────┬──────────────┘
       │ 2-5 seconds
       │ (API response)
       ├─ Success ─────────────┐
       │                        │
       ├─ Failure ────┐         │
       │               │         │
       ▼               ▼         ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ SUCCESS │  │  ERROR   │  │  ERROR   │
   │(display │  │(network) │  │(no data) │
   │results) │  │          │  │          │
   └─────────┘  └──────────┘  └──────────┘
       │             │              │
       │             ▼              ▼
       │        Show Error       Show Error
       │        Alert            Alert
       │             │              │
       │             └──────┬───────┘
       │                    │
       └────────┬───────────┘
                │
                ▼
         ┌──────────────┐
         │ READY STATE  │
         │ (can export  │
         │  or retry)   │
         └──────────────┘
```

---

## 📊 Data Structure Visualization

### Input: Raw Assessment Data
```
[
  {
    _id: "123abc",
    userId: "user456",
    type: "TREMOR_ASSESSMENT",
    metrics: {
      tremor_frequency: 8.5,
      tremor_amplitude: 2.3,
      severity: "moderate",
      overall: { tremorScore: 7 }
    },
    timestamp: 2025-12-11T10:30:00Z
  },
  {
    _id: "234def",
    userId: "user456",
    type: "SPEECH_PATTERN_ASSESSMENT",
    metrics: {
      clarity: { score: 8 },
      speechRate: { wordsPerMinute: 145 },
      volumeControl: { score: 7 },
      emotion: {
        confidence: 8,
        hesitation: 3,
        stress: 5,
        monotony: 4
      }
    },
    timestamp: 2025-12-11T10:35:00Z
  },
  ...
]
```

### Transform: Normalized Structure
```
{
  tremor: {
    timestamp: 2025-12-11T10:30:00Z,
    metrics: {
      tremor_frequency: 8.5,
      tremor_amplitude: 2.3,
      severity: "moderate",
      overall: { tremorScore: 7 }
    }
  },
  speech: {
    timestamp: 2025-12-11T10:35:00Z,
    metrics: {
      clarity: { score: 8 },
      speechRate: { wordsPerMinute: 145 },
      volumeControl: { score: 7 },
      emotion: { confidence: 8, hesitation: 3, stress: 5, monotony: 4 }
    }
  },
  responseTime: null,
  facialSymmetry: null,
  fingerTapping: null,
  eyeMovement: null,
  gaitAnalysis: null,
  neckMobility: null
}
```

### Output: AI Analysis Result
```
{
  parkinsonsDisease: {
    riskLevel: "moderate",
    confidence: 72,
    indicators: [
      "Tremor frequency 8.5 Hz within Parkinsonian range",
      "Reduced speech clarity score (8/10)",
      "Elevated monotony score (4/10 indicates monotone speech)",
      "Speech rate within expected range"
    ],
    recommendations: [
      "Recommend neurology referral for movement disorder specialist evaluation",
      "Consider MRI brain to rule out secondary causes",
      "Perform additional motor function tests",
      "Schedule follow-up assessment in 3 months"
    ]
  },
  bellsPalsy: {
    riskLevel: "low",
    confidence: 15,
    indicators: [
      "No significant facial asymmetry detected",
      "Normal eye movement patterns"
    ],
    recommendations: [
      "Continue standard monitoring protocols",
      "No immediate specialist referral needed"
    ]
  },
  als: {
    riskLevel: "low",
    confidence: 28,
    indicators: [
      "No bulbar weakness indicators identified",
      "Speech clarity maintained at acceptable level"
    ],
    recommendations: [
      "Standard neurological monitoring recommended",
      "Genetic counseling not immediately indicated"
    ]
  },
  overallAssessment: "Patient demonstrates moderate indicators suggestive of potential Parkinson's disease, primarily based on tremor frequency and speech pattern abnormalities. ALS indicators are minimal. Bell's Palsy is unlikely. Recommend neurology consultation and movement disorder specialist evaluation.",
  disclaimerNote: "This is an automated AI analysis and should not replace professional medical diagnosis. Always consult with qualified healthcare professionals for definitive diagnosis and treatment planning."
}
```

---

## 🎨 Risk Level Color Scheme

```
┌─────────────────────────────────────────┐
│ RISK LEVEL COLOR MAPPING                │
├─────────────────┬───────────────────────┤
│ LEVEL           │ DISPLAY               │
├─────────────────┼───────────────────────┤
│ low             │ 🟢 GREEN CHIP         │
│                 │ ✓ Check mark icon     │
│                 │ Neutral/positive tone │
├─────────────────┼───────────────────────┤
│ moderate        │ 🟡 YELLOW CHIP        │
│                 │ ⚠ Warning icon        │
│                 │ Cautionary tone       │
├─────────────────┼───────────────────────┤
│ high            │ 🔴 RED CHIP           │
│                 │ ✕ Error icon          │
│                 │ Alert tone            │
├─────────────────┼───────────────────────┤
│ unknown/error   │ ⚫ GRAY CHIP           │
│                 │ ? Unknown icon        │
│                 │ Uncertain tone        │
└─────────────────┴───────────────────────┘

CSS Color Values:
- success (low): #4caf50 (green)
- warning (moderate): #ff9800 (orange)
- error (high): #f44336 (red)
- default (unknown): #9e9e9e (gray)
```

---

## 🔍 Confidence Score Interpretation

```
CONFIDENCE SCALE:

0%  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤  100%
    └─────────────────────────────────────────────────────┘
        ▼                ▼               ▼                ▼
    Very Low          Low            Moderate        Very High
    (Likely          (Possible      (Probable      (Almost
     NOT present)     but weak)      diagnosis)     certain)

Recommended Actions by Confidence Level:

0-20%:   Don't consider for diagnosis
         No action needed
         ► Continue monitoring

21-40%:  Minimal risk indicator
         Optional monitoring
         ► Consider specialty consultation if multiple symptoms

41-60%:  Moderate risk indicator
         Recommend consultation
         ► Schedule with relevant specialist

61-80%:  High risk indicator
         Strong recommendation for consultation
         ► Urgent specialist referral recommended

81-100%: Very high risk indicator
         Immediate action needed
         ► Emergency/immediate specialist evaluation
```

---

## 📈 Assessment Metrics Relationship

```
TREMOR                    SPEECH                    FACIAL SYMMETRY
├─ Frequency (Hz)         ├─ Clarity Score           ├─ Symmetry Score
├─ Amplitude              ├─ Speech Rate             ├─ Eye Alignment
├─ Type (rest/action)     ├─ Volume Control          ├─ Mouth Alignment
├─ Severity               ├─ Confidence              ├─ Jaw Alignment
└─ Overall Score          ├─ Hesitation              ├─ Face Tilt
                          ├─ Stress                  └─ Neural Indicators
                          └─ Monotony

  ↓ INPUT TO AI ↓

        GEMINI 2.0 FLASH
        (AI Analysis Engine)

  ↓ OUTPUT FROM AI ↓

PARKINSON'S              BELL'S PALSY              ALS
├─ Risk Level            ├─ Risk Level              ├─ Risk Level
├─ Confidence            ├─ Confidence              ├─ Confidence
├─ Indicators (4-6)      ├─ Indicators (2-4)        ├─ Indicators (2-4)
└─ Recommendations       └─ Recommendations         └─ Recommendations

  ↓ DISPLAY IN UI ↓

  [Three Column Layout with Cards]
      ▼
  [User Reviews Results]
      ▼
  [Optional PDF Export]
```

---

## ⏱️ Typical Timeline

```
TIMELINE                          WHAT'S HAPPENING
─────────────────────────────────────────────────────────────
0ms                              User sees interface
        │
        ├─ User clicks "Analyse Report"
        │
        ├─ Button disabled, spinner appears
        │
50ms    ├─ API request sent to backend
        │
100ms   ├─ Backend receives request
        │ ├─ Validates user ID
        │ ├─ Queries main collection
        │ ├─ Queries 8 specialized collections (parallel)
        │
200ms   ├─ Backend starts AI prompt creation
        │ ├─ Transforms assessment data
        │ ├─ Builds comprehensive prompt
        │
250ms   ├─ Prompt sent to Gemini API
        │
500ms   ├─ Gemini processing (AI analysis)
        │
2000ms  ├─ Gemini API response received
        │
2100ms  ├─ Backend parses response
        │ ├─ Validates JSON structure
        │ ├─ Normalizes data
        │
2150ms  ├─ Response sent to frontend
        │
2200ms  ├─ Frontend receives response
        │ ├─ Updates state (loading=false, results=data)
        │ ├─ Component re-renders
        │ ├─ Spinner disappears
        │
2400ms  └─ User sees complete analysis results
        
     (TOTAL: ~2-2.5 seconds for this typical case)
     (Can be up to 5 seconds if Gemini is slow)
```

---

## 🔐 Authentication & Authorization

```
LOGIN FLOW:
User                Browser              Backend
  │                   │                    │
  ├─ Enter credentials│                    │
  │                   │                    │
  ├─ Click Login      │                    │
  │                   ├─ POST /auth/login  │
  │                   ├──────────────────→ │
  │                   │                    ├─ Validate credentials
  │                   │                    ├─ Generate JWT token
  │                   │                    │
  │                   ← JWT Token received ←
  │                   ├─────────────────┤ │
  │                   │                │  │
  │ ← Token displayed │<─────────────────┤
  │                   │
  ├─ Token stored in  │
  │  localStorage     │
  │                   │

AI ANALYSIS REQUEST:
User                Frontend             Backend
  │                   │                    │
  ├─ Click Analyse    │                    │
  │                   │                    │
  │                   ├─ Token from storage│
  │                   ├─ Header: Authz: Bearer [token]
  │                   ├─ POST /assessments/:userId/ai-analysis
  │                   ├──────────────────→ │
  │                   │                    │
  │                   │                ├─ Check auth middleware
  │                   │                ├─ Verify token signature
  │                   │                ├─ Extract userId from token
  │                   │                ├─ Verify userId matches URL
  │                   │                │
  │                   │          ✓ AUTHORIZED ✓
  │                   │                ├─ Proceed with analysis
  │                   │                │
  │                   │ ← AI Results ──←
  │                   │
  │ ← Results Display │
  │
```

---

## 📋 Checklist: Successful AI Analysis

```
✓ Pre-Analysis
  ✓ User logged in with valid token
  ✓ User has at least 1 completed assessment
  ✓ Gemini API key configured
  ✓ Backend server running
  ✓ Network connection available

✓ During Analysis
  ✓ Loading spinner appears within 100ms
  ✓ Button becomes disabled
  ✓ API request sent to backend
  ✓ Gemini API called successfully
  ✓ Response received within 5 seconds

✓ Post-Analysis Display
  ✓ Three disorder cards rendered
  ✓ Each card shows risk level chip
  ✓ Confidence percentage displays
  ✓ Indicators list shows (non-empty array)
  ✓ Recommendations list shows (non-empty array)
  ✓ Overall Assessment text displays
  ✓ Medical disclaimer shows
  ✓ Export button appears and works

✓ Error Recovery
  ✓ Error messages are clear
  ✓ Retry button available
  ✓ Snackbar notification shows
  ✓ Loading spinner disappears
  ✓ UI returns to interactive state
```

---

## 🎯 Quick Troubleshooting Guide

```
PROBLEM                          LIKELY CAUSE              SOLUTION
───────────────────────────────────────────────────────────────────

No results, no error             User has no assessments  Complete assessments first
                                                         or use "Seed Test Data"

Spinner never stops              API timeout              Check backend is running
                                 Network issue            Check internet connection
                                                         Refresh page

"Analysis Failed" error          Gemini API key invalid   Regenerate API key
                                 API rate limit           Wait and retry
                                 Network error            Check connection

Results show "unknown"            API parsing error       Check backend logs
                                 Malformed JSON response  Try again

PDF export fails                 jsPDF not loaded        Check package.json
                                 Memory issue            Refresh page
                                 Browser blocked         Check browser settings

Risk levels all empty            Data parsing issue      Check API response format
                                 Database issue          Verify collections exist

Button doesn't respond           User not authenticated   Login again
                                 Session expired         Refresh and login
                                 Rate limited            Wait a minute
```

---

**Last Updated**: December 11, 2025  
**Document Type**: Visual Reference Guide  
**Status**: Ready for Use
