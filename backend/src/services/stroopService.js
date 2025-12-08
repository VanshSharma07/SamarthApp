import StroopAssessment from '../models/StroopAssessment.js';

export const stroopService = {
  async saveAssessment(assessmentData) {
    try {
      if (!assessmentData.userId) {
        throw new Error('Missing required field: userId');
      }

      // Ensure history is an array
      const history = Array.isArray(assessmentData.history) ? assessmentData.history : (assessmentData.history ? [assessmentData.history] : []);

      // Compute basic metrics if not provided
      const total = assessmentData.total || history.length || 0;
      const score = typeof assessmentData.score === 'number' ? assessmentData.score : history.reduce((acc, h) => acc + (h.correct ? 1 : 0), 0);
      const accuracy = total > 0 ? (score / total) : (assessmentData.accuracy || 0);

      const assessment = new StroopAssessment({
        userId: assessmentData.userId,
        timestamp: assessmentData.timestamp || new Date(),
        type: assessmentData.type || 'stroop',
        status: assessmentData.status || 'COMPLETED',
        score,
        total,
        accuracy,
        history,
        rawData: assessmentData.rawData || {}
      });

      const saved = await assessment.save();
      if (!saved) {
        throw new Error('Failed to save stroop assessment');
      }

      return {
        success: true,
        data: {
          _id: saved._id,
          id: saved._id,
          ...saved.toObject()
        }
      };
    } catch (error) {
      console.error('Error in stroopService.saveAssessment:', error);
      throw error;
    }
  },

  async getHistory(userId, limit = 10) {
    try {
      return await StroopAssessment.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error getting stroop history:', error);
      throw error;
    }
  },

  async getBaseline(userId) {
    try {
      if (!userId) throw new Error('User ID is required');

      const baseline = await StroopAssessment.findOne({
        userId,
        status: 'COMPLETED'
      })
      .sort({ timestamp: -1 })
      .lean();

      return baseline;
    } catch (error) {
      console.error('Error getting stroop baseline:', error);
      throw error;
    }
  }
};
