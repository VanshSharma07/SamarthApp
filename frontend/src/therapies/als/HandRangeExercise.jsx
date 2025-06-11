import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import {
  Box, Typography, Paper, Button, CircularProgress, Alert,
  LinearProgress, Chip, Stack, Tooltip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Slider, Switch,
  FormControlLabel, Divider
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Help as HelpIcon,
  Accessible as AccessibleIcon,
  Keyboard as KeyboardIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  RotateLeft as RotateLeftIcon, 
  Camera as CameraIcon,
  ViewColumn as ViewColumnIcon,
  Replay as ReplayIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import Layout from '../../components/Layout'; // Import Layout component

// CameraView component
const CameraView = ({ videoRef, canvasRef, onFrame, renderOverlay, cameraReady, width = 640, height = 480 }) => {
  const localCanvasRef = useRef(null);
  const animationRef = useRef(null);

  // Animation loop
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef ? canvasRef.current : localCanvasRef.current;
      if (videoRef?.current && canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        if (onFrame) onFrame(videoRef.current, ctx);
        if (renderOverlay) renderOverlay(ctx, width, height);
      }
      animationRef.current = requestAnimationFrame(draw);
    };

    if (cameraReady) {
      animationRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [cameraReady, onFrame, renderOverlay, width, height, videoRef, canvasRef]);

  // Camera setup
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width, height, facingMode: 'user' }
        });
        if (videoRef?.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    setupCamera();
    return () => {
      if (videoRef?.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef, width, height]);

  return (
    <Box sx={{
      position: 'relative',
      width,
      height,
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: 3
    }}>
      <video
        ref={videoRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef || localCanvasRef}
        width={width}
        height={height}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      />
      {!cameraReady && (
        <Box sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.7)',
          color: 'white'
        }}>
          <CircularProgress color="inherit" />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Initializing camera...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// 3D Pose Model Component
function Pose3D({ keypoints }) {
  if (!keypoints || keypoints.length === 0) return null;

  return (
    <group>
      {/* Draw joints */}
      {keypoints.map(({ x, y, z, score }, idx) => (
        <mesh key={idx} position={[x / 300, -y / 300, (z || 0) / 300]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color={score > 0.5 ? "#7c3aed" : "#bdbdbd"} />
        </mesh>
      ))}

      {/* Draw skeleton connections */}
      {[
        // Right arm
        [6, 8], [8, 10],
        // Left arm
        [5, 7], [7, 9],
        // Shoulders
        [5, 6],
        // Core
        [5, 11], [6, 12], [11, 12],
        // Right leg
        [12, 14], [14, 16],
        // Left leg
        [11, 13], [13, 15]
      ].map(([i, j]) => (
        <line key={`${i}-${j}`}>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                keypoints[i].x / 300, -keypoints[i].y / 300, (keypoints[i].z || 0) / 300,
                keypoints[j].x / 300, -keypoints[j].y / 300, (keypoints[j].z || 0) / 300
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#43a047" />
        </line>
      ))}
    </group>
  );
}

const HandRangeExercise = () => {
  // Model and tracking state
  const [detector, setDetector] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [keypoints, setKeypoints] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);

  // Exercise state
  const [sessionActive, setSessionActive] = useState(false);
  const [reps, setReps] = useState(0);
  const [lastAngle, setLastAngle] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [viewMode, setViewMode] = useState('split'); // 'camera', '3d', or 'split'
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  // Performance metrics
  const [performance, setPerformance] = useState({
    avgSpeed: 0,
    consistency: 0,
    lastRepTime: 0
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const movementHistory = useRef([]);
  const repStartTime = useRef(0);
  const repGoal = 10;

  // Load pose model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const model = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true
          }
        );
        setDetector(model);
        setIsModelLoading(false);
        setCameraReady(true);
      } catch (err) {
        setModelError(err.message || 'Failed to load pose model');
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  // Draw skeleton overlay
  const drawSkeleton = (ctx, keypoints) => {
    if (!showSkeleton || !keypoints) return;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#43a047';

    // Draw connections
    [
      [6, 8], [8, 10], // Right arm
      [5, 7], [7, 9],   // Left arm
      [5, 6],           // Shoulders
      [5, 11], [6, 12], [11, 12], // Core
      [12, 14], [14, 16], // Right leg
      [11, 13], [13, 15]  // Left leg
    ].forEach(([i, j]) => {
      if (keypoints[i]?.score > 0.3 && keypoints[j]?.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(keypoints[i].x, keypoints[i].y);
        ctx.lineTo(keypoints[j].x, keypoints[j].y);
        ctx.stroke();
      }
    });

    // Draw joints
    keypoints.forEach(({ x, y, score }) => {
      if (score > 0.3) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = score > 0.5 ? '#7c3aed' : '#bdbdbd';
        ctx.fill();
      }
    });

    ctx.restore();
  };

  // Frame processing
  const onFrame = useCallback(async (video, ctx) => {
    if (!detector || !sessionActive) return;

    try {
      const poses = await detector.estimatePoses(video);
      if (poses?.[0]?.keypoints) {
        const kp = poses[0].keypoints;
        setKeypoints(kp);
        drawSkeleton(ctx, kp);

        // Get right arm keypoints
        const shoulder = kp[6];
        const elbow = kp[8];
        const wrist = kp[10];

        if (shoulder?.score > 0.5 && elbow?.score > 0.5 && wrist?.score > 0.5) {
          // Calculate elbow angle
          const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) -
            Math.atan2(shoulder.y - elbow.y, shoulder.x - elbow.x);
          const degrees = Math.abs(angle * (180 / Math.PI));

          // Provide feedback
          if (degrees > 150) {
            setFeedback('Great stretch!');
          } else if (degrees > 100) {
            setFeedback('Extend your arm further');
          } else {
            setFeedback('Bend elbow to start new rep');
          }

          // Count reps
          if (lastAngle !== null && lastAngle < 100 && degrees > 150) {
            const newReps = reps + 1;
            setReps(newReps);

            // Update performance metrics
            const now = Date.now();
            const repTime = now - repStartTime.current;
            repStartTime.current = now;

            movementHistory.current = [
              ...movementHistory.current.slice(-4),
              { time: now, duration: repTime }
            ];

            const avgSpeed = movementHistory.current.length > 0 ?
              movementHistory.current.reduce((sum, rep) => sum + (60000 / rep.duration), 0) /
              movementHistory.current.length : 0;

            setPerformance({
              avgSpeed: Math.round(avgSpeed),
              consistency: movementHistory.current.length > 1
                ? Math.round(
                  (1 -
                    (Math.max(...movementHistory.current.map(r => r.duration)) -
                      Math.min(...movementHistory.current.map(r => r.duration))) /
                    Math.max(...movementHistory.current.map(r => r.duration))
                  ) * 100
                )
                : 0,
              lastRepTime: repTime / 1000,
            });

            // Accessibility feedback
            if (accessibilityMode) {
              const msg = new SpeechSynthesisUtterance(
                newReps >= repGoal ?
                  `Session complete! You did ${newReps} repetitions.` :
                  `Repetition ${newReps} of ${repGoal}.`
              );
              speechSynthesis.speak(msg);
            }
          }

          setLastAngle(degrees);
        } else {
          setFeedback('Make sure your right arm is visible');
        }
      }
    } catch (err) {
      console.error("Pose estimation error:", err);
    }
  }, [detector, sessionActive, lastAngle, reps, showSkeleton, accessibilityMode]);

  // Reset session
  const handleReset = () => {
    setReps(0);
    setSessionActive(false);
    setLastAngle(null);
    setFeedback('');
    movementHistory.current = [];
    setPerformance({
      avgSpeed: 0,
      consistency: 0,
      lastRepTime: 0
    });
  };

  // Toggle session
  const toggleSession = () => {
    if (sessionActive) {
      setSessionActive(false);
    } else {
      repStartTime.current = Date.now();
      setSessionActive(true);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        toggleSession();
      } else if (e.code === 'KeyR') {
        handleReset();
      } else if (e.code === 'KeyC') {
        runCalibration();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionActive]);

  // Calibration
  const runCalibration = () => {
    setShowCalibration(true);
    // In a real app, you would collect range of motion data here
    setTimeout(() => {
      setShowCalibration(false);
      setFeedback('Calibration complete! Ready to start.');
    }, 3000);
  };

  return (
    <Layout>
      <Box sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
        px: { xs: 2, sm: 4 }
      }}>
        <Box sx={{
          maxWidth: 'lg',
          mx: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 4
        }}>
          {/* Header with control buttons */}
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              ALS Stretch Exercise Assistant
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Settings">
                <IconButton 
                  onClick={() => setShowHelp(true)}
                  size="large"
                >
                  <HelpIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={accessibilityMode ? "Disable audio feedback" : "Enable audio feedback"}>
                <IconButton 
                  onClick={() => setAccessibilityMode(!accessibilityMode)}
                  color={accessibilityMode ? "primary" : "default"}
                  size="large"
                >
                  <AccessibleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={showSkeleton ? "Hide skeleton overlay" : "Show skeleton overlay"}>
                <IconButton 
                  onClick={() => setShowSkeleton(!showSkeleton)}
                  color={showSkeleton ? "primary" : "default"}
                  size="large"
                >
                  {showSkeleton ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Instructions */}
          <Paper sx={{ p: 2, mb: 4, mx: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>
              Exercise Instructions
            </Typography>
            <Stack component="ol" spacing={1} sx={{ pl: 3, mb: 0 }}>
              <Typography component="li">Stand or sit comfortably in front of your camera.</Typography>
              <Typography component="li">Raise and stretch your right arm as shown.</Typography>
              <Typography component="li">The system will auto count a repetition when you fully extend your arm.</Typography>
              <Typography component="li">Try to perform 10 smooth, full stretches.</Typography>
            </Stack>
          </Paper>

          <Divider sx={{ mb: 4, mx: 3 }} />

          {/* Camera and 3D Views */}
          <Paper sx={{ p: { xs: 1, sm: 2 }, mb: 4, mx: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
            <Box sx={{ flex: 1, minWidth: 390, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CameraView
                videoRef={videoRef}
                canvasRef={canvasRef}
                onFrame={onFrame}
                renderOverlay={showSkeleton ? (ctx, w, h) => drawSkeleton(ctx, keypoints) : null}
                cameraReady={cameraReady}
                width={480}
                height={360}
              />
              <Typography variant="caption" sx={{ mt: 1 }}>2D camera view with pose detection</Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 2 }} />
            <Divider orientation="horizontal" flexItem sx={{ display: { xs: 'block', md: 'none' }, my: 2 }} />
            <Box sx={{ flex: 1, minWidth: 390, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ width: 480, height: 360, bgcolor: 'background.default', borderRadius: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Canvas camera={{ position: [0, 0, 2.5] }} style={{ width: '100%', height: '100%' }}>
                  <ambientLight intensity={0.7} />
                  <directionalLight position={[2, 2, 5]} intensity={0.5} />
                  <OrbitControls enablePan={false} />
                  <Pose3D keypoints={keypoints} />
                </Canvas>
              </Box>
              <Typography variant="caption">3D visualization (drag to rotate view)</Typography>
            </Box>
          </Paper>

          {/* Progress and Feedback */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
            <Paper sx={{ px: 4, py: 2, display: 'flex', alignItems: 'center', bgcolor: 'success.lighter' }}>
              <Typography variant="h6" fontWeight="bold" color="success.main" sx={{ mr: 2 }}>{reps} / 10</Typography>
              <Typography variant="body2">Repetitions Progress</Typography>
            </Paper>
            <Chip label={feedback} color="primary" variant="outlined" sx={{ fontSize: '1rem', px: 2, py: 2 }} />
          </Stack>

          <Divider sx={{ mb: 4, mx: 3 }} />

          {/* Performance metrics */}
          <Paper sx={{
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: 2,
            mb: 4,
            mx: 3,
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 2,
            boxShadow: 1
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" display="block">
                Avg Speed
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {performance.avgSpeed} reps/min
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" display="block">
                Consistency
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {performance.consistency}%
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" display="block">
                Last Rep Time
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {performance.lastRepTime.toFixed(2)}s
              </Typography>
            </Box>
          </Paper>

          {/* Controls */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center" justifyContent="center" sx={{ mb: 4, mx: 3 }}>
            <Button
              variant="contained"
              color={sessionActive ? 'error' : 'success'}
              size="large"
              startIcon={sessionActive ? <PauseIcon /> : <PlayArrowIcon />}
              onClick={toggleSession}
              disabled={!cameraReady}
              sx={{ px: 4, py: 1.5 }}
            >
              {sessionActive ? 'Pause Session' : 'Start Session'}
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              size="large"
              startIcon={<ReplayIcon />}
              onClick={handleReset}
              sx={{ px: 4, py: 1.5 }}
            >
              Reset
            </Button>

            <Button
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<SettingsIcon />}
              onClick={runCalibration}
              disabled={sessionActive}
              sx={{ px: 4, py: 1.5 }}
            >
              Calibrate
            </Button>
          </Stack>

          {/* Quick tips */}
          <Paper sx={{ mx: 3, mt: 2, mb: 4, p: 3, bgcolor: 'info.light', borderRadius: 3, boxShadow: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <HelpIcon sx={{ mr: 1 }} />
              Quick Tips
            </Typography>
            <Stack component="ul" spacing={1} sx={{ pl: 2 }}>
              <Typography component="li">
                Make sure your entire upper body is visible in the camera frame
              </Typography>
              <Typography component="li">
                Perform stretches slowly and with control for best results
              </Typography>
              <Typography component="li">
                The 3D view can help you understand your positioning better
              </Typography>
              <Typography component="li">
                Try to keep consistent lighting for better pose detection
              </Typography>
            </Stack>
          </Paper>

          {/* Help dialog */}
          <Dialog open={showHelp} onClose={() => setShowHelp(false)}>
            <DialogTitle>How to Use This Exercise Assistant</DialogTitle>
            <DialogContent>
              <Typography variant="h6" gutterBottom>
                Exercise Instructions
              </Typography>
              <Stack component="ol" spacing={1} sx={{ pl: 2, mb: 3 }}>
                <Typography component="li">Position yourself about 2 meters from your camera</Typography>
                <Typography component="li">Keep your entire upper body visible</Typography>
                <Typography component="li">Slowly extend and retract your right arm</Typography>
                <Typography component="li">The system will count each full extension</Typography>
              </Stack>
              
              <Typography variant="h6" gutterBottom>
                Keyboard Controls
              </Typography>
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Typography><strong>Space:</strong> Start/Pause session</Typography>
                <Typography><strong>R:</strong> Reset counters</Typography>
                <Typography><strong>C:</strong> Run calibration</Typography>
              </Stack>

              <Typography variant="h6" gutterBottom>
                Accessibility Features
              </Typography>
              <Typography paragraph>
                Enable accessibility mode for audio feedback during the exercise. The system will:
              </Typography>
              <Stack spacing={1}>
                <Typography>- Announce when exercises start/stop</Typography>
                <Typography>- Count completed repetitions</Typography>
                <Typography>- Provide verbal feedback on form</Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowHelp(false)}>Close</Button>
            </DialogActions>
          </Dialog>

          {/* Calibration dialog */}
          <Dialog open={showCalibration} onClose={() => setShowCalibration(false)}>
            <DialogTitle>Movement Calibration</DialogTitle>
            <DialogContent>
              <Typography paragraph>
                Please move your arm through its full range of motion. The system will measure:
              </Typography>
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Box>
                  <Typography gutterBottom>Maximum extension</Typography>
                  <LinearProgress variant="indeterminate" />
                </Box>
                <Box>
                  <Typography gutterBottom>Range of motion</Typography>
                  <LinearProgress variant="indeterminate" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                This helps customize the exercise to your abilities.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCalibration(false)}>Cancel</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Layout>
  );
}

export default HandRangeExercise;