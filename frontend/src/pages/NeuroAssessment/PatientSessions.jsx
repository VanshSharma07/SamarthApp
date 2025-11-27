import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useAuth } from '../../contexts/AuthContext';

const PatientSessions = ({ onOpenReport }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/assessment/patient/${user.id}`).then(r => r.json()).then(data => {
      if (data && data.sessions) {
        const mapped = data.sessions.map(s => ({
          id: s._id,
          date: new Date(s.startTime).toLocaleString(),
          duration: s.endTime ? Math.round((new Date(s.endTime) - new Date(s.startTime)) / 1000) + 's' : 'ongoing',
          alphaBetaRatio: s.avgBands && s.avgBands.beta ? (s.avgBands.alpha / s.avgBands.beta).toFixed(2) : 'N/A',
          hrAvg: s.hrStats ? s.hrStats.avg : 'N/A',
          spikes: s.spikes ? s.spikes.length : 0,
          risk: s.overallRiskScore ?? 0
        }));
        setRows(mapped);
      }
    }).catch(err => console.error(err)).finally(() => setLoading(false));
  }, [user]);

  const columns = [
    { field: 'date', headerName: 'Date', flex: 1 },
    { field: 'duration', headerName: 'Duration', width: 110 },
    { field: 'alphaBetaRatio', headerName: 'Avg Alpha/Beta', width: 140 },
    { field: 'hrAvg', headerName: 'HR Avg', width: 110 },
    { field: 'spikes', headerName: 'Spikes', width: 100 },
    { field: 'risk', headerName: 'Risk Score', width: 120 }
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Your Sessions</Typography>
        <Button onClick={() => window.location.reload()} size="small">Refresh</Button>
      </Box>
      <div style={{ height: 480, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} loading={loading} pageSizeOptions={[10]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} onRowDoubleClick={(params) => { if (onOpenReport) onOpenReport(params.id); }} />
      </div>
    </Paper>
  );
};

export default PatientSessions;
