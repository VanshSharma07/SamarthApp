import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import {
  TouchApp as TapIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  Sync as RhythmIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import AssessmentLayout from './AssessmentLayout';
import { mlService, assessmentService } from '../../services';
import {
  TapPatternChart,
  RhythmAnalysisChart,
  FatigueProgressionChart,
  PrecisionMap
} from '../visualizations/FingerTapVisualizations';
import { FingerTapMetricsAnalyzer } from '../../services/metrics/fingerTapMetrics';
import { specializedAssessments } from '../../services/api';

const MetricCard = ({ title, value, icon, description, previousValue }) => {
  // Track when value changes for animation
  const [animate, setAnimate] = useState(false);
  
  useEffect(() => {
    // Check if value has changed significantly (more than 0.1 difference)
    if (previousValue !== undefined && Math.abs(parseFloat(value) - parseFloat(previousValue)) > 0.1) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue]);

  return (
    <Card sx={{ height: '100%', transition: 'all 0.3s ease' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" component="div" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography 
          variant="h4" 
          component="div" 
          sx={{ 
            mb: 1,
            color: animate ? 'primary.main' : 'text.primary',
            transform: animate ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}
        >
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const FingerTapping = ({ userId, onComplete }) => {
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [metrics, setMetrics] = useState({
    tapsPerSecond: 0.1,
    rhythmScore: 30.0,
    duration: 0,
    accuracy: 40.0
  });
  
  // Add state to track previous metrics for animation
  const [prevMetrics, setPrevMetrics] = useState({
    tapsPerSecond: 0.1,
    rhythmScore: 30.0,
    duration: 0,
    accuracy: 40.0
  });
  
  const [realtimeData, setRealtimeData] = useState({
    tapIntervals: [],
    tapForce: [],
    timestamps: [],
    tapData: [],
    rhythmData: {
      timestamps: [],
      intervals: [],
      targetInterval: 200
    },
    fatigueData: {
      timestamps: [],
      speedMetrics: [],
      accuracyMetrics: [],
      consistencyMetrics: []
    },
    precisionData: []
  });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [baselineData, setBaselineData] = useState(null);
  const metricsAnalyzer = useRef(new FingerTapMetricsAnalyzer());
  const analysisRef = useRef(null);
  const timerRef = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null, success: false });
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [actualStartTime, setActualStartTime] = useState(null);
  const [tapCount, setTapCount] = useState(0);
  const lastProcessedDataTimestamp = useRef(0);
  
  // Additional refs for improved tap detection
  const validTapsRef = useRef(0);
  const lastTapTimestamp = useRef(0);
  const lastIntervalRef = useRef(200);
  const tapIntervalsRef = useRef([]);
  const adaptiveThresholdsRef = useRef({
    minInterval: 100,
    maxInterval: 2000
  });

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (analysisRef.current?.stop) {
        analysisRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Add real-time metrics update effect
  useEffect(() => {
    if (!isAssessing) return;
    
    const metricsUpdateInterval = setInterval(() => {
      updateMetricsRealtime();
    }, 500); // Update every 500ms
    
    return () => clearInterval(metricsUpdateInterval);
  }, [isAssessing]);

  const updateMetricsRealtime = () => {
    if (!isAssessing) return;
    
    // Save previous metrics for animation
    setPrevMetrics({...metrics});
    
    // Calculate current metrics
    const currentTapsPerSecond = calculateTapsPerSecond();
    const currentRhythmScore = calculateRhythmScore();
    const currentDuration = actualStartTime ? 
      Math.min(30, (Date.now() - actualStartTime) / 1000) : 
      (30 - timeRemaining);
    const currentAccuracy = calculateAccuracy();
    
    // Update metrics
    setMetrics({
      tapsPerSecond: currentTapsPerSecond,
      rhythmScore: currentRhythmScore,
      duration: currentDuration,
      accuracy: currentAccuracy
    });
  };

  const startAssessment = async () => {
    try {
      setIsAssessing(true);
      setError(null);
      setSuccessMessage(null);
      setMetrics({
        tapsPerSecond: 0.1,
        rhythmScore: 30.0,
        duration: 0,
        accuracy: 40.0
      });
      setPrevMetrics({
        tapsPerSecond: 0.1,
        rhythmScore: 30.0,
        duration: 0,
        accuracy: 40.0
      });
      setSaveStatus({ saving: false, error: null, success: false });
      setAssessmentComplete(false);
      setTimeRemaining(30);
      setTapCount(0);
      validTapsRef.current = 0;
      lastTapTimestamp.current = 0;
      tapIntervalsRef.current = [];
      adaptiveThresholdsRef.current = {
        minInterval: 100,
        maxInterval: 2000
      };
      setActualStartTime(Date.now());
      lastProcessedDataTimestamp.current = Date.now();
      setRealtimeData({
        tapIntervals: [],
        tapForce: [],
        timestamps: [],
        tapData: [],
        rhythmData: {
          timestamps: [],
          intervals: [],
          targetInterval: 200
        },
        fatigueData: {
          timestamps: [],
          speedMetrics: [],
          accuracyMetrics: [],
          consistencyMetrics: []
        },
        precisionData: []
      });

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640,
          height: 480,
          frameRate: { ideal: 30 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.width = 640;
        videoRef.current.height = 480;
      }

      if (canvasRef.current) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }

      // Wait for video to be ready
      await new Promise((resolve) => {
        videoRef.current.onloadeddata = () => {
          videoRef.current.play();
          resolve();
        };
      });

      // Start finger movement tracking
      analysisRef.current = await mlService.startFingerTapping(
        videoRef.current,
        canvasRef.current,
        handleRealtimeUpdate
      );

      // Start countdown timer for 30 seconds
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopAssessment(stream);
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      handleError(err);
    }
  };

  const stopAssessment = async (stream) => {
    try {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop analysis and camera
      if (analysisRef.current?.stop) {
        analysisRef.current.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Calculate assessment duration properly - fix for large duration values
      let actualDuration;
      if (actualStartTime) {
        // Calculate from actual start time but cap at expected duration
        actualDuration = Math.min(30, (Date.now() - actualStartTime) / 1000);
      } else {
        // Fallback to using timeRemaining
        actualDuration = 30 - timeRemaining;
      }
      
      // Ensure duration is a reasonable value
      actualDuration = Math.min(60, actualDuration);
      
      // Calculate final metrics
      const tapsPerSecond = calculateTapsPerSecond();
      const rhythmScore = calculateRhythmScore();
      const accuracy = calculateAccuracy();
      
      // Set metrics but don't save yet
      setMetrics({
        tapsPerSecond: isNaN(tapsPerSecond) || tapsPerSecond < 0.1 ? 0.1 : tapsPerSecond,
        rhythmScore: isNaN(rhythmScore) ? Math.min(95, Math.max(10, tapCount)) : rhythmScore,
        duration: actualDuration, // Using fixed duration calculation
        accuracy: isNaN(accuracy) ? Math.min(90, Math.max(10, tapCount * 2)) : accuracy
      });
      setAssessmentComplete(true);
      
      // We're not auto-saving anymore, just marking assessment as complete
      setError(null); // Clear any existing errors
      
    } catch (err) {
      handleError(err);
    } finally {
      setIsAssessing(false);
      setTimeRemaining(0);
    }
  };

  const calculateTapsPerSecond = () => {
    // Use tracked valid tap count for more accurate calculation
    if (validTapsRef.current <= 1) return 0.1;
    
    // Get assessment duration properly
    let duration;
    if (actualStartTime) {
      duration = Math.min(30, (Date.now() - actualStartTime) / 1000);
    } else {
      duration = 30 - timeRemaining;
    }
    
    // Ensure we have valid duration
    if (duration <= 1) return 0.1;
    
    // Calculate based on actual valid taps
    const tapsPerSecond = validTapsRef.current / duration;
    
    // Apply reasonable bounds (human finger tapping is typically 1-10 taps per second)
    return Math.min(10, Math.max(0.1, tapsPerSecond));
  };

  const calculateRhythmScore = () => {
    const tapIntervals = realtimeData.tapIntervals;
    
    // If not enough intervals to calculate rhythm, use a progressive scale based on valid taps
    if (tapIntervals.length < 3) {
      const baseTapScale = Math.min(validTapsRef.current * 5, 30);
      return Math.min(85, Math.max(30, 30 + baseTapScale));
    }
    
    // Filter out extreme outliers by using the median as reference
    const sortedIntervals = [...tapIntervals].sort((a, b) => a - b);
    const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
    
    // Consider only intervals that are reasonably close to the median
    const validIntervals = tapIntervals.filter(interval => 
      interval > medianInterval * 0.4 && interval < medianInterval * 2.5
    );
    
    if (validIntervals.length < 3) {
      return Math.min(85, Math.max(40, 40 + validTapsRef.current * 3));
    }

    // Calculate consistency using coefficient of variation
    const mean = validIntervals.reduce((sum, val) => sum + val, 0) / validIntervals.length;
    const stdDev = Math.sqrt(
      validIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validIntervals.length
    );
    
    // Calculate coefficient of variation (CV) - lower is better
    const cv = mean > 0 ? stdDev / mean : 1;
    
    // Convert CV to a rhythm score on a scale of 30-98
    // Typical human finger tapping CV ranges from 0.05 (excellent) to 0.3 (poor)
    const rhythmScore = 98 - (cv * 150); 
    
    return Math.min(98, Math.max(30, rhythmScore));
  };

  const calculateAccuracy = () => {
    // For minimal data, use a progressive scale based on valid taps
    if (realtimeData.tapForce.length < 5 || validTapsRef.current < 3) {
      return Math.min(85, Math.max(40, 40 + validTapsRef.current * 2));
    }
    
    // Count successful taps (those with force above 0.7)
    const successfulTaps = realtimeData.tapForce.filter(force => force > 0.7).length;
    const totalEvents = realtimeData.tapForce.length;
    
    if (totalEvents === 0) return 40; // Default value
    
    // Calculate accuracy as a percentage
    const rawAccuracy = (successfulTaps / totalEvents) * 100;
    
    // Apply reasonable bounds
    return Math.min(98, Math.max(40, rawAccuracy));
  };

  const handleRealtimeUpdate = (data) => {
    // Validate incoming data
    if (!data || data.timestamp === undefined || data.interval === undefined) {
      console.warn('Received invalid data in handleRealtimeUpdate', data);
      return;
    }
    
    // Throttle updates for better performance (process at most every 30ms)
    const now = Date.now();
    if (now - lastProcessedDataTimestamp.current < 30 && realtimeData.timestamps.length > 0) {
      return;
    }
    lastProcessedDataTimestamp.current = now;
    
    // Get adaptive thresholds
    const { minInterval, maxInterval } = adaptiveThresholdsRef.current;
    
    // Track detected taps with improved threshold
    if (data.isTapping && data.force > 0.6) {
      setTapCount(prevCount => prevCount + 1);
      
      // Track tap state with timestamps
      const currentTime = now;
      if (lastTapTimestamp.current > 0) {
        const interval = currentTime - lastTapTimestamp.current;
        
        // Add to interval history regardless of validity
        tapIntervalsRef.current.push(interval);
        // Keep only recent intervals
        if (tapIntervalsRef.current.length > 15) {
          tapIntervalsRef.current.shift();
        }
        
        // Update adaptive thresholds based on median of recent intervals
        if (tapIntervalsRef.current.length >= 5) {
          const sortedIntervals = [...tapIntervalsRef.current].sort((a, b) => a - b);
          const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
          
          // Adaptive thresholds based on observed tapping pattern
          const newMinInterval = Math.max(80, Math.min(300, medianInterval * 0.4));
          const newMaxInterval = Math.min(2500, Math.max(600, medianInterval * 2.5));
          
          adaptiveThresholdsRef.current = {
            minInterval: newMinInterval,
            maxInterval: newMaxInterval
          };
        }
        
        // Count valid taps using adaptive thresholds
        if (interval >= adaptiveThresholdsRef.current.minInterval && 
            interval <= adaptiveThresholdsRef.current.maxInterval) {
          validTapsRef.current++;
          lastIntervalRef.current = interval;
        } else {
          // Try to handle outliers intelligently
          if (interval > adaptiveThresholdsRef.current.maxInterval && 
              interval < adaptiveThresholdsRef.current.maxInterval * 3) {
            // This could be multiple missed taps - use a reasonable value
            const adjustedInterval = Math.min(interval / 2, 
                                            tapIntervalsRef.current.length >= 3 ? 
                                            tapIntervalsRef.current[tapIntervalsRef.current.length - 3] : 
                                            500);
            validTapsRef.current += 0.5; // Count as partial tap
            lastIntervalRef.current = adjustedInterval;
          }
        }
      }
      
      // Update last tap timestamp
      lastTapTimestamp.current = currentTime;
    }
    
    setRealtimeData(prevData => {
      // Keep only last 100 data points for performance
      const maxDataPoints = 100;
      const sliceStart = prevData.timestamps.length > maxDataPoints ? 
                        prevData.timestamps.length - maxDataPoints : 0;

      // Get proper interval - use the incoming interval if it's valid
      const validInterval = (data.interval >= adaptiveThresholdsRef.current.minInterval && 
                           data.interval <= adaptiveThresholdsRef.current.maxInterval) ? 
                           data.interval : 
                           (prevData.tapIntervals.length > 0 ? 
                            prevData.tapIntervals[prevData.tapIntervals.length-1] : 200);

      // Add tap force with more granular values instead of binary
      const tapForce = data.force > 0.3 ? data.force : 0; // Use actual force value

      // Calculate tap data for visualization with better amplitude calculation
      const tapData = {
        time: data.timestamp - (prevData.timestamps[0] || data.timestamp),
        amplitude: data.interval < 100 ? data.interval + 20 : 
                  (data.interval > 2000 ? 500 : data.interval), // Constrain extreme values
        speed: data.force > 0.3 ? data.force * 2 : 0.1 // Scale force for better visualization
      };

      // Calculate rhythm data using proper interval
      const rhythmData = {
        timestamps: [...prevData.rhythmData.timestamps, data.timestamp].slice(-maxDataPoints),
        intervals: [...prevData.rhythmData.intervals, validInterval].slice(-maxDataPoints),
        targetInterval: 200
      };

      // Calculate fatigue data with improved filtering
      const currentRhythm = prevData.fatigueData.consistencyMetrics.length > 5 ? 
                           calculateRhythmScore() : 
                           Math.min(90, Math.max(40, 40 + validTapsRef.current * 2));
                           
      const currentAccuracy = prevData.fatigueData.accuracyMetrics.length > 5 ? 
                             calculateAccuracy() : 
                             Math.min(90, Math.max(40, validTapsRef.current * 3));
      
      const fatigueData = {
        timestamps: [...prevData.fatigueData.timestamps, data.timestamp].slice(-maxDataPoints),
        speedMetrics: [...prevData.fatigueData.speedMetrics, data.force * 100].slice(-maxDataPoints),
        accuracyMetrics: [...prevData.fatigueData.accuracyMetrics, currentAccuracy].slice(-maxDataPoints),
        consistencyMetrics: [...prevData.fatigueData.consistencyMetrics, currentRhythm].slice(-maxDataPoints)
      };

      // Calculate precision data with better frequency calculation
      let estimatedFrequency = calculateTapsPerSecond();
      
      const precisionData = data.landmarks ? [
        ...prevData.precisionData || [],
        {
          frequency: estimatedFrequency,
          deviation: Math.min(500, Math.max(1, Math.abs(validInterval - rhythmData.targetInterval)))
        }
      ].slice(-maxDataPoints) : prevData.precisionData.slice(-maxDataPoints);

      return {
        tapIntervals: [...prevData.tapIntervals, validInterval].slice(-maxDataPoints),
        tapForce: [...prevData.tapForce, data.isTapping && tapForce > 0.7 ? 1 : 0].slice(-maxDataPoints),
        timestamps: [...prevData.timestamps, data.timestamp].slice(-maxDataPoints),
        tapData: [...prevData.tapData, tapData].slice(-maxDataPoints),
        rhythmData,
        fatigueData,
        precisionData
      };
    });
  };

  const saveAssessmentResults = async () => {
    try {
      setSaveStatus({ saving: true, error: null, success: false });
      
      // Validate results
      if (!metrics || metrics.tapsPerSecond === 0) {
        throw new Error('No valid taps detected. Please try again.');
      }

      const assessmentData = {
        userId,
        type: 'fingerTapping',
        timestamp: new Date().toISOString(),
        metrics: {
          frequency: Math.max(0.1, metrics.tapsPerSecond),
          amplitude: calculateAverageAmplitude(),
          rhythm: metrics.rhythmScore,
          overallScore: Math.max(10, (metrics.accuracy + metrics.rhythmScore) / 2),
          accuracy: Math.max(10, metrics.accuracy),
          duration: metrics.duration,
          // Include all the detailed data
          tapData: realtimeData.tapData,
          rhythmData: realtimeData.rhythmData,
          fatigueData: realtimeData.fatigueData,
          precisionData: realtimeData.precisionData,
          rawData: {
            tapIntervals: realtimeData.tapIntervals,
            tapForce: realtimeData.tapForce,
            timestamps: realtimeData.timestamps
          }
        },
        status: 'COMPLETED'
      };

      console.log('Sending assessment data:', assessmentData);
      
      // Use the specialized assessments API
      const response = await specializedAssessments.fingerTapping.save(assessmentData);
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to save finger tapping assessment');
      }
      
      // Set success message and update save status
      setSuccessMessage('Assessment completed successfully! You can review your results below.');
      setSaveStatus({ saving: false, error: null, success: true });
      
      if (onComplete) {
        onComplete({
          ...assessmentData,
          id: response.data.data?._id || response.data.data?.id
        });
      }
    } catch (err) {
      console.error('Failed to save assessment results:', err);
      setError(err.message);
      setSaveStatus({ saving: false, error: err.message, success: false });
    }
  };

  const calculateAverageAmplitude = () => {
    if (!realtimeData.tapData.length) return 0;
    
    // Filter out extreme values for more reliable amplitude calculation
    const validAmplitudes = realtimeData.tapData
      .map(d => d.amplitude)
      .filter(a => a >= 20 && a <= 1000);
      
    if (validAmplitudes.length === 0) return 100; // default value
    
    return validAmplitudes.reduce((a, b) => a + b, 0) / validAmplitudes.length;
  };

  const handleError = (error) => {
    setError(error.message);
    setIsAssessing(false);
  };

  useEffect(() => {
    // Load baseline data
    const loadBaseline = async () => {
      try {
        // Get user ID from localStorage
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          console.warn('No user ID available for baseline data');
          setBaselineData(null);
          return;
        }
        
        console.log('Loading baseline data for finger tapping with user ID:', userId);
        
        // Call the updated getBaselineData function with userId
        const data = await assessmentService.getBaselineData(assessmentService.ASSESSMENT_TYPES.FINGER_TAPPING, userId);
        
        if (data) {
          console.log('Baseline data loaded:', data);
          setBaselineData(data);
        } else {
          console.log('No baseline data found');
          setBaselineData(null);
        }
      } catch (error) {
        console.error('Error loading baseline data:', error);
        setBaselineData(null);
      }
    };

    loadBaseline();
  }, []);

  const renderMetrics = () => {
    // Display metrics whether assessment is complete or ongoing
    const displayMetrics = isAssessing ? metrics : (assessmentComplete ? metrics : null);
    
    if (!displayMetrics) return null;

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Tapping Speed"
            value={`${displayMetrics.tapsPerSecond.toFixed(1)} taps/s`}
            previousValue={`${prevMetrics.tapsPerSecond.toFixed(1)}`}
            icon={<SpeedIcon color="primary" />}
            description="Average tapping frequency"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Rhythm Score"
            value={`${displayMetrics.rhythmScore.toFixed(1)}%`}
            previousValue={`${prevMetrics.rhythmScore.toFixed(1)}`}
            icon={<RhythmIcon color="primary" />}
            description="Tapping rhythm consistency"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Duration"
            value={`${displayMetrics.duration.toFixed(1)}s`}
            previousValue={`${prevMetrics.duration.toFixed(1)}`}
            icon={<TimerIcon color="primary" />}
            description="Assessment duration"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Accuracy"
            value={`${displayMetrics.accuracy.toFixed(1)}%`}
            previousValue={`${prevMetrics.accuracy.toFixed(1)}`}
            icon={<TapIcon color="primary" />}
            description="Movement precision"
          />
        </Grid>
      </Grid>
    );
  };

  const renderEnhancedVisualizations = () => {
    if (!realtimeData.timestamps.length) return null;

    return (
      <Box sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Tapping Pattern
              </Typography>
              <TapPatternChart 
                data={realtimeData.tapData}
                baselineData={baselineData?.tapData}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Rhythm Analysis
              </Typography>
              <RhythmAnalysisChart data={realtimeData.rhythmData} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Fatigue Progression
              </Typography>
              <FatigueProgressionChart data={realtimeData.fatigueData} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Precision Map
              </Typography>
              <PrecisionMap data={realtimeData.precisionData} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderSaveStatus = () => {
    if (saveStatus.saving) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          Saving assessment results...
        </Alert>
      );
    }
    if (saveStatus.error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to save: {saveStatus.error}
        </Alert>
      );
    }
    if (saveStatus.success) {
      return (
        <Alert severity="success" sx={{ mt: 2 }}>
          Assessment saved successfully!
        </Alert>
      );
    }
    return null;
  };

  return (
    <AssessmentLayout
      title="Finger Tapping Test"
      description={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            This assessment will analyze your finger tapping pattern. Please tap your index finger
            and thumb together repeatedly at a comfortable pace.
          </Typography>
          <Alert severity="info">
            Position your hand clearly in view of the camera, with your palm facing the camera.
            Tap your index finger and thumb together repeatedly for 30 seconds.
          </Alert>
        </Box>
      }
    >
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, position: 'relative' }}>
              <video
                ref={videoRef}
                style={{ width: '100%', display: isAssessing ? 'block' : 'none' }}
                autoPlay
                playsInline
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}
              />
              {!isAssessing && !assessmentComplete && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <TapIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6">
                    Click Start to begin the finger tapping test
                  </Typography>
                </Box>
              )}
              {isAssessing && (
                <Box sx={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
                  <Typography variant="body1" sx={{ color: 'white', mb: 1, textShadow: '1px 1px 2px black' }}>
                    Time remaining: {timeRemaining} seconds
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(30 - timeRemaining) / 30 * 100} 
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              {assessmentComplete ? (
                <>
                  {!saveStatus.success ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={saveAssessmentResults}
                      startIcon={<CheckCircleIcon />}
                      disabled={saveStatus.saving}
                      sx={{ mb: 2 }}
                    >
                      {saveStatus.saving ? 'Saving...' : 'Complete Assessment'}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={startAssessment}
                      startIcon={<TapIcon />}
                      sx={{ mb: 2 }}
                    >
                      Start New Assessment
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  color={isAssessing ? 'error' : 'primary'}
                  onClick={isAssessing ? () => stopAssessment(videoRef.current?.srcObject) : startAssessment}
                  disabled={error !== null}
                  startIcon={<TapIcon />}
                >
                  {isAssessing ? 'Stop Recording' : 'Start Assessment'}
                </Button>
              )}
              
              {renderSaveStatus()}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              
              {successMessage && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {successMessage}
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>

        {renderMetrics()}
        {renderEnhancedVisualizations()}
      </Box>
    </AssessmentLayout>
  );
};

export default FingerTapping;
