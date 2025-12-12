import { gaitAnalysisService } from '../services/gaitAnalysisService.js';
import { sensorMetricsService } from '../services/sensorMetricsService.js';
import { hybridMetricsMerger } from '../services/hybridMetricsMerger.js';
import WebSocket from 'ws';

export const gaitAnalysisController = {
  async save(req, res) {
    try {
      console.log('Received gait analysis assessment request:', {
        path: req.path,
        method: req.method,
        userId: req.body.userId,
        hasSensorData: !!req.body.sensorBuffer
      });

      const assessmentData = req.body;
      
      // Validate required fields
      if (!assessmentData.userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: userId'
        });
      }

      if (!assessmentData.metrics) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: metrics'
        });
      }

      // Process sensor data if provided
      let hybridMetrics = assessmentData.metrics;
      if (assessmentData.sensorBuffer && Array.isArray(assessmentData.sensorBuffer)) {
        console.log('🔬 Processing sensor buffer with', assessmentData.sensorBuffer.length, 'samples');
        console.log('📊 First 3 samples:', JSON.stringify(assessmentData.sensorBuffer.slice(0, 3)));
        
        try {
          // Extract sensor metrics from raw buffer
          const sensorMetrics = sensorMetricsService.processSensorBuffer(assessmentData.sensorBuffer);
          
          console.log('✅ Sensor metrics computed:', {
            fsrMetrics: sensorMetrics.fsr ? Object.keys(sensorMetrics.fsr) : 'missing',
            imuMetrics: sensorMetrics.imu ? Object.keys(sensorMetrics.imu) : 'missing',
            gaitTiming: sensorMetrics.gaitTiming ? Object.keys(sensorMetrics.gaitTiming) : 'missing',
            abnormalities: sensorMetrics.abnormalities?.length || 0
          });

          // Merge CV metrics with sensor metrics
          const merged = hybridMetricsMerger.mergeMetrics(
            assessmentData.metrics,
            sensorMetrics
          );

          // Log abnormalities and recommendations for verification
          console.log('🚨 Abnormalities detected:', merged.abnormalities?.length || 0, 'flags');
          console.log('💊 Recommendations generated:', merged.recommendations?.length || 0, 'recommendations');
          
          if (merged.abnormalities?.length > 0) {
            console.log('📌 Abnormalities sample:', JSON.stringify(merged.abnormalities[0]));
          }
          if (merged.recommendations?.length > 0) {
            console.log('📋 Recommendations sample:', JSON.stringify(merged.recommendations[0]));
          }

          // Add sensor and hybrid metrics to assessment
          hybridMetrics = {
            ...assessmentData.metrics,
            sensorMetrics: sensorMetrics,
            hybrid: merged.hybrid,
            insights: merged.insights,
            abnormalities: merged.abnormalities,
            summary: merged.summary,
            recommendations: merged.recommendations,
            hybridEnabled: true
          };

          console.log('✅ Hybrid metrics created successfully');
        } catch (sensorError) {
          console.error('⚠️ Error processing sensor data:', sensorError.message);
          console.error('Stack trace:', sensorError.stack);
          // Continue with CV metrics only if sensor processing fails
          hybridMetrics = {
            ...assessmentData.metrics,
            sensorProcessingError: sensorError.message,
            hybridEnabled: false
          };
        }
      } else {
        console.warn('⚠️ No sensor buffer provided or empty');
        console.warn('   sensorBuffer exists:', !!assessmentData.sensorBuffer);
        console.warn('   isArray:', Array.isArray(assessmentData.sensorBuffer));
        if (assessmentData.sensorBuffer) {
          console.warn('   buffer length:', assessmentData.sensorBuffer.length);
        }
      }

      // Save assessment with computed metrics
      const saveData = {
        ...assessmentData,
        metrics: hybridMetrics
      };

      const result = await gaitAnalysisService.saveAssessment(saveData);

      console.log('Gait analysis assessment saved successfully:', {
        id: result.data._id,
        userId: assessmentData.userId,
        hybridMetricsComputed: !!assessmentData.sensorBuffer
      });

      // Return the saved data with ID
      res.status(201).json({
        success: true,
        data: {
          ...assessmentData,
          metrics: hybridMetrics,
          id: result.data._id,
          savedAt: result.data.createdAt,
          hybridEnabled: !!assessmentData.sensorBuffer
        }
      });

    } catch (error) {
      console.error('Save gait analysis assessment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getHistory(req, res) {
    try {
      const { userId, limit } = req.query;
      const history = await gaitAnalysisService.getHistory(userId, limit);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getBaseline(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const baseline = await gaitAnalysisService.getBaseline(userId);
      
      if (!baseline) {
        return res.status(404).json({
          success: false,
          message: 'No baseline data found'
        });
      }

      res.json({
        success: true,
        data: baseline
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  initWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
      console.log('New WebSocket connection established');

      ws.on('message', async (message) => {
        console.log('Received message from client:', message);

        try {
          const sensorData = JSON.parse(message);

          // Here you can process the sensor data as needed
          console.log('Processed sensor data:', sensorData);

          // For example, save the sensor data to the database
          // await gaitAnalysisService.saveSensorData(sensorData);

          // Send a response back to the client
          ws.send(JSON.stringify({ success: true, receivedData: sensorData }));
        } catch (error) {
          console.error('Error processing message:', error);
          ws.send(JSON.stringify({ success: false, error: 'Invalid data format' }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });

    console.log('WebSocket server initialized');
  }
};
