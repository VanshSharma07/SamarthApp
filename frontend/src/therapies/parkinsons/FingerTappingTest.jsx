import { useState, useEffect, useRef, useCallback } from 'react';
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
  CircularProgress,
  Alert
} from '@mui/material';
import { motion } from 'framer-motion';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import * as THREE from 'three';
import { useTheme } from '@mui/material/styles';
import Layout from '../../components/Layout';

import useHandTracking from '../hooks/useHandTracking';

const FingerTappingTest = () => {
  const theme = useTheme();
  // Hand tracking hook
  const { webcamRef, canvasRef, isModelLoading, modelError, hands, startHandTracking } = useHandTracking();
  
  // Test state
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [testTime, setTestTime] = useState(15); // 15 seconds test duration
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [tapSpeed, setTapSpeed] = useState(0);
  const [tapStrength, setTapStrength] = useState(0);
  const [testFinished, setTestFinished] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showTapVisual, setShowTapVisual] = useState(false);

  // Refs for test logic
  const timerRef = useRef(null);
  const previousFingerPositionRef = useRef(null);
  const tapHistoryRef = useRef([]);
  const testStartTimeRef = useRef(null);
  const tapCountRef = useRef(0);
  const finalTapSpeedRef = useRef(null);
  
  // Finger indices (thumb is 4, index finger is 8)
  const THUMB_TIP = 4;
  const INDEX_TIP = 8;
  
  // Function to update tap speed based on current data
  const updateTapSpeed = useCallback(() => {
    // Don't update if test is finished or no test has started
    if (!testStartTimeRef.current || tapCountRef.current === 0 || testFinished) return;
    
    const currentElapsed = (Date.now() - testStartTimeRef.current) / 1000;
    if (currentElapsed <= 0) return;
    
    const currentSpeed = tapCountRef.current / currentElapsed;
    // Ensure we don't set exactly 0.0 which might display as "0.0"
    setTapSpeed(currentSpeed === 0 ? 0.1 : currentSpeed);
  }, [testFinished]);
  
  // Start the camera and hand tracking
  const setupCamera = async () => {
    const success = await startHandTracking();
    if (success) {
      setCameraReady(true);
    }
  };
  
  // Start the test with countdown
  const startTest = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          beginTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Begin the actual test
  const beginTest = () => {
    setIsTestRunning(true);
    setElapsedTime(0);
    setTapCount(0);
    tapCountRef.current = 0;
    setTapSpeed(0);
    setTapStrength(0);
    setTestFinished(false);
    setTestFeedback(null);
    tapHistoryRef.current = [];
    previousFingerPositionRef.current = null;
    testStartTimeRef.current = Date.now();
    finalTapSpeedRef.current = null;

    // Accurate timer using Date.now()
    const startTimestamp = Date.now();
    timerRef.current = setInterval(() => {
      // Prevent updating elapsedTime if test is not running
      if (!isTestRunning || testFinished) return;
      const elapsed = (Date.now() - startTimestamp) / 1000;
      if (elapsed >= testTime) {
        setElapsedTime(testTime);
        endTest();
      } else {
        setElapsedTime(elapsed);
      }
    }, 50);
  };
  
  // End the test and analyze results
  const endTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsTestRunning(false);
    setTestFinished(true);

    // Calculate and freeze the final values
    const actualElapsedTime = (Date.now() - testStartTimeRef.current) / 1000;
    const finalTapsPerSecond = tapCountRef.current / (actualElapsedTime > 0 ? actualElapsedTime : testTime);
    
    // Force a non-zero value if we have taps (to avoid 0.0 display issue)
    const displaySpeed = tapCountRef.current > 0 && finalTapsPerSecond < 0.1 ? 0.1 : finalTapsPerSecond;
    
    // Set the final values
    setElapsedTime(actualElapsedTime);
    setTapSpeed(displaySpeed);
    finalTapSpeedRef.current = displaySpeed;

    // Generate dynamic test feedback based on actual performance
    let feedbackText = '';
    let feedbackSeverity = 'success';

    if (finalTapsPerSecond >= 3.5) {
      feedbackText = 'Excellent performance! Your finger tapping speed is above average.';
      feedbackSeverity = 'success';
    } else if (finalTapsPerSecond >= 2.5) {
      feedbackText = 'Good performance. Your finger tapping speed is within normal range.';
      feedbackSeverity = 'success';
    } else if (finalTapsPerSecond >= 1.5) {
      feedbackText = 'Fair performance. Keep practicing to improve your speed.';
      feedbackSeverity = 'info';
    } else {
      feedbackText = 'Your tapping speed is below typical range. Consider practicing more or consulting with your healthcare provider.';
      feedbackSeverity = 'warning';
    }

    setTestFeedback({ text: feedbackText, severity: feedbackSeverity });
  };
  
  // Reset the test
  const resetTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsTestRunning(false);
    setElapsedTime(0);
    setTapCount(0);
    tapCountRef.current = 0;
    setTapSpeed(0);
    setTapStrength(0);
    setTestFinished(false);
    setTestFeedback(null);
    tapHistoryRef.current = [];
    previousFingerPositionRef.current = null;
    testStartTimeRef.current = null;
    finalTapSpeedRef.current = null;
  };
  
  // Detect finger taps using the hand tracking data
  useEffect(() => {
    if (!isTestRunning || !hands || hands.length === 0) return;
    
    try {
      const hand = hands[0];
      const landmarks = hand.landmarks;
      
      if (!landmarks || !landmarks[THUMB_TIP] || !landmarks[INDEX_TIP]) {
        return;
      }
      
      const thumbTip = landmarks[THUMB_TIP];
      const indexTip = landmarks[INDEX_TIP];
      const distanceX = thumbTip[0] - indexTip[0];
      const distanceY = thumbTip[1] - indexTip[1];
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      const MOVEMENT_THRESHOLD = 28;
      if (previousFingerPositionRef.current !== null) {
        const movement = Math.abs(distance - previousFingerPositionRef.current);
        if (movement > MOVEMENT_THRESHOLD) {
          const now = Date.now();
          const lastTapTime = tapHistoryRef.current.length > 0 ? tapHistoryRef.current[tapHistoryRef.current.length - 1].time : 0;
          if (now - lastTapTime > 180) {
            tapHistoryRef.current.push({ time: now, movement });
            
            tapCountRef.current += 1;
            setTapCount(tapCountRef.current);
            
            if (isTestRunning && !testFinished) {
              updateTapSpeed();
            }
            
            setShowTapVisual(true);
            setTimeout(() => setShowTapVisual(false), 180);
            
            if (tapHistoryRef.current.length > 1) {
              const recentTaps = tapHistoryRef.current.slice(-5);
              const avgMovement = recentTaps.reduce((sum, tap) => sum + tap.movement, 0) / recentTaps.length;
              setTapStrength(prev => 0.7 * prev + 0.3 * (avgMovement / MOVEMENT_THRESHOLD * 100));
            }
          }
        }
      }
      previousFingerPositionRef.current = distance;
    } catch (error) {
      console.error("Error in tap detection:", error);
    }
  }, [hands, isTestRunning, testFinished, updateTapSpeed]);

  // Setup camera when component mounts
  useEffect(() => {
    setupCamera();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formattedTapSpeed = () => {
    if (testFinished && finalTapSpeedRef.current !== null) {
      return `${finalTapSpeedRef.current.toFixed(1)} taps/sec`;
    }
    
    if (tapCount > 0 && tapSpeed === 0) {
      return "0.1 taps/sec";
    }
    return `${tapSpeed.toFixed(1)} taps/sec`;
  };

  const getTapFrequencyPercentage = () => {
    const speedToUse = testFinished && finalTapSpeedRef.current !== null 
      ? finalTapSpeedRef.current 
      : tapSpeed;
      
    const normalizedPercentage = Math.min(100, (speedToUse / 5) * 100);
    return normalizedPercentage;
  };

  const getConsistencyPercentage = () => {
    if (tapHistoryRef.current.length < 2) return 0;
    
    const tapIntervals = [];
    for (let i = 1; i < tapHistoryRef.current.length; i++) {
      tapIntervals.push(tapHistoryRef.current[i].time - tapHistoryRef.current[i-1].time);
    }
    
    const mean = tapIntervals.reduce((sum, val) => sum + val, 0) / tapIntervals.length;
    const variance = tapIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / tapIntervals.length;
    
    const maxExpectedVariance = 40000;
    const consistencyScore = Math.max(0, 100 - (variance / maxExpectedVariance * 100));
    return consistencyScore;
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f8f9fa',
      py: 4
    }}>
      <Box sx={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: { xs: 2, md: 4 }
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{
            fontWeight: 700,
            color: '#1976d2',
            textAlign: 'center',
            mb: 4
          }}
        >
          Finger Tapping Therapy
        </Typography>
        
        <Grid container spacing={4} alignItems="flex-start" justifyContent="center">
          {/* Left Column - Camera Feed */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={2} sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 400, md: 500, lg: 600 },
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: '#ffffff',
              border: '1px solid #e0e0e0'
            }}>
              {isModelLoading && (
                <Box sx={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  zIndex: 10 
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress 
                      sx={{ color: '#1976d2', mb: 2 }} 
                      size={50}
                    />
                    <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600 }}>
                      Loading Camera
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                      Initializing hand tracking...
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {modelError && (
                <Box sx={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  zIndex: 10 
                }}>
                  <Box sx={{ textAlign: 'center', maxWidth: 400, p: 3 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {modelError}
                    </Alert>
                    <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                      Please allow camera access to continue with the test.
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={setupCamera}
                      sx={{ borderRadius: 2 }}
                    >
                      Try Again
                    </Button>
                  </Box>
                </Box>
              )}
              
              {countdown > 0 && countdown < 4 && (
                <Box sx={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  bgcolor: 'rgba(0, 0, 0, 0.8)',
                  zIndex: 10 
                }}>
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: { xs: '4rem', md: '6rem' }
                    }}
                  >
                    {countdown}
                  </Typography>
                </Box>
              )}
              
              <video ref={webcamRef} style={{ display: 'none' }} playsInline />
              <canvas 
                ref={canvasRef} 
                style={{ 
                  position: 'absolute', 
                  left: 0, 
                  top: 0, 
                  width: '100%', 
                  height: '100%'
                }} 
              />
              
              {showTapVisual && (
                <Box sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}>
                  <Box sx={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: 'rgba(25, 118, 210, 0.3)',
                    border: '3px solid #1976d2',
                    animation: 'pulse 0.3s ease-out'
                  }} />
                </Box>
              )}
              
              {/* Progress bar during test */}
              {isTestRunning && (
                <LinearProgress 
                  variant="determinate" 
                  value={(elapsedTime / testTime) * 100}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#1976d2'
                    }
                  }}
                />
              )}
            </Paper>
            
            {/* Control Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              {!isTestRunning && !testFinished ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={startTest}
                  disabled={isModelLoading || !cameraReady}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '1rem',
                    minWidth: '200px',
                    bgcolor: '#1976d2',
                    '&:hover': {
                      bgcolor: '#1565c0'
                    }
                  }}
                >
                  Start Test
                </Button>
              ) : (
                <>
                  {isTestRunning ? (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<PauseIcon />}
                      onClick={endTest}
                      sx={{
                        py: 1.5,
                        px: 4,
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: '1rem',
                        minWidth: '200px'
                      }}
                    >
                      Stop Test
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<RotateLeftIcon />}
                      onClick={resetTest}
                      sx={{
                        py: 1.5,
                        px: 4,
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: '1rem',
                        minWidth: '200px'
                      }}
                    >
                      Reset Test
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Grid>
          
          {/* Right Column - Stats and Instructions */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Live Metrics */}
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#333',
                      fontWeight: 600,
                      mb: 3
                    }}
                  >
                    Live Metrics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f5f5f5'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <FitnessCenterIcon sx={{ color: '#1976d2' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Total Taps
                        </Typography>
                      </Box>
                      <Chip 
                        label={tapCount}
                        sx={{
                          bgcolor: '#1976d2',
                          color: '#fff',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f5f5f5'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SpeedIcon sx={{ color: '#2e7d32' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Tap Speed
                        </Typography>
                      </Box>
                      <Chip 
                        label={formattedTapSpeed()}
                        sx={{
                          bgcolor: '#2e7d32',
                          color: '#fff',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#f5f5f5'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <AccessTimeIcon sx={{ color: '#ed6c02' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Elapsed Time
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${elapsedTime.toFixed(1)} sec`}
                        sx={{
                          bgcolor: '#ed6c02',
                          color: '#fff',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card elevation={2} sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#333',
                      fontWeight: 600,
                      mb: 2
                    }}
                  >
                    Instructions
                  </Typography>
                  <Box component="ol" sx={{ pl: 2, mt: 1, color: '#666' }}>
                    <Typography component="li" variant="body2" paragraph sx={{ mb: 1.5, lineHeight: 1.6 }}>
                      Position your hand in front of the camera so your thumb and index finger are clearly visible.
                    </Typography>
                    <Typography component="li" variant="body2" paragraph sx={{ mb: 1.5, lineHeight: 1.6 }}>
                      When the test starts, tap your thumb and index finger together as quickly as possible.
                    </Typography>
                    <Typography component="li" variant="body2" paragraph sx={{ mb: 1.5, lineHeight: 1.6 }}>
                      Continue tapping for the full 10 seconds.
                    </Typography>
                    <Typography component="li" variant="body2" sx={{ lineHeight: 1.6 }}>
                      Try to maintain consistent rhythm and pressure.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Test Results */}
              {testFinished && testFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Alert 
                    severity={testFeedback.severity} 
                    sx={{ mb: 3, borderRadius: 2 }}
                  >
                    <Typography variant="body2">
                      {testFeedback.text}
                    </Typography>
                  </Alert>
                  
                  <Card elevation={2} sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: '#333',
                          fontWeight: 600,
                          mb: 3
                        }}
                      >
                        Test Results
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#666',
                              mb: 1,
                              fontWeight: 500
                            }}
                          >
                            Tapping Frequency
                          </Typography>
                          <Box sx={{ 
                            width: '100%', 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: '#e0e0e0',
                            overflow: 'hidden'
                          }}>
                            <Box 
                              sx={{ 
                                height: '100%',
                                width: `${getTapFrequencyPercentage()}%`,
                                bgcolor: '#1976d2',
                                borderRadius: 4,
                                transition: 'width 0.5s ease'
                              }} 
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Slow</Typography>
                            <Typography variant="caption" color="text.secondary">Fast</Typography>
                          </Box>
                        </Box>
                        
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#666',
                              mb: 1,
                              fontWeight: 500
                            }}
                          >
                            Consistency
                          </Typography>
                          <Box sx={{ 
                            width: '100%', 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: '#e0e0e0',
                            overflow: 'hidden'
                          }}>
                            <Box 
                              sx={{ 
                                height: '100%',
                                width: `${getConsistencyPercentage()}%`,
                                bgcolor: '#2e7d32',
                                borderRadius: 4,
                                transition: 'width 0.5s ease'
                              }} 
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Variable</Typography>
                            <Typography variant="caption" color="text.secondary">Consistent</Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mt: 3 }}>
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={startTest} 
                          fullWidth
                          sx={{ 
                            borderRadius: 2, 
                            py: 1.2,
                            fontWeight: 600
                          }}
                        >
                          Try Again
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        }
      `}</style>
    </Box>
  );
};

// Wrap the FingerTappingTest with Layout
const FingerTappingTestWithLayout = () => {
  return (
    <Layout>
      <FingerTappingTest />
    </Layout>
  );
};

export default FingerTappingTestWithLayout;