import EpilepsyTest from '../models/EpilepsyTest.js';
import SignalFrame from '../models/SignalFrame.js';
import mongoose from 'mongoose';

// Function to calculate EEG band powers from raw data
function calculateBandPowers(eegData) {
  if (!eegData || eegData.length === 0) {
    return { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
  }

  const mean = eegData.reduce((sum, val) => sum + val, 0) / eegData.length;
  const centered = eegData.map(v => v - mean);
  
  console.log('[calculateBandPowers] Samples:', eegData.length, 'Mean:', mean.toFixed(2), 'Centered range:', 
    Math.min(...centered).toFixed(2), 'to', Math.max(...centered).toFixed(2));

  const bandPowers = {
    delta: 0,
    theta: 0,
    alpha: 0,
    beta: 0,
    gamma: 0
  };

  centered.forEach(value => {
    const absVal = Math.abs(value);
    if (absVal >= 5 && absVal < 40) bandPowers.delta++;
    else if (absVal >= 40 && absVal < 80) bandPowers.theta++;
    else if (absVal >= 80 && absVal < 130) bandPowers.alpha++;
    else if (absVal >= 130 && absVal < 300) bandPowers.beta++;
    else if (absVal >= 300) bandPowers.gamma++;
  });

  const total = centered.length;
  const result = {
    delta: Math.round((bandPowers.delta / total) * 100),
    theta: Math.round((bandPowers.theta / total) * 100),
    alpha: Math.round((bandPowers.alpha / total) * 100),
    beta: Math.round((bandPowers.beta / total) * 100),
    gamma: Math.round((bandPowers.gamma / total) * 100)
  };
  
  console.log('[calculateBandPowers] Result:', result);
  return result;
}

// Function to detect abnormal patterns
function detectAbnormalities(eegData, phase) {
  const abnormalities = [];
  let spikeCount = 0;
  let slowingIndicator = 0;

  if (!eegData || eegData.length === 0) {
    return { spikeCount: 0, slowingIndicator: 0, abnormalities: [] };
  }

  const mean = eegData.reduce((sum, val) => sum + val, 0) / eegData.length;
  const centered = eegData.map(v => v - mean);
  
  const variance = centered.reduce((sum, val) => sum + (val * val), 0) / centered.length;
  const stdDev = Math.sqrt(variance);
  const threshold = stdDev * 2.5;
  
  console.log('[detectAbnormalities] Phase:', phase, 'Samples:', eegData.length, 
    'Mean:', mean.toFixed(2), 'StdDev:', stdDev.toFixed(2), 'Threshold:', threshold.toFixed(2));

  centered.forEach((value, idx) => {
    if (Math.abs(value) > threshold) {
      spikeCount++;
      abnormalities.push({ type: 'spike', index: idx, amplitude: Math.abs(value) });
    }
    if (Math.abs(value) >= 5 && Math.abs(value) < 80) {
      slowingIndicator++;
    }
  });
  
  console.log('[detectAbnormalities] Result: Spikes:', spikeCount, 'Slowing:', 
    Math.round((slowingIndicator / centered.length) * 100) + '%');

  return {
    spikeCount,
    slowingIndicator: Math.round((slowingIndicator / centered.length) * 100),
    abnormalities
  };
}

// Function to generate clinical indicators
function generateClinicalIndicators(baselineData, hvData, recoveryData) {
  const indicators = {
    risk_level: 'low', // low, moderate, high
    findings: [],
    clinical_notes: '',
    comparison: {
      baseline_vs_hv: {},
      hv_vs_recovery: {},
      overall_response: ''
    }
  };

  // Analyze band changes from baseline to HV
  const alphaSuppression = baselineData.bandPowers.alpha - hvData.bandPowers.alpha;
  const deltaIncrease = hvData.bandPowers.delta - baselineData.bandPowers.delta;
  const spikeIncrease = hvData.abnormalities.spikeCount - baselineData.abnormalities.spikeCount;

  // Baseline vs HV comparison
  if (alphaSuppression > 10) {
    indicators.findings.push('Alpha suppression during hyperventilation (expected normal response)');
    indicators.comparison.baseline_vs_hv.alpha_suppression = alphaSuppression + '%';
  }

  if (deltaIncrease > 15) {
    indicators.findings.push('Increased delta activity during hyperventilation (physiological slowing)');
    indicators.comparison.baseline_vs_hv.delta_increase = deltaIncrease + '%';
  }

  if (spikeIncrease > 5) {
    indicators.findings.push('Spike activity increased during hyperventilation');
    indicators.comparison.baseline_vs_hv.spike_increase = spikeIncrease;
    indicators.risk_level = 'high';
  }

  // HV vs Recovery comparison
  const recoveryAlpha = recoveryData.bandPowers.alpha - hvData.bandPowers.alpha;
  const recoveryDelta = baselineData.bandPowers.delta - recoveryData.bandPowers.delta;

  if (recoveryAlpha > 5) {
    indicators.findings.push('Alpha activity normalized during recovery phase');
    indicators.comparison.hv_vs_recovery.alpha_recovery = recoveryAlpha + '%';
  }

  if (hvData.abnormalities.spikeCount > 0 && recoveryData.abnormalities.spikeCount === 0) {
    indicators.findings.push('Abnormal spikes resolved in recovery phase');
    indicators.comparison.hv_vs_recovery.spike_resolution = true;
  }

  // Overall response pattern
  if (spikeIncrease > 10 || (hvData.abnormalities.spikeCount > 0 && recoveryData.abnormalities.spikeCount > 0)) {
    indicators.overall_response = 'Abnormal EEG response to hyperventilation - suggests possible epileptic tendency';
    indicators.risk_level = 'high';
  } else if (alphaSuppression > 15 && deltaIncrease > 10) {
    indicators.overall_response = 'Expected physiological response to hyperventilation';
    indicators.risk_level = 'low';
  } else {
    indicators.overall_response = 'Borderline EEG response to hyperventilation';
    indicators.risk_level = 'moderate';
  }

  indicators.clinical_notes = `
    Hyperventilation provocation study findings:
    - Risk Level: ${indicators.risk_level.toUpperCase()}
    - Overall Response: ${indicators.overall_response}
    - Key Findings: ${indicators.findings.length > 0 ? indicators.findings.join('; ') : 'No significant abnormalities detected'}
  `;

  return indicators;
}

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
    
    console.log('[completeTest] Starting analysis for testId:', testId);
    
    const t = await EpilepsyTest.findById(testId);
    if (!t) return res.status(404).json({ success: false, message: 'Test not found' });
    
    console.log('[completeTest] Test found with', t.phases.length, 'phases');

    const phaseAnalysis = {};
    const allPhaseData = {};
    const frameCountByPhase = {};

    for (const p of t.phases) {
      if (!p.startTime || !p.endTime) {
        console.warn('[completeTest] Phase', p.phaseName, 'missing start or end time, skipping');
        continue;
      }
      
      const TOLERANCE_MS = 2000;
      const startTime = p.startTime.getTime() - TOLERANCE_MS;
      const endTime = p.endTime.getTime() + TOLERANCE_MS;
      
      console.log('[completeTest] Querying frames for phase:', p.phaseName, 
        'from', new Date(startTime).toISOString(), 'to', new Date(endTime).toISOString());
      
      const frames = await SignalFrame.find({
        testId: t._id,
        timestamp: { $gte: startTime, $lte: endTime }
      }).select('eeg timestamp');
      
      frameCountByPhase[p.phaseName] = frames.length;
      console.log('[completeTest] Found', frames.length, 'frames for phase:', p.phaseName);

      if (frames && frames.length > 0) {
        const eegAll = frames.flatMap(f => f.eeg || []);
        
        // Calculate band powers
        const bandPowers = calculateBandPowers(eegAll);
        
        // Detect abnormalities
        const abnormalities = detectAbnormalities(eegAll, p.phaseName);
        
        // Calculate amplitude statistics
        const amplitudes = eegAll.map(v => Math.abs(v));
        const meanAmplitude = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
        const maxAmplitude = Math.max(...amplitudes);
        const minAmplitude = Math.min(...amplitudes);

        const phaseSummary = {
          phaseName: p.phaseName,
          duration: (p.endTime - p.startTime) / 1000, // in seconds
          sampleCount: eegAll.length,
          bandPowers,
          abnormalities: {
            spikeCount: abnormalities.spikeCount,
            slowingIndicator: abnormalities.slowingIndicator,
            abnormalCount: abnormalities.abnormalities.length
          },
          amplitude: {
            mean: Math.round(meanAmplitude * 100) / 100,
            max: Math.round(maxAmplitude * 100) / 100,
            min: Math.round(minAmplitude * 100) / 100
          },
          rhythmicity: {
            regular: abnormalities.slowingIndicator > 50 ? 'slowed' : 'normal',
            symmetry: 'bilateral' // Simplified for 3-electrode system
          }
        };

        phaseAnalysis[p.phaseName] = phaseSummary;
        allPhaseData[p.phaseName] = phaseSummary;
      }
    }

    console.log('[completeTest] Phase analysis complete. Frames per phase:', frameCountByPhase);
    console.log('[completeTest] Phase data available:', Object.keys(allPhaseData));
    
    if (Object.keys(allPhaseData).length === 0) {
      console.error('[completeTest] ERROR: No frames found for any phase');
      return res.status(500).json({ 
        success: false, 
        message: 'No EEG data found for test. Please ensure data capture was successful.',
        debug: {
          testId,
          phasesInTest: t.phases.length,
          framesFoundPerPhase: frameCountByPhase
        }
      });
    }
    
    if (Object.keys(allPhaseData).length < 3) {
      console.warn('[completeTest] WARNING: Only', Object.keys(allPhaseData).length, 'phases have data');
    }

    // Generate clinical indicators comparing phases
    let clinicalIndicators = {
      risk_level: 'low',
      findings: [],
      clinical_notes: '',
      comparison: {}
    };

    if (allPhaseData.baseline && allPhaseData.hyperventilation && allPhaseData.recovery) {
      clinicalIndicators = generateClinicalIndicators(
        allPhaseData.baseline,
        allPhaseData.hyperventilation,
        allPhaseData.recovery
      );
    }

    // Prepare comprehensive summary
    const summary = {
      phaseAnalysis,
      clinicalIndicators,
      epilepsyScreening: {
        riskLevel: clinicalIndicators.risk_level,
        screeningFlag: clinicalIndicators.risk_level === 'high' ? 'Possible abnormality detected' : 'No significant abnormality detected',
        recommendedAction: clinicalIndicators.risk_level === 'high' ? 'Further evaluation recommended' : 'Routine follow-up'
      }
    };

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
