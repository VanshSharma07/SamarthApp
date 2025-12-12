import mongoose from 'mongoose';

const hyperventilationAssessmentSchema = new mongoose.Schema({
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
    default: 'hyperventilation'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS'],
    default: 'COMPLETED'
  },
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EpilepsyTest',
    index: true
  },
  metrics: {
    // Risk assessment
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      default: 'low'
    },
    screeningFlag: {
      type: String,
      default: 'No significant abnormality detected'
    },
    recommendedAction: {
      type: String,
      default: 'Routine follow-up'
    },

    // Phase-specific analysis
    baseline: {
      duration: {
        type: Number,
        default: 0
      },
      heartRate: {
        type: Number,
        default: 0
      },
      bandPowers: {
        delta: Number,
        theta: Number,
        alpha: Number,
        beta: Number,
        gamma: Number
      },
      spikes: {
        type: Number,
        default: 0
      }
    },
    hyperventilation: {
      duration: {
        type: Number,
        default: 0
      },
      heartRate: {
        type: Number,
        default: 0
      },
      bandPowers: {
        delta: Number,
        theta: Number,
        alpha: Number,
        beta: Number,
        gamma: Number
      },
      spikes: {
        type: Number,
        default: 0
      },
      alphaSuppression: {
        type: Number,
        default: 0
      }
    },
    recovery: {
      duration: {
        type: Number,
        default: 0
      },
      heartRate: {
        type: Number,
        default: 0
      },
      bandPowers: {
        delta: Number,
        theta: Number,
        alpha: Number,
        beta: Number,
        gamma: Number
      },
      spikes: {
        type: Number,
        default: 0
      }
    },

    // Clinical indicators
    clinicalIndicators: {
      findings: [String],
      clinicalNotes: String,
      comparison: {
        baselineVsHv: {
          alphaSuppression: Number,
          deltaIncrease: Number
        },
        hvVsRecovery: {
          alphaRecovery: Number,
          deltaDecrease: Number
        },
        overallResponse: String
      }
    },

    // Summary metrics
    summaryMetrics: {
      totalDuration: {
        type: Number,
        default: 0
      },
      overallRiskScore: {
        type: Number,
        default: 0
      },
      abnormalityDetected: {
        type: Boolean,
        default: false
      }
    }
  }
});

const HyperventilationAssessment = mongoose.model('HyperventilationAssessment', hyperventilationAssessmentSchema);

export default HyperventilationAssessment;
