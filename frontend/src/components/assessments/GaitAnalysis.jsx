import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  DirectionsWalk as WalkIcon,
  Speed as SpeedIcon,
  Balance as BalanceIcon,
  Timeline as PatternIcon,
  CheckCircle
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import AssessmentLayout from './AssessmentLayout';
import { startGaitAnalysis, stopGaitAnalysis } from '../../services/assessments/gaitService';
import assessmentService from '../../services/assessmentService';
import {
  GaitPhaseChart,
  StabilityHeatmap,
  SymmetryRadar,
  JointAnglesTimeline
} from '../visualizations/GaitVisualizations';
import { GaitMetricsAnalyzer } from '../../services/metrics/gaitMetrics';
import { useAuth } from '../../contexts/AuthContext';
import { assessment, specializedAssessments } from '../../services/api';

// MetricCard component
const MetricCard = ({ title, value, icon, description }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" gutterBottom>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
  </Card>
);

const GaitAnalysis = ({ userId, onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null, success: false });
  const [realtimeData, setRealtimeData] = useState({
    acceleration: [],
    balance: [],
    timestamps: [],
    phaseData: [],
    stabilityData: {
      stabilityTrends: {
        timeSeriesData: []
      }
    },
    jointData: {
      timestamps: [],
      hipAngles: [],
      kneeAngles: [],
      ankleAngles: []
    },
    symmetryData: []
  });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timeoutRef = useRef(null);
  const analysisRef = useRef(null);
  const streamRef = useRef(null);
  const [baselineData, setBaselineData] = useState(null);
  const metricsAnalyzer = useRef(new GaitMetricsAnalyzer());
  const { currentUser } = useAuth();
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [ws, setWs] = useState(null);
  const [sensorData, setSensorData] = useState({
    deviceId: null,
    connected: false,
    leftFoot: {
      fsr: { sensor1: 0, sensor2: 0, sensor3: 0, sensor4: 0, sensor5: 0, sensor6: 0 }
    },
    rightFoot: {
      fsr: { sensor1: 0, sensor2: 0, sensor3: 0, sensor4: 0, sensor5: 0, sensor6: 0 }
    },
    imu: {
      accel: { x: 0, y: 0, z: 0 },
      gyro: { x: 0, y: 0, z: 0 }
    },
    timestamp: null
  });

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (analysisRef.current && streamRef.current) {
      stopGaitAnalysis();
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
      setWs(null);
    }
  }, [ws]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    // Load baseline data when component mounts
    loadBaselineData();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      stopGaitAnalysis();
    };
  }, []);

  // Connect to WebSocket server
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:5000/ws/sensors');

    websocket.onopen = () => {
      console.log('✅ WebSocket connected to /ws/sensors');
      setSensorData(prev => ({ ...prev, connected: true }));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📊 Sensor data received:', data);
        handleSensorData(data);
      } catch (error) {
        console.error('Error parsing sensor data:', error);
      }
    };

    websocket.onclose = () => {
      console.log('❌ WebSocket disconnected');
      setSensorData(prev => ({ ...prev, connected: false }));
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setSensorData(prev => ({ ...prev, connected: false }));
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  // Update the loadBaselineData function to pass userId
  const loadBaselineData = async () => {
    try {
      // Get current user ID from auth context or localStorage
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        console.warn('No user ID available for baseline data');
        return;
      }
      
      // Call the getBaselineData function with both type and userId
      const baseline = await assessmentService.getBaselineData(ASSESSMENT_TYPES.GAIT, userId);
      
      if (baseline) {
        console.log('Baseline data loaded:', baseline);
        setBaselineData(baseline);
      } else {
        console.log('No baseline data available');
        setBaselineData(null);
      }
    } catch (error) {
      console.error('Error loading baseline data:', error);
      setBaselineData(null);
    }
  };

  const startAssessment = async () => {
    try {
      cleanup();
      setLoading(true);
      setIsRecording(true);
      setError(null);
      setMetrics(null);
      setAnalysisComplete(false);
      setSaveStatus({ saving: false, error: null, success: false });

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640,
          height: 480,
          frameRate: { ideal: 30 }
        } 
      });
      
      streamRef.current = stream;
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

      // Start gait analysis
      await startGaitAnalysis(videoRef.current, handleRealtimeUpdate);

      // Auto-stop after 30 seconds
      timeoutRef.current = setTimeout(() => {
        finishRecording();
      }, 30000);

    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const finishRecording = async () => {
    try {
      setIsRecording(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Stop video stream and analysis
      const stream = videoRef.current?.srcObject;
      stream?.getTracks().forEach(track => track.stop());
      stopGaitAnalysis();

      // Mark analysis as complete but don't auto-save
      setAnalysisComplete(true);
    } catch (err) {
      handleError(err);
    }
  };

  const handleRealtimeUpdate = (data) => {
    if (data.error) {
      handleError(new Error(data.error));
      return;
    }

    // Draw pose on canvas
    if (canvasRef.current && data.keypoints) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      drawPose(ctx, data.keypoints);
    }

    // Update realtime data for visualizations
    setRealtimeData(prevData => {
      // Keep only the last 100 data points for performance
      const maxDataPoints = 100;
      const sliceStart = prevData.timestamps.length > maxDataPoints ? 1 : 0;
      const timestamp = Date.now();

      // Add new phase data point
      const newPhaseData = [...(prevData.phaseData || []).slice(sliceStart)];
      if (data.phaseData) {
        newPhaseData.push(data.phaseData);
      }

      return {
        acceleration: [...prevData.acceleration.slice(sliceStart), data.velocity || { x: 0, y: 0 }],
        balance: [...prevData.balance.slice(sliceStart), data.balance || 0],
        timestamps: [...prevData.timestamps.slice(sliceStart), timestamp],
        phaseData: newPhaseData,
        stabilityData: {
          stabilityTrends: {
            timeSeriesData: [
              ...prevData.stabilityData.stabilityTrends.timeSeriesData.slice(sliceStart),
              {
                timestamp,
                stability: data.stability?.score || 0,
                lateralSway: data.stability?.lateralSway || 0,
                verticalSway: data.stability?.verticalSway || 0
              }
            ]
          }
        },
        jointData: {
          timestamps: [...prevData.jointData.timestamps.slice(sliceStart), timestamp],
          hipAngles: [...prevData.jointData.hipAngles.slice(sliceStart), 
            (data.jointAngles?.find(j => j.joint === 'left_hip')?.angle || 0)],
          kneeAngles: [...prevData.jointData.kneeAngles.slice(sliceStart),
            (data.jointAngles?.find(j => j.joint === 'left_knee')?.angle || 0)],
          ankleAngles: [...prevData.jointData.ankleAngles.slice(sliceStart),
            (data.jointAngles?.find(j => j.joint === 'left_ankle')?.angle || 0)]
        },
        symmetryData: [
          data.symmetry?.legSymmetry || 0,
          data.symmetry?.overall || 0,
          data.symmetry?.armSymmetry || 0,
          data.jointAngles?.find(j => j.joint === 'left_hip')?.confidence || 0,
          data.jointAngles?.find(j => j.joint === 'right_hip')?.confidence || 0,
          data.jointAngles?.find(j => j.joint === 'left_knee')?.confidence || 0
        ]
      };
    });

    // Update metrics for display
    if (data.stability || data.balance || data.symmetry || data.jointAngles) {
      setMetrics({
        stability: data.stability?.score || 0,
        balance: data.balance || 0,
        symmetry: data.symmetry?.overall || 0,
        jointAngles: data.jointAngles || []
      });
    }
  };

  const drawPose = (ctx, keypoints) => {
    // Draw keypoints
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    });

    // Draw connections
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'],
      ['right_knee', 'right_ankle']
    ];

    connections.forEach(([p1, p2]) => {
      const point1 = keypoints.find(kp => kp.name === p1);
      const point2 = keypoints.find(kp => kp.name === p2);
      
      if (point1 && point2 && point1.score > 0.3 && point2.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  const saveAssessmentResults = async () => {
    try {
      setSaveStatus({ saving: true, error: null, success: false });

      // Prepare metrics data
      const stabilityAvg = realtimeData.stabilityData.stabilityTrends.timeSeriesData
        .reduce((sum, data) => sum + data.stability, 0) / 
        Math.max(1, realtimeData.stabilityData.stabilityTrends.timeSeriesData.length);
      
      // Format the metrics for the specialized assessment API
      const assessmentData = {
        userId,
        type: 'gaitAnalysis',
        timestamp: new Date().toISOString(),
        metrics: {
          stability: {
            score: metrics?.stability || stabilityAvg || 0,
            lateralSway: realtimeData.stabilityData.stabilityTrends.timeSeriesData[0]?.lateralSway || 0,
            verticalSway: realtimeData.stabilityData.stabilityTrends.timeSeriesData[0]?.verticalSway || 0
          },
          balance: {
            score: metrics?.balance || 0
          },
          symmetry: {
            overall: metrics?.symmetry || 0,
            legSymmetry: realtimeData.symmetryData[0] || 0,
            armSymmetry: realtimeData.symmetryData[2] || 0
          },
          jointAngles: {
            hipLeft: realtimeData.jointData.hipAngles[realtimeData.jointData.hipAngles.length - 1] || 0,
            kneeLeft: realtimeData.jointData.kneeAngles[realtimeData.jointData.kneeAngles.length - 1] || 0,
            ankleLeft: realtimeData.jointData.ankleAngles[realtimeData.jointData.ankleAngles.length - 1] || 0
          },
          gait: {
            speed: calculateAverageSpeed(realtimeData.acceleration),
            walkingTime: (realtimeData.timestamps[realtimeData.timestamps.length - 1] - 
                        realtimeData.timestamps[0]) / 1000 // in seconds
          },
          // Include time series data for detailed analysis
          timeSeriesData: {
            timestamps: realtimeData.timestamps,
            acceleration: realtimeData.acceleration,
            balance: realtimeData.balance,
            phaseData: realtimeData.phaseData,
            stabilityData: realtimeData.stabilityData,
            jointData: realtimeData.jointData,
            symmetryData: realtimeData.symmetryData
          }
        }
      };

      // Use specialized assessment API instead
      const response = await specializedAssessments.gaitAnalysis.save(assessmentData);
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to save gait analysis assessment');
      }
      
      console.log('Gait analysis assessment saved successfully:', response.data);
      
      setSaveStatus({ saving: false, error: null, success: true });
      
      if (onComplete) {
        onComplete({
          ...assessmentData,
          id: response.data.data?.id || response.data.data?._id
        });
      }
    } catch (err) {
      console.error('Failed to save assessment results:', err);
      setSaveStatus({ saving: false, error: err.message, success: false });
      setError(`Failed to save results: ${err.message}`);
    }
  };

  // Helper function to calculate average speed
  const calculateAverageSpeed = (accelerationData) => {
    if (!accelerationData || !accelerationData.length) return 0;
    
    // Simple average of velocity magnitudes
    const avgSpeed = accelerationData.reduce((sum, vel) => {
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      return sum + speed;
    }, 0) / accelerationData.length;
    
    // Convert to approximate m/s (this would need calibration in a real app)
    return avgSpeed * 1.2; // Scaling factor
  };

  const calculateOverallScore = (metrics) => {
    if (!metrics) return 0;
    const scores = [
      metrics.stability || 0,
      metrics.balance || 0,
      metrics.symmetry || 0
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  // Sensor Dashboard Component
  const renderSensorDashboard = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          ESP32 Insole Sensors
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: sensorData.connected ? 'success.main' : 'error.main',
              mr: 1
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {sensorData.connected ? 'Connected' : 'Disconnected'}
          </Typography>
          {sensorData.deviceId && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({sensorData.deviceId})
            </Typography>
          )}
        </Box>
      </Box>
      
      <Grid container spacing={2}>
        {/* Left Foot FSR Sensors */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Left Foot FSR Sensors
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(sensorData.leftFoot.fsr).map(([key, value]) => (
                <Grid item xs={4} key={`left-${key}`}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {key.replace('sensor', 'FSR ')}
                    </Typography>
                    <Typography variant="h6">{value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Right Foot FSR Sensors */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Right Foot FSR Sensors
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(sensorData.rightFoot.fsr).map(([key, value]) => (
                <Grid item xs={4} key={`right-${key}`}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {key.replace('sensor', 'FSR ')}
                    </Typography>
                    <Typography variant="h6">{value}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* IMU Sensors */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              IMU Sensors
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Accelerometer (m/s²)
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="body2">X: {sensorData.imu.accel.x.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2">Y: {sensorData.imu.accel.y.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2">Z: {sensorData.imu.accel.z.toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Gyroscope (°/s)
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="body2">X: {sensorData.imu.gyro.x.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2">Y: {sensorData.imu.gyro.y.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2">Z: {sensorData.imu.gyro.z.toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );

  const handleError = (error) => {
    setError(error.message);
    setIsRecording(false);
  };

  // Add a function to render the save status
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

  const renderMetrics = () => {
    if (!metrics) return null;

    const hipAngle = metrics.jointAngles.find(j => j.joint === 'left_hip')?.angle || 0;
    const kneeAngle = metrics.jointAngles.find(j => j.joint === 'left_knee')?.angle || 0;

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Stability"
            value={`${metrics.stability.toFixed(1)}%`}
            icon={<SpeedIcon color="primary" />}
            description="Overall postural stability and balance control"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Balance"
            value={`${metrics.balance.toFixed(1)}%`}
            icon={<BalanceIcon color="primary" />}
            description="Left-right weight distribution and vertical alignment"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Symmetry"
            value={`${metrics.symmetry.toFixed(1)}%`}
            icon={<PatternIcon color="primary" />}
            description="Bilateral movement symmetry and coordination"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Hip/Knee Angles"
            value={`${hipAngle.toFixed(1)}° / ${kneeAngle.toFixed(1)}°`}
            icon={<WalkIcon color="primary" />}
            description="Primary joint angles during gait cycle"
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
                Gait Phase Analysis
              </Typography>
              <GaitPhaseChart 
                data={realtimeData.phaseData}
                baselineData={baselineData?.phaseData}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Stability Heatmap
              </Typography>
              <StabilityHeatmap data={realtimeData.stabilityData} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Symmetry Analysis
              </Typography>
              <SymmetryRadar 
                currentData={realtimeData.symmetryData}
                baselineData={baselineData?.symmetryData}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Joint Angles
              </Typography>
              <JointAnglesTimeline data={realtimeData.jointData} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Handle incoming sensor data from WebSocket
  const handleSensorData = (data) => {
    // Update sensor data state for display
    setSensorData(prevData => ({
      deviceId: data.deviceId,
      connected: true,
      leftFoot: data.leftFoot || prevData.leftFoot,
      rightFoot: data.rightFoot || prevData.rightFoot,
      imu: data.imu || prevData.imu,
      timestamp: data.timestamp || Date.now()
    }));
  };

  return (
    <AssessmentLayout
      title="Gait Analysis"
      description={
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1">
              This assessment will analyze your walking pattern. Please ensure you have enough space
              to walk naturally for about 30 seconds.
            </Typography>
          </Box>
          <Alert severity="info">
            Position yourself about 2-3 meters from the camera and walk naturally
            back and forth within the camera's view.
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
                style={{ width: '100%', display: isRecording ? 'block' : 'none' }}
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
              {loading && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="contained"
                color={isRecording ? 'error' : 'primary'}
                onClick={isRecording ? finishRecording : startAssessment}
                disabled={loading || (analysisComplete && !saveStatus.success)}
                startIcon={<WalkIcon />}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              
              {renderSaveStatus()}
              
              {/* Add Complete Assessment button */}
              {analysisComplete && !saveStatus.success && (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={saveAssessmentResults}
                  disabled={saveStatus.saving}
                  startIcon={<CheckCircle />}
                  sx={{ mt: 2 }}
                >
                  {saveStatus.saving ? 'Saving...' : 'Complete Assessment'}
                </Button>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Sensor Dashboard */}
        {renderSensorDashboard()}

        {renderEnhancedVisualizations()}
        {renderMetrics()}
      </Box>
    </AssessmentLayout>
  );
};

export default GaitAnalysis;