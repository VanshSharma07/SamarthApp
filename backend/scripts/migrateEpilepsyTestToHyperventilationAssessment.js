import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EpilepsyTest from '../src/models/EpilepsyTest.js';
import SignalFrame from '../src/models/SignalFrame.js';
import HyperventilationAssessment from '../src/models/HyperventilationAssessment.js';
import User from '../src/models/User.js';

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[Migration] Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrateEpilepsyTestToHyperventilationAssessment() {
  try {
    console.log('[Migration] Starting migration of EpilepsyTest data to HyperventilationAssessment...');

    // Get all EpilepsyTest documents
    const tests = await EpilepsyTest.find({}).exec();
    console.log(`[Migration] Found ${tests.length} EpilepsyTest documents`);

    let migratedCount = 0;
    let failedCount = 0;

    for (const test of tests) {
      try {
        // Skip if assessment already exists for this test
        const existing = await HyperventilationAssessment.findOne({ testId: test._id });
        if (existing) {
          console.log(`[Migration] Skipping test ${test._id} - assessment already exists`);
          continue;
        }

        // Get all signal frames for this test
        const frames = await SignalFrame.find({ testId: test._id }).sort({ timestamp: 1 }).exec();
        
        if (frames.length === 0) {
          console.warn(`[Migration] No signal frames found for test ${test._id}, skipping...`);
          continue;
        }

        // Organize frames by phase
        const framesByPhase = {};
        test.phases.forEach(phase => {
          framesByPhase[phase.name] = [];
        });

        frames.forEach(frame => {
          // Find which phase this frame belongs to based on timestamp and phase durations
          let currentTime = 0;
          for (const phase of test.phases) {
            const phaseEnd = currentTime + (phase.duration || 60) * 1000;
            if (frame.timestamp >= phase.startTime && frame.timestamp <= phase.startTime + (phase.duration || 60) * 1000) {
              if (!framesByPhase[phase.name]) {
                framesByPhase[phase.name] = [];
              }
              framesByPhase[phase.name].push(frame);
              break;
            }
            currentTime += (phase.duration || 60) * 1000;
          }
        });

        console.log(`[Migration] Test ${test._id}: Found ${frames.length} total frames across ${Object.keys(framesByPhase).length} phases`);

        // Extract metrics for each phase
        const baselineFrames = framesByPhase['baseline'] || [];
        const hvFrames = framesByPhase['hyperventilation'] || [];
        const recoveryFrames = framesByPhase['recovery'] || [];

        const extractPhaseData = (phaseFrames, phaseName) => {
          if (phaseFrames.length === 0) {
            return {
              duration: 0,
              heartRate: 0,
              bandPowers: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
              spikes: 0
            };
          }

          const avgHR = phaseFrames.reduce((sum, f) => sum + (f.hr || 0), 0) / phaseFrames.length;
          const phaseData = test.phases.find(p => p.name === phaseName) || {};
          
          return {
            duration: phaseData.duration || 60,
            heartRate: Math.round(avgHR),
            bandPowers: phaseData.bandPowers || { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
            spikes: phaseData.spikes || 0
          };
        };

        const baselineData = extractPhaseData(baselineFrames, 'baseline');
        const hvData = extractPhaseData(hvFrames, 'hyperventilation');
        const recoveryData = extractPhaseData(recoveryFrames, 'recovery');

        // Calculate clinical indicators
        const alphaSuppression = baselineData.bandPowers.alpha > 0 
          ? ((baselineData.bandPowers.alpha - hvData.bandPowers.alpha) / baselineData.bandPowers.alpha) * 100 
          : 0;

        const deltaIncrease = baselineData.bandPowers.delta > 0 
          ? ((hvData.bandPowers.delta - baselineData.bandPowers.delta) / baselineData.bandPowers.delta) * 100 
          : 0;

        const alphaRecovery = hvData.bandPowers.alpha > 0 
          ? ((recoveryData.bandPowers.alpha - hvData.bandPowers.alpha) / hvData.bandPowers.alpha) * 100 
          : 0;

        const totalSpikes = baselineData.spikes + hvData.spikes + recoveryData.spikes;
        const riskLevel = totalSpikes > 10 ? 'high' : totalSpikes > 5 ? 'moderate' : 'low';

        // Create HyperventilationAssessment document
        const assessment = new HyperventilationAssessment({
          userId: test.userId,
          testId: test._id,
          timestamp: test.createdAt || new Date(),
          type: 'hyperventilation',
          status: test.status === 'completed' ? 'COMPLETED' : 'IN_PROGRESS',
          metrics: {
            riskLevel,
            screeningFlag: riskLevel === 'high' ? 'Possible abnormality detected' : 'No significant abnormality detected',
            recommendedAction: riskLevel === 'high' ? 'Further evaluation recommended' : 'Routine follow-up',
            baseline: baselineData,
            hyperventilation: { ...hvData, alphaSuppression: Math.round(alphaSuppression) },
            recovery: recoveryData,
            clinicalIndicators: {
              findings: totalSpikes > 0 ? [`${totalSpikes} abnormal spikes detected`] : [],
              clinicalNotes: test.summaryMetrics?.clinicalIndicators?.clinical_notes || '',
              comparison: {
                baselineVsHv: {
                  alphaSuppression: Math.round(alphaSuppression),
                  deltaIncrease: Math.round(deltaIncrease)
                },
                hvVsRecovery: {
                  alphaRecovery: Math.round(alphaRecovery),
                  deltaDecrease: totalSpikes > 0 ? -Math.round(deltaIncrease) : 0
                },
                overallResponse: riskLevel === 'low' ? 'Normal response' : 'Abnormal response detected'
              }
            },
            summaryMetrics: {
              totalDuration: (baselineData.duration + hvData.duration + recoveryData.duration),
              overallRiskScore: riskLevel === 'high' ? 75 : riskLevel === 'moderate' ? 50 : 25,
              abnormalityDetected: riskLevel !== 'low'
            }
          }
        });

        await assessment.save();
        migratedCount++;
        console.log(`[Migration] ✓ Migrated test ${test._id} → Assessment created`);

      } catch (error) {
        failedCount++;
        console.error(`[Migration] ✗ Failed to migrate test ${test._id}:`, error.message);
      }
    }

    console.log(`\n[Migration] Migration complete!`);
    console.log(`[Migration] Successfully migrated: ${migratedCount} tests`);
    console.log(`[Migration] Failed: ${failedCount} tests`);

    const assessmentCount = await HyperventilationAssessment.countDocuments();
    console.log(`[Migration] Total HyperventilationAssessment documents: ${assessmentCount}`);

  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Migration] Database connection closed');
  }
}

// Run migration
await connectDB();
await migrateEpilepsyTestToHyperventilationAssessment();
