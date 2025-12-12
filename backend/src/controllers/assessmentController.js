import Assessment from '../models/Assessment.js';
import TremorAssessment from '../models/TremorAssessment.js';
import SpeechPatternAssessment from '../models/SpeechPatternAssessment.js';
import ResponseTimeAssessment from '../models/ResponseTimeAssessment.js';
import NeckMobilityAssessment from '../models/NeckMobilityAssessment.js';
import GaitAnalysisAssessment from '../models/GaitAnalysisAssessment.js';
import FingerTappingAssessment from '../models/FingerTappingAssessment.js';
import FacialSymmetryAssessment from '../models/FacialSymmetryAssessment.js';
import EyeMovementAssessment from '../models/EyeMovementAssessment.js';
import StroopAssessment from '../models/StroopAssessment.js';
import Test from '../models/Test.js';
import Score from '../models/Score.js';
import EpilepsyTest from '../models/EpilepsyTest.js';
import AssessmentSession from '../models/AssessmentSession.js';
import { generateReport } from '../services/reportService.js';
import { getAiPrediction, getAiAnalysisResults, getAiAnalysisFromPdf } from '../services/aiService.js';
import mongoose from 'mongoose';
import pdf from 'pdfkit';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

export const getBaselineData = async (req, res) => {
  try {
    const { type, userId } = req.query;
    
    console.log('Getting baseline data:', { type, userId, authenticatedUser: req.user._id });
    
    if (!type) {
      return res.status(400).json({ message: 'Assessment type is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check if the requested userId matches the authenticated user or if user is admin
    // Update this check to be more permissive during development
    const isAuthorized = 
      req.user._id.toString() === userId || 
      req.user.role === 'admin' ||
      process.env.NODE_ENV === 'development';
    
    if (!isAuthorized) {
      console.log('Unauthorized baseline data access attempt:', {
        requestedId: userId,
        authenticatedId: req.user._id.toString()
      });
      return res.status(403).json({ message: 'You can only access your own assessments' });
    }

    // Find the most recent assessment of this type for the user
    const baseline = await Assessment.findOne({
      userId,
      type,
      status: 'COMPLETED'
    }).sort({ timestamp: -1 });

    if (!baseline) {
      console.log('No baseline data found for', { type, userId });
      // Return 200 with null data instead of 404 to avoid error
      return res.status(200).json({ 
        message: 'No baseline data found', 
        data: null 
      });
    }

    res.json({
      message: 'Baseline data retrieved successfully',
      data: baseline
    });
  } catch (error) {
    console.error('Get baseline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const saveAssessment = async (req, res) => {
  try {
    const { userId, type, data, metrics, status, timestamp } = req.body;

    console.log('Received assessment data:', req.body);

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'type is required'
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'data object is required'
      });
    }

    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'metrics object is required'
      });
    }

    // Create new assessment
    const assessment = new Assessment({
      userId,
      type,
      data,
      metrics,
      status: status || 'COMPLETED',
      timestamp: timestamp || new Date()
    });

    // Save to database
    const savedAssessment = await assessment.save();

    res.status(201).json({
      success: true,
      data: savedAssessment
    });
  } catch (error) {
    console.error('Error saving assessment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};

export const getAssessmentHistory = async (req, res) => {
  try {
    const { userId, type, limit = 10 } = req.query;
    
    console.log('Getting assessment history:', { userId, type, limit });

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId parameter is required'
      });
    }

    const query = { userId };
    if (type) query.type = type;

    // Log the exact query we're using
    console.log('Assessment query:', JSON.stringify(query));
    
    // Find documents and log the exact collection name being used
    console.log('Querying Assessment collection...');
    const collectionStats = await mongoose.connection.db.collection('assessments').stats();
    console.log('Assessment collection stats:', { 
      documentCount: collectionStats.count, 
      avgObjectSize: collectionStats.avgObjSize 
    });

    // Find assessments in Assessment model
    let assessments = await Assessment.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
      
    console.log(`Found ${assessments.length} assessments for user ${userId}`);
    
    // Check both string and ObjectId versions of userId
    if (assessments.length === 0) {
      console.log('Trying alternative query formats...');
      try {
        // Try with ObjectId
        if (mongoose.Types.ObjectId.isValid(userId)) {
          console.log('Trying with ObjectId userId');
          const objectIdQuery = { userId: new mongoose.Types.ObjectId(userId) };
          assessments = await Assessment.find(objectIdQuery)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();
          console.log(`Found ${assessments.length} assessments with ObjectId query`);
        }
      } catch (err) {
        console.error('Error with alternative query:', err);
      }
    }
    
    // If we don't find any in the generic model, try the specific models
    if (assessments.length === 0) {
      console.log('No assessments found in general collection, checking specific collections...');
      const modelMap = {
        'tremor': TremorAssessment,
        'speechPattern': SpeechPatternAssessment,
        'responseTime': ResponseTimeAssessment,
        'neckMobility': NeckMobilityAssessment,
        'gaitAnalysis': GaitAnalysisAssessment,
        'fingerTapping': FingerTappingAssessment,
        'facialSymmetry': FacialSymmetryAssessment,
        'eyeMovement': EyeMovementAssessment,
        'stroop': StroopAssessment,
        'wordlist': Test,
        'word_list': Test,
        'neuro': EpilepsyTest,
        'hyperventilation': EpilepsyTest
      };
      
      // If type is specified, only check that model
      if (type && modelMap[type]) {
        console.log(`Checking ${type} collection...`);
        let results = [];
        
        if (type === 'wordlist' || type === 'word_list') {
          // For Test model, search by userId as string
          let tests = await Test.find({ userId })
            .sort({ startTs: -1, timestamp: -1 })
            .limit(parseInt(limit))
            .lean();
          
          console.log(`[Assessment] Found ${tests.length} wordlist tests for userId: ${userId}`);
          
          // For each test, fetch its scores and aggregate metrics
          results = await Promise.all(tests.map(async (t) => {
            try {
              const scores = await Score.find({ testId: t._id }).lean();
              console.log(`[Assessment] Test ${t._id}: Found ${scores.length} score records`);
              
              const metricsMap = {};
              scores.forEach(s => {
                metricsMap[s.metric] = s.value;
                console.log(`[Assessment] Metric: ${s.metric} = ${s.value}`);
              });
              
              return {
                ...t,
                type: 'wordlist',
                timestamp: t.endTs || t.timestamp || t.startTs,
                status: t.status || 'COMPLETED',
                metrics: metricsMap || {}
              };
            } catch (err) {
              console.error('Error fetching scores for test', t._id, err);
              return {
                ...t,
                type: 'wordlist',
                timestamp: t.endTs || t.timestamp || t.startTs,
                status: t.status || 'COMPLETED',
                metrics: {}
              };
            }
          }));
        } else if (type === 'stroop') {
          // For Stroop, fetch from StroopAssessment with proper metrics
          results = await StroopAssessment.find({ userId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();
          
          results = results.map(r => ({
            ...r,
            type: 'stroop',
            metrics: {
              score: r.score || 0,
              total: r.total || 0,
              accuracy: r.accuracy || 0,
              history: r.history || []
            }
          }));
        } else if (type === 'neuro' || type === 'hyperventilation') {
          // For EpilepsyTest, handle both string and ObjectId userId
          results = await EpilepsyTest.find({ 
            $or: [
              { userId },
              { userId: new mongoose.Types.ObjectId(userId) }
            ]
          })
            .sort({ startedAt: -1 })
            .limit(parseInt(limit))
            .lean()
            .catch(() => []);
          
          results = results.map(r => ({
            ...r,
            type: 'hyperventilation',
            timestamp: r.endedAt || r.startedAt,
            status: r.status || 'completed',
            metrics: {
              baseline_hr: r.summaryMetrics?.baselineHR || 0,
              hv_hr: r.summaryMetrics?.hvHR || 0,
              recovery_hr: r.summaryMetrics?.recoveryHR || 0,
              hv_response: 'Normal'
            }
          }));
        } else {
          // For other models
          results = await modelMap[type].find({ userId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();
          results = results.map(r => ({...r, type}));
        }
        
        assessments = results;
        console.log(`Found ${assessments.length} ${type} assessments`);
      } 
      // Otherwise check all models
      else if (!type) {
        console.log('Checking all specialized collections...');
        const promises = [];
        
        // Map of all model types (excluding stroop which has custom handler below)
        const allModels = {
          'tremor': TremorAssessment,
          'speechPattern': SpeechPatternAssessment,
          'responseTime': ResponseTimeAssessment,
          'neckMobility': NeckMobilityAssessment,
          'gaitAnalysis': GaitAnalysisAssessment,
          'fingerTapping': FingerTappingAssessment,
          'facialSymmetry': FacialSymmetryAssessment,
          'eyeMovement': EyeMovementAssessment
        };
        
        // Collect all promises for standard models
        for (const [modelType, Model] of Object.entries(allModels)) {
          promises.push(
            Model.find({ userId })
              .sort({ timestamp: -1 })
              .limit(parseInt(limit))
              .lean()
              .then(results => {
                console.log(`Found ${results.length} ${modelType} assessments`);
                return results.map(r => ({...r, type: modelType}));
              })
              .catch(err => {
                console.error(`Error fetching ${modelType}:`, err);
                return [];
              })
          );
        }
        
        // Add wordlist (Test model) with Score aggregation
        promises.push(
          Test.find({ userId })
            .sort({ startTs: -1, timestamp: -1 })
            .limit(parseInt(limit))
            .lean()
            .then(async (results) => {
              console.log(`Found ${results.length} wordlist assessments`);
              // For each test, fetch its scores
              const testWithScores = await Promise.all(results.map(async (r) => {
                try {
                  const scores = await Score.find({ testId: r._id }).lean();
                  console.log(`[Bulk] Test ${r._id}: Found ${scores.length} score records`);
                  
                  const metricsMap = {};
                  scores.forEach(s => {
                    metricsMap[s.metric] = s.value;
                    console.log(`[Bulk] Metric: ${s.metric} = ${s.value}`);
                  });
                  
                  const result = {
                    ...r,
                    type: 'wordlist',
                    timestamp: r.endTs || r.timestamp || r.startTs,
                    status: r.status || 'COMPLETED',
                    metrics: metricsMap
                  };
                  console.log(`[Bulk] Returning wordlist with metrics:`, JSON.stringify(metricsMap));
                  return result;
                } catch (err) {
                  console.error('Error fetching scores for test', r._id, err);
                  return {
                    ...r,
                    type: 'wordlist',
                    timestamp: r.endTs || r.timestamp || r.startTs,
                    status: r.status || 'COMPLETED',
                    metrics: {}
                  };
                }
              }));
              return testWithScores;
            })
            .catch(err => {
              console.error('Error fetching wordlist:', err);
              return [];
            })
        );
        
        // Add Stroop assessments
        promises.push(
          StroopAssessment.find({ userId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean()
            .then(results => {
              console.log(`Found ${results.length} stroop assessments`);
              return results.map(r => {
                const metrics = {
                  score: r.score || 0,
                  total: r.total || 0,
                  accuracy: r.accuracy || 0,
                  history: r.history || []
                };
                console.log(`[Stroop] Metrics:`, JSON.stringify(metrics));
                return {
                  ...r,
                  type: 'stroop',
                  metrics: metrics
                };
              });
            })
            .catch(err => {
              console.error('Error fetching stroop:', err);
              return [];
            })
        );
        
        // Add neuro/hyperventilation (EpilepsyTest model)
        promises.push(
          EpilepsyTest.find({ 
            $or: [
              { userId },
              { userId: new mongoose.Types.ObjectId(userId).toString ? new mongoose.Types.ObjectId(userId) : userId }
            ]
          })
            .sort({ startedAt: -1 })
            .limit(parseInt(limit))
            .lean()
            .then(results => {
              console.log(`Found ${results.length} hyperventilation assessments`);
              return results.map(r => {
                const metrics = {
                  baseline_hr: r.summaryMetrics?.baselineHR || 0,
                  hv_hr: r.summaryMetrics?.hvHR || 0,
                  recovery_hr: r.summaryMetrics?.recoveryHR || 0,
                  hv_response: 'Normal'
                };
                console.log(`[Hyperventilation] Metrics:`, JSON.stringify(metrics));
                return {
                  ...r,
                  type: 'hyperventilation',
                  timestamp: r.endedAt || r.startedAt,
                  status: r.status || 'completed',
                  metrics: metrics
                };
              });
            })
            .catch(err => {
              console.error('Error fetching hyperventilation:', err);
              return [];
            })
        );
        
        // Wait for all queries to complete
        const results = await Promise.all(promises);
        
        // Combine results, flatten array, and sort by timestamp
        assessments = results
          .flat()
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, parseInt(limit));
          
        console.log(`Found ${assessments.length} total assessments across all collections`);
      }
    }
    
    // For debugging - if no real data found, return an empty array instead of mock data
    if (assessments.length === 0) {
      console.log('No assessments found, returning empty array');
      assessments = [];
    }

    // Log what we're actually sending back
    console.log(`[Assessment] Returning ${assessments.length} assessments to frontend`);
    assessments.forEach((a, idx) => {
      console.log(`[Assessment ${idx}] Type: ${a.type}, Has metrics: ${!!a.metrics}, Metrics keys:`, Object.keys(a.metrics || {}));
    });

    res.json({
      success: true,
      data: assessments
    });
  } catch (error) {
    console.error('Error getting assessment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment history',
      error: error.message
    });
  }
};

export const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findOneAndDelete({
      _id: id,
      user: req.user.userId
    });

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete assessment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all assessments for a user
export const getAllAssessments = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure we have a userId to query with
    if (!userId) {
      return res.status(400).json({ 
        message: 'User ID parameter is required',
        success: false
      });
    }
    
    // Check authorization with safer comparison and more permissive dev environment check
    const requestedUserId = userId.toString();
    const authenticatedUserId = req.user?._id?.toString();
    const isDevEnv = process.env.NODE_ENV === 'development';
    const isAuthorized = isDevEnv || requestedUserId === authenticatedUserId || req.user?.role === 'admin';
    
    if (!isAuthorized) {
      console.log('User ID mismatch:', { requestedId: requestedUserId, authenticatedId: authenticatedUserId });
      return res.status(403).json({ message: 'You can only access your own assessments' });
    }
    
    console.log('Fetching assessments for user:', userId);
    
    // First try the main Assessment collection
    let assessments = await Assessment.find({ userId }).sort({ timestamp: -1 }).lean();
    console.log(`Found ${assessments.length} assessments in main collection for user ${userId}`);
    
    // If no assessments found, try specialized collections
    if (assessments.length === 0) {
      console.log('No assessments found in main collection, checking specialized collections...');
      
      const modelMap = {
        'tremor': TremorAssessment,
        'speechPattern': SpeechPatternAssessment,
        'responseTime': ResponseTimeAssessment,
        'neckMobility': NeckMobilityAssessment,
        'gaitAnalysis': GaitAnalysisAssessment,
        'fingerTapping': FingerTappingAssessment,
        'facialSymmetry': FacialSymmetryAssessment,
        'eyeMovement': EyeMovementAssessment
      };
      
      // Query all specialized collections
      const promises = Object.entries(modelMap).map(async ([type, Model]) => {
        const results = await Model.find({ userId }).sort({ timestamp: -1 }).lean();
        // Add type if missing
        return results.map(result => ({
          ...result,
          type: result.type || type
        }));
      });
      
      // Wait for all queries to complete
      const specializedResults = await Promise.all(promises);
      
      // Combine and flatten results
      assessments = specializedResults.flat();
      
      console.log(`Found ${assessments.length} total assessments in specialized collections`);
    }
    
    // Format the response with consistent success field
    res.status(200).json({
      success: true,
      data: assessments
    });
  } catch (error) {
    console.error('Failed to fetch assessments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch assessments', 
      error: error.message 
    });
  }
};

// Get assessments by type for a user
export const getAssessmentsByType = async (req, res) => {
  try {
    const { userId, type } = req.params;
    const modelMap = {
      tremor: TremorAssessment,
      speechPattern: SpeechPatternAssessment,
      responseTime: ResponseTimeAssessment,
      neckMobility: NeckMobilityAssessment,
      gaitAnalysis: GaitAnalysisAssessment,
      fingerTapping: FingerTappingAssessment,
      facialSymmetry: FacialSymmetryAssessment,
      eyeMovement: EyeMovementAssessment
    };
    const AssessmentModel = modelMap[type];
    if (!AssessmentModel) {
      return res.status(400).json({ message: 'Invalid assessment type' });
    }
    const assessments = await AssessmentModel.find({ userId });
    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch assessments by type', error });
  }
};

// Generate PDF report
export const generatePdfReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { assessmentTypes } = req.query; // optional query param to filter by assessment types
    
    console.log('PDF Report request received:', {
      userId,
      assessmentTypes,
      url: req.url,
      method: req.method,
      path: req.path
    });
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Parse assessment types if provided and validate them
    let typesArray = null;
    try {
      if (assessmentTypes) {
        console.log('Assessment types provided:', assessmentTypes);
        typesArray = assessmentTypes.split(',').filter(type => type.trim() !== '');
        console.log('Parsed types array:', typesArray);
      }
    } catch (err) {
      console.error('Error parsing assessment types:', err);
      typesArray = null;
    }
    
    // Initialize assessmentData as an empty object
    let assessmentData = {};
    
    try {
      // Get assessments from database based on type filter
      if (typesArray && Array.isArray(typesArray) && typesArray.length > 0) {
        console.log('Fetching specific assessment types:', typesArray);
        
        // Create an array of promises to fetch data for each type
        const fetchPromises = typesArray.map(async (type) => {
          try {
            // Try to normalize the type name to match database
            const normalizedType = type.trim().toUpperCase();
            console.log(`Fetching assessments of type: ${normalizedType}`);
            
            // Query the database for this specific type
            const typeData = await Assessment.find({ 
              userId, 
              type: normalizedType,
              status: 'COMPLETED'
            }).sort({ timestamp: -1 }).limit(3).lean();
            
            console.log(`Found ${typeData.length} assessments for type ${normalizedType}`);
            
            // If we found data, add it to the results
            if (typeData && typeData.length > 0) {
              assessmentData[normalizedType] = typeData;
            }
            
            return { type: normalizedType, data: typeData };
          } catch (err) {
            console.error(`Error fetching data for type ${type}:`, err);
            return { type, error: err.message };
          }
        });
        
        // Wait for all queries to complete
        const results = await Promise.all(fetchPromises);
        console.log('Assessment fetch results:', results.map(r => `${r.type}: ${r.data?.length || 0} records`));
      } else {
        console.log('No specific types requested, fetching all assessment types');
        
        // If no specific types are requested, fetch all assessments
        const allAssessments = await Assessment.find({ 
          userId,
          status: 'COMPLETED'
        }).sort({ timestamp: -1 }).lean();
        
        console.log(`Found ${allAssessments.length} total assessments`);
        
        // Group by type
        if (Array.isArray(allAssessments)) {
          allAssessments.forEach(assessment => {
            if (assessment && assessment.type) {
              if (!assessmentData[assessment.type]) {
                assessmentData[assessment.type] = [];
              }
              assessmentData[assessment.type].push(assessment);
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching assessments:', err);
      // Ensure assessmentData is still an object
      assessmentData = {};
    }
    
    // Make absolutely sure assessmentData is an object
    if (typeof assessmentData !== 'object' || assessmentData === null) {
      console.log('assessmentData is not an object, resetting to empty object');
      assessmentData = {};
    }
    
    // Now check if we have any assessment types (safe to call Object.keys now)
    console.log('Assessment data type:', typeof assessmentData);
    console.log('Assessment data is null?', assessmentData === null);
    
    // This should now be safe
    let typeKeys = [];
    try {
      typeKeys = Object.keys(assessmentData);
      console.log('Found assessment types:', typeKeys);
    } catch (err) {
      console.error('Error getting assessment type keys:', err);
      typeKeys = [];
    }
    
    if (typeKeys.length === 0) {
      console.log('No assessment data found');
      // Return a 404 response
      return res.status(404).json({ 
        message: 'No assessment data found for this user',
        error: 'No data available to generate report'
      });
    }
    
    // Generate the PDF
    try {
      const pdfBuffer = await generateReport({
        userId,
        assessmentData
      });
      
      console.log('PDF generated successfully, sending response');
      
      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="assessment-report-${userId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating PDF:', err);
      return res.status(500).json({ 
        message: 'Failed to generate PDF report',
        error: err.message
      });
    }
  } catch (error) {
    console.error('Error in generatePdfReport:', error);
    res.status(500).json({ message: 'Error generating PDF report', error: error.message });
  }
};

// Get AI analysis
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

export const getAiAnalysis = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Processing AI analysis request for user ID: ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ 
        message: 'User ID is required for AI analysis'
      });
    }
    
    // First check the main Assessment collection
    console.log('Fetching assessments from main collection');
    const assessments = await Assessment.find({ 
      userId: userId,
      status: 'COMPLETED'
    }).sort({ timestamp: -1 }).lean();
    
    console.log(`Found ${assessments.length} assessments in main collection`);
    
    // Collect assessments from specialized collections if needed
    if (assessments.length < 5) { // If we don't have enough data in the main collection
      console.log('Fetching additional assessments from specialized collections');
      
      // Collect all promises for fetching from specialized collections (including wordlist/stroop/hyperventilation)
      const fetchPromises = [];

      const simpleModels = {
        'TREMOR': TremorAssessment,
        'SPEECH_PATTERN': SpeechPatternAssessment,
        'RESPONSE_TIME': ResponseTimeAssessment,
        'FACIAL_SYMMETRY': FacialSymmetryAssessment,
        'FINGER_TAPPING': FingerTappingAssessment,
        'EYE_MOVEMENT': EyeMovementAssessment,
        'GAIT_ANALYSIS': GaitAnalysisAssessment,
        'NECK_MOBILITY': NeckMobilityAssessment
      };

      // Standard collections
      for (const [type, Model] of Object.entries(simpleModels)) {
        fetchPromises.push(
          Model.find({ userId: userId, status: 'COMPLETED' })
            .sort({ timestamp: -1 })
            .lean()
            .then(data => data.map(record => ({ ...record, type })))
            .catch(err => {
              console.error(`Error fetching ${type}:`, err);
              return [];
            })
        );
      }

      // Wordlist (Test + Score)
      fetchPromises.push(
        Test.find({ userId: userId })
          .sort({ startTs: -1, timestamp: -1 })
          .lean()
          .then(async tests => {
            const enriched = await Promise.all(tests.map(async t => {
              try {
                const scores = await Score.find({ testId: t._id }).lean();
                const metricsMap = {};
                scores.forEach(s => { metricsMap[s.metric] = s.value; });
                return {
                  ...t,
                  type: 'WORD_LIST',
                  timestamp: t.endTs || t.timestamp || t.startTs,
                  status: t.status || 'COMPLETED',
                  metrics: metricsMap
                };
              } catch (err) {
                console.error('Error enriching wordlist scores', err);
                return {
                  ...t,
                  type: 'WORD_LIST',
                  timestamp: t.endTs || t.timestamp || t.startTs,
                  status: t.status || 'COMPLETED',
                  metrics: {}
                };
              }
            }));
            return enriched;
          })
          .catch(err => {
            console.error('Error fetching wordlist:', err);
            return [];
          })
      );

      // Stroop
      fetchPromises.push(
        StroopAssessment.find({ userId: userId })
          .sort({ timestamp: -1 })
          .lean()
          .then(results => results.map(r => ({
            ...r,
            type: 'STROOP',
            metrics: {
              score: r.score || 0,
              total: r.total || 0,
              accuracy: r.accuracy || 0,
              history: r.history || []
            }
          })))
          .catch(err => {
            console.error('Error fetching stroop:', err);
            return [];
          })
      );

      // Hyperventilation / Neuro (EpilepsyTest)
      fetchPromises.push(
        EpilepsyTest.find({ 
          $or: [
            { userId: userId },
            { userId: new mongoose.Types.ObjectId(userId) }
          ]
        })
          .sort({ startedAt: -1 })
          .lean()
          .then(results => results.map(r => ({
            ...r,
            type: r.testType === 'neuro' ? 'NEURO' : 'HYPERVENTILATION',
            timestamp: r.endedAt || r.startedAt,
            status: r.status || 'completed',
            metrics: {
              baseline_hr: r.summaryMetrics?.baselineHR || 0,
              hv_hr: r.summaryMetrics?.hvHR || 0,
              recovery_hr: r.summaryMetrics?.recoveryHR || 0,
              hv_response: 'Normal'
            }
          })))
          .catch(err => {
            console.error('Error fetching hyperventilation/neuro:', err);
            return [];
          })
      );

      // Wait for all queries to complete
      const specializedResults = await Promise.all(fetchPromises);
      
      // Combine results from specialized collections
      const additionalAssessments = specializedResults.flat();
      console.log(`Found ${additionalAssessments.length} assessments in specialized collections`);
      
      // Combine with main collection assessments, avoiding duplicates by ID
      const existingIds = new Set(assessments.map(a => a._id.toString()));
      const uniqueAdditional = additionalAssessments.filter(a => !existingIds.has(a._id.toString()));
      
      // Combine all assessments
      const allAssessments = [...assessments, ...uniqueAdditional];
      console.log(`Combined total: ${allAssessments.length} assessments`);
      
      if (allAssessments.length === 0) {
        return res.status(404).json({
          message: 'No assessment data found for this user',
          error: 'No data available for AI analysis'
        });
      }
      
      // Debug log the assessment types we found
      const typesFound = {};
      allAssessments.forEach(a => {
        typesFound[a.type] = (typesFound[a.type] || 0) + 1;
      });
      console.log('Assessment types found:', typesFound);
      
      // Get AI analysis from the service
      console.log('Sending assessments to AI analysis service');
      const aiResults = await getAiAnalysisResults(allAssessments);
      
      console.log('AI analysis completed successfully');
      return res.status(200).json(aiResults);
    } else {
      // If we have enough data in the main collection
      if (assessments.length === 0) {
        return res.status(404).json({
          message: 'No assessment data found for this user',
          error: 'No data available for AI analysis'
        });
      }
      
      console.log('Using assessments from main collection for AI analysis');
      const aiResults = await getAiAnalysisResults(assessments);
      
      console.log('AI analysis completed successfully');
      return res.status(200).json(aiResults);
    }
  } catch (error) {
    console.error('Failed to perform AI analysis:', error);
    res.status(500).json({ 
      message: 'Failed to perform AI analysis', 
      error: error.message 
    });
  }
};

// Add a new assessment
export const addAssessment = async (req, res) => {
  try {
    const { type, userId } = req.body;
    
    if (!type) {
      return res.status(400).json({ message: 'Assessment type is required' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // For development/test purposes only: Allow creating assessments for any user
    // In production, we'd want to ensure the user can only create assessments for themselves
    const isDevEnv = process.env.NODE_ENV === 'development';
    const isAuthorized = isDevEnv || userId === req.user._id.toString();
    
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You can only create assessments for your own user account' });
    }
    
    console.log(`Creating new ${type} assessment for user ${userId}`);
    
    let assessment;
    const assessmentData = {
      ...req.body,
      status: 'COMPLETED',
      timestamp: req.body.timestamp || new Date()
    };
    
    switch (type) {
      case 'tremor':
        assessment = new TremorAssessment(assessmentData);
        break;
      case 'speechPattern':
        assessment = new SpeechPatternAssessment(assessmentData);
        break;
      case 'responseTime':
        assessment = new ResponseTimeAssessment(assessmentData);
        break;
      case 'neckMobility':
        assessment = new NeckMobilityAssessment(assessmentData);
        break;
      case 'gaitAnalysis':
        assessment = new GaitAnalysisAssessment(assessmentData);
        break;
      case 'fingerTapping':
        assessment = new FingerTappingAssessment(assessmentData);
        break;
      case 'facialSymmetry':
        assessment = new FacialSymmetryAssessment(assessmentData);
        break;
      case 'eyeMovement':
        assessment = new EyeMovementAssessment(assessmentData);
        break;
      default:
        // Also add to the generic Assessment model
        assessment = new Assessment({
          userId,
          type,
          data: req.body.metrics || {},
          metrics: req.body.metrics || {},
          status: 'COMPLETED',
          timestamp: req.body.timestamp || new Date()
        });
        break;
    }
    
    const savedAssessment = await assessment.save();
    console.log(`Successfully created ${type} assessment with ID: ${savedAssessment._id}`);
    
    res.status(201).json(savedAssessment);
  } catch (error) {
    console.error('Error adding assessment:', error);
    res.status(500).json({ message: 'Error adding assessment', error: error.message });
  }
};