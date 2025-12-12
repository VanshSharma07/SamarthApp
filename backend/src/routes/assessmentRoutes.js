import express from 'express';
import multer from 'multer';
import {
  getAllAssessments,
  getAssessmentsByType,
  generatePdfReport,
  getAiAnalysis,
  getAssessmentHistory,
  saveAssessment,
  deleteAssessment,
  addAssessment,
  getBaselineData,
  analyzePdfAi
} from '../controllers/assessmentController.js';
import { auth } from '../middleware/auth.js';

// Configure multer for PDF upload (in-memory storage for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const router = express.Router();

// Protect all routes with auth middleware
router.use(auth);

// Routes
router.get('/history', getAssessmentHistory);
router.get('/baseline', getBaselineData); // Add explicit route for baseline
router.post('/', saveAssessment);
router.delete('/:id', deleteAssessment);
router.post('/add', addAssessment);

// Special report and AI routes
router.get('/:userId/report', generatePdfReport);
router.post('/:userId/ai-analysis', getAiAnalysis);
router.post('/:userId/analyze-pdf', upload.single('file'), analyzePdfAi);

// These need to come after the specific routes to avoid conflicts
router.get('/:userId/:type', getAssessmentsByType);
router.get('/:userId', getAllAssessments);

export default router;
