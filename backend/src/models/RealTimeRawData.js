import mongoose from 'mongoose';

const RealTimeRawDataSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentSession', required: true },
  timestamp: { type: Number, required: true },
  eeg_raw: { type: [Number], default: [] },
  ecg_raw: { type: [Number], default: [] }
}, { timestamps: true });

const RealTimeRawData = mongoose.model('RealTimeRawData', RealTimeRawDataSchema);
export default RealTimeRawData;
