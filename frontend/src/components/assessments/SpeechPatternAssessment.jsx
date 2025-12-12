import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Alert, 
  Button, 
  CircularProgress, 
  Grid, 
  Divider, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  LinearProgress,
  useTheme,
  useMediaQuery,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import MicIcon from '@mui/icons-material/Mic';
import InfoIcon from '@mui/icons-material/Info';
import { MLService } from '../../services/mlService';
import ErrorBoundary from '../common/ErrorBoundary';
import { specializedAssessments } from '../../services/api';
import { 
  WaveformVisualizer, 
  PitchGraph, 
  EmotionTimeline,
  EmotionLegend
} from './SpeechVisualization';

// Floating animation keyframes
const floatingKeyframes = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes slideIn {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .float-animation {
    animation: float 3s ease-in-out infinite;
  }
  .pulse-animation {
    animation: pulse 2s ease-in-out infinite;
  }
  .slide-in {
    animation: slideIn 0.5s ease-out;
  }
`;

// Clinical interpretation helper
const getStatusIcon = (value, threshold = 50) => {
  if (value >= 75) return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />;
  if (value >= threshold) return <WarningIcon sx={{ color: '#ff9800', fontSize: '1.2rem' }} />;
  return <ErrorIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />;
};

const getStatusColor = (value, threshold = 50) => {
  if (value >= 75) return 'success';
  if (value >= threshold) return 'warning';
  return 'error';
};

const getInterpretation = (value, metric) => {
  switch (metric) {
    case 'clarity':
      if (value >= 75) return 'Clear & understandable speech';
      if (value >= 50) return 'Mild clarity issues - may need repetition';
      return 'Significant clarity issues - difficult to understand';
    case 'speechRate':
      if (value >= 120 && value <= 180) return 'Normal speech rate';
      if (value > 180) return 'Speech too rapid - consider slowing down';
      return 'Speech too slow - may indicate processing difficulty';
    case 'confidence':
      if (value >= 75) return 'Confident, steady speech';
      if (value >= 50) return 'Mild hesitation or uncertainty';
      return 'Significant hesitation - may indicate cognitive effort';
    case 'stress':
      if (value >= 75) return 'High stress indicators';
      if (value >= 50) return 'Moderate stress level';
      return 'Low stress - relaxed speech';
    default:
      return '';
  }
};

const MetricDisplay = ({ label, value, suffix = '%', color = 'primary', metric = '' }) => {
  const theme = useTheme();
  const actualValue = Math.min(Math.max(value, 0), 100);
  const interpretation = getInterpretation(actualValue, metric);
  const statusColor = getStatusColor(actualValue);
  
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon(actualValue)}
          <Typography variant="body2" color={statusColor} sx={{ fontWeight: 'bold', minWidth: 50 }}>
            {actualValue.toFixed(1)}{suffix}
          </Typography>
        </Box>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={actualValue} 
        color={statusColor}
        sx={{ 
          height: 10, 
          borderRadius: 4,
          backgroundColor: theme.palette.grey[200],
          '& .MuiLinearProgress-bar': {
            borderRadius: 4
          }
        }}
      />
      {interpretation && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
          {interpretation}
        </Typography>
      )}
    </Box>
  );
};

// Pre-Assessment Guidance Component
const GuidancePanel = ({ onStartAssessment }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const guidanceSteps = [
    {
      title: 'Find a quiet location',
      description: 'Choose a quiet room with minimal background noise for accurate assessment',
      icon: '🔇'
    },
    {
      title: 'Sit comfortably',
      description: 'Sit upright and keep your microphone at comfortable distance (10-15cm)',
      icon: '🪑'
    },
    {
      title: 'Speak clearly',
      description: 'Read phrases naturally and clearly at a comfortable pace',
      icon: '🗣️'
    },
    {
      title: 'Single assessment round',
      description: 'You will read one phrase for about 10 seconds for rapid analysis',
      icon: '⚡'
    }
  ];

  return (
    <Card sx={{ mb: 3, backgroundColor: theme.palette.info.light + '20', border: `2px solid ${theme.palette.info.main}` }}>
      <CardContent sx={{ p: isMobile ? 2 : 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoIcon sx={{ color: theme.palette.info.main }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            How to Prepare for Assessment
          </Typography>
        </Box>
        
        <Grid container spacing={2}>
          {guidanceSteps.map((step, index) => (
            <Grid item xs={12} sm={6} key={index} className="slide-in" sx={{ animationDelay: `${index * 0.1}s` }}>
              <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'white' }}>
                <Box sx={{ fontSize: isMobile ? '2rem' : '2.5rem', mb: 1, display: 'inline-block', animation: 'float 3s ease-in-out infinite' }}>
                  {step.icon}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {step.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.warning.light + '20', borderRadius: 1, borderLeft: `4px solid ${theme.palette.warning.main}` }}>
          <Typography variant="body2" color="textSecondary">
            ⚠️ <strong>Important:</strong> Ensure your device microphone is working properly before starting the assessment.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3, py: 1.5, fontSize: '1rem', fontWeight: 'bold' }}
          onClick={onStartAssessment}
        >
          <MicIcon sx={{ mr: 1 }} />
          Start Assessment
        </Button>
      </CardContent>
    </Card>
  );
};

const SpeechPatternAssessment = ({ userId, onComplete }) => {
  // Theme and responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Assessment phases
  const PHASE = {
    GUIDANCE: 'guidance',
    ASSESSING: 'assessing',
    ANALYZING: 'analyzing',
    RESULTS: 'results',
    COMPLETED: 'completed'
  };

  // State management
  const [currentPhase, setCurrentPhase] = useState(PHASE.GUIDANCE);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const [sampleCount, setSampleCount] = useState(1); // Single sample for demo
  const MAX_SAMPLES = 1; // Only one sample in this demo
  const [allMetrics, setAllMetrics] = useState([]); // Store all metrics from all samples
  const [visualizationData, setVisualizationData] = useState({
    waveform: null,
    pitch: null,
    emotion: null
  });

  // Refs
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // Test phrases with instructions
  const testPhrases = [
    {
      text: "Today is a sunny day outside",
      instruction: "Read this sentence naturally",
      difficulty: "Neutral sentence"
    }
  ];

// Add after state declarations and before useEffect
const processWaveformData = (rawData, points) => {
  const blockSize = Math.floor(rawData.length / points);
  const filteredData = [];
  
  for (let i = 0; i < points; i++) {
    const blockStart = blockSize * i;
    const block = rawData.slice(blockStart, blockStart + blockSize);
    // Calculate RMS value for this block
    const rms = Math.sqrt(block.reduce((sum, x) => sum + x * x, 0) / block.length);
    filteredData.push(rms);
  }
  
  // Normalize the data
  const maxValue = Math.max(...filteredData);
  return filteredData.map(x => x / (maxValue || 1));
};

const convertToWav = async (audioBuffer) => {
  const numOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChannels * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // Write WAV header
  writeUTFBytes(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeUTFBytes(view, 8, 'WAVE');
  writeUTFBytes(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, audioBuffer.sampleRate, true);
  view.setUint32(28, audioBuffer.sampleRate * 2, true);
  view.setUint16(32, numOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeUTFBytes(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  const channelData = audioBuffer.getChannelData(0);
  floatTo16BitPCM(view, 44, channelData);

  return new Blob([buffer], { type: 'audio/wav' });
};

const writeUTFBytes = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (view, offset, input) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

  useEffect(() => {
    // Check browser support
    if (!navigator.mediaDevices?.getUserMedia) {
      setBrowserSupported(false);
      setError('Your browser does not support audio recording');
    }

    return () => {
      // Cleanup
      stopRecording();
    };
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startAssessment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Disable auto gain for better accuracy
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      const audioChunks = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setIsAnalyzing(true);
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Convert audio to wav format before sending
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioData = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(audioData);
          
          // Create visualization data from audioBuffer
          const rawData = audioBuffer.getChannelData(0);
          const dataPoints = isMobile ? 50 : 100;
          const waveformData = processWaveformData(rawData, dataPoints);
          
          // Create WAV file
          const wavBlob = await convertToWav(audioBuffer);
          const results = await MLService.analyzeSpeechPattern(wavBlob);
          
          if (results.success) {
            const newMetrics = {
              ...results.metrics,
              timeSeries: {
                waveform: waveformData,
                pitch: results.metrics.timeSeries?.pitch || [],
                timestamps: Array.from(
                  { length: waveformData.length }, 
                  (_, i) => i * (audioBuffer.duration / waveformData.length)
                ),
                confidence: results.metrics.timeSeries?.confidence || [],
                stress: results.metrics.timeSeries?.stress || [],
                hesitation: results.metrics.timeSeries?.hesitation || []
              }
            };
            // Single-sample flow: store metrics and move to results
            const updatedAllMetrics = [newMetrics];
            setAllMetrics(updatedAllMetrics);
            setMetrics(newMetrics);
            setCanComplete(true);
            setRetryCount(0);
            setIsAssessing(false); // Reset assessing state
            setCurrentPhase(PHASE.RESULTS);
            setIsAnalyzing(false);
          } else {
            throw new Error(results.error || 'Analysis failed');
          }
        } catch (err) {
          handleError(err);
        }
      };

      mediaRecorder.start(100);
      setIsAssessing(true);
      setCurrentPhase(PHASE.ASSESSING);

      // Set timer
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Average metrics from multiple samples for improved accuracy
  const averageMetrics = (metricsArray) => {
    if (metricsArray.length === 0) return metricsArray[0];

    const avgMetrics = {
      clarity: metricsArray.reduce((sum, m) => sum + (m.clarity || 0), 0) / metricsArray.length,
      speech_rate: metricsArray.reduce((sum, m) => sum + (m.speech_rate || 0), 0) / metricsArray.length,
      volume_control: metricsArray.reduce((sum, m) => sum + (m.volume_control || 0), 0) / metricsArray.length,
      pitch_stability: metricsArray.reduce((sum, m) => sum + (m.pitch_stability || 0), 0) / metricsArray.length,
      emotion: {
        confidence: metricsArray.reduce((sum, m) => sum + (m.emotion?.confidence || 0), 0) / metricsArray.length,
        hesitation: metricsArray.reduce((sum, m) => sum + (m.emotion?.hesitation || 0), 0) / metricsArray.length,
        stress: metricsArray.reduce((sum, m) => sum + (m.emotion?.stress || 0), 0) / metricsArray.length,
        monotony: metricsArray.reduce((sum, m) => sum + (m.emotion?.monotony || 0), 0) / metricsArray.length
      },
      articulation: {
        precision: metricsArray.reduce((sum, m) => sum + (m.articulation?.precision || 0), 0) / metricsArray.length,
        vowel_formation: metricsArray.reduce((sum, m) => sum + (m.articulation?.vowel_formation || 0), 0) / metricsArray.length,
        consonant_precision: metricsArray.reduce((sum, m) => sum + (m.articulation?.consonant_precision || 0), 0) / metricsArray.length,
        slurred_speech: metricsArray.reduce((sum, m) => sum + (m.articulation?.slurred_speech || 0), 0) / metricsArray.length
      },
      fluency: {
        fluency_score: metricsArray.reduce((sum, m) => sum + (m.fluency?.fluency_score || 0), 0) / metricsArray.length,
        words_per_minute: metricsArray.reduce((sum, m) => sum + (m.fluency?.words_per_minute || 0), 0) / metricsArray.length,
        pause_rate: metricsArray.reduce((sum, m) => sum + (m.fluency?.pause_rate || 0), 0) / metricsArray.length
      },
      timeSeries: metricsArray[metricsArray.length - 1].timeSeries // Use last sample for visualization
    };

    return avgMetrics;
  };

  // Fallback data generator for visualizations
  const generateFallbackData = (length, type) => {
    switch (type) {
      case 'pitch':
        // Generate a reasonable pitch curve (80-250 Hz range)
        const pitch = [];
        let value = 150 + Math.random() * 50;
        
        for (let i = 0; i < length; i++) {
          value += (Math.random() - 0.5) * 20;
          value = Math.max(80, Math.min(250, value));
          pitch.push(value);
        }
        return pitch;
        
      case 'confidence':
        // Higher values (0.6-1.0)
        return Array.from({ length }, () => 0.6 + Math.random() * 0.4);
        
      case 'stress':
        // Medium values (0.2-0.6)
        return Array.from({ length }, () => 0.2 + Math.random() * 0.4);
        
      case 'hesitation':
        // Lower values (0.1-0.5)
        return Array.from({ length }, () => 0.1 + Math.random() * 0.4);
        
      default:
        return Array.from({ length }, () => Math.random());
    }
  };

  const handleCompleteAssessment = async () => {
    try {
      setIsLoading(true);
      
      if (!metrics) {
        throw new Error('No metrics available');
      }

      // Format metrics to match the expected schema structure
      const formattedMetrics = {
        clarity: { 
          score: metrics.clarity * 100 
        },
        speechRate: {
          wordsPerMinute: metrics.speech_rate || 0
        },
        volumeControl: {
          score: metrics.volume_control * 100
        },
        emotion: {
          confidence: metrics.emotion?.confidence || 0,
          hesitation: metrics.emotion?.hesitation || 0,
          stress: metrics.emotion?.stress || 0,
          monotony: metrics.emotion?.monotony || 0
        },
        articulation: {
          precision: metrics.articulation?.precision || 0,
          vowel_formation: metrics.articulation?.vowel_formation || 0,
          consonant_precision: metrics.articulation?.consonant_precision || 0,
          slurred_speech: metrics.articulation?.slurred_speech || 0
        },
        fluency: {
          fluency_score: metrics.fluency?.fluency_score || 0,
          words_per_minute: metrics.speech_rate || 0,
          pause_rate: metrics.fluency?.pause_rate || 0
        },
        pitch_stability: metrics.pitch_stability || 0,
        overallScore: ((metrics.clarity * 100) + 
                      (metrics.volume_control * 100) + 
                      ((1 - metrics.emotion?.hesitation || 0) * 100)) / 3,
        samplesCollected: sampleCount, // Track how many samples were averaged
        assessmentConfidence: (sampleCount / MAX_SAMPLES) * 100 // Confidence based on samples
      };

      // Prepare assessment data
      const assessmentData = {
        userId,
        timestamp: new Date(),
        metrics: formattedMetrics,
        type: 'speechPattern',
        status: 'COMPLETED'
      };

      // Use the specializedAssessments API instead of direct fetch
      const response = await specializedAssessments.speechPattern.save(assessmentData);

      if (response.data.success) {
        setAssessmentComplete(true);
        setCurrentPhase(PHASE.COMPLETED);
        if (onComplete) {
          onComplete(assessmentData);
        }
      } else {
        throw new Error(response.data.error || 'Failed to save assessment');
      }

    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error) => {
    console.error('Speech assessment error:', error);
    setIsAssessing(false);
    setIsAnalyzing(false);
    setIsLoading(false);
    setTimeRemaining(10); // Reset timer
    
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setError(`Analysis failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      startAssessment();
    } else {
      setError(error.message || 'An error occurred during the assessment');
      setIsAssessing(false);
      stopRecording();
    }
  };

  if (!browserSupported) {
    return (
      <Alert severity="error">
        Your browser does not support speech recording. Please use Chrome, Edge, or Safari.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <style>{floatingKeyframes}</style>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2, animation: 'slideIn 0.5s ease-out' }}>
          {error}
        </Alert>
      )}

      {/* Progress Indicator */}
      <Card sx={{ mb: 3, backgroundColor: theme.palette.primary.light + '10' }}>
        <CardContent sx={{ py: 2, px: isMobile ? 2 : 3 }}>
          <Stepper activeStep={sampleCount - 1} sx={{ mb: 1 }}>
            {[0, 1, 2].map((i) => (
              <Step key={i} completed={i < sampleCount}>
                <StepLabel>Sample {i + 1}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Typography variant="caption" color="textSecondary">
            Assessment progresses: {sampleCount}/{MAX_SAMPLES} samples collected
          </Typography>
        </CardContent>
      </Card>

      {/* Guidance Phase */}
      {currentPhase === PHASE.GUIDANCE && (
        <>
          <GuidancePanel onStartAssessment={startAssessment} />
          
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{ backgroundColor: theme.palette.primary.light + '20', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Sample {sampleCount} of {MAX_SAMPLES}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: theme.palette.primary.main, mb: 1 }}>
                  {testPhrases[currentPhrase].text}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  📋 {testPhrases[currentPhrase].instruction}
                </Typography>
                <Chip 
                  label={testPhrases[currentPhrase].difficulty}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Button 
                variant="contained" 
                color="primary"
                onClick={startAssessment}
                disabled={isLoading}
                fullWidth={isMobile}
                sx={{ mt: 2, py: 1.2, fontSize: '1rem', fontWeight: 'bold' }}
              >
                <MicIcon sx={{ mr: 1 }} />
                {isLoading ? 'Preparing Microphone...' : `Start Recording - Sample ${sampleCount}`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Recording Phase */}
      {currentPhase === PHASE.ASSESSING && (
        <Card sx={{ mb: 2, backgroundColor: theme.palette.error.light + '10', border: `2px solid ${theme.palette.error.main}` }}>
          <CardContent sx={{ p: isMobile ? 2 : 3, textAlign: 'center' }}>
            <Box className="pulse-animation" sx={{ mb: 2 }}>
              <MicIcon sx={{ fontSize: '4rem', color: theme.palette.error.main }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Recording in progress...
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2
            }}>
              <CircularProgress 
                variant="determinate" 
                value={(1 - timeRemaining/10) * 100} 
                size={isMobile ? 60 : 80}
              />
              <Box>
                <Typography variant={isMobile ? "h5" : "h4"} color="error" sx={{ fontWeight: 'bold' }}>
                  {timeRemaining}s
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  remaining
                </Typography>
              </Box>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
              Please read the phrase clearly and naturally
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Analyzing Phase */}
      {currentPhase === PHASE.ANALYZING && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexDirection: 'column',
            p: isMobile ? 2 : 3
          }}>
            <CircularProgress size={isMobile ? 40 : 60} sx={{ mb: 2 }} />
            <Typography variant={isMobile ? "body1" : "h6"} sx={{ fontWeight: 'bold', mb: 1 }}>
              Analyzing speech patterns...
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Processing acoustic features & generating insights
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Results Phase */}
      {currentPhase === PHASE.RESULTS && metrics && (
        <Card>
          <CardContent sx={{ p: isMobile ? 2 : 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              📊 Assessment Results
            </Typography>
            
            {/* Assessment Confidence */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: theme.palette.success.light + '20', border: `1px solid ${theme.palette.success.main}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Assessment Confidence
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Based on {sampleCount} voice samples
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                    {((sampleCount / MAX_SAMPLES) * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Accurate
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(sampleCount / MAX_SAMPLES) * 100}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
                color="success"
              />
            </Paper>

            {/* Key Findings */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  📌 Key Findings
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Speech Clarity" 
                      value={metrics.clarity * 100}
                      metric="clarity"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Speech Rate (WPM)" 
                      value={metrics.speech_rate}
                      suffix=" wpm"
                      metric="speechRate"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Volume Control" 
                      value={metrics.volume_control * 100}
                      metric="volumeControl"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Pitch Stability" 
                      value={metrics.pitch_stability * 100}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Articulation Details */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  🗣️ Articulation Quality
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Sound Precision" 
                      value={metrics.articulation?.precision * 100 || 0} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Vowel Formation" 
                      value={metrics.articulation?.vowel_formation * 100 || 0} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Consonant Clarity" 
                      value={metrics.articulation?.consonant_precision * 100 || 0} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Speech Fluidity" 
                      value={(1 - (metrics.articulation?.slurred_speech || 0)) * 100} 
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Emotional Indicators */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  😊 Emotional & Cognitive Indicators
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Confidence Level" 
                      value={metrics.emotion.confidence * 100}
                      metric="confidence"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Hesitation Index" 
                      value={metrics.emotion.hesitation * 100}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Stress Level" 
                      value={metrics.emotion.stress * 100}
                      metric="stress"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Speech Monotony" 
                      value={metrics.emotion.monotony * 100}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Fluency Analysis */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  ⏱️ Fluency Analysis
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Fluency Score" 
                      value={metrics.fluency.fluency_score * 100} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MetricDisplay 
                      label="Pause Rate" 
                      value={metrics.fluency.pause_rate * 100}
                      suffix=" /sec"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, backgroundColor: theme.palette.grey[100], borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Speaking Pace: {metrics.speech_rate?.toFixed(1) || 0} words/minute
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Normal range: 120-160 WPM. Faster may indicate anxiety, slower may indicate processing difficulty.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Visualizations */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  📈 Voice Pattern Visualizations
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={isMobile ? 2 : 3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Waveform
                    </Typography>
                    <WaveformVisualizer 
                      audioData={metrics.timeSeries?.waveform || []} 
                      height={isMobile ? 80 : 100} 
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Pitch Contour
                    </Typography>
                    <PitchGraph
                      data={metrics.timeSeries?.pitch || []}
                      labels={metrics.timeSeries?.timestamps || []}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Emotional Trends Over Time
                    </Typography>
                    {isMobile && <EmotionLegend />}
                    <EmotionTimeline
                      emotionData={{
                        timestamps: metrics.timeSeries?.timestamps || [],
                        confidence: metrics.timeSeries?.confidence || [],
                        stress: metrics.timeSeries?.stress || [],
                        hesitation: metrics.timeSeries?.hesitation || []
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {canComplete && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                {sampleCount < MAX_SAMPLES && (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setCurrentPhase(PHASE.GUIDANCE);
                      setTimeRemaining(10);
                      setIsAssessing(false);
                    }}
                    fullWidth={isMobile}
                  >
                    Collect Another Sample
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleCompleteAssessment}
                  disabled={isLoading}
                  fullWidth={isMobile}
                  size={isMobile ? "large" : "medium"}
                  sx={{ fontWeight: 'bold' }}
                >
                  {isLoading ? 'Saving...' : 'Save & Complete Assessment'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Phase */}
      {currentPhase === PHASE.COMPLETED && (
        <Alert severity="success" sx={{ mt: 2, animation: 'slideIn 0.5s ease-out' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            ✅ Assessment Successfully Completed!
          </Typography>
          <Typography variant="body2">
            The assessment has been saved and analyzed using {sampleCount} voice samples. Results are now available in the patient's profile.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
  export default SpeechPatternAssessment;