import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Grid, Paper, Typography, Chip } from '@mui/material';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, TimeScale } from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, TimeScale);

// Vite uses `import.meta.env` for environment variables (no global `process` in browser)
const WS_URL = import.meta.env.VITE_NEURO_WS || 'ws://localhost:5000/api/assessment/stream';

const clampArray = (arr, maxLen) => (arr.length > maxLen ? arr.slice(arr.length - maxLen) : arr);

const LiveAssessmentScreen = () => {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerRef = useRef(null);

  // Data buffers
  const [eegData, setEegData] = useState([]);
  const [ecgData, setEcgData] = useState([]);
  const [bands, setBands] = useState({ delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 });
  const [hr, setHr] = useState(0);
  const [hrv, setHrv] = useState(0);
  const [spikeDetected, setSpikeDetected] = useState(false);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setSessionTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const connectWs = () => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setRunning(false); };
    ws.onerror = (e) => console.error('WS error', e);
    ws.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data);
        if (d && d.type === 'device_status') {
          setDeviceConnected(!!d.connected);
          return;
        }
        if (d.eeg_raw) setEegData(prev => clampArray(prev.concat(d.eeg_raw), 512));
        if (d.ecg_raw) setEcgData(prev => clampArray(prev.concat(d.ecg_raw), 512));
        if (d.bands) setBands(d.bands);
        if (typeof d.hr !== 'undefined') setHr(d.hr);
        if (typeof d.hrv !== 'undefined') setHrv(d.hrv);
        if (d.spikeDetected) {
          setSpikeDetected(true);
          setTimeout(() => setSpikeDetected(false), 800);
        }
      } catch (e) { console.error('ws parse', e); }
    };
  };

  const start = async () => {
    try {
      // start session via backend and only mark running when successful
      const resp = await fetch('/api/assessment/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: user.id }) });
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json || !json.success) {
        console.error('Failed to start assessment session', json || resp.statusText);
        // If a session is already running on the server, attempt a graceful stop and retry once
        if (json && typeof json.message === 'string' && json.message.toLowerCase().includes('session already running')) {
          try {
            console.log('Existing session detected on server — attempting to stop it and retry start');
            await fetch('/api/assessment/stop', { method: 'POST' });
            // retry start once
            const resp2 = await fetch('/api/assessment/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: user.id }) });
            const json2 = await resp2.json().catch(() => null);
            if (resp2.ok && json2 && json2.success) {
              setRunning(true);
              connectWs();
              return;
            }
            console.error('Retry to start session failed', json2 || resp2.statusText);
          } catch (e) {
            console.error('Error while attempting to stop existing session and retry:', e);
          }
        }
        return;
      }
      setRunning(true);
      connectWs();
    } catch (e) { console.error(e); }
  };

  const stop = async () => {
    try {
      await fetch('/api/assessment/stop', { method: 'POST' });
      setRunning(false);
      if (wsRef.current) wsRef.current.close();
    } catch (e) { console.error(e); }
  };

  const eegChartData = {
    labels: eegData.map((_, i) => i),
    datasets: [{ label: 'EEG', data: eegData, borderColor: '#3f51b5', tension: 0.2, pointRadius: 0 }]
  };

  const ecgChartData = {
    labels: ecgData.map((_, i) => i),
    datasets: [{ label: 'ECG', data: ecgData, borderColor: '#e91e63', tension: 0.1, pointRadius: 0 }]
  };

  const bandsChartData = {
    labels: ['delta', 'theta', 'alpha', 'beta', 'gamma'],
    datasets: [{ label: 'Band Power', data: [bands.delta, bands.theta, bands.alpha, bands.beta, bands.gamma], backgroundColor: ['#3f51b5','#2196f3','#4caf50','#ff9800','#9c27b0'] }]
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
              <Button variant={running ? 'outlined' : 'contained'} color="primary" onClick={running ? stop : start}>{running ? 'Stop Assessment' : 'Start Assessment'}</Button>
                <Chip label={connected ? 'WS Connected' : 'WS Disconnected'} color={connected ? 'success' : 'default'} />
                <Chip label={deviceConnected ? 'Device Connected' : 'Device Offline'} color={deviceConnected ? 'success' : 'default'} />
              <Typography sx={{ ml: 'auto' }}><strong>Timer:</strong> {new Date(sessionTimer * 1000).toISOString().substr(11, 8)}</Typography>
            </Box>

            <Typography variant="subtitle1">EEG (Live)</Typography>
            <Line data={eegChartData} options={{ animation: false, plugins: { legend: { display: false } }, scales: { x: { display: false } } }} />

            {ecgData && ecgData.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">ECG (Live)</Typography>
                <Line data={ecgChartData} options={{ animation: false, plugins: { legend: { display: false } }, scales: { x: { display: false } } }} />
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Band Powers</Typography>
            <Bar data={bandsChartData} options={{ plugins: { legend: { display: false } } }} />
            <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
              <Paper sx={{ p: 1, flex: 1 }}>
                <Typography variant="subtitle2">Heart Rate</Typography>
                <Typography variant="h5">{hr || '--'}</Typography>
              </Paper>
              <Paper sx={{ p: 1, flex: 1 }}>
                <Typography variant="subtitle2">HRV (RMSSD)</Typography>
                <Typography variant="h6">{hrv || '--'}</Typography>
              </Paper>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle2">Spike</Typography>
              <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: spikeDetected ? 'red' : 'grey.400', boxShadow: spikeDetected ? '0 0 8px red' : 'none', transition: 'all 200ms' }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LiveAssessmentScreen;
