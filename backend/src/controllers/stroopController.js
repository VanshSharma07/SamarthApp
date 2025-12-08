import { stroopService } from '../services/stroopService.js';

export const stroopController = {
  async save(req, res) {
    try {
      console.log('Received stroop assessment request:', {
        path: req.path,
        method: req.method,
        userId: req.body.userId
      });

      const assessmentData = req.body;

      if (!assessmentData.userId) {
        return res.status(400).json({ success: false, error: 'Missing required field: userId' });
      }

      const result = await stroopService.saveAssessment(assessmentData);

      console.log('Stroop assessment saved successfully:', { id: result.data._id, userId: assessmentData.userId });

      res.status(201).json({
        success: true,
        data: {
          ...assessmentData,
          id: result.data._id,
          savedAt: result.data.createdAt
        }
      });
    } catch (error) {
      console.error('Save stroop assessment error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getHistory(req, res) {
    try {
      const { userId, limit } = req.query;
      const history = await stroopService.getHistory(userId, limit);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getBaseline(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

      const baseline = await stroopService.getBaseline(userId);
      if (!baseline) return res.status(404).json({ success: false, message: 'No baseline data found' });

      res.json({ success: true, data: baseline });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
