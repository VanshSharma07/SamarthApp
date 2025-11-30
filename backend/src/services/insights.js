import Score from '../models/Score.js';
import Test from '../models/Test.js';

// Simple heuristics thresholds (percentages)
const PCT = {
  marked: 30, // percent or below -> marked
  mild: 50    // percent or below -> mild
};

function severityFromPercents(immediatePct, retentionPct, slopeDelta, intrusionCount) {
  // Return one of: 'normal','mild','marked'
  if ((immediatePct !== null && immediatePct <= PCT.marked) || (retentionPct !== null && retentionPct <= PCT.marked)) return 'marked';
  // Consider slopeDelta only when immediate performance is not excellent (avoid flagging high performers with flat slope)
  const slopeConcern = (slopeDelta !== null && slopeDelta <= 0) && (immediatePct === null || immediatePct < 90);
  if ((immediatePct !== null && immediatePct <= PCT.mild) || (retentionPct !== null && retentionPct <= PCT.mild) || slopeConcern || intrusionCount >= 3) return 'mild';
  return 'normal';
}

function interpretMetric(metric, value, details, immediatePct = null) {
  const msg = [];
  switch (metric) {
    case 'immediate_total_correct':
      if (value === null) msg.push('Immediate recall not available.');
      else msg.push(`Immediate total correct: ${value}.`);
      break;
    case 'per_trial_correct':
      if (Array.isArray(value)) {
        const first = value[0] ?? 0;
        const last = value[value.length-1] ?? 0;
        if (last > first) msg.push('Performance improved across trials — intact learning.');
        else if (last === first) {
          // If immediatePct is high, avoid interpreting flat slope as impairment
          if (immediatePct !== null && immediatePct >= 90) {
            msg.push('High immediate recall across trials — no evidence of impaired learning.');
          } else {
            msg.push('No improvement across trials — limited short-term learning.');
          }
        } else msg.push('Decline across trials — may reflect attention/fatigue or inconsistent performance.');
        msg.push(`Per-trial correct: ${value.join(', ')}.`);
      }
      break;
    case 'immediate_percent':
      if (value === null) msg.push('Immediate percent not available.');
      else msg.push(`Immediate recall percent: ${value}%.`);
      break;
    case 'delayed_correct':
      if (value === null) msg.push('Delayed recall not performed.');
      else msg.push(`Delayed correct: ${value}.`);
      break;
    case 'retention_percent':
      if (value === null) msg.push('Retention percent not available.');
      else msg.push(`Retention: ${value}%.`);
      break;
    case 'flags':
      if (value && typeof value === 'object') {
        const active = Object.keys(value).filter(k => value[k]);
        if (active.length) msg.push(`Flags: ${active.join(', ')}.`);
      }
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

  // Convert scores to a map, keeping the newest record for each metric
  const map = {};
  for (const s of scores) {
    // `scores` is sorted by createdAt desc (newest first). Keep the first occurrence for each metric.
    if (!map[s.metric]) map[s.metric] = s;
  }

  // Map existing stored metrics to interpretation variables
  const immediateTotal = map['immediate_total_correct'] && map['immediate_total_correct'].value !== null && map['immediate_total_correct'].value !== undefined
    ? Number(map['immediate_total_correct'].value)
    : null;
  const perTrial = map['per_trial_correct'] && map['per_trial_correct'].value !== null && map['per_trial_correct'].value !== undefined
    ? map['per_trial_correct'].value
    : null;
  const immediatePct = map['immediate_percent'] && map['immediate_percent'].value !== null && map['immediate_percent'].value !== undefined
    ? Number(map['immediate_percent'].value)
    : null;
  const delayedCorrect = map['delayed_correct'] && map['delayed_correct'].value !== null && map['delayed_correct'].value !== undefined
    ? Number(map['delayed_correct'].value)
    : null;
  const retentionPct = map['retention_percent'] && map['retention_percent'].value !== null && map['retention_percent'].value !== undefined
    ? Number(map['retention_percent'].value)
    : null;
  // Derive flags from available numeric metrics rather than trusting stored `flags` blob.
  const storedFlags = map['flags'] ? (map['flags'].value || {}) : {};
  const derivedFlags = {
    low_recall: immediatePct !== null ? immediatePct < 40 : false,
    // Only mark poor_retention when retention percent is present AND immediate performance is not excellent
    poor_retention: (retentionPct !== null && (immediatePct === null || immediatePct < 90)) ? retentionPct < 50 : false
  };
  // Merge stored flags only where derived flags are undefined (defensive), but prefer derivedFlags.
  const flags = { ...storedFlags, ...derivedFlags };

  // Compute a simple learning slope (last - first)
  let slopeDelta = null;
  if (Array.isArray(perTrial) && perTrial.length >= 2) {
    slopeDelta = (perTrial[perTrial.length - 1] - perTrial[0]);
  }

  const intrusionCount = 0; // we don't compute intrusions in this pipeline

  const severity = severityFromPercents(immediatePct, retentionPct, slopeDelta, intrusionCount);

  const details = [];
  const metricsOrder = ['per_trial_correct','immediate_total_correct','immediate_percent','delayed_correct','retention_percent','flags'];
  for (const m of metricsOrder) {
    const s = map[m];
    if (!s) {
      // For computed metrics not stored as Score objects, provide a synthesized entry
      if (m === 'per_trial_correct' && perTrial) {
        details.push({ metric: m, value: perTrial, zScore: null, message: interpretMetric(m, perTrial) });
      } else if (m === 'immediate_total_correct' && immediateTotal !== null) {
        details.push({ metric: m, value: immediateTotal, zScore: null, message: interpretMetric(m, immediateTotal) });
      } else if (m === 'immediate_percent' && immediatePct !== null) {
        details.push({ metric: m, value: immediatePct, zScore: null, message: interpretMetric(m, immediatePct) });
      } else if (m === 'delayed_correct' && delayedCorrect !== null) {
        details.push({ metric: m, value: delayedCorrect, zScore: null, message: interpretMetric(m, delayedCorrect) });
      } else if (m === 'retention_percent' && retentionPct !== null) {
        details.push({ metric: m, value: retentionPct, zScore: null, message: interpretMetric(m, retentionPct) });
      } else if (m === 'flags') {
        details.push({ metric: m, value: flags, zScore: null, message: interpretMetric(m, flags) });
      }
      continue;
    }
    // If this is the stored flags metric, prefer the derived `flags` object
    if (s.metric === 'flags') {
      details.push({
        metric: 'flags',
        value: flags,
        zScore: s.zScore !== undefined ? s.zScore : null,
        message: interpretMetric('flags', flags)
      });
    } else {
      details.push({
        metric: s.metric,
        value: s.value,
        zScore: s.zScore !== undefined ? s.zScore : null,
        message: interpretMetric(s.metric, s.value, s.details)
      });
    }
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
    flags,
    rawScores: scores
  };
}

export default { computeWordlistInsights };
