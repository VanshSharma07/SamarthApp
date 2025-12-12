# Hyperventilation Test Database Seeding

This script seeds the database with realistic hyperventilation test data for a normal user.

## What Gets Created

The seed script creates:

1. **Test User** (if not exists)
   - Email: `testuser@example.com`
   - Name: Test User
   - Age: 35

2. **EpilepsyTest Document**
   - Test Type: hyperventilation
   - Status: completed
   - Three phases: baseline (60s) → hyperventilation (60s) → recovery (60s)
   - Heart rate progression: 72 → 95 → 78 bpm

3. **Signal Frames** (180 frames total)
   - **Baseline Phase**: Normal alpha rhythm (8-12 Hz)
   - **Hyperventilation Phase**: Alpha suppression with higher frequency content
   - **Recovery Phase**: Alpha rhythm returns to baseline

## Expected Results

The seeded test displays as a **normal user** with:

- **Risk Level**: LOW
- **Baseline Spikes**: 0
- **HV Spikes**: 0
- **Recovery Spikes**: 0
- **Alpha Suppression**: ~15-20%
- **Delta Increase**: ~5-10%
- **Screening Flag**: NORMAL
- **Recommended Action**: Continue monitoring

This represents a healthy response to hyperventilation with proper alpha suppression and recovery.

## How to Run

From the backend directory:

```bash
npm run seed:hyperventilation
```

Or with Node directly:

```bash
node scripts/seedHyperventilationTest.js
```

## Prerequisites

- MongoDB must be running
- Environment variables set (`.env` file with `MONGODB_URI`)
- Or MongoDB running on default `mongodb://localhost:27017/samarth`

## What the Script Does

1. Connects to MongoDB
2. Creates/uses a test user
3. Creates a completed EpilepsyTest document with:
   - 3 phases with realistic timestamps
   - Summary metrics with HR data
4. Generates 180 signal frames with realistic EEG data:
   - 60 frames for baseline (normal alpha)
   - 60 frames for hyperventilation (suppressed alpha)
   - 60 frames for recovery (alpha returns)
5. Prints success summary with test ID and expected results

## Notes

- Timestamps are set to ~5 minutes ago so tests appear recent
- EEG data is synthesized using sine waves to simulate realistic alpha/theta/beta activity
- No abnormal spikes are generated (characteristic of normal user)
- Heart rate progression is realistic (increases during HV, returns during recovery)
