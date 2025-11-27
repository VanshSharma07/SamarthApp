import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Line, Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { useSearchParams } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const SessionReport = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/assessment/${sessionId}`).then(r => r.json()).then(res => {
      if (res && res.session) setData(res.session);
    }).catch(err => console.error(err));
  }, [sessionId]);

  if (!sessionId) return <Typography>Select a session to view the report (add ?sessionId=... in URL)</Typography>;
  if (!data) return <Typography>Loading report...</Typography>;

  const bandLabels = ['delta','theta','alpha','beta','gamma'];
  const bandValues = bandLabels.map(l => data.avgBands?.[l] || 0);

  const bandsChart = { labels: bandLabels, datasets: [{ label: 'Avg Band Power', data: bandValues, borderColor: '#3f51b5', backgroundColor: '#3f51b5', fill: false }] };

  const hrTrend = { labels: data.hrvStats?.rr ? data.hrvStats.rr.map((_,i) => i) : [], datasets: [{ label: 'HR (est)', data: data.hrStats?.avg ? [data.hrStats.avg] : [], borderColor: '#e91e63', fill: false }] };

  const spikesScatter = { datasets: [{ label: 'Spikes', data: (data.spikes || []).map(s => ({ x: s.timestamp - new Date(data.startTime).getTime(), y: s.amplitude })), backgroundColor: 'red' }] };

  const downloadPdf = async () => {
    // Simple print-friendly fallback: open print dialog for the window
    window.print();
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Session Report</Typography>
        <Button variant="contained" onClick={downloadPdf}>Download PDF</Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">Brainwave Averages</Typography>
        <Line data={bandsChart} options={{ plugins: { legend: { display: false } } }} />
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">HR Summary</Typography>
        <Typography>Average HR: {data.hrStats?.avg ?? 'N/A'}</Typography>
        <Typography>HR Min: {data.hrStats?.min ?? 'N/A'}  HR Max: {data.hrStats?.max ?? 'N/A'}</Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">HRV</Typography>
        <Typography>RMSSD: {data.hrvStats?.rmssd ?? 'N/A'} SDNN: {data.hrvStats?.sdnn ?? 'N/A'}</Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1">Spike Timeline</Typography>
        <Scatter data={spikesScatter} options={{ plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'ms from start' } } } }} />
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">Risk Score: {data.overallRiskScore ?? 'N/A'}</Typography>
      </Box>
    </Paper>
  );
};

export default SessionReport;
