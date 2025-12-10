import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'GAIT_ANALYSIS',
      'BALANCE_ANALYSIS',
      'POSTURAL_ANALYSIS',
      'EYE_MOVEMENT',
      'NECK_MOBILITY',
      'FACIAL_SYMMETRY',
      'TREMOR',
      'RESPONSE_TIME',
      'SPEECH_PATTERN',
      'FINGER_TAPPING',
      'HYPERVENTILATION_TEST'
    ]
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  data: {
    type: Object,
    required: true
  },
  metrics: {
    type: Object,
    required: true,
    validate: {
      validator: function(metrics) {
        // Validate metrics based on assessment type
        switch(this.type) {
          case 'FACIAL_SYMMETRY':
            return metrics.hasOwnProperty('symmetryScore') &&
                   metrics.hasOwnProperty('eyeAlignment') &&
                   metrics.hasOwnProperty('mouthAlignment') &&
                   metrics.hasOwnProperty('overallSymmetry');
          case 'GAIT_ANALYSIS':
            return metrics.hasOwnProperty('stability') &&
                   metrics.hasOwnProperty('balance') &&
                   metrics.hasOwnProperty('symmetry') &&
                   Array.isArray(metrics.jointAngles);
          case 'FINGER_TAPPING':
            return metrics.hasOwnProperty('frequency') &&
                   metrics.hasOwnProperty('amplitude') &&
                   metrics.hasOwnProperty('rhythm') &&
                   metrics.hasOwnProperty('overallScore');
          case 'NECK_MOBILITY':
            return metrics.hasOwnProperty('flexion') &&
                   metrics.hasOwnProperty('extension') &&
                   metrics.hasOwnProperty('rotation') &&
                   metrics.hasOwnProperty('lateralBending');
          // Add other assessment type validations as needed
          default:
            // For other types, just ensure metrics is an object with at least one property
            return metrics && Object.keys(metrics).length > 0;
        }
      },
      message: props => `Invalid metrics for assessment type ${props.value}`
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS'],
    default: 'COMPLETED'
  }
});

// Add indexes for common queries
assessmentSchema.index({ userId: 1, type: 1, timestamp: -1 });

// Static method to get baseline data
assessmentSchema.statics.getBaselineData = async function(userId, type) {
  return this.findOne({
    userId,
    type,
    baseline: true
  }).sort({ timestamp: -1 });
};

// Static method to get assessment history
assessmentSchema.statics.getAssessmentHistory = async function(userId, type, limit = 10) {
  return this.find({
    userId,
    type
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

const Assessment = mongoose.model('Assessment', assessmentSchema);

export default Assessment; 