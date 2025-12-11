# AI Analysis Panel - Testing & Debugging Guide

## 1. How to Test the AI Analysis Panel

### 1.1 Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on development server
- Database with test data
- Valid Gemini API key configured

### 1.2 Manual Testing Steps

#### Step 1: Create Test Assessments
```bash
# Use the "Seed Test Data" button in Analytics page (DEV mode only)
# OR manually create assessments through each assessment module

Required: At least 1 assessment from any type
Recommended: At least 5 assessments from different types
```

#### Step 2: Navigate to AI Analysis Tab
```
1. Login to application
2. Navigate to Analytics page
3. Click "Assessment Analytics" page
4. Select tab: "AI Analysis"
```

#### Step 3: Trigger Analysis
```
1. Click "Analyse Report with AI" button
2. Observe loading spinner
3. Wait for 2-5 seconds (typical response time)
```

#### Step 4: Verify Results
```
✓ Three disorder cards appear (Parkinson's, Bell's Palsy, ALS)
✓ Each card shows:
  - Risk Level chip (LOW/MODERATE/HIGH)
  - Confidence percentage
  - List of indicators
  - List of recommendations
✓ Overall Assessment section displays
✓ Medical disclaimer shows
```

#### Step 5: Test PDF Export
```
1. Click "Export to PDF" button
2. Verify PDF downloads
3. Open PDF and check:
   - Patient name appears
   - Report date
   - All three disorder assessments
   - Overall assessment text
   - Medical disclaimer
```

---

## 2. Browser DevTools Debugging

### 2.1 Console Logs to Monitor

**Frontend Console Logs:**
```javascript
// Successful flow
"User requested AI analysis for user ID: user123"
"AI analysis results received: yes"
"Analysis completed successfully"
"Exporting AI analysis to PDF"

// Error flow
"Error fetching AI analysis: Error: [message]"
"Error exporting to PDF: [message]"
```

**Backend Console Logs:**
```javascript
// Normal flow
"Processing AI analysis request for user ID: user123"
"Fetching assessments from main collection"
"Found 3 assessments in main collection"
"Fetching additional assessments from specialized collections"
"Found 5 assessments in specialized collections"
"Combined total: 8 assessments"
"Assessment types found: {tremor: 1, speech: 1, responseTime: 1, ...}"
"Sending assessments to AI analysis service"
"Preparing AI analysis with 8 assessment types"
"Making API call to Gemini for comprehensive analysis"
"Gemini API response received with status: 200"
"Response text length: 1456"
"Parsed response with keys: parkinsonsDisease, bellsPalsy, als, ..."
"AI analysis completed successfully"
```

### 2.2 Network Tab Analysis

**Expected Request:**
```
Request URL: http://localhost:5000/api/assessments/{userId}/ai-analysis
Request Method: POST
Status: 200 OK
Response Time: 2000-5000ms

Headers:
- Authorization: Bearer [JWT_TOKEN]
- Content-Type: application/json

Response Body:
{
  "parkinsonsDisease": {...},
  "bellsPalsy": {...},
  "als": {...},
  "overallAssessment": "...",
  "disclaimerNote": "..."
}
```

### 2.3 Application State Inspection

**React DevTools:**
```
AiAnalysisPanel Component State:
├─ loading: false (should be true during loading)
├─ error: null (should contain error message on failure)
├─ aiResults: {
│  ├─ parkinsonsDisease: {...}
│  ├─ bellsPalsy: {...}
│  ├─ als: {...}
│  ├─ overallAssessment: "string"
│  └─ disclaimerNote: "string"
├─ snackbar: {
│  ├─ open: boolean
│  ├─ message: string
│  └─ severity: "success"|"error"|"info"
```

---

## 3. Common Issues & Solutions

### Issue 1: "No Assessment Data Found for This User"
**Symptoms:**
- Error message appears immediately
- No 2-5 second wait time

**Root Causes:**
1. User has no completed assessments
2. Assessments have `status: "INCOMPLETE"`
3. Wrong userId in request

**Solutions:**
```javascript
// Check 1: Verify assessments exist
db.assessments.find({userId: "user123", status: "COMPLETED"}).count()

// Check 2: Verify specialized collections
db.tremoreAssessments.find({userId: "user123", status: "COMPLETED"}).count()
db.speechPatternAssessments.find({userId: "user123", status: "COMPLETED"}).count()

// Check 3: Look at timestamps
db.assessments.find({userId: "user123"}).sort({timestamp: -1}).limit(5)
```

**Fixing:**
- Complete at least one assessment
- Ensure all assessments have `status: "COMPLETED"`
- Use "Seed Test Data" button (if in dev mode)

---

### Issue 2: "Analysis Failed: Network Error"
**Symptoms:**
- Error appears after 5+ seconds
- Network tab shows 500 error

**Root Causes:**
1. Gemini API key is invalid or expired
2. API rate limit exceeded
3. Backend can't reach Gemini API
4. Malformed prompt causing API error

**Solutions:**
```javascript
// Check 1: Verify API key in .env
console.log(process.env.GEMINI_API_KEY)

// Check 2: Check backend logs for Gemini error
// Look for: "API Error details:" in console

// Check 3: Test Gemini API connectivity
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'

// Check 4: Verify prompt is valid
// Add console.log(prompt) in createAiPrompt() function
```

**Fixing:**
- Regenerate Gemini API key from Google Cloud Console
- Check API quota limits
- Ensure CORS headers are correct (if cross-origin)
- Wait if rate limit exceeded, try again

---

### Issue 3: "Invalid JSON Response"
**Symptoms:**
- Results appear but with "unknown" risk levels
- Console shows parsing warnings
- Some indicators show as "Unable to parse"

**Root Causes:**
1. Gemini API returned malformed JSON
2. Gemini API included explanation text outside JSON
3. Special characters in AI response

**Solutions:**
```javascript
// Check 1: Log raw response
// In parseAiResponse(), add:
console.log('Raw Gemini response:', text);

// Check 2: Check if JSON is wrapped in markdown
// Look for ``` or json markers

// Check 3: Validate response structure
const result = JSON.parse(text);
if (!result.parkinsonsDisease) console.error('Missing parkinsonsDisease key');
if (!result.bellsPalsy) console.error('Missing bellsPalsy key');
if (!result.als) console.error('Missing als key');
```

**Fixing:**
- Check Gemini API response format in logs
- Adjust prompt to be more explicit about JSON format
- Use `reconstructJsonFromText()` function for partial recovery

---

### Issue 4: "PDF Export Not Working"
**Symptoms:**
- PDF button doesn't respond
- No download occurs
- Console error appears

**Root Causes:**
1. `jsPDF` library not loaded
2. Invalid analysis data format
3. Browser blocks download
4. Memory issue with large PDF

**Solutions:**
```javascript
// Check 1: Verify jsPDF is loaded
console.log(typeof jsPDF)

// Check 2: Verify aiResults has required fields
console.log(JSON.stringify(aiResults, null, 2))

// Check 3: Check browser console for security warnings
// Look for: "The download was blocked" or "CORS error"

// Check 4: Check exported data in function
// In exportAiAnalysisToPdf(), add:
console.log('Exporting with data:', analysisData)
```

**Fixing:**
- Ensure jsPDF is in package.json
- Check aiResults structure matches expected format
- Add patient name parameter
- Clear browser cache and try again

---

### Issue 5: "Loading Spinner Never Disappears"
**Symptoms:**
- Spinner appears and stays indefinitely
- No results appear
- No error message

**Root Causes:**
1. API request times out
2. Network connection lost
3. Backend hanging
4. Race condition in state management

**Solutions:**
```javascript
// Check 1: Monitor network request
// In Network tab, watch for pending requests

// Check 2: Add timeout monitoring
// Modify fetchAiAnalysis:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

// Check 3: Check backend logs
// Look for: "Processing AI analysis" without completion logs

// Check 4: Check for error silently being caught
// Look in error logs
```

**Fixing:**
- Refresh the page and try again
- Check backend server is running
- Verify network connection
- Increase API timeout if needed (backend config)
- Check for browser extension interference

---

## 4. Backend Debugging

### 4.1 Enable Detailed Logging

**Add to aiService.js:**
```javascript
// At the start of getAiAnalysisResults()
console.log('=== AI Analysis Debug Start ===');
console.log('Input assessments:', assessments.length);
assessments.forEach((a, i) => {
  console.log(`Assessment ${i}:`, {
    type: a.type,
    metricsKeys: Object.keys(a.metrics || {}),
    timestamp: a.timestamp
  });
});

// In transformAssessmentsData()
console.log('Transformed data structure:', JSON.stringify(transformedData, null, 2));

// In createAiPrompt()
console.log('Prompt content:', prompt);

// Before Gemini API call
console.log('Sending to Gemini API...');

// After Gemini API call
console.log('Gemini raw response:', response.data);

// In parseAiResponse()
console.log('Parsing response:', text);
console.log('Parse result:', JSON.stringify(parsedResponse, null, 2));

console.log('=== AI Analysis Debug End ===');
```

### 4.2 Monitor Database Queries

**Check Assessment Count:**
```javascript
// In getAiAnalysis controller
const mainCount = await Assessment.countDocuments({
  userId: userId,
  status: 'COMPLETED'
});
console.log(`Main collection: ${mainCount} assessments`);

// For each specialized collection
const tremorCount = await TremorAssessment.countDocuments({
  userId: userId,
  status: 'COMPLETED'
});
console.log(`Tremor collection: ${tremorCount} assessments`);

// ... and so on for all 8 collections
```

### 4.3 Test Prompt Generation

```javascript
// Create standalone test
import { getAiAnalysisResults } from './services/aiService.js';

const testAssessments = [
  {
    type: 'TREMOR',
    metrics: {
      tremor_frequency: 8.5,
      tremor_amplitude: 2.3,
      severity: 'moderate'
    },
    timestamp: new Date()
  },
  // Add more test data...
];

const result = await getAiAnalysisResults(testAssessments);
console.log('AI Analysis Result:', result);
```

---

## 5. Performance Profiling

### 5.1 Frontend Performance

**Measure Component Render Time:**
```javascript
// In AiAnalysisPanel.jsx
console.time('AI_ANALYSIS_LOAD');
const results = await fetchAiAnalysis(userId);
console.timeEnd('AI_ANALYSIS_LOAD');

// Expected: 2000-5000ms
```

**Identify Bottlenecks:**
```javascript
// Time each step
console.time('transform');
// transformation code
console.timeEnd('transform'); // Expected: <100ms

console.time('prompt');
// prompt creation
console.timeEnd('prompt'); // Expected: <100ms

console.time('api_call');
// API call
console.timeEnd('api_call'); // Expected: 1000-3000ms

console.time('parse');
// response parsing
console.timeEnd('parse'); // Expected: <100ms
```

### 5.2 Backend Performance

**Database Query Performance:**
```javascript
// Add timing
const startDb = Date.now();
const assessments = await Assessment.find({...});
console.log(`Database query took: ${Date.now() - startDb}ms`);

// Expected: <500ms for up to 1000 assessments
```

**Memory Usage:**
```javascript
// Monitor memory
console.log('Memory before:', process.memoryUsage());
// Process assessments
console.log('Memory after:', process.memoryUsage());

// Look for memory leaks (memory shouldn't grow significantly)
```

---

## 6. Unit Testing Examples

### 6.1 Test transformAssessmentsData()

```javascript
import { transformAssessmentsData } from '../services/aiService.js';

describe('transformAssessmentsData', () => {
  test('should transform single tremor assessment', () => {
    const input = [{
      type: 'TREMOR_ASSESSMENT',
      metrics: { frequency: 8.5 },
      timestamp: new Date()
    }];

    const result = transformAssessmentsData(input);
    
    expect(result.tremor).not.toBeNull();
    expect(result.tremor.metrics.frequency).toBe(8.5);
    expect(result.speech).toBeNull();
  });

  test('should keep most recent assessment', () => {
    const older = {
      type: 'TREMOR',
      metrics: { frequency: 7 },
      timestamp: new Date('2025-01-01')
    };
    const newer = {
      type: 'TREMOR',
      metrics: { frequency: 8.5 },
      timestamp: new Date('2025-01-02')
    };

    const result = transformAssessmentsData([older, newer]);
    
    expect(result.tremor.metrics.frequency).toBe(8.5);
  });

  test('should handle empty array', () => {
    const result = transformAssessmentsData([]);
    
    expect(result.tremor).toBeNull();
    expect(result.speech).toBeNull();
    // ... all should be null
  });
});
```

### 6.2 Test parseAiResponse()

```javascript
describe('parseAiResponse', () => {
  test('should parse valid JSON response', () => {
    const response = `{
      "parkinsonsDisease": {
        "riskLevel": "high",
        "confidence": 85,
        "indicators": ["tremor"],
        "recommendations": ["see neurologist"]
      },
      "bellsPalsy": {
        "riskLevel": "low",
        "confidence": 15,
        "indicators": [],
        "recommendations": []
      },
      "als": {
        "riskLevel": "low",
        "confidence": 10,
        "indicators": [],
        "recommendations": []
      },
      "overallAssessment": "test",
      "disclaimerNote": "test"
    }`;

    const result = parseAiResponse(response);
    
    expect(result.parkinsonsDisease.riskLevel).toBe('high');
    expect(result.parkinsonsDisease.confidence).toBe(85);
  });

  test('should handle malformed JSON', () => {
    const response = 'invalid json {missing brackets';
    
    expect(() => parseAiResponse(response)).not.toThrow();
    // Should return structured error response
  });
});
```

---

## 7. Integration Testing

### 7.1 Full Flow Test

```javascript
describe('AI Analysis Full Flow', () => {
  test('complete analysis from request to display', async () => {
    // 1. Create test assessments
    const assessment = await Assessment.create({
      userId: testUserId,
      type: 'TREMOR',
      metrics: { frequency: 8.5 },
      status: 'COMPLETED'
    });

    // 2. Call API
    const response = await request(app)
      .post(`/assessments/${testUserId}/ai-analysis`)
      .set('Authorization', `Bearer ${testToken}`);

    // 3. Verify response
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('parkinsonsDisease');
    expect(response.body).toHaveProperty('bellsPalsy');
    expect(response.body).toHaveProperty('als');
    expect(response.body.parkinsonsDisease).toHaveProperty('riskLevel');
    expect(response.body.parkinsonsDisease).toHaveProperty('confidence');
    expect(response.body.parkinsonsDisease).toHaveProperty('indicators');
    expect(response.body.parkinsonsDisease).toHaveProperty('recommendations');
  });
});
```

---

## 8. Monitoring Checklist

- [ ] API response times are 2-5 seconds
- [ ] Loading spinner appears immediately
- [ ] Results display correctly with all three disorders
- [ ] Risk levels show appropriate colors
- [ ] Confidence scores are 0-100
- [ ] Indicators and recommendations are non-empty arrays
- [ ] Overall assessment text is present
- [ ] Medical disclaimer is visible
- [ ] PDF export downloads successfully
- [ ] No JavaScript console errors
- [ ] No network errors in DevTools
- [ ] Error messages display when appropriate
- [ ] Snackbar notifications show correctly
- [ ] Loading spinner disappears when complete
- [ ] Memory usage doesn't grow indefinitely
