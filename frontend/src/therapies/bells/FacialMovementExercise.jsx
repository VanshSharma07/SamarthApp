import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Stack, LinearProgress, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { SentimentSatisfied, SentimentDissatisfied, VisibilityOff, Psychology } from '@mui/icons-material';
import Layout from '../../components/Layout';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;

const exercises = [
  {
    name: 'Big Smile',
    instruction: 'Smile as wide as you can and hold for 5 seconds',
    icon: SentimentSatisfied,
    duration: 5,
    target: 'smile',
    description: 'Strengthens cheek muscles and improves facial symmetry'
  },
  {
    name: 'Frown Expression',
    instruction: 'Make a deep frown and hold for 5 seconds',
    icon: SentimentDissatisfied,
    duration: 5,
    target: 'frown',
    description: 'Works the muscles around your mouth and chin'
  },
  {
    name: 'Eyebrow Raise',
    instruction: 'Raise your eyebrows as high as possible and hold',
    icon: VisibilityOff,
    duration: 5,
    target: 'eyebrows',
    description: 'Strengthens forehead muscles and reduces wrinkles'
  },
  {
    name: 'Eye Squeeze',
    instruction: 'Close your eyes tightly and hold for 5 seconds',
    icon: VisibilityOff,
    duration: 5,
    target: 'eyes',
    description: 'Strengthens muscles around the eyes'
  },
  {
    name: 'Cheek Puff',
    instruction: 'Puff out your cheeks like a balloon and hold',
    icon: SentimentSatisfied,
    duration: 5,
    target: 'cheeks',
    description: 'Improves cheek muscle tone and facial volume'
  }
];

// Enhanced facial landmark indices for MediaPipe Face Mesh
const FACE_LANDMARKS = {
  // Mouth landmarks for smile/frown detection
  MOUTH_CORNERS: [61, 291], // Left and right mouth corners
  MOUTH_TOP: [13, 14, 15], // Upper lip points
  MOUTH_BOTTOM: [17, 18, 19], // Lower lip points
  MOUTH_CENTER_TOP: [13],
  MOUTH_CENTER_BOTTOM: [14],
  
  // Eye landmarks
  LEFT_EYE: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  RIGHT_EYE: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  LEFT_EYE_TOP: [159], LEFT_EYE_BOTTOM: [145],
  RIGHT_EYE_TOP: [386], RIGHT_EYE_BOTTOM: [374],
  
  // Eyebrow landmarks
  LEFT_EYEBROW: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  RIGHT_EYEBROW: [296, 334, 293, 300, 276, 283, 282, 295, 285, 336],
  
  // Cheek landmarks
  LEFT_CHEEK: [116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192, 147],
  RIGHT_CHEEK: [345, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 454, 323, 361],
  
  // Nose landmarks for reference
  NOSE_TIP: [1, 2],
  NOSE_CENTER: [5, 6]
};

// Map for MediaPipeFaceDetector (6 points)
const MPFD_LANDMARKS = {
  RIGHT_EYE: 0,
  LEFT_EYE: 1,
  NOSE: 2,
  MOUTH_RIGHT: 3,
  MOUTH_LEFT: 4,
  RIGHT_EAR: 5,
  LEFT_EAR: 6
};

const FacialMovementExercise = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  // Exercise timing refs - CRITICAL FIX
  const exerciseStartTimeRef = useRef(null);
  const goodFormTimeRef = useRef(0);
  const lastGoodTimeRef = useRef(0);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [modelType, setModelType] = useState('');
  const [error, setError] = useState('');
  
  // Exercise States
  const [currentExercise, setCurrentExercise] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [exerciseResults, setExerciseResults] = useState([]);

  // Real-time analysis states
  const [liveIntensity, setLiveIntensity] = useState(0);
  const [liveDetected, setLiveDetected] = useState(false);
  const [landmarkData, setLandmarkData] = useState(null);

  // Exercise flow states
  const [exerciseState, setExerciseState] = useState('ready'); // 'ready', 'active', 'completed'

  // Calculate distance between two points
  const calculateDistance = (point1, point2) => {
    if (!point1 || !point2) return 0;
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  };

  // Helper to check if using MediaPipeFaceDetector
  const isMediaPipeFaceDetector = (modelType) => modelType === 'MediaPipeFaceDetector';

  // Update metric calculations for MediaPipeFaceDetector
  const calculateMouthMetrics = (landmarks, modelType) => {
    if (isMediaPipeFaceDetector(modelType)) {
      // Use mouth left/right and nose for width/height
      const leftCorner = landmarks[MPFD_LANDMARKS.MOUTH_LEFT];
      const rightCorner = landmarks[MPFD_LANDMARKS.MOUTH_RIGHT];
      const nose = landmarks[MPFD_LANDMARKS.NOSE];
      if (!leftCorner || !rightCorner || !nose) return { width: 0, height: 0, aspectRatio: 0, curvature: 0 };
      const mouthWidth = calculateDistance(leftCorner, rightCorner);
      const mouthHeight = Math.abs(((leftCorner.y + rightCorner.y) / 2) - nose.y);
      const aspectRatio = mouthHeight / mouthWidth;
      // Curvature: difference in y between corners and nose
      const curvature = ((leftCorner.y + rightCorner.y) / 2) - nose.y;
      return { width: mouthWidth, height: mouthHeight, aspectRatio, curvature };
    }
    
    try {
      const leftCorner = landmarks[FACE_LANDMARKS.MOUTH_CORNERS[0]];
      const rightCorner = landmarks[FACE_LANDMARKS.MOUTH_CORNERS[1]];
      const topCenter = landmarks[FACE_LANDMARKS.MOUTH_CENTER_TOP[0]];
      const bottomCenter = landmarks[FACE_LANDMARKS.MOUTH_CENTER_BOTTOM[0]];
      
      if (!leftCorner || !rightCorner || !topCenter || !bottomCenter) {
        return { width: 0, height: 0, aspectRatio: 0 };
      }

      const mouthWidth = calculateDistance(leftCorner, rightCorner);
      const mouthHeight = calculateDistance(topCenter, bottomCenter);
      const aspectRatio = mouthHeight / mouthWidth;
      
      // Calculate mouth curvature (corners relative to center)
      const centerY = (topCenter.y + bottomCenter.y) / 2;
      const cornersCurvature = ((leftCorner.y + rightCorner.y) / 2) - centerY;
      
      return {
        width: mouthWidth,
        height: mouthHeight,
        aspectRatio: aspectRatio,
        curvature: cornersCurvature
      };
    } catch (error) {
      console.error('Error calculating mouth metrics:', error);
      return { width: 0, height: 0, aspectRatio: 0, curvature: 0 };
    }
  };

  // Calculate eye metrics
  const calculateEyeMetrics = (landmarks, modelType) => {
    if (isMediaPipeFaceDetector(modelType)) {
      // Use left/right eye and nose for height
      const leftEye = landmarks[MPFD_LANDMARKS.LEFT_EYE];
      const rightEye = landmarks[MPFD_LANDMARKS.RIGHT_EYE];
      const nose = landmarks[MPFD_LANDMARKS.NOSE];
      if (!leftEye || !rightEye || !nose) return { leftEyeHeight: 0, rightEyeHeight: 0, avgEyeHeight: 0 };
      const leftEyeHeight = Math.abs(leftEye.y - nose.y);
      const rightEyeHeight = Math.abs(rightEye.y - nose.y);
      const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
      return { leftEyeHeight, rightEyeHeight, avgEyeHeight };
    }
    
    try {
      const leftEyeTop = landmarks[FACE_LANDMARKS.LEFT_EYE_TOP[0]];
      const leftEyeBottom = landmarks[FACE_LANDMARKS.LEFT_EYE_BOTTOM[0]];
      const rightEyeTop = landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP[0]];
      const rightEyeBottom = landmarks[FACE_LANDMARKS.RIGHT_EYE_BOTTOM[0]];
      
      if (!leftEyeTop || !leftEyeBottom || !rightEyeTop || !rightEyeBottom) {
        return { leftEyeHeight: 0, rightEyeHeight: 0, avgEyeHeight: 0 };
      }

      const leftEyeHeight = calculateDistance(leftEyeTop, leftEyeBottom);
      const rightEyeHeight = calculateDistance(rightEyeTop, rightEyeBottom);
      const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
      
      return {
        leftEyeHeight,
        rightEyeHeight,
        avgEyeHeight
      };
    } catch (error) {
      console.error('Error calculating eye metrics:', error);
      return { leftEyeHeight: 0, rightEyeHeight: 0, avgEyeHeight: 0 };
    }
  };

  // Calculate eyebrow metrics
  const calculateEyebrowMetrics = (landmarks, modelType) => {
    // Not available in MediaPipeFaceDetector, return zeros
    if (isMediaPipeFaceDetector(modelType)) {
      return { leftBrowDistance: 0, rightBrowDistance: 0, avgBrowDistance: 0 };
    }
    
    try {
      const leftEyebrowTop = landmarks[FACE_LANDMARKS.LEFT_EYEBROW[0]];
      const rightEyebrowTop = landmarks[FACE_LANDMARKS.RIGHT_EYEBROW[0]];
      const leftEyeTop = landmarks[FACE_LANDMARKS.LEFT_EYE_TOP[0]];
      const rightEyeTop = landmarks[FACE_LANDMARKS.RIGHT_EYE_TOP[0]];
      
      if (!leftEyebrowTop || !rightEyebrowTop || !leftEyeTop || !rightEyeTop) {
        return { leftBrowDistance: 0, rightBrowDistance: 0, avgBrowDistance: 0 };
      }

      const leftBrowDistance = calculateDistance(leftEyebrowTop, leftEyeTop);
      const rightBrowDistance = calculateDistance(rightEyebrowTop, rightEyeTop);
      const avgBrowDistance = (leftBrowDistance + rightBrowDistance) / 2;
      
      return {
        leftBrowDistance,
        rightBrowDistance,
        avgBrowDistance
      };
    } catch (error) {
      console.error('Error calculating eyebrow metrics:', error);
      return { leftBrowDistance: 0, rightBrowDistance: 0, avgBrowDistance: 0 };
    }
  };

  // Simplified facial expression analysis without baseline
  const analyzeFacialExpression = (faces, exerciseType) => {
    if (!faces || faces.length === 0) return { detected: false, intensity: 0 };
    
    try {
      const face = faces[0];
      if (!face.keypoints || face.keypoints.length < 6) {
        return { detected: false, intensity: 0 };
      }
      
      const landmarks = face.keypoints;
      
      // Calculate current metrics
      const currentMouth = calculateMouthMetrics(landmarks, modelType);
      const currentEyes = calculateEyeMetrics(landmarks, modelType);
      const currentEyebrows = calculateEyebrowMetrics(landmarks, modelType);
      
      // Update landmark data for visualization
      setLandmarkData({
        mouth: currentMouth,
        eyes: currentEyes,
        eyebrows: currentEyebrows
      });

      // Simplified detection without baseline comparison
      let intensity = 0;
      let detected = false;
      
      switch (exerciseType) {
        case 'smile': {
          // Simple width-based detection
          if (currentMouth.width > 0) {
            intensity = Math.min(100, Math.max(0, (currentMouth.width - 30) * 2));
            detected = intensity > 20;
          }
          break;
        }
        case 'frown': {
          // Negative curvature indicates frown
          if (currentMouth.curvature < 0) {
            intensity = Math.min(100, Math.abs(currentMouth.curvature * 10));
            detected = intensity > 15;
          }
          break;
        }
        case 'eyebrows': {
          // For now, use a simple threshold
          intensity = Math.min(100, Math.max(0, (currentEyebrows.avgBrowDistance - 20) * 5));
          detected = intensity > 10;
          break;
        }
        case 'eyes': {
          // Smaller eye height indicates squinting
          if (currentEyes.avgEyeHeight > 0) {
            intensity = Math.min(100, Math.max(0, (15 - currentEyes.avgEyeHeight) * 8));
            detected = intensity > 15;
          }
          break;
        }
        case 'cheeks': {
          // Wider mouth indicates puffed cheeks
          if (currentMouth.width > 0) {
            intensity = Math.min(100, Math.max(0, (currentMouth.width - 35) * 3));
            detected = intensity > 25;
          }
          break;
        }
      }
      
      return {
        detected,
        intensity: Math.round(intensity),
        metrics: {
          mouth: currentMouth,
          eyes: currentEyes,
          eyebrows: currentEyebrows
        }
      };
    } catch (error) {
      console.error('Error analyzing facial expression:', error);
      return { detected: false, intensity: 0 };
    }
  };

  // Enhanced face overlay drawing with landmark visualization
  const drawFaceOverlay = (faces) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (!faces || faces.length === 0) {
      drawPositioningGuide(ctx);
      return;
    }

    const face = faces[0];
    // Draw overlay for 6+ keypoints (supported models)
    if (face.keypoints && face.keypoints.length >= 6) {
      // Draw specific landmark groups with different colors
      ctx.fillStyle = '#00ff00';
      
      // Draw mouth landmarks
      ctx.fillStyle = '#ff0000';
      FACE_LANDMARKS.MOUTH_CORNERS.forEach(idx => {
        const point = face.keypoints[idx];
        if (point) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      
      // Draw eye landmarks
      ctx.fillStyle = '#0000ff';
      [...FACE_LANDMARKS.LEFT_EYE_TOP, ...FACE_LANDMARKS.LEFT_EYE_BOTTOM, 
       ...FACE_LANDMARKS.RIGHT_EYE_TOP, ...FACE_LANDMARKS.RIGHT_EYE_BOTTOM].forEach(idx => {
        const point = face.keypoints[idx];
        if (point) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      
      // Draw eyebrow landmarks
      ctx.fillStyle = '#ff8800';
      [...FACE_LANDMARKS.LEFT_EYEBROW.slice(0, 3), ...FACE_LANDMARKS.RIGHT_EYEBROW.slice(0, 3)].forEach(idx => {
        const point = face.keypoints[idx];
        if (point) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      
      // Calculate and draw bounding box
      const xs = face.keypoints.map(p => p.x);
      const ys = face.keypoints.map(p => p.y);
      const box = {
        xMin: Math.min(...xs),
        yMin: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
      };
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
      
      ctx.fillStyle = '#00ff00';
      ctx.font = '14px Arial';
      ctx.fillText(`Face Mesh: ${face.keypoints.length} points`, box.xMin, box.yMin - 10);
    }

    drawPositioningGuide(ctx);
  };

  // Draw positioning guide
  const drawPositioningGuide = (ctx) => {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    
    // Crosshair
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
  };

  // Camera and model setup
  useEffect(() => {
    let isMounted = true;
    const setup = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Step 1: Get camera access
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
          
          await new Promise((resolve, reject) => {
            const onCanPlay = async () => {
              try {
                if (!videoRef.current) {
                  reject(new Error('Video element not available'));
                  return;
                }
                await videoRef.current.play();
                videoRef.current.removeEventListener('canplay', onCanPlay);
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            
            if (videoRef.current) {
              videoRef.current.addEventListener('canplay', onCanPlay);
            } else {
              reject(new Error('Video element not available'));
            }
          });
        }
      } catch (err) {
        setError('Unable to access webcam. Please allow camera permissions. ' + (err?.message || ''));
        setLoading(false);
        return;
      }

      try {
        // Step 2: Load TensorFlow.js and face detection model
        console.log('Loading TensorFlow.js...');
        const tf = await import('@tensorflow/tfjs');
        await import('@tensorflow/tfjs-backend-webgl');
        await import('@tensorflow/tfjs-backend-cpu');
        await tf.ready();
        console.log('TensorFlow.js ready, backend:', tf.getBackend());
        const faceDetection = await import('@tensorflow-models/face-detection');
        console.log('Face detection library loaded');
        let loadedModel;
        let usedModelType = '';
        try {
          // Try MediaPipeFaceDetector first
          loadedModel = await faceDetection.createDetector(
            faceDetection.SupportedModels.MediaPipeFaceDetector,
            {
              runtime: 'tfjs',
              maxFaces: 1,
              refineLandmarks: false,
              solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection'
            }
          );
          usedModelType = 'MediaPipeFaceDetector';
          console.log('MediaPipeFaceDetector model loaded successfully');
        } catch (detectorError) {
          console.log('MediaPipeFaceDetector failed, trying BlazeFace:', detectorError);
          loadedModel = await faceDetection.createDetector(
            faceDetection.SupportedModels.BlazeFace,
            {
              runtime: 'tfjs',
              maxFaces: 1,
              returnTensors: false
            }
          );
          usedModelType = 'BlazeFace';
          console.log('BlazeFace model loaded successfully');
        }
        if (isMounted) {
          setModel(loadedModel);
          setModelType(usedModelType);
          setLoading(false);
          setFeedback('Ready to start! Click "Start Exercise" to begin.');
        }
      } catch (err) {
        console.error('Error loading face detection model:', err);
        if (isMounted) {
          setError('Failed to load AI model. Please refresh and try again. ' + (err?.message || ''));
          setLoading(false);
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // CRITICAL FIX: Reset exercise timing when exercise state changes
  const resetExerciseTimer = () => {
    exerciseStartTimeRef.current = null;
    goodFormTimeRef.current = 0;
    lastGoodTimeRef.current = 0;
    setExerciseProgress(0);
  };

  // Real-time face detection and exercise analysis
  useEffect(() => {
    let animationId;

    const runFaceDetection = async () => {
      if (!model || !videoRef.current) {
        if (!sessionComplete) {
          animationId = requestAnimationFrame(runFaceDetection);
        }
        return;
      }

      // Check if video is ready
      if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
        if (exerciseState === 'ready') {
          setFeedback('Camera not streaming. Please check camera permissions and lighting.');
        }
        animationId = requestAnimationFrame(runFaceDetection);
        return;
      }

      try {
        // Estimate faces
        const faces = await model.estimateFaces(videoRef.current, {
          maxFaces: 1,
          flipHorizontal: false
        });

        if (faces && faces.length > 0) {
          drawFaceOverlay(faces);
          
          if (exerciseState === 'active' && !sessionComplete) {
            const currentTime = Date.now();
            
            // Initialize timer on first active frame
            if (!exerciseStartTimeRef.current) {
              exerciseStartTimeRef.current = currentTime;
              goodFormTimeRef.current = 0;
              lastGoodTimeRef.current = currentTime;
            }
            
            const exercise = exercises[currentExercise];
            const analysis = analyzeFacialExpression(faces, exercise.target);
            
            setLiveIntensity(analysis.intensity);
            setLiveDetected(analysis.detected);

            if (analysis.detected && analysis.intensity > 25) {
              // Accumulate good form time
              if (lastGoodTimeRef.current > 0) {
                goodFormTimeRef.current += currentTime - lastGoodTimeRef.current;
              }
              lastGoodTimeRef.current = currentTime;
              setFeedback(`Excellent! Hold that ${exercise.name.toLowerCase()}! (${analysis.intensity}% intensity)`);
            } else {
              // Reset last good time when not detected
              lastGoodTimeRef.current = currentTime;
              setFeedback(`Try harder! Make a more pronounced ${exercise.name.toLowerCase()} expression. (${analysis.intensity}%)`);
            }

            const elapsed = (currentTime - exerciseStartTimeRef.current) / 1000;
            const progress = Math.min((elapsed / exercise.duration) * 100, 100);
            setExerciseProgress(progress);

            // Check if exercise duration is complete
            if (elapsed >= exercise.duration) {
              const successThreshold = exercise.duration * 0.4; // 40% of duration needed in good form
              const timeInGoodFormSeconds = goodFormTimeRef.current / 1000;
              const success = timeInGoodFormSeconds >= successThreshold;

              setExerciseResults(prev => [...prev, {
                exercise: exercise.name,
                success: success,
                score: Math.round((timeInGoodFormSeconds / exercise.duration) * 100),
                maxIntensity: analysis.intensity,
                avgIntensity: Math.round(analysis.intensity),
                duration: exercise.duration,
                timeInGoodForm: Math.round(timeInGoodFormSeconds * 10) / 10
              }]);

              setExerciseState('completed');
              setExerciseProgress(100);
              setFeedback(`✅ ${exercise.name} completed! ${success ? 'Great job!' : 'Try again for better form.'}`);
              
              // Reset timer for next exercise
              resetExerciseTimer();
            }
          } else if (exerciseState === 'ready') {
            // Show live feedback when ready but not started
            const exercise = exercises[currentExercise];
            const analysis = analyzeFacialExpression(faces, exercise.target);
            setLiveIntensity(analysis.intensity);
            setLiveDetected(analysis.detected);
          }
        } else {
          setLiveIntensity(0);
          setLiveDetected(false);
          if (exerciseState === 'ready') {
            setFeedback('No face detected. Please center your face in the camera view and ensure good lighting.');
          }
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            drawPositioningGuide(ctx);
          }
        }
      } catch (error) {
        console.error('Face detection error:', error);
        setFeedback('Detection temporarily unavailable. Please ensure good lighting and clear face visibility.');
      }

      // Continue the loop
      animationId = requestAnimationFrame(runFaceDetection);
    };

    if (model && !sessionComplete) {
      runFaceDetection();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [model, exerciseState, currentExercise, sessionComplete]);

  // Reset states when exercise changes - FIXED
  useEffect(() => {
    // Reset all exercise-specific states
    setLiveIntensity(0);
    setLiveDetected(false);
    setExerciseState('ready');
    setFeedback(`Ready to start ${exercises[currentExercise].name}. Click "Start Exercise" when ready.`);
    
    // CRITICAL: Reset exercise timer
    resetExerciseTimer();
  }, [currentExercise]);

  // Function to start next exercise properly
  const startNextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(prev => prev + 1);
      // State will be reset by useEffect above
    } else {
      // Complete session
      setSessionComplete(true);
      setExerciseState('completed');
      setFeedback('🎉 Congratulations! You have completed all facial exercises!');
    }
  };

  // Function to start current exercise - FIXED
  const startCurrentExercise = () => {
    if (exerciseState === 'ready') {
      setExerciseState('active');
      setFeedback(`Starting ${exercises[currentExercise].name}... ${exercises[currentExercise].instruction}`);
      // Timer will be initialized in the detection loop
      resetExerciseTimer();
    }
  };

  // Function to stop current exercise
  const stopCurrentExercise = () => {
    setExerciseState('ready');
    setFeedback(`${exercises[currentExercise].name} stopped. Click "Start Exercise" to try again.`);
    resetExerciseTimer();
  };

  // Show error screen
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

  const currentExerciseData = exercises[currentExercise];
  const ExerciseIcon = currentExerciseData?.icon;

  if (!currentExerciseData) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>No exercise found</Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>Restart</Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{
        width: '100vw',
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #fbc2eb 0%, #a6c1ee 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 2, md: 6 },
      }}>
        <Paper elevation={8} sx={{
          width: { xs: '98vw', sm: '90vw', md: '80vw', lg: '70vw', xl: '60vw' },
          maxWidth: 1400,
          minHeight: 700,
          borderRadius: 6,
          p: { xs: 1, md: 4 },
          mx: 'auto',
          background: 'rgba(255,255,255,0.95)',
          boxShadow: 6,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
        }}>
          {/* Left: Video & Overlay */}
          <Box sx={{
            flex: 1.2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
            gap: 2,
          }}>
            {/* Exercise Header */}
            <Paper elevation={2} sx={{
              width: '100%',
              mb: 2,
              p: 2,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #e3f2fd 0%, #fbc2eb 100%)',
              boxShadow: 2,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                bgcolor: exerciseState === 'active' ? '#4caf50' : exerciseState === 'ready' ? '#2196f3' : '#e3f2fd', 
                borderRadius: '50%', 
                width: 56, 
                height: 56,
                transition: 'background-color 0.3s ease'
              }}>
                <ExerciseIcon sx={{ fontSize: 36, color: exerciseState === 'active' ? 'white' : 'primary.main' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" color="primary" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {currentExerciseData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentExerciseData.instruction}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentExerciseData.description}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Exercise {currentExercise + 1} of {exercises.length}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: exerciseState === 'active' ? 'success.main' : 
                           exerciseState === 'ready' ? 'primary.main' : 
                           exerciseState === 'completed' ? 'success.main' : 'text.secondary',
                    fontWeight: 600
                  }}>
                    Status: {exerciseState === 'ready' ? 'Ready' : 
                            exerciseState === 'active' ? 'Active' : 'Completed'}
                  </Typography>
                  {modelType && (
                    <Typography variant="caption" color="text.secondary">
                      | {modelType}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Paper>

            {/* Video Feed */}
            <Box sx={{
              position: 'relative',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: 3,
              width: { xs: 320, sm: 400, md: 480 },
              height: { xs: 240, sm: 300, md: 360 },
              mx: 'auto',
              mb: 2,
              border: `3px solid ${
                exerciseState === 'active' && liveDetected ? '#4caf50' : 
                exerciseState === 'active' ? '#ff9800' : 
                exerciseState === 'ready' ? '#2196f3' : '#9e9e9e'
              }`,
              background: '#000',
              transition: 'border-color 0.3s ease'
            }}>
              <video 
                ref={videoRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT} 
                style={{ 
                  objectFit: 'cover', 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  zIndex: 1,
                  transform: 'scaleX(-1)',
                  background: '#000'
                }} 
                autoPlay 
                muted 
                playsInline 
              />
              <canvas 
                ref={canvasRef} 
                width={CANVAS_WIDTH} 
                height={CANVAS_HEIGHT} 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  pointerEvents: 'none', 
                  zIndex: 2,
                  transform: 'scaleX(-1)'
                }} 
              />
              
              {/* Real-time intensity overlay */}
              <Box sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 3,
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: 2,
                minWidth: 120
              }}>
                <Typography variant="caption" display="block">
                  Live Intensity
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: liveIntensity > 50 ? '#4caf50' : liveIntensity > 25 ? '#ff9800' : '#f44336',
                  fontWeight: 'bold'
                }}>
                  {liveIntensity}%
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: liveDetected ? '#4caf50' : '#f44336' 
                }}>
                  {liveDetected ? '✓ Detected' : '✗ Not Detected'}
                </Typography>
              </Box>
              
              {/* Exercise state indicator */}
              <Box sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 3,
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '6px 10px',
                borderRadius: 2,
                fontSize: '0.75rem'
              }}>
                {exerciseState === 'ready' && '✅ Ready to Start'}
                {exerciseState === 'active' && '🎯 Exercise Active'}
                {exerciseState === 'completed' && '✅ Complete'}
              </Box>
              
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

            {/* Enhanced Progress and Feedback */}
            <Box sx={{ width: '100%', mb: 2 }}>
              {/* Exercise Progress Bar (only during active exercise) */}
              {exerciseState === 'active' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 600, textAlign: 'center', mb: 1 }}>
                    Exercise Progress: {Math.round(exerciseProgress)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={exerciseProgress} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4, 
                      background: '#e0e0e0',
                      '& .MuiLinearProgress-bar': { 
                        backgroundColor: '#2196f3',
                        borderRadius: 4
                      } 
                    }} 
                  />
                  <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 0.5, color: 'text.secondary' }}>
                    Time remaining: {Math.max(0, currentExerciseData.duration - Math.round(exerciseProgress * currentExerciseData.duration / 100))}s
                  </Typography>
                </Box>
              )}

              {/* Real-time intensity bar */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color={liveDetected ? 'success.main' : 'error.main'} sx={{ fontWeight: 600, textAlign: 'center', mb: 1 }}>
                  {exerciseState === 'active' ? 
                    (liveDetected ? `${currentExerciseData.name} Detected!` : `Looking for ${currentExerciseData.name}...`) :
                    `${currentExerciseData.name} Preview`
                  }
                </Typography>
                <Box sx={{ width: '100%', mb: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={liveIntensity} 
                    sx={{ 
                      height: 12, 
                      borderRadius: 6, 
                      background: '#e0e0e0',
                      '& .MuiLinearProgress-bar': { 
                        backgroundColor: liveIntensity > 60 ? '#43a047' : liveIntensity > 35 ? '#fbc02d' : '#f44336',
                        borderRadius: 6
                      } 
                    }} 
                  />
                </Box>
                <Stack direction="row" justifyContent="space-between" sx={{ px: 1 }}>
                  <Typography variant="caption" color="text.secondary">0%</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Intensity: {liveIntensity}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">100%</Typography>
                </Stack>
                
                {/* Intensity guidance */}
                <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1, color: 'text.secondary' }}>
                  {exerciseState === 'active' ? (
                    liveIntensity < 15 ? "Try making the expression more pronounced" :
                    liveIntensity >= 15 && liveIntensity < 35 ? "Good! Make it a bit stronger" :
                    liveIntensity >= 35 && liveIntensity < 60 ? "Excellent form! Hold this position" :
                    "Perfect! Maximum intensity achieved"
                  ) : (
                    exerciseState === 'ready' ? "Practice the expression before starting" :
                    "Exercise completed"
                  )}
                </Typography>
              </Box>

              {/* Feedback Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Typography variant="h6" color="primary" align="center" sx={{
                  mb: 3,
                  fontWeight: 600,
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: exerciseState === 'completed' ? 'linear-gradient(90deg, #e0ffe0 0%, #b2f7b2 100%)' : 'none',
                  borderRadius: exerciseState === 'completed' ? 2 : 0,
                  color: exerciseState === 'completed' ? '#388e3c' : 'primary.main',
                  boxShadow: exerciseState === 'completed' ? 2 : 0,
                  p: exerciseState === 'completed' ? 1 : 0
                }}>
                  {feedback || 'Ready to start! Click "Start Exercise" to begin.'}
                </Typography>
              </motion.div>
            </Box>
          </Box>

          {/* Right: Metrics, Tips, Results */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 2,
            minWidth: 0,
          }}>
            {/* Real-time metrics display */}
            {landmarkData && (
              <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Real-time Facial Metrics
                </Typography>
                <Stack direction="row" spacing={2} sx={{ fontSize: '0.75rem' }}>
                  <Box>
                    <Typography variant="caption" display="block">Mouth</Typography>
                    <Typography variant="caption">
                      W: {landmarkData.mouth.width.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      H: {landmarkData.mouth.height.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Curve: {typeof landmarkData.mouth.curvature === 'number' && isFinite(landmarkData.mouth.curvature) ? landmarkData.mouth.curvature.toFixed(1) : 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" display="block">Eyes</Typography>
                    <Typography variant="caption">
                      Avg: {landmarkData.eyes.avgEyeHeight.toFixed(1)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" display="block">Eyebrows</Typography>
                    <Typography variant="caption">
                      Dist: {typeof landmarkData.eyebrows.avgBrowDistance === 'number' && landmarkData.eyebrows.avgBrowDistance > 0 ? landmarkData.eyebrows.avgBrowDistance.toFixed(1) : 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Session Results */}
            {sessionComplete && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  🎉 Session Complete!
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Congratulations! You completed all {exercises.length} facial exercises.
                </Typography>
                
                {/* Detailed Results */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Session Summary:</Typography>
                  {exerciseResults.map((result, index) => (
                    <Paper key={index} sx={{ p: 1.5, mb: 1, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {result.exercise}
                        </Typography>
                        <Typography variant="body2" color={result.success ? 'success.main' : 'warning.main'}>
                          {result.success ? '✅ Success' : '⚠️ Needs Practice'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        <Typography variant="caption">
                          Form Score: {result.score}%
                        </Typography>
                        <Typography variant="caption">
                          Time in Position: {result.timeInGoodForm}s/{result.duration}s
                        </Typography>
                        {result.maxIntensity && (
                          <Typography variant="caption">
                            Max Intensity: {result.maxIntensity}%
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Box>

                {/* Overall Statistics */}
                <Box sx={{ p: 1.5, backgroundColor: 'rgba(46, 125, 50, 0.1)', borderRadius: 1, mb: 2 }}>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
                    Overall Performance:
                  </Typography>
                  <Stack direction="row" spacing={3}>
                    <Typography variant="caption">
                      Success Rate: {Math.round((exerciseResults.filter(r => r.success).length / exerciseResults.length) * 100)}%
                    </Typography>
                    <Typography variant="caption">
                      Avg Form Score: {Math.round(exerciseResults.reduce((sum, r) => sum + r.score, 0) / exerciseResults.length)}%
                    </Typography>
                    <Typography variant="caption">
                      Total Time: {exerciseResults.reduce((sum, r) => sum + r.duration, 0)}s
                    </Typography>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setCurrentExercise(0);
                      setSessionComplete(false);
                      setExerciseResults([]);
                      setExerciseProgress(0);
                      setExerciseState('ready');
                      setFeedback('Starting new session! Click "Start Exercise" to begin.');
                      resetExerciseTimer();
                    }}
                  >
                    New Session
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      // Find exercises that need improvement
                      const needImprovement = exerciseResults.filter(r => !r.success);
                      if (needImprovement.length > 0) {
                        const firstToImprove = exercises.findIndex(ex => ex.name === needImprovement[0].exercise);
                        setCurrentExercise(firstToImprove);
                        setSessionComplete(false);
                        setExerciseResults([]);
                        setExerciseProgress(0);
                        setExerciseState('ready');
                        setFeedback(`Retrying ${needImprovement[0].exercise}. Focus on better form!`);
                        resetExerciseTimer();
                      }
                    }}
                    disabled={exerciseResults.every(r => r.success)}
                  >
                    Retry Failed Exercises
                  </Button>
                </Stack>
              </Alert>
            )}

            {/* Tips for current exercise */}
            {!sessionComplete && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tips for {currentExerciseData.name}:
                </Typography>
                <Typography variant="body2">
                  {currentExerciseData.target === 'smile' &&
                    'Think of something that makes you genuinely happy. Use your cheek muscles to lift the corners of your mouth. Aim for 25%+ intensity.'}
                  {currentExerciseData.target === 'frown' &&
                    'Pull the corners of your mouth downward. Engage your chin muscles for a deeper frown. Focus on downward movement.'}
                  {currentExerciseData.target === 'eyebrows' &&
                    'Try to touch your hairline with your eyebrows. Lift them as high as possible while keeping eyes relaxed.'}
                  {currentExerciseData.target === 'eyes' &&
                    'Squeeze your eyelids together tightly, as if trying to block out bright light. Feel the muscles around your eyes engage.'}
                  {currentExerciseData.target === 'cheeks' &&
                    'Fill your cheeks with air like a balloon. Keep your lips sealed and push the air into your cheeks to expand them.'}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                  The system uses facial landmarks to measure muscle movements in real-time. 
                  {exerciseState === 'ready' && ' You can practice the expression or start when ready.'}
                  {exerciseState === 'active' && ' Hold the expression for the full duration for best results.'}
                </Typography>
              </Alert>
            )}

            {/* Improved Controls */}
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3, mb: 2, flexWrap: 'wrap' }}>
              {/* Previous Exercise Button */}
              <Button 
                variant="outlined" 
                onClick={() => {
                  if (currentExercise > 0) {
                    setCurrentExercise(prev => prev - 1);
                  }
                }}
                disabled={currentExercise === 0 || exerciseState === 'active'}
              >
                Previous
              </Button>

              {/* Start Exercise Button */}
              {exerciseState === 'ready' && !sessionComplete && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  onClick={startCurrentExercise}
                  sx={{ minWidth: 140, fontWeight: 700 }}
                >
                  Start Exercise
                </Button>
              )}

              {/* Stop Exercise Button */}
              {exerciseState === 'active' && (
                <Button 
                  variant="contained" 
                  color="secondary" 
                  size="large"
                  onClick={stopCurrentExercise}
                  sx={{ minWidth: 120 }}
                >
                  Stop Exercise
                </Button>
              )}

              {/* Next Exercise Button */}
              {exerciseState === 'completed' && !sessionComplete && (
                <Button 
                  variant="contained" 
                  color="success" 
                  size="large"
                  sx={{ minWidth: 180, fontWeight: 700, fontSize: '1.1rem', boxShadow: 3 }}
                  onClick={startNextExercise}
                >
                  {currentExercise === exercises.length - 1 ? 'Complete Session' : 'Next Exercise'}
                </Button>
              )}

              {/* Skip Exercise Button (for testing/accessibility) */}
              {exerciseState === 'ready' && !sessionComplete && (
                <Button 
                  variant="text" 
                  size="small"
                  onClick={() => {
                    setExerciseState('completed');
                    setExerciseResults(prev => [...prev, {
                      exercise: currentExerciseData.name,
                      success: false,
                      score: 0,
                      maxIntensity: 0,
                      avgIntensity: 0,
                      duration: currentExerciseData.duration,
                      timeInGoodForm: 0
                    }]);
                    setFeedback('Exercise skipped. Click "Next Exercise" to continue.');
                  }}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Skip Exercise
                </Button>
              )}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Layout>
  );
};

export default FacialMovementExercise;