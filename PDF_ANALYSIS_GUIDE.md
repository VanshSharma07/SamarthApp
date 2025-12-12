# PDF-Based AI Analysis Implementation

## Overview
The system now supports uploading medical PDF reports for automated AI analysis to assess the risk of Parkinson's disease, Alzheimer's disease, and Epilepsy.

## Architecture

### Backend Components

#### 1. PDF Upload Route
**File:** `backend/src/routes/assessmentRoutes.js`
- **Endpoint:** `POST /assessments/:userId/analyze-pdf`
- **Middleware:** Multer file upload handler
- **File Size Limit:** 50MB
- **Accepted Format:** PDF only
- **Storage:** In-memory (no disk write)

#### 2. Controller Handler
**File:** `backend/src/controllers/assessmentController.js`
**Function:** `analyzePdfAi()`
- Validates PDF file presence and size
- Extracts text from PDF buffer using `pdf-parse`
- Validates extracted content (minimum 50 characters)
- Calls `getAiAnalysisFromPdf()` from AI service
- Returns structured JSON response

#### 3. AI Service
**File:** `backend/src/services/aiService.js`
**Function:** `getAiAnalysisFromPdf(pdfText)`

**Process:**
1. Validates PDF text content
2. Creates a system prompt requesting JSON-only response
3. Calls LLM Worker API with the prompt
4. Handles multiple response formats:
   - Markdown code blocks (```json ... ```)
   - Direct JSON
   - Mixed prose + JSON
5. Implements fallback JSON extraction using regex patterns
6. Cleans invalid JSON (removes trailing commas, repairs structure)
7. Falls back to `parseAiResponse()` if JSON parsing fails completely

**Response Format:**
```json
{
  "success": true,
  "data": {
    "parkinsonsDisease": {
      "riskLevel": "low|moderate|high",
      "indicators": ["indicator1", "indicator2"],
      "recommendations": ["rec1", "rec2"]
    },
    "alzheimersDisease": {
      "riskLevel": "low|moderate|high",
      "indicators": ["indicator1", "indicator2"],
      "recommendations": ["rec1", "rec2"]
    },
    "epilepsy": {
      "riskLevel": "low|moderate|high",
      "indicators": ["indicator1", "indicator2"],
      "recommendations": ["rec1", "rec2"]
    },
    "overallAssessment": "Summary text",
    "disclaimerNote": "Medical disclaimer"
  },
  "message": "PDF analysis completed successfully"
}
```

### Frontend Components

#### 1. AiAnalysisPanel Component
**File:** `frontend/src/components/analytics/AiAnalysisPanel.jsx`

**New Features:**
- "Upload PDF" button alongside "Analyse Report with AI"
- File input validation (PDF only)
- Calls `uploadPdfForAnalysis()` service
- Displays results in existing disorder grid layout
- File type validation with user feedback

#### 2. Assessment Service
**File:** `frontend/src/services/assessmentService.js`
**Function:** `uploadPdfForAnalysis(userId, pdfFile)`
- Creates FormData with PDF file
- Sends multipart/form-data request
- Includes Bearer token for authentication
- Throws on error for proper error handling

## Data Flow

```
User uploads PDF
    ↓
Frontend: AiAnalysisPanel.handlePdfUpload()
    ↓
Service: uploadPdfForAnalysis(userId, file)
    ↓
HTTP POST: /assessments/{userId}/analyze-pdf (multipart/form-data)
    ↓
Backend Middleware: multer validates and loads to memory
    ↓
Controller: analyzePdfAi()
    - Validates file
    - Extracts text (pdf-parse)
    ↓
Service: getAiAnalysisFromPdf(pdfText)
    - Creates system prompt (JSON-only request)
    - Calls LLM Worker API
    - Extracts JSON from response
    - Handles parsing errors gracefully
    ↓
Response: Structured disorder analysis
    ↓
Frontend: Displays in AiAnalysisPanel grid
```

## Error Handling Strategy

### Response Parsing Fallback Chain

1. **Try: Direct JSON Parse**
   - If response is pure JSON, parse directly

2. **Try: Extract from Markdown Blocks**
   - If response contains ```json ... ``` blocks
   - Extract and parse the JSON content

3. **Try: Extract Raw JSON Object**
   - If response is prose + JSON without code blocks
   - Use regex to find `{...}` structure
   - Parse extracted JSON

4. **Try: Clean Invalid JSON**
   - Remove trailing commas before `}` or `]`
   - Retry parsing

5. **Fallback: Text-based Parsing**
   - If JSON parsing fails completely
   - Call `parseAiResponse()` to extract keywords
   - Build response from regex patterns
   - Preserves availability despite malformed responses

## LLM Prompt Design

The prompt is deliberately structured to:
1. **Request JSON-Only Output**
   - No markdown formatting allowed
   - No explanation text before/after
   - Reduces parsing complexity

2. **Define Exact JSON Structure**
   - Shows complete example format
   - Specifies field names and types
   - Reduces hallucination/variation

3. **Include Medical Context**
   - Asks for risk assessment (low/moderate/high)
   - Requests specific indicators from report
   - Asks for clinical recommendations

## Testing

Run the test script:
```bash
# Navigate to project root
cd d:\Codes\SamarthApp\samarth-web

# Set test token (optional)
$env:TEST_TOKEN = "your-auth-token"

# Run test
node test-pdf-upload.js
```

**Test Coverage:**
- Authentication verification
- PDF upload handling
- File type validation
- Response structure validation
- JSON parsing robustness
- Error logging

## Deployment Notes

### Dependencies Added
- `pdf-parse` (npm install already done)

### Environment Variables Required
- `LLM_API_URL` - LLM Worker API endpoint
- `LLM_API_KEY` - API authentication key

### File Size Limits
- Multer configured: 50MB max
- PDF content minimum: 50 characters
- Adjustable in `assessmentRoutes.js` and `assessmentController.js`

### Performance Considerations
- PDF parsing: ~100-500ms for typical reports
- LLM API call: 5-30 seconds (depends on LLM)
- In-memory storage: No disk I/O overhead
- Response size: Typical 1-3KB JSON

## Future Enhancements

1. **Batch Processing**
   - Queue multiple PDFs
   - Process asynchronously
   - Store results in DB

2. **PDF Analysis Caching**
   - Store parsed PDFs
   - Hash-based duplicate detection
   - Reduce redundant LLM calls

3. **Extended Disorder Support**
   - Add more neurological conditions
   - Customize prompt per disorder
   - Store analysis history

4. **Response Validation**
   - Schema validation for AI response
   - Confidence scoring
   - Uncertainty handling

5. **Audit Logging**
   - Log all PDF uploads
   - Track LLM requests/responses
   - User activity tracking

## Troubleshooting

### Issue: "Failed to parse JSON from response"
**Cause:** LLM returning prose before/after JSON or malformed JSON
**Solution:** 
- Check LLM API response quality
- Verify prompt is requesting JSON-only output
- Review `cleanAiResponseText()` logic
- Check server logs for response preview

### Issue: "PDF content is too short"
**Cause:** PDF extraction resulted in <50 characters
**Solution:**
- Verify PDF file is valid and has text
- Lower threshold in `analyzePdfAi()` if needed
- Check `pdf-parse` library compatibility

### Issue: "No content in API response"
**Cause:** LLM returned empty response or unexpected format
**Solution:**
- Check LLM service status
- Verify API key is valid
- Review request format in logs
- Check LLM API documentation

### Issue: "File type error"
**Cause:** Non-PDF file uploaded
**Solution:**
- Check file MIME type validation
- Verify file extension is .pdf
- Test with valid PDF

## Logs to Monitor

**Backend Logs:**
```
Received PDF for AI analysis. Size: [bytes]
Starting PDF text analysis. Text length: [characters]
Making LLM API call with PDF-based prompt
LLM API response received with status: 200
Successfully parsed JSON response from PDF analysis
```

**Error Logs:**
```
Failed to parse JSON from response: [error]
Attempting to extract JSON from mixed text response...
Successfully extracted and parsed JSON from mixed response
```

## Code References

- **Controller:** `backend/src/controllers/assessmentController.js` (lines 775-804)
- **Service:** `backend/src/services/aiService.js` (lines 772-927)
- **Routes:** `backend/src/routes/assessmentRoutes.js` (lines 1-54)
- **Frontend Component:** `frontend/src/components/analytics/AiAnalysisPanel.jsx` (lines 1-248)
- **Frontend Service:** `frontend/src/services/assessmentService.js` (lines 480-503)
