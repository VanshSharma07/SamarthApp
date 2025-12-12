import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Tabs,
  Tab,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Rating
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export const HybridGaitInsights = ({ hybridMetrics, cvMetrics, sensorMetrics }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!hybridMetrics) {
    return (
      <Alert severity="info">
        No hybrid metrics available. Complete the assessment with sensor data to see insights.
      </Alert>
    );
  }

  // Safety checks for data structure
  const safeHybridMetrics = hybridMetrics || {};
  const safeSummary = safeHybridMetrics.summary || {};
  const safeAbnormalities = safeHybridMetrics.abnormalities || [];
  const safeRecommendations = safeHybridMetrics.recommendations || [];
  const safeInsights = safeHybridMetrics.insights || [];
  
  const overallScore = safeSummary.overallAssessment?.score || 0;
  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50'; // Green
    if (score >= 60) return '#ff9800'; // Orange
    if (score >= 40) return '#ff5722'; // Red-Orange
    return '#f44336'; // Red
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardHeader
          title="Hybrid Gait Analysis Results"
          subheader="Combined Computer Vision + Sensor Metrics"
          sx={{ color: 'white' }}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>Overall Score</Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: getScoreColor(overallScore),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.5rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {overallScore}
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {overallScore >= 80 ? '✓ Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Poor'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom>Assessment Duration</Typography>
              <Typography variant="h5">{safeSummary.overallAssessment?.duration || 'N/A'}</Typography>
              <Typography variant="caption" color="textSecondary">
                {safeHybridMetrics.sampleCount || 0} sensor samples
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom>Gait Status</Typography>
              <Chip
                label={safeAbnormalities.length === 0 ? 'Normal' : 'Abnormalities Detected'}
                color={safeAbnormalities.length === 0 ? 'success' : 'error'}
                size="small"
              />
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                {safeAbnormalities.length} abnormalities
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom>Sensor Status</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={safeSummary.sensorStatus?.fsr || 'Inactive'}
                  size="small"
                  color={safeSummary.sensorStatus?.fsr === 'Active' ? 'success' : 'default'}
                />
                <Chip
                  label={safeSummary.sensorStatus?.imu || 'Inactive'}
                  size="small"
                  color={safeSummary.sensorStatus?.imu === 'Active' ? 'success' : 'default'}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Key Metrics Summary" />
        <CardContent>
          <Grid container spacing={2}>
            {safeSummary.keyMetrics && Object.entries(safeSummary.keyMetrics).map(([key, value]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card variant="outlined">
                  <CardContent sx={{ pb: 1 }}>
                    <Typography color="textSecondary" variant="caption" component="div" sx={{ textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1')}
                    </Typography>
                    <Typography variant="h6" component="div">{value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs for detailed insights */}
      <Card>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Insights & Findings" />
          <Tab label="Joint Angles & Posture" />
          <Tab label="Gait Timing" />
          <Tab label="Balance & Stability" />
          <Tab label="Pressure Distribution" />
          <Tab label="Abnormalities" />
          <Tab label="Recommendations" />
        </Tabs>

        <CardContent>
          {/* Tab 1: Insights */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Key Findings</Typography>
              {safeInsights.length > 0 ? (
                <List>
                  {safeInsights.map((insight, idx) => (
                    <React.Fragment key={idx}>
                      <ListItem alignItems="flex-start">
                        <ListItemIcon>
                          {insight.priority === 'Critical' ? (
                            <ErrorIcon sx={{ color: '#f44336' }} />
                          ) : insight.severity ? (
                            <WarningIcon sx={{ color: '#ff9800' }} />
                          ) : (
                            <InfoIcon sx={{ color: '#2196f3' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" gap={1} alignItems="center">
                              <Typography variant="subtitle2">{insight.category}</Typography>
                              <Chip label={insight.finding} size="small" variant="outlined" />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" component="span">{insight.interpretation}</Typography>
                              <Typography variant="caption" component="span" display="block" sx={{ mt: 0.5, color: 'text.disabled' }}>
                                Source: {insight.source}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="success">No significant abnormalities detected</Alert>
              )}
            </Box>
          )}

          {/* Tab 2: Joint Angles */}
          {tabValue === 1 && safeHybridMetrics.hybrid?.jointAngles && (
            <Box>
              <Typography variant="h6" gutterBottom>Joint Angles & Posture</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>Joint</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Assessment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(safeHybridMetrics.hybrid.jointAngles).map(([joint, data]) => (
                      <TableRow key={joint}>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{joint}</TableCell>
                        <TableCell>
                          {typeof data === 'object' && data.cv ? `${data.cv}°` : '-'}
                        </TableCell>
                        <TableCell>
                          {typeof data === 'object' && data.accuracy ? data.accuracy : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 3: Gait Timing */}
          {tabValue === 2 && safeHybridMetrics.hybrid?.gaitTiming && (
            <Box>
              <Typography variant="h6" gutterBottom>Gait Timing Parameters</Typography>
              <Grid container spacing={2}>
                {Object.entries(safeHybridMetrics.hybrid.gaitTiming).map(([param, data]) => (
                  <Grid item xs={12} sm={6} md={4} key={param}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" variant="caption" component="div" sx={{ textTransform: 'capitalize' }}>
                          {param.replace(/([A-Z])/g, ' $1')}
                        </Typography>
                        <Typography variant="h6" component="div">
                          {typeof data === 'object' && data.sensor ? data.sensor : data}
                        </Typography>
                        {typeof data === 'object' && data.assessment && (
                          <Typography variant="caption" color="textSecondary">
                            {data.assessment}
                          </Typography>
                        )}
                        {typeof data === 'object' && data.normalRange && (
                          <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
                            Normal: {data.normalRange}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Tab 4: Balance & Stability */}
          {tabValue === 3 && safeHybridMetrics.hybrid?.stability && (
            <Box>
              <Typography variant="h6" gutterBottom>Stability Metrics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2">Postural Stability</Typography>
                      <Typography variant="h5" sx={{ my: 2 }}>
                        {safeHybridMetrics.hybrid?.stability?.overallScore?.combined || 0}/100
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={safeHybridMetrics.hybrid?.stability?.overallScore?.combined || 0}
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption">
                        {safeHybridMetrics.hybrid?.stability?.overallScore?.assessment || 'Unable to assess'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2">Dynamic Sway</Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          ML Sway: {safeHybridMetrics.hybrid?.stability?.dynamicSway?.mlSway?.toFixed(2) || 'N/A'} m/s²
                        </Typography>
                        <Typography variant="body2">
                          AP Sway: {safeHybridMetrics.hybrid?.stability?.dynamicSway?.apSway?.toFixed(2) || 'N/A'} m/s²
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {safeHybridMetrics.hybrid?.stability?.harmonicRatio && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2">Harmonic Ratio</Typography>
                        <Typography variant="h6" sx={{ my: 1 }}>
                          {safeHybridMetrics.hybrid.stability.harmonicRatio.ratio?.toFixed(2) || 'N/A'}
                        </Typography>
                        <Chip
                          label={safeHybridMetrics.hybrid.stability.harmonicRatio.quality || 'Unknown'}
                          size="small"
                          color={safeHybridMetrics.hybrid.stability.harmonicRatio.quality === 'Good' ? 'success' : 'warning'}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Tab 5: Pressure Distribution */}
          {tabValue === 4 && safeHybridMetrics.hybrid?.pressure && (
            <Box>
              <Typography variant="h6" gutterBottom>Foot Pressure Distribution</Typography>
              <Grid container spacing={2}>
                {['left', 'right'].map((foot) => (
                  <Grid item xs={12} md={6} key={foot}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 2 }}>
                          {foot} Foot Pressure Map
                        </Typography>
                        {safeHybridMetrics.hybrid?.pressure?.[foot] && (
                          <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2 }}>
                              {[1, 2, 3, 4, 5, 6].map((sensor) => (
                                <Card key={sensor} variant="outlined">
                                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                    <Typography variant="caption">Sensor {sensor}</Typography>
                                    <Typography variant="h6" component="div">
                                      {safeHybridMetrics.hybrid.pressure[foot][`sensor${sensor}`] || 0}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              ))}
                            </Box>
                            <Divider />
                            <Typography variant="body2" sx={{ mt: 2 }}>
                              Heel Ratio: {safeHybridMetrics.hybrid.pressure[foot].heelRatio?.toFixed(1) || 'N/A'}%
                            </Typography>
                            <Typography variant="body2">
                              Forefoot Ratio: {safeHybridMetrics.hybrid.pressure[foot].forefootRatio?.toFixed(1) || 'N/A'}%
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Tab 6: Abnormalities */}
          {tabValue === 5 && (
            <Box>
              <Typography variant="h6" gutterBottom>Detected Abnormalities</Typography>
              {safeAbnormalities.length > 0 ? (
                <List>
                  {safeAbnormalities.map((abnormality, idx) => (
                    <React.Fragment key={idx}>
                      <ListItem alignItems="flex-start">
                        <ListItemIcon>
                          <ErrorIcon sx={{ color: '#f44336' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={abnormality.type || abnormality}
                          secondary={abnormality.description || JSON.stringify(abnormality)}
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="success">✓ No abnormalities detected</Alert>
              )}
            </Box>
          )}

          {/* Tab 7: Recommendations */}
          {tabValue === 6 && (
            <Box>
              <Typography variant="h6" gutterBottom>Clinical Recommendations</Typography>
              {safeRecommendations.length > 0 ? (
                safeRecommendations.map((rec, idx) => (
                  <Card key={idx} sx={{ mb: 2 }} variant="outlined">
                    <CardContent>
                      <Box display="flex" gap={1} alignItems="flex-start" mb={1}>
                        <Chip
                          label={rec.priority}
                          size="small"
                          color={
                            rec.priority === 'Critical' ? 'error' :
                            rec.priority === 'High' ? 'warning' : 'info'
                          }
                        />
                        <Typography variant="subtitle2">{rec.category}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Recommendation:</strong> {rec.recommendation}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: 'textSecondary' }}>
                        <strong>Rationale:</strong> {rec.rationale}
                      </Typography>
                      {rec.examples && (
                        <Typography variant="body2">
                          <strong>Examples:</strong> {rec.examples.join(', ')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert severity="info">No specific recommendations needed</Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default HybridGaitInsights;
