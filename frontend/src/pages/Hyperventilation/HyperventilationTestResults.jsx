import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import hyperventilationService from '../../services/hyperventilationService.js';

const HyperventilationTestResults = ({ summary, testId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [savingToAssessments, setSavingToAssessments] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    // Auto-save to assessments on component mount
    handleSaveToAssessments();
  }, []);

  const handleSaveToAssessments = async () => {
    if (!user || !user.id) {
      setSnackbarMessage('User not authenticated');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setSavingToAssessments(true);
    try {
      await hyperventilationService.saveTestToAssessments(user.id, testId, summary);
      setSnackbarMessage('Test results saved to assessments');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error saving to assessments:', error);
      setSnackbarMessage('Failed to save results to assessments');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSavingToAssessments(false);
    }
  };

  if (!summary) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading results...</Typography>
      </Paper>
    );
  }

  const { phaseAnalysis, clinicalIndicators, epilepsyScreening } = summary;

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return 'error';
      case 'moderate':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'high':
        return <WarningIcon sx={{ color: 'error.main' }} />;
      case 'moderate':
        return <InfoIcon sx={{ color: 'warning.main' }} />;
      default:
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
    }
  };

  // Prepare band power comparison data
  const bandPowerData = Object.keys(phaseAnalysis).map(phase => ({
    phase,
    ...phaseAnalysis[phase].bandPowers
  }));

  // Prepare spike data comparison
  const spikeData = Object.keys(phaseAnalysis).map(phase => ({
    phase,
    spikes: phaseAnalysis[phase].abnormalities.spikeCount,
    slowing: phaseAnalysis[phase].abnormalities.slowingIndicator
  }));

  // Prepare amplitude data
  const amplitudeData = Object.keys(phaseAnalysis).map(phase => ({
    phase,
    mean: phaseAnalysis[phase].amplitude.mean,
    max: phaseAnalysis[phase].amplitude.max,
    min: phaseAnalysis[phase].amplitude.min
  }));

  const handlePrint = () => {
    window.print();
    setPrintDialogOpen(false);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Risk Summary Card */}
      <Paper sx={{ p: 3, mb: 3, borderLeft: `4px solid`, borderLeftColor: `${getRiskColor(epilepsyScreening.riskLevel)}.main` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {getRiskIcon(epilepsyScreening.riskLevel)}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Epilepsy Screening Result</Typography>
            <Chip
              label={epilepsyScreening.riskLevel.toUpperCase()}
              color={getRiskColor(epilepsyScreening.riskLevel)}
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
        <Alert severity={getRiskColor(epilepsyScreening.riskLevel)}>
          <AlertTitle>Clinical Assessment</AlertTitle>
          {epilepsyScreening.screeningFlag}
          <br />
          <strong>Recommended Action:</strong> {epilepsyScreening.recommendedAction}
        </Alert>
      </Paper>

      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Phase-by-Phase Analysis" />
          <Tab label="Band Power Comparison" />
          <Tab label="Abnormalities" />
          <Tab label="Clinical Indicators" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: Phase-by-Phase Analysis */}
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={3}>
                {Object.keys(phaseAnalysis).map(phaseName => {
                  const phase = phaseAnalysis[phaseName];
                  return (
                    <Grid item xs={12} md={4} key={phaseName}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ textTransform: 'capitalize', mb: 2 }}>
                            {phaseName} Phase
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">
                              Duration: {phase.duration}s | Samples: {phase.sampleCount}
                            </Typography>
                          </Box>

                          {/* Band Powers */}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Band Powers (%)
                          </Typography>
                          <Table size="small">
                            <TableBody>
                              {Object.entries(phase.bandPowers).map(([band, value]) => (
                                <TableRow key={band}>
                                  <TableCell sx={{ textTransform: 'capitalize' }}>{band}</TableCell>
                                  <TableCell align="right">{value}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>

                          {/* Amplitude */}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                            Amplitude (μV)
                          </Typography>
                          <Box sx={{ pl: 1 }}>
                            <Typography variant="body2">Mean: {phase.amplitude.mean}</Typography>
                            <Typography variant="body2">Max: {phase.amplitude.max}</Typography>
                            <Typography variant="body2">Min: {phase.amplitude.min}</Typography>
                          </Box>

                          {/* Abnormalities */}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                            Abnormalities
                          </Typography>
                          <Box sx={{ pl: 1 }}>
                            <Typography variant="body2">Spikes: {phase.abnormalities.spikeCount}</Typography>
                            <Typography variant="body2">Slowing: {phase.abnormalities.slowingIndicator}%</Typography>
                          </Box>

                          {/* Rhythmicity */}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                            Rhythmicity
                          </Typography>
                          <Chip
                            label={phase.rhythmicity.regular}
                            size="small"
                            color={phase.rhythmicity.regular === 'normal' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* Tab 1: Band Power Comparison Chart */}
          {activeTab === 1 && (
            <Box sx={{ height: 400, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                EEG Band Power Distribution Across Phases
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandPowerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis label={{ value: 'Power (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="delta" fill="#3f51b5" />
                  <Bar dataKey="theta" fill="#2196f3" />
                  <Bar dataKey="alpha" fill="#4caf50" />
                  <Bar dataKey="beta" fill="#ff9800" />
                  <Bar dataKey="gamma" fill="#9c27b0" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          {/* Tab 2: Abnormalities */}
          {activeTab === 2 && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Spike Activity
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={spikeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="phase" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="spikes" fill="#f44336" />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Slowing Indicator
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={spikeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="phase" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="slowing" fill="#ff9800" />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Tab 3: Clinical Indicators */}
          {activeTab === 3 && (
            <Box>
              <Alert severity={getRiskColor(clinicalIndicators.risk_level)} sx={{ mb: 3 }}>
                <AlertTitle>Overall Assessment</AlertTitle>
                {clinicalIndicators.overall_response}
              </Alert>

              <Typography variant="h6" sx={{ mb: 2 }}>
                Key Findings
              </Typography>
              {clinicalIndicators.findings && clinicalIndicators.findings.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  {clinicalIndicators.findings.map((finding, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <CheckCircleIcon sx={{ color: 'success.main', flexShrink: 0 }} />
                      <Typography>{finding}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="textSecondary">No significant findings</Typography>
              )}

              <Typography variant="h6" sx={{ mb: 2 }}>
                Phase Comparisons
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>Comparison</TableCell>
                      <TableCell>Finding</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clinicalIndicators.comparison && Object.entries(clinicalIndicators.comparison).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Clinical Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {clinicalIndicators.clinical_notes}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => setPrintDialogOpen(true)}
        >
          Download Report (PDF)
        </Button>
        <Button
          variant="outlined"
          startIcon={savingToAssessments ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSaveToAssessments}
          disabled={savingToAssessments}
        >
          {savingToAssessments ? 'Saving...' : 'Save to Assessments'}
        </Button>
      </Box>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)}>
        <DialogTitle>Download Report</DialogTitle>
        <DialogContent>
          <Typography>
            Print or save this page as PDF to generate a comprehensive report of your hyperventilation test results.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePrint} variant="contained">
            Print/Save as PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        severity={snackbarSeverity}
      />
    </Box>
  );
};

export default HyperventilationTestResults;
