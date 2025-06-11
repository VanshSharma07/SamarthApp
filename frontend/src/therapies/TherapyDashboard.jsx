import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import { EmojiEvents, Star, CalendarToday, TrendingUp } from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * TherapyDashboard component
 * Shows points, badges, streaks, and daily goals.
 * Encourages daily practice and tracks achievements.
 */
const TherapyDashboard = () => {
  // Example data
  const points = 1200;
  const badges = [
    { label: 'Consistency', icon: <TrendingUp color="success" /> },
    { label: 'Streak 7 Days', icon: <CalendarToday color="primary" /> },
    { label: 'First Session', icon: <Star color="warning" /> },
  ];
  const dailyGoal = 3;
  const completedToday = 2;

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Therapy Gamified Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <EmojiEvents color="secondary" sx={{ mr: 1 }} />
            <Typography variant="h5" fontWeight="bold">{points} Points</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {badges.map((badge, idx) => (
              <Chip key={idx} icon={badge.icon} label={badge.label} color="info" variant="outlined" />
            ))}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Daily Goal: {dailyGoal} Sessions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completed Today: {completedToday} / {dailyGoal}
            </Typography>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default TherapyDashboard;
