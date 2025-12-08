import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import HyperventilationSignalGraph from './HyperventilationSignalGraph';
import useHyperventilationEEGStream from './useHyperventilationEEGStream';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_PHASES = [
  { name: 'baseline', min: 60, max: 120, default: 60 },
  { name: 'hyperventilation', min: 120, max: 180, default: 120 },
  { name: 'recovery', min: 60, max: 120, default: 60 }
];

const HyperventilationResponseTest = ({ userId: propUserId } = {}) => {
  const { user } = useAuth();
  const [testId, setTestId] = useState(null);
  const [phaseIndex, setPhaseIndex] = useState(-1); // -1 = intro, 0..2 phases, 3 = complete
  const [timers, setTimers] = useState(DEFAULT_PHASES.map(p => p.default));
  const [countdown, setCountdown] = useState(0);
  const [runningPhase, setRunningPhase] = useState(false);
  const { eegData, ecgData, hr, bands, spikeDetected, connected, connect, disconnect } = useHyperventilationEEGStream(testId);
  const [creating, setCreating] = useState(false);

  ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

  const bandsChartData = {
    labels: ['delta', 'theta', 'alpha', 'beta', 'gamma'],
    datasets: [{
      label: 'Band Power',
      data: [bands?.delta || 0, bands?.theta || 0, bands?.alpha || 0, bands?.beta || 0, bands?.gamma || 0],
      backgroundColor: ['#3f51b5','#2196f3','#4caf50','#ff9800','#9c27b0']
    }]
  };

  useEffect(() => {
    let t = null;
    if (runningPhase && countdown > 0) {
      t = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (runningPhase && countdown === 0) {
      // auto-end phase
      handlePhaseAction('end');
    }
    return () => clearTimeout(t);
  }, [runningPhase, countdown]);

  const createTest = async () => {
    try {
      setCreating(true);
      const actualUserId = propUserId || (user && user.id) || undefined;
      const resp = await fetch('/api/tests/hyperventilation/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: actualUserId }) });
      const text = await resp.text();
      let json = null;
      if (text) {
        try { json = JSON.parse(text); } catch (e) { console.warn('start test: non-JSON response', e); }
      }

      if (!resp.ok) {
        console.error('start test failed', resp.status, text);
        setCreating(false);
        return;
      }

      if (json && json.testId) {
        setTestId(json.testId);
        // connect ws after test created
        connect();
        setPhaseIndex(0);
      } else {
        console.warn('start test returned no testId', json, text);
      }
    } catch (e) { console.error(e); } finally { setCreating(false); }
  };

  const handlePhaseAction = async (action) => {
    if (phaseIndex < 0 || phaseIndex > 2) return;
    const phase = DEFAULT_PHASES[phaseIndex].name;
    const ts = new Date().toISOString();
    try {
      await fetch('/api/tests/hyperventilation/phase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testId, phase, action, timestamp: ts }) });
    } catch (e) { console.error(e); }

    if (action === 'start') {
      setCountdown(timers[phaseIndex]);
      setRunningPhase(true);
    } else if (action === 'end') {
      setRunningPhase(false);
      // advance to next phase or complete
      if (phaseIndex < 2) setPhaseIndex(phaseIndex + 1);
      else setPhaseIndex(3);
    }
  };

  const stopTest = async () => {
    try {
      await fetch('/api/tests/hyperventilation/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testId }) });
    } catch (e) { console.error(e); }
    setRunningPhase(false);
    setPhaseIndex(3);
    disconnect();
  };

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        {phaseIndex === -1 && (
          <Box>
            <Typography variant="h5">Hyperventilation Response Test</Typography>
            <Typography sx={{ mt: 1 }}>This test records EEG and ECG through three phases to observe any provoked abnormalities. This is not a diagnostic test.</Typography>
            <Typography sx={{ mt: 1, color: 'error.main' }}>Safety: Stop immediately if you feel dizzy, faint, or unwell.</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={createTest}>Start Test</Button>
          </Box>
        )}

        {phaseIndex >= 0 && phaseIndex <= 2 && (
          <Box>
            <Typography variant="h6">Phase: {DEFAULT_PHASES[phaseIndex].name}</Typography>
            <Typography>Time remaining: {new Date(countdown * 1000).toISOString().substr(14, 5)}</Typography>
            {DEFAULT_PHASES[phaseIndex].name === 'hyperventilation' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h5" color="error">Breathe deeply and rapidly for the next {timers[phaseIndex]} seconds</Typography>
                <Button variant="contained" color="error" sx={{ mt: 1 }} onClick={() => { setCountdown(0); handlePhaseAction('end'); }}>STOP IMMEDIATELY</Button>
              </Box>
            )}

            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <HyperventilationSignalGraph eegData={eegData} ecgData={ecgData} hr={hr} connected={connected} />
              </Box>

              <Paper sx={{ width: 320, p: 2 }}>
                <Typography variant="subtitle1">Band Powers</Typography>
                <div style={{ height: 160 }}>
                  <Bar data={bandsChartData} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
                </div>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Paper sx={{ p: 1, flex: 1 }}>
                    <Typography variant="subtitle2">Heart Rate</Typography>
                    <Typography variant="h5">{hr || '--'}</Typography>
                  </Paper>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">Spike</Typography>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: spikeDetected ? 'red' : 'grey.400', boxShadow: spikeDetected ? '0 0 8px red' : 'none', transition: 'all 200ms' }} />
                  </Box>
                </Box>
              </Paper>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              {!runningPhase ? (
                <Button variant="contained" onClick={() => handlePhaseAction('start')}>Start Phase</Button>
              ) : (
                <Button variant="outlined" onClick={() => handlePhaseAction('end')}>End Phase</Button>
              )}
              <Button onClick={stopTest} color="error">End Test</Button>
            </Box>
          </Box>
        )}

        {phaseIndex === 3 && (
          <Box>
            <Typography variant="h6">Test Complete</Typography>
            <Typography>Summary:</Typography>
            <ul>
              <li>Baseline: {timers[0]}s</li>
              <li>Hyperventilation: {timers[1]}s</li>
              <li>Recovery: {timers[2]}s</li>
            </ul>
            <Button variant="contained" onClick={() => window.print()}>Download Report (PDF)</Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default HyperventilationResponseTest;
