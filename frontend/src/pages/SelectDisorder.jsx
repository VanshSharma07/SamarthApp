import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, useTheme } from '@mui/material';
import { AccessibilityNew, Psychology, Memory, MedicalServices, Face } from '@mui/icons-material';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionCard = motion(Card);

const disorders = [
  {
    id: 'parkinsons',
    title: "Parkinson's",
    subtitle: 'Motor symptoms, tremor, gait issues',
    icon: AccessibilityNew,
    color: '#8E24AA'
  },
  {
    id: 'alzheimers',
    title: "Alzheimer's",
    subtitle: 'Memory, cognitive decline',
    icon: Memory,
    color: '#1976D2'
  },
  {
    id: 'epilepsy',
    title: 'Epilepsy',
    subtitle: 'Seizure monitoring and patterns',
    icon: Psychology,
    color: '#F57C00'
  },
  {
    id: 'als',
    title: "ALS",
    subtitle: 'Motor neurone disease, muscle weakness',
    icon: MedicalServices,
    color: '#D32F2F'
  },
  {
    id: 'bells-palsy',
    title: "Bell's Palsy",
    subtitle: 'Facial muscle weakness or paralysis',
    icon: Face,
    color: '#00796B'
  }
];

const SelectDisorder = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSelect = (id) => {
    // Navigate directly to the assessment page, skipping the questionnaire
    navigate(`/assessment?disorder=${encodeURIComponent(id)}`);
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', pt: 4, pb: 6, px: 2 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          Select Disorder
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Choose the disorder you want to evaluate. We'll tailor the assessment and recommendations accordingly.
        </Typography>

        <Grid container spacing={3} alignItems="stretch">
          {disorders.map((d, i) => {
            const Icon = d.icon;
            return (
              <Grid item xs={12} sm={6} md={4} key={d.id}>
                <MotionCard
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: 3,
                    '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 },
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'transparent'}`
                  }}
                  onClick={() => handleSelect(d.id)}
                >
                  <Box sx={{ height: 8, background: d.color }} />
                  <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: '50%',
                        background: `${d.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon sx={{ fontSize: 28, color: d.color }} />
                      </Box>

                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{d.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{d.subtitle}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button variant="contained" onClick={() => handleSelect(d.id)} sx={{ borderRadius: 2 }}>
                            Select
                          </Button>
                        </Box>
                    </Box>
                  </CardContent>
                </MotionCard>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Layout>
  );
};

export default SelectDisorder;
