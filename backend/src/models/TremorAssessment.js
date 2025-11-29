import mongoose from 'mongoose';

const tremorSchema = new mongoose.Schema({
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
    default: 'tremor'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS'],
    default: 'COMPLETED'
  },
  metrics: {
    tremor_frequency: {
      type: Number,
      default: 0
    },
    tremor_amplitude: {
      type: Number,
      default: 0
    },
    tremor_type: {
      type: String,
      enum: ['None', 'Very Slow', 'Slow Tremor', 'Resting', 'Postural', 'Action/Intention', 'Irregular'],
      default: 'None'
    },
    severity: {
      type: String,
      enum: ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'],
      default: 'None'
    },
    peak_count: {
      type: Number,
      default: 0
    },
    overall: {
      tremorScore: Number,
      symmetryScore: Number
    },
    rawData: {
      frequencies: [Number],
      amplitudes: [Number],
      timestamps: [Date],
      // raw sensor samples (optional) - store recent samples for replay/analysis
      samples: [{
        timestamp: Number,
        gx: Number,
        gy: Number,
        gz: Number,
        ax: Number,
        ay: Number,
        az: Number,
        value: Number
      }],
      sampleRate: Number
    }
  }
}, {
  timestamps: true
});

const TremorAssessment = mongoose.model('TremorAssessment', tremorSchema);
export default TremorAssessment;
