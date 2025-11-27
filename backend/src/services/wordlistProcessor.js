import axios from 'axios';
import Test from '../models/Test.js';
import Artifact from '../models/Artifact.js';
import Score from '../models/Score.js';
import QueueSvc from './queue.js';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const ML_BASE = process.env.ML_SERVICE_URL || process.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';

// Attach processor
QueueSvc.wordlistQueue.process('process-wordlist', async (job) => {
  const { testId } = job.data;
  console.log('Processing wordlist for test', testId);

  const test = await Test.findById(testId);
  if (!test) throw new Error('Test not found');

  const artifacts = await Artifact.find({ testId: String(testId) });

  // Build payload and multipart form for ML server
  const trialArtifacts = {};
  const fileMap = {};
  const form = new FormData();

  artifacts.forEach(a => {
    const tnum = a.trialNumber != null ? String(a.trialNumber) : 'delayed';
    trialArtifacts[tnum] = trialArtifacts[tnum] || [];
    trialArtifacts[tnum].push({ type: a.type, path: a.path, responseText: a.responseText });
  });

  // Attach non-file responses into payload structure
  const payload = {
    test_id: String(testId),
    user_id: test.userId,
    words: test.metadata?.words || [],
    trials: Object.keys(trialArtifacts).filter(k=>k!=='delayed').map(k => ({ trial_number: parseInt(k), responses: trialArtifacts[k].filter(x=>x.type!=='audio').map(r=>({ text: r.responseText, path: r.path })) })),
    delayed: trialArtifacts['delayed'] ? { responses: trialArtifacts['delayed'].filter(x=>x.type!=='audio').map(r=>({ text: r.responseText, path: r.path })) } : null,
    metadata: test.metadata || {}
  };

  // Append payload JSON
  form.append('payload', JSON.stringify(payload));

  // Attach files (audio/video) as multipart and build a file_map that ML can use
  for (const a of artifacts) {
    if (!a.path) continue;
    const localPath = path.join(process.cwd(), a.path);
    if (!fs.existsSync(localPath)) continue;
    const ext = path.extname(localPath) || '.webm';
    const uploadFilename = `${a._id}${ext}`;
    const stream = fs.createReadStream(localPath);
    form.append('files', stream, { filename: uploadFilename });
    fileMap[uploadFilename] = { type: a.type, trialNumber: a.trialNumber, responseText: a.responseText };
  }

  form.append('file_map', JSON.stringify(fileMap));

  try {
    const headers = form.getHeaders();
    const resp = await axios.post(`${ML_BASE}/extract/wordlist`, form, { headers: { ...headers }, maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 120000 });
    const data = resp.data;

    // Upsert scores — handle scalar vs complex metrics
    if (data.metrics) {
      for (const [k, v] of Object.entries(data.metrics)) {
        let valueToStore = null;
        let details = null;

        if (v === null || v === undefined) {
          valueToStore = null;
        } else if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
          // scalar types
          valueToStore = v;
        } else {
          // complex value (array/object) — store in details and set value to null
          details = v;
          valueToStore = Array.isArray(v) ? v.length : null;
        }

        const s = new Score({
          testId: String(testId),
          metric: k,
          value: valueToStore,
          details: details,
          zScore: (data.z_scores && typeof data.z_scores[k] === 'number') ? data.z_scores[k] : null,
          flag: !!(data.flags && data.flags[k])
        });

        await s.save();
      }
    }

    // Notify or persist results
    return { success: true, result: data };
  } catch (err) {
    console.error('Error calling ML service', err?.message || err);
    throw err;
  }
});

export default QueueSvc;
