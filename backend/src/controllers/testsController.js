import fs from 'fs';
import path from 'path';
import multer from 'multer';
import Test from '../models/Test.js';
import Artifact from '../models/Artifact.js';
import Score from '../models/Score.js';
import { processWordlist } from '../services/wordlistWorker.js';

// storage handled in route via multer

export const startTest = async (req, res) => {
  try {
    // Prefer authenticated user when available
    const authUserId = req.user ? String(req.user._id) : null;
    const { user_id: body_user_id, test_type = 'word_list', age, education_years, words = [], trial_count = 3 } = req.body;
    const user_id = authUserId || body_user_id;

    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    // create trial order (shuffle words indices)
    const trialOrder = Array.from({ length: words.length }, (_, i) => i);
    // simple shuffle
    for (let i = trialOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trialOrder[i], trialOrder[j]] = [trialOrder[j], trialOrder[i]];
    }

    const test = new Test({
      userId: user_id,
      testType: test_type,
      metadata: { age, education_years, words, trial_count },
      trialOrder
    });

    const saved = await test.save();

    res.status(201).json({ test_id: saved._id, trial_order: trialOrder, start_ts: saved.startTs });
  } catch (err) {
    console.error('startTest error', err);
    res.status(500).json({ error: err.message });
  }
};

// Multer config helper exported for route
export const getMulterForTest = (testId) => {
  const uploadDir = path.join(process.cwd(), 'uploads', 'tests', String(testId));
  fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ts = Date.now();
      const ext = path.extname(file.originalname) || '.webm';
      cb(null, `${file.fieldname}-${ts}${ext}`);
    }
  });
  return multer({ storage });
};

export const uploadArtifact = async (req, res) => {
  try {
    const { testId } = req.params;
    const artifactType = req.body.artifactType || req.body.type;
    const trialNumber = req.body.trial_number ? parseInt(req.body.trial_number) : undefined;
    // Accept either JSON-encoded response_text or a plain `transcript` field
    let responseText = undefined;
    if (req.body.response_text) {
      try {
        responseText = JSON.parse(req.body.response_text);
      } catch (e) {
        responseText = req.body.response_text;
      }
    }
    if ((!responseText || responseText === '') && req.body.transcript) {
      responseText = req.body.transcript;
    }
    const timestamps = req.body.timestamps ? JSON.parse(req.body.timestamps) : undefined;

    let filePath = null;
    if (req.file) {
      filePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
    }

    const artifact = new Artifact({
      testId,
      type: artifactType || 'trial_response',
      path: filePath || '',
      trialNumber,
      responseText,
      timestamps
    });

    const saved = await artifact.save();

    res.status(201).json({ success: true, artifact: saved });
  } catch (err) {
    console.error('uploadArtifact error', err);
    res.status(500).json({ error: err.message });
  }
};

export const completeTest = async (req, res) => {
  try {
    const { test_id } = req.params;
    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Authorization: only owner may complete
    if (req.user && String(test.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to complete this test' });
    }

    test.status = 'COMPLETED';
    test.endTs = new Date();
    await test.save();

    // Process immediately in background (no Redis/Bull)
    processWordlist(String(test._id))
      .then((r) => console.log('Background processing started for test', test._id))
      .catch((err) => console.error('Background processing error for test', test._id, err));

    res.json({ success: true, queued: true, jobId: `local-${Date.now()}` });
  } catch (err) {
    console.error('completeTest error', err);
    // Detect common Redis/bull connectivity errors and return actionable 503
    const msg = (err && err.message) ? String(err.message) : 'Unknown error';
    if (/max retries|MaxRetriesPerRequest|ECONNREFUSED|failed to connect|No connection/i.test(msg)) {
      return res.status(503).json({ error: 'Queue service unavailable. Check Redis is running and REDIS_URL is correctly configured. Original error: ' + msg });
    }
    res.status(500).json({ error: msg });
  }
};

export const scheduleDelayedRecall = async (req, res) => {
  try {
    const { testId } = req.params;
    const { delay_minutes = 30 } = req.body || {};
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Authorization: only owner may schedule
    if (req.user && String(test.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to schedule this test' });
    }

    const delayMs = Math.max(0, parseInt(delay_minutes, 10)) * 60000;
    // Schedule an in-process delayed call (note: in-memory; will not survive server restart)
    const jobId = `local-delayed-${Date.now()}`;
    setTimeout(() => {
      processWordlist(String(test._id)).catch(err => console.error('Delayed processing error for test', testId, err));
    }, delayMs);

    // mark test as SCHEDULED
    test.status = 'SCHEDULED';
    await test.save();

    res.json({ success: true, queued: true, jobId, scheduledAt: Date.now() + delayMs });
  } catch (err) {
    console.error('scheduleDelayedRecall error', err);
    const msg = (err && err.message) ? String(err.message) : 'Unknown error';
    if (/max retries|MaxRetriesPerRequest|ECONNREFUSED|failed to connect|No connection/i.test(msg)) {
      return res.status(503).json({ error: 'Queue service unavailable. Check Redis is running and REDIS_URL is correctly configured. Original error: ' + msg });
    }
    res.status(500).json({ error: msg });
  }
};

export const getResults = async (req, res) => {
  try {
    const { test_id } = req.params;
    // Check ownership when authenticated
    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (req.user && String(test.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to view results for this test' });
    }
    const scores = await Score.find({ testId: test_id }).sort({ createdAt: -1 });
    res.json({ success: true, data: scores });
  } catch (err) {
    console.error('getResults error', err);
    res.status(500).json({ error: err.message });
  }
};

export const getInsights = async (req, res) => {
  try {
    const { test_id } = req.params;
    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (req.user && String(test.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to view insights for this test' });
    }

    const { computeWordlistInsights } = await import('../services/insights.js');
    const insight = await computeWordlistInsights(test_id);
    res.json(insight);
  } catch (err) {
    console.error('getInsights error', err);
    res.status(500).json({ error: err.message });
  }
};
