import mongoose from 'mongoose';

const artifactSchema = new mongoose.Schema({
  testId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  path: { type: String, required: true },
  trialNumber: { type: Number },
  responseText: { type: mongoose.Schema.Types.Mixed },
  timestamps: { type: [Date] },
  createdAt: { type: Date, default: Date.now }
});

const Artifact = mongoose.model('Artifact', artifactSchema);
export default Artifact;
