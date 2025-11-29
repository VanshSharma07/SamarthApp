import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Grid, Typography, Chip, Tooltip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, TimeScale);

const MAX_HISTORY = 120; // keep last N samples for graph

const Tremor = ({ userId, onComplete }) => {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]); // {t, frequency, amplitude}
  const wsRef = useRef(null);
  const backendHost = window?.location?.hostname || 'localhost';
  const wsProtocol = window?.location?.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${backendHost}:5000/api/tremor/stream`;

  useEffect(() => {
    connect();
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addLog(msg) {
    setLogs(l => [ `${new Date().toLocaleTimeString()}: ${msg}`, ...l ].slice(0, 50));
  }

  function connect() {
    // if there's already an open or connecting socket, don't create another
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => { setConnected(true); addLog('Connected to server'); };
      ws.onclose = (ev) => { setConnected(false); addLog('Disconnected from server'); try { wsRef.current = null; } catch(e){} };
      ws.onerror = (e) => { setConnected(false); addLog('WebSocket error'); try { if (wsRef.current) wsRef.current.close(); } catch(e){} };
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'metrics') {
            setMetrics(data.metrics);
            // capture deviceId if present
            if (data.deviceId) setDeviceId(data.deviceId);
            addLog(`Metrics received from ${data.deviceId || 'device'}: freq=${data.metrics.tremor_frequency}Hz amp=${data.metrics.tremor_amplitude}`);

            // append to history for charting
            const now = data.timestamp || Date.now();
            setHistory(h => {
              const next = [{ t: now, frequency: data.metrics.tremor_frequency || 0, amplitude: data.metrics.tremor_amplitude || 0 }, ...h];
              if (next.length > MAX_HISTORY) next.pop();
              return next;
            });
          }
        } catch (e) { }
      };
      wsRef.current = ws;
    } catch (e) { addLog('Failed to create websocket'); }
  }

  function disconnect() {
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
    setConnected(false);
  }

  async function handleSave() {
    if (!userId) { addLog('Cannot save: userId missing'); return; }
    if (!metrics) { addLog('No metrics to save'); return; }
    try {
      const payload = { userId, metrics, timestamp: new Date().toISOString(), type: 'tremor' };
      if (deviceId) payload.deviceId = deviceId;
      const res = await fetch('/api/tremor/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        addLog('Saved assessment');
        if (onComplete) onComplete(json.data);
      } else {
        addLog('Save failed: ' + (json.error || json.message || 'unknown'));
      }
    } catch (e) { addLog('Save error'); }
  }

  const chartData = {
    datasets: [
      {
        label: 'Frequency (Hz)',
        data: history.map(h => ({ x: h.t, y: h.frequency })).reverse(),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        yAxisID: 'y1',
        tension: 0.2,
        pointRadius: 0
      },
      {
        label: 'Amplitude',
        data: history.map(h => ({ x: h.t, y: h.amplitude })).reverse(),
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        yAxisID: 'y2',
        tension: 0.2,
        pointRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    scales: {
      x: { type: 'time', time: { unit: 'second', tooltipFormat: 'HH:mm:ss' }, title: { display: false } },
      y1: { type: 'linear', position: 'left', title: { display: true, text: 'Hz' }, min: 0 },
      y2: { type: 'linear', position: 'right', title: { display: true, text: 'Amplitude' }, grid: { drawOnChartArea: false }, min: 0 }
    },
    plugins: { legend: { position: 'top' } }
  };

  // compute trend (linear slope) over last N history points
  function computeTrend(hist, points = 10) {
    if (!hist || hist.length < 2) return { slope: 0, direction: 'flat', tStat: 0, confidence: 0 };
    const slice = hist.slice(0, points).slice().reverse(); // chronological order
    if (slice.length < 2) return { slope: 0, direction: 'flat', tStat: 0, confidence: 0 };
    // linear regression y = a + b*x, compute b (slope)
    const t0 = slice[0].t / 1000.0; // seconds
    const xs = slice.map(p => (p.t / 1000.0) - t0);
    const ys = slice.map(p => p.frequency || 0);
    const n = xs.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    for (let i = 0; i < n; i++) {
      sumX += xs[i]; sumY += ys[i]; sumXY += xs[i] * ys[i]; sumXX += xs[i] * xs[i]; sumYY += ys[i] * ys[i];
    }
    const xbar = sumX / n; const ybar = sumY / n;
    const Sxx = sumXX - n * xbar * xbar;
    const Syy = sumYY - n * ybar * ybar;
    const Sxy = sumXY - n * xbar * ybar;
    let slope = 0;
    if (Math.abs(Sxx) < 1e-12) slope = 0; else slope = Sxy / Sxx; // Hz per second

    // estimate standard error of slope
    let tStat = 0; let confidence = 0;
    if (n > 2 && Math.abs(Sxx) > 1e-12) {
      const residualVar = (Syy - slope * Sxy) / (n - 2);
      const se_b = Math.sqrt(Math.max(0, residualVar)) / Math.sqrt(Math.max(1e-12, Sxx));
      if (se_b > 0) {
        tStat = slope / se_b;
        // confidence heuristic: map |t| to (0..1) via tanh for a quick interpretable metric
        confidence = Math.tanh(Math.abs(tStat) / 3);
      }
    }

    const thresh = 0.005; // Hz/sec small threshold
    let direction = 'flat';
    if (slope > thresh) direction = 'up';
    else if (slope < -thresh) direction = 'down';
    return { slope, direction, tStat, confidence };
  }

  const trend = computeTrend(history, 12);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">Smart Glove — Tremor Assessment</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>This assessment uses glove-mounted MPU sensors (ESP32). Connect your device to stream live tremor metrics.</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">Connection</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                {connected ? <Chip label="Connected" color="success" /> : <Chip label="Disconnected" color="error" />}
                {wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING && <CircularProgress size={16} />}
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>Device: <strong>{deviceId || '—'}</strong></Typography>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={connect} disabled={connected || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)} sx={{ mr: 1 }}>Connect</Button>
                <Button variant="outlined" onClick={disconnect} disabled={!connected && !(wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)} sx={{ mr: 1 }}>Disconnect</Button>
                <Button variant="text" onClick={() => { disconnect(); connect(); }}>Reconnect</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: 360 }}>
            <CardContent>
              <Typography variant="subtitle1">Real-time Metrics</Typography>
              <Box sx={{ height: 240 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box>
                    <Typography variant="caption">Frequency</Typography>
                    <Typography variant="h6">{metrics ? `${metrics.tremor_frequency} Hz` : '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                    <Tooltip title={`Slope: change in frequency per minute. Threshold: ${(0.005*60).toFixed(2)} Hz/min (~0.005 Hz/sec). Confidence is heuristic based on regression t-statistic.`}>
                      <span>
                        {trend.direction === 'up' && <TrendingUpIcon color="success" fontSize="small" />}
                        {trend.direction === 'down' && <TrendingDownIcon color="error" fontSize="small" />}
                        {trend.direction === 'flat' && <HorizontalRuleIcon color="disabled" fontSize="small" />}
                      </span>
                    </Tooltip>
                    <Typography variant="caption" sx={{ ml: 0.5 }}>{trend.slope ? `${(trend.slope*60).toFixed(3)} Hz/min` : ''}</Typography>
                    <Tooltip title={`Trend confidence (0-100%): heuristic from regression t-statistic. t=${trend.tStat ? trend.tStat.toFixed(2) : '0.00'}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                        <InfoOutlinedIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>{`${Math.round((trend.confidence || 0) * 100)}%`}</Typography>
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption">Amplitude</Typography>
                  <Typography variant="h6">{metrics ? `${metrics.tremor_amplitude}` : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Type</Typography>
                  <Typography variant="h6">{metrics ? metrics.tremor_type : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Severity</Typography>
                  <Typography variant="h6">{metrics ? metrics.severity : '—'}</Typography>
                </Box>
                <Box sx={{ marginLeft: 'auto' }}>
                  <Button variant="contained" onClick={handleSave} disabled={!metrics}>Save Assessment</Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Logs</Typography>
        <Box sx={{ maxHeight: 200, overflow: 'auto', background: '#fafafa', p: 1, borderRadius: 1 }}>
          {logs.map((l,i) => <Typography key={i} variant="caption" sx={{ display: 'block' }}>{l}</Typography>)}
        </Box>
      </Box>
    </Box>
  );
};

export default Tremor;