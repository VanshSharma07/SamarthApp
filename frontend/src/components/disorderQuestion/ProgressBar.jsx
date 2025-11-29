import React from 'react';
import { Box, Typography } from '@mui/material';

// Lightweight, aesthetic progress bar. Percent from 0..100
const ProgressBar = ({ percent = 0, height = 10 }) => {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <Box sx={{ width: '100%', my: 1 }}>
      <Box sx={{ width: '100%', position: 'relative', borderRadius: 99, overflow: 'hidden', boxShadow: '0 1px 6px rgba(16,24,40,0.04)' }}>
        <Box
          sx={{
            height: `${height}px`,
            width: '100%',
            background: 'linear-gradient(180deg, rgba(240,244,255,0.7), rgba(255,247,250,0.7))'
          }}
        />
        <Box
          role="progressbar"
          aria-valuenow={safe}
          aria-valuemin={0}
          aria-valuemax={100}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: `${height}px`,
            width: `${safe}%`,
            transition: 'width 480ms cubic-bezier(.2,.9,.2,1)',
            // soft pastel gradient fill
            background: 'linear-gradient(90deg, #cdeffd 0%, #d7f7e3 50%, #f6e6ff 100%)',
            boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.03)'
          }}
        />
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(10,20,40,0.7)',
            fontWeight: 600,
            fontSize: '0.75rem',
            pointerEvents: 'none'
          }}
        >
          {safe}%
        </Typography>
      </Box>
    </Box>
  );
};

export default ProgressBar;
