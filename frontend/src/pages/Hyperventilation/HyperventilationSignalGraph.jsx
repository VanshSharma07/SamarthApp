import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const HyperventilationSignalGraph = ({ eegData = [], ecgData = [], hr = 0, connected = false }) => {
  const eegChart = { labels: eegData.map((_, i) => i), datasets: [{ label: 'EEG', data: eegData, borderColor: '#3f51b5', tension: 0.2, pointRadius: 0 }] };
  const ecgChart = { labels: ecgData.map((_, i) => i), datasets: [{ label: 'ECG', data: ecgData, borderColor: '#e91e63', tension: 0.1, pointRadius: 0 }] };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">Live Signals {connected ? '(connected)' : '(disconnected)'}</Typography>
        <Typography>HR: {hr || '--'}</Typography>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">EEG</Typography>
        <Line data={eegChart} options={{ animation: false, plugins: { legend: { display: false } }, scales: { x: { display: false } } }} />
      </Box>
      {ecgData && ecgData.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">ECG</Typography>
          <Line data={ecgChart} options={{ animation: false, plugins: { legend: { display: false } }, scales: { x: { display: false } } }} />
        </Box>
      )}
    </Paper>
  );
};

export default HyperventilationSignalGraph;
