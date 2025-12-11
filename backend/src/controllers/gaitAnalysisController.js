import { gaitAnalysisService } from '../services/gaitAnalysisService.js';
import WebSocket from 'ws';

export const gaitAnalysisController = {
  async save(req, res) {
    try {
      console.log('Received gait analysis assessment request:', {
        path: req.path,
        method: req.method,
        userId: req.body.userId
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

      const result = await gaitAnalysisService.saveAssessment(assessmentData);

      console.log('Gait analysis assessment saved successfully:', {
        id: result.data._id,
        userId: assessmentData.userId
      });

      // Return the saved data with ID
      res.status(201).json({
        success: true,
        data: {
          ...assessmentData,
          id: result.data._id,
          savedAt: result.data.createdAt
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
