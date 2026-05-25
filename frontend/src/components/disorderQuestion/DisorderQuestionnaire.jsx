import React from 'react';
import { Box, Typography, Button, Paper, Divider } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ParkinsonQuestionnaire from './ParkinsonQuestionnaire';

const disorderTitles = {
  parkinsons: "Parkinson's",
  alzheimers: "Alzheimer's",
  epilepsy: 'Epilepsy',
  als: 'ALS',
  'bells-palsy': "Bell's Palsy"
};

const DisorderQuestionnaire = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const disorder = (params.get('disorder') || '').toLowerCase();

  const title = disorderTitles[disorder] || 'Disorder Questionnaire';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Please answer the following brief questionnaire about {disorderTitles[disorder] || 'the selected disorder'}. 
        (Question content will be provided later.)
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 2 }} elevation={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>Questionnaire placeholder</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          This component will render disorder-specific questions. For now it contains placeholders for the three supported disorders.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {disorder === 'parkinsons' && (
          <ParkinsonQuestionnaire />
        )}

        {disorder === 'alzheimers' && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Alzheimer's Questions</Typography>
            <Typography color="text.secondary">(Placeholder - questions will be supplied)</Typography>
          </Box>
        )}

        {disorder === 'epilepsy' && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Epilepsy Questions</Typography>
            <Typography color="text.secondary">(Placeholder - questions will be supplied)</Typography>
          </Box>
        )}
        
        {disorder === 'als' && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>ALS Questions</Typography>
            <Typography color="text.secondary">(Placeholder - questions will be supplied)</Typography>
            <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                onClick={() => {
                    localStorage.setItem('als_questionnaire', 'true');
                    navigate(`/assessment?disorder=als`);
                }}
            >
                Start Assessment
            </Button>
          </Box>
        )}

        {disorder === 'bells-palsy' && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Bell's Palsy Questions</Typography>
            <Typography color="text.secondary">(Placeholder - questions will be supplied)</Typography>
            <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                onClick={() => {
                    localStorage.setItem('bells-palsy_questionnaire', 'true');
                    navigate(`/assessment?disorder=bells-palsy`);
                }}
            >
                Start Assessment
            </Button>
          </Box>
        )}

        {!['parkinsons','alzheimers','epilepsy', 'als', 'bells-palsy'].includes(disorder) && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>No disorder selected</Typography>
            <Typography color="text.secondary">Use the Select Disorder page to choose one.</Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={() => navigate('/select-disorder')}>Change Selection</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default DisorderQuestionnaire;
