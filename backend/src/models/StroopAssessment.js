import mongoose from 'mongoose';

const stroopSchema = new mongoose.Schema({
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
    default: 'stroop'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS'],
    default: 'COMPLETED'
  },
  score: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  history: [
    {
      word: String,
      ink: String,
      selected: String,
      correct: Boolean,
      reactionTime: Number
    }
  ],
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const StroopAssessment = mongoose.model('StroopAssessment', stroopSchema);
export default StroopAssessment;
