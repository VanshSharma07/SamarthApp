import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Grid, LinearProgress, Card, CardContent, CircularProgress, Fade, Paper, Chip, Stack, Alert, AlertTitle, ButtonGroup } from '@mui/material';
import { 
  Timeline as TimelineIcon, 
  Waves as WavesIcon, 
  Speed as SpeedIcon, 
  Warning as WarningIcon, 
  CheckCircle, 
  PanTool as PanToolIcon,
  VerifiedUser as VerifiedUserIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import AssessmentLayout from '../common/AssessmentLayout';
import ErrorBoundary from '../common/ErrorBoundary';
import { MLService } from '../../services/mlService';
import AssessmentError from './AssessmentError';
import { specializedAssessments } from '../../services/api';

const Tremor = ({ userId, onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, error: null, success: false });
  const [recordingProgress, setRecordingProgress] = useState(0);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingStartTime = useRef(null);
  const progressIntervalRef = useRef(null);
  
  // Only one standard assessment
  const recordingDuration = 12; // seconds

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const startAssessment = async () => {
    try {
      setError(null);
      setMetrics(null);
      setSaveStatus({ saving: false, error: null, success: false });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsAssessing(true);
    } catch (err) {
      setError('Failed to access camera. Please check camera permissions and try again.');
    }
  };

  const isIOS = () => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document)
    );
  };

  const startRecording = () => {
    try {
      if (!streamRef.current) {
        setError('Camera stream not available. Please restart the assessment.');
        return;
      }

      // iOS Safari does not support MediaRecorder for video
      if (isIOS()) {
        setError(
          'Video recording is not supported on iOS browsers due to Apple limitations. ' +
          'Please use a desktop browser or an Android device with Chrome for this assessment.'
        );
        return;
      }

      // Check MediaRecorder support
      if (typeof window.MediaRecorder === 'undefined') {
        setError('Video recording is not supported on this device/browser.');
        return;
      }

      chunksRef.current = [];
      let options = {};
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      } else {
        setError('This device/browser does not support video recording.');
        return;
      }

      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, options);
      } catch (err) {
        setError('Failed to start recording. This device/browser may not support the required video format.');
        return;
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: options.mimeType || 'video/webm' });
          if (blob.size < 100000) {
            throw new Error('Recorded video is too small and may be corrupted');
          }
          await analyzeVideo(blob);
        } catch (err) {
          setError('Error analyzing video. Please try again.');
          setIsRecording(false);
        }
      };

      mediaRecorder.start(50);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      recordingStartTime.current = Date.now();
      setRecordingProgress(0);

      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTime.current) / 1000;
        const progress = Math.min(100, (elapsed / recordingDuration) * 100);
        setRecordingProgress(progress);

        if (elapsed >= recordingDuration) {
          stopRecording();
        }
      }, 50);
    } catch (err) {
      setError('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const analyzeVideo = async (videoBlob) => {
    try {
      setIsLoading(true);
      // Only standard assessment, no handPosition or attemptCount
      const analysisParams = {
        handPosition: 'standard',
        recordingDuration: recordingDuration
      };
      const results = await MLService.analyzeTremor(videoBlob, analysisParams);

      if (results.success) {
        if (!results.metrics) {
          throw new Error('No metrics received from analysis');
        }
        setMetrics(results.metrics);
      } else {
        throw new Error(results.error || 'Failed to analyze tremor');
      }
    } catch (err) {
      setError('Analysis error. Please ensure your hand is clearly visible in the frame.');
    } finally {
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  const handleSaveAssessment = async () => {
    if (!metrics) return;
    try {
      setSaveStatus({ saving: true, error: null, success: false });

      const assessmentData = {
        userId,
        type: 'tremor',
        timestamp: new Date().toISOString(),
        metrics: metrics,
        metadata: {
          handPosition: 'standard',
          recordingDuration: recordingDuration
        }
      };

      const response = await specializedAssessments.tremor.save(assessmentData);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to save tremor assessment');
      }

      setSaveStatus({ saving: false, error: null, success: true });

      if (onComplete) {
        onComplete({
          ...assessmentData,
          id: response.data.data?._id || response.data.data?.id
        });
      }
      return response.data;
    } catch (error) {
      setSaveStatus({ saving: false, error: error.message, success: false });
      return null;
    }
  };

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

  const stopAssessment = () => {
    if (isRecording) {
      stopRecording();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsAssessing(false);
  };

  // Enhanced metric card component with additional data support
  const TremorMetricCard = ({ title, value, icon, description, severity, additionalInfo }) => {
    const getSeverityColor = (severity) => {
      switch (severity?.toLowerCase()) {
        case 'mild': return 'success';
        case 'moderate': return 'warning';
        case 'severe': return 'error';
        case 'very severe': return 'error';
        case 'none': return 'info';
        default: return 'primary';
      }
    };

    // Enhanced value formatting
    const formattedValue = () => {
      if (typeof value === 'number') {
        // For frequency, show 2 decimal places
        if (title === 'Frequency') {
          return value.toFixed(2) + ' Hz';
        }
        // For amplitude, show as integer with scale
        if (title === 'Amplitude') {
          return Math.round(value) + '/80';
        }
        // For confidence, show as percentage
        if (title === 'Confidence') {
          return (value * 100).toFixed(0) + '%';
        }
        // For regularity and stability, show as percentage
        if (title === 'Regularity' || title === 'Stability') {
          return (value * 100).toFixed(0) + '%';
        }
        return value.toFixed(2);
      }
      return value;
    };

    return (
      <Card elevation={3} sx={{
        height: '100%',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8]
        }
      }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            {icon}
            <Typography variant="h6" color="primary">
              {title}
            </Typography>
          </Stack>
          <Typography variant="h4" align="center" sx={{ my: 2 }}>
            {formattedValue()}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {description}
          </Typography>
          {severity && (
            <Chip 
              label={severity}
              color={getSeverityColor(severity)}
              size="small"
              sx={{ width: '100%', mb: additionalInfo ? 1 : 0 }}
            />
          )}
          {additionalInfo && (
            <Typography variant="caption" color="text.secondary" display="block" mt={1} sx={{ fontSize: '0.7rem' }}>
              {additionalInfo}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <ErrorBoundary 
      fallback={<AssessmentError onRetry={() => window.location.reload()} />}
    >
      <AssessmentLayout
        title="Tremor Assessment"
        description="This assessment will analyze hand tremors and movement patterns. Please hold your hand clearly in front of the camera and remain as still as possible during the recording."
        isLoading={isLoading}
        isAssessing={isAssessing}
        error={error}
        onStart={startAssessment}
        onStop={stopAssessment}
        metrics={metrics}
      >
        <Box sx={{ width: '100%', maxWidth: 640, mx: 'auto' }}>
          {/* Video Display */}
          <Box sx={{ 
            aspectRatio: '4/3', 
            bgcolor: 'black', 
            borderRadius: 2, 
            overflow: 'hidden',
            position: 'relative' 
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            
            {/* Recording Indicator */}
            {isRecording && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 10, 
                  right: 10, 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box 
                  sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    bgcolor: 'error.main',
                    animation: 'pulse 1.5s infinite'
                  }} 
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'white', 
                    bgcolor: 'rgba(0,0,0,0.6)', 
                    px: 1, 
                    py: 0.5, 
                    borderRadius: 1 
                  }}
                >
                  Recording
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Standard Assessment Instructions */}
          {isAssessing && !isRecording && !metrics && (
            <Box sx={{ mt: 2, textAlign: 'center', p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                Tremor Assessment Instructions
              </Typography>
              <Typography variant="body1" gutterBottom fontWeight="medium">
                Please hold your hand clearly in front of the camera and remain as still as possible during the recording.
              </Typography>
              <Paper elevation={1} sx={{ p: 2, borderLeft: '4px solid #2196f3', mt: 2 }}>
                <Typography variant="body2" gutterBottom fontWeight="bold">
                  Important tips:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Keep your hand well-lit and clearly visible
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Maintain position until recording completes ({recordingDuration} seconds)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Your fingertips should be clearly visible to the camera
                </Typography>
              </Paper>
              <Button
                variant="contained"
                color="primary"
                onClick={startRecording}
                size="large"
                sx={{ mt: 3, px: 4, py: 1.5 }}
              >
                Start Recording ({recordingDuration} seconds)
              </Button>
            </Box>
          )}
          
          {/* Recording Progress */}
          {isRecording && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Recording tremor...</span>
                <span>{Math.round(recordingProgress)}%</span>
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={recordingProgress} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          )}
          
          {/* Analysis Results */}
          {metrics && (
            <Fade in>
              <Box sx={{ mt: 3 }}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" color="primary">
                      Tremor Analysis Results
                    </Typography>
                    
                    {metrics.confidence !== undefined && (
                      <Chip 
                        icon={<VerifiedUserIcon />} 
                        label={`${Math.round(metrics.confidence * 100)}% Confidence`}
                        color={metrics.confidence > 0.7 ? 'success' : 
                               metrics.confidence > 0.4 ? 'primary' : 'warning'}
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TremorMetricCard
                        title="Frequency"
                        value={metrics.tremor_frequency || 0}
                        icon={<WavesIcon color="primary" />}
                        description={`${metrics.peak_count || 0} peaks detected`}
                        severity={metrics.tremor_type || 'None'}
                        additionalInfo={
                          metrics.tremor_frequency < 2 ? "Very slow tremors may indicate cerebellar disorders" :
                          metrics.tremor_frequency >= 4 && metrics.tremor_frequency <= 7 ? "4-7 Hz is typical of parkinsonian tremor" :
                          metrics.tremor_frequency > 7 && metrics.tremor_frequency <= 12 ? "7-12 Hz is typical of essential tremor" : null
                        }
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TremorMetricCard
                        title="Amplitude"
                        value={metrics.tremor_amplitude}
                        icon={<TimelineIcon color="primary" />}
                        description="Normalized tremor intensity (0-80)"
                        severity={metrics.severity}
                        additionalInfo={
                          metrics.tremor_amplitude > 40 ? "High amplitude tremors may significantly impact daily activities" : 
                          metrics.tremor_amplitude < 10 ? "Low amplitude tremors may be physiological" : null
                        }
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TremorMetricCard
                        title="Tremor Type"
                        value={metrics.tremor_type}
                        icon={<SpeedIcon color="primary" />}
                        description={`Based on ${metrics.tremor_frequency.toFixed(1)} Hz frequency`}
                        severity={metrics.severity}
                      />
                    </Grid>
                    
                    {/* Additional metrics if available */}
                    {(metrics.regularity !== undefined || metrics.stability !== undefined) && (
                      <>
                        {metrics.regularity !== undefined && (
                          <Grid item xs={12} sm={6}>
                            <TremorMetricCard
                              title="Regularity"
                              value={metrics.regularity}
                              icon={<SyncIcon color="primary" />}
                              description="How consistent the tremor pattern is"
                              additionalInfo="Higher regularity suggests a more rhythmic tremor pattern"
                            />
                          </Grid>
                        )}
                        
                        {metrics.stability !== undefined && (
                          <Grid item xs={12} sm={6}>
                            <TremorMetricCard
                              title="Stability"
                              value={metrics.stability}
                              icon={<SyncIcon color="primary" />}
                              description="How stable the tremor is over time"
                              additionalInfo="Higher stability indicates a more persistent tremor pattern"
                            />
                          </Grid>
                        )}
                      </>
                    )}
                  </Grid>
          
                  {/* Clinical Insight */}
                  {metrics.clinical_insight ? (
                    <Alert 
                      severity="info" 
                      icon={<WarningIcon />}
                      sx={{ mt: 3, borderRadius: 2 }}
                    >
                      <AlertTitle>Clinical Insight</AlertTitle>
                      {metrics.clinical_insight}
                    </Alert>
                  ) : (
                    metrics.tremor_frequency > 4 && (
                      <Alert 
                        severity="info" 
                        icon={<WarningIcon />}
                        sx={{ mt: 3, borderRadius: 2 }}
                      >
                        <AlertTitle>Clinical Insight</AlertTitle>
                        {metrics.tremor_type === 'Resting' ? 
                          'Resting tremor (4-7 Hz) may indicate parkinsonian conditions.' :
                          'Action/Postural tremor (7-12 Hz) may suggest physiological or essential tremor.'}
                      </Alert>
                    )
                  )}

                  {/* Save status display */}
                  {renderSaveStatus()}

                  {/* Action buttons */}
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        setMetrics(null);
                        setIsAssessing(false);
                      }}
                      disabled={saveStatus.saving || saveStatus.success}
                    >
                      New Assessment
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSaveAssessment}
                      startIcon={<CheckCircle />}
                      disabled={saveStatus.saving || saveStatus.success}
                      sx={{
                        minWidth: 200,
                        py: 1.5,
                        borderRadius: 2
                      }}
                    >
                      {saveStatus.saving ? 'Saving...' : 
                       saveStatus.success ? 'Assessment Completed' : 
                       'Complete Assessment'}
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </Fade>
          )}
          
          {/* Error display */}
          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}
        </Box>
      </AssessmentLayout>
    </ErrorBoundary>
  );
};

export default Tremor;