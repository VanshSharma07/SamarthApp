import mongoose from 'mongoose';

const neuroBotAssessmentSchema = new mongoose.Schema({
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
    default: 'neurobot'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS'],
    default: 'COMPLETED'
  },
  history: {
    type: Array,
    default: []
  },
  metrics: {
    riskLevel: String,
    summary: String,
    recommendations: [String],
    extractedData: Object,
    overallScore: Number
  },
  report: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

const NeuroBotAssessment = mongoose.model('NeuroBotAssessment', neuroBotAssessmentSchema);

export default NeuroBotAssessment;
