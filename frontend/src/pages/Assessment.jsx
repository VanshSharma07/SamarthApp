import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  IconButton, 
  Tooltip, 
  Badge, 
  Paper,
  Container,
  Divider,
  Chip,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Lock as LockIcon,
  RemoveRedEye as EyeIcon,
  AccessibilityNew as MobilityIcon,
  Vibration as TremorIcon,
  Timer as TimerIcon,
  DirectionsWalk as WalkIcon,
  TouchApp as TapIcon,
  ArrowBack as BackIcon,
  Mic as MicIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoIcon,
  FiberManualRecord as BulletIcon
} from '@mui/icons-material';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { Psychology as PsychologyIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

// Import assessment components
import EyeMovement from '../components/assessments/EyeMovement/EyeMovementTest';
// Facial Symmetry assessment removed as per minimal screening requirements
import Tremor from '../components/assessments/Tremor';
import ResponseTime from '../components/assessments/ResponseTime';
import GaitAnalysis from '../components/assessments/GaitAnalysis';
import FingerTapping from '../components/assessments/FingerTapping';
import SpeechPatternAssessment from '../components/assessments/SpeechPatternAssessment';
import WordListAssessment from '../components/assessments/WordList/WordListAssessment';
import NeuroAssessment from './NeuroAssessment';
import HyperventilationResponseTest from './Hyperventilation/HyperventilationResponseTest';
import StroopTest from '../components/assessments/AlzehmierStrooptest/StroopTest';
import BotScreen from '../conversationalBot/pages/BotScreen';

// Styled Motion components
const MotionCard = motion(Card);
const MotionContainer = motion(Container);

const Assessment = () => {
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [completedAssessments, setCompletedAssessments] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDisorder, setSelectedDisorder] = useState(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedInfoAssessment, setSelectedInfoAssessment] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Helper to check if all assessments are completed
  const checkAllAssessmentsCompleted = useCallback((completed, types) => {
    return types.every(assessment => completed.includes(assessment.id));
  }, []);

  // Load completed assessments from localStorage on component mount
  useEffect(() => {
    if (user) {
      // Get the current session flag
      const isNewSession = localStorage.getItem(`new_assessment_session_${user.id}`);
      
      // If starting a new assessment session, clear previous completed assessments
      if (isNewSession === 'true') {
        localStorage.removeItem(`completed_assessments_${user.id}`);
        localStorage.setItem(`new_assessment_session_${user.id}`, 'false');
        setCompletedAssessments([]);
      } else {
        // Otherwise load any existing progress
        const saved = localStorage.getItem(`completed_assessments_${user.id}`);
        if (saved) {
          try {
            setCompletedAssessments(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse completed assessments', e);
          }
        }
      }
    }
  }, [user]);

  // Add loading state for user
  if (!user) {
    return (
      <Layout>
        <Box sx={{ 
          p: 4, 
          textAlign: 'center', 
          borderRadius: 2,
          backgroundColor: 'background.paper',
          boxShadow: 1,
          mt: 4
        }}>
          <Typography variant="h5" color="text.secondary">Please log in to access assessments</Typography>
        </Box>
      </Layout>
    );
  }

  const assessmentTypes = [
    {
      id: 'eyeMovement',
      title: 'Eye Movement Assessment',
      description: 'Track eye movements to detect potential neurological disorders.',
      icon: EyeIcon,
      component: EyeMovement,
      route: '/assessment/eye-movement',
      color: '#3f51b5', // Indigo
      instructions: [
        "Sit comfortably in a well-lit room.",
        "Ensure your face is clearly visible to the camera.",
        "Follow the moving dot on the screen with your eyes without moving your head.",
        "Keep your head steady throughout the assessment."
      ],
      hardwareRequirements: [
        "Webcam / Front-facing camera"
      ],
      expectedResults: [
        "The system tracks your pupil movement.",
        "Smooth pursuit and saccadic movements are analyzed for irregularities.",
        "A heatmap of your gaze will be generated."
      ]
    },
    // {
    //   id: 'neckMobility',
    //   title: 'Neck Mobility Assessment',
    //   description: 'Assess neck mobility and flexibility patterns.',
    //   icon: MobilityIcon,
    //   component: NeckMobility,
    //   route: '/assessment/neck-mobility',
    //   color: '#009688' // Teal
    // },
    // Facial Symmetry assessment removed (low overall value across disorders)
    {
      id: 'tremor',
      title: 'Tremor Assessment',
      description: 'Measure tremor frequency and amplitude patterns.',
      icon: TremorIcon,
      component: Tremor,
      route: '/assessment/tremor',
      color: '#673ab7', // Deep Purple
      instructions: [
        "Wear the Smart Glove on your dominant hand.",
        "Ensure the glove is connected and calibrated.",
        "Extend your arm forward and hold as instructed.",
        "Relax and breathe normally."
      ],
      hardwareRequirements: [
        "Smart Glove"
      ],
      expectedResults: [
        "Tremor frequency and amplitude will be measured.",
        "Resting and postural tremors will be differentiated."
      ]
    },
    {
      id: 'responseTime',
      title: 'Response Time Assessment',
      description: 'Evaluate reaction time and response patterns.',
      icon: TimerIcon,
      component: ResponseTime,
      route: '/assessment/response-time',
      color: '#2196f3', // Blue
      instructions: [
        "Watch the screen closely.",
        "Tap the screen or press the key as soon as the signal appears.",
        "React as quickly as possible.",
        "There will be multiple trials."
      ],
      hardwareRequirements: [
        "Touchscreen or Mouse/Keyboard"
      ],
      expectedResults: [
        "Reaction time in milliseconds will be recorded.",
        "Average response time and variability will be calculated."
      ]
    },
    {
      id: 'gaitAnalysis',
      title: 'Gait Analysis',
      description: 'Analyze walking patterns and balance.',
      icon: WalkIcon,
      component: GaitAnalysis,
      route: '/assessment/gait-analysis',
      color: '#4caf50', // Green
      instructions: [
        "Wear the Smart Insoles in your shoes.",
        "Ensure the insoles are connected.",
        "Walk back and forth in the designated area.",
        "Walk naturally at your normal pace."
      ],
      hardwareRequirements: [
        "Smart Insoles",
        "Clear space for walking"
      ],
      expectedResults: [
        "Stride length, step width, and walking speed will be analyzed.",
        "Postural stability and arm swing symmetry will be evaluated."
      ]
    },
    {
      id: 'fingerTapping',
      title: 'Finger Tapping Test',
      description: 'Evaluate finger movement patterns and coordination.',
      icon: TapIcon,
      component: FingerTapping,
      route: '/assessment/finger-tapping',
      color: '#e91e63', // Pink
      instructions: [
        "Position your hand clearly in front of the webcam.",
        "Ensure your fingers are visible to the camera.",
        "Tap your index finger against your thumb as fast as possible.",
        "Maintain the rhythm until valid data is captured."
      ],
      hardwareRequirements: [
        "Webcam / Computer Vision"
      ],
      expectedResults: [
        "Tapping frequency and rhythm consistency will be measured.",
        "Fatigue rate over time will be analyzed."
      ]
    },
    {
      id: 'speechPattern',
      title: 'Speech Pattern Assessment',
      description: 'Analyze speech patterns, rhythm, and pronunciation.',
      icon: MicIcon,
      component: SpeechPatternAssessment,
      route: '/assessment/speech-pattern',
      color: '#ff9800', // Orange
      instructions: [
        "Find a quiet environment.",
        "Read the displayed text aloud clearly.",
        "Sustain the vowel 'Ahhh' for as long as you comfortably can.",
        "Speak naturally into the microphone."
      ],
      hardwareRequirements: [
        "Microphone"
      ],
      expectedResults: [
        "Voice pitch, volume (loudness), and jitter/shimmer will be analyzed.",
        "Speech rate and pauses will be detected."
      ]
    }
    ,
    {
      id: 'wordList',
      title: 'Word List Memory Test',
      description: 'Short-list verbal memory assessment (immediate + delayed recall).',
      icon: MicIcon,
      component: WordListAssessment,
      route: '/assessment/word-list',
      color: '#8e24aa',
      instructions: [
        "Listen to or read the list of words presented.",
        "Recall as many words as you can immediately after.",
        "You may be asked to recall them again after a delay."
      ],
      hardwareRequirements: [
        "Microphone",
        "Speakers/Headphones"
      ],
      expectedResults: [
        "Immediate and delayed recall scores.",
        "Analysis of semantic clustering or serial position effects."
      ]
    }
    ,
    {
      id: 'neuro',
      title: 'Neuro (EEG/ECG) Assessment',
      description: 'Real-time EEG + ECG monitoring for epilepsy and seizure-related events.',
      icon: MicIcon,
      component: NeuroAssessment,
      route: '/assessment/neuro',
      color: '#F57C00',
      instructions: [
        "Ensure the text EEG/ECG device is properly connected and electrode contacts are good.",
        "Sit quietly and relax.",
        "Avoid excessive movement or talking during the recording."
      ],
      hardwareRequirements: [
        "Compatible EEG/ECG Headset/Device"
      ],
      expectedResults: [
        "Real-time EEG and ECG waveforms.",
        "Detection of abnormal spikes or rhythms."
      ]
    }
  ,
    {
      id: 'hyperventilation',
      title: 'Hyperventilation Response Test',
      description: 'Provocation protocol: baseline, hyperventilation, recovery with EEG+ECG monitoring.',
      icon: MicIcon,
      component: HyperventilationResponseTest,
      route: '/assessment/hyperventilation',
      color: '#d32f2f',
      instructions: [
        "Wear the EEG Band correctly on your head.",
        "Follow the breathing pacing guide: breathe in and out deeply.",
        "Continue for 3 minutes or as instructed.",
        "Relax immediately if you feel dizzy or unwell."
      ],
      hardwareRequirements: [
        "EEG Band"
      ],
      expectedResults: [
        "Physiological response to hyperventilation stress.",
        "Recovery time to baseline metrics."
      ]
    }
  ,
    {
      id: 'stroop',
      title: 'Stroop Test',
      description: 'Assess cognitive interference and processing speed using color-word tasks.',
      icon: PsychologyIcon,
      component: StroopTest,
      route: '/assessment/stroop',
      color: '#1976d2',
      instructions: [
        "You will see color words (e.g., 'RED', 'BLUE') displayed in different ink colors.",
        "Select the color of the **INK**, not the word itself.",
        "Respond as quickly and accurately as possible."
      ],
      hardwareRequirements: [
        "Screen (Color display)",
        "Input device (Touch/Mouse)"
      ],
      expectedResults: [
        "Reaction time difference between congruent and incongruent stimuli.",
        "Processing speed and inhibition control score."
      ]
    },
    {
      id: 'conversationalBot',
      title: 'Conversational Screening',
      description: 'AI-assisted verbal screening for cognitive assessment (Multilingual).',
      icon: MicIcon,
      component: BotScreen,
      route: '/assessment/bot',
      color: '#009688', // Teal
      instructions: [
        "Engage in a conversation with the AI assistant.",
        "Answer questions naturally and honestly.",
        "Ask for clarification if you don't understand a question."
      ],
      hardwareRequirements: [
        "Microphone",
        "Speakers"
      ],
      expectedResults: [
        "Cognitive screening score based on verbal responses.",
        "Analysis of language complexity and coherence."
      ]
    }
  ];
  // Map disorders to relevant assessment IDs (based on your table)
  const disorderAssessmentMap = {
    parkinsons: [
      'eyeMovement',
      'tremor',
      'gaitAnalysis',
      'responseTime',
      'fingerTapping',
      'speechPattern'
    ],
    epilepsy: [
      'eyeMovement',
      'neuro',
      'hyperventilation'
    ],
    alzheimers: [
      'gaitAnalysis',
      'responseTime',
      'speechPattern',
      'wordList',
      'stroop',
      'conversationalBot'
    ]
  };

  // Human-friendly disorder names
  const disorderInfo = {
    parkinsons: "Parkinson's",
    epilepsy: 'Epilepsy',
    alzheimers: "Alzheimer's"
  };

  // Parse disorder from query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const d = params.get('disorder');
    if (d) setSelectedDisorder(d.toLowerCase());
    else setSelectedDisorder(null);
  }, [location.search]);

  // If a disorder is specified, require that its questionnaire has been submitted
  useEffect(() => {
    if (!selectedDisorder) return;
    const key = `${selectedDisorder}_questionnaire`;
    const saved = localStorage.getItem(key);
    if (!saved) {
      // Redirect user back to the disorder-specific questionnaire page
      navigate(`/disorders/${selectedDisorder}`);
    }
  }, [selectedDisorder, navigate]);

  // Filter assessmentTypes based on selected disorder (fall back to full list)
  const filteredAssessmentTypes = useMemo(() => {
    if (!selectedDisorder) return assessmentTypes;
    const allowed = disorderAssessmentMap[selectedDisorder];
    if (!allowed) return assessmentTypes;
    return assessmentTypes.filter(a => allowed.includes(a.id));
  }, [assessmentTypes, selectedDisorder]);
  // Function to check if an assessment is available
  const isAssessmentAvailable = (index) => {
    // Modified for testing: All assessments are available
    return true;
    // Original logic:
    // if (index === 0) return true; // First assessment is always available
    // Assessment is available if previous assessment is completed
    // return completedAssessments.includes(assessmentTypes[index - 1].id);
  };

  // Function to check if assessment is completed
  const isAssessmentCompleted = (id) => {
    return completedAssessments.includes(id);
  };
  
  const handleOpenInfo = (assessment) => {
    setSelectedInfoAssessment(assessment);
    setInfoDialogOpen(true);
  };

  const handleCloseInfo = () => {
    setInfoDialogOpen(false);
    setSelectedInfoAssessment(null);
  };

  const startAssessment = (assessmentType, index) => {
    // Only allow starting assessment if it's available
    if (isAssessmentAvailable(index)) {
      setCurrentAssessment(assessmentType);
    }
  };

  const stopAssessment = async (metrics) => {
    const assessmentData = {
      type: currentAssessment,
      timestamp: new Date().toISOString(),
      metrics,
      userId: user.id
    };
    
    try {
      // Send assessment data to backend
      // await assessmentService.saveAssessment(assessmentData);
      console.log('Assessment completed:', assessmentData);
      
      // Mark current assessment as completed
      const updatedCompletedAssessments = [...completedAssessments];
      if (!updatedCompletedAssessments.includes(currentAssessment)) {
        updatedCompletedAssessments.push(currentAssessment);
      }
      
      // Save to localStorage
      localStorage.setItem(
        `completed_assessments_${user.id}`,
        JSON.stringify(updatedCompletedAssessments)
      );
      
      setCompletedAssessments(updatedCompletedAssessments);
      
      // Check if all relevant assessments are completed
      const relevantTypes = selectedDisorder ? filteredAssessmentTypes : assessmentTypes;
      if (checkAllAssessmentsCompleted(updatedCompletedAssessments, relevantTypes)) {
        // All assessments completed - reset for next time and navigate to dashboard
        localStorage.setItem(`new_assessment_session_${user.id}`, 'true');
        navigate('/dashboard');
        return;
      }

      // Find the next assessment that isn't completed yet within the relevant set
      const currentIndex = relevantTypes.findIndex(a => a.id === currentAssessment);
      const nextIndex = currentIndex + 1;

      if (nextIndex < relevantTypes.length) {
        // Automatically navigate to the next assessment in the filtered list
        setCurrentAssessment(relevantTypes[nextIndex].id);
      } else {
        // All relevant assessments completed
        setCurrentAssessment(null);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      setCurrentAssessment(null);
    }
  };

  const renderAssessment = () => {
    const assessment = assessmentTypes.find(a => a.id === currentAssessment);
    if (!assessment) return null;

    const AssessmentComponent = assessment.component;
    return (
      <MotionContainer 
        maxWidth="lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Selected disorder banner */}
        {selectedDisorder && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Chip label={disorderInfo[selectedDisorder] || selectedDisorder} color="primary" />
            <Button variant="text" onClick={() => navigate('/select-disorder')} sx={{ textTransform: 'none' }}>
              Change disorder
            </Button>
          </Box>
        )}
        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mt: 3, 
            borderRadius: 3,
            backgroundColor: 'background.paper',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ 
            mb: 3, 
            display: 'flex', 
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            pb: 2,
            position: 'relative'
          }}>
            <Box 
              sx={{
                position: 'absolute',
                top: -20,
                left: 0,
                height: 5,
                width: '100%',
                bgcolor: assessment.color || theme.palette.primary.main
              }}
            />
            <IconButton 
              onClick={() => setCurrentAssessment(null)}
              sx={{ 
                mr: 2, 
                backgroundColor: theme.palette.background.default,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                }
              }}
            >
              <BackIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  p: 1.5, 
                  borderRadius: '50%', 
                  backgroundColor: `${assessment.color}20` || `${theme.palette.primary.main}20`,
                  mr: 2
                }}
              >
                <assessment.icon sx={{ 
                  fontSize: 28, 
                  color: assessment.color || theme.palette.primary.main 
                }} />
              </Box>
              <Typography variant="h5" component="h1" fontWeight="500">
                {assessment.title}
              </Typography>
            </Box>
            
            <Box sx={{ ml: 'auto' }}>
              <Tooltip title="Assessment Instructions & Info">
                <IconButton 
                  onClick={() => handleOpenInfo(assessment)}
                  color="primary"
                  sx={{ 
                    bgcolor: 'primary.light', 
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.main' }
                  }}
                >
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <AssessmentComponent 
            userId={user.id}
            onComplete={(data) => stopAssessment({
              ...data,
              assessmentType: assessment.id
            })}
          />
        </Paper>
      </MotionContainer>
    );
  };

  // Calculate progress (based on filtered set)
  const completionPercentage = Math.round(
    (completedAssessments.length / Math.max(1, filteredAssessmentTypes.length)) * 100
  );

  const renderAssessmentList = () => (
    <MotionContainer 
      maxWidth="lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ 
        pt: 4, 
        pb: 6,
        px: isMobile ? 2 : 4
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h4" 
            component="h1"
            sx={{ 
              fontWeight: 600, 
              mb: 1,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Health Assessment Suite
          </Typography>
          
          <Typography 
            color="text.secondary" 
            sx={{ 
              mb: 2, 
              maxWidth: 600, 
              mx: 'auto',
              fontSize: '1.1rem'
            }}
          >
            Complete assessments in sequence to unlock the next one
          </Typography>
          
          {/* Progress indicator */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center', 
            justifyContent: 'center',
            mt: 3,
            maxWidth: 600,
            mx: 'auto',
            gap: 2
          }}>
            <Typography variant="body1" fontWeight="500" color="text.primary">
              Your Progress: {completionPercentage}%
            </Typography>
            <Box
              sx={{
                height: 10,
                width: '100%',
                maxWidth: '400px',
                bgcolor: 'grey.200',
                borderRadius: 5,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${completionPercentage}%`,
                  background: 'linear-gradient(90deg, #2196F3 30%, #21CBF3 90%)',
                  borderRadius: 5,
                  transition: 'width 1s ease-in-out'
                }}
              />
            </Box>
          </Box>
        </Box>
        {/* Selected disorder banner (shown above the list) */}
        {selectedDisorder && (
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={disorderInfo[selectedDisorder] || selectedDisorder} color="primary" />
              <Typography color="text.secondary">Showing assessments for the selected disorder</Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => navigate('/select-disorder')} sx={{ textTransform: 'none' }}>
              Change selection
            </Button>
          </Box>
        )}
        
        <Grid container spacing={3}>
          {filteredAssessmentTypes.map((assessment, index) => {
            const isAvailable = isAssessmentAvailable(index);
            const isCompleted = isAssessmentCompleted(assessment.id);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={assessment.id}>
                <MotionCard 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  sx={{ 
                    height: '100%',
                    cursor: isAvailable ? 'pointer' : 'default',
                    opacity: isAvailable ? 1 : 0.7,
                    transition: 'all 0.3s ease',
                    '&:hover': isAvailable ? {
                      transform: 'translateY(-8px)',
                      boxShadow: 6,
                    } : {},
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isAvailable ? 3 : 1,
                    border: isCompleted ? `2px solid ${theme.palette.success.main}` : 'none'
                  }}
                  onClick={() => isAvailable && startAssessment(assessment.id, index)}
                >
                  {/* Color accent at top of card */}
                  <Box sx={{ 
                    height: 6, 
                    width: '100%', 
                    backgroundColor: assessment.color || theme.palette.primary.main
                  }} />
                  
                  <CardContent sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    flexGrow: 1,
                    p: 3,
                    pb: 4,
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      justifyContent: 'space-between',
                      mb: 2
                    }}>
                      <Box 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: '50%', 
                          backgroundColor: `${assessment.color}15` || `${theme.palette.primary.main}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <assessment.icon sx={{ 
                          fontSize: 28, 
                          color: assessment.color || theme.palette.primary.main
                        }} />
                      </Box>
                      
                      {/* Status indicator */}
                      {isCompleted ? (
                        <Chip 
                          icon={<CheckCircleIcon />}
                          label="Completed"
                          size="small"
                          color="success"
                          sx={{ fontWeight: 500 }}
                        />
                      ) : !isAvailable ? (
                        <Tooltip title="Complete previous assessments to unlock">
                          <Chip 
                            icon={<LockIcon />}
                            label="Locked"
                            size="small"
                            sx={{ fontWeight: 500 }}
                            color="default"
                          />
                        </Tooltip>
                      ) : (
                        <Chip 
                          label="Available"
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 500 }}
                        />
                      )}
                    </Box>
                    
                    <Typography 
                      variant="h6" 
                      component="h2"
                      sx={{ 
                        mb: 1.5,
                        fontWeight: 600,
                        color: isAvailable ? 'text.primary' : 'text.disabled'
                      }}
                    >
                      {assessment.title}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color={isAvailable ? "text.secondary" : "text.disabled"}
                      sx={{ flexGrow: 1 }}
                    >
                      {assessment.description}
                    </Typography>
                    
                    {/* Subtle decorative elements */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        bgcolor: `${assessment.color}08` || `${theme.palette.primary.main}08`,
                        zIndex: -1
                      }}
                    />
                    
                    {/* Numbered indicator */}
                    <Badge
                      badgeContent={index + 1}
                      color={isAvailable ? "primary" : "default"}
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        '& .MuiBadge-badge': {
                          backgroundColor: isAvailable 
                            ? assessment.color || theme.palette.primary.main 
                            : 'grey.400',
                          color: '#fff',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                  </CardContent>
                </MotionCard>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </MotionContainer>
  );

  return (
    <Layout>
      {currentAssessment ? renderAssessment() : renderAssessmentList()}
      
      {/* Information Dialog */}
      <Dialog 
        open={infoDialogOpen} 
        onClose={handleCloseInfo}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        {selectedInfoAssessment && (
          <>
            <DialogTitle sx={{ 
              borderBottom: 1, 
              borderColor: 'divider', 
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <selectedInfoAssessment.icon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h6">{selectedInfoAssessment.title}</Typography>
                <Typography variant="caption" color="text.secondary">Assessment Guide</Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              {/* Instructions */}
              <Typography variant="subtitle1" fontWeight="600" color="primary" gutterBottom>
                Instructions
              </Typography>
              <List dense>
                {selectedInfoAssessment.instructions?.map((instruction, idx) => (
                  <ListItem key={idx} alignItems="flex-start" sx={{ pl: 0 }}>
                    <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
                      <BulletIcon fontSize="small" color="primary" sx={{ fontSize: 10 }} />
                    </ListItemIcon>
                    <ListItemText primary={instruction} />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Hardware Requirements */}
              <Typography variant="subtitle1" fontWeight="600" color="primary" gutterBottom>
                Hardware Requirements
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {selectedInfoAssessment.hardwareRequirements?.map((req, idx) => (
                  <Chip key={idx} label={req} size="small" variant="outlined" />
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Expected Results */}
              <Typography variant="subtitle1" fontWeight="600" color="primary" gutterBottom>
                Expected Results & Validation
              </Typography>
              <List dense>
                {selectedInfoAssessment.expectedResults?.map((result, idx) => (
                  <ListItem key={idx} alignItems="flex-start" sx={{ pl: 0 }}>
                     <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
                      <CheckCircleIcon fontSize="small" color="success" sx={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText primary={result} />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={handleCloseInfo} variant="contained" fullWidth>
                Got it
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Layout>
  );
};

export default Assessment;