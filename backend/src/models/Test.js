import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  testType: { type: String, required: true, default: 'word_list' },
  status: { type: String, enum: ['IN_PROGRESS','COMPLETED','SCHEDULED'], default: 'IN_PROGRESS' },
  startTs: { type: Date, default: Date.now },
  endTs: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  trialOrder: { type: [Number], default: [] }
}, { timestamps: true });

const Test = mongoose.model('Test', testSchema);
export default Test;
