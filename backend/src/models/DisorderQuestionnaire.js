import mongoose from 'mongoose';

const ResponseSchema = new mongoose.Schema({
  questionId: { type: String },
  questionText: { type: String, required: true },
  answer: { type: mongoose.Schema.Types.Mixed },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const DisorderQuestionnaireSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  username: { type: String },
  disorderType: { type: String, required: true, enum: ['parkinsons', 'alzheimers', 'epilepsy'] },
  title: { type: String },
  responses: { type: [ResponseSchema], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const DisorderQuestionnaire = mongoose.model('DisorderQuestionnaire', DisorderQuestionnaireSchema);
export default DisorderQuestionnaire;
