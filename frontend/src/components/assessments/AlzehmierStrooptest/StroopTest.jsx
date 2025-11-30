import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Paper, LinearProgress, Stack, Chip, Grid } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';

const COLORS = ['red', 'green', 'blue', 'orange'];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const StroopTest = ({ userId, onComplete }) => {
  const [running, setRunning] = useState(false);
  const [trial, setTrial] = useState(0);
  const [totalTrials] = useState(6);
  const [currentWord, setCurrentWord] = useState('');
  const [currentColor, setCurrentColor] = useState('');
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);

  const nextTrial = useCallback(() => {
    const word = COLORS[getRandomInt(COLORS.length)];
    // Intentionally pick ink color, sometimes same, sometimes different
    let color = COLORS[getRandomInt(COLORS.length)];
    // bias to create interference half the time
    if (Math.random() < 0.6) {
      // ensure mismatch for interference
      while (color === word) {
        color = COLORS[getRandomInt(COLORS.length)];
      }
    }
    setCurrentWord(word);
    setCurrentColor(color);
  }, []);

  useEffect(() => {
    if (running && trial < totalTrials) {
      nextTrial();
    }
  }, [running, trial, totalTrials, nextTrial]);

  const handleStart = () => {
    setRunning(true);
    setTrial(0);
    setScore(0);
    setHistory([]);
  };

  const handleAnswer = (selected) => {
    const correct = selected === currentColor;
    // compute new score synchronously so we can show final results reliably
    const newScore = correct ? score + 1 : score;
    setScore(newScore);
    setHistory(h => [...h, { word: currentWord, ink: currentColor, selected, correct }]);
    const next = trial + 1;
    if (next >= totalTrials) {
      // finished: stop running and show results — do NOT auto-complete the assessment
      setRunning(false);
      setTrial(next);
      return;
    }
    setTrial(next);
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }} elevation={1}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" fontWeight={600}>Stroop Test</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>The Stroop test measures cognitive interference. When ready, press Start and select the button matching the <strong>ink color</strong> of the word (not the word text).</Typography>
        </Box>

        {/* Progress */}
        <Box>
          <LinearProgress variant="determinate" value={Math.min(100, (trial / totalTrials) * 100)} sx={{ height: 8, borderRadius: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Progress: {trial} / {totalTrials}</Typography>
        </Box>

        {/* Start / Skip */}
        {!running && trial === 0 && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
            <Button variant="contained" onClick={handleStart} size="large">Start</Button>
            <Button variant="outlined" onClick={() => { if (onComplete) onComplete({ assessmentType: 'stroop', userId, score: 0, total: 0, accuracy: 0 }); }} size="large">Skip</Button>
          </Box>
        )}

        {/* Running state */}
        {running && (
          <Box sx={{ mt: 1, textAlign: 'center' }}>
            <Typography sx={{ mb: 1 }} color="text.secondary">Trial {trial + 1} of {totalTrials}</Typography>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Typography variant="h5" sx={{ color: currentColor, fontWeight: 800, textTransform: 'uppercase' }}>{currentWord}</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <Button
                  key={c}
                  onClick={() => handleAnswer(c)}
                  sx={{
                    minWidth: 84,
                    height: 64,
                    borderRadius: '12px',
                    backgroundColor: c,
                    color: '#fff',
                    textTransform: 'capitalize',
                    fontWeight: 700,
                    boxShadow: 1,
                    '&:hover': { opacity: 0.9 }
                  }}
                >
                  {c}
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Results */}
        {!running && trial > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle1">Your Results</Typography>
            <Typography sx={{ mb: 1 }} color="text.secondary">Score: <strong>{score}</strong> / {totalTrials} ({Math.round((score/totalTrials)*100)}%)</Typography>

            {/* Trial history */}
            <Grid container spacing={1} sx={{ my: 1 }}>
              {history.map((h, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={h.word.toUpperCase()} sx={{ bgcolor: h.ink, color: '#fff', fontWeight: 700 }} />
                    <Typography variant="body2" color="text.secondary">Selected: <strong style={{ textTransform: 'capitalize' }}>{h.selected}</strong></Typography>
                    {h.correct ? <CheckCircleOutlineIcon color="success" sx={{ ml: 1 }} /> : <CloseIcon color="error" sx={{ ml: 1 }} />}
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button variant="contained" onClick={() => { if (onComplete) onComplete({ assessmentType: 'stroop', userId, score, total: totalTrials, accuracy: score / totalTrials }); }}>Complete Assessment</Button>
              <Button variant="outlined" onClick={handleStart}>Start Assessment</Button>
            </Box>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default StroopTest;
