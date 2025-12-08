import EpilepsyTest from '../models/EpilepsyTest.js';
import SignalFrame from '../models/SignalFrame.js';
import mongoose from 'mongoose';

export async function startTest(req, res) {
  try {
    const { userId } = req.body;
    const payload = { testType: 'hyperventilation', startedAt: new Date(), status: 'in-progress' };
    if (userId) {
      try {
        payload.userId = new mongoose.Types.ObjectId(userId);
      } catch (e) {
        // fallback to raw value if casting fails
        payload.userId = userId;
      }
    }
    const doc = await EpilepsyTest.create(payload);
    return res.json({ success: true, testId: doc._id });
  } catch (err) {
    console.error('startTest error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function phaseAction(req, res) {
  try {
    const { testId, phase, action, timestamp } = req.body;
    if (!testId || !phase || !action) return res.status(400).json({ success: false, message: 'testId, phase and action required' });
    const t = await EpilepsyTest.findById(testId);
    if (!t) return res.status(404).json({ success: false, message: 'Test not found' });

    if (action === 'start') {
      t.phases.push({ phaseName: phase, startTime: timestamp ? new Date(timestamp) : new Date() });
    } else if (action === 'end') {
      // find last phase entry with this phaseName missing endTime
      for (let i = t.phases.length - 1; i >= 0; i--) {
        if (t.phases[i].phaseName === phase && !t.phases[i].endTime) {
          t.phases[i].endTime = timestamp ? new Date(timestamp) : new Date();
          break;
        }
      }
    }
    await t.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('phaseAction error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function completeTest(req, res) {
  try {
    const { testId } = req.body;
    if (!testId) return res.status(400).json({ success: false, message: 'testId required' });
    const t = await EpilepsyTest.findById(testId);
    if (!t) return res.status(404).json({ success: false, message: 'Test not found' });

    // compute average HR per phase if frames contain hr
    const summary = { baselineHR: null, hvHR: null, recoveryHR: null };
    for (const p of t.phases) {
      if (!p.startTime || !p.endTime) continue;
      const frames = await SignalFrame.find({ testId: t._id, timestamp: { $gte: p.startTime.getTime(), $lte: p.endTime.getTime() }, hr: { $exists: true } }).select('hr');
      if (frames && frames.length > 0) {
        const avg = frames.reduce((a, f) => a + f.hr, 0) / frames.length;
        if (p.phaseName === 'baseline') summary.baselineHR = Math.round(avg);
        if (p.phaseName === 'hyperventilation') summary.hvHR = Math.round(avg);
        if (p.phaseName === 'recovery') summary.recoveryHR = Math.round(avg);
      }
    }

    t.endedAt = new Date();
    t.status = 'completed';
    t.summaryMetrics = summary;
    await t.save();
    return res.json({ success: true, summary });
  } catch (err) {
    console.error('completeTest error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getTest(req, res) {
  try {
    const { testId } = req.params;
    const t = await EpilepsyTest.findById(testId);
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, test: t });
  } catch (err) {
    console.error('getTest error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
