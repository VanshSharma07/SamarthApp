import { useState, useRef, useEffect } from 'react';
import { Box, Button, Grid, Typography, Paper, CircularProgress } from '@mui/material';
import AssessmentLayout from '../common/AssessmentLayout';
import { MLService } from '../../services/mlService';
import PropTypes from 'prop-types';
import { specializedAssessments } from '../../services/api';
import { saveFacialAssessment } from '../../services/assessments/facialService';
import FaceMeshOverlay from './FaceMeshOverlay';

const FacialSymmetry = ({ userId, onComplete }) => {
  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [symmetryData, setSymmetryData] = useState(null);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 480 });
  const [faceLandmarks, setFaceLandmarks] = useState(null);
  const [neurologicalIndicators, setNeurologicalIndicators] = useState(null);
  const [showMidline, setShowMidline] = useState(true);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [hasVideoPermission, setHasVideoPermission] = useState(false);
  
  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const assessmentStartTime = useRef(null);
  
  const maxCaptureAttempts = 3;

  // Check if user ID is provided
  useEffect(() => {
    if (!userId) {
      setError('User ID is required for assessment');
      console.error('FacialSymmetry component: userId prop is required');
    }
  }, [userId]);

  // Cleanup video stream on component unmount
  useEffect(() => {
    return () => {
      stopVideoStream();
    };
  }, []);

  // Setup video event handlers once the component mounts
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = handleVideoLoad;
      videoRef.current.onerror = handleVideoError;
    }
  }, []);

  // Handle video element loading
  const handleVideoLoad = () => {
    if (videoRef.current) {
      setVideoSize({
        width: videoRef.current.videoWidth || 640,
        height: videoRef.current.videoHeight || 480
      });
      console.log('Video loaded successfully:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
    }
  };

  // Handle video element errors
  const handleVideoError = (event) => {
    console.error('Video element error:', event);
    setError(`Video error: ${event.target.error?.message || 'Unknown error'}`);
    setIsLoading(false);
  };

  // Stop any active video streams
  const stopVideoStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Initialize camera stream with proper error handling
  const initializeCamera = async () => {
    try {
      // First check if we have permission
      const permissionStatus = await navigator.permissions.query({ name: 'camera' });
      const hasPermission = permissionStatus.state === 'granted';
      
      // If denied, show a clear message to user
      if (permissionStatus.state === 'denied') {
        throw new Error('Camera access is blocked. Please enable camera permissions in your browser settings.');
      }
      
      // Request camera stream with constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } 
      });
      
      setHasVideoPermission(true);
      return stream;
      
    } catch (err) {
      console.error('Camera initialization error:', err);
      
      // Provide clear error messages based on the error
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Camera access denied. Please allow camera permissions and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No camera detected. Please connect a camera and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('Camera is already in use by another application. Please close other apps that might be using your camera.');
      } else {
        throw new Error(`Failed to access camera: ${err.message}`);
      }
    }
  };

  // Capture image from video stream
  const captureImage = async () => {
    // Even if video refs aren't available, try to capture anyway using any available video element
    if (!videoRef.current && !streamRef.current) {
      // Try to find any video element on the page that might be working
      const fallbackVideo = document.querySelector('video[srcObject]');
      if (!fallbackVideo) {
        setError('Video stream not available. Please restart assessment.');
        return;
      }
      // Use the fallback video for capturing
      videoRef.current = fallbackVideo;
    } else if (!videoRef.current && streamRef.current) {
      // We have a stream but no video element - create a temporary one
      const tempVideo = document.createElement('video');
      tempVideo.srcObject = streamRef.current;
      tempVideo.autoplay = true;
      tempVideo.playsInline = true;
      tempVideo.muted = true;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = resolve;
        setTimeout(resolve, 1000); // Fallback timeout
      });
      
      // Use this temporary video for the capture
      videoRef.current = tempVideo;
    }
    
    setIsLoading(true);
    setCaptureAttempts(prev => prev + 1);

    try {
      // Create canvas and draw video frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      
      // Apply video transformation to match video display
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);

      // Convert data URL to blob
      const blob = await fetch(imageData).then(res => res.blob());

      // Use ML service to analyze facial symmetry
      console.log('Sending image to ML service for facial symmetry analysis');
      const results = await MLService.analyzeFace(blob);
      console.log('Received facial symmetry results:', results);
      
      if (results.success) {
        processAnalysisResults(results);
      } else {
        handleCaptureError(results.error || 'No face detected. Please try again.');
      }
    } catch (err) {
      handleCaptureError(`Error analyzing facial symmetry: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual image upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setCapturedImage(null);
    setSymmetryData(null);
    setNeurologicalIndicators(null);
    setFaceLandmarks(null);
    stopVideoStream();
    setIsAssessing(false);

    try {
      // Create a preview URL for the uploaded image
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
      };
      reader.readAsDataURL(file);

      // Analyze the uploaded image
      console.log('Analyzing uploaded image...');
      // Note: analyzeFace should handle File/Blob objects
      const results = await MLService.analyzeFace(file);
      console.log('Received facial symmetry results:', results);

      if (results.success) {
        processAnalysisResults(results);
      } else {
        setError(results.error || 'No face detected in the uploaded image. Please try another photo.');
      }
    } catch (err) {
      console.error('Error analyzing uploaded file:', err);
      setError(`Error analyzing uploaded image: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process facial analysis results
  const processAnalysisResults = (results) => {
    // Store complete symmetry data
    setSymmetryData(results);
    
    // Store neurological indicators separately for UI display
    setNeurologicalIndicators(results.neurological_indicators || null);
    
    // Update metrics for display
    const currentMetrics = {
      symmetryScore: results.symmetry_score.toFixed(2),
      eyeSymmetry: (results.metrics?.eye_symmetry * 100).toFixed(2),
      mouthSymmetry: (results.metrics?.mouth_symmetry * 100).toFixed(2),
      jawSymmetry: (results.metrics?.jaw_symmetry * 100).toFixed(2),
      eyebrowSymmetry: (results.metrics?.eyebrow_symmetry * 100).toFixed(2),
      faceTilt: results.metrics?.face_tilt?.toFixed(2) || '0.00',
      timestamp: new Date().toISOString()
    };
    
    setMetrics(currentMetrics);
    
    // Update face landmarks for 3D overlay
    if (results.landmarks) {
      setFaceLandmarks({
        face: transformLandmarks(results.landmarks),
        midline: results.midline || null
      });
    }
    
    // Reset error state if previously set
    setError(null);
  };
  
  // Handle capture errors
  const handleCaptureError = (errorMessage) => {
    console.error(errorMessage);
    setError(errorMessage);
    
    // If we've reached max attempts, show a more detailed error
    if (captureAttempts >= maxCaptureAttempts) {
      setError(`${errorMessage} - Multiple attempts failed. Please ensure your face is clearly visible, well-lit, and facing the camera directly.`);
    }
  };

  // Transform landmarks from ML Service format to format needed by FaceMeshOverlay
  const transformLandmarks = (landmarks) => {
    const points = [];
    
    // Convert different landmark formats to an array of points
    if (landmarks) {
      Object.entries(landmarks).forEach(([key, regionPoints]) => {
        if (Array.isArray(regionPoints)) {
          regionPoints.forEach(point => {
            if (point && typeof point.x === 'number' && typeof point.y === 'number') {
              points.push({
                x: point.x,
                y: point.y,
                z: point.z || 0,
                region: key // Add region information for coloring
              });
            }
          });
        }
      });
    }
    
    return points;
  };

  // Start the facial symmetry assessment with improved video element handling
  const startAssessment = async () => {
    try {
      // Reset state
      setError(null);
      setIsLoading(true);
      setCapturedImage(null);
      setSymmetryData(null);
      setNeurologicalIndicators(null);
      setFaceLandmarks(null);
      setCaptureAttempts(0);
      
      // Stop any existing streams
      stopVideoStream();
      
      // Initialize the camera
      console.log('Initializing camera...');
      const stream = await initializeCamera();
      
      // Store the stream reference first to prevent race conditions
      streamRef.current = stream;

      // First set the assessing state to ensure the video element will be rendered in the DOM
      setIsAssessing(true);
      assessmentStartTime.current = Date.now();
      
      // Wait for the next render cycle to ensure video element is in the DOM
      setTimeout(async () => {
        if (!videoRef.current) {
          console.warn('Video element reference not found after DOM update - creating fallback');
          
          // Create a temporary video element and attach it to the DOM
          const tempVideo = document.createElement('video');
          tempVideo.autoplay = true;
          tempVideo.playsInline = true;
          tempVideo.muted = true;
          tempVideo.style.width = '100%';
          tempVideo.style.height = '100%';
          tempVideo.style.objectFit = 'cover';
          tempVideo.style.transform = 'scaleX(-1)';
          
          // Find the container where the video should be
          const videoContainer = document.querySelector('[data-test-id="video-container"]') || 
                                document.querySelector('.MuiBox-root') ||
                                document.body;
          
          // Append the temporary video
          videoContainer.appendChild(tempVideo);
          
          // Set the stream to the temporary video
          tempVideo.srcObject = streamRef.current;
          try {
            await tempVideo.play();
            console.log('Fallback video playback started');
          } catch (e) {
            console.warn('Error playing fallback video:', e);
          }
          
          // We're using a fallback, so we might need more time for videoRef to be available
          setTimeout(() => {
            if (videoRef.current && streamRef.current) {
              console.log('Video ref now available, transferring stream');
              videoRef.current.srcObject = streamRef.current;
              videoRef.current.play().catch(e => console.warn('Final fallback play error:', e));
              
              // Remove the temporary video if we now have a real one
              if (tempVideo.parentNode) {
                tempVideo.pause();
                tempVideo.srcObject = null;
                tempVideo.parentNode.removeChild(tempVideo);
              }
            }
          }, 500);
        } else {
          // Normal case - use the existing video element
          console.log('Setting stream to video element');
          videoRef.current.srcObject = streamRef.current;
          
          try {
            await videoRef.current.play();
            console.log('Video playback started successfully');
          } catch (playError) {
            console.warn('Error playing video, will retry:', playError);
            
            // Retry play after a short delay
            setTimeout(() => {
              if (videoRef.current && streamRef.current) {
                videoRef.current.play().catch(e => console.warn('Retry play error:', e));
              }
            }, 200);
          }
        }
      }, 50); // Short delay to allow React to render the video element
    } catch (err) {
      setError(`${err.message}. Try refreshing the page or using a different browser.`);
      console.error('Start assessment error:', err);
      stopVideoStream();
    } finally {
      setIsLoading(false);
    }
  };

  // Stop the assessment and save results if available
  const stopAssessment = async () => {
    stopVideoStream();
    setIsAssessing(false);
    setFaceLandmarks(null);

    // Only save results if we have valid metrics and symmetry data
    if (metrics && symmetryData) {
      setIsLoading(true);
      try {
        // Send the data in the exact same format as received from the ML service
        const assessmentData = {
          userId,
          metrics: {
            // Include all original fields from symmetryData
            symmetry_score: symmetryData.symmetry_score,
            landmarks: symmetryData.landmarks || {},
            midline: symmetryData.midline || {},
            metrics: symmetryData.metrics || {},
            neurologicalIndicators: symmetryData.neurological_indicators || {}
          }
        };

        const result = await saveFacialAssessment(assessmentData);

        if (onComplete) {
          onComplete(result);
        }
      } catch (error) {
        console.error('Error saving facial symmetry assessment:', error);
        setError(error.message || 'Failed to save assessment results');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Fetch baseline data for comparison
  useEffect(() => {
    const fetchBaseline = async () => {
      try {
        const response = await specializedAssessments.facialSymmetry.getBaseline(userId);
        if (response.data.data) {
          // Use baseline data for comparison
          console.log('Baseline data:', response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch baseline:', error);
      }
    };

    if (userId) {
      fetchBaseline();
    }
  }, [userId]);

  // Draw facial landmarks and midline on 2D canvas
  const renderSymmetryOverlay = () => {
    if (!symmetryData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas dimensions to match video
    canvas.width = videoSize.width;
    canvas.height = videoSize.height;
    
    // Draw midline if available and enabled
    if (showMidline && symmetryData.midline) {
      const { top, bottom } = symmetryData.midline;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    }

    // Color configuration for different facial regions
    const regionColors = {
      leftEye: '#00ff00',
      rightEye: '#00ff00',
      leftEyebrow: '#00ffff',
      rightEyebrow: '#00ffff',
      mouth: '#ff0000',
      nose: '#ffaa00',
      jawline: '#0000ff'
    };

    // Only proceed if we have landmarks
    if (!symmetryData.landmarks) {
      return;
    }

    // Draw facial regions with different colors
    Object.entries(symmetryData.landmarks).forEach(([region, points]) => {
      if (Array.isArray(points) && points.length > 0) {
        ctx.strokeStyle = regionColors[region] || '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        points.forEach((point, index) => {
          if (point && typeof point.x === 'number' && typeof point.y === 'number') {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          }
        });
        
        // Close the path for closed features like eyes
        if (['leftEye', 'rightEye', 'mouth'].includes(region)) {
          ctx.closePath();
        }
        
        ctx.stroke();
      }
    });
  };

  // Update overlay when symmetry data or canvas size changes
  useEffect(() => {
    if (symmetryData && canvasRef.current) {
      renderSymmetryOverlay();
    }
  }, [symmetryData, videoSize, showMidline]);

  // Display neurological indicators if available
  const renderNeurologicalIndicators = () => {
    if (!neurologicalIndicators) return null;
    
    return (
      <Paper elevation={3} sx={{ p: 2, mt: 2, bgcolor: '#0000' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Neurological Indicators</Typography>
        {Object.entries(neurologicalIndicators).map(([key, value]) => (
          <Box key={key} sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
              {key.replace('_', ' ')}:
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: value.risk === 'high' ? 'error.main' : 
                    value.risk === 'moderate' ? 'warning.main' : 'success.main'
            }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                Risk: {value.risk}
              </Typography>
              <Typography variant="body2">
                (Score: {(value.score * 100).toFixed(2)})
              </Typography>
            </Box>
          </Box>
        ))}
      </Paper>
    );
  };

  // Action buttons
  const actions = (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
      {isAssessing && !capturedImage && !isLoading && (
        <Button
          variant="contained"
          color="secondary"
          onClick={captureImage}
          disabled={isLoading}
          sx={{ minWidth: 150 }}
        >
          Capture
        </Button>
      )}

      {!isAssessing && !isLoading && (
        <>
          <input
            type="file"
            accept="image/*"
            id="face-upload"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <label htmlFor="face-upload">
            <Button
              variant="outlined"
              component="span"
              color="primary"
              sx={{ minWidth: 150 }}
            >
              Upload Photo
            </Button>
          </label>
        </>
      )}

      <Button
        variant="contained"
        color={isAssessing ? 'error' : metrics ? 'success' : 'primary'}
        onClick={isAssessing || (metrics && !isAssessing) ? stopAssessment : startAssessment}
        disabled={isLoading}
        sx={{ minWidth: 200 }}
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : isAssessing ? (
          'Stop Camera'
        ) : metrics ? (
          'Save & Complete'
        ) : (
          'Start Camera'
        )}
      </Button>
    </Box>
  );

  return (
    <AssessmentLayout
      title="Facial Symmetry Assessment"
      description="This assessment analyzes your facial symmetry to detect potential neurological disorders. Look straight at the camera with a neutral expression."
      isLoading={isLoading}
      isAssessing={isAssessing}
      error={error}
      onStart={startAssessment}
      onStop={stopAssessment}
      metrics={metrics}
      actions={actions}
    >
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12} md={capturedImage ? 6 : 12}>
          <Box 
            sx={{ 
              width: '100%', 
              aspectRatio: '4/3', 
              bgcolor: 'black', 
              borderRadius: 2, 
              overflow: 'hidden', 
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            data-test-id="video-container"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain', 
                transform: 'scaleX(-1)',
                display: isAssessing ? 'block' : 'none'
              }}
            />
            
            {/* Original canvas for 2D facial landmarks */}
            <canvas
              ref={canvasRef}
              width={videoSize.width}
              height={videoSize.height}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                transform: 'scaleX(-1)', // Mirror to match video
                display: symmetryData ? 'block' : 'none'
              }}
            />          
            
            {/* 3D Face Mesh Overlay */}
            {isAssessing && (
              <Box sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <FaceMeshOverlay
                  landmarks={faceLandmarks}
                  videoWidth={videoSize.width}
                  videoHeight={videoSize.height}
                  visible={isAssessing && !isLoading && !capturedImage}
                />
              </Box>
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <Box 
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.5)'
                }}
              >
                <CircularProgress color="primary" />
                <Typography color="white" sx={{ mt: 2 }}>
                  {captureAttempts > 0 ? 'Analyzing facial symmetry...' : 'Starting camera...'}
                </Typography>
              </Box>
            )}
            
            {/* Instructions when not assessing */}
            {!isAssessing && !isLoading && (
              <Box 
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 3,
                  textAlign: 'center'
                }}
              >
                <Typography color="white">
                  Click 'Start Assessment' to begin. Make sure you are in a well-lit environment with your face clearly visible.
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Instructions during assessment */}
          {isAssessing && !capturedImage && !isLoading && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Look directly at the camera with a neutral expression and click "Capture"
              </Typography>
            </Box>
          )}
        </Grid>

        {capturedImage && (
          <Grid item xs={12} md={6}>
            <Box sx={{ width: '100%', aspectRatio: '4/3', bgcolor: 'black', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
              <img
                src={capturedImage}
                alt="Captured face"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
            
            {/* Display neurological indicators */}
            {neurologicalIndicators && renderNeurologicalIndicators()}
          </Grid>
        )}
      </Grid>
    </AssessmentLayout>
  );
};

FacialSymmetry.propTypes = {
  userId: PropTypes.string.isRequired,
  onComplete: PropTypes.func
};

export default FacialSymmetry;