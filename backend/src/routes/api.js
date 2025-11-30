import express from 'express';
import { eyeMovementController } from '../controllers/eyeMovementController.js';
import { neckMobilityController } from '../controllers/neckMobilityController.js';
import { sendReportEmail } from '../controllers/emailController.js';
import { startTest, uploadArtifact, completeTest, getResults, getMulterForTest, scheduleDelayedRecall, getInsights } from '../controllers/testsController.js';
import { auth } from '../middleware/auth.js';
import neuroRoutes from './neuroAssessment.js';
import disorderQuestionnaireRoutes from './disorderQuestionnaire.js';

const router = express.Router();

// Eye Movement routes
router.post('/specialized-assessments/eye-movement', eyeMovementController.save);
router.get('/specialized-assessments/eye-movement/history', eyeMovementController.getHistory);
router.get('/specialized-assessments/eye-movement/baseline/:userId', eyeMovementController.getBaseline);

// Neck Mobility routes
router.post('/specialized-assessments/neck-mobility', neckMobilityController.save);
router.get('/specialized-assessments/neck-mobility/history', neckMobilityController.getHistory);
router.get('/specialized-assessments/neck-mobility/baseline/:userId', neckMobilityController.getBaseline);

router.post('/email/send-report', sendReportEmail);

// Tests (word list) routes
router.post('/tests/start', auth, express.json(), startTest);

// artifact upload - we need multer per test id
router.post('/tests/:testId/artifact', auth, (req, res, next) => {
	const upload = getMulterForTest(req.params.testId).single('file');
	upload(req, res, (err) => {
		if (err) return res.status(500).json({ error: err.message });
		next();
	});
}, uploadArtifact);

router.post('/tests/:test_id/complete', auth, completeTest);
router.get('/tests/:test_id/results', auth, getResults);
router.get('/tests/:test_id/insights', auth, getInsights);
router.post('/tests/:testId/schedule-delayed', auth, express.json(), scheduleDelayedRecall);

// Neuro-Assessment routes (EEG/ECG streaming and session APIs)
router.use('/', neuroRoutes);

// Disorder questionnaire routes
router.use('/disorders', disorderQuestionnaireRoutes);

export default router;
