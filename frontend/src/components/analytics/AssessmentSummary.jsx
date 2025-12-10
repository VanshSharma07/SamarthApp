import { Box, Grid, Paper, Typography, Divider, useTheme, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import LineChart from '../charts/LineChart';
import { ZoomIn, ZoomOut, FullscreenExit } from '@mui/icons-material';
import { useState, useRef } from 'react';

const AssessmentSummary = ({ assessments, title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [expandedChart, setExpandedChart] = useState(null);
  const chartRefs = useRef({});

  if (!assessments || assessments.length === 0) {
    return null;
  }
  
  const groupedByType = {};
  
  // Group assessments by type
  assessments.forEach(assessment => {
    if (!groupedByType[assessment.type]) {
      groupedByType[assessment.type] = [];
    }
    groupedByType[assessment.type].push(assessment);
  });
  
  // Sort assessments within each type by timestamp
  Object.keys(groupedByType).forEach(type => {
    groupedByType[type].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  });
  
  // Prepare data for progress charts - improved with null safety
  const prepareChartData = (assessments, metricAccessor) => {
    const sortedByDate = [...assessments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Extract data safely with fallbacks to 0 for undefined values
    const chartData = sortedByDate.map(assessment => {
      const value = metricAccessor(assessment);
      // Return 0 if value is undefined or NaN
      return value === undefined || value === null || isNaN(value) ? 0 : Number(value);
    });
    
    // Format dates consistently
    const labels = sortedByDate.map(a => {
      const date = new Date(a.timestamp);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    });
    
    return {
      labels: labels,
      datasets: [{
        label: 'Score',
        data: chartData,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        pointBackgroundColor: 'rgb(75, 192, 192)'
      }]
    };
  };
  
  // Helper function to get the most recent value for a metric
  const getMostRecentValue = (assessmentArray, metricAccessor, defaultValue = 'N/A') => {
    if (!assessmentArray || assessmentArray.length === 0) return defaultValue;
    const mostRecent = assessmentArray[0]; // First one is most recent (sorted above)
    try {
      const value = metricAccessor(mostRecent);
      return value !== undefined && value !== null ? value : defaultValue;
    } catch (error) {
      console.warn("Error accessing metric:", error);
      return defaultValue;
    }
  };

  // Safely extract metrics for specific assessment types
  const getMetricSafely = (assessment, path) => {
    try {
      const parts = path.split('.');
      let current = assessment;
      for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
      }
      return current;
    } catch (error) {
      return undefined;
    }
  };

  // Responsive card sizes
  const cardSize = isMobile ? 12 : isTablet ? 12 : 6;
  
  // Responsive typography sizes
  const titleVariant = isMobile ? "h6" : "h5";
  const cardTitleVariant = isMobile ? "subtitle1" : "h6";
  const labelVariant = isMobile ? "caption" : "subtitle2";
  const valueVariant = isMobile ? "body1" : "h6";

  // Responsive spacing
  const gridSpacing = isMobile ? 2 : 3;
  const innerGridSpacing = isMobile ? 1 : 2;
  const paperPadding = isMobile ? 1.5 : 2;
  const chartHeight = isMobile ? 160 : 180; // Reduced height to prevent overflow

  // Chart container styles to prevent overflow
  const chartContainerStyle = {
    mt: isMobile ? 1 : 2, 
    height: chartHeight,
    width: '100%',
    position: 'relative', 
    overflow: 'auto',
    '& canvas': {
      maxWidth: '100%',
    }
  };

  // Enhanced chart options for interactivity
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: isMobile ? 8 : 10 }
        }
      },
      x: {
        ticks: {
          font: { size: isMobile ? 8 : 10 },
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Reset zoom for a specific chart
  const handleResetZoom = (chartId) => {
    if (chartRefs.current[chartId]) {
      chartRefs.current[chartId].resetZoom();
    }
  };

  // Expanded chart container style
  const expandedContainerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 1300,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3
  };

  // Expand a chart to full screen
  const toggleExpandChart = (chartId) => {
    if (expandedChart === chartId) {
      setExpandedChart(null);
    } else {
      setExpandedChart(chartId);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {title && (
        <Typography variant={titleVariant} gutterBottom sx={{ px: isMobile ? 1 : 0 }}>
          {title}
        </Typography>
      )}
      
      <Grid container spacing={gridSpacing}>
        {/* Tremor Assessment Summary */}
        {groupedByType.tremor && groupedByType.tremor.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Tremor Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Current Severity
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.tremor, a => a.metrics?.severity)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Tremor Type
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.tremor, a => a.metrics?.tremor_type)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Frequency
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.tremor, a => `${a.metrics?.tremor_frequency || 0} Hz`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Tremor Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.tremor, 
                      a => getMetricSafely(a, 'metrics.overall.tremorScore') !== undefined ? 
                        `${getMetricSafely(a, 'metrics.overall.tremorScore')}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.tremor.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('tremor')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'tremor' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('tremor')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['tremor'] = ref}
                    data={prepareChartData(
                      groupedByType.tremor, 
                      a => getMetricSafely(a, 'metrics.overall.tremorScore')
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Speech Pattern Assessment Summary */}
        {groupedByType.speechPattern && groupedByType.speechPattern.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Speech Pattern Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Clarity Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.speechPattern, a => `${getMetricSafely(a, 'metrics.clarity.score') || 0}/10`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Words Per Minute
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.speechPattern, a => getMetricSafely(a, 'metrics.speechRate.wordsPerMinute'))}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Volume Control
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.speechPattern, a => `${getMetricSafely(a, 'metrics.volumeControl.score') || 0}/10`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Overall Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.speechPattern, a => `${a.metrics?.overallScore || 0}/10`)}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.speechPattern.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('speechPattern')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'speechPattern' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('speechPattern')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['speechPattern'] = ref}
                    data={prepareChartData(
                      groupedByType.speechPattern, 
                      a => a.metrics?.overallScore
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Response Time Assessment Summary */}
        {groupedByType.responseTime && groupedByType.responseTime.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Response Time Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Average Response
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.responseTime, a => a.metrics.averageResponseTime)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Fastest Response
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.responseTime, a => a.metrics.fastestResponse)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Slowest Response
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.responseTime, a => a.metrics.slowestResponse)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Response Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.responseTime, 
                      a => (a.metrics.overall?.responseScore !== undefined) ? `${a.metrics.overall.responseScore}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.responseTime.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('responseTime')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'responseTime' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('responseTime')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['responseTime'] = ref}
                    data={prepareChartData(
                      groupedByType.responseTime, 
                      a => a.metrics.overall?.responseScore
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Finger Tapping Assessment Summary */}
        {groupedByType.fingerTapping && groupedByType.fingerTapping.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Finger Tapping Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Frequency
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.fingerTapping, a => `${a.metrics.frequency}/10`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Accuracy
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.fingerTapping, a => `${a.metrics.accuracy}/10`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Rhythm
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.fingerTapping, a => `${a.metrics.rhythm}/10`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Overall Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.fingerTapping, a => `${a.metrics.overallScore}/10`)}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.fingerTapping.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('fingerTapping')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'fingerTapping' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('fingerTapping')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['fingerTapping'] = ref}
                    data={prepareChartData(
                      groupedByType.fingerTapping, 
                      a => a.metrics.overallScore
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Facial Symmetry Assessment Summary */}
        {groupedByType.facialSymmetry && groupedByType.facialSymmetry.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Facial Symmetry Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Symmetry Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.facialSymmetry, a => `${a.symmetry_score || 0}/100`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Eye Symmetry
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.facialSymmetry, a => `${getMetricSafely(a, 'metrics.eye_symmetry') || 'N/A'}`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Mouth Symmetry
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.facialSymmetry, a => `${getMetricSafely(a, 'metrics.mouth_symmetry') || 'N/A'}`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Face Tilt
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.facialSymmetry, a => `${getMetricSafely(a, 'metrics.face_tilt') || 0}°`)}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.facialSymmetry.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('facialSymmetry')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'facialSymmetry' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('facialSymmetry')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['facialSymmetry'] = ref}
                    data={prepareChartData(
                      groupedByType.facialSymmetry, 
                      a => parseFloat(a.symmetry_score || 0)
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Eye Movement Assessment Summary */}
        {groupedByType.eyeMovement && groupedByType.eyeMovement.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Eye Movement Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Velocity Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.eyeMovement, 
                      a => getMetricSafely(a, 'metrics.overall.velocityScore') !== undefined ? 
                        `${getMetricSafely(a, 'metrics.overall.velocityScore')}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Accuracy Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.eyeMovement, 
                      a => getMetricSafely(a, 'metrics.overall.accuracyScore') !== undefined ? 
                        `${getMetricSafely(a, 'metrics.overall.accuracyScore')}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Smoothness Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.eyeMovement, 
                      a => getMetricSafely(a, 'metrics.overall.smoothnessScore') !== undefined ? 
                        `${getMetricSafely(a, 'metrics.overall.smoothnessScore')}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Composite Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.eyeMovement, 
                      a => getMetricSafely(a, 'metrics.overall.compositeScore') !== undefined ? 
                        `${getMetricSafely(a, 'metrics.overall.compositeScore')}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.eyeMovement.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('eyeMovement')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'eyeMovement' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('eyeMovement')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['eyeMovement'] = ref}
                    data={prepareChartData(
                      groupedByType.eyeMovement, 
                      a => getMetricSafely(a, 'metrics.overall.compositeScore')
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Neck Mobility Assessment Summary */}
        {groupedByType.neckMobility && groupedByType.neckMobility.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Neck Mobility Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Flexion
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.neckMobility, a => `${a.metrics.flexion?.degrees || 0}°`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Extension
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.neckMobility, a => `${a.metrics.extension?.degrees || 0}°`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Mobility Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.neckMobility, 
                      a => (a.metrics.overall?.mobilityScore !== undefined) ? `${a.metrics.overall.mobilityScore}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Symmetry Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.neckMobility, 
                      a => (a.metrics.overall?.symmetryScore !== undefined) ? `${a.metrics.overall.symmetryScore}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.neckMobility.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('neckMobility')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'neckMobility' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('neckMobility')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['neckMobility'] = ref}
                    data={prepareChartData(
                      groupedByType.neckMobility, 
                      a => a.metrics.overall?.mobilityScore
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
        
        {/* Gait Analysis Assessment Summary */}
        {groupedByType.gaitAnalysis && groupedByType.gaitAnalysis.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Gait Analysis Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Stability Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.gaitAnalysis, a => `${a.metrics.stability?.score || 0}/10`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Balance Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.gaitAnalysis, a => `${a.metrics.balance?.score || 0}/10`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Walking Speed
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.gaitAnalysis, a => `${a.metrics.gait?.speed || 0} m/s`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Mobility Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(
                      groupedByType.gaitAnalysis, 
                      a => (a.metrics.overall?.mobilityScore !== undefined) ? `${a.metrics.overall.mobilityScore}/10` : 'N/A'
                    )}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.gaitAnalysis.length > 1 && (
                <Box sx={chartContainerStyle}>
                  <LineChart 
                    data={prepareChartData(groupedByType.gaitAnalysis, a => a.metrics.overall?.stabilityScore)}
                    title="Stability Score Trend"
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Word List Memory Test Summary */}
        {(groupedByType.wordlist || groupedByType.word_list) && (groupedByType.wordlist?.length > 0 || groupedByType.word_list?.length > 0) && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Word List Memory Test
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Immediate Recall %
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.wordlist || groupedByType.word_list, a => `${(a.metrics.immediate_percent || 0).toFixed(1)}%`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Immediate Total
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.wordlist || groupedByType.word_list, a => a.metrics.immediate_total_correct || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Delayed Recall
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.wordlist || groupedByType.word_list, a => a.metrics.delayed_correct || 'N/A')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Retention %
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.wordlist || groupedByType.word_list, a => `${(a.metrics.retention_percent || 0).toFixed(1)}%`)}
                  </Typography>
                </Grid>
              </Grid>
              
              {((groupedByType.wordlist?.length || 0) + (groupedByType.word_list?.length || 0)) > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('wordlist')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'wordlist' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('wordlist')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['wordlist'] = ref}
                    data={prepareChartData(
                      groupedByType.wordlist || groupedByType.word_list, 
                      a => a.metrics.immediate_percent
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Stroop Test Summary */}
        {groupedByType.stroop && groupedByType.stroop.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Stroop Test
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Accuracy
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.stroop, a => {
                      const acc = a.metrics.accuracy || (a.metrics.score && a.metrics.total ? (a.metrics.score / a.metrics.total * 100) : 0);
                      return `${acc.toFixed(1)}%`;
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Score
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.stroop, a => `${a.metrics.score || 0}/${a.metrics.total || 0}`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Test Status
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.stroop, a => a.status || 'COMPLETED')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Total Trials
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.stroop, a => a.metrics.total || 0)}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.stroop.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('stroop')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'stroop' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('stroop')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['stroop'] = ref}
                    data={prepareChartData(
                      groupedByType.stroop, 
                      a => a.metrics.accuracy || (a.metrics.score && a.metrics.total ? (a.metrics.score / a.metrics.total * 100) : 0)
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Neuro (EEG/ECG) Assessment Summary */}
        {groupedByType.neuro && groupedByType.neuro.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Neuro (EEG/ECG) Assessment
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Seizure Risk
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.neuro, a => `${(a.metrics.seizure_risk || 0).toFixed(1)}/100`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    EEG Status
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.neuro, a => a.metrics.eeg_abnormality || 'Normal')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Seizure Duration
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.neuro, a => `${a.metrics.seizure_duration || 0}s`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Test Status
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.neuro, a => a.status || 'completed')}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.neuro.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('neuro')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'neuro' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('neuro')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['neuro'] = ref}
                    data={prepareChartData(
                      groupedByType.neuro, 
                      a => a.metrics.seizure_risk
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Hyperventilation Response Test Summary */}
        {groupedByType.hyperventilation && groupedByType.hyperventilation.length > 0 && (
          <Grid item xs={12} md={cardSize}>
            <Paper sx={{ p: paperPadding, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant={cardTitleVariant} gutterBottom>
                Hyperventilation Response Test
              </Typography>
              <Divider sx={{ mb: isMobile ? 1 : 2 }} />
              
              <Grid container spacing={innerGridSpacing}>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Baseline HR
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.hyperventilation, a => `${a.metrics.baseline_hr || a.metrics.baselineHR || 0} bpm`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    HV HR
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.hyperventilation, a => `${a.metrics.hv_hr || a.metrics.hvHR || 0} bpm`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    Recovery HR
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.hyperventilation, a => `${a.metrics.recovery_hr || a.metrics.recoveryHR || 0} bpm`)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant={labelVariant} color="text.secondary">
                    HV Response
                  </Typography>
                  <Typography variant={valueVariant}>
                    {getMostRecentValue(groupedByType.hyperventilation, a => a.metrics.hv_response || a.metrics.hvResponse || 'Normal')}
                  </Typography>
                </Grid>
              </Grid>
              
              {groupedByType.hyperventilation.length > 1 && (
                <Box sx={{ ...chartContainerStyle, flexGrow: 1, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title="Reset Zoom">
                      <IconButton size="small" onClick={() => handleResetZoom('hyperventilation')}>
                        <ZoomOut fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={expandedChart === 'hyperventilation' ? "Exit Fullscreen" : "Fullscreen"}>
                      <IconButton size="small" onClick={() => toggleExpandChart('hyperventilation')}>
                        <FullscreenExit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <LineChart 
                    chartRef={(ref) => chartRefs.current['hyperventilation'] = ref}
                    data={prepareChartData(
                      groupedByType.hyperventilation, 
                      a => a.metrics.baseline_hr || a.metrics.baselineHR
                    )}
                    options={chartOptions}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AssessmentSummary;
