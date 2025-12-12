import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EpilepsyTest from '../src/models/EpilepsyTest.js';
import SignalFrame from '../src/models/SignalFrame.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/samarth';

// Generate realistic normal EEG data
function generateNormalEEG(baseFrequency = 10, amplitude = 20) {
  const samples = [];
  for (let i = 0; i < 256; i++) {
    // Simulate alpha wave (8-12 Hz) with some noise
    const alpha = amplitude * Math.sin(2 * Math.PI * baseFrequency * i / 256);
    const noise = (Math.random() - 0.5) * 5;
    samples.push(Math.round(alpha + noise));
  }
  return samples;
}

// Generate EEG data with alpha suppression (for hyperventilation phase)
function generateAlphaSuppressionEEG() {
  const samples = [];
  for (let i = 0; i < 256; i++) {
    // Higher frequency content (theta/beta) with reduced alpha
    const beta = 15 * Math.sin(2 * Math.PI * 20 * i / 256);
    const theta = 10 * Math.sin(2 * Math.PI * 6 * i / 256);
    const noise = (Math.random() - 0.5) * 5;
    samples.push(Math.round(beta + theta + noise));
  }
  return samples;
}

// Generate recovery phase EEG (alpha returns)
function generateRecoveryEEG() {
  const samples = [];
  for (let i = 0; i < 256; i++) {
    // Alpha returns to baseline
    const alpha = 18 * Math.sin(2 * Math.PI * 10 * i / 256);
    const theta = 5 * Math.sin(2 * Math.PI * 6 * i / 256);
    const noise = (Math.random() - 0.5) * 5;
    samples.push(Math.round(alpha + theta + noise));
  }
  return samples;
}

async function seedHyperventilationTest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Accept an explicit userId via CLI arg (--userId=...) or env (SEED_USER_ID)
    const argUserId = process.argv.find(arg => arg.startsWith('--userId='));
    const providedUserId = argUserId ? argUserId.split('=')[1] : process.env.SEED_USER_ID;

    // Get or create a test user
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
          password: 'hashedpassword', // In real app, this would be hashed
          name: 'Test User',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        });
        console.log('✓ Created test user');
      } else {
        console.log('✓ Using existing test user');
      }
    }

    // Create EpilepsyTest document
    const now = new Date();
    const testStartTime = now.getTime() - 300000; // 5 minutes ago

    const epilepsyTest = await EpilepsyTest.create({
      userId: testUser._id,
      testType: 'hyperventilation',
      startedAt: new Date(testStartTime),
      endedAt: new Date(now),
      status: 'completed',
      phases: [
        {
          phaseName: 'baseline',
          startTime: new Date(testStartTime),
          endTime: new Date(testStartTime + 60000) // 60 seconds
        },
        {
          phaseName: 'hyperventilation',
          startTime: new Date(testStartTime + 60000),
          endTime: new Date(testStartTime + 120000) // 60 seconds
        },
        {
          phaseName: 'recovery',
          startTime: new Date(testStartTime + 120000),
          endTime: new Date(testStartTime + 180000) // 60 seconds
        }
      ],
      summaryMetrics: {
        baselineHR: 72,
        hvHR: 95,
        recoveryHR: 78
      },
      rawDataRef: 'testdata'
    });

    console.log('✓ Created EpilepsyTest document:', epilepsyTest._id);

    // Generate signal frames for each phase
    const signalFrames = [];
    const frameInterval = 50; // 50ms between frames for realistic timing

    // Baseline phase - normal alpha rhythm (60 seconds = 1200 frames)
    for (let i = 0; i < 60; i++) {
      const timestamp = testStartTime + (i * 1000);
      signalFrames.push({
        testId: epilepsyTest._id,
        timestamp,
        eeg: generateNormalEEG(10, 20), // Normal alpha
        ecg: [],
        hr: 72
      });
    }

    // Hyperventilation phase - alpha suppression (60 seconds = 60 frames)
    for (let i = 0; i < 60; i++) {
      const timestamp = testStartTime + (60000 + i * 1000);
      signalFrames.push({
        testId: epilepsyTest._id,
        timestamp,
        eeg: generateAlphaSuppressionEEG(), // Suppressed alpha
        ecg: [],
        hr: 92 + Math.floor(Math.random() * 6) // 92-98 bpm during HV
      });
    }

    // Recovery phase - alpha returns (60 seconds = 60 frames)
    for (let i = 0; i < 60; i++) {
      const timestamp = testStartTime + (120000 + i * 1000);
      signalFrames.push({
        testId: epilepsyTest._id,
        timestamp,
        eeg: generateRecoveryEEG(), // Alpha recovery
        ecg: [],
        hr: Math.floor(78 + (30 - i) * 0.5) // Gradually return to baseline
      });
    }

    await SignalFrame.insertMany(signalFrames);
    console.log(`✓ Created ${signalFrames.length} signal frames`);

    // Summary of what was created
    console.log('\n═══════════════════════════════════════════');
    console.log('Hyperventilation Test Data Seeded Successfully');
    console.log('═══════════════════════════════════════════');
    console.log(`Test ID: ${epilepsyTest._id}`);
    console.log(`User ID: ${testUser._id}`);
    console.log(`User Email: ${testUser.email}`);
    console.log(`Test Status: ${epilepsyTest.status}`);
    console.log(`Started: ${new Date(testStartTime).toISOString()}`);
    console.log(`Ended: ${now.toISOString()}`);
    console.log(`\nExpected Results (Normal User):`);
    console.log(`  - Risk Level: LOW`);
    console.log(`  - Baseline Spikes: 0`);
    console.log(`  - HV Spikes: 0`);
    console.log(`  - Recovery Spikes: 0`);
    console.log(`  - Alpha Suppression: ~15-20%`);
    console.log(`  - Delta Increase: ~5-10%`);
    console.log(`  - Screening Flag: NORMAL`);
    console.log(`  - Recommended Action: Continue monitoring`);
    console.log('═══════════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding hyperventilation test:', error);
    process.exit(1);
  }
}

seedHyperventilationTest();
