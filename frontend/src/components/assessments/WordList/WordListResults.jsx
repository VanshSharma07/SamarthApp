import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import api from '../../../services/api';
import WordListInsights from './WordListInsights';

export default function WordListResults({ testId, onClose, autoPoll = true, pollIntervalMs = 3000, pollTimeoutMs = 120000 }) {
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

  if (!testId) return <Typography>Please provide a test ID to view results.</Typography>;

  return (
    <Paper sx={{ p: 2 }} elevation={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Word List Results</Typography>
        <Box>
          <Button onClick={fetchResults} disabled={loading} sx={{ mr: 1 }}>Refresh</Button>
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
              <TableCell>Details</TableCell>
              <TableCell>Z-score</TableCell>
              <TableCell>Flag</TableCell>
              <TableCell>Recorded</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s._id || `${s.metric}-${s.createdAt}`}>
                <TableCell sx={{ textTransform: 'capitalize' }}>{s.metric}</TableCell>
                <TableCell>{s.value !== null && s.value !== undefined ? String(s.value) : '-'}</TableCell>
                <TableCell>
                  {s.details ? (
                    Array.isArray(s.details) ? (
                      <Box component="span">{s.details.join(', ')}</Box>
                    ) : typeof s.details === 'object' ? (
                      <Box component="pre" sx={{ whiteSpace: 'pre-wrap', maxWidth: 400 }}>{JSON.stringify(s.details, null, 2)}</Box>
                    ) : (
                      <span>{String(s.details)}</span>
                    )
                  ) : ('-')}
                </TableCell>
                <TableCell>{s.zScore !== null && s.zScore !== undefined ? Number(s.zScore).toFixed(2) : '-'}</TableCell>
                <TableCell>{s.flag ? '⚠️' : '-'}</TableCell>
                <TableCell>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}</TableCell>
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
