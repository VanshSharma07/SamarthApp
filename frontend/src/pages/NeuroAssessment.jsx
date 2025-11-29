import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Container } from '@mui/material';
import LiveAssessmentScreen from './NeuroAssessment/LiveAssessmentScreen';
import PatientSessions from './NeuroAssessment/PatientSessions';
import SessionReport from './NeuroAssessment/SessionReport';

function a11yProps(index) {
  return {
    id: `neuro-tab-${index}`,
    'aria-controls': `neuro-tabpanel-${index}`,
  };
}

const NeuroAssessment = () => {
  const [tab, setTab] = React.useState(0);
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 6 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} aria-label="neuro-tabs">
          <Tab label="Live" {...a11yProps(0)} />
          <Tab label="Sessions" {...a11yProps(1)} />
          <Tab label="Report" {...a11yProps(2)} />
        </Tabs>
      </Box>

      <Box sx={{ mt: 3 }}>
        {tab === 0 && <LiveAssessmentScreen />}
        {tab === 1 && <PatientSessions onOpenReport={(id) => { navigate(`?sessionId=${id}`); setTab(2); }} />}
        {tab === 2 && <SessionReport />}
      </Box>
    </Container>
  );
};

export default NeuroAssessment;
