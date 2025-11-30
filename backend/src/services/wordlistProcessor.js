import Test from '../models/Test.js';
import Artifact from '../models/Artifact.js';
import Score from '../models/Score.js';
import QueueSvc from './queue.js';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

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
    // Only consider artifacts with an explicit trialNumber as immediate trials.
    // Treat as delayed only when artifact.type === 'delayed'. Skip other artifacts without trialNumber.
    let tnum = null;
    if (a.trialNumber != null) tnum = String(a.trialNumber);
    else if (a.type === 'delayed') tnum = 'delayed';

    if (!tnum) {
      console.log('Skipping artifact without trialNumber and not delayed:', a._id || a.path || a.type);
      return;
    }

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

  // Compute scores locally on the worker
  try {
    const words = payload.words || [];
    const trialKeys = Object.keys(trialArtifacts).filter(k => k !== 'delayed').sort((a,b) => Number(a) - Number(b));
    const normalize = (t) => {
      if (!t) return '';
      return String(t).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    };
    const tokenize = (t) => Array.from(new Set(normalize(t).split(' ').filter(Boolean)));
    const wordSet = new Set(words.map(w => normalize(w)));

    const extractText = (entry) => {
      if (!entry) return '';
      const candidates = [entry.responseText, entry.text, entry.transcript, entry.response, entry.recognizedText, entry.recognized_text];
      for (const c of candidates) {
        if (c !== undefined && c !== null) return c;
      }
      return '';
    };

    const perTrial = [];
    const perTrialDetails = [];
    let immediateTotal = 0;

    console.log('Wordlist words:', words);
    for (const k of trialKeys) {
      // Include all artifact entries for a trial (typed responses and audio transcripts)
      const entries = trialArtifacts[k] || [];
      let combined = '';
      for (const e of entries) {
        if (!e) continue;
        const traw = extractText(e);
        const t = traw !== undefined && traw !== null ? traw : '';
        combined += ' ' + (Array.isArray(t) ? t.join(' ') : String(t));
      }
      const tokens = tokenize(combined);
      const correct = tokens.filter(tok => wordSet.has(tok));
      console.log(`Trial ${k} combined text:`, combined);
      console.log(`Trial ${k} tokens:`, tokens);
      console.log(`Trial ${k} correct tokens:`, correct);
      perTrial.push(correct.length);
      perTrialDetails.push({ trial: Number(k), correctWords: correct, combinedText: combined });
      immediateTotal += correct.length;
    }

    const immediateMax = words.length * Math.max(1, trialKeys.length);
    const immediatePercent = immediateMax > 0 ? (immediateTotal / immediateMax) * 100 : null;

    const delayedEntries = trialArtifacts['delayed'] || [];
    let delayedCombined = '';
    for (const e of delayedEntries) {
      if (!e) continue;
      const t = e.responseText !== undefined ? e.responseText : (e.text !== undefined ? e.text : '');
      delayedCombined += ' ' + (Array.isArray(t) ? t.join(' ') : String(t));
    }
    const delayedTokens = tokenize(delayedCombined);
    const delayedCorrect = delayedTokens.filter(tok => wordSet.has(tok)).length;
    const retentionPercent = words.length > 0 ? (delayedCorrect / words.length) * 100 : null;

    const flags = {
      low_recall: immediatePercent !== null ? immediatePercent < 40 : false,
      // Only mark poor_retention when retentionPercent exists AND immediate performance is not excellent (>=90% suppresses)
      poor_retention: (retentionPercent !== null && (immediatePercent === null || immediatePercent < 90)) ? (retentionPercent < 50) : false,
    };

    const now = new Date();

    const scoresToSave = [
      { metric: 'per_trial_correct', value: perTrial, details: perTrialDetails, zScore: null, flag: false, createdAt: now },
      { metric: 'immediate_total_correct', value: immediateTotal, details: null, zScore: null, flag: flags.low_recall, createdAt: now },
      { metric: 'immediate_percent', value: immediatePercent !== null ? Number(immediatePercent.toFixed(2)) : null, details: null, zScore: null, flag: flags.low_recall, createdAt: now },
      { metric: 'delayed_correct', value: delayedEntries.length ? delayedCorrect : null, details: null, zScore: null, flag: flags.poor_retention, createdAt: now },
      { metric: 'retention_percent', value: delayedEntries.length ? (retentionPercent !== null ? Number(retentionPercent.toFixed(2)) : null) : null, details: null, zScore: null, flag: flags.poor_retention, createdAt: now },
      { metric: 'flags', value: flags, details: null, zScore: null, flag: !!(flags.low_recall || flags.poor_retention), createdAt: now }
    ];

    for (const s of scoresToSave) {
      if (s.value === null || s.value === undefined) {
        console.log(`Skipping score save for metric '${s.metric}' because value is null/undefined`);
        continue;
      }
      const sc = new Score({
        testId: String(testId),
        metric: s.metric,
        value: s.value,
        details: s.details,
        zScore: s.zScore,
        flag: !!s.flag,
        createdAt: s.createdAt
      });
      await sc.save();
    }

    return { success: true, computed: true, scores: scoresToSave };
  } catch (err) {
    console.error('Error computing wordlist scores', err);
    throw err;
  }
});

export default QueueSvc;
