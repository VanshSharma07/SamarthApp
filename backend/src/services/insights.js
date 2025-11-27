import Score from '../models/Score.js';
import Test from '../models/Test.js';

// Thresholds for z-scores
const THRESHOLDS = {
  normal: -1.0,
  borderline: -1.5,
  marked: -2.5
};

function severityFromZ(zImmediate, zDelayed, zSlope, intrusionCount) {
  // Return one of: 'normal','mild','marked'
  if (zImmediate !== null && zImmediate < THRESHOLDS.marked) return 'marked';
  if (zDelayed !== null && zDelayed < THRESHOLDS.marked) return 'marked';

  if ((zImmediate !== null && zImmediate < THRESHOLDS.borderline) ||
      (zDelayed !== null && zDelayed < THRESHOLDS.borderline) ||
      (zSlope !== null && zSlope < THRESHOLDS.borderline) ||
      intrusionCount >= 3) return 'mild';

  return 'normal';
}

function interpretMetric(metric, value, z, details) {
  const msg = [];
  switch (metric) {
    case 'immediate_recall_total':
      if (z === null) msg.push('Immediate recall available.');
      else if (z < THRESHOLDS.marked) msg.push('Markedly reduced immediate recall — suggests significant encoding impairment.');
      else if (z < THRESHOLDS.borderline) msg.push('Reduced immediate recall — monitor and consider clinician screen.');
      else msg.push('Immediate recall within expected range.');
      break;
    case 'per_trial_correct':
      if (Array.isArray(details)) {
        const first = details[0] ?? 0;
        const last = details[details.length-1] ?? 0;
        if (last > first) msg.push('Performance improved across trials — intact learning.');
        else if (last === first) msg.push('No improvement across trials — limited short-term learning.');
        else msg.push('Decline across trials — may reflect attention/fatigue or inconsistent performance.');
      }
      break;
    case 'learning_slope':
      if (z === null) msg.push('Learning slope available.');
      else if (z < THRESHOLDS.borderline) msg.push('Learning slope lower than expected — limited in-session acquisition.');
      else msg.push('Learning slope within expected range.');
      break;
    case 'delayed_recall_count':
      if (z === null) msg.push('Delayed recall available.');
      else if (z < THRESHOLDS.marked) msg.push('Poor delayed recall — may indicate consolidation/retention problems (hippocampal pattern).');
      else if (z < THRESHOLDS.borderline) msg.push('Below average delayed recall — consider follow-up.');
      else msg.push('Delayed recall within expected range.');
      break;
    case 'intrusion_count':
      if (value && value > 0) msg.push('Intrusions detected — non-list words were produced which may indicate retrieval errors.');
      break;
    default:
      break;
  }

  return msg.join(' ');
}

export async function computeWordlistInsights(testId) {
  const test = await Test.findById(testId);
  if (!test) throw new Error('Test not found');

  const scores = await Score.find({ testId: String(testId) }).sort({ createdAt: -1 });

  // Convert scores to a map
  const map = {};
  for (const s of scores) map[s.metric] = s;

  const immediate = map['immediate_recall_total'] || null;
  const perTrial = map['per_trial_correct'] || null;
  const slope = map['learning_slope'] || null;
  const delayed = map['delayed_recall_count'] || null;
  const intrusion = map['intrusion_count'] || null;

  const zImmediate = immediate ? (typeof immediate.zScore === 'number' ? immediate.zScore : null) : null;
  const zDelayed = delayed ? (typeof delayed.zScore === 'number' ? delayed.zScore : null) : null;
  const zSlope = slope ? (typeof slope.zScore === 'number' ? slope.zScore : null) : null;
  const intrusionCount = intrusion ? Number(intrusion.value || 0) : 0;

  const severity = severityFromZ(zImmediate, zDelayed, zSlope, intrusionCount);

  const details = [];
  const metricsOrder = ['immediate_recall_total','per_trial_correct','learning_slope','delayed_recall_count','intrusion_count'];
  for (const m of metricsOrder) {
    const s = map[m];
    if (!s) continue;
    details.push({
      metric: s.metric,
      value: s.value,
      zScore: s.zScore !== undefined ? s.zScore : null,
      message: interpretMetric(s.metric, s.value, s.zScore, s.details)
    });
  }

  let summary = '';
  if (severity === 'marked') summary = 'Marked impairment detected on core memory measures — refer for formal neuropsychological evaluation.';
  else if (severity === 'mild') summary = 'Mild impairment or borderline results — consider clinician follow-up and repeat testing.';
  else summary = 'No objective memory impairment detected by this screening test.';

  return {
    success: true,
    severity,
    summary,
    details,
    rawScores: scores
  };
}

export default { computeWordlistInsights };
