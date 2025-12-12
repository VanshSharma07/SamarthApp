import { useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Grid, Chip, Divider, List, ListItem, ListItemText, ListItemIcon, Button, Snackbar, Input } from '@mui/material';
import { fetchAiAnalysis, uploadPdfForAnalysis } from '../../services/assessmentService';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RecommendIcon from '@mui/icons-material/Recommend';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { exportAiAnalysisToPdf } from '../../utils/pdfExport';

const AiAnalysisPanel = ({ userId, patientName = 'Patient' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [pdfFile, setPdfFile] = useState(null);

  const handleAnalyzeReport = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('User requested AI analysis for user ID:', userId);
      
      const results = await fetchAiAnalysis(userId);
      console.log('AI analysis results received:', results ? 'yes' : 'no');
      setAiResults(results);
      setLoading(false);
      
      setSnackbar({
        open: true,
        message: 'Analysis completed successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
      setError('Failed to fetch AI analysis results: ' + (err.message || 'Unknown error'));
      setLoading(false);
      
      setSnackbar({
        open: true,
        message: 'Analysis failed',
        severity: 'error'
      });
    }
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      setSnackbar({
        open: true,
        message: 'Only PDF files are allowed',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPdfFile(file);
      console.log('Uploading PDF for AI analysis:', file.name);
      
      const results = await uploadPdfForAnalysis(userId, file);
      console.log('PDF AI analysis results received:', results ? 'yes' : 'no');
      setAiResults(results);
      setLoading(false);
      
      setSnackbar({
        open: true,
        message: 'PDF analysis completed successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error uploading PDF for analysis:', err);
      setError('Failed to analyze PDF: ' + (err.message || 'Unknown error'));
      setLoading(false);
      setPdfFile(null);
      
      setSnackbar({
        open: true,
        message: 'PDF analysis failed',
        severity: 'error'
      });
    }
  };

  const handleExportPdf = () => {
    try {
      console.log('Exporting AI analysis to PDF');
      const success = exportAiAnalysisToPdf(aiResults, patientName);
      
      setSnackbar({
        open: true,
        message: success ? 'Report exported successfully!' : 'Failed to export report',
        severity: success ? 'success' : 'error'
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setSnackbar({
        open: true,
        message: 'Error exporting report: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Helper function to render risk level with appropriate color
  const renderRiskLevel = (riskLevel) => {
    let color = 'success';
    let icon = <CheckCircleIcon fontSize="small" />;
    
    if (riskLevel === 'moderate') {
      color = 'warning';
      icon = <WarningIcon fontSize="small" />;
    } else if (riskLevel === 'high') {
      color = 'error';
      icon = <ErrorIcon fontSize="small" />;
    }
    
    return (
      <Chip 
        icon={icon}
        label={riskLevel.toUpperCase()} 
        color={color} 
        size="small" 
        variant="outlined"
      />
    );
  };

  // Helper function to render a disorder section
  const renderDisorderSection = (disorderName, disorderData) => {
    if (!disorderData) return null;
    
    return (
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">{disorderName}</Typography>
          {renderRiskLevel(disorderData.riskLevel)}
        </Box>
        
        {disorderData.confidence && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Confidence: {disorderData.confidence}%
          </Typography>
        )}
        
        <Divider sx={{ my: 1 }} />
        
        {disorderData.indicators && disorderData.indicators.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Indicators:</Typography>
            <List dense>
              {disorderData.indicators.map((indicator, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemIcon sx={{ minWidth: 30 }}>•</ListItemIcon>
                  <ListItemText primary={indicator} />
                </ListItem>
              ))}
            </List>
          </>
        )}
        
        {disorderData.recommendations && disorderData.recommendations.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Recommendations:</Typography>
            <List dense>
              {disorderData.recommendations.map((rec, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <RecommendIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={rec} />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Paper>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
          AI Analysis
        </Typography>
        
      <Box sx={{ display: 'flex', gap: 2 }}>
          {!loading && !aiResults && (
            <>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AnalyticsIcon />}
                onClick={handleAnalyzeReport}
                disabled={loading}
              >
                Analyse Report with AI
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                startIcon={<CloudUploadIcon />}
                component="label"
                disabled={loading}
              >
                Upload PDF
                <Input
                  hidden
                  accept=".pdf"
                  type="file"
                  onChange={handlePdfUpload}
                />
              </Button>
            </>
          )}
          
          {aiResults && (
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPdf}
            >
              Export to PDF
            </Button>
          )}
        </Box>
      </Box>
      
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Generating AI analysis. This may take a moment...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      )}
      
      {!loading && !aiResults && !error && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
          <AnalyticsIcon color="primary" sx={{ fontSize: 60, opacity: 0.7, mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No AI Analysis Available
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 600 }}>
            Click the "Analyse Report with AI" button to generate an assessment of potential neurological conditions based on the patient's data.
          </Typography>
        </Box>
      )}
      
      {aiResults && (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              {renderDisorderSection("Parkinson's Disease", aiResults.parkinsonsDisease)}
            </Grid>
            <Grid item xs={12} md={4}>
              {renderDisorderSection("Alzheimer's Disease", aiResults.alzheimersDisease)}
            </Grid>
            <Grid item xs={12} md={4}>
              {renderDisorderSection("Epilepsy", aiResults.epilepsy)}
            </Grid>
          </Grid>
          
          {aiResults.overallAssessment && (
            <Paper sx={{ p: 2, my: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h6">Overall Assessment</Typography>
              <Typography variant="body1">{aiResults.overallAssessment}</Typography>
            </Paper>
          )}
          
          {aiResults.disclaimerNote && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {aiResults.disclaimerNote}
            </Alert>
          )}
        </Box>
      )}
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default AiAnalysisPanel;
