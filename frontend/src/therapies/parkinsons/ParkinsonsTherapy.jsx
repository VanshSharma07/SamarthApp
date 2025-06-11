import React from 'react';
import Layout from '../../components/Layout';
import { Box, Typography, Grid, Card, CardContent, Button, Container } from '@mui/material';
import { DirectionsRun, TouchApp, SentimentSatisfied } from '@mui/icons-material';
import { motion } from 'framer-motion';
import ParkinsonsSession from './ParkinsonsSession';

// Updated exercises with appropriate icons
const exercises = [
  {
    key: 'gait-balance',
    name: 'Gait & Balance Training',
    description: 'Step-in-place, single-leg balance, posture drills',
    icon: <DirectionsRun sx={{ fontSize: 40, color: 'primary.main' }} />,
  }, {
    key: 'tremor-drill',
    name: 'Finger Tapping Test',
    description: 'Fine motor control test for fingers',
    icon: <TouchApp sx={{ fontSize: 40, color: 'secondary.main' }} />,
  }, {
    key: 'facial-exercise',
    name: 'Facial Exercise',
    description: 'Mimic emotions, smile, frown to maintain muscle strength',
    icon: <SentimentSatisfied sx={{ fontSize: 40, color: 'success.main' }} />,
  },
];

const ParkinsonsTherapy = () => {
  const [activeExercise, setActiveExercise] = React.useState(null);

  if (activeExercise) {
    return (
      <Layout>
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
          <Box sx={{ width: '100%', maxWidth: 520 }}>
            <ParkinsonsSession exerciseKey={activeExercise} />
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button variant="text" color="secondary" onClick={() => setActiveExercise(null)}>
                ← Back to Exercises
              </Button>
            </Box>
          </Box>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
          <Typography variant="h3" fontWeight="bold" align="center" gutterBottom>
            Parkinson's Disease Therapy
          </Typography>
          <Typography variant="h6" align="center" sx={{ mb: 6, color: 'text.secondary', maxWidth: 800, mx: 'auto' }}>
            Real-time gait, balance, tremor, and facial exercises with AI feedback
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {exercises.map((ex, idx) => (
              <Grid item xs={12} sm={6} md={4} key={ex.key}>
                <motion.div 
                  initial={{ opacity: 0, y: 30 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.1 }}
                  style={{ height: '100%' }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      borderRadius: 4, 
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                      }
                    }}
                  >
                    <Box 
                      sx={{ 
                        background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
                        p: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      {ex.icon}
                    </Box>
                    <CardContent sx={{ 
                      textAlign: 'center', 
                      p: 3, 
                      flexGrow: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>{ex.name}</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{ex.description}</Typography>
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        sx={{ 
                          borderRadius: 3, 
                          fontWeight: 'bold',
                          py: 1.2,
                          textTransform: 'none'
                        }}
                        onClick={() => window.location.href = `/therapy/parkinsons/${ex.key}`}
                      >
                        Start Session
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Layout>
  );
};

export default ParkinsonsTherapy;
