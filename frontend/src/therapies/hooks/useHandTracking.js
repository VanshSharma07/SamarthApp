import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

// Custom hook for handling webcam setup and hand tracking
const useHandTracking = () => {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [hands, setHands] = useState([]);
  
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  
  // Function to handle errors
  const handleError = (error) => {
    console.error("Error in hand tracking:", error);
    setModelError(error.message || "Failed to initialize hand tracking");
    setIsModelLoading(false);
  };

  // Initialize the handpose model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        console.log("TensorFlow.js is ready");
        
        // Load the handpose model
        console.log("Loading handpose model...");
        const model = await handpose.load();
        console.log("Handpose model loaded");
        
        modelRef.current = model;
        setIsModelLoading(false);
      } catch (error) {
        handleError(error);
      }
    };

    loadModel();

    // Cleanup function
    return () => {
      if (webcamRef.current && webcamRef.current.srcObject) {
        const tracks = webcamRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Simple hand detection loop (no overlap, lower FPS for performance)
  const detectionActiveRef = useRef(false);
  let detectionTimeout = null;

  const detectHands = async () => {
    if (!detectionActiveRef.current) return;
    if (!modelRef.current || !webcamRef.current || !canvasRef.current) {
      detectionTimeout = setTimeout(detectHands, 120); // ~8 FPS
      return;
    }
    if (
      webcamRef.current.readyState !== 4 ||
      !webcamRef.current.videoWidth ||
      !webcamRef.current.videoHeight
    ) {
      detectionTimeout = setTimeout(detectHands, 120);
      return;
    }
    const video = webcamRef.current;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    try {
      const detectedHands = await modelRef.current.estimateHands(video);
      setHands(detectedHands);
      const ctx = canvasRef.current.getContext('2d');
      drawResults(ctx, detectedHands, videoWidth, videoHeight);
    } catch (error) {
      console.error("Error during hand detection:", error);
    }
    detectionTimeout = setTimeout(detectHands, 120); // ~8 FPS
  };

  // Draw hand landmarks on canvas
  const drawResults = (ctx, hands, videoWidth, videoHeight) => {
    // Clear canvas
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // Draw video frame
    ctx.drawImage(webcamRef.current, 0, 0, videoWidth, videoHeight);
    
    // Draw each detected hand
    hands.forEach((hand) => {
      const landmarks = hand.landmarks;
      
      // Draw landmarks
      landmarks.forEach((landmark, index) => {
        const [x, y, z] = landmark;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        
        // Color finger tips differently (indices 4, 8, 12, 16, 20)
        if ([4, 8, 12, 16, 20].includes(index)) {
          ctx.fillStyle = '#FF0000';
        } else {
          ctx.fillStyle = '#00FF00';
        }
        
        ctx.fill();
      });
      
      // Draw connections between landmarks (simplified)
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      
      // Draw palm connections
      for (let i = 0; i < 5; i++) {
        const baseIndex = i * 4;
        const wristIndex = 0;
        
        // Connect wrist to base of each finger
        ctx.beginPath();
        ctx.moveTo(landmarks[wristIndex][0], landmarks[wristIndex][1]);
        ctx.lineTo(landmarks[baseIndex + 1][0], landmarks[baseIndex + 1][1]);
        ctx.stroke();
        
        // Connect finger joints
        for (let j = 1; j < 4; j++) {
          ctx.beginPath();
          ctx.moveTo(landmarks[baseIndex + j][0], landmarks[baseIndex + j][1]);
          ctx.lineTo(landmarks[baseIndex + j + 1][0], landmarks[baseIndex + j + 1][1]);
          ctx.stroke();
        }
      }
    });
  };

  // Start the hand tracking process
  const startHandTracking = async () => {
    try {
      // Request camera access and assign stream to video element
      if (webcamRef.current && !webcamRef.current.srcObject) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamRef.current.srcObject = stream;
        await new Promise((resolve) => {
          webcamRef.current.onloadedmetadata = () => {
            webcamRef.current.play();
            resolve();
          };
        });
      }
      detectionActiveRef.current = true;
      detectHands();
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  };

  // Stop the hand tracking process and release camera
  const stopHandTracking = () => {
    detectionActiveRef.current = false;
    if (detectionTimeout) clearTimeout(detectionTimeout);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx && ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return {
    webcamRef,
    canvasRef,
    isModelLoading,
    modelError,
    hands,
    startHandTracking,
    stopHandTracking
  };
};

export default useHandTracking;
