import express from 'express';
import { eyeMovementController } from '../controllers/eyeMovementController.js';
import { neckMobilityController } from '../controllers/neckMobilityController.js';
import { facialSymmetryController } from '../controllers/facialSymmetryController.js';
import { tremorController } from '../controllers/tremorController.js';
import { responseTimeController } from '../controllers/responseTimeController.js';
import { gaitAnalysisController } from '../controllers/gaitAnalysisController.js';
import { fingerTappingController } from '../controllers/fingerTappingController.js';
import { speechPatternController } from '../controllers/speechPatternController.js';
import { stroopController } from '../controllers/stroopController.js';

const router = express.Router();

// Eye Movement routes
router.post('/eye-movement', eyeMovementController.save);
router.get('/eye-movement/history', eyeMovementController.getHistory);
router.get('/eye-movement/baseline/:userId', eyeMovementController.getBaseline);

// Facial Symmetry Assessment Routes
router.post('/facial-symmetry', facialSymmetryController.save);
router.get('/facial-symmetry/history/:userId', facialSymmetryController.getHistory);
router.get('/facial-symmetry/baseline/:userId', facialSymmetryController.getBaseline);

// Neck Mobility routes
router.post('/neck-mobility', neckMobilityController.save);
router.get('/neck-mobility/history', neckMobilityController.getHistory);
router.get('/neck-mobility/baseline/:userId', neckMobilityController.getBaseline);

// Tremor Assessment routes
router.post('/tremor', tremorController.save);
router.get('/tremor/history', tremorController.getHistory);
router.get('/tremor/baseline/:userId', tremorController.getBaseline);

// Response Time Assessment routes
router.post('/response-time', responseTimeController.save);
router.get('/response-time/history', responseTimeController.getHistory);
router.get('/response-time/baseline/:userId', responseTimeController.getBaseline);

// GaitAnalysis Assessment routes
router.post('/gait-analysis', gaitAnalysisController.save);
router.get('/gait-analysis/history', gaitAnalysisController.getHistory);
router.get('/gait-analysis/baseline/:userId', gaitAnalysisController.getBaseline);

// FingerTapping Assessment routes
router.post('/finger-tapping', fingerTappingController.save);
router.get('/finger-tapping/history', fingerTappingController.getHistory);
router.get('/finger-tapping/baseline/:userId', fingerTappingController.getBaseline);

// Stroop Assessment routes
router.post('/stroop', stroopController.save);
router.get('/stroop/history', stroopController.getHistory);
router.get('/stroop/baseline/:userId', stroopController.getBaseline);

// SpeechPattern Assessment routes
router.post('/speech-pattern', speechPatternController.save);
router.get('/speech-pattern/history', speechPatternController.getHistory);
router.get('/speech-pattern/baseline/:userId', speechPatternController.getBaseline);

export default router;
