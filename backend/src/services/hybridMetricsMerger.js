/**
 * Hybrid Gait Analysis Metrics Merger
 * Combines CV-based metrics with sensor-based metrics
 */

export const hybridMetricsMerger = {
  /**
   * Merge CV metrics with sensor metrics
   */
  mergeMetrics(cvMetrics, sensorMetrics) {
    return {
      timestamp: new Date().toISOString(),
      hybrid: {
        jointAngles: this.mergeJointAngles(cvMetrics, sensorMetrics),
        gaitTiming: this.mergeGaitTiming(cvMetrics, sensorMetrics),
        balance: this.mergeBalance(cvMetrics, sensorMetrics),
        stability: this.mergeStability(cvMetrics, sensorMetrics),
        symmetry: this.mergeSymmetry(cvMetrics, sensorMetrics),
        pressure: sensorMetrics.pressureDistribution,
        posture: cvMetrics.metrics?.jointAngles || {},
        armSwing: cvMetrics.metrics?.armSwing || {},
        stepCharacteristics: this.mergeStepCharacteristics(cvMetrics, sensorMetrics)
      },
      insights: this.generateInsights(cvMetrics, sensorMetrics),
      abnormalities: sensorMetrics.abnormalities || [],
      summary: this.generateSummary(cvMetrics, sensorMetrics),
      recommendations: this.generateRecommendations(cvMetrics, sensorMetrics)
    };
  },

  /**
   * Merge joint angles from CV and IMU data
   */
  mergeJointAngles(cvMetrics, sensorMetrics) {
    const cvJoints = cvMetrics.metrics?.jointAngles || {};
    return {
      hips: {
        cv: cvJoints.hipAngles || 0,
        accuracy: 'High (CV-based)',
        symmetry: cvMetrics.metrics?.symmetry?.overall || 0
      },
      knees: {
        cv: cvJoints.kneeAngles || 0,
        accuracy: 'High (CV-based)',
        flexion: 'Normal gait cycle'
      },
      ankles: {
        cv: cvJoints.ankleAngles || 0,
        imEstimate: sensorMetrics.fsr?.left?.pronationSupination || {},
        dorsiflexion: 'Normal heel strike to toe-off'
      },
      trunk: {
        lean: cvMetrics.metrics?.trunkLean || 0,
        rotation: 'Within normal limits'
      }
    };
  },

  /**
   * Merge gait timing metrics
   */
  mergeGaitTiming(cvMetrics, sensorMetrics) {
    const sensorTiming = sensorMetrics.gaitTiming || {};
    const cvGait = cvMetrics.metrics?.gait || {};

    return {
      stepTime: {
        sensor: sensorTiming.stepTime || 0,
        unit: 'seconds',
        normalRange: '0.38-0.46',
        assessment: this.assessMetric(sensorTiming.stepTime, 0.38, 0.46)
      },
      cadence: {
        sensor: sensorTiming.cadence || 0,
        unit: 'steps/minute',
        normalRange: '100-130',
        assessment: this.assessMetric(sensorTiming.cadence, 100, 130)
      },
      strideLength: {
        cv: cvGait.strideLength || 0,
        unit: 'relative',
        assessment: cvGait.strideLength ? 'Measured from computer vision' : 'Unable to calculate'
      },
      stancePhase: {
        sensor: {
          duration: sensorTiming.stanceTime || 0,
          percentageOfCycle: sensorTiming.stanceTime && sensorTiming.stepTime
            ? Math.round((sensorTiming.stanceTime / sensorTiming.stepTime) * 100)
            : 0
        },
        normalRange: '60-65%',
        assessment: 'From FSR heel strike and toe-off detection'
      },
      swingPhase: {
        sensor: {
          duration: sensorTiming.swingTime || 0,
          percentageOfCycle: sensorTiming.swingTime && sensorTiming.stepTime
            ? Math.round((sensorTiming.swingTime / sensorTiming.stepTime) * 100)
            : 0
        },
        normalRange: '35-40%',
        assessment: 'From FSR data'
      }
    };
  },

  /**
   * Merge balance metrics
   */
  mergeBalance(cvMetrics, sensorMetrics) {
    return {
      weightDistribution: {
        leftRight: sensorMetrics.fsr?.asymmetry?.symmetry || 0,
        unit: 'percent',
        assessment: sensorMetrics.fsr?.asymmetry?.asymmetryPercent > 20 
          ? 'Asymmetrical' 
          : 'Symmetrical'
      },
      postureAlignment: {
        cv: cvMetrics.metrics?.balance?.score || 0,
        unit: 'percent',
        assessment: 'From computer vision trunk and head alignment'
      },
      pressureDistribution: {
        heelToForefoot: {
          heelRatio: sensorMetrics.pressureDistribution?.left?.heelRatio || 0,
          forefootRatio: sensorMetrics.pressureDistribution?.left?.forefootRatio || 0
        },
        normalRange: 'Heel: 25-35%, Forefoot: 65-75%'
      }
    };
  },

  /**
   * Merge stability metrics
   */
  mergeStability(cvMetrics, sensorMetrics) {
    const imuStability = sensorMetrics.imu?.stability || {};
    const cvStability = cvMetrics.metrics?.stability || {};

    return {
      postural: {
        cv: cvStability.score || 0,
        unit: 'percent',
        assessment: 'From computer vision tracking'
      },
      dynamicSway: {
        mlSway: imuStability.mlSway || 0,
        apSway: imuStability.apSway || 0,
        unit: 'm/s²',
        assessment: imuStability.assessment || 'Unable to assess'
      },
      harmonicRatio: {
        imu: sensorMetrics.imu?.harmonicRatio?.ratio || 0,
        quality: sensorMetrics.imu?.harmonicRatio?.quality || 'unknown',
        assessment: 'From IMU vertical acceleration'
      },
      overallScore: {
        combined: Math.round(((cvStability.score || 0) + (imuStability.score || 0)) / 2),
        maxScore: 100,
        assessment: this.getScoreAssessment(Math.round(((cvStability.score || 0) + (imuStability.score || 0)) / 2))
      }
    };
  },

  /**
   * Merge symmetry metrics
   */
  mergeSymmetry(cvMetrics, sensorMetrics) {
    return {
      bilateral: {
        cv: cvMetrics.metrics?.symmetry?.overall || 0,
        assessment: 'From computer vision leg and arm movement comparison'
      },
      footContact: {
        sensor: sensorMetrics.fsr?.asymmetry?.symmetry || 0,
        assessment: 'From FSR pressure distribution asymmetry'
      },
      stepSymmetry: {
        assessment: sensorMetrics.fsr?.asymmetry?.asymmetryPercent > 20 
          ? `Asymmetrical: ${sensorMetrics.fsr.asymmetry.asymmetryPercent}% difference`
          : `Symmetrical: ${sensorMetrics.fsr?.asymmetry?.asymmetryPercent || 0}% difference`
      },
      overallAssessment: {
        score: Math.round(((cvMetrics.metrics?.symmetry?.overall || 0) + (sensorMetrics.fsr?.asymmetry?.symmetry || 0)) / 2),
        interpretation: 'Combined CV and sensor assessment'
      }
    };
  },

  /**
   * Merge step characteristics
   */
  mergeStepCharacteristics(cvMetrics, sensorMetrics) {
    const fsrMetrics = sensorMetrics.fsr || {};

    return {
      heelStrike: {
        detected: fsrMetrics.left?.heelStrike?.detected && fsrMetrics.right?.heelStrike?.detected,
        leftCount: fsrMetrics.left?.heelStrike?.count || 0,
        rightCount: fsrMetrics.right?.heelStrike?.count || 0,
        avgPressure: {
          left: fsrMetrics.left?.heelStrike?.avgPressure || 0,
          right: fsrMetrics.right?.heelStrike?.avgPressure || 0
        },
        assessment: 'From FSR heel sensors (1, 2)'
      },
      toeOff: {
        detected: fsrMetrics.left?.toeOff?.detected && fsrMetrics.right?.toeOff?.detected,
        leftCount: fsrMetrics.left?.toeOff?.count || 0,
        rightCount: fsrMetrics.right?.toeOff?.count || 0,
        avgPressure: {
          left: fsrMetrics.left?.toeOff?.avgPressure || 0,
          right: fsrMetrics.right?.toeOff?.avgPressure || 0
        },
        assessment: 'From FSR toe sensors (4, 5, 6)'
      },
      stepLength: {
        cv: cvMetrics.metrics?.gait?.stepLength || 0,
        assessment: 'From computer vision ankle displacement',
        unit: 'relative to frame'
      },
      stepWidth: {
        cv: cvMetrics.metrics?.gait?.stepWidth || 0,
        assessment: 'From computer vision foot separation',
        unit: 'relative'
      },
      pronation: {
        left: fsrMetrics.left?.pronationSupination || {},
        right: fsrMetrics.right?.pronationSupination || {},
        assessment: 'From FSR medial vs lateral pressure'
      }
    };
  },

  /**
   * Generate detailed insights
   */
  generateInsights(cvMetrics, sensorMetrics) {
    const insights = [];

    // Gait timing insights
    const cadence = sensorMetrics.gaitTiming?.cadence || 0;
    if (cadence > 0) {
      insights.push({
        category: 'Gait Rhythm',
        finding: `Cadence: ${cadence} steps/min`,
        interpretation: this.interpretCadence(cadence),
        source: 'FSR sensors'
      });
    }

    // Stability insights
    const stabilityScore = (cvMetrics.metrics?.stability?.score || 0 + sensorMetrics.imu?.stability?.score || 0) / 2;
    insights.push({
      category: 'Postural Control',
      finding: `Stability Score: ${Math.round(stabilityScore)}/100`,
      interpretation: this.getStabilityInterpretation(stabilityScore),
      source: 'Computer Vision + IMU'
    });

    // Asymmetry insights
    const asymmetry = sensorMetrics.fsr?.asymmetry?.asymmetryPercent || 0;
    if (asymmetry > 10) {
      insights.push({
        category: 'Lower Limb Symmetry',
        finding: `Gait Asymmetry: ${asymmetry}%`,
        interpretation: asymmetry > 20 ? 'Significant asymmetry detected' : 'Mild asymmetry present',
        source: 'FSR pressure distribution',
        suggestion: 'Consider balance and strengthening exercises'
      });
    }

    // Freezing of gait
    if (sensorMetrics.imu?.freezingOfGait?.detected) {
      insights.push({
        category: 'Gait Disturbance',
        finding: `Freezing of Gait Detected`,
        severity: sensorMetrics.imu.freezingOfGait.severity,
        interpretation: 'Sudden interruption in stepping pattern detected',
        source: 'IMU acceleration analysis',
        suggestion: 'Immediate medical consultation recommended'
      });
    }

    // Festination insights
    if (sensorMetrics.imu?.festination?.detected) {
      insights.push({
        category: 'Gait Acceleration',
        finding: `Involuntary Acceleration Detected`,
        severity: sensorMetrics.imu.festination.severity,
        interpretation: 'Progressive quickening of steps detected',
        source: 'IMU acceleration trend analysis'
      });
    }

    // Pressure distribution insights
    const heelRatio = sensorMetrics.pressureDistribution?.left?.heelRatio || 0;
    if (heelRatio > 0) {
      insights.push({
        category: 'Weight Distribution',
        finding: `Heel:Forefoot Pressure Ratio - ${heelRatio}:${100-heelRatio}%`,
        interpretation: heelRatio < 30 ? 'Normal heel-first contact' : 'Forefoot loading pattern detected',
        source: 'FSR pressure mapping'
      });
    }

    // Stability from sway
    const mlSway = sensorMetrics.imu?.stability?.mlSway || 0;
    const apSway = sensorMetrics.imu?.stability?.apSway || 0;
    if (mlSway > 0 || apSway > 0) {
      insights.push({
        category: 'Dynamic Balance',
        finding: `Body Sway - ML: ${mlSway.toFixed(2)} m/s², AP: ${apSway.toFixed(2)} m/s²`,
        interpretation: (mlSway + apSway) > 0.4 ? 'Increased postural sway' : 'Normal postural control',
        source: 'IMU gyroscope data'
      });
    }

    return insights;
  },

  /**
   * Generate comprehensive summary
   */
  generateSummary(cvMetrics, sensorMetrics) {
    const fsrData = sensorMetrics.fsr || {};
    const imuData = sensorMetrics.imu || {};
    const timing = sensorMetrics.gaitTiming || {};

    const cadence = Math.max(0, Math.min(timing.cadence || 0, 220)); // clamp to typical human range
    const stepTimeSec = timing.stepTime || 0;
    const stanceTimeSec = timing.stanceTime || 0;
    const stancePct = stepTimeSec > 0
      ? Math.max(0, Math.min(Math.round((stanceTimeSec / stepTimeSec) * 100), 100))
      : 0;

    return {
      overallAssessment: {
        score: this.calculateOverallScore(cvMetrics, sensorMetrics),
        category: this.getScoreCategory(this.calculateOverallScore(cvMetrics, sensorMetrics)),
        timestamp: new Date().toISOString(),
        duration: `${sensorMetrics.totalDuration || 0} seconds`
      },
      keyMetrics: {
        cadence: `${cadence} steps/min`,
        stepTime: `${stepTimeSec.toFixed(2)}s`,
        stancePhase: `${stanceTimeSec.toFixed(2)}s (${stancePct}%)`,
        stability: `${Math.round((cvMetrics.metrics?.stability?.score || 0 + imuData.stability?.score || 0) / 2)}/100`,
        symmetry: `${sensorMetrics.fsr?.asymmetry?.symmetry || 0}%`
      },
      detectedAbnormalities: sensorMetrics.abnormalities?.length || 0,
      sensorStatus: {
        fsr: fsrData.left && fsrData.right ? 'Active' : 'Inactive',
        imu: imuData.gaitRhythm ? 'Active' : 'Inactive',
        samples: sensorMetrics.sampleCount || 0
      }
    };
  },

  /**
   * Generate clinical recommendations
   */
  generateRecommendations(cvMetrics, sensorMetrics) {
    const recommendations = [];
    const fsrData = sensorMetrics.fsr || {};
    const imuData = sensorMetrics.imu || {};
    const timing = sensorMetrics.gaitTiming || {};

    // Stability-based recommendations
    const stabilityScore = (cvMetrics.metrics?.stability?.score || 0 + imuData.stability?.score || 0) / 2;
    if (stabilityScore < 50) {
      recommendations.push({
        priority: 'High',
        category: 'Balance Training',
        recommendation: 'Implement progressive balance training exercises',
        rationale: 'Low postural stability detected',
        examples: ['Tandem stance', 'Single-leg balance', 'Foam balance pad exercises']
      });
    }

    // Asymmetry-based recommendations
    const asymmetry = fsrData.asymmetry?.asymmetryPercent || 0;
    if (asymmetry > 15) {
      recommendations.push({
        priority: 'Medium',
        category: 'Gait Training',
        recommendation: 'Work on symmetrical weight distribution',
        rationale: `Detected ${asymmetry}% gait asymmetry`,
        examples: ['Mirror-based gait training', 'Dual-belt treadmill therapy']
      });
    }

    // Step timing recommendations
    const cadence = timing.cadence || 0;
    if (cadence < 90 || cadence > 140) {
      recommendations.push({
        priority: 'Medium',
        category: 'Gait Cadence',
        recommendation: cadence < 90 ? 'Increase walking speed' : 'Slow down walking pace',
        rationale: `Current cadence ${cadence} steps/min is outside normal range (100-130)`,
        examples: ['Metronome-assisted gait training', 'Music-based therapy']
      });
    }

    // Pronation correction
    if (fsrData.left?.pronationSupination?.confidence > 60 && 
        fsrData.left?.pronationSupination?.tendency !== 'neutral') {
      recommendations.push({
        priority: 'Medium',
        category: 'Foot Mechanics',
        recommendation: `Correct ${fsrData.left.pronationSupination.tendency} pattern`,
        rationale: 'Abnormal foot roll pattern detected',
        examples: ['Orthotic shoe inserts', 'Strengthening calf muscles']
      });
    }

    // Fall risk assessment
    if (stabilityScore < 60 && asymmetry > 15) {
      recommendations.push({
        priority: 'High',
        category: 'Fall Prevention',
        recommendation: 'Implement fall prevention strategy',
        rationale: 'Combination of low stability and gait asymmetry increases fall risk',
        examples: ['Environmental modifications', 'Assistive devices', 'Supervision during ambulation']
      });
    }

    // Freezing of gait
    if (imuData.freezingOfGait?.detected) {
      recommendations.push({
        priority: 'Critical',
        category: 'Medical Attention',
        recommendation: 'Seek immediate neurological evaluation',
        rationale: 'Freezing of gait pattern detected - may indicate Parkinson\'s or related condition',
        examples: ['Neurology consultation', 'Advanced imaging', 'Dopaminergic assessment']
      });
    }

    return recommendations;
  },

  /**
   * Helper functions
   */
  assessMetric(value, min, max) {
    if (!value) return 'Unable to assess';
    if (value >= min && value <= max) return 'Normal';
    if (value < min) return 'Below normal - may indicate slower gait';
    return 'Above normal - may indicate faster gait';
  },

  interpretCadence(cadence) {
    if (cadence < 90) return 'Slow gait - may indicate reduced mobility';
    if (cadence > 130) return 'Fast gait - may indicate compensation or anxiety';
    return 'Normal walking pace';
  },

  getStabilityInterpretation(score) {
    if (score > 80) return 'Excellent postural control';
    if (score > 60) return 'Good postural control with minimal sway';
    if (score > 40) return 'Moderate postural control - balance concerns present';
    return 'Poor postural control - significant fall risk';
  },

  getScoreAssessment(score) {
    if (score > 80) return 'Excellent';
    if (score > 60) return 'Good';
    if (score > 40) return 'Fair';
    return 'Poor';
  },

  calculateOverallScore(cvMetrics, sensorMetrics) {
    const scores = [
      cvMetrics.metrics?.stability?.score || 0,
      cvMetrics.metrics?.balance?.score || 0,
      cvMetrics.metrics?.symmetry?.overall || 0,
      sensorMetrics.imu?.stability?.score || 0,
      sensorMetrics.fsr?.asymmetry?.symmetry || 0
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.filter(s => s > 0).length);
  },

  getScoreCategory(score) {
    if (score > 80) return 'Excellent';
    if (score > 60) return 'Good';
    if (score > 40) return 'Fair';
    return 'Poor';
  }
};
