import DisorderQuestionnaire from '../models/DisorderQuestionnaire.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';

export const createQuestionnaire = async (req, res) => {
  try {
    const { userId, patientId, username, disorderType, title, responses, metadata } = req.body;

    if (!disorderType) return res.status(400).json({ error: 'disorderType is required' });

    // If auth middleware attached user to req, prefer that
    let userRef = null;
    let usernameFinal = username;
    if (req.user && req.user._id) {
      userRef = req.user._id;
      usernameFinal = usernameFinal || req.user.name || `${req.user.profile?.firstName || ''} ${req.user.profile?.lastName || ''}`.trim();
    } else if (userId) {
      const user = await User.findById(userId).select('_id name');
      if (!user) return res.status(404).json({ error: 'User not found' });
      userRef = user._id;
      usernameFinal = usernameFinal || user.name;
    }

    let patientRef = null;
    if (patientId) {
      const patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      patientRef = patient._id;
    }

    const doc = new DisorderQuestionnaire({
      user: userRef,
      patient: patientRef,
      username: usernameFinal,
      disorderType,
      title,
      responses: Array.isArray(responses) ? responses : [],
      metadata
    });

    await doc.save();
    return res.status(201).json({ success: true, questionnaire: doc });
  } catch (err) {
    console.error('createQuestionnaire error', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getQuestionnaireById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DisorderQuestionnaire.findById(id).populate('user', 'name email').populate('patient');
    if (!doc) return res.status(404).json({ error: 'Questionnaire not found' });
    return res.json({ questionnaire: doc });
  } catch (err) {
    console.error('getQuestionnaireById error', err);
    return res.status(500).json({ error: err.message });
  }
};

export const listByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const docs = await DisorderQuestionnaire.find({ user: userId }).sort({ createdAt: -1 });
    return res.json({ questionnaires: docs });
  } catch (err) {
    console.error('listByUser error', err);
    return res.status(500).json({ error: err.message });
  }
};

export const listByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const docs = await DisorderQuestionnaire.find({ patient: patientId }).sort({ createdAt: -1 });
    return res.json({ questionnaires: docs });
  } catch (err) {
    console.error('listByPatient error', err);
    return res.status(500).json({ error: err.message });
  }
};

export const listByDisorder = async (req, res) => {
  try {
    const { disorderType } = req.params;
    const docs = await DisorderQuestionnaire.find({ disorderType }).sort({ createdAt: -1 });
    return res.json({ questionnaires: docs });
  } catch (err) {
    console.error('listByDisorder error', err);
    return res.status(500).json({ error: err.message });
  }
};
