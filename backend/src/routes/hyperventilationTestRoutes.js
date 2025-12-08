import express from 'express';
import { startTest, phaseAction, completeTest, getTest } from '../controllers/hyperventilationTestController.js';
import { ingestSignalData } from '../controllers/hyperventilationSignalController.js';

const router = express.Router();

router.post('/start', startTest);
router.post('/phase', phaseAction);
router.post('/data', ingestSignalData);
router.post('/complete', completeTest);
router.get('/:testId', getTest);

export default router;
