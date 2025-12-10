import { assessmentService } from './assessmentService.js';

/**
 * Service for managing hyperventilation test data and integration with assessments
 */
export const hyperventilationService = {
  /**
   * Save hyperventilation test results to assessment reports
   */
  async saveTestToAssessments(userId, testId, summary) {
    try {
      const assessmentData = {
        userId,
        type: 'HYPERVENTILATION_TEST',
        data: {
          testId,
          phases: summary.phaseAnalysis,
          clinicalIndicators: summary.clinicalIndicators,
          epilepsyScreening: summary.epilepsyScreening
        },
        metrics: {
          riskLevel: summary.epilepsyScreening.riskLevel,
          screeningFlag: summary.epilepsyScreening.screeningFlag,
          recommendedAction: summary.epilepsyScreening.recommendedAction,
          baselineSpikes: summary.phaseAnalysis.baseline?.abnormalities?.spikeCount || 0,
          hyperventilationSpikes: summary.phaseAnalysis.hyperventilation?.abnormalities?.spikeCount || 0,
          recoverySpikes: summary.phaseAnalysis.recovery?.abnormalities?.spikeCount || 0,
          alphaSuppression: (summary.phaseAnalysis.baseline?.bandPowers?.alpha || 0) - (summary.phaseAnalysis.hyperventilation?.bandPowers?.alpha || 0),
          deltaIncrease: (summary.phaseAnalysis.hyperventilation?.bandPowers?.delta || 0) - (summary.phaseAnalysis.baseline?.bandPowers?.delta || 0)
        },
        status: 'COMPLETED'
      };

      // Save using the existing assessment service
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(assessmentData)
      });

      if (!response.ok) {
        throw new Error('Failed to save assessment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving hyperventilation test to assessments:', error);
      throw error;
    }
  },

  /**
   * Retrieve hyperventilation test results from assessments
   */
  async getTestResults(userId) {
    try {
      const response = await fetch(`/api/assessments/${userId}/HYPERVENTILATION_TEST`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve assessment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error retrieving hyperventilation test results:', error);
      throw error;
    }
  },

  /**
   * Get test summary for display in reports
   */
  formatTestSummary(test) {
    return {
      timestamp: test.timestamp,
      riskLevel: test.metrics.riskLevel,
      screeningFlag: test.metrics.screeningFlag,
      recommendedAction: test.metrics.recommendedAction,
      findings: {
        baselineSpikes: test.metrics.baselineSpikes,
        hyperventilationSpikes: test.metrics.hyperventilationSpikes,
        recoverySpikes: test.metrics.recoverySpikes,
        alphaSuppression: `${test.metrics.alphaSuppression}%`,
        deltaIncrease: `${test.metrics.deltaIncrease}%`
      }
    };
  }
};

export default hyperventilationService;
