import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  condition: { type: String },
  notes: { type: String }
}, { timestamps: true });

const Patient = mongoose.model('Patient', PatientSchema);
export default Patient;
