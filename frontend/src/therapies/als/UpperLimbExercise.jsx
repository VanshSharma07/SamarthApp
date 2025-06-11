import { useState, useEffect, useRef } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Button, 
  LinearProgress, 
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  Slider,
  Stack,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LungsIcon from '@mui/icons-material/Air';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';

import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

import CameraView from '../components/CameraView';
import Layout from '../../components/Layout'; // Import Layout component

const UpperLimbExercise = () => {
  // Camera and model state
  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  
  // Exercise state
  const [isExerciseRunning, setIsExerciseRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [exerciseTime, setExerciseTime] = useState(60); // 60 seconds exercise duration
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [breathRate, setBreathRate] = useState(0);
  const [breathDepth, setBreathDepth] = useState(0);
  const [exerciseFinished, setExerciseFinished] = useState(false);
  const [exerciseFeedback, setExerciseFeedback] = useState(null);
  const [breathingPhase, setBreathingPhase] = useState('inhale'); // 'inhale' or 'exhale'
  
  // Breathing phase durations (seconds)
  const INHALE_DURATION = 4;
  const EXHALE_DURATION = 6;
  const [phaseTime, setPhaseTime] = useState(0); // Time spent in current phase
  const [userSync, setUserSync] = useState(true); // Is user following the guide?
  
  // Added: Tracking consecutive out-of-sync frames before showing warning
  const outOfSyncCountRef = useRef(0);
  const SYNC_THRESHOLD = 5; // Number of consecutive frames before warning
  
  // Added: Breathing trend analysis
  const breathTrendRef = useRef([]);
  const syncStatusRef = useRef(true);

  // Timer for breathing phase
  useEffect(() => {
    if (!isExerciseRunning) return;
    let phaseInterval;
    let phaseStart = Date.now();
    let currentPhase = breathingPhase;
    setPhaseTime(0);
    phaseInterval = setInterval(() => {
      const elapsed = (Date.now() - phaseStart) / 1000;
      setPhaseTime(elapsed);
      if (
        (currentPhase === 'inhale' && elapsed >= INHALE_DURATION) ||
        (currentPhase === 'exhale' && elapsed >= EXHALE_DURATION)
      ) {
        // Switch phase
        currentPhase = currentPhase === 'inhale' ? 'exhale' : 'inhale';
        setBreathingPhase(currentPhase);
        setPhaseTime(0);
        phaseStart = Date.now();
        // Count a breath at the end of exhale
        if (currentPhase === 'inhale') setBreathCount(prev => prev + 1);
      }
    }, 100);
    return () => clearInterval(phaseInterval);
  }, [isExerciseRunning]);

  // Pose detection model
  const modelRef = useRef(null);
  const timerRef = useRef(null);
  const poseHistoryRef = useRef([]);
  const lastChestSizeRef = useRef(null);
  const breathingDirectionRef = useRef(null); // 'expanding' or 'contracting'
  const videoRef = useRef(null); // Add reference for the video element
  
  // Load the pose detection model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        console.log("TensorFlow.js is ready");
        
        // Load the pose detection model
        console.log("Loading pose detection model...");
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true
        };
        modelRef.current = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet, 
          detectorConfig
        );
        console.log("Pose detection model loaded");
        
        setModelLoaded(true);
      } catch (error) {
        console.error("Error loading pose model:", error);
        setModelError(error.message || "Failed to load body tracking model");
      }
    };

    loadModel();
  }, []);
  
  // Start the exercise with countdown
  const startExercise = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          beginExercise();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Reset breathing state
    setBreathingPhase('inhale');
    poseHistoryRef.current = [];
    lastChestSizeRef.current = null;
    breathingDirectionRef.current = null;
    
    // Reset the sync tracking
    outOfSyncCountRef.current = 0;
    breathTrendRef.current = [];
    syncStatusRef.current = true;
    setUserSync(true);
  };
  
  // Begin the actual exercise
  const beginExercise = () => {
    // First clear any existing timers and reset state
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset and start with fresh state
    setIsExerciseRunning(true);
    setElapsedTime(0);
    setBreathCount(0);
    setBreathRate(0);
    setBreathDepth(0);
    setExerciseFinished(false);
    setExerciseFeedback(null);
    setBreathingPhase('inhale');
    setPhaseTime(0);
    
    // Reset all trackers
    poseHistoryRef.current = [];
    lastChestSizeRef.current = null;
    breathingDirectionRef.current = null;
    outOfSyncCountRef.current = 0;
    breathTrendRef.current = [];
    syncStatusRef.current = true;
    
    console.log("Starting new exercise session");
    
    // Start the exercise timer with a slight delay to ensure clean state
    setTimeout(() => {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= exerciseTime) {
            endExercise();
            return exerciseTime;
          }
          return newTime;
        });
      }, 100);
    }, 50);
  };
  
  // End the exercise and analyze results
  const endExercise = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Calculate final metrics
    // Use Math.max(1, breathCount) to avoid division by zero and ensure at least 1 breath is counted
    const breathsPerMinute = (Math.max(1, breathCount) / Math.max(1, elapsedTime)) * 60;
    setBreathRate(breathsPerMinute);

    // Update state to show results
    setIsExerciseRunning(false);
    setExerciseFinished(true);

    // Generate exercise feedback based on breathing metrics
    let feedbackText = '';
    let feedbackSeverity = 'success';

    // Breathing rate analysis (improved logic)
    if (breathsPerMinute >= 6 && breathsPerMinute <= 18) {
      feedbackText = 'Excellent controlled breathing rate! You maintained a good pace throughout the exercise.';
      feedbackSeverity = 'success';
    } else if (breathsPerMinute > 18) {
      feedbackText = 'Your breathing was a bit rapid. Try to take slower, deeper breaths in future sessions.';
      feedbackSeverity = 'info';
    } else if (breathsPerMinute > 0 && breathsPerMinute < 6) {
      feedbackText = 'Your breathing rate was quite slow. Focus on maintaining a steady rhythm with good chest expansion.';
      feedbackSeverity = 'warning';
    } else {
      feedbackText = 'No breaths detected. Please ensure your shoulders are visible and follow the breathing guide.';
      feedbackSeverity = 'error';
    }

    setTimeout(() => {
      setExerciseFeedback({ text: feedbackText, severity: feedbackSeverity });
      console.log("Exercise completed:", { breathRate: breathsPerMinute, breathCount, exerciseFinished: true });
    }, 50);
  };
  
  // Reset the exercise
  const resetExercise = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset all state variables in a single batch update
    setTimeout(() => {
      setIsExerciseRunning(false);
      setElapsedTime(0);
      setBreathCount(0);
      setBreathRate(0);
      setBreathDepth(0);
      setExerciseFinished(false);
      setExerciseFeedback(null);
      setBreathingPhase('inhale');
      setPhaseTime(0);
      setUserSync(true);
      
      // Reset all refs
      poseHistoryRef.current = [];
      lastChestSizeRef.current = null;
      breathingDirectionRef.current = null;
      outOfSyncCountRef.current = 0;
      breathTrendRef.current = [];
      syncStatusRef.current = true;
      
      console.log("Exercise reset completed");
    }, 50);
  };
  
  // Add: Real-time insights state
  const [realTimeInsights, setRealTimeInsights] = useState({
    phase: '',
    chestMovement: '',
    breathDepth: 0,
    breathRate: 0,
    sync: true,
    message: '',
  });

  // Update processFrame to provide real-time insights
  const processFrame = async (video, ctx) => {
    if (!modelLoaded || !video) return;
    try {
      const poses = await modelRef.current.estimatePoses(video);
      if (poses && poses.length > 0) {
        const pose = poses[0];
        let sync = true;
        let chestMovement = '';
        let message = '';
        let depth = breathDepth;
        let rate = breathRate;
        if (isExerciseRunning) {
          sync = analyzeBreathing(pose.keypoints);
          // Real-time chest movement direction
          if (lastChestSizeRef.current !== null && poseHistoryRef.current.length > 3) {
            const recentSizes = poseHistoryRef.current.slice(-4);
            const avgRecentChange = (recentSizes[recentSizes.length-1] - recentSizes[0]) / 3;
            if (avgRecentChange > 10) chestMovement = 'Expanding';
            else if (avgRecentChange < -10) chestMovement = 'Contracting';
            else chestMovement = 'Stable';
          }
          // Real-time message
          if (!sync) {
            message = `Try to ${breathingPhase === 'inhale' ? 'expand' : 'contract'} your chest during ${breathingPhase}.`;
          } else {
            message = `Good job! Keep ${breathingPhase === 'inhale' ? 'expanding' : 'contracting'} your chest.`;
          }
          // Real-time depth and rate
          depth = breathDepth;
          rate = breathRate;
        }
        setRealTimeInsights({
          phase: breathingPhase,
          chestMovement,
          breathDepth: Math.round(depth),
          breathRate: rate.toFixed(1),
          sync,
          message,
        });
        drawKeypoints(ctx, pose.keypoints);
      }
    } catch (error) {
      console.error("Error in pose detection:", error);
    }
  };

  // New method to track and update sync status with more stability
  const updateSyncStatus = (currentSync) => {
    // Add to trend history
    breathTrendRef.current.push(currentSync);
    
    // Keep history manageable
    if (breathTrendRef.current.length > 10) {
      breathTrendRef.current.shift();
    }
    
    // Only update status if we have enough history
    if (breathTrendRef.current.length >= 3) {
      // Calculate the dominant sync state (majority of last frames)
      const syncCount = breathTrendRef.current.filter(sync => sync === true).length;
      const outOfSyncCount = breathTrendRef.current.length - syncCount;
      
      // If 70% of recent frames are out of sync, update status
      if (outOfSyncCount > breathTrendRef.current.length * 0.7 && syncStatusRef.current) {
        outOfSyncCountRef.current++;
        
        // Only show warning after consistent out-of-sync frames
        if (outOfSyncCountRef.current >= SYNC_THRESHOLD) {
          syncStatusRef.current = false;
          setUserSync(false);
        }
      } 
      // If 70% of recent frames are in sync, update status
      else if (syncCount > breathTrendRef.current.length * 0.7 && !syncStatusRef.current) {
        outOfSyncCountRef.current = 0;
        syncStatusRef.current = true;
        setUserSync(true);
      }
    }
  };

  // Draw pose keypoints for visual feedback
  const drawKeypoints = (ctx, keypoints) => {
    keypoints.forEach(kp => {
      if (kp.score > 0.3) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff7043';
        ctx.fill();
      }
    });
  };
  
  // Improved analyzeBreathing for upper-body only (shoulders only) with noise filtering
  const analyzeBreathing = (keypoints) => {
    // Get key points for the upper body (shoulders only)
    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');

    // Ensure both shoulders are detected with good confidence
    if (!leftShoulder || !rightShoulder || leftShoulder.score < 0.3 || rightShoulder.score < 0.3) {
      return undefined;
    }

    // Calculate chest width as an indicator of breathing (distance between shoulders)
    const chestWidth = Math.sqrt(
      Math.pow(rightShoulder.x - leftShoulder.x, 2) +
      Math.pow(rightShoulder.y - leftShoulder.y, 2)
    );

    // Noise filtering: Use a moving average to smooth the signal
    const SMOOTHING_WINDOW = 8; // Number of frames for moving average
    poseHistoryRef.current.push(chestWidth);
    if (poseHistoryRef.current.length > 200) poseHistoryRef.current.shift();
    // Compute smoothed chest width
    let smoothedWidth = chestWidth;
    if (poseHistoryRef.current.length >= SMOOTHING_WINDOW) {
      const recent = poseHistoryRef.current.slice(-SMOOTHING_WINDOW);
      smoothedWidth = recent.reduce((a, b) => a + b, 0) / recent.length;
    }

    // Calculate breath depth as the difference between max and min smoothed chest width in the last breath cycle
    let depthRatio = 0;
    if (poseHistoryRef.current.length > 20) {
      const recentPoints = poseHistoryRef.current.slice(-20).map((v, i, arr) => {
        if (i < SMOOTHING_WINDOW - 1) return v;
        const window = arr.slice(Math.max(0, i - SMOOTHING_WINDOW + 1), i + 1);
        return window.reduce((a, b) => a + b, 0) / window.length;
      });
      const maxWidth = Math.max(...recentPoints);
      const minWidth = Math.min(...recentPoints);
      depthRatio = (maxWidth - minWidth) / (maxWidth || 1);
      setBreathDepth(Math.round(depthRatio * 100));
    }

    // Detect breathing direction (expanding or contracting) with robust threshold
    let sync = true;
    if (lastChestSizeRef.current !== null) {
      const widthDifference = smoothedWidth - lastChestSizeRef.current;
      // Use a robust threshold: at least 1.5% of average shoulder width, minimum 3px
      const avgWidth = poseHistoryRef.current.slice(-30).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(30, poseHistoryRef.current.length));
      const THRESHOLD = Math.max(3, avgWidth * 0.015);
      if (breathingPhase === 'inhale') {
        if (widthDifference < -THRESHOLD) sync = false;
      } else {
        if (widthDifference > THRESHOLD) sync = false;
      }
      // Detect breath cycle for breath count and rate
      if (breathingDirectionRef.current === 'expanding' && widthDifference < -THRESHOLD) {
        breathingDirectionRef.current = 'contracting';
        if (isExerciseRunning) {
          setBreathCount(prev => {
            const newCount = prev + 1;
            if (elapsedTime > 0) {
              setBreathRate (((newCount) / elapsedTime) * 60);
            }
            return newCount;
          });
        }
      } else if ((breathingDirectionRef.current === 'contracting' || breathingDirectionRef.current === null) && widthDifference > THRESHOLD) {
        breathingDirectionRef.current = 'expanding';
      }
    } else {
      breathingDirectionRef.current = null;
    }
    lastChestSizeRef.current = smoothedWidth;
    return sync;
  };
  
  // Improved overlay: animated guide + feedback
  const renderPoseOverlay = (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = 100;
    const phaseDuration = breathingPhase === 'inhale' ? INHALE_DURATION : EXHALE_DURATION;
    const progress = Math.min(1, phaseTime / phaseDuration);
    const animatedRadius = breathingPhase === 'inhale'
      ? baseRadius + progress * 40
      : baseRadius + (1 - progress) * 40;
    // Draw animated ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, animatedRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 16;
    ctx.strokeStyle = breathingPhase === 'inhale'
      ? 'rgba(33, 150, 243, 0.7)'
      : 'rgba(76, 175, 80, 0.7)';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Draw phase text
    ctx.save();
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = breathingPhase === 'inhale' ? '#2196f3' : '#4caf50';
    ctx.fillText(breathingPhase === 'inhale' ? 'INHALE' : 'EXHALE', centerX, centerY + 10);
    ctx.font = '20px Arial';
    ctx.fillStyle = '#222';
    ctx.fillText(
      breathingPhase === 'inhale'
        ? 'Breathe in deeply through your nose'
        : 'Breathe out slowly through your mouth',
      centerX,
      centerY + 44
    );
    ctx.restore();
    // Draw phase progress arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, animatedRadius + 24, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress, false);
    ctx.strokeStyle = breathingPhase === 'inhale' ? '#90caf9' : '#a5d6a7';
    ctx.lineWidth = 8;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Draw timer
    ctx.save();
    ctx.font = '18px Arial';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.fillText(`Phase: ${breathingPhase === 'inhale' ? 'Inhale' : 'Exhale'} (${(phaseDuration - phaseTime).toFixed(1)}s)`, centerX, centerY + 80);
    ctx.restore();
    // Real-time feedback - only show when consistently out of sync
    if (!userSync) {
      ctx.save();
      ctx.font = 'bold 22px Arial';
      ctx.fillStyle = '#e53935';
      ctx.fillText('Try to match the guide!', centerX, centerY - 80);
      ctx.restore();
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8faff 0%, #e8eeff 60%, #f0e6ff 100%)', padding: 0 }}
      >
        <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 4 }, py: { xs: 2, md: 6 } }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              letterSpacing: 1,
              color: 'primary.main',
              textAlign: 'center',
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <LungsIcon sx={{ fontSize: 40, color: 'info.main' }} />
              Breathing Exercises for ALS
            </Box>
          </Typography>
          
          <Grid container spacing={{ xs: 2, md: 4 }} alignItems="stretch" justifyContent="center">
            <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Paper elevation={6} sx={{ borderRadius: 5, overflow: 'hidden', position: 'relative', minHeight: 420, background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 8px 32px 0 #0091a122, 0 1.5px 10px 0 #7c3dcc22' }}>
                {!modelLoaded && (
                  <Box className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10">
                    <Box className="text-center p-4">
                      <CircularProgress color="primary" className="mb-4" />
                      <Typography variant="h6" className="text-white">
                        Loading body tracking model...
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {modelError && (
                  <Box className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10">
                    <Box className="text-center p-4 max-w-md">
                      <Alert severity="error" className="mb-4">
                        {modelError}
                      </Alert>
                      <Typography variant="body2" className="text-white mb-4">
                        There was an error loading the body tracking model. Please try refreshing the page.
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {countdown > 0 && countdown < 4 && (
                  <Box className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10">
                    <Typography variant="h1" className="text-white font-bold text-6xl">
                      {countdown}
                    </Typography>
                  </Box>
                )}
                
                <CameraView
                  videoRef={videoRef}
                  onFrame={processFrame}
                  renderOverlay={renderPoseOverlay}
                  cameraReady={cameraReady}
                  setCameraReady={setCameraReady}
                  width={640}
                  height={480}
                />
              </Paper>
              <Box sx={{ mt: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', alignItems: 'center', gap: 2, width: '100%' }}>
                {!isExerciseRunning && !exerciseFinished ? (
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={startExercise}
                    disabled={!modelLoaded || !cameraReady}
                    fullWidth
                  >
                    Start Breathing Exercise
                  </Button>
                ) : (
                  <Box className="w-full flex space-x-4">
                    {isExerciseRunning ? (
                      <Button 
                        variant="contained" 
                        color="secondary" 
                        startIcon={<PauseIcon />}
                        onClick={endExercise}
                        fullWidth
                      >
                        Stop Exercise
                      </Button>
                    ) : (
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        startIcon={<RestartAltIcon />}
                        onClick={resetExercise}
                        fullWidth
                      >
                        Reset Exercise
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
              {isExerciseRunning && (
                <Paper elevation={3} sx={{ p: 3, mt: 4, borderRadius: 4, background: 'linear-gradient(90deg, #e3f2fd 60%, #fce4ec 100%)', width: '100%', maxWidth: 500, mx: 'auto' }}>
                  <Box className="flex justify-between items-center mb-2">
                    <Typography variant="body2">
                      Exercise Progress:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(elapsedTime)} / {exerciseTime} seconds
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(elapsedTime / exerciseTime) * 100}
                    className="h-2 rounded-full"
                  />
                  
                  <Box className="mt-4 p-3 bg-blue-50 rounded-md">
                    <Typography variant="subtitle2" align="center" gutterBottom>
                      Current Phase: {breathingPhase === 'inhale' ? 'INHALE' : 'EXHALE'}
                    </Typography>
                    <Typography variant="body2" align="center">
                      {breathingPhase === 'inhale' 
                        ? 'Breathe in deeply through your nose, expanding your chest' 
                        : 'Breathe out slowly through your mouth, emptying your lungs'
                      }
                    </Typography>
                  </Box>
                </Paper>
              )}
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              <Card elevation={5} sx={{ mb: 0, borderRadius: 4, background: 'linear-gradient(120deg, #fce4ec 0%, #e3f2fd 100%)', width: '100%', maxWidth: 420 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Exercise Instructions
                  </Typography>
                  <Typography variant="body2" paragraph>
                    1. Sit upright with your shoulders relaxed and back straight.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    2. Follow the on-screen breathing guide, inhaling deeply through your nose.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    3. Exhale slowly through your mouth, taking twice as long as your inhale.
                  </Typography>
                  <Typography variant="body2">
                    4. Focus on using your diaphragm, allowing your chest to expand fully.
                  </Typography>
                </CardContent>
              </Card>
              <Paper elevation={3} sx={{ p: 4, borderRadius: 4, background: '#f5fafd', width: '100%', maxWidth: 420 }}>
                <Typography variant="h6" gutterBottom>
                  Breathing Metrics
                </Typography>
                <Box className="space-y-3">
                  <Box>
                    <Box className="flex items-center justify-between mb-1">
                      <Box className="flex items-center">
                        <LungsIcon className="mr-2 text-blue-500" />
                        <Typography variant="body2">Breath Depth:</Typography>
                      </Box>
                      <Chip label={`${Math.round(breathDepth)}%`} color="primary" />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={breathDepth}
                      className="h-2 rounded-full"
                    />
                  </Box>
                  
                  <Box className="flex items-center justify-between">
                    <Box className="flex items-center">
                      <SpeedIcon className="mr-2 text-green-500" />
                      <Typography variant="body2">Breathing Rate:</Typography>
                    </Box>
                    <Chip 
                      label={`${breathRate.toFixed(1)} breaths/min`} 
                      color={
                        breathRate > 6 && breathRate < 15 
                          ? 'success' 
                          : 'default'
                      } 
                    />
                  </Box>
                  
                  <Box className="flex items-center justify-between">
                    <Box className="flex items-center">
                      <TimerIcon className="mr-2 text-purple-500" />
                      <Typography variant="body2">Complete Breaths:</Typography>
                    </Box>
                    <Chip label={breathCount} />
                  </Box>
                </Box>
              </Paper>
              <Paper elevation={3} sx={{ p: 4, borderRadius: 4, background: '#f5fafd', width: '100%', maxWidth: 420 }}>
                <Typography variant="h6" gutterBottom>
                  Benefits for ALS Patients
                </Typography>
                <Box className="mt-2">
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <Typography variant="body2">
                        <span className="font-medium">Maintains Respiratory Strength:</span> Regular breathing exercises 
                        can help maintain the strength of respiratory muscles affected by ALS.
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <span className="font-medium">Improves Lung Capacity:</span> Deep breathing techniques can 
                        maximize lung capacity and efficiency.
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <span className="font-medium">Reduces Anxiety:</span> Controlled breathing helps reduce 
                        stress and anxiety, common challenges in ALS.
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2">
                        <span className="font-medium">Delays Respiratory Assistance:</span> Regular practice may 
                        delay the need for ventilatory support.
                      </Typography>
                    </li>
                  </ul>
                </Box>
              </Paper>
              {/* Use conditional rendering with looser condition - show feedback even if just exerciseFinished */}
              {exerciseFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ width: '100%', maxWidth: 420 }}
                >
                  {exerciseFeedback ? (
                    <Alert severity={exerciseFeedback.severity} sx={{ mb: 4, fontSize: 18, fontWeight: 500 }}>
                      {exerciseFeedback.text}
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ mb: 4, fontSize: 18, fontWeight: 500 }}>
                      Your breathing rate was quite slow. Focus on maintaining a steady rhythm with good chest expansion.
                    </Alert>
                  )}
                  
                  <Card elevation={4} sx={{ borderRadius: 4, background: 'linear-gradient(120deg, #e3f2fd 0%, #fce4ec 100%)' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Session Summary
                      </Typography>
                      <Box className="space-y-4 mt-4">
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Breathing Rate
                          </Typography>
                          <Stack spacing={2} direction="row" alignItems="center">
                            <Typography>Slow</Typography>
                            <Slider
                              value={Math.min(100, (breathRate || 0) / 20 * 100)}
                              disabled
                              valueLabelDisplay="auto"
                              max={100}
                            />
                            <Typography>Fast</Typography>
                          </Stack>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Average Breath Depth
                          </Typography>
                          <Stack spacing={2} direction="row" alignItems="center">
                            <Typography>Shallow</Typography>
                            <Slider
                              value={Math.round(breathDepth)}
                              disabled
                              valueLabelDisplay="auto"
                              max={100}
                            />
                            <Typography>Deep</Typography>
                          </Stack>
                        </Box>
                        
                        <Box className="p-3 bg-blue-50 rounded-md">
                          <Typography variant="body2" paragraph>
                            Recommended practice: 3-5 sessions daily, 5-10 minutes each
                          </Typography>
                          <Typography variant="body2">
                            Continue focusing on diaphragmatic breathing for best results.
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box className="mt-6">
                        <Button 
                          variant="outlined" 
                          color="primary"
                          onClick={startExercise}
                          fullWidth
                        >
                          Start New Session
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </Grid>
          </Grid>
          
          {isExerciseRunning && (
            <Box sx={{ mt: 2, width: '100%', maxWidth: 480, mx: 'auto', p: 2, borderRadius: 3, background: '#e3f2fd', boxShadow: '0 2px 8px #2196f322', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Real-Time Breathing Insights
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Chip label={`Phase: ${realTimeInsights.phase.toUpperCase()}`} color={realTimeInsights.phase === 'inhale' ? 'primary' : 'success'} />
                <Chip label={`Chest: ${realTimeInsights.chestMovement}`} color={realTimeInsights.chestMovement === 'Expanding' ? 'primary' : realTimeInsights.chestMovement === 'Contracting' ? 'success' : 'default'} />
                <Chip label={`Sync: ${realTimeInsights.sync ? '✔' : '✖'}`} color={realTimeInsights.sync ? 'success' : 'error'} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Chip label={`Depth: ${realTimeInsights.breathDepth}%`} color="primary" />
                <Chip label={`Rate: ${realTimeInsights.breathRate} bpm`} color="secondary" />
              </Box>
              <Typography variant="body2" color={realTimeInsights.sync ? 'success.main' : 'error.main'} sx={{ mt: 1, fontWeight: 500 }}>
                {realTimeInsights.message}
              </Typography>
            </Box>
          )}
        </Box>
      </motion.div>
    </Layout>
  );
};

export default UpperLimbExercise;