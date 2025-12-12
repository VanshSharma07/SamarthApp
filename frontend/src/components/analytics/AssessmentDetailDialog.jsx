import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Tab,
  Tabs,
  Paper,
  Chip,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useState, useEffect } from 'react';
import LineChart from '../charts/LineChart';
import RadarChart from '../charts/RadarChart';
import BarChart from '../charts/BarChart';
import HybridGaitInsights from '../gait/HybridGaitInsights';

const AssessmentDetailDialog = ({ open, onClose, assessment }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const [validatedAssessment, setValidatedAssessment] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (!assessment) {
      return;
    }

    const normalized = JSON.parse(JSON.stringify(assessment));
    normalized.metrics = normalized.metrics || {};

    switch (normalized.type) {
      case 'tremor':
        // Tremor normalization...
        break;
        
      case 'speechPattern':
        normalized.metrics = {
          clarity: normalized.metrics.clarity || { score: 0 },
          speechRate: normalized.metrics.speechRate || { wordsPerMinute: 0 },
          volumeControl: normalized.metrics.volumeControl || { score: 0 },
          emotion: normalized.metrics.emotion || {
            confidence: 0,
            hesitation: 0,
            stress: 0,
            monotony: 0
          },
          overallScore: normalized.metrics.overallScore || 0
        };
        
        // Convert flat structure to nested if needed
        if (typeof normalized.metrics.clarity === 'number') {
          normalized.metrics.clarity = { score: normalized.metrics.clarity };
        }
        
        // Ensure numeric values in the structure
        if (normalized.metrics.clarity?.score) {
          normalized.metrics.clarity.score = parseFloat(normalized.metrics.clarity.score) || 0;
        }
        
        if (normalized.metrics.speechRate?.wordsPerMinute) {
          normalized.metrics.speechRate.wordsPerMinute = 
            parseFloat(normalized.metrics.speechRate.wordsPerMinute) || 0;
        }
        
        if (normalized.metrics.volumeControl?.score) {
          normalized.metrics.volumeControl.score = 
            parseFloat(normalized.metrics.volumeControl.score) || 0;
        }
        
        if (normalized.metrics.overallScore) {
          normalized.metrics.overallScore = parseFloat(normalized.metrics.overallScore) || 0;
        }
        
        // Ensure emotion metrics are numeric
        if (normalized.metrics.emotion) {
          normalized.metrics.emotion.confidence = parseFloat(normalized.metrics.emotion.confidence) || 0;
          normalized.metrics.emotion.hesitation = parseFloat(normalized.metrics.emotion.hesitation) || 0;
          normalized.metrics.emotion.stress = parseFloat(normalized.metrics.emotion.stress) || 0;
          normalized.metrics.emotion.monotony = parseFloat(normalized.metrics.emotion.monotony) || 0;
        }
        break;
      
      // Other cases...
    }

    console.log('Original assessment:', assessment);
    console.log('Normalized assessment:', normalized);

    setValidatedAssessment(normalized);
  }, [assessment]);

  if (!validatedAssessment) return null;

  const formattedDate = new Date(validatedAssessment.timestamp).toLocaleString();

  const getAssessmentName = () => {
    const typeMap = {
      'tremor': 'Tremor Assessment',
      'speechPattern': 'Speech Pattern Assessment',
      'responseTime': 'Response Time Assessment',
      'neckMobility': 'Neck Mobility Assessment',
      'gaitAnalysis': 'Gait Analysis Assessment',
      'fingerTapping': 'Finger Tapping Assessment',
      'facialSymmetry': 'Facial Symmetry Assessment',
      'eyeMovement': 'Eye Movement Assessment',
      'wordlist': 'Word List Memory Test',
      'word_list': 'Word List Memory Test',
      'stroop': 'Stroop Test',
      // 'neuro': 'Neuro (EEG/ECG) Assessment',
      'hyperventilation': 'Hyperventilation Response Test'
    };
    
    return typeMap[validatedAssessment.type] || validatedAssessment.type;
  };

  const renderMetrics = () => {
    console.log('Rendering metrics for type:', validatedAssessment.type);
    console.log('Using metrics:', validatedAssessment.metrics);

    switch (validatedAssessment.type) {
      case 'tremor':
        return renderTremorMetrics();
      case 'speechPattern':
        return renderSpeechMetrics();
      case 'responseTime':
        return renderResponseTimeMetrics();
      case 'neckMobility':
        return renderNeckMobilityMetrics();
      case 'gaitAnalysis':
        return renderGaitAnalysisMetrics();
      case 'fingerTapping':
        return renderFingerTappingMetrics();
      case 'facialSymmetry':
        return renderFacialSymmetryMetrics();
      case 'eyeMovement':
        return renderEyeMovementMetrics();
      case 'wordlist':
      case 'word_list':
        return renderWordListMetrics();
      case 'stroop':
        return renderStroopMetrics();
      // case 'neuro':
      //   return renderNeuroMetrics();
      case 'hyperventilation':
        return renderHyperventilationMetrics();
      default:
        return (
          <Typography color="text.secondary">
            No metrics available for this assessment type.
          </Typography>
        );
    }
  };

  const renderCharts = () => {
    switch (validatedAssessment.type) {
      case 'tremor':
        return renderTremorCharts();
      case 'speechPattern':
        return renderSpeechCharts();
      case 'responseTime':
        return renderResponseTimeCharts();
      case 'fingerTapping':
        return renderFingerTappingCharts();
      default:
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No charts available for this assessment type.
            </Typography>
          </Box>
        );
    }
  };

  const renderTremorMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Tremor Frequency</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.tremor_frequency?.toFixed(2)} Hz
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Tremor Amplitude</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.tremor_amplitude}</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Tremor Type</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.tremor_type}</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Severity</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.severity}</Typography>
      </Grid>
      {validatedAssessment.metrics.overall && (
        <>
          <Grid item xs={6}>
            <Typography variant="subtitle2">Tremor Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.overall.tremorScore}/1000</Typography>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderSpeechMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Clarity</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.clarity?.score}/100</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Words Per Minute</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.speechRate?.wordsPerMinute}</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Volume Control</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.volumeControl?.score}/100</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Overall Score</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.overallScore}/100</Typography>
      </Grid>
      {validatedAssessment.metrics.emotion && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Emotion Metrics</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Confidence</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.emotion.confidence}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Hesitation</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.emotion.hesitation}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Stress</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.emotion.stress}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Monotony</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.emotion.monotony}/100</Typography>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderResponseTimeMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Average Response Time</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.averageResponseTime}</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Fastest Response</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.fastestResponse}</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Slowest Response</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.slowestResponse}</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Completion</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.completedRounds}/{validatedAssessment.metrics.totalRounds}</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Duration</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.duration}</Typography>
      </Grid>
      {validatedAssessment.metrics.overall && (
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Response Score</Typography>
          <Typography variant="h6">{validatedAssessment.metrics.overall.responseScore}/100</Typography>
        </Grid>
      )}
    </Grid>
  );

  const renderNeckMobilityMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Flexion (Degrees)</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.flexion?.degrees}°</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Extension (Degrees)</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.extension?.degrees}°</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Left Rotation</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.rotation?.left?.degrees}°</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Right Rotation</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.rotation?.right?.degrees}°</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Left Lateral Bending</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.lateralBending?.left?.degrees}°</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Right Lateral Bending</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.lateralBending?.right?.degrees}°</Typography>
      </Grid>
      {validatedAssessment.metrics.overall && (
        <>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Mobility Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.overall.mobilityScore}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Symmetry Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.overall.symmetryScore}/100</Typography>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderGaitAnalysisMetrics = () => {
    // If hybrid metrics are available, show the full insights UI instead of basic metrics
    if (validatedAssessment.metrics?.hybrid || validatedAssessment.metrics?.abnormalities) {
      return (
        <Box sx={{ width: '100%' }}>
          {/* Show HybridGaitInsights if available */}
          {validatedAssessment.metrics && (
            <HybridGaitInsights 
              hybridMetrics={validatedAssessment.metrics}
              cvMetrics={validatedAssessment.metrics}
              sensorMetrics={validatedAssessment.metrics?.sensorMetrics}
            />
          )}
        </Box>
      );
    }
    
    // Default: Show basic CV metrics
    return (
      <Grid container spacing={2}>
        <Grid item xs={6} md={4}>
          <Typography variant="subtitle2">Stability Score</Typography>
          <Typography variant="h6">{validatedAssessment.metrics.stability?.score}/1000</Typography>
        </Grid>
        <Grid item xs={6} md={4}>
          <Typography variant="subtitle2">Balance Score</Typography>
          <Typography variant="h6">{validatedAssessment.metrics.balance?.score}/1000</Typography>
        </Grid>
        <Grid item xs={6} md={4}>
          <Typography variant="subtitle2">Overall Symmetry</Typography>
          <Typography variant="h6">{validatedAssessment.metrics.symmetry?.overall}/1000</Typography>
        </Grid>
        <Grid item xs={6} md={4}>
          <Typography variant="subtitle2">Walking Speed</Typography>
          <Typography variant="h6">{validatedAssessment.metrics.gait?.speed} m/s</Typography>
        </Grid>
        <Grid item xs={6} md={4}>
          <Typography variant="subtitle2">Stride Length</Typography>
          <Typography variant="h6">{validatedAssessment.metrics.gait?.strideLength} m</Typography>
        </Grid>
        <Grid item xs={6} md={4}>
          <Typography variant="subtitle2">Cadence</Typography>
          <Typography variant="h6">{validatedAssessment.metrics.gait?.cadence} steps/min</Typography>
        </Grid>
        {validatedAssessment.metrics.overall && (
          <>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Overall Scores</Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle2">Mobility Score</Typography>
              <Typography variant="h6">{validatedAssessment.metrics.overall.mobilityScore}/100</Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle2">Stability Score</Typography>
              <Typography variant="h6">{validatedAssessment.metrics.overall.stabilityScore}/1000</Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle2">Symmetry Score</Typography>
              <Typography variant="h6">{validatedAssessment.metrics.overall.symmetryScore}/1000</Typography>
            </Grid>
          </>
        )}
      </Grid>
    );
  };

  const renderFingerTappingMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Frequency</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.frequency}/100</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Amplitude</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.amplitude}/100</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Rhythm</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.rhythm}/100</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Accuracy</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.accuracy}/100</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Duration</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.duration} s</Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Overall Score</Typography>
        <Typography variant="h6">{validatedAssessment.metrics.overallScore}/100</Typography>
      </Grid>
    </Grid>
  );

  const renderFacialSymmetryMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2">Overall Symmetry Score</Typography>
        <Typography variant="h6">{validatedAssessment.symmetry_score}/1000</Typography>
      </Grid>
      
      {validatedAssessment.metrics && (
        <>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Eye Symmetry</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.eye_symmetry}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Mouth Symmetry</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.mouth_symmetry}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Jaw Symmetry</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.jaw_symmetry}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Eyebrow Symmetry</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.eyebrow_symmetry}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Face Tilt</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.face_tilt}°</Typography>
          </Grid>
        </>
      )}
      
      {validatedAssessment.neurological_indicators && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Neurological Indicators</Typography>
          </Grid>
          {validatedAssessment.neurological_indicators.bells_palsy && (
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle2">Bell's Palsy Risk</Typography>
              <Typography variant="h6" color={
                validatedAssessment.neurological_indicators.bells_palsy.risk === 'high' 
                  ? 'error.main' 
                  : validatedAssessment.neurological_indicators.bells_palsy.risk === 'moderate'
                    ? 'warning.main'
                    : 'success.main'
              }>
                {validatedAssessment.neurological_indicators.bells_palsy.risk.charAt(0).toUpperCase() + 
                  validatedAssessment.neurological_indicators.bells_palsy.risk.slice(1)}
              </Typography>
            </Grid>
          )}
          
          {validatedAssessment.neurological_indicators.stroke && (
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle2">Stroke Risk</Typography>
              <Typography variant="h6" color={
                validatedAssessment.neurological_indicators.stroke.risk === 'high' 
                  ? 'error.main' 
                  : validatedAssessment.neurological_indicators.stroke.risk === 'moderate'
                    ? 'warning.main'
                    : 'success.main'
              }>
                {validatedAssessment.neurological_indicators.stroke.risk.charAt(0).toUpperCase() + 
                  validatedAssessment.neurological_indicators.stroke.risk.slice(1)}
              </Typography>
            </Grid>
          )}
          
          {validatedAssessment.neurological_indicators.parkinsons && (
            <Grid item xs={6} md={4}>
              <Typography variant="subtitle2">Parkinson's Risk</Typography>
              <Typography variant="h6" color={
                validatedAssessment.neurological_indicators.parkinsons.risk === 'high' 
                  ? 'error.main' 
                  : validatedAssessment.neurological_indicators.parkinsons.risk === 'moderate'
                    ? 'warning.main'
                    : 'success.main'
              }>
                {validatedAssessment.neurological_indicators.parkinsons.risk.charAt(0).toUpperCase() + 
                  validatedAssessment.neurological_indicators.parkinsons.risk.slice(1)}
              </Typography>
            </Grid>
          )}
        </>
      )}
    </Grid>
  );

  const renderEyeMovementMetrics = () => (
    <Grid container spacing={2}>
      {validatedAssessment.metrics.overall && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Overall Scores</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Velocity Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.overall.velocityScore}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Accuracy Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.overall.accuracyScore}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Smoothness Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.overall.smoothnessScore}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Composite Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.overall.compositeScore}/100</Typography>
          </Grid>
        </>
      )}
      
      {validatedAssessment.metrics.PURSUIT_TEST && validatedAssessment.metrics.PURSUIT_TEST.summary && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Pursuit Test Metrics</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Mean Velocity</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.PURSUIT_TEST.summary.mean_velocity} deg/s</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Peak Velocity</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.PURSUIT_TEST.summary.peak_velocity} deg/s</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Movement Smoothness</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.PURSUIT_TEST.summary.movement_smoothness}/100</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Symmetry Score</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.PURSUIT_TEST.summary.symmetry_score}/100</Typography>
          </Grid>
        </>
      )}
      
      {validatedAssessment.metrics.SACCADIC_TEST && validatedAssessment.metrics.SACCADIC_TEST.summary && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Saccadic Test Metrics</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Saccade Count</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.SACCADIC_TEST.summary.saccade_count}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Fixation Count</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.SACCADIC_TEST.summary.fixation_count}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Mean Velocity</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.SACCADIC_TEST.summary.mean_velocity} deg/s</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2">Accuracy</Typography>
            <Typography variant="h6">{validatedAssessment.metrics.SACCADIC_TEST.summary.accuracy}/100</Typography>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderWordListMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Immediate Recall %</Typography>
        <Typography variant="h6">
          {Number(validatedAssessment.metrics.immediate_percent || 0).toFixed(1)}%
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Immediate Total Correct</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.immediate_total_correct || 0}
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Delayed Recall</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.delayed_correct || 0}
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Retention %</Typography>
        <Typography variant="h6">
          {Number(validatedAssessment.metrics.retention_percent || 0).toFixed(1)}%
        </Typography>
      </Grid>
      {validatedAssessment.metrics.per_trial_correct && 
       Array.isArray(validatedAssessment.metrics.per_trial_correct) && (
        <Grid item xs={12}>
          <Typography variant="subtitle2">Per Trial Correct</Typography>
          <Typography variant="body1">
            {validatedAssessment.metrics.per_trial_correct.join(', ')}
          </Typography>
        </Grid>
      )}
    </Grid>
  );

  const renderStroopMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Accuracy</Typography>
        <Typography variant="h6">
          {Number((validatedAssessment.metrics.accuracy || 0) * 100).toFixed(1)}%
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Score</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.score || 0}/{validatedAssessment.metrics.total || 0}
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Reaction Time</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.reactionTime || 'N/A'}
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Test Status</Typography>
        <Typography variant="h6">
          {validatedAssessment.status || 'COMPLETED'}
        </Typography>
      </Grid>
      {validatedAssessment.metrics.history && 
       Array.isArray(validatedAssessment.metrics.history) && 
       validatedAssessment.metrics.history.length > 0 && (
        <>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Test History</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {validatedAssessment.metrics.history.map((trial, idx) => (
                <Box key={idx} sx={{ mb: 1, p: 1, backgroundColor: trial.correct ? 'success.light' : 'error.light', borderRadius: 1 }}>
                  <Typography variant="body2">
                    Trial {idx + 1}: {trial.word} ({trial.ink}) → Selected: {trial.selected} 
                    {trial.correct ? ' ✓' : ' ✗'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderNeuroMetrics = () => (
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Seizure Risk</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.seizure_risk || 'Low'}
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">EEG Abnormality</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.eeg_abnormality || 'Normal'}
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Seizure Duration</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.seizure_duration || 0}s
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <Typography variant="subtitle2">Seizure Activity</Typography>
        <Typography variant="h6">
          {validatedAssessment.metrics.seizure_activity || 'None'}
        </Typography>
      </Grid>
    </Grid>
  );

  const renderHyperventilationMetrics = () => {
    const riskLevel = validatedAssessment.metrics.riskLevel || 'Unknown';
    const baselineSpikes = Number(validatedAssessment.metrics.baselineSpikes) || 0;
    const hvSpikes = Number(validatedAssessment.metrics.hyperventilationSpikes) || 0;
    const recoverySpikes = Number(validatedAssessment.metrics.recoverySpikes) || 0;
    const alphaSuppression = validatedAssessment.metrics.alphaSuppression || 0;
    const deltaIncrease = validatedAssessment.metrics.deltaIncrease || 0;

    return (
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Risk Level</Typography>
          <Chip
            label={riskLevel.toUpperCase()}
            color={riskLevel === 'high' ? 'error' : riskLevel === 'moderate' ? 'warning' : 'success'}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Screening Flag</Typography>
          <Typography variant="h6">
            {validatedAssessment.metrics.screeningFlag || 'N/A'}
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Baseline Spikes</Typography>
          <Typography variant="h6">
            {baselineSpikes}
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">HV Spikes</Typography>
          <Typography variant="h6">
            {hvSpikes}
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Recovery Spikes</Typography>
          <Typography variant="h6">
            {recoverySpikes}
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Alpha Suppression</Typography>
          <Typography variant="h6">
            {alphaSuppression}%
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Delta Increase</Typography>
          <Typography variant="h6">
            {deltaIncrease}%
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2">Recommended Action</Typography>
          <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
            {validatedAssessment.metrics.recommendedAction || 'N/A'}
          </Typography>
        </Grid>
      </Grid>
    );
  };

  const renderTremorCharts = () => {
    if (!validatedAssessment.metrics.rawData) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No raw data available for visualization.
          </Typography>
        </Box>
      );
    }

    const frequencyData = {
      labels: validatedAssessment.metrics.rawData.timestamps?.map(ts => new Date(ts).toLocaleTimeString()) || [],
      datasets: [{
        label: 'Tremor Frequency',
        data: validatedAssessment.metrics.rawData.frequencies || [],
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}20`,
        fill: true,
        tension: 0.4
      }]
    };

    const amplitudeData = {
      labels: validatedAssessment.metrics.rawData.timestamps?.map(ts => new Date(ts).toLocaleTimeString()) || [],
      datasets: [{
        label: 'Tremor Amplitude',
        data: validatedAssessment.metrics.rawData.amplitudes || [],
        borderColor: theme.palette.secondary.main,
        backgroundColor: `${theme.palette.secondary.main}20`,
        fill: true,
        tension: 0.4
      }]
    };

    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <LineChart 
                title="Tremor Frequency Over Time" 
                data={frequencyData}
                xAxisLabel="Time"
                yAxisLabel="Frequency (Hz)"
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <LineChart 
                title="Tremor Amplitude Over Time" 
                data={amplitudeData}
                xAxisLabel="Time"
                yAxisLabel="Amplitude"
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderSpeechCharts = () => {
    const emotionData = {
      labels: ['Confidence', 'Hesitation', 'Stress', 'Monotony'],
      datasets: [
        {
          label: 'Emotion Metrics',
          data: [
            validatedAssessment.metrics.emotion?.confidence || 0,
            validatedAssessment.metrics.emotion?.hesitation || 0,
            validatedAssessment.metrics.emotion?.stress || 0,
            validatedAssessment.metrics.emotion?.monotony || 0
          ],
          backgroundColor: theme.palette.primary.main,
          borderColor: theme.palette.primary.dark,
          borderWidth: 1
        }
      ]
    };

    const speechMetricsData = {
      labels: ['Clarity', 'Words Per Minute', 'Volume Control', 'Overall'],
      datasets: [
        {
          label: 'Speech Metrics',
          data: [
            validatedAssessment.metrics.clarity?.score || 0,
            validatedAssessment.metrics.speechRate?.wordsPerMinute ? validatedAssessment.metrics.speechRate.wordsPerMinute / 20 : 0,
            validatedAssessment.metrics.volumeControl?.score || 0,
            validatedAssessment.metrics.overallScore || 0
          ],
          backgroundColor: theme.palette.secondary.main,
          borderColor: theme.palette.secondary.dark,
          borderWidth: 1
        }
      ]
    };

    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <BarChart 
                title="Emotion Analysis" 
                data={emotionData}
                yAxisLabel="Score (0-10)"
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <BarChart 
                title="Speech Metrics" 
                data={speechMetricsData}
                yAxisLabel="Score"
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderResponseTimeCharts = () => {
    if (!validatedAssessment.metrics.rawData || !validatedAssessment.metrics.rawData.responseTimes) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No raw data available for visualization.
          </Typography>
        </Box>
      );
    }
    
    const labels = Array.from({ length: validatedAssessment.metrics.rawData.responseTimes.length }, (_, i) => `Round ${i + 1}`);
    
    const responseTimeData = {
      labels,
      datasets: [{
        label: 'Response Time',
        data: validatedAssessment.metrics.rawData.responseTimes,
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}50`,
        fill: false,
        tension: 0.1
      }]
    };

    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <LineChart 
                title="Response Time by Round" 
                data={responseTimeData}
                xAxisLabel="Round"
                yAxisLabel="Time (ms)"
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderFingerTappingCharts = () => {
    if (!validatedAssessment.metrics.tapData) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No raw data available for visualization.
          </Typography>
        </Box>
      );
    }

    const amplitudeData = {
      labels: validatedAssessment.metrics.tapData.map((_, index) => `Tap ${index + 1}`),
      datasets: [{
        label: 'Tap Amplitude',
        data: validatedAssessment.metrics.tapData.map(tap => tap.amplitude),
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}20`,
        fill: true,
        tension: 0.4
      }]
    };

    const speedData = {
      labels: validatedAssessment.metrics.tapData.map((_, index) => `Tap ${index + 1}`),
      datasets: [{
        label: 'Tap Speed',
        data: validatedAssessment.metrics.tapData.map(tap => tap.speed),
        borderColor: theme.palette.secondary.main,
        backgroundColor: `${theme.palette.secondary.main}20`,
        fill: true,
        tension: 0.4
      }]
    };

    return (
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <LineChart 
                title="Tap Amplitude" 
                data={amplitudeData}
                xAxisLabel="Tap Count"
                yAxisLabel="Amplitude"
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <LineChart 
                title="Tap Speed" 
                data={speedData}
                xAxisLabel="Tap Count"
                yAxisLabel="Speed"
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Dialog
      fullScreen={fullScreen}
      maxWidth="lg"
      fullWidth
      open={open}
      onClose={onClose}
      aria-labelledby="assessment-detail-dialog"
    >
      <DialogTitle id="assessment-detail-dialog">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" component="div">
              {getAssessmentName()}
            </Typography>
            <Typography variant="subtitle2" component="div" color="text.secondary">
              {formattedDate}
            </Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="assessment detail tabs" centered>
            <Tab label="Metrics" />
            {(validatedAssessment.type === 'tremor' || 
             validatedAssessment.type === 'speechPattern' || 
             validatedAssessment.type === 'responseTime' ||
             validatedAssessment.type === 'fingerTapping') && (
              <Tab label="Charts" />
            )}
          </Tabs>
        </Box>
  
        {tabValue === 0 && (
          <Box sx={{ py: 2 }}>
            <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
              {renderMetrics()}
            </Paper>
          </Box>
        )}
  
        {tabValue === 1 && (
          <Box sx={{ py: 2 }}>
            {renderCharts()}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Assessment ID: {validatedAssessment.id || 'N/A'}
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
export default AssessmentDetailDialog;