import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import api from '../../../services/api';
import WordListInsights from './WordListInsights';

export default function WordListResults({ testId, metrics = null, onClose, autoPoll = true, pollIntervalMs = 3000, pollTimeoutMs = 120000 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scores, setScores] = useState([]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get(`/tests/${testId}/results`);
      const data = resp.data && resp.data.data ? resp.data.data : resp.data;
      const arr = Array.isArray(data) ? data : [];
      setScores(arr);
      return arr;
    } catch (err) {
      console.error('Failed to fetch results', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch results');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If metrics are provided by the client, use them directly and skip polling/fetching
    if (metrics) {
      setScores(Array.isArray(metrics) ? metrics : []);
      return;
    }
    if (!testId) return;
    let cancelled = false;
    let intervalId = null;
    let timeoutId = null;

    const startPolling = async () => {
      const first = await fetchResults();
      if (cancelled) return;
      if (autoPoll) {
        // if empty, poll until results appear or timeout
        if (!first || first.length === 0) {
          intervalId = setInterval(async () => {
            const d = await fetchResults();
            // stop polling immediately when results arrive
            if (d && d.length > 0) {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
            }
          }, pollIntervalMs);

          timeoutId = setTimeout(() => {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }, pollTimeoutMs);
        }
      }
    };

    startPolling();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  if (!testId && !metrics) return <Typography>Please provide a test ID or metrics to view results.</Typography>;
  const hasZ = scores.some(s => s.zScore !== null && s.zScore !== undefined);
  const hasDetails = scores.some(s => s.details !== null && s.details !== undefined);
  const hasFlag = scores.some(s => s.flag !== null && s.flag !== undefined && s.flag !== false);
  const hasRecorded = scores.some(s => s.createdAt);

  const renderValue = (val, metric) => {
    if (val === null || val === undefined) return '-';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'object') {
      // For flags object, render active flags as comma list
      if (metric === 'flags') {
        try {
          const keys = Object.keys(val).filter(k => val[k]);
          return keys.length ? keys.join(', ') : '-';
        } catch (e) {
          return JSON.stringify(val);
        }
      }
      // compact JSON for other objects
      try { return JSON.stringify(val); } catch (e) { return String(val); }
    }
    return String(val);
  };

  const renderDetails = (details) => {
    if (!details) return '-';
    if (Array.isArray(details)) {
      // Try to render per-trial details compactly
      const parts = details.map(d => {
        if (d === null || d === undefined) return '-';
        if (typeof d === 'object') {
          const trial = d.trial != null ? `T${d.trial}` : '';
          if (Array.isArray(d.correctWords)) {
            return `${trial}: ${d.correctWords.join(', ')}`.trim();
          }
          if (d.correctWords) return `${trial}: ${String(d.correctWords)}`.trim();
          if (d.combinedText) return `${trial}: ${String(d.combinedText).slice(0,60)}`.trim();
          return JSON.stringify(d);
        }
        return String(d);
      });
      return <Box component="span">{parts.join(' — ')}</Box>;
    }
    if (typeof details === 'object') return <Box component="pre" sx={{ whiteSpace: 'pre-wrap', maxWidth: 400 }}>{JSON.stringify(details, null, 2)}</Box>;
    return String(details);
  };

  return (
    <Paper sx={{ p: 2 }} elevation={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Word List Results</Typography>
          <Box>
            {!metrics && <Button onClick={fetchResults} disabled={loading} sx={{ mr: 1 }}>Refresh</Button>}
            {onClose && <Button onClick={onClose}>Close</Button>}
          </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error">Error: {String(error)}</Typography>
      )}

      {!loading && !error && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell>Value</TableCell>
              {hasDetails && <TableCell>Details</TableCell>}
              {hasZ && <TableCell>Z-score</TableCell>}
              {hasFlag && <TableCell>Flag</TableCell>}
              {hasRecorded && <TableCell>Recorded</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s._id || `${s.metric}-${s.createdAt}`}>
                <TableCell sx={{ textTransform: 'capitalize' }}>{s.metric.replace(/_/g, ' ')}</TableCell>
                <TableCell>{renderValue(s.value, s.metric)}</TableCell>
                {hasDetails && <TableCell>{renderDetails(s.details)}</TableCell>}
                {hasZ && <TableCell>{s.zScore !== null && s.zScore !== undefined ? Number(s.zScore).toFixed(2) : '-'}</TableCell>}
                {hasFlag && <TableCell>{s.flag ? '⚠️' : '-'}</TableCell>}
                {hasRecorded && <TableCell>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Clinical insights panel */}
      <WordListInsights testId={testId} />
    </Paper>
  );
}
