import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  testId: { type: String, required: true, index: true },
  metric: { type: String, required: true },
  // `value` may be scalar or complex; use Mixed to allow arrays/objects when needed
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  // optional detailed storage for non-scalar metrics
  details: { type: mongoose.Schema.Types.Mixed },
  zScore: { type: Number },
  flag: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);
export default Score;
