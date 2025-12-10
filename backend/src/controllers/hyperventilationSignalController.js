import SignalFrame from '../models/SignalFrame.js';
import EpilepsyTest from '../models/EpilepsyTest.js';
import mongoose from 'mongoose';

export async function ingestSignalData(req, res) {
  try {
    const { testId, samples } = req.body;
    if (!testId || !samples || !Array.isArray(samples)) return res.status(400).json({ success: false, message: 'testId and samples required' });

    const docs = samples.map(s => ({
      testId: mongoose.Types.ObjectId(testId),
      timestamp: s.timestamp || Date.now(),
      eeg: s.eeg || []
      // Only EEG data is stored; ECG and HR are ignored
    }));

    await SignalFrame.insertMany(docs);

    // Optionally, mark test rawDataRef or update counters
    await EpilepsyTest.updateOne({ _id: testId }, { $set: { rawDataRef: testId } }).catch(() => {});

    return res.json({ success: true, inserted: docs.length });
  } catch (err) {
    console.error('ingestSignalData error', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
