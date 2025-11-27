import mongoose from 'mongoose';

const BandSchema = new mongoose.Schema({
  delta: { type: Number, default: 0 },
  theta: { type: Number, default: 0 },
  alpha: { type: Number, default: 0 },
  beta: { type: Number, default: 0 },
  gamma: { type: Number, default: 0 }
}, { _id: false });

const SpikeSchema = new mongoose.Schema({
  timestamp: Number,
  amplitude: Number,
  duration: Number
}, { _id: false });

const AssessmentSessionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  avgBands: { type: BandSchema, default: () => ({}) },
  hrStats: {
    min: Number,
    max: Number,
    avg: Number
  },
  hrvStats: {
    rmssd: Number,
    sdnn: Number
  },
  spikes: [SpikeSchema],
  overallRiskScore: Number
}, { timestamps: true });

const AssessmentSession = mongoose.model('AssessmentSession', AssessmentSessionSchema);
export default AssessmentSession;
