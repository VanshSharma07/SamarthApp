# PDF AI Analysis - Code Changes Summary

## Overview
This document summarizes all code changes made to implement PDF-based AI analysis for neurological disorder assessment.

## 1. Backend Dependencies

### File: `backend/package.json`
**Change:** Added pdf-parse library
```json
{
  "dependencies": {
    "pdf-parse": "^1.1.1"
  }
}
```

## 2. Backend Routes

### File: `backend/src/routes/assessmentRoutes.js`

**Added Imports:**
```javascript
import multer from 'multer';
import { analyzePdfAi } from '../controllers/assessmentController.js';
```

**Added Multer Configuration:**
```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});
```

**Added Route:**
```javascript
router.post('/:userId/analyze-pdf', upload.single('file'), analyzePdfAi);
```

## 3. Backend Controller

### File: `backend/src/controllers/assessmentController.js`

**Added Imports:**
```javascript
import pdfParse from 'pdf-parse';
import { getAiAnalysisFromPdf } from '../services/aiService.js';
```

**Added Controller Function:**
```javascript
export const analyzePdfAi = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required (field name: file)' });
    }

    console.log('Received PDF for AI analysis. Size:', req.file.size);

    // Parse PDF text
    const parsed = await pdfParse(req.file.buffer);
    const pdfText = parsed.text || '';

    if (!pdfText || pdfText.trim().length < 50) {
      return res.status(400).json({ message: 'PDF content is too short to analyze' });
    }

    // Run AI analysis on extracted text
    const aiResults = await getAiAnalysisFromPdf(pdfText);
    return res.status(200).json(aiResults);
  } catch (error) {
    console.error('Failed to perform AI PDF analysis:', error);
    res.status(500).json({ message: 'Failed to analyze PDF', error: error.message });
  }
};
```

## 4. Backend AI Service

### File: `backend/src/services/aiService.js`

**Updated Prompt (for PDF Analysis):**
```javascript
const prompt = `You are a clinical AI assistant analyzing a patient medical report. Extract and assess indicators for Parkinson's disease, Alzheimer's disease, and Epilepsy.

Based on the following medical report, provide ONLY valid JSON output with NO additional text or explanation. The JSON must be syntactically valid.

Return EXACTLY this JSON structure with no markdown formatting, no explanation text before or after, and no code blocks:

{
  "parkinsonsDisease": {
    "riskLevel": "low|moderate|high",
    "indicators": ["indicator 1", "indicator 2", "indicator 3"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "alzheimersDisease": {
    "riskLevel": "low|moderate|high",
    "indicators": ["indicator 1", "indicator 2", "indicator 3"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "epilepsy": {
    "riskLevel": "low|moderate|high",
    "indicators": ["indicator 1", "indicator 2", "indicator 3"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "overallAssessment": "Brief summary of findings",
  "disclaimerNote": "This is an automated AI analysis and should not replace professional medical diagnosis."
}

MEDICAL REPORT:
${pdfText}`;
```

**Added New Export Function:**
```javascript
export const getAiAnalysisFromPdf = async (pdfText) => {
  try {
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('PDF text content is empty');
    }

    console.log('Starting PDF text analysis. Text length:', pdfText.length);

    // [Create prompt - see above]
    
    console.log('Making LLM API call with PDF-based prompt');

    // Make API call to LLM Worker API
    const response = await axios.post(
      LLM_API_URL,
      { messages: [{ role: "system", content: prompt }] },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': LLM_API_KEY
        },
        timeout: 60000,
        maxRedirects: 5
      }
    );

    console.log('LLM API response received with status:', response.status);

    // Extract text from response (handles multiple formats)
    let text;
    if (response.data.output) {
      text = response.data.output;
    } else if (response.data.choices && response.data.choices[0]) {
      text = response.data.choices[0].message?.content || response.data.choices[0].text;
    } else if (response.data.content) {
      text = response.data.content;
    } else if (response.data.result) {
      text = response.data.result;
    } else if (typeof response.data === 'string') {
      text = response.data;
    } else {
      console.error('Unexpected response format:', JSON.stringify(response.data).substring(0, 500));
      throw new Error('Unexpected API response format');
    }

    if (!text) {
      console.error('Failed to extract text from response');
      throw new Error('No content in API response');
    }

    // ROBUST JSON EXTRACTION (5-LEVEL FALLBACK)
    
    // Level 1: Extract from markdown code blocks
    if (text.includes('```json')) {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        text = jsonMatch[1];
        console.log('Extracted JSON from markdown code block');
      }
    } else if (text.includes('```')) {
      const jsonMatch = text.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        text = jsonMatch[1];
        console.log('Extracted JSON from code block');
      }
    }

    console.log('Response text length:', text.length);
    console.log('Response preview:', text.substring(0, 100).replace(/\n/g, '\\n'));

    // Level 2: Try direct JSON parse
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
      console.log('Successfully parsed JSON response from PDF analysis');
    } catch (parseError) {
      console.error('Failed to parse JSON from response:', parseError.message);
      console.log('Attempting to extract JSON from mixed text response...');
      
      // Level 3: Extract raw JSON object from prose
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted and parsed JSON from mixed response');
        } catch (innerError) {
          console.error('Failed to parse extracted JSON:', innerError.message);
          console.log('Sample of extracted text:', jsonMatch[0].substring(0, 200));
          
          // Level 4: Clean and repair JSON
          let cleanedJson = jsonMatch[0];
          cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');
          
          try {
            parsedResponse = JSON.parse(cleanedJson);
            console.log('Successfully parsed cleaned JSON after removing trailing commas');
          } catch (finalError) {
            console.error('Final JSON parsing attempt failed:', finalError.message);
            // Level 5: Fall back to text parsing
            parsedResponse = parseAiResponse(text);
          }
        }
      } else {
        console.log('No JSON structure found in response, falling back to text parsing');
        parsedResponse = parseAiResponse(text);
      }
    }

    return {
      success: true,
      data: parsedResponse,
      message: 'PDF analysis completed successfully'
    };
  } catch (error) {
    console.error('Error in getAiAnalysisFromPdf:', error);

    if (error.response) {
      console.error('API Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    return {
      success: false,
      error: error.message,
      message: 'Failed to analyze PDF'
    };
  }
};
```

## 5. Frontend Component

### File: `frontend/src/components/analytics/AiAnalysisPanel.jsx`

**Updated Imports:**
```javascript
import { Box, Typography, Paper, CircularProgress, Alert, Grid, Chip, Divider, List, ListItem, ListItemText, ListItemIcon, Button, Snackbar, Input } from '@mui/material';
import { fetchAiAnalysis, uploadPdfForAnalysis } from '../../services/assessmentService';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
```

**Added State:**
```javascript
const [pdfFile, setPdfFile] = useState(null);
```

**Added Handler Function:**
```javascript
const handlePdfUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (file.type !== 'application/pdf') {
    setError('Please select a PDF file');
    setSnackbar({
      open: true,
      message: 'Only PDF files are allowed',
      severity: 'error'
    });
    return;
  }

  try {
    setLoading(true);
    setError(null);
    setPdfFile(file);
    console.log('Uploading PDF for AI analysis:', file.name);
    
    const results = await uploadPdfForAnalysis(userId, file);
    console.log('PDF AI analysis results received:', results ? 'yes' : 'no');
    setAiResults(results);
    setLoading(false);
    
    setSnackbar({
      open: true,
      message: 'PDF analysis completed successfully',
      severity: 'success'
    });
  } catch (err) {
    console.error('Error uploading PDF for analysis:', err);
    setError('Failed to analyze PDF: ' + (err.message || 'Unknown error'));
    setLoading(false);
    setPdfFile(null);
    
    setSnackbar({
      open: true,
      message: 'PDF analysis failed',
      severity: 'error'
    });
  }
};
```

**Updated Button Group:**
```javascript
<Box sx={{ display: 'flex', gap: 2 }}>
  {!loading && !aiResults && (
    <>
      <Button 
        variant="contained" 
        color="primary" 
        startIcon={<AnalyticsIcon />}
        onClick={handleAnalyzeReport}
        disabled={loading}
      >
        Analyse Report with AI
      </Button>
      
      <Button
        variant="outlined"
        color="primary"
        startIcon={<CloudUploadIcon />}
        component="label"
        disabled={loading}
      >
        Upload PDF
        <Input
          hidden
          accept=".pdf"
          type="file"
          onChange={handlePdfUpload}
        />
      </Button>
    </>
  )}
  
  {aiResults && (
    <Button 
      variant="outlined" 
      color="primary" 
      startIcon={<PictureAsPdfIcon />}
      onClick={handleExportPdf}
    >
      Export to PDF
    </Button>
  )}
</Box>
```

## 6. Frontend Service

### File: `frontend/src/services/assessmentService.js`

**Added New Export Function:**
```javascript
export const uploadPdfForAnalysis = async (userId, pdfFile) => {
  try {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/assessments/${userId}/analyze-pdf`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    console.log('PDF analysis response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading PDF for analysis:', error);
    throw error;
  }
};
```

## Summary of Changes

| Component | Type | Change | Lines |
|-----------|------|--------|-------|
| package.json | Dependency | Add pdf-parse | 1 |
| assessmentRoutes.js | Route Config | Add multer + PDF route | 27 + 1 |
| assessmentController.js | Handler | Add analyzePdfAi() | 20 |
| aiService.js | Service | Add getAiAnalysisFromPdf() | 156 |
| AiAnalysisPanel.jsx | Component | Add PDF upload button + handler | 40 |
| assessmentService.js | Service | Add uploadPdfForAnalysis() | 24 |
| **Total** | | | **~270** |

## Testing

All changes verified:
- ✅ No compilation errors
- ✅ All imports resolve
- ✅ All exports available
- ✅ Backward compatible
- ✅ Error handling in place

## Rollback Instructions

To revert these changes:
1. Remove `pdf-parse` from `package.json`
2. Remove PDF-related routes from `assessmentRoutes.js`
3. Remove `analyzePdfAi` from controller
4. Remove `getAiAnalysisFromPdf` from service
5. Remove upload button from frontend component
6. Remove `uploadPdfForAnalysis` from service

The "Analyse Report with AI" feature remains fully functional.
