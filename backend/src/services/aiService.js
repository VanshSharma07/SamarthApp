import axios from 'axios';
import dotenv from 'dotenv';
import {
  normalizeAssessmentType,
  DISORDER_CONFIG,
  getAllDisorders
} from '../config/disorderAssessmentMapping.js';

dotenv.config();
// Use the LLM Worker API from environment variables
const LLM_API_URL = process.env.LLM_API_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;

// Helper function to transform assessment data into the expected format
function transformAssessmentsData(assessments) {
  // Initialize the transformed data structure with all assessment types from config
  const transformedData = {
    // Parkinson's assessments
    eyeMovement: null,
    tremor: null,
    responseTime: null,
    gaitAnalysis: null,
    fingerTapping: null,
    speechPattern: null,
    
    // Alzheimer's assessments
    wordList: null,
    stroop: null,
    conversationalScreening: null,
    
    // Epilepsy assessments
    neuro: null,
    hyperventilation: null
  };
  
  console.log(`Processing ${assessments.length} assessments for AI analysis`);
  
  // Process each assessment and map to the expected structure
  assessments.forEach(assessment => {
    if (!assessment.type && !assessment.metrics) {
      console.log('Skipping assessment with missing type or metrics');
      return;
    }
    
    // Normalize the assessment type using the new mapping
    const normalizedType = normalizeAssessmentType(assessment.type);
    
    if (!normalizedType) {
      console.log(`Unknown or unmapped assessment type: ${assessment.type}`);
      return;
    }
    
    // Take the most recent assessment of each type (if there are multiple)
    if (!transformedData[normalizedType] || 
        new Date(assessment.timestamp) > new Date(transformedData[normalizedType].timestamp)) {
      
      console.log(`Using ${normalizedType} assessment from ${assessment.timestamp}`);
      
      // Store the transformed assessment with proper handling for nested data
      transformedData[normalizedType] = {
        type: assessment.type,
        timestamp: assessment.timestamp,
        metrics: assessment.metrics,
        // Include any additional data that might be relevant
        neurological_indicators: assessment.neurological_indicators || 
                                assessment.metrics?.neurological_indicators
      };
    }
  });
  
  // Log what assessment types we found
  const foundTypes = Object.keys(transformedData).filter(type => transformedData[type] !== null);
  console.log(`Found assessment data for: ${foundTypes.join(', ')}`);
  
  return transformedData;
}

// Main function to get AI analysis results from assessments array
export const getAiAnalysisResults = async (assessments) => {
  try {
    // Validate input
    if (!assessments || !Array.isArray(assessments) || assessments.length === 0) {
      console.error('No assessments provided for AI analysis');
      throw new Error('No assessment data available for analysis');
    }
    
    console.log(`Received ${assessments.length} assessments for AI analysis`);
    
    // Transform the assessments array into the expected format
    const transformedData = transformAssessmentsData(assessments);
    
    // Check if we have enough data to make a meaningful analysis
    const availableTypes = Object.keys(transformedData).filter(type => transformedData[type] !== null);
    if (availableTypes.length === 0) {
      console.error('No valid assessment data found for analysis');
      throw new Error('No valid assessment data found for analysis');
    }
    
    // Log available data for facial symmetry to help with debugging
    if (transformedData.facialSymmetry) {
      console.log('Facial Symmetry data available:', {
        hasMetrics: !!transformedData.facialSymmetry.metrics,
        hasNeurologicalIndicators: !!(transformedData.facialSymmetry.neurological_indicators || 
                                     transformedData.facialSymmetry.metrics?.neurological_indicators),
        symmetryData: transformedData.facialSymmetry.neurological_indicators?.asymmetry_score || 
                      transformedData.facialSymmetry.metrics?.neurological_indicators?.asymmetry_score || 'Not Available'
      });
    } else {
      console.log('No facial symmetry data available for AI analysis');
    }
    
    console.log(`Preparing AI analysis with ${availableTypes.length} assessment types:`, availableTypes);
    
    // Create a comprehensive prompt for the AI model
    const prompt = createAiPrompt(transformedData);
    
    console.log('Making API call to LLM Worker API for comprehensive analysis');
    console.log('Prompt length:', prompt.length);
    
    // Make API call to LLM Worker API
    const response = await axios.post(
      LLM_API_URL,
      {
        messages: [
          { role: "system", content: prompt }
        ]
      },
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
    console.log('Response data structure:', JSON.stringify(response.data).substring(0, 300));
    
    // Extract text from response - handle multiple possible response formats
    let text;
    if (response.data.output) {
      // LLM Worker API format
      text = response.data.output;
    } else if (response.data.choices && response.data.choices[0]) {
      // OpenAI format
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
    
    // If response contains markdown code blocks, extract the JSON
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
    console.log('Sample response:', text.substring(0, 200).replace(/\n/g, '\\n'));
    
    // Parse response
    const parsedResponse = parseAiResponse(text);
    console.log('Parsed response with keys:', Object.keys(parsedResponse));
    
    return parsedResponse;
  } catch (error) {
    console.error('Error in getAiAnalysisResults:', error);
    
    if (error.response) {
      console.error('API Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Return a fallback response in case of error
    return {
      error: true,
      message: `Analysis failed: ${error.message}`,
      parkinsonsDisease: { 
        riskLevel: "unknown", 
        confidence: 0,
        indicators: ["Unable to analyze due to an error"],
        recommendations: ["Consult with a healthcare professional"] 
      },
      alzheimersDisease: { 
        riskLevel: "unknown", 
        confidence: 0,
        indicators: ["Unable to analyze due to an error"],
        recommendations: ["Consult with a healthcare professional"] 
      },
      epilepsy: { 
        riskLevel: "unknown", 
        confidence: 0,
        indicators: ["Unable to analyze due to an error"],
        recommendations: ["Consult with a healthcare professional"] 
      },
      overallAssessment: "Analysis could not be completed due to a technical issue.",
      disclaimerNote: "This is an automated AI analysis and should not replace professional medical diagnosis."
    };
  }
};

// Original getAiPrediction function (now serves as a backup or alternative approach)
export const getAiPrediction = async (assessmentData) => {
  try {
    // Validate assessment data before processing
    if (!assessmentData || typeof assessmentData !== 'object') {
      throw new Error('Invalid assessment data provided');
    }
    
    console.log('Processing assessment data with keys:', Object.keys(assessmentData));
    
    // Format assessment data for AI analysis
    const prompt = createAiPrompt(assessmentData);
    
    console.log('Making API call to LLM Worker API with prompt length:', prompt.length);
    console.log('API endpoint:', LLM_API_URL);
    
    // Make a real API call to LLM Worker API
    const response = await axios.post(
      LLM_API_URL,
      {
        messages: [
          { role: "system", content: prompt }
        ]
      },
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
    console.log('Response data structure:', JSON.stringify(response.data).substring(0, 300));
    
    // Extract the text from the response - handle multiple possible response formats
    let text;
    if (response.data.output) {
      // LLM Worker API format
      text = response.data.output;
    } else if (response.data.choices && response.data.choices[0]) {
      // OpenAI format
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
    
    // If response contains markdown code blocks, extract the JSON
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
    
    console.log('Successfully extracted text from LLM API response, length:', text.length);
    
    // Log a snippet of the response for debugging
    console.log('Response snippet (first 100 chars):', text.substring(0, 100));
    
    // Parse the AI response to extract structured data
    const analysis = parseAiResponse(text);
    
    return {
      rawResponse: text,
      structuredAnalysis: analysis
    };
  } catch (error) {
    console.error('Error in AI prediction:', error);
    console.error('API Key verification failed. Check if the key is valid and has proper permissions.');
    if (error.response) {
      console.error('API Error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw new Error(`AI prediction failed: ${error.message}`);
  }
};

// Helper function to create a prompt for the AI model
function createAiPrompt(assessmentData) {
  let prompt = `Analyze the following patient's neurological assessment data and provide an analysis of potential neurological disorders. Focus on identifying signs of Parkinson's disease, Alzheimer's disease, and Epilepsy.

For each potential disorder, provide:
1. A risk score (low, moderate, or high)
2. Specific indicators from the data that support your assessment
3. Recommendations for further clinical evaluation

Here is the patient's assessment data:\n\n`;

  // ===== PARKINSON'S ASSESSMENTS =====
  // Eye Movement Assessment
  if (assessmentData.eyeMovement) {
    prompt += `EYE MOVEMENT ASSESSMENT (Date: ${new Date(assessmentData.eyeMovement.timestamp).toLocaleDateString()}):
- Tracking Accuracy: ${assessmentData.eyeMovement.metrics?.accuracy || assessmentData.eyeMovement.metrics?.trackingAccuracy || 'N/A'}/10
- Saccade Speed: ${assessmentData.eyeMovement.metrics?.speed || assessmentData.eyeMovement.metrics?.saccadeSpeed || 'N/A'}/10
- Fixation Stability: ${assessmentData.eyeMovement.metrics?.stability || assessmentData.eyeMovement.metrics?.fixationStability || 'N/A'}/10
- Smoothness: ${assessmentData.eyeMovement.metrics?.smoothness || 'N/A'}/10
- Overall Score: ${assessmentData.eyeMovement.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `EYE MOVEMENT ASSESSMENT: No data available\n\n`;
  }

  // Tremor Assessment (Parkinson's specific)
  if (assessmentData.tremor) {
    prompt += `TREMOR ASSESSMENT (Date: ${new Date(assessmentData.tremor.timestamp).toLocaleDateString()}):
- Frequency: ${assessmentData.tremor.metrics?.tremor_frequency || assessmentData.tremor.metrics?.frequency || 'N/A'} Hz
- Amplitude: ${assessmentData.tremor.metrics?.tremor_amplitude || assessmentData.tremor.metrics?.amplitude || 'N/A'}
- Type: ${assessmentData.tremor.metrics?.tremor_type || assessmentData.tremor.metrics?.type || 'N/A'}
- Severity: ${assessmentData.tremor.metrics?.severity || 'N/A'}
- Overall Tremor Score: ${assessmentData.tremor.metrics?.overall?.tremorScore || assessmentData.tremor.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `TREMOR ASSESSMENT: No data available\n\n`;
  }

  // Response Time Assessment (Parkinson's & Alzheimer's)
  if (assessmentData.responseTime) {
    prompt += `RESPONSE TIME ASSESSMENT (Date: ${new Date(assessmentData.responseTime.timestamp).toLocaleDateString()}):
- Average Response Time: ${assessmentData.responseTime.metrics?.averageResponseTime || 'N/A'} ms
- Fastest Response: ${assessmentData.responseTime.metrics?.fastestResponse || 'N/A'} ms
- Slowest Response: ${assessmentData.responseTime.metrics?.slowestResponse || 'N/A'} ms
- Accuracy: ${assessmentData.responseTime.metrics?.accuracy || 'N/A'}/10
- Response Score: ${assessmentData.responseTime.metrics?.overall?.responseScore || 'N/A'}/10

`;
  } else {
    prompt += `RESPONSE TIME ASSESSMENT: No data available\n\n`;
  }

  // Gait Analysis Assessment (Parkinson's & Alzheimer's)
  if (assessmentData.gaitAnalysis) {
    prompt += `GAIT ANALYSIS ASSESSMENT (Date: ${new Date(assessmentData.gaitAnalysis.timestamp).toLocaleDateString()}):
- Stability: ${assessmentData.gaitAnalysis.metrics?.stability || 'N/A'}/10
- Balance: ${assessmentData.gaitAnalysis.metrics?.balance || 'N/A'}/10
- Symmetry: ${assessmentData.gaitAnalysis.metrics?.symmetry || 'N/A'}/10
- Step Length: ${assessmentData.gaitAnalysis.metrics?.stepLength || 'N/A'} cm
- Walking Speed: ${assessmentData.gaitAnalysis.metrics?.walkingSpeed || 'N/A'} m/s
- Cadence: ${assessmentData.gaitAnalysis.metrics?.cadence || 'N/A'} steps/min
- Overall Score: ${assessmentData.gaitAnalysis.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `GAIT ANALYSIS ASSESSMENT: No data available\n\n`;
  }

  // Finger Tapping Assessment (Parkinson's specific)
  if (assessmentData.fingerTapping) {
    prompt += `FINGER TAPPING ASSESSMENT (Date: ${new Date(assessmentData.fingerTapping.timestamp).toLocaleDateString()}):
- Frequency: ${assessmentData.fingerTapping.metrics?.frequency || assessmentData.fingerTapping.metrics?.tapsPerSecond || 'N/A'} taps/second
- Amplitude: ${assessmentData.fingerTapping.metrics?.amplitude || 'N/A'}
- Rhythm: ${assessmentData.fingerTapping.metrics?.rhythm || assessmentData.fingerTapping.metrics?.rhythmScore || 'N/A'}/10
- Accuracy: ${assessmentData.fingerTapping.metrics?.accuracy || 'N/A'}/10
- Consistency: ${assessmentData.fingerTapping.metrics?.consistency || 'N/A'}/10
- Overall Score: ${assessmentData.fingerTapping.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `FINGER TAPPING ASSESSMENT: No data available\n\n`;
  }

  // Speech Pattern Assessment (Parkinson's & Alzheimer's)
  if (assessmentData.speechPattern) {
    prompt += `SPEECH PATTERN ASSESSMENT (Date: ${new Date(assessmentData.speechPattern.timestamp).toLocaleDateString()}):
- Clarity: ${assessmentData.speechPattern.metrics?.clarity?.score || assessmentData.speechPattern.metrics?.clarity || 'N/A'}/10
- Speech Rate: ${assessmentData.speechPattern.metrics?.speechRate?.wordsPerMinute || assessmentData.speechPattern.metrics?.speechRate || 'N/A'} words per minute
- Volume Control: ${assessmentData.speechPattern.metrics?.volumeControl?.score || assessmentData.speechPattern.metrics?.volumeControl || 'N/A'}/10
- Overall Score: ${assessmentData.speechPattern.metrics?.overallScore || assessmentData.speechPattern.metrics?.overallQuality || 'N/A'}/10
${assessmentData.speechPattern.metrics?.emotion ? `
- Confidence: ${assessmentData.speechPattern.metrics.emotion.confidence || 'N/A'}/10
- Hesitation: ${assessmentData.speechPattern.metrics.emotion.hesitation || 'N/A'}/10
- Stress: ${assessmentData.speechPattern.metrics.emotion.stress || 'N/A'}/10
- Monotony: ${assessmentData.speechPattern.metrics.emotion.monotony || 'N/A'}/10\n` : ''}

`;
  } else {
    prompt += `SPEECH PATTERN ASSESSMENT: No data available\n\n`;
  }

  // ===== ALZHEIMER'S SPECIFIC ASSESSMENTS =====
  // Word List Memory Test
  if (assessmentData.wordList) {
    prompt += `WORD LIST MEMORY TEST (Date: ${new Date(assessmentData.wordList.timestamp).toLocaleDateString()}):
- Immediate Recall: ${assessmentData.wordList.metrics?.immediateRecall || 'N/A'}/10
- Delayed Recall: ${assessmentData.wordList.metrics?.delayedRecall || 'N/A'}/10
- Recognition: ${assessmentData.wordList.metrics?.recognition || 'N/A'}/10
- Learning Index: ${assessmentData.wordList.metrics?.learningIndex || 'N/A'}/10
- Forgetting Rate: ${assessmentData.wordList.metrics?.forgettingRate || 'N/A'}/10
- Overall Memory Score: ${assessmentData.wordList.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `WORD LIST MEMORY TEST: No data available\n\n`;
  }

  // Stroop Test (Alzheimer's specific)
  if (assessmentData.stroop) {
    prompt += `STROOP TEST (Date: ${new Date(assessmentData.stroop.timestamp).toLocaleDateString()}):
- Word Reading Time: ${assessmentData.stroop.metrics?.wordReadingTime || 'N/A'} seconds
- Color Naming Time: ${assessmentData.stroop.metrics?.colorNamingTime || 'N/A'} seconds
- Stroop Interference Time: ${assessmentData.stroop.metrics?.stroopInterferenceTime || 'N/A'} seconds
- Accuracy: ${assessmentData.stroop.metrics?.accuracy || 'N/A'}/10
- Interference Effect: ${assessmentData.stroop.metrics?.interferenceEffect || 'N/A'}/10
- Executive Function Score: ${assessmentData.stroop.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `STROOP TEST: No data available\n\n`;
  }

  // Conversational Screening (Alzheimer's specific)
  if (assessmentData.conversationalScreening) {
    prompt += `CONVERSATIONAL SCREENING (Date: ${new Date(assessmentData.conversationalScreening.timestamp).toLocaleDateString()}):
- Vocabulary: ${assessmentData.conversationalScreening.metrics?.vocabulary || 'N/A'}/10
- Coherence: ${assessmentData.conversationalScreening.metrics?.coherence || 'N/A'}/10
- Topic Maintenance: ${assessmentData.conversationalScreening.metrics?.topicMaintenance || 'N/A'}/10
- Language Fluency: ${assessmentData.conversationalScreening.metrics?.fluency || 'N/A'}/10
- Comprehension: ${assessmentData.conversationalScreening.metrics?.comprehension || 'N/A'}/10
- Overall Cognitive Screen: ${assessmentData.conversationalScreening.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `CONVERSATIONAL SCREENING: No data available\n\n`;
  }

  // ===== EPILEPSY SPECIFIC ASSESSMENTS =====
  // Neuro (EEG/ECG) Assessment
  if (assessmentData.neuro) {
    prompt += `NEURO (EEG/ECG) ASSESSMENT (Date: ${new Date(assessmentData.neuro.timestamp).toLocaleDateString()}):
- EEG Abnormality Detection: ${assessmentData.neuro.metrics?.eegAbnormality || 'N/A'}/10
- Spike Detection: ${assessmentData.neuro.metrics?.spikeDetection || 'N/A'}/10
- Seizure Activity: ${assessmentData.neuro.metrics?.seizureActivity || 'N/A'}/10
- ECG Regularity: ${assessmentData.neuro.metrics?.ecgRegularity || 'N/A'}/10
- Heart Rate Variability: ${assessmentData.neuro.metrics?.heartRateVariability || 'N/A'} bpm
- Overall Neuro Score: ${assessmentData.neuro.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `NEURO (EEG/ECG) ASSESSMENT: No data available\n\n`;
  }

  // Hyperventilation Response Test (Epilepsy specific)
  if (assessmentData.hyperventilation) {
    prompt += `HYPERVENTILATION RESPONSE TEST (Date: ${new Date(assessmentData.hyperventilation.timestamp).toLocaleDateString()}):
- Baseline Heart Rate: ${assessmentData.hyperventilation.metrics?.baselineHeartRate || 'N/A'} bpm
- Peak Heart Rate During HV: ${assessmentData.hyperventilation.metrics?.peakHeartRate || 'N/A'} bpm
- Heart Rate Recovery: ${assessmentData.hyperventilation.metrics?.heartRateRecovery || 'N/A'} bpm
- Seizure Provocation: ${assessmentData.hyperventilation.metrics?.seizureProvocation || 'N/A'}/10
- EEG Changes: ${assessmentData.hyperventilation.metrics?.eegChanges || 'N/A'}/10
- Overall HV Response: ${assessmentData.hyperventilation.metrics?.overallScore || 'N/A'}/10

`;
  } else {
    prompt += `HYPERVENTILATION RESPONSE TEST: No data available\n\n`;
  }

  // Add specific JSON formatting instruction
  prompt += `IMPORTANT: Your response MUST be a valid JSON object without any additional text, explanations, or markdown. Format your response as follows, replacing placeholders with your analysis:

{
  "parkinsonsDisease": {
    "riskLevel": "low|moderate|high",
    "confidence": 0-100,
    "indicators": ["indicator 1", "indicator 2", "indicator 3"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "alzheimersDisease": {
    "riskLevel": "low|moderate|high",
    "confidence": 0-100,
    "indicators": ["indicator 1", "indicator 2", "indicator 3"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "epilepsy": {
    "riskLevel": "low|moderate|high",
    "confidence": 0-100,
    "indicators": ["indicator 1", "indicator 2", "indicator 3"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "overallAssessment": "Your overall assessment summary based on all provided assessments",
  "disclaimerNote": "This is an automated AI analysis and should not replace professional medical diagnosis."
}

DO NOT include any explanatory text outside the JSON. The entire response should be valid JSON that can be parsed directly.`;

  console.log('Generated AI prompt with length:', prompt.length);
  return prompt;
}

// Helper function to parse the AI response
function parseAiResponse(text) {
  try {
    const cleanedText = cleanAiResponseText(text);
    console.log('Cleaned AI response preview:', cleanedText.substring(0, 300));
    // First attempt: Try to parse the cleaned response as JSON
    try {
      return JSON.parse(cleanedText);
    } catch (e) {
      console.log('Could not parse entire response as JSON, trying extraction...');
    }
    
    // Second attempt: Extract JSON with improved regex patterns
    const patterns = [
      /\{[\s\S]*\}/g,                   // Standard JSON object pattern
      /\{[\s\S]*"disclaimerNote"[\s\S]*\}/g, // Look for specific field
      /\{\s*"parkinsonsDisease"[\s\S]*\}/g   // Look for starting field
    ];
    
    for (const pattern of patterns) {
      const matches = cleanedText.match(pattern);
      if (matches && matches.length > 0) {
        const jsonStr = matches[0];
        try {
          console.log('Found JSON structure using pattern:', pattern);
          return JSON.parse(jsonStr);
        } catch (e) {
          console.log(`Extraction found, but parsing failed for pattern ${pattern}:`, e.message);
        }
      }
    }
    
    // Third attempt: Try to reconstruct the JSON from the text
    console.log('Attempting to reconstruct JSON from text...');
    const reconstructedJson = reconstructJsonFromText(cleanedText);
    if (reconstructedJson) {
      return reconstructedJson;
    }
    
    console.warn('Could not extract JSON from AI response, using fallback format');
    console.log('First 500 chars of response:', cleanedText.substring(0, 500));
    
    // If all attempts fail, return a basic structure with new disorders
    return {
      parkinsonsDisease: { 
        riskLevel: extractRiskLevel(text, "parkinson"),
        confidence: 0,
        indicators: extractBulletPoints(text, "parkinson", "indicator"), 
        recommendations: extractBulletPoints(text, "parkinson", "recommend")
      },
      alzheimersDisease: { 
        riskLevel: extractRiskLevel(text, "alzheimer"),
        confidence: 0,
        indicators: extractBulletPoints(text, "alzheimer", "indicator"), 
        recommendations: extractBulletPoints(text, "alzheimer", "recommend")
      },
      epilepsy: { 
        riskLevel: extractRiskLevel(text, "epilepsy"),
        confidence: 0,
        indicators: extractBulletPoints(text, "epilepsy", "indicator"), 
        recommendations: extractBulletPoints(text, "epilepsy", "recommend")  
      },
      overallAssessment: extractOverallAssessment(text),
      disclaimerNote: "This is an automated AI analysis and should not replace professional medical diagnosis."
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      error: "Failed to parse AI response",
      rawText: cleanedText
    };
  }
}

// Normalize AI response text before parsing
function cleanAiResponseText(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  // Extract first fenced code block if present
  const fenceMatch = cleaned.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1];
  }

  // Strip leftover fences/backticks
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
  cleaned = cleaned.replace(/```/g, '');

  // Remove trailing commas before closing braces/brackets (global)
  cleaned = cleaned.replace(/,\s*(\]|\})/g, '$1');

  // Keep only content between the first '{' and the last '}' to drop stray text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // Normalize newlines and carriage returns
  cleaned = cleaned.replace(/\r\n?/g, '\n');

  // Remove stray leading/trailing quotes around entire payload
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}

// Helper function to reconstruct JSON from text
function reconstructJsonFromText(text) {
  try {
    const result = {
      parkinsonsDisease: { riskLevel: "unknown", indicators: [], recommendations: [] },
      alzheimersDisease: { riskLevel: "unknown", indicators: [], recommendations: [] },
      epilepsy: { riskLevel: "unknown", indicators: [], recommendations: [] },
      overallAssessment: "",
      disclaimerNote: "This is an automated AI analysis and should not replace professional medical diagnosis."
    };
    
    // Extract Parkinson's section
    const parkinsonsMatch = text.match(/parkinson['s]* disease[^]*?risk[^]*?(low|moderate|high)/i);
    if (parkinsonsMatch) {
      result.parkinsonsDisease.riskLevel = parkinsonsMatch[1].toLowerCase();
      
      // Extract confidence
      const confidenceMatch = text.match(/parkinson['s]* disease[^]*?confidence:?\s*(\d+)/i);
      if (confidenceMatch) {
        result.parkinsonsDisease.confidence = parseInt(confidenceMatch[1]);
      }
    }

    // Extract Alzheimer's Disease section
    const alzheimersMatch = text.match(/alzheimer['s]* disease[^]*?risk[^]*?(low|moderate|high)/i);
    if (alzheimersMatch) {
      result.alzheimersDisease.riskLevel = alzheimersMatch[1].toLowerCase();
      
      // Extract confidence
      const confidenceMatch = text.match(/alzheimer['s]* disease[^]*?confidence:?\s*(\d+)/i);
      if (confidenceMatch) {
        result.alzheimersDisease.confidence = parseInt(confidenceMatch[1]);
      }
    }

    // Extract Epilepsy section
    const epilepsyMatch = text.match(/epilepsy[^]*?risk[^]*?(low|moderate|high)/i);
    if (epilepsyMatch) {
      result.epilepsy.riskLevel = epilepsyMatch[1].toLowerCase();
      
      // Extract confidence
      const confidenceMatch = text.match(/epilepsy[^]*?confidence:?\s*(\d+)/i);
      if (confidenceMatch) {
        result.epilepsy.confidence = parseInt(confidenceMatch[1]);
      }
    }

    // Extract overall assessment
    const overallMatch = text.match(/overall assessment:?\s*([^]*?)(?:disclaimer|$)/i);
    if (overallMatch) {
      result.overallAssessment = overallMatch[1].trim();
    }
    
    // Extract indicators and recommendations using separate function
    result.parkinsonsDisease.indicators = extractBulletPoints(text, "parkinson", "indicator");
    result.parkinsonsDisease.recommendations = extractBulletPoints(text, "parkinson", "recommend");
    result.alzheimersDisease.indicators = extractBulletPoints(text, "alzheimer", "indicator");
    result.alzheimersDisease.recommendations = extractBulletPoints(text, "alzheimer", "recommend");
    result.epilepsy.indicators = extractBulletPoints(text, "epilepsy", "indicator");
    result.epilepsy.recommendations = extractBulletPoints(text, "epilepsy", "recommend");
    
    return result;
  } catch (error) {
    console.error("Error reconstructing JSON:", error);
    return null;
  }
}

// Helper function to extract bullet points
function extractBulletPoints(text, disorderKeyword, type) {
  try {
    const sectionRegex = new RegExp(`${disorderKeyword}[^]*?${type}[^]*?([^]*)(?:recommend|risk|confidence|${disorderKeyword === 'epilepsy' ? 'overall' : 'epilepsy'}|${disorderKeyword === 'alzheimer' ? 'overall' : 'alzheimer'}|${disorderKeyword === 'parkinson' ? 'overall' : 'parkinson'}|$)`, 'i');
    const section = text.match(sectionRegex);
    
    if (section && section[1]) {
      // Extract each bullet point
      const bulletPoints = [];
      const bulletRegex = /(?:-|\*|\d+\.|\•)\s*([^\n]+)/g;
      const bulletText = section[1];
      
      let match;
      while ((match = bulletRegex.exec(bulletText)) !== null) {
        if (match[1] && match[1].trim()) {
          bulletPoints.push(match[1].trim());
        }
      }
      
      // If no bullet points found using markers, try splitting by newlines
      if (bulletPoints.length === 0) {
        return bulletText.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.toLowerCase().includes(type.toLowerCase()) && line.length > 3);
      }
      
      return bulletPoints;
    }
    return [];
  } catch (error) {
    console.log(`Error extracting ${type} for ${disorderKeyword}:`, error);
    return [];
  }
}

// Helper function to extract risk level
function extractRiskLevel(text, disorderKeyword) {
  try {
    const riskMatch = new RegExp(`${disorderKeyword}[^]*?risk[^]*?(low|moderate|high)`, 'i');
    const match = text.match(riskMatch);
    return match ? match[1].toLowerCase() : "unknown";
  } catch (error) {
    return "unknown";
  }
}

// Helper function to extract overall assessment
function extractOverallAssessment(text) {
  try {
    // Look for an overall assessment section
    const overallMatch = text.match(/overall assessment:?\s*([^]*?)(?:disclaimer|$)/i);
    if (overallMatch && overallMatch[1]) {
      return overallMatch[1].trim();
    }
    
    // If no explicit section, look for a summary
    const summaryMatch = text.match(/summary:?\s*([^]*?)(?:disclaimer|$)/i);
    if (summaryMatch && summaryMatch[1]) {
      return summaryMatch[1].trim();
    }
    
    return "Based on the assessment data, no clear overall assessment could be extracted.";
  } catch (error) {
    return "Based on the assessment data, no clear overall assessment could be extracted.";
  }
}
