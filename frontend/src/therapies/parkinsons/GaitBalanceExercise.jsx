import React, { useRef, useEffect, useState } from 'react';
import { Box, Button, Typography, CircularProgress, Alert, Paper, LinearProgress } from '@mui/material';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout';
import * as THREE from 'three';

const instructions = [
  'Stand in view of the camera.',
  'Step in place for 10 seconds.',
  'Try a single-leg balance for 5 seconds.',
  'Maintain upright posture throughout.'
];

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;

// 17 MoveNet keypoints
const SKELETON_EDGES = [
  [0, 1], [0, 2], // nose to eyes
  [1, 3], [2, 4], // eyes to ears
  [5, 6], // shoulders
  [5, 7], [7, 9], // left arm
  [6, 8], [8, 10], // right arm
  [5, 11], [6, 12], // shoulders to hips
  [11, 12], // hips
  [11, 13], [13, 15], // left leg
  [12, 14], [14, 16], // right leg
];

const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

const KEYPOINT_INDEX = Object.fromEntries(KEYPOINT_NAMES.map((n, i) => [n, i]));
const CONFIDENCE_THRESHOLD = 0.3;

const JOINT_COLORS = [
  '#ff4081', // nose - pink
  '#2196f3', // left_eye - blue
  '#2196f3', // right_eye - blue
  '#64b5f6', // left_ear - light blue
  '#64b5f6', // right_ear - light blue
  '#4caf50', // left_shoulder - green
  '#4caf50', // right_shoulder - green
  '#388e3c', // left_elbow - dark green
  '#388e3c', // right_elbow - dark green
  '#2e7d32', // left_wrist - darker green
  '#2e7d32', // right_wrist - darker green
  '#ff9800', // left_hip - orange
  '#ff9800', // right_hip - orange
  '#f57c00', // left_knee - dark orange
  '#f57c00', // right_knee - dark orange
  '#795548', // left_ankle - brown
  '#795548'  // right_ankle - brown
];

const GaitBalanceExercise = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const threeContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const camera3DRef = useRef(null);
  const skeletonLinesRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [model, setModel] = useState(null);
  const [started, setStarted] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [balanceStatus, setBalanceStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [instructionIdx, setInstructionIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [singleLegStarted, setSingleLegStarted] = useState(false);
  const canvas2DRef = useRef(null);

  // Camera and model setup
  useEffect(() => {
    let isMounted = true;
    const setup = async () => {
      setLoading(true);
      setError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: CANVAS_WIDTH, 
            height: CANVAS_HEIGHT,
            facingMode: 'user'
          } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            try {
              if (!isMounted) return;
              await videoRef.current.play();
            } catch (err) {
              setError('Unable to play video stream. ' + (err?.message || ''));
              setLoading(false);
            }
          };
        }
      } catch (err) {
        setError('Unable to access webcam. Please allow camera permissions. ' + (err?.message || ''));
        setLoading(false);
        return;
      }
      try {
        const poseDetection = await import('@tensorflow-models/pose-detection');
        const loadedModel = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
        );
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        setError('Failed to load AI model. Please refresh and try again.');
        setLoading(false);
      }
    };
    setup();
    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      // Clean up Three.js
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss && rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current = null;
      }
      if (camera3DRef.current) {
        camera3DRef.current = null;
      }
      skeletonLinesRef.current = [];
    };
  }, []);

  // Scale keypoints from model coordinates to canvas coordinates
  const scaleKeypoint = (keypoint, videoWidth, videoHeight) => {
    return {
      x: keypoint.x * (CANVAS_WIDTH / videoWidth),
      y: keypoint.y * (CANVAS_HEIGHT / videoHeight),
      score: keypoint.score
    };
  };

  // Draw 2D skeleton on canvas overlay
  const draw2DSkeleton = (keypoints) => {
    const ctx = canvas2DRef.current?.getContext('2d');
    const video = videoRef.current;
    if (!ctx || !video) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Get video dimensions
    const videoWidth = video.videoWidth || CANVAS_WIDTH;
    const videoHeight = video.videoHeight || CANVAS_HEIGHT;

    // Scale keypoints to match canvas size
    const scaledKeypoints = keypoints.map(kp => scaleKeypoint(kp, videoWidth, videoHeight));

    // Draw skeleton lines first (so they appear behind keypoints)
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    SKELETON_EDGES.forEach(([startIdx, endIdx]) => {
      const startPoint = scaledKeypoints[startIdx];
      const endPoint = scaledKeypoints[endIdx];
      
      if (startPoint && endPoint && 
          startPoint.score > CONFIDENCE_THRESHOLD && 
          endPoint.score > CONFIDENCE_THRESHOLD) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });

    // Draw keypoint circles
    scaledKeypoints.forEach((keypoint, idx) => {
      if (keypoint && keypoint.score > CONFIDENCE_THRESHOLD) {
        // Draw keypoint circle
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = JOINT_COLORS[idx];
        ctx.fill();
        
        // Add white border to make keypoints more visible
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Optionally draw joint labels (uncomment if you want labels)
        /*
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(KEYPOINT_NAMES[idx], keypoint.x, keypoint.y - 15);
        ctx.fillText(KEYPOINT_NAMES[idx], keypoint.x, keypoint.y - 15);
        */
      }
    });
  };

  // Real-time pose detection and analysis
  useEffect(() => {
    let animationId;
    let prevLeftY = null;
    let prevRightY = null;
    let localStepCount = 0;
    let gaitStartTime = null;
    let singleLegStartTime = null;
    let singleLegGood = false;
    let gaitDone = false;
    let singleLegDone = false;
    let lastStepTime = 0;

    const runPose = async () => {
      if (!model || !videoRef.current || !started || sessionDone) {
        animationId = requestAnimationFrame(runPose);
        return;
      }

      try {
        // Estimate pose
        const poses = await model.estimatePoses(videoRef.current, {
          maxPoses: 1,
          flipHorizontal: false,
          scoreThreshold: 0.3
        });

        if (poses && poses[0] && poses[0].keypoints) {
          const keypoints = poses[0].keypoints;
          
          // Draw 2D skeleton overlay
          draw2DSkeleton(keypoints);

          // Get key joints for analysis
          const leftAnkle = keypoints[KEYPOINT_INDEX.left_ankle];
          const rightAnkle = keypoints[KEYPOINT_INDEX.right_ankle];
          const leftHip = keypoints[KEYPOINT_INDEX.left_hip];
          const rightHip = keypoints[KEYPOINT_INDEX.right_hip];

          // Gait analysis: detect stepping motion
          if (!gaitDone && instructionIdx === 1) {
            if (!gaitStartTime) gaitStartTime = Date.now();

            const currentTime = Date.now();
            
            // Detect vertical movement of ankles (stepping motion)
            if (prevLeftY !== null && prevRightY !== null && 
                leftAnkle && rightAnkle && 
                leftAnkle.score > CONFIDENCE_THRESHOLD && 
                rightAnkle.score > CONFIDENCE_THRESHOLD) {
              
              const leftMovement = Math.abs(leftAnkle.y - prevLeftY);
              const rightMovement = Math.abs(rightAnkle.y - prevRightY);
              
              // Detect significant vertical movement (step detection)
              if ((leftMovement > 20 || rightMovement > 20) && 
                  currentTime - lastStepTime > 300) { // Prevent double counting
                localStepCount++;
                setStepCount(localStepCount);
                setFeedback('Good step! Keep going.');
                lastStepTime = currentTime;
              }
            }

            if (leftAnkle && rightAnkle && 
                leftAnkle.score > CONFIDENCE_THRESHOLD && 
                rightAnkle.score > CONFIDENCE_THRESHOLD) {
              prevLeftY = leftAnkle.y;
              prevRightY = rightAnkle.y;
            }

            // Progress tracking for 10 seconds
            const elapsed = (Date.now() - gaitStartTime) / 1000;
            setProgress(Math.min((elapsed / 10) * 100, 100));
            
            if (elapsed >= 10) {
              gaitDone = true;
              setInstructionIdx(2);
              setFeedback('Great! Now try single-leg balance.');
              setProgress(0);
              setTimeout(() => setSingleLegStarted(true), 1000);
            }
          }
          
          // Single-leg balance analysis
          else if (!singleLegDone && singleLegStarted && instructionIdx === 2) {
            if (!singleLegStartTime) singleLegStartTime = Date.now();

            if (leftAnkle && rightAnkle && 
                leftAnkle.score > CONFIDENCE_THRESHOLD && 
                rightAnkle.score > CONFIDENCE_THRESHOLD) {
              
              // Check if one foot is significantly higher than the other
              const ankleHeightDiff = Math.abs(leftAnkle.y - rightAnkle.y);
              
              if (ankleHeightDiff > 50) { // One foot lifted significantly
                setBalanceStatus('Single-leg detected!');
                setFeedback('Hold your balance!');
                singleLegGood = true;
              } else {
                setBalanceStatus('Try lifting one leg higher.');
                setFeedback('Lift one leg and hold steady.');
                singleLegGood = false;
              }
            }

            // Progress tracking for 5 seconds
            const elapsed = (Date.now() - singleLegStartTime) / 1000;
            setProgress(Math.min((elapsed / 5) * 100, 100));
            
            if (elapsed >= 5) {
              singleLegDone = true;
              setSessionDone(true);
              setFeedback(`Session complete! ${singleLegGood ? 'Excellent balance!' : 'Good effort!'}`);
              setInstructionIdx(3);
              setProgress(100);
            }
          }
        }
      } catch (error) {
        console.error('Pose detection error:', error);
      }

      animationId = requestAnimationFrame(runPose);
    };

    if (started && model && !sessionDone) {
      runPose();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      // Clear canvas on cleanup
      if (canvas2DRef.current) {
        const ctx = canvas2DRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      }
    };
  }, [started, model, singleLegStarted, sessionDone, instructionIdx]);

  // UI rendering
  if (error) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Camera Setup</Typography>
          <Box sx={{ mb: 2, color: 'red' }}>{error}</Box>
          <Button variant="contained" onClick={() => window.location.reload()}>Retry</Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Paper elevation={4} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4, borderRadius: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#1976d2' }}>
          Gait & Balance Therapy
        </Typography>
        
        <Typography variant="subtitle1" sx={{ mb: 2, color: '#555' }}>
          {instructions[instructionIdx]}
        </Typography>

        <Box sx={{ 
          position: 'relative', 
          mb: 2, 
          width: CANVAS_WIDTH, 
          height: CANVAS_HEIGHT,
          mx: 'auto',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <video
            ref={videoRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              zIndex: 1,
              transform: 'scaleX(-1)', // Mirror the video
              background: '#000'
            }}
            autoPlay
            muted
            playsInline
          />
          
          <canvas
            ref={canvas2DRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              pointerEvents: 'none', 
              zIndex: 2,
              transform: 'scaleX(-1)' // Mirror the canvas to match video
            }}
          />
          
          {loading && (
            <Box sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              bgcolor: 'rgba(0,0,0,0.7)', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 3,
              color: 'white'
            }}>
              <CircularProgress color="primary" sx={{ mb: 2 }} />
              <Typography>Loading AI model...</Typography>
            </Box>
          )}
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ 
            height: 8, 
            borderRadius: 4, 
            mb: 2, 
            backgroundColor: '#e3f2fd',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#2196f3'
            }
          }}
        />

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3 }}
        >
          <Typography variant="body1" sx={{ 
            mb: 1, 
            color: '#388e3c', 
            fontWeight: 600,
            textAlign: 'center',
            minHeight: '24px'
          }}>
            {feedback}
          </Typography>

          {instructionIdx === 1 && (
            <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
              Steps detected: <strong>{stepCount}</strong>
            </Typography>
          )}

          {instructionIdx === 2 && balanceStatus && (
            <Typography variant="body2" sx={{ mb: 1, textAlign: 'center', color: '#1976d2' }}>
              {balanceStatus}
            </Typography>
          )}

          {sessionDone && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <strong>Therapy session complete!</strong>
              <br />
              Steps counted: {stepCount} | Balance attempt completed
            </Alert>
          )}
        </motion.div>

        {!started && !loading && (
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ 
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1.1rem',
                fontWeight: 600
              }}
              onClick={() => {
                setStarted(true);
                setInstructionIdx(1);
                setFeedback('Start stepping in place!');
                setProgress(0);
              }}
            >
              Start Therapy Session
            </Button>
          </Box>
        )}

        {sessionDone && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                // Reset for new session
                setStarted(false);
                setSessionDone(false);
                setStepCount(0);
                setProgress(0);
                setInstructionIdx(0);
                setFeedback('');
                setBalanceStatus('');
                setSingleLegStarted(false);
              }}
            >
              Start New Session
            </Button>
          </Box>
        )}
      </Paper>
    </Layout>
  );
};

export default GaitBalanceExercise;