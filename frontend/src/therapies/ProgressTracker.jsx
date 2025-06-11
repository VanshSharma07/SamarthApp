import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * ProgressTracker component
 * Visualizes reps, accuracy, and trends using chart.js
 * Stores session data in localStorage for persistence
 *
 * Props:
 *   disorder: string
 *   exercise: string (optional)
 */
const ProgressTracker = ({ disorder, exercise }) => {
  const [progress, setProgress] = useState(() => {
    // Load from localStorage
    const key = `progress_${disorder}_${exercise || 'all'}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { reps: [], accuracy: [] };
  });

  // Example data for demonstration
  const labels = progress.reps.map((_, i) => `Session ${i + 1}`);
  const data = {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Reps',
        data: progress.reps,
        backgroundColor: '#6366f1',
        borderRadius: 6,
      },
      {
        type: 'line',
        label: 'Accuracy (%)',
        data: progress.accuracy,
        borderColor: '#f59e42',
        backgroundColor: '#f59e42',
        yAxisID: 'y1',
        tension: 0.4,
        pointRadius: 5,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Reps' } },
      y1: {
        beginAtZero: true,
        position: 'right',
        title: { display: true, text: 'Accuracy (%)' },
        grid: { drawOnChartArea: false },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <Box sx={{ mt: 4, mb: 2 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Progress Tracker
          </Typography>
          <Box sx={{ height: 320 }}>
            <Bar data={data} options={options} />
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default ProgressTracker;
