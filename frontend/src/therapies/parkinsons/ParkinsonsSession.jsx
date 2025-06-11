import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import { DirectionsRun } from '@mui/icons-material';
import GaitBalanceExercise from './GaitBalanceExercise';
import FingerTappingTest from './FingerTappingTest';
import FacialExercise from './FacialExercise';

// Utility for loading MoveNet/BlazePose
const loadPoseModel = async () => {
  const poseDetection = await import('@tensorflow-models/pose-detection');
  return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
};

const EXERCISES = [
  {
    key: 'gait-balance',
    name: 'Gait & Balance Training',
    description: 'Step-in-place, single-leg balance, posture drills',
    instructions: [
      'Stand in view of the camera.',
      'Step in place for 10 seconds.',
      'Try a single-leg balance for 5 seconds.',
      'Maintain upright posture throughout.'
    ],
    icon: <DirectionsRun sx={{ fontSize: 40, color: 'primary.main' }} />,
  },  {
    key: 'tremor-drill',
    name: 'Finger Tapping Test',
    description: 'Fine motor control test for fingers',
    instructions: [
      'Extend your arms in front of you.',
      'Move slowly in a circular motion.',
      'Focus on smooth, controlled movement.'
    ],
    icon: <DirectionsRun sx={{ fontSize: 40, color: 'secondary.main' }} />,
  },
  {
    key: 'facial-exercise',
    name: 'Facial Exercise',
    description: 'Mimic emotions, smile, frown to maintain muscle strength',
    instructions: [
      'Smile as wide as you can.',
      'Frown and then relax.',
      'Raise your eyebrows and hold.'
    ],
    icon: <DirectionsRun sx={{ fontSize: 40, color: 'success.main' }} />,
  },
];

const overlayColors = ['#60a5fa', '#f472b6', '#34d399'];

const ParkinsonsSession = ({ exerciseKey }) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const exercise = EXERCISES.find(e => e.key === exerciseKey);

  // Camera and model setup
  useEffect(() => {
    let stream;
    const setup = async () => {
      setLoading(true);
      setCameraError('');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play();
              const m = await loadPoseModel();
              setModel(m);
              setLoading(false);
            } catch (err) {
              setCameraError('Unable to play video stream.');
              setLoading(false);
            }
          };
        }
      } catch (err) {
        setCameraError('Camera access denied or unavailable. Please check your camera permissions and ensure no other app is using the camera.');
        setLoading(false);
      }
    };
    setup();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Real-time pose detection and overlay
  useEffect(() => {
    if (!model || !videoRef.current || !canvasRef.current || !running) return;
    let rafId;
    let stopped = false;

    const isVideoReady = () => {
      const v = videoRef.current;
      return v && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0;
    };

    const detect = async () => {
      if (!isVideoReady()) {
        rafId = requestAnimationFrame(detect);
        return;
      }
      const poses = await model.estimatePoses(videoRef.current);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 360, 270);
      if (poses && poses[0]) {
        // Draw keypoints
        poses[0].keypoints.forEach((kp, i) => {
          if (kp.score > 0.4) {
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = overlayColors[i % overlayColors.length];
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
        // Draw lines (skeleton)
        const adjacentPairs = [
          [5, 7], [7, 9], [6, 8], [8, 10], // arms
          [5, 6], [5, 11], [6, 12], // shoulders/torso
          [11, 13], [13, 15], [12, 14], [14, 16], // legs
          [11, 12]
        ];
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 4;
        adjacentPairs.forEach(([a, b]) => {
          if (poses[0].keypoints[a].score > 0.4 && poses[0].keypoints[b].score > 0.4) {
            ctx.beginPath();
            ctx.moveTo(poses[0].keypoints[a].x, poses[0].keypoints[a].y);
            ctx.lineTo(poses[0].keypoints[b].x, poses[0].keypoints[b].y);
            ctx.stroke();
          }
        });
        // Example feedback: check if left wrist is above left shoulder
        if (exerciseKey === 'gait-balance') {
          const leftAnkle = poses[0].keypoints[15];
          if (leftAnkle.score > 0.4 && leftAnkle.y < 200) {
            setFeedback('Great! Keep your balance.');
          } else {
            setFeedback('Try to lift your leg higher.');
          }
        } else if (exerciseKey === 'tremor-drill') {
          const leftWrist = poses[0].keypoints[9];
          const leftShoulder = poses[0].keypoints[5];
          if (leftWrist.score > 0.4 && leftShoulder.score > 0.4 && leftWrist.y < leftShoulder.y) {
            setFeedback('Smooth movement!');
          } else {
            setFeedback('Raise your arm slowly.');
          }
        }
      }
      if (!stopped) rafId = requestAnimationFrame(detect);
    };
    detect();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
    };
  }, [model, running, exerciseKey]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading camera & AI model...</Typography>
      </Box>
    );
  }
  if (cameraError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <Typography variant="h6" color="error" sx={{ mt: 2 }}>{cameraError}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Try refreshing the page, checking browser permissions, or using a different browser/device.</Typography>
      </Box>
    );
  }

  if (exerciseKey === 'gait-balance') {
    return <GaitBalanceExercise />;
  }  if (exerciseKey === 'tremor-drill') {
    return <FingerTappingTest />;
  }
  if (exerciseKey === 'facial-exercise') {
    return <FacialExercise />;
  }
  return <div>Unknown exercise</div>;
};

export default ParkinsonsSession;
