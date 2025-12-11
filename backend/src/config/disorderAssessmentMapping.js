// Central configuration for disorder-assessment relationships and normalization

// Disorders supported
export const DISORDER_CONFIG = {
  parkinsonsDisease: {
    key: 'parkinsonsDisease',
    label: "Parkinson's Disease",
    assessments: ['eyeMovement', 'tremor', 'responseTime', 'gaitAnalysis', 'fingerTapping', 'speechPattern']
  },
  alzheimersDisease: {
    key: 'alzheimersDisease',
    label: "Alzheimer's Disease",
    assessments: ['responseTime', 'gaitAnalysis', 'speechPattern', 'wordList', 'stroop', 'conversationalScreening']
  },
  epilepsy: {
    key: 'epilepsy',
    label: 'Epilepsy',
    assessments: ['eyeMovement', 'neuro', 'hyperventilation']
  }
};

// Canonical assessment type keys used across backend
export const ASSESSMENT_TYPE_MAP = {
  eyeMovement: ['eye', 'eye_movement', 'eyeMovement', 'oculomotor', 'saccade', 'fixation'],
  tremor: ['tremor', 'hand_tremor', 'tremorAssessment'],
  responseTime: ['reaction', 'reaction_time', 'response', 'responseTime'],
  gaitAnalysis: ['gait', 'gait_analysis', 'gaitAnalysis', 'walk'],
  fingerTapping: ['finger', 'finger_tapping', 'fingerTapping', 'tapping'],
  speechPattern: ['speech', 'speech_pattern', 'speechPattern', 'voice'],
  wordList: ['word_list', 'wordList', 'memory_words'],
  stroop: ['stroop', 'stroop_test'],
  conversationalScreening: ['conversation', 'conversational', 'conversationalScreening', 'language'],
  neuro: ['neuro', 'eeg', 'ecg', 'neuro_eeg_ecg'],
  hyperventilation: ['hyperventilation', 'hv', 'hyperventilation_test']
};

// Normalize incoming assessment type strings to canonical keys
export function normalizeAssessmentType(type) {
  if (!type) return null;
  const t = String(type).trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(ASSESSMENT_TYPE_MAP)) {
    if (aliases.some(a => a.toLowerCase() === t || t.includes(a.toLowerCase()))) {
      return canonical;
    }
  }
  return null;
}

export function getAllDisorders() {
  return Object.keys(DISORDER_CONFIG);
}
