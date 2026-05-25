import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
import AssessmentSession from '../src/models/AssessmentSession.js';
import GaitAnalysisAssessment from '../src/models/GaitAnalysisAssessment.js';
import TremorAssessment from '../src/models/TremorAssessment.js';
import SpeechPatternAssessment from '../src/models/SpeechPatternAssessment.js';
import FacialSymmetryAssessment from '../src/models/FacialSymmetryAssessment.js';
import FingerTappingAssessment from '../src/models/FingerTappingAssessment.js';
import HyperventilationAssessment from '../src/models/HyperventilationAssessment.js';
import NeckMobilityAssessment from '../src/models/NeckMobilityAssessment.js';
import ResponseTimeAssessment from '../src/models/ResponseTimeAssessment.js';
import StroopAssessment from '../src/models/StroopAssessment.js';
import EyeMovementAssessment from '../src/models/EyeMovementAssessment.js';

// Random data generators
const randomScore = (min, max) => Math.round(Math.random() * (max - min) + min);
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
const randomArray = (size, min, max) => Array.from({ length: size }, () => Number(randomFloat(min, max)));

import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/samarth';
    console.log(`Connecting to MongoDB at ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected directly to MongoDB.');

    // Ask the user for a User ID
    let userId = await askQuestion('Please enter the User ID to seed data for: ');
    userId = userId.trim();
    
    if (!userId) {
      console.log('No User ID provided. Using a fallback random ID.');
      userId = 'user_' + Math.random().toString(36).substring(2, 9);
    }
    rl.close();

    // Define Patient ID (can also be linked or mocked)
    const patientId = new mongoose.Types.ObjectId();
    console.log(`\nGenerating data for User ID: ${userId}, Patient ID: ${patientId}`);

    const baseData = {
      userId,
      timestamp: new Date(),
      status: 'COMPLETED'
    };

    // 1. Gait Analysis
    const gait = new GaitAnalysisAssessment({
      ...baseData,
      metrics: {
        // Legacy root fields needed for AssessmentCard summary
        overall: { stabilityScore: randomScore(70, 95) },
        stability: { score: randomScore(70, 95) },
        balance: { score: randomScore(60, 90) },
        symmetry: { overall: randomScore(75, 95) },

        // Detailed metrics needed for the Modal HybridGaitInsights
        summary: {
          overallAssessment: { score: randomScore(75, 95), duration: '2m 30s' },
          sensorStatus: { fsr: 'Active', imu: 'Active' },
          keyMetrics: { mobility: 'Good', stability: 'Excellent', symmetry: 'Fair' }
        },
        sampleCount: randomScore(1000, 2000),
        abnormalities: [],
        recommendations: [
          { priority: 'Info', category: 'General', recommendation: 'Continue regular walks', rationale: 'Maintains mobility' }
        ],
        insights: [
          { priority: 'Info', category: 'Symmetry', finding: 'Good balance', interpretation: 'Slight deviation but normal.', source: 'Hybrid Model' }
        ],
        hybrid: {
          jointAngles: {
            hipLeft: { cv: 12, accuracy: 'High' },
            hipRight: { cv: 11, accuracy: 'High' },
            kneeLeft: { cv: 15, accuracy: 'Medium' },
            kneeRight: { cv: 16, accuracy: 'High' }
          },
          gaitTiming: {
            strideTime: { sensor: '1.2s', normalRange: '1.0s - 1.5s', assessment: 'Normal' },
            cadence: { sensor: '105 steps/min', normalRange: '100 - 110', assessment: 'Normal' }
          },
          stability: { 
            overallScore: { combined: randomScore(75, 95), assessment: 'Good' },
            dynamicSway: { mlSway: Number(randomFloat(0.2, 0.8)), apSway: Number(randomFloat(0.1, 0.5)) }
          },
          pressure: {
            left: { sensor1: 12, sensor2: 45, sensor3: 20, sensor4: 10, sensor5: 5, sensor6: 8, heelRatio: 60, forefootRatio: 40 },
            right: { sensor1: 15, sensor2: 40, sensor3: 25, sensor4: 12, sensor5: 4, sensor6: 4, heelRatio: 55, forefootRatio: 45 }
          }
        }
      }
    });

    // 2. Tremor Assessment
    const tremor = new TremorAssessment({
      ...baseData,
      metrics: {
        tremor_frequency: randomFloat(3, 8),
        tremor_amplitude: randomFloat(0.1, 1.5),
        tremor_type: 'Action/Intention',
        severity: 'Mild',
        peak_count: randomScore(10, 50),
        overall: { tremorScore: randomScore(40, 90), symmetryScore: randomScore(60, 95) }
      }
    });

    // 3. Speech Pattern Assessment
    const speech = new SpeechPatternAssessment({
      ...baseData,
      metrics: {
        clarity: { score: randomScore(60, 95) },
        speechRate: { wordsPerMinute: randomScore(100, 160) },
        volumeControl: { score: randomScore(70, 95) },
        emotion: { confidence: randomScore(60, 90), hesitation: randomScore(10, 40), stress: randomScore(20, 60), monotony: randomScore(10, 30) },
        overallScore: randomScore(70, 95),
        articulation: { precision: randomScore(70, 95), vowel_formation: randomScore(70, 95), consonant_precision: randomScore(70, 95), slurred_speech: randomScore(5, 20) },
        fluency: { fluency_score: randomScore(70, 95), words_per_minute: randomScore(100, 150), pause_rate: randomFloat(0.1, 0.5) },
        pitch_stability: randomScore(70, 90)
      }
    });

    // 4. Facial Symmetry Assessment
    const facial = new FacialSymmetryAssessment({
      ...baseData,
      symmetry_score: randomScore(75, 98),
      metrics: {
        eye_symmetry: randomScore(80, 98),
        mouth_symmetry: randomScore(75, 95),
        jaw_symmetry: randomScore(80, 95),
        eyebrow_symmetry: randomScore(70, 95),
        face_tilt: randomFloat(0, 5)
      },
      neurological_indicators: {
        bells_palsy: { score: randomScore(5, 25), risk: 'low' },
        stroke: { score: randomScore(5, 15), risk: 'low' },
        parkinsons: { score: randomScore(10, 30), risk: 'low' },
        overall: { score: randomScore(10, 20), risk: 'low' }
      }
    });

    // 5. Finger Tapping Assessment
    const fingerTapping = new FingerTappingAssessment({
      ...baseData,
      metrics: {
        frequency: randomFloat(2, 6),
        amplitude: randomFloat(10, 30),
        rhythm: randomScore(70, 95),
        accuracy: randomScore(80, 98),
        duration: 30,
        overallScore: randomScore(75, 95)
      }
    });

    // 6. Hyperventilation Assessment
    const hyperventilation = new HyperventilationAssessment({
      ...baseData,
      metrics: {
        riskLevel: 'low',
        screeningFlag: 'No significant abnormality detected',
        recommendedAction: 'Routine follow-up',
        baseline: { duration: 60, heartRate: randomScore(60, 80), spikes: 0 },
        hyperventilation: { duration: 180, heartRate: randomScore(90, 130), spikes: randomScore(0, 2), alphaSuppression: randomFloat(10, 30) },
        recovery: { duration: 120, heartRate: randomScore(70, 90), spikes: 0 },
        summaryMetrics: { totalDuration: 360, overallRiskScore: randomScore(10, 30), abnormalityDetected: false }
      }
    });

    // 7. Neck Mobility Assessment
    const neckMobility = new NeckMobilityAssessment({
      ...baseData,
      metrics: {
        flexion: { degrees: randomScore(40, 60), percent: randomScore(80, 100) },
        extension: { degrees: randomScore(40, 70), percent: randomScore(80, 100) },
        rotation: { left: { degrees: randomScore(60, 80), percent: randomScore(80, 100) }, right: { degrees: randomScore(60, 80), percent: randomScore(80, 100) } },
        lateralBending: { left: { degrees: randomScore(30, 45), percent: randomScore(80, 100) }, right: { degrees: randomScore(30, 45), percent: randomScore(80, 100) } },
        overall: { mobilityScore: randomScore(75, 95), symmetryScore: randomScore(80, 95) }
      }
    });

    // 8. Response Time Assessment
    const responseTime = new ResponseTimeAssessment({
      ...baseData,
      metrics: {
        averageResponseTime: `${randomFloat(200, 450)}ms`,
        fastestResponse: `${randomFloat(150, 250)}ms`,
        slowestResponse: `${randomFloat(400, 800)}ms`,
        totalRounds: 10,
        completedRounds: 10,
        duration: '1m 30s',
        overall: { responseScore: randomScore(60, 95) }
      }
    });

    // 9. Stroop Assessment
    const stroop = new StroopAssessment({
      ...baseData,
      score: randomScore(15, 25),
      total: 25,
      accuracy: Number(randomFloat(0.8, 1.0))
    });

    // 10. Eye Movement Assessment
    const eyeMovement = new EyeMovementAssessment({
      ...baseData,
      metrics: {
        CALIBRATION: { summary: { accuracy: randomScore(85, 98), symmetry_score: randomScore(80, 95) } },
        SACCADIC_TEST: { summary: { mean_velocity: randomFloat(200, 400), precision_score: randomScore(70, 95) } },
        overall: { velocityScore: randomScore(70, 90), accuracyScore: randomScore(75, 95), smoothnessScore: randomScore(70, 90), compositeScore: randomScore(75, 92) }
      }
    });

    // 12. Assessment Session Wrapper
    const session = new AssessmentSession({
      patientId: patientId,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(),
      hrStats: { min: randomScore(60, 70), max: randomScore(110, 140), avg: randomScore(75, 90) },
      hrvStats: { rmssd: randomFloat(30, 60), sdnn: randomFloat(40, 80) },
      overallRiskScore: randomScore(10, 40)
    });

    // Save everything
    await Promise.all([
      gait.save(),
      tremor.save(),
      speech.save(),
      facial.save(),
      fingerTapping.save(),
      hyperventilation.save(),
      neckMobility.save(),
      responseTime.save(),
      stroop.save(),
      eyeMovement.save(),
      session.save()
    ]);

    console.log('✅ Successfully seeded real-looking data for all assessment models!');
    console.log(`Generated records belong to generic userId: ${userId} and patientId: ${patientId}`);
    
  } catch (err) {
    console.error('❌ Error during database seeding:', err);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

seedData();
