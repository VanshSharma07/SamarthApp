/**
 * Sensor Metrics Service
 * Processes FSR and IMU data to extract meaningful gait parameters
 */

export const sensorMetricsService = {
  /**
   * Process raw sensor buffer and compute all metrics
   */
  processSensorBuffer(sensorBuffer) {
    if (!sensorBuffer || sensorBuffer.length === 0) {
      return {
        fsr: {},
        imu: {},
        gaitTiming: {},
        stability: {},
        balance: {},
        pressureDistribution: {},
        warnings: ['No sensor data available']
      };
    }

    const fsrMetrics = this.processFSRData(sensorBuffer);
    const imuMetrics = this.processIMUData(sensorBuffer);
    const gaitTiming = this.calculateGaitTiming(sensorBuffer, fsrMetrics);
    const stability = this.calculateStability(sensorBuffer, imuMetrics);
    const pressureDistribution = this.calculatePressureDistribution(sensorBuffer);
    const abnormalityFlags = this.detectAbnormalities(sensorBuffer, fsrMetrics, imuMetrics);

    return {
      fsr: fsrMetrics,
      imu: imuMetrics,
      gaitTiming,
      stability,
      pressureDistribution,
      abnormalities: abnormalityFlags,
      totalDuration: this.calculateTotalDuration(sensorBuffer),
      sampleCount: sensorBuffer.length
    };
  },

  /**
   * Process FSR sensor data
   */
  processFSRData(sensorBuffer) {
    const leftFsrData = [];
    const rightFsrData = [];

    sensorBuffer.forEach(packet => {
      if (packet.leftFoot?.fsr) {
        leftFsrData.push(packet.leftFoot.fsr);
      }
      if (packet.rightFoot?.fsr) {
        rightFsrData.push(packet.rightFoot.fsr);
      }
    });

    return {
      left: {
        heelStrike: this.detectHeelStrike(leftFsrData, 'left'),
        toeOff: this.detectToeOff(leftFsrData, 'left'),
        peakPressure: this.calculatePeakPressure(leftFsrData),
        pressureDistribution: this.analyzePressureDistribution(leftFsrData),
        contactArea: this.estimateContactArea(leftFsrData),
        pronationSupination: this.detectPronationSupination(leftFsrData)
      },
      right: {
        heelStrike: this.detectHeelStrike(rightFsrData, 'right'),
        toeOff: this.detectToeOff(rightFsrData, 'right'),
        peakPressure: this.calculatePeakPressure(rightFsrData),
        pressureDistribution: this.analyzePressureDistribution(rightFsrData),
        contactArea: this.estimateContactArea(rightFsrData),
        pronationSupination: this.detectPronationSupination(rightFsrData)
      },
      asymmetry: this.calculateFootAsymmetry(leftFsrData, rightFsrData),
      copPath: this.calculateCoPPath(sensorBuffer)
    };
  },

  /**
   * Detect heel strike from FSR data
   * Heel is typically sensor1 or sensor2
   */
  detectHeelStrike(fsrData, foot) {
    if (fsrData.length === 0) return { detected: false, confidence: 0 };

    const heelPressures = fsrData.map(fsr => (fsr.sensor1 || 0) + (fsr.sensor2 || 0));
    const threshold = Math.max(...heelPressures) * 0.6; // 60% of peak

    let heelStrikes = [];
    let inStrike = false;
    let strikeStart = null;

    for (let i = 0; i < heelPressures.length; i++) {
      if (heelPressures[i] > threshold && !inStrike) {
        inStrike = true;
        strikeStart = i;
      } else if (heelPressures[i] <= threshold && inStrike) {
        heelStrikes.push({ start: strikeStart, end: i });
        inStrike = false;
      }
    }

    const avgPressure = heelPressures.reduce((a, b) => a + b, 0) / heelPressures.length;
    const confidence = avgPressure > 0 ? Math.min(100, (avgPressure / 500) * 100) : 0;

    return {
      detected: heelStrikes.length > 0,
      count: heelStrikes.length,
      events: heelStrikes,
      avgPressure: Math.round(avgPressure),
      confidence: Math.round(confidence)
    };
  },

  /**
   * Detect toe-off from FSR data
   * Toe is typically sensor4, sensor5, sensor6
   */
  detectToeOff(fsrData, foot) {
    if (fsrData.length === 0) return { detected: false, confidence: 0 };

    const toePressures = fsrData.map(fsr => 
      (fsr.sensor4 || 0) + (fsr.sensor5 || 0) + (fsr.sensor6 || 0)
    );
    const threshold = Math.max(...toePressures) * 0.5; // 50% of peak

    let toeOffs = [];
    let inContact = false;
    let contactStart = null;

    for (let i = 0; i < toePressures.length; i++) {
      if (toePressures[i] > threshold && !inContact) {
        inContact = true;
        contactStart = i;
      } else if (toePressures[i] <= threshold && inContact) {
        toeOffs.push({ start: contactStart, end: i });
        inContact = false;
      }
    }

    const avgPressure = toePressures.reduce((a, b) => a + b, 0) / toePressures.length;

    return {
      detected: toeOffs.length > 0,
      count: toeOffs.length,
      events: toeOffs,
      avgPressure: Math.round(avgPressure),
      confidence: Math.round(Math.min(100, (avgPressure / 500) * 100))
    };
  },

  /**
   * Calculate peak pressure across all sensors
   */
  calculatePeakPressure(fsrData) {
    if (fsrData.length === 0) return 0;

    let maxPressure = 0;
    fsrData.forEach(fsr => {
      for (let i = 1; i <= 6; i++) {
        const pressure = fsr[`sensor${i}`] || 0;
        maxPressure = Math.max(maxPressure, pressure);
      }
    });

    return Math.round(maxPressure);
  },

  /**
   * Analyze pressure distribution across foot
   */
  analyzePressureDistribution(fsrData) {
    if (fsrData.length === 0) return {};

    const sensorTotals = { sensor1: 0, sensor2: 0, sensor3: 0, sensor4: 0, sensor5: 0, sensor6: 0 };
    
    fsrData.forEach(fsr => {
      for (let i = 1; i <= 6; i++) {
        sensorTotals[`sensor${i}`] += (fsr[`sensor${i}`] || 0);
      }
    });

    const total = Object.values(sensorTotals).reduce((a, b) => a + b, 0);
    const distribution = {};
    
    Object.keys(sensorTotals).forEach(sensor => {
      distribution[sensor] = total > 0 ? Math.round((sensorTotals[sensor] / total) * 100) : 0;
    });

    // Calculate heel vs forefoot ratio
    const heelPressure = sensorTotals.sensor1 + sensorTotals.sensor2;
    const midPressure = sensorTotals.sensor3;
    const forefoofPressure = sensorTotals.sensor4 + sensorTotals.sensor5 + sensorTotals.sensor6;
    const totalPressure = heelPressure + midPressure + forefoofPressure;

    return {
      byZone: distribution,
      heelRatio: totalPressure > 0 ? parseFloat(((heelPressure / totalPressure) * 100).toFixed(2)) : 0,
      forefootRatio: totalPressure > 0 ? parseFloat(((forefoofPressure / totalPressure) * 100).toFixed(2)) : 0,
      midRatio: totalPressure > 0 ? parseFloat(((midPressure / totalPressure) * 100).toFixed(2)) : 0
    };
  },

  /**
   * Estimate contact area based on active sensors
   */
  estimateContactArea(fsrData) {
    if (fsrData.length === 0) return 0;

    let activeSensors = 0;
    let totalFrames = 0;

    fsrData.forEach(fsr => {
      let activeInFrame = 0;
      for (let i = 1; i <= 6; i++) {
        if ((fsr[`sensor${i}`] || 0) > 50) { // Threshold for active contact
          activeInFrame++;
        }
      }
      activeSensors += activeInFrame;
      totalFrames++;
    });

    // Average active sensors per frame, scaled to percentage
    return totalFrames > 0 ? Math.round((activeSensors / (totalFrames * 6)) * 100) : 0;
  },

  /**
   * Detect pronation/supination from lateral vs medial pressure
   */
  detectPronationSupination(fsrData) {
    if (fsrData.length === 0) return { tendency: 'neutral', score: 0 };

    // Lateral sensors: 2, 4, 6
    // Medial sensors: 1, 3, 5
    let lateralTotal = 0;
    let medialTotal = 0;

    fsrData.forEach(fsr => {
      lateralTotal += (fsr.sensor2 || 0) + (fsr.sensor4 || 0) + (fsr.sensor6 || 0);
      medialTotal += (fsr.sensor1 || 0) + (fsr.sensor3 || 0) + (fsr.sensor5 || 0);
    });

    const total = lateralTotal + medialTotal;
    const score = total > 0 ? ((lateralTotal - medialTotal) / total) * 100 : 0;

    let tendency = 'neutral';
    if (score > 5) tendency = 'supination';
    else if (score < -5) tendency = 'pronation';

    return {
      tendency,
      score: parseFloat(score.toFixed(2)),
      confidence: Math.round(Math.min(100, Math.abs(score) * 2))
    };
  },

  /**
   * Calculate foot asymmetry
   */
  calculateFootAsymmetry(leftFsrData, rightFsrData) {
    if (leftFsrData.length === 0 || rightFsrData.length === 0) {
      return { symmetry: 100, asymmetryPercent: 0 };
    }

    const calculateTotal = (fsrData) => {
      return fsrData.reduce((sum, fsr) => {
        let total = 0;
        for (let i = 1; i <= 6; i++) {
          total += (fsr[`sensor${i}`] || 0);
        }
        return sum + total;
      }, 0);
    };

    const leftTotal = calculateTotal(leftFsrData);
    const rightTotal = calculateTotal(rightFsrData);
    const grandTotal = leftTotal + rightTotal;

    if (grandTotal === 0) return { symmetry: 100, asymmetryPercent: 0 };

    const difference = Math.abs(leftTotal - rightTotal);
    const asymmetryPercent = (difference / grandTotal) * 100;
    const symmetry = 100 - asymmetryPercent;

    return {
      symmetry: Math.round(symmetry),
      asymmetryPercent: parseFloat(asymmetryPercent.toFixed(2)),
      leftDominance: leftTotal > rightTotal ? parseFloat(((leftTotal / grandTotal) * 100).toFixed(2)) : 0,
      rightDominance: rightTotal > leftTotal ? parseFloat(((rightTotal / grandTotal) * 100).toFixed(2)) : 0
    };
  },

  /**
   * Calculate Center of Pressure (CoP) path
   */
  calculateCoPPath(sensorBuffer) {
    const copPoints = [];

    sensorBuffer.forEach(packet => {
      if (!packet.leftFoot?.fsr && !packet.rightFoot?.fsr) return;

      let totalX = 0;
      let totalY = 0;
      let totalPressure = 0;

      // Simplified CoP calculation (heel at Y=0, toe at Y=1, medial at X=0, lateral at X=1)
      const processFoot = (fsr, xOffset) => {
        for (let i = 1; i <= 6; i++) {
          const pressure = fsr[`sensor${i}`] || 0;
          const sensorPosition = this.getSensorPosition(i);
          
          totalX += sensorPosition.x * pressure + xOffset * pressure;
          totalY += sensorPosition.y * pressure;
          totalPressure += pressure;
        }
      };

      if (packet.leftFoot?.fsr) processFoot(packet.leftFoot.fsr, -0.5);
      if (packet.rightFoot?.fsr) processFoot(packet.rightFoot.fsr, 0.5);

      if (totalPressure > 0) {
        copPoints.push({
          x: totalX / totalPressure,
          y: totalY / totalPressure,
          pressure: totalPressure,
          timestamp: packet.timestamp
        });
      }
    });

    // Calculate path characteristics
    let pathLength = 0;
    for (let i = 1; i < copPoints.length; i++) {
      const dx = copPoints[i].x - copPoints[i - 1].x;
      const dy = copPoints[i].y - copPoints[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }

    return {
      points: copPoints,
      pathLength: parseFloat(pathLength.toFixed(3)),
      pointCount: copPoints.length,
      avgVelocity: copPoints.length > 0 ? parseFloat((pathLength / copPoints.length).toFixed(4)) : 0
    };
  },

  /**
   * Get sensor position on foot
   */
  getSensorPosition(sensorNum) {
    // Simplified foot model: 2x3 sensor grid
    // Row 1 (heel): sensors 1, 2
    // Row 2 (mid): sensors 3, 4
    // Row 3 (toe): sensors 5, 6
    const positions = {
      1: { x: -0.3, y: 0 },    // Heel lateral
      2: { x: 0.3, y: 0 },     // Heel medial
      3: { x: -0.3, y: 0.33 },  // Mid lateral
      4: { x: 0.3, y: 0.33 },   // Mid medial
      5: { x: -0.3, y: 0.67 },  // Toe lateral
      6: { x: 0.3, y: 0.67 }    // Toe medial
    };
    return positions[sensorNum] || { x: 0, y: 0 };
  },

  /**
   * Process IMU data
   */
  processIMUData(sensorBuffer) {
    const accelerations = [];
    const angularVelocities = [];

    sensorBuffer.forEach(packet => {
      if (packet.imu?.accel) {
        accelerations.push(packet.imu.accel);
      }
      if (packet.imu?.gyro) {
        angularVelocities.push(packet.imu.gyro);
      }
    });

    return {
      gaitRhythm: this.calculateGaitRhythm(accelerations),
      stability: this.calculateIMUStability(accelerations, angularVelocities),
      harmonicRatio: this.calculateHarmonicRatio(accelerations),
      freezingOfGait: this.detectFreezingOfGait(accelerations),
      festination: this.detectFestination(accelerations),
      stepTiming: this.calculateStepTiming(accelerations)
    };
  },

  /**
   * Calculate gait rhythm from acceleration patterns
   */
  calculateGaitRhythm(accelerations) {
    if (accelerations.length < 10) return { rhythm: 'insufficient_data', frequency: 0, regularity: 0 };

    // Calculate magnitude of acceleration
    const magnitudes = accelerations.map(acc => 
      Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2)
    );

    // Detect peaks (step events)
    const peaks = this.findPeaks(magnitudes, 0.3);
    
    // Calculate step frequency
    const stepCount = peaks.length;
    const frequency = stepCount > 1 ? (stepCount - 1) / (accelerations.length / 50) : 0; // Assuming 50 Hz

    // Calculate regularity (coefficient of variation of peak distances)
    let peakDistances = [];
    for (let i = 1; i < peaks.length; i++) {
      peakDistances.push(peaks[i] - peaks[i - 1]);
    }

    const avgDistance = peakDistances.reduce((a, b) => a + b, 0) / peakDistances.length;
    const variance = peakDistances.reduce((sum, d) => sum + (d - avgDistance) ** 2, 0) / peakDistances.length;
    const regularity = avgDistance > 0 ? 100 * (1 - Math.sqrt(variance) / avgDistance) : 0;

    let rhythm = 'irregular';
    if (regularity > 80) rhythm = 'regular';
    else if (regularity > 60) rhythm = 'mostly_regular';

    return {
      rhythm,
      frequency: parseFloat(frequency.toFixed(2)),
      regularity: Math.round(regularity),
      stepCount,
      peaks
    };
  },

  /**
   * Find peaks in signal
   */
  findPeaks(signal, threshold = 0.3) {
    const peaks = [];
    const maxVal = Math.max(...signal);
    const peakThreshold = maxVal * threshold;

    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1] && signal[i] > peakThreshold) {
        peaks.push(i);
      }
    }

    return peaks;
  },

  /**
   * Calculate IMU-based stability (sway metrics)
   */
  calculateIMUStability(accelerations, angularVelocities) {
    if (accelerations.length === 0) return { mlSway: 0, apSway: 0, score: 0 };

    // Calculate anterior-posterior (AP) sway
    const apAccels = accelerations.map(acc => acc.y);
    const apVariance = this.calculateVariance(apAccels);
    const apSway = Math.sqrt(apVariance);

    // Calculate medial-lateral (ML) sway
    const mlAccels = accelerations.map(acc => acc.x);
    const mlVariance = this.calculateVariance(mlAccels);
    const mlSway = Math.sqrt(mlVariance);

    // Calculate rotational stability from gyro
    let rotationalVariance = 0;
    if (angularVelocities.length > 0) {
      const rotations = angularVelocities.map(gyro => 
        Math.sqrt(gyro.x ** 2 + gyro.y ** 2 + gyro.z ** 2)
      );
      rotationalVariance = this.calculateVariance(rotations);
    }

    // Overall stability score (lower is better)
    const totalSway = apSway + mlSway;
    const stabilityScore = Math.max(0, 100 - totalSway * 5);

    return {
      mlSway: parseFloat(mlSway.toFixed(3)),
      apSway: parseFloat(apSway.toFixed(3)),
      rotationalVariance: parseFloat(rotationalVariance.toFixed(3)),
      score: Math.round(stabilityScore),
      assessment: stabilityScore > 80 ? 'stable' : stabilityScore > 60 ? 'moderate' : 'unstable'
    };
  },

  /**
   * Calculate variance helper
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  },

  /**
   * Calculate harmonic ratio from vertical acceleration
   */
  calculateHarmonicRatio(accelerations) {
    if (accelerations.length < 10) return { ratio: 0, quality: 'insufficient_data' };

    // Vertical acceleration (Z-axis)
    const verticalAccels = accelerations.map(acc => acc.z - 9.81); // Remove gravity

    // Use FFT-like analysis (simplified)
    const magnitudes = verticalAccels.map(a => Math.abs(a));
    
    // Calculate harmonic ratio as ratio of fundamental to higher frequencies
    const avgMagnitude = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const peakMagnitude = Math.max(...magnitudes);
    const ratio = avgMagnitude > 0 ? peakMagnitude / avgMagnitude : 0;

    let quality = 'unknown';
    if (ratio > 1.5) quality = 'good';
    else if (ratio > 1.2) quality = 'moderate';
    else quality = 'poor';

    return {
      ratio: parseFloat(ratio.toFixed(3)),
      quality,
      peakMagnitude: parseFloat(peakMagnitude.toFixed(3)),
      avgMagnitude: parseFloat(avgMagnitude.toFixed(3))
    };
  },

  /**
   * Detect Freezing of Gait (FoG)
   */
  detectFreezingOfGait(accelerations) {
    if (accelerations.length < 20) return { detected: false, severity: 0, confidence: 0 };

    // FoG is characterized by sudden absence of forward acceleration with normal balance control
    const magnitudes = accelerations.map(acc => 
      Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2)
    );

    let fogEvents = [];
    let inFog = false;
    let fogStart = null;

    const threshold = Math.max(...magnitudes) * 0.1; // Very low acceleration threshold

    for (let i = 0; i < magnitudes.length; i++) {
      if (magnitudes[i] < threshold && !inFog) {
        inFog = true;
        fogStart = i;
      } else if (magnitudes[i] >= threshold && inFog) {
        fogEvents.push({ start: fogStart, end: i, duration: i - fogStart });
        inFog = false;
      }
    }

    const totalFogDuration = fogEvents.reduce((sum, event) => sum + event.duration, 0);
    const fogSeverity = Math.round((totalFogDuration / accelerations.length) * 100);
    const confidence = fogEvents.length > 0 ? 80 : 0;

    return {
      detected: fogEvents.length > 0,
      severity: fogSeverity,
      events: fogEvents,
      eventCount: fogEvents.length,
      confidence
    };
  },

  /**
   * Detect festination (involuntary acceleration)
   */
  detectFestination(accelerations) {
    if (accelerations.length < 50) return { detected: false, severity: 0, confidence: 0 };

    // Festination shows increasing acceleration over time
    const magnitudes = accelerations.map(acc => 
      Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2)
    );

    // Divide into windows and check for increasing trend
    const windowSize = Math.floor(magnitudes.length / 5);
    const windowAverages = [];

    for (let i = 0; i < magnitudes.length; i += windowSize) {
      const window = magnitudes.slice(i, i + windowSize);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      windowAverages.push(avg);
    }

    // Check for consistent increase
    let increasingSteps = 0;
    for (let i = 1; i < windowAverages.length; i++) {
      if (windowAverages[i] > windowAverages[i - 1]) {
        increasingSteps++;
      }
    }

    const festival = (increasingSteps / (windowAverages.length - 1)) * 100;
    const detected = festival > 60;
    const severity = Math.round(festival);

    return {
      detected,
      severity,
      confidence: detected ? 70 : 0,
      trend: windowAverages
    };
  },

  /**
   * Calculate step timing from IMU
   */
  calculateStepTiming(accelerations) {
    if (accelerations.length < 10) return { stepTime: 0, cadence: 0 };

    const magnitudes = accelerations.map(acc => 
      Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2)
    );

    const peaks = this.findPeaks(magnitudes, 0.3);
    
    if (peaks.length < 2) return { stepTime: 0, cadence: 0 };

    const peakIntervals = [];
    for (let i = 1; i < peaks.length; i++) {
      peakIntervals.push(peaks[i] - peaks[i - 1]);
    }

    const avgInterval = peakIntervals.reduce((a, b) => a + b, 0) / peakIntervals.length;
    const stepTimeMs = (avgInterval / 50) * 1000; // Convert to ms assuming 50 Hz
    // Guard rails: typical step time ~0.4-0.8s; clamp to avoid extreme cadence
    const stepTimeSec = Math.max(0.3, Math.min(stepTimeMs / 1000, 2));
    const cadence = 60 / stepTimeSec; // Steps per minute

    return {
      // expose seconds with two decimals
      stepTime: parseFloat(stepTimeSec.toFixed(2)),
      cadence: Math.round(cadence),
      stepCount: peaks.length,
      variability: this.calculateVariance(peakIntervals)
    };
  },

  /**
   * Calculate gait timing (stance, swing, step time)
   */
  calculateGaitTiming(sensorBuffer, fsrMetrics) {
    if (!fsrMetrics.left.heelStrike || !fsrMetrics.right.heelStrike) {
      return { stanceTime: 0, swingTime: 0, stepTime: 0, cadence: 0 };
    }

    const leftStrikes = fsrMetrics.left.heelStrike.events || [];
    const rightStrikes = fsrMetrics.right.heelStrike.events || [];
    const timePerSample = 10; // ms (100 Hz)

    if (leftStrikes.length === 0 || rightStrikes.length === 0) {
      return { stanceTime: 0, swingTime: 0, stepTime: 0, cadence: 0 };
    }

    // Calculate step time (time between consecutive heel strikes)
    const allStrikes = [...leftStrikes, ...rightStrikes]
      .sort((a, b) => a.start - b.start);

    const stepTimes = [];
    for (let i = 1; i < allStrikes.length; i++) {
      const stepTime = (allStrikes[i].start - allStrikes[i - 1].start) * timePerSample;
      stepTimes.push(stepTime);
    }

    const avgStepTime = stepTimes.length > 0 
      ? stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length
      : 0;

    // Stance time is duration of foot contact
    const leftStanceTimes = leftStrikes.map(strike => (strike.end - strike.start) * timePerSample);
    const rightStanceTimes = rightStrikes.map(strike => (strike.end - strike.start) * timePerSample);
    const avgStanceTime = [...leftStanceTimes, ...rightStanceTimes].length > 0
      ? [...leftStanceTimes, ...rightStanceTimes].reduce((a, b) => a + b, 0) / [...leftStanceTimes, ...rightStanceTimes].length
      : 0;

    // Swing time
    const avgSwingTime = avgStepTime - avgStanceTime;
    
    // Normalize step time to plausible human range (0.3s - 2s)
    const stepTimeSec = avgStepTime > 0 ? Math.max(0.3, Math.min(avgStepTime / 1000, 2)) : 0;
    const cadence = stepTimeSec > 0 ? Math.round(60 / stepTimeSec) : 0;

    return {
      stanceTime: parseFloat((Math.max(0, Math.min(avgStanceTime / 1000, stepTimeSec))).toFixed(2)),
      swingTime: parseFloat(Math.max(0, avgSwingTime / 1000).toFixed(2)),
      stepTime: parseFloat(stepTimeSec.toFixed(2)),
      cadence,
      stepTimeVariability: this.calculateVariance(stepTimes)
    };
  },

  /**
   * Calculate stability metrics (from gait timing)
   */
  calculateStability(sensorBuffer, imuMetrics) {
    return {
      imuBased: imuMetrics.stability || {},
      assessment: {
        overall: imuMetrics.stability?.score || 0,
        mlSway: imuMetrics.stability?.mlSway || 0,
        apSway: imuMetrics.stability?.apSway || 0,
        recommendation: this.getStabilityRecommendation(imuMetrics.stability?.score || 0)
      }
    };
  },

  /**
   * Calculate pressure distribution metrics
   */
  calculatePressureDistribution(sensorBuffer) {
    const leftFsrData = sensorBuffer
      .filter(p => p.leftFoot?.fsr)
      .map(p => p.leftFoot.fsr);
    const rightFsrData = sensorBuffer
      .filter(p => p.rightFoot?.fsr)
      .map(p => p.rightFoot.fsr);

    return {
      left: this.analyzePressureDistribution(leftFsrData),
      right: this.analyzePressureDistribution(rightFsrData)
    };
  },

  /**
   * Detect abnormalities and flags
   */
  detectAbnormalities(sensorBuffer, fsrMetrics, imuMetrics) {
    const flags = [];

    // High asymmetry
    if (fsrMetrics.asymmetry?.asymmetryPercent > 20) {
      flags.push({
        type: 'high_asymmetry',
        severity: 'warning',
        message: `High gait asymmetry detected: ${fsrMetrics.asymmetry.asymmetryPercent}%`
      });
    }

    // Freezing of gait
    if (imuMetrics.freezingOfGait?.detected) {
      flags.push({
        type: 'freezing_of_gait',
        severity: 'alert',
        message: `Freezing of gait detected with ${imuMetrics.freezingOfGait.severity}% severity`
      });
    }

    // Festination
    if (imuMetrics.festination?.detected) {
      flags.push({
        type: 'festination',
        severity: 'alert',
        message: `Involuntary acceleration detected with ${imuMetrics.festination.severity}% severity`
      });
    }

    // Low stability
    if (imuMetrics.stability?.score < 50) {
      flags.push({
        type: 'poor_stability',
        severity: 'warning',
        message: `Poor postural stability detected: ${imuMetrics.stability.score}/100`
      });
    }

    // Abnormal pronation/supination
    if (fsrMetrics.left.pronationSupination?.confidence > 60) {
      const tendency = fsrMetrics.left.pronationSupination.tendency;
      if (tendency !== 'neutral') {
        flags.push({
          type: `left_${tendency}`,
          severity: 'info',
          message: `Left foot shows ${tendency} tendency`
        });
      }
    }

    return flags;
  },

  /**
   * Get stability recommendation
   */
  getStabilityRecommendation(score) {
    if (score > 80) return 'Excellent postural control';
    if (score > 60) return 'Good postural control';
    if (score > 40) return 'Moderate postural control - consider fall prevention strategies';
    return 'Poor postural control - recommended balance training and supervision';
  },

  /**
   * Calculate total duration
   */
  calculateTotalDuration(sensorBuffer) {
    if (sensorBuffer.length < 2) return 0;
    const first = sensorBuffer[0].timestamp;
    const last = sensorBuffer[sensorBuffer.length - 1].timestamp;
    return (last - first) / 1000; // Return in seconds
  }
};
