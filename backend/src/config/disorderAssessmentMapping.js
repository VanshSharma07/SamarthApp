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
  eyeMovement: [
    'eye', 'eye_movement', 'eyeMovement', 'oculomotor', 'saccade', 'fixation',
    'eye-movement', 'eye movement', 'eye_movement_assessment', 'eyeMovementAssessment', 'eye movement assessment'
  ],
  tremor: ['tremor', 'hand_tremor', 'tremorAssessment', 'tremor assessment', 'tremor_test'],
  responseTime: [
    'reaction', 'reaction_time', 'response', 'responseTime', 'response time',
    'response_time_assessment', 'responseTimeAssessment', 'reaction test'
  ],
  gaitAnalysis: [
    'gait', 'gait_analysis', 'gaitAnalysis', 'walk', 'gait analysis', 'gait_analysis_assessment',
    'gaitAnalysisAssessment', 'walking', 'walk assessment'
  ],
  fingerTapping: [
    'finger', 'finger_tapping', 'fingerTapping', 'tapping', 'finger tapping assessment',
    'finger_tapping_assessment', 'fingerTappingAssessment', 'tapping test'
  ],
  speechPattern: [
    'speech', 'speech_pattern', 'speechPattern', 'voice', 'speech assessment',
    'speech_assessment', 'speechPatternAssessment', 'speech pattern assessment'
  ],
  wordList: ['word_list', 'wordList', 'memory_words', 'wordlist', 'word list', 'wordlist test', 'word_list_test', 'memory test'],
  stroop: ['stroop', 'stroop_test', 'stroop test', 'stroopTest', 'stroop_test_assessment'],
  conversationalScreening: [
    'conversation', 'conversational', 'conversationalScreening', 'language', 'conversation_screening',
    'conversational screening', 'conversationalScreeningAssessment', 'language_screening', 'conversational assessment'
  ],
  neuro: ['neuro', 'eeg', 'ecg', 'neuro_eeg_ecg', 'neuro test', 'neuro_assessment', 'eeg_ecg', 'neurotest'],
  hyperventilation: [
    'hyperventilation', 'hv', 'hyperventilation_test', 'hyperventilation assessment', 'hyperventilationAssessment',
    'hv_test', 'hyper ventilation'
  ]
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
