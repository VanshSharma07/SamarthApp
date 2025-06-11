import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * ExerciseGuidance component
 * Shows real-time webcam feed with AI overlay (landmarks, pose, etc.).
 * Displays step-by-step instructions and feedback.
 * Uses Framer Motion for smooth UI transitions and feedback animations.
 *
 * Props:
 *   videoRef: ref to video element
 *   model: loaded TensorFlow.js model
 *   disorder: string
 *   exercise: string (optional)
 */
const overlayColors = ['#60a5fa', '#f472b6', '#34d399'];

const ExerciseGuidance = ({ videoRef, model, disorder, exercise, instructions }) => {
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState('');
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!model || !videoRef?.current || !canvasRef.current || !running) return;
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
      let poses = [];
      if (disorder === 'parkinsons' && model.estimatePoses) {
        poses = await model.estimatePoses(videoRef.current);
      }
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
          [5, 7], [7, 9], [6, 8], [8, 10],
          [5, 6], [5, 11], [6, 12],
          [11, 13], [13, 15], [12, 14], [14, 16],
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
        // Feedback logic for gait-balance
        if (exercise === 'gait-balance') {
          const leftAnkle = poses[0].keypoints[15];
          if (leftAnkle.score > 0.4 && leftAnkle.y < 200) {
            setFeedback('Great! Keep your balance.');
          } else {
            setFeedback('Try to lift your leg higher.');
          }
        }
        // Add more feedback logic for other exercises as needed
      }
      if (!stopped) rafId = requestAnimationFrame(detect);
    };
    detect();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
    };
  }, [model, videoRef, running, exercise, disorder]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Exercise Guidance
      </Typography>
      <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', boxShadow: 3, mb: 2, width: 360, height: 270 }}>
        <video ref={videoRef} width={360} height={270} style={{ objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} autoPlay muted playsInline />
        <canvas ref={canvasRef} width={360} height={270} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      </Box>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
          {instructions ? instructions[step] : ''}
        </Typography>
        <Button variant="outlined" onClick={() => setStep((s) => (s + 1) % (instructions ? instructions.length : 1))}>
          Next Step
        </Button>
        <Button variant="contained" color="primary" sx={{ ml: 2 }} onClick={() => setRunning(r => !r)}>
          {running ? 'Pause' : 'Start'}
        </Button>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <Typography variant="subtitle2" color="success.main" sx={{ mt: 3, fontWeight: 'bold' }}>
          {feedback || 'Great job! Keep going!'}
        </Typography>
      </motion.div>
    </Box>
  );
};

export default ExerciseGuidance;
