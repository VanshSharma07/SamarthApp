import GaitAnalysisAssessment from '../models/GaitAnalysisAssessment.js';

export const gaitAnalysisService = {
  async saveAssessment(assessmentData) {
    try {
      if (!assessmentData.userId || !assessmentData.metrics) {
        throw new Error('Missing required fields');
      }

      // Ensure all required metrics are present
      const metrics = assessmentData.metrics;
      
      // Calculate overall scores if they're not already provided
      if (!metrics.overall) {
        metrics.overall = {
          mobilityScore: calculateMobilityScore(metrics),
          stabilityScore: calculateStabilityScore(metrics),
          symmetryScore: calculateSymmetryScore(metrics)
        };
      }
      
      // Validate numeric values to prevent NaN errors
      validateNumericValues(metrics);

      const assessment = new GaitAnalysisAssessment({
        userId: assessmentData.userId,
        timestamp: assessmentData.timestamp || new Date(),
        type: assessmentData.type || 'gaitAnalysis',
        metrics: metrics
      });

      const saved = await assessment.save();
      
      if (!saved) {
        throw new Error('Failed to save gait analysis assessment');
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
      console.error('Error in gaitAnalysisService.saveAssessment:', error);
      throw error;
    }
  },

  async getHistory(userId, limit = 10) {
    try {
      return await GaitAnalysisAssessment.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error getting gait analysis history:', error);
      throw error;
    }
  },

  async getBaseline(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const baseline = await GaitAnalysisAssessment.findOne({ 
        userId,
        status: 'COMPLETED'
      })
      .sort({ timestamp: -1 })
      .lean();

      return baseline;
    } catch (error) {
      console.error('Error getting gait analysis baseline:', error);
      throw error;
    }
  }
};

// Helper functions
function calculateMobilityScore(metrics) {
  if (!metrics.gait) return 0;
  
  // Normalize speed to a 0-100 scale
  // Normal walking speed is around 1.3 m/s
  let normalizedSpeed = 0;
  if (typeof metrics.gait.speed === 'number' && !isNaN(metrics.gait.speed)) {
    normalizedSpeed = Math.min(100, (metrics.gait.speed / 1.3) * 100);
  }
  
  // Normalize stride length (normal is about 0.7m)
  let normalizedStride = 0;
  if (typeof metrics.gait.strideLength === 'number' && !isNaN(metrics.gait.strideLength)) {
    normalizedStride = Math.min(100, (metrics.gait.strideLength / 0.7) * 100);
  }
  
  // Combine metrics with weights
  return normalizedSpeed * 0.6 + normalizedStride * 0.4;
}

function calculateStabilityScore(metrics) {
  if (!metrics.stability || !metrics.balance) return 0;
  
  // Get stability score, defaulting to 0 if invalid
  const stabilityScore = (typeof metrics.stability.score === 'number' && !isNaN(metrics.stability.score)) 
    ? metrics.stability.score 
    : 0;
  
  // Get balance score, defaulting to 0 if invalid
  const balanceScore = (typeof metrics.balance.score === 'number' && !isNaN(metrics.balance.score))
    ? metrics.balance.score
    : 0;
    
  // Weight stability and balance metrics
  return stabilityScore * 0.7 + balanceScore * 0.3;
}

function calculateSymmetryScore(metrics) {
  if (!metrics.symmetry) return 0;
  
  // Use overall symmetry if available and valid
  if (typeof metrics.symmetry.overall === 'number' && !isNaN(metrics.symmetry.overall)) {
    return metrics.symmetry.overall;
  }
  
  // Otherwise calculate from components, ensuring valid numbers
  const legSymmetry = (typeof metrics.symmetry.legSymmetry === 'number' && !isNaN(metrics.symmetry.legSymmetry)) 
    ? metrics.symmetry.legSymmetry 
    : 0;
    
  const armSymmetry = (typeof metrics.symmetry.armSymmetry === 'number' && !isNaN(metrics.symmetry.armSymmetry))
    ? metrics.symmetry.armSymmetry
    : 0;
  
  return (legSymmetry * 0.7 + armSymmetry * 0.3);
}

// Helper to validate all numeric values in the metrics object
function validateNumericValues(obj, path = '') {
  if (!obj) return;
  
  for (const key in obj) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'number') {
      if (isNaN(value)) {
        console.warn(`NaN value detected at ${currentPath}, replacing with 0`);
        obj[key] = 0;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively check nested objects
      validateNumericValues(value, currentPath);
    }
  }
}

// New functions to compute basic gait metrics from raw sensor data
export function computeBasicGaitMetrics(sensorData) {
  const metrics = {
    gait: {},
    stability: {},
    balance: {},
    symmetry: {}
  };

  // Compute gait metrics
  if (sensorData.accelerometer && sensorData.gyroscope) {
    const { accelerometer, gyroscope } = sensorData;
    
    // Example calculations, these should be replaced with real algorithms
    metrics.gait.speed = Math.sqrt( Math.pow(accelerometer.x, 2) + Math.pow(accelerometer.y, 2) + Math.pow(accelerometer.z, 2) );
    metrics.gait.strideLength = Math.abs(gyroscope.y) * 0.5; // Just an example, not accurate
  }

  // Compute stability and balance metrics
  if (sensorData.gyroscope) {
    const { gyroscope } = sensorData;
    
    metrics.stability.score = Math.abs(gyroscope.x) + Math.abs(gyroscope.z);
    metrics.balance.score = Math.abs(gyroscope.y);
  }

  // Compute symmetry metrics
  if (sensorData.leftLegData && sensorData.rightLegData) {
    const { leftLegData, rightLegData } = sensorData;
    
    metrics.symmetry.legSymmetry = 100 - Math.abs(leftLegData.speed - rightLegData.speed) * 10;
    metrics.symmetry.armSymmetry = 100 - Math.abs(leftLegData.swingAngle - rightLegData.swingAngle) * 10;
  }

  return metrics;
}
