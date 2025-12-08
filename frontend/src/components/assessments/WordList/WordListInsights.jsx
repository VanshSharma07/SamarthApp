import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Chip, Button, Grid, Divider } from '@mui/material';
import api from '../../../services/api';

export default function WordListInsights({ testId }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!testId) return;
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await api.get(`/tests/${testId}/insights`);
        if (!cancelled) setInsight(resp.data || resp);
      } catch (err) {
        console.error('Failed to fetch insights', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [testId]);

  if (!testId) return null;

  return (
    <Paper sx={{ p:2, mt:2 }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Clinical Insights</Typography>
        {insight && (
          <Chip label={insight.severity ? insight.severity.toUpperCase() : 'N/A'} color={insight.severity === 'marked' ? 'error' : insight.severity === 'mild' ? 'warning' : 'success'} />
        )}
      </Box>

      {loading && <Typography>Loading insights…</Typography>}
      {error && <Typography color="error">{String(error)}</Typography>}

      {insight && (
        <Box sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Summary</Typography>
              <Paper sx={{ p:2, mt:1, backgroundColor: '#fafafa' }} elevation={0}>
                <Typography>{insight.summary}</Typography>
              </Paper>
              {insight.flags && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">Flags:</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{Object.keys(insight.flags).filter(k=>insight.flags[k]).join(', ') || 'None'}</Typography>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">Quick Stats</Typography>
              <Box sx={{ mt:1 }}>
                {insight.details && insight.details.map(d => (
                  <Box key={d.metric} sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{d.metric.replace(/_/g, ' ')}</Typography>
                    <Typography>{`Value: ${(() => {
                      const v = d.value;
                      if (v === null || v === undefined) return '-';
                      if (Array.isArray(v)) return v.join(', ');
                      if (typeof v === 'object') {
                        if (d.metric === 'flags') return Object.keys(v).filter(k=>v[k]).join(', ') || '-';
                        try { return JSON.stringify(v); } catch (e) { return String(v); }
                      }
                      return String(v);
                    })()}`}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1">Interpretation</Typography>
          {insight.details && insight.details.map(d => (
            <Box key={d.metric} sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{d.metric.replace(/_/g, ' ')}</Typography>
              <Typography sx={{ fontStyle: 'italic' }}>{d.message}</Typography>
            </Box>
          ))}

          <Box sx={{ mt:2 }}>
            <Typography variant="caption">This automated interpretation is informational only and not a diagnosis. Refer to a clinician for formal assessment.</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
