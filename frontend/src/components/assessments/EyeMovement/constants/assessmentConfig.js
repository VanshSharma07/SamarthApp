export const ASSESSMENT_PHASES = {
  CALIBRATION: {
    duration: 3000,
    instruction: "Look straight ahead and keep your head still",
    type: "calibration",
    pattern: "center"
  },
  SACCADIC_TEST: {
    duration: 6000,
    instruction: "Follow the jumping dot quickly as it appears",
    type: "saccadic",
    pattern: [
      {x: 20, y: 50}, {x: 80, y: 50},
      {x: 50, y: 20}, {x: 50, y: 80}
    ]
  },
  PURSUIT_TEST: {
    duration: 6000,
    instruction: "Follow the moving dot smoothly",
    type: "pursuit",
    pattern: "circular"
  },
  FIXATION_TEST: {
    duration: 3000,
    instruction: "Focus on the central dot without moving your eyes",
    type: "fixation",
    pattern: "center"
  }
};

export const NEUROLOGICAL_THRESHOLDS = {
  SACCADIC_LATENCY: {
    normal: { min: 150, max: 250 },
    warning: { min: 250, max: 300 },
    critical: { min: 300, max: Infinity }
  },
  PURSUIT_SMOOTHNESS: {
    normal: { min: 0.8, max: 1.0 },
    warning: { min: 0.6, max: 0.8 },
    critical: { min: 0, max: 0.6 }
  }
};