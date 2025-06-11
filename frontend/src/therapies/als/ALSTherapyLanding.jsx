import React from 'react';
import Layout from '../../components/Layout';
import { Box, Typography, Grid, Card, CardContent, Button } from '@mui/material';
import { FitnessCenter, AccessibilityNew, Air } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const exercises = [
  {
    key: 'hand-range',
    name: 'Range of Motion Exercises',
    description: 'Stretching and flexibility exercises to maintain joint mobility.',
    icon: <AccessibilityNew sx={{ fontSize: 40, color: 'primary.main' }} />,
    path: '/therapy/als/hand-range'
  },
  {
    key: 'upper-limb',
    name: 'Breathing Exercises',
    description: 'Guided diaphragmatic breathing exercises for respiratory muscle strength.',
    icon: <Air sx={{ fontSize: 40, color: 'secondary.main' }} />,
    path: '/therapy/als/upper-limb'
  },
];

const ALSTherapyLanding = () => {
  const navigate = useNavigate();

  const handleStartSession = (path) => {
    navigate(path);
  };

  return (
    <Layout>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
        <Typography variant="h3" fontWeight="bold" align="center" gutterBottom>
          ALS Therapy
        </Typography>
        <Typography variant="h6" align="center" sx={{ mb: 6, color: 'text.secondary' }}>
          Real-time hand and arm exercises with AI feedback
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {exercises.map((ex, idx) => (
            <Grid item xs={12} md={5} key={ex.key}>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                <Card sx={{ borderRadius: 4, boxShadow: 6, p: 2, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ mb: 2 }}>{ex.icon}</Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>{ex.name}</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>{ex.description}</Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="large" 
                      sx={{ borderRadius: 3, fontWeight: 'bold' }}
                      onClick={() => handleStartSession(ex.path)}
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
    </Layout>
  );
};

export default ALSTherapyLanding;
