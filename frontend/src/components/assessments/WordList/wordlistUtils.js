// Utility functions for client-side scoring of the Word List assessment
function normalizeText(t) {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(t) {
  const s = normalizeText(t);
  if (!s) return [];
  return Array.from(new Set(s.split(' ').filter(Boolean)));
}

export function computeWordlistMetrics(words = [], responses = {}, trialCount = 0, delayedText = '') {
  const normWords = words.map(w => normalizeText(w));
  const wordSet = new Set(normWords);

  const perTrial = [];
  const perTrialDetails = [];
  let immediateTotal = 0;

  for (let t = 1; t <= trialCount; t++) {
    const resp = responses && responses[t] ? (responses[t].typed || '') : '';
    const tokens = tokenize(resp);
    const correct = tokens.filter(tok => wordSet.has(tok));
    perTrial.push(correct.length);
    perTrialDetails.push({ trial: t, correctWords: correct });
    immediateTotal += correct.length;
  }

  const immediateMax = words.length * Math.max(1, trialCount);
  const immediatePercent = immediateMax > 0 ? (immediateTotal / immediateMax) * 100 : null;

  // delayed
  const delayedTokens = tokenize(delayedText);
  const delayedCorrect = delayedTokens.filter(tok => wordSet.has(tok)).length;
  const retentionPercent = immediateTotal > 0 ? (delayedCorrect / (words.length)) * 100 : null;

  // simple heuristics / flags
  const flags = {
    low_recall: immediatePercent !== null ? immediatePercent < 40 : false,
    poor_retention: retentionPercent !== null ? retentionPercent < 50 : false,
  };

  const now = new Date().toISOString();

  const scores = [
    { metric: 'per_trial_correct', value: perTrial, details: perTrialDetails, zScore: null, flag: false, createdAt: now },
    { metric: 'immediate_total_correct', value: immediateTotal, details: null, zScore: null, flag: flags.low_recall, createdAt: now },
    { metric: 'immediate_percent', value: immediatePercent !== null ? Number(immediatePercent.toFixed(2)) : null, details: null, zScore: null, flag: flags.low_recall, createdAt: now },
    { metric: 'delayed_correct', value: delayedText ? delayedCorrect : null, details: null, zScore: null, flag: flags.poor_retention, createdAt: now },
    { metric: 'retention_percent', value: delayedText ? (retentionPercent !== null ? Number(retentionPercent.toFixed(2)) : null) : null, details: null, zScore: null, flag: flags.poor_retention, createdAt: now },
    { metric: 'flags', value: flags, details: null, zScore: null, flag: !!(flags.low_recall || flags.poor_retention), createdAt: now }
  ];

  return scores;
}

export default { computeWordlistMetrics };
