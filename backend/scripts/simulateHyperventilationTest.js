import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EpilepsyTest from '../src/models/EpilepsyTest.js';
import SignalFrame from '../src/models/SignalFrame.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/samarth';
const SAMPLE_COUNT = 256;
const PHASE_SECONDS = 10;
const FRAMES_PER_SECOND = 1;

function generateEEG({
  alphaAmp = 20,
  alphaFreq = 10,
  betaAmp = 6,
  betaFreq = 20,
  thetaAmp = 4,
  thetaFreq = 6,
  noiseAmp = 3,
  spikeChance = 0,
  spikeAmp = 220
} = {}) {
  const samples = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const alpha = alphaAmp * Math.sin(2 * Math.PI * alphaFreq * i / SAMPLE_COUNT);
    const beta = betaAmp * Math.sin(2 * Math.PI * betaFreq * i / SAMPLE_COUNT);
    const theta = thetaAmp * Math.sin(2 * Math.PI * thetaFreq * i / SAMPLE_COUNT);
    const noise = (Math.random() - 0.5) * noiseAmp;
    let value = alpha + beta + theta + noise;

    if (spikeChance > 0 && Math.random() < spikeChance) {
      const spike = spikeAmp * (Math.random() > 0.5 ? 1 : -1);
      value += spike;
    }

    samples.push(Math.round(value));
  }
  return samples;
}

async function simulateHyperventilationTest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const argUserId = process.argv.find(arg => arg.startsWith('--userId='));
    const providedUserId = argUserId ? argUserId.split('=')[1] : process.env.SEED_USER_ID;

    let testUser;
    if (providedUserId) {
      testUser = await User.findById(providedUserId);
      if (!testUser) {
        throw new Error(`User with id ${providedUserId} not found`);
      }
      console.log('✓ Using provided user', providedUserId);
    } else {
      testUser = await User.findOne({ email: 'testuser@example.com' });
      if (!testUser) {
        testUser = await User.create({
          email: 'testuser@example.com',
          password: 'hashedpassword',
          name: 'Test User',
          profile: { firstName: 'Test', lastName: 'User' }
        });
        console.log('✓ Created test user');
      } else {
        console.log('✓ Using existing test user');
      }
    }

    const now = new Date();
    const testStartTime = now.getTime() - ((PHASE_SECONDS * 3) * 1000);

    const phaseStart = (index) => new Date(testStartTime + (index * PHASE_SECONDS * 1000));
    const phaseEnd = (index) => new Date(testStartTime + ((index + 1) * PHASE_SECONDS * 1000));

    const epilepsyTest = await EpilepsyTest.create({
      userId: testUser._id,
      testType: 'hyperventilation',
      startedAt: new Date(testStartTime),
      endedAt: now,
      status: 'completed',
      phases: [
        { phaseName: 'baseline', startTime: phaseStart(0), endTime: phaseEnd(0) },
        { phaseName: 'hyperventilation', startTime: phaseStart(1), endTime: phaseEnd(1) },
        { phaseName: 'recovery', startTime: phaseStart(2), endTime: phaseEnd(2) }
      ],
      summaryMetrics: {
        baselineHR: 70,
        hvHR: 92,
        recoveryHR: 76
      },
      rawDataRef: 'simulation'
    });

    console.log('✓ Created EpilepsyTest document:', epilepsyTest._id);

    const signalFrames = [];
    const frameIntervalMs = Math.round(1000 / FRAMES_PER_SECOND);
    const totalFramesPerPhase = PHASE_SECONDS * FRAMES_PER_SECOND;

    for (let i = 0; i < totalFramesPerPhase; i += 1) {
      const timestamp = testStartTime + (i * frameIntervalMs);
      signalFrames.push({
        testId: epilepsyTest._id,
        timestamp,
        eeg: generateEEG({
          alphaAmp: 22,
          betaAmp: 4,
          thetaAmp: 3,
          noiseAmp: 2.5,
          spikeChance: 0
        }),
        hr: 70 + Math.floor(Math.random() * 4)
      });
    }

    for (let i = 0; i < totalFramesPerPhase; i += 1) {
      const timestamp = testStartTime + ((PHASE_SECONDS + i) * frameIntervalMs);
      signalFrames.push({
        testId: epilepsyTest._id,
        timestamp,
        eeg: generateEEG({
          alphaAmp: 10,
          betaAmp: 14,
          thetaAmp: 10,
          noiseAmp: 4,
          spikeChance: 0.0008,
          spikeAmp: 200
        }),
        hr: 90 + Math.floor(Math.random() * 6)
      });
    }

    for (let i = 0; i < totalFramesPerPhase; i += 1) {
      const timestamp = testStartTime + ((PHASE_SECONDS * 2 + i) * frameIntervalMs);
      signalFrames.push({
        testId: epilepsyTest._id,
        timestamp,
        eeg: generateEEG({
          alphaAmp: 18,
          betaAmp: 6,
          thetaAmp: 4,
          noiseAmp: 2.5,
          spikeChance: 0
        }),
        hr: 76 + Math.floor(Math.random() * 4)
      });
    }

    await SignalFrame.insertMany(signalFrames);
    console.log(`✓ Created ${signalFrames.length} signal frames (healthy simulation)`);

    console.log('\n═══════════════════════════════════════════');
    console.log('Hyperventilation Test Simulation Complete');
    console.log('═══════════════════════════════════════════');
    console.log(`Test ID: ${epilepsyTest._id}`);
    console.log(`User ID: ${testUser._id}`);
    console.log(`Phases: baseline → hyperventilation → recovery`);
    console.log(`Phase Duration: ${PHASE_SECONDS}s each`);
    console.log('Expected behavior: mild HV spikes, recovery back to baseline');
    console.log('═══════════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error simulating hyperventilation test:', error);
    process.exit(1);
  }
}

simulateHyperventilationTest();
