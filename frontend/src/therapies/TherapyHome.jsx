import React from 'react';
import Layout from '../components/Layout';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import { 
  SmartToy, 
  FaceRetouchingNatural, 
  DirectionsRun,
  CheckCircle,
  Timeline,
  Psychology,
  Healing,
  ArrowForward,
  TrendingUp,
  AccessTime,
  LocalHospital
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ExerciseGuidance from './ExerciseGuidance';
import ProgressTracker from './ProgressTracker';
import ThreeDOverlay from './ThreeDOverlay';
import TherapyDashboard from './TherapyDashboard';

const therapyPrograms = [
  {
    key: 'parkinsons',
    name: "Parkinson's",
    description: 'Progressive nervous system disorder affecting movement and balance.',
    icon: <DirectionsRun sx={{ fontSize: 32 }} />,
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderColor: '#667eea',
    features: [
      'Tremor reduction exercises',
      'Balance improvement training', 
      'Coordination enhancement'
    ]
  },
  {
    key: 'bells',
    name: "Bell's Palsy",
    description: 'Sudden weakness in facial muscles causing one side of face to droop.',
    icon: <FaceRetouchingNatural sx={{ fontSize: 32 }} />,
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    borderColor: '#f093fb',
    features: [
      'Facial muscle strengthening',
      'Symmetry restoration',
      'Speech articulation improvement'
    ]
  },
  {
    key: 'als',
    name: 'ALS',
    description: 'Motor neuron disease affecting nerve cells in brain and spinal cord.',
    icon: <SmartToy sx={{ fontSize: 32 }} />,
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    borderColor: '#4facfe',
    features: [
      'Respiratory function support',
      'Muscle preservation techniques',
      'Assistive device training'
    ]
  }
];

const howItWorks = [
  {
    step: '01',
    title: 'Assessment',
    description: 'Complete initial evaluation to understand your specific needs',
    icon: <Psychology />
  },
  {
    step: '02', 
    title: 'Personalization',
    description: 'AI creates a customized therapy plan based on your condition',
    icon: <Timeline />
  },
  {
    step: '03',
    title: 'Interactive Sessions',
    description: 'Engage in real-time exercises with instant feedback',
    icon: <Healing />
  },
  {
    step: '04',
    title: 'Progress Tracking',
    description: 'Monitor improvements and adjust treatment accordingly',
    icon: <TrendingUp />
  }
];

const benefits = [
  { text: 'Real-time AI feedback and correction', icon: <CheckCircle /> },
  { text: 'Personalized exercise programs', icon: <CheckCircle /> },
  { text: 'Progress tracking and analytics', icon: <CheckCircle /> },
  { text: 'Evidence-based rehabilitation techniques', icon: <CheckCircle /> },
  { text: '24/7 accessibility from home', icon: <CheckCircle /> },
  { text: 'Professional therapist oversight', icon: <CheckCircle /> }
];

const TherapySession = ({ disorder }) => {
  const [step, setStep] = React.useState(0);
  const [videoAndModel, setVideoAndModel] = React.useState(null);

  // Step 0: Camera setup
  // Step 1: Exercise guidance
  // Step 2: Progress tracker & dashboard

  return (
    <Box sx={{ mt: 6, mb: 8 }}>
      {step === 0 && (
        <CameraSetup disorder={disorder} onReady={(data) => { setVideoAndModel(data); setStep(1); }} />
      )}
      {step === 1 && videoAndModel && (
        <>
          <ExerciseGuidance disorder={disorder} videoRef={videoAndModel.videoRef} model={videoAndModel.model} />
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={() => setStep(0)}>Back</Button>
            <Button variant="contained" onClick={() => setStep(2)}>Finish Session</Button>
          </Box>
        </>
      )}
      {step === 2 && (
        <>
          <ProgressTracker disorder={disorder} />
          <TherapyDashboard />
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => setStep(0)}>Start New Session</Button>
          </Box>
        </>
      )}
    </Box>
  );
};

const TherapyHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === 'dark';

  const handleSelect = (key) => {
    navigate(`/therapy/${key}`);
  };

  const params = new URLSearchParams(window.location.pathname.split('/').slice(2).join('/'));
  const disorder = params && ['bells','als','parkinsons'].find(d => window.location.pathname.includes(d));

  if (disorder) {
    return (
      <Layout>
        <TherapySession disorder={disorder} />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 8
      }}>
        <Container maxWidth="xl">
          {/* Hero Section */}
          <Box sx={{ pt: 4, pb: 6 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card sx={{
                background: isDark 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                mb: 6
              }}>
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  Specialized Therapy Programs
                </Typography>
                <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
                  Personalized approaches for neurological conditions
                </Typography>
                <Typography variant="body1" sx={{ maxWidth: 800, opacity: 0.85 }}>
                  Our therapy programs combine cutting-edge technology with evidence-based techniques to deliver personalized care for various neurological conditions.
                </Typography>
              </Card>
            </motion.div>
          </Box>

          {/* Available Therapy Programs */}
          <Box sx={{ mb: 8 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
              Available Therapy Programs
            </Typography>

            <Grid container spacing={4}>
              {therapyPrograms.map((program, index) => (
                <Grid item xs={12} md={4} key={program.key}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Card sx={{
                      height: '100%',
                      borderRadius: 3,
                      borderTop: `4px solid ${program.borderColor}`,
                      bgcolor: 'background.paper',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}>
                      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            background: program.color,
                            color: 'white',
                            mr: 2
                          }}>
                            {program.icon}
                          </Box>
                          <Typography variant="h5" fontWeight="bold">
                            {program.name}
                          </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          {program.description}
                        </Typography>

                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                          Key features:
                        </Typography>

                        <Box sx={{ flexGrow: 1, mb: 3 }}>
                          {program.features.map((feature, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <CheckCircle sx={{ fontSize: 16, color: program.borderColor, mr: 1 }} />
                              <Typography variant="body2">{feature}</Typography>
                            </Box>
                          ))}
                        </Box>

                        <Button
                          variant="contained"
                          endIcon={<ArrowForward />}
                          onClick={() => handleSelect(program.key)}
                          sx={{
                            background: program.color,
                            borderRadius: 2,
                            py: 1.5,
                            fontWeight: 'bold',
                            '&:hover': {
                              opacity: 0.9
                            }
                          }}
                          fullWidth
                        >
                          LEARN MORE
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* How Our Therapy Programs Work */}
          <Box sx={{ mb: 8 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
              How Our Therapy Programs Work
            </Typography>

            <Grid container spacing={4}>
              {howItWorks.map((step, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                  >
                    <Card sx={{
                      height: '100%',
                      borderRadius: 3,
                      bgcolor: 'background.paper',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'visible'
                    }}>
                      <CardContent sx={{ p: 4 }}>
                        <Box sx={{
                          position: 'absolute',
                          top: -20,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: 'primary.main',
                          color: 'white',
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          {step.step}
                        </Box>

                        <Box sx={{ mt: 2, mb: 3, color: 'primary.main' }}>
                          {React.cloneElement(step.icon, { sx: { fontSize: 48 } })}
                        </Box>

                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {step.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Benefits & Features */}
          <Grid container spacing={6}>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card sx={{
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: 'background.paper'
                }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Why Choose Our Platform?
                    </Typography>
                    <List>
                      {benefits.map((benefit, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {React.cloneElement(benefit.icon, { 
                              sx: { color: 'success.main', fontSize: 20 } 
                            })}
                          </ListItemIcon>
                          <ListItemText 
                            primary={benefit.text}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card sx={{
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: 'background.paper'
                }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      Get Started Today
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                      Begin your rehabilitation journey with our AI-powered therapy programs designed specifically for your condition.
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTime sx={{ mr: 2, color: 'info.main' }} />
                        <Typography variant="body2">
                          Sessions available 24/7
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocalHospital sx={{ mr: 2, color: 'error.main' }} />
                        <Typography variant="body2">
                          Clinically validated exercises
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Psychology sx={{ mr: 2, color: 'warning.main' }} />
                        <Typography variant="body2">
                          AI-powered personalization
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      sx={{ mt: 4, py: 1.5, borderRadius: 2 }}
                    >
                      Schedule Assessment
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Layout>
  );
};

export default TherapyHome;