import mongoose from 'mongoose';

const PhaseSchema = new mongoose.Schema({
  phaseName: { type: String, enum: ['baseline','hyperventilation','recovery'], required: true },
  startTime: Date,
  endTime: Date
}, { _id: false });

const SummarySchema = new mongoose.Schema({
  baselineHR: Number,
  hvHR: Number,
  recoveryHR: Number
}, { _id: false });

const EpilepsyTestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  testType: { type: String, default: 'hyperventilation' },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  status: { type: String, enum: ['in-progress','completed'], default: 'in-progress' },
  phases: { type: [PhaseSchema], default: [] },
  summaryMetrics: { type: SummarySchema, default: () => ({}) },
  rawDataRef: String
}, { timestamps: true });

EpilepsyTestSchema.index({ userId: 1, startedAt: -1 });

const EpilepsyTest = mongoose.model('EpilepsyTest', EpilepsyTestSchema);
export default EpilepsyTest;
