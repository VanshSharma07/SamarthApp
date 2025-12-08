import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createQuestionnaire,
  getQuestionnaireById,
  listByUser,
  listByPatient,
  listByDisorder
} from '../controllers/disorderQuestionnaireController.js';

const router = express.Router();

// Create a questionnaire (authenticated)
router.post('/questionnaire', auth, express.json(), createQuestionnaire);

// Get by id
router.get('/questionnaire/:id', getQuestionnaireById);

// List by user
router.get('/questionnaire/user/:userId', listByUser);

// List by patient
router.get('/questionnaire/patient/:patientId', listByPatient);

// List by disorder type (parkinsons|alzheimers|epilepsy)
router.get('/questionnaire/disorder/:disorderType', listByDisorder);

export default router;
