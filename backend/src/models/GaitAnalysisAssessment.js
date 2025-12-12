import mongoose from 'mongoose';

const gaitAnalysisSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    default: 'gaitAnalysis'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS'],
    default: 'COMPLETED'
  },
  metrics: {
    stability: {
      score: Number,
      lateralSway: Number,
      verticalSway: Number
    },
    balance: {
      score: Number,
      leftRightDistribution: Number
    },
    symmetry: {
      overall: Number,
      legSymmetry: Number,
      armSymmetry: Number
    },
    jointAngles: {
      hipLeft: Number,
      hipRight: Number,
      kneeLeft: Number,
      kneeRight: Number,
      ankleLeft: Number,
      ankleRight: Number
    },
    gait: {
      speed: Number,
      strideLength: Number,
      cadence: Number,
      walkingTime: Number
    },
    overall: {
      mobilityScore: Number,
      stabilityScore: Number,
      symmetryScore: Number
    },
    timeSeriesData: {
      timestamps: [Number],
      acceleration: [{
        x: Number,
        y: Number
      }],
      balance: [Number],
      phaseData: [{
        x: Number,
        y: Number,
        timestamp: Number
      }],
      stabilityData: {
        timeSeriesData: [{
          timestamp: Number,
          stability: Number,
          lateralSway: Number,
          verticalSway: Number
        }]
      },
      jointData: {
        timestamps: [Number],
        hipAngles: [Number],
        kneeAngles: [Number],
        ankleAngles: [Number]
      },
      symmetryData: [Number]
    },
    // Hybrid metrics from sensor + CV fusion
    hybrid: {
      jointAngles: mongoose.Schema.Types.Mixed,
      gaitTiming: mongoose.Schema.Types.Mixed,
      balance: mongoose.Schema.Types.Mixed,
      stability: mongoose.Schema.Types.Mixed,
      symmetry: mongoose.Schema.Types.Mixed,
      pressure: mongoose.Schema.Types.Mixed,
      posture: mongoose.Schema.Types.Mixed,
      armSwing: mongoose.Schema.Types.Mixed,
      stepCharacteristics: mongoose.Schema.Types.Mixed
    },
    // Sensor-specific metrics (FSR, IMU)
    sensorMetrics: {
      fsr: mongoose.Schema.Types.Mixed,
      imu: mongoose.Schema.Types.Mixed,
      gaitTiming: mongoose.Schema.Types.Mixed,
      stability: mongoose.Schema.Types.Mixed,
      pressureDistribution: mongoose.Schema.Types.Mixed,
      abnormalities: [mongoose.Schema.Types.Mixed],
      totalDuration: Number,
      sampleCount: Number
    },
    // Insights generated from hybrid metrics
    insights: [mongoose.Schema.Types.Mixed],
    // Abnormalities detected (FoG, festination, asymmetry, etc.)
    abnormalities: [mongoose.Schema.Types.Mixed],
    // Clinical recommendations (priority-ranked)
    recommendations: [mongoose.Schema.Types.Mixed],
    // Summary text and overall assessment
    summary: mongoose.Schema.Types.Mixed,
    // Flag indicating if hybrid metrics were computed
    hybridEnabled: Boolean
  }
}, {
  timestamps: true
});

const GaitAnalysisAssessment = mongoose.model('GaitAnalysisAssessment', gaitAnalysisSchema);
export default GaitAnalysisAssessment;
