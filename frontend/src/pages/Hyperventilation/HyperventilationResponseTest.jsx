import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
import HyperventilationSignalGraph from './HyperventilationSignalGraph';
import HyperventilationCautionModal from './HyperventilationCautionModal';
import HyperventilationTestResults from './HyperventilationTestResults';
import useHyperventilationEEGStream from './useHyperventilationEEGStream';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_PHASES = [
  { name: 'baseline', min: 60, max: 120, default: 60 },
  { name: 'hyperventilation', min: 60, max: 120, default: 60 },
  { name: 'recovery', min: 60, max: 120, default: 60 }
];

const HyperventilationResponseTest = ({ userId: propUserId } = {}) => {
  const { user } = useAuth();
  const [testId, setTestId] = useState(null);
  const [phaseIndex, setPhaseIndex] = useState(-1); // -1 = intro, 0..2 phases, 3 = complete
  const [timers, setTimers] = useState(DEFAULT_PHASES.map(p => p.default));
  const [countdown, setCountdown] = useState(0);
  const [runningPhase, setRunningPhase] = useState(false);
  const [showCaution, setShowCaution] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const { eegData, bands, spikeDetected, connected, connect, disconnect } = useHyperventilationEEGStream(testId); // Only EEG
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
      setShowCaution(false); // Close modal after agreement
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
        // connect ws after test created with explicit testId to avoid stale state
        connect(json.testId);
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
      setLoadingResults(true);
      const resp = await fetch('/api/tests/hyperventilation/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testId }) });
      const json = await resp.json();
      console.log('Complete test response:', { status: resp.status, ok: resp.ok, json });
      
      if (resp.ok && json.summary) {
        console.log('Setting test results:', json.summary);
        setTestResults(json.summary);
      } else if (resp.ok && json.success === false) {
        console.error('Test completion failed:', json.message, json.debug);
        alert(`Test completion failed: ${json.message}\n\nPlease check:\n- WebSocket connection was active\n- All phases were completed\n- Data was being captured\n\nDebug info: ${JSON.stringify(json.debug || {})}`);
        setTestResults(null);
      } else {
        console.error('Unexpected response format or error:', json);
        alert('Failed to complete test. The server response was unexpected. Please try again or contact support.');
        setTestResults(null);
      }
    } catch (e) { 
      console.error('stopTest error:', e); 
      alert('An error occurred while completing the test: ' + e.message);
      setTestResults(null);
    } finally {
      setLoadingResults(false);
      setRunningPhase(false);
      setPhaseIndex(3);
      disconnect();
    }
  };

  return (
    <Box>
      <HyperventilationCautionModal
        open={showCaution}
        onProceed={createTest}
        onCancel={() => setShowCaution(false)}
      />
      <Paper sx={{ p: 2 }}>
        {phaseIndex === -1 && (
          <Box>
            <Typography variant="h5">Hyperventilation Response Test</Typography>
            <Typography sx={{ mt: 1 }}>This test records EEG through three phases to observe any provoked abnormalities. This is not a diagnostic test.</Typography>
            <Typography sx={{ mt: 1, color: 'error.main' }}>Safety: Stop immediately if you feel dizzy, faint, or unwell.</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => setShowCaution(true)}>Start Test</Button>
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
                <HyperventilationSignalGraph eegData={eegData} connected={connected} />
              </Box>

              <Paper sx={{ width: 320, p: 2 }}>
                <Typography variant="subtitle1">Band Powers</Typography>
                <div style={{ height: 160 }}>
                  <Bar data={bandsChartData} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
                </div>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
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
            {loadingResults ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography>Processing your test results...</Typography>
              </Box>
            ) : testResults ? (
              <HyperventilationTestResults summary={testResults} testId={testId} />
            ) : (
              <Box>
                <Typography variant="h6">Test Complete</Typography>
                <Typography sx={{ mt: 2 }}>Results are being processed. Please wait.</Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default HyperventilationResponseTest;
