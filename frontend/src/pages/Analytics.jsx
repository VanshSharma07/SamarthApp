import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Container,
  Menu,
  MenuItem,
} from "@mui/material";
import Layout from "../components/Layout";
import AssessmentCard from "../components/analytics/AssessmentCard";
import AssessmentDetailDialog from "../components/analytics/AssessmentDetailDialog";
import AssessmentSummary from "../components/analytics/AssessmentSummary";
import AiAnalysisPanel from "../components/analytics/AiAnalysisPanel";
import ExportReportPanel from "../components/analytics/ExportReportPanel";
import { fetchAllAssessments } from "../services/assessmentService";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import RefreshIcon from "@mui/icons-material/Refresh";
import FolderSpecialIcon from "@mui/icons-material/FolderSpecial";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BarChartIcon from "@mui/icons-material/BarChart";
import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import { useAuth } from "../contexts/AuthContext";
import WelcomeDashboard from "../components/analytics/WelcomeDashboard";
import { seedIfNoAssessments } from "../utils/seedTestData";
import DebugPanel from '../components/shared/DebugPanel';

const Analytics = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [seeding, setSeeding] = useState(false);

  // Get assessment type counts for export panel
  const getAssessmentTypes = useCallback(() => {
    const types = {};
    assessments.forEach((assessment) => {
      const type = assessment.type;
      if (!types[type]) {
        types[type] = {
          type,
          name: getAssessmentDisplayName(type),
          count: 0,
        };
      }
      types[type].count++;
    });
    return Object.values(types);
  }, [assessments]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewDetails = (assessment) => {
    try {
      console.log('Showing details for assessment:', assessment);
      if (!assessment?.metrics) {
        console.warn('Assessment missing metrics:', assessment);
        return;
      }
      setSelectedAssessment(assessment);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Error showing assessment details:', error);
      // Optionally show error to user
    }
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
  };

  const handleSortClick = (event) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortSelect = (value) => {
    setSortBy(value);
    handleSortClose();
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (value) => {
    setFilterType(value);
    handleFilterClose();
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  // Helper function to get display name for assessment types
  const getAssessmentDisplayName = (type) => {
    const typeMap = {
      tremor: "Tremor Assessment",
      speechPattern: "Speech Pattern",
      responseTime: "Response Time",
      neckMobility: "Neck Mobility",
      gaitAnalysis: "Gait Analysis",
      fingerTapping: "Finger Tapping",
      facialSymmetry: "Facial Symmetry",
      eyeMovement: "Eye Movement",
      wordlist: "Word List Memory Test",
      word_list: "Word List Memory Test",
      stroop: "Stroop Test",
      // neuro: "Neuro (EEG/ECG) Assessment",
      hyperventilation: "Hyperventilation Response Test",
      neurobot: "Conversational Screening"
    };

    return typeMap[type] || typeMap[type.toLowerCase()] || type;
  };

  // Handle seeding test data
  const handleSeedTestData = async () => {
    if (!userId) return;

    setSeeding(true);
    try {
      await seedTestAssessments(userId);
      // Refresh the data after seeding
      await fetchData();
    } catch (error) {
      console.error("Error seeding test data:", error);
      setError("Failed to seed test data. Please try again.");
    } finally {
      setSeeding(false);
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      if (!userId) return;

      setLoading(true);
      setError(null);
      const data = await fetchAllAssessments(userId);
      setAssessments(data);

      // If we have data returned, we're done
      if (data && data.length > 0) {
        setLoading(false);
        return;
      }

      // If we're in development mode, we could automatically seed test data
      if (import.meta.env.DEV) {
        console.log(
          "In development mode with no assessments, seeding test data..."
        );
        await seedIfNoAssessments(userId);
        // Fetch again with the new data
        const seededData = await fetchAllAssessments(userId);
        setAssessments(seededData || []);
      }

      setLoading(false);
    } catch (err) {
      setError("Failed to load assessment data. Please try again later.");
      setLoading(false);
      console.error("Error fetching assessments:", err);
    }
  }, [userId]);

  // Filter and sort assessments
  useEffect(() => {
    let result = [...assessments];

    // Apply filter
    if (filterType !== "all") {
      result = result.filter((assessment) => assessment.type === filterType);
    }

    // Apply sorting
    switch (sortBy) {
      case "date-desc":
        result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case "date-asc":
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        break;
      case "type":
        result.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case "score-desc":
        result.sort((a, b) => {
          const scoreA =
            a.metrics.overall?.compositeScore || a.metrics.overallScore || 0;
          const scoreB =
            b.metrics.overall?.compositeScore || b.metrics.overallScore || 0;
          return scoreB - scoreA;
        });
        break;
      case "score-asc":
        result.sort((a, b) => {
          const scoreA =
            a.metrics.overall?.compositeScore || a.metrics.overallScore || 0;
          const scoreB =
            b.metrics.overall?.compositeScore || b.metrics.overallScore || 0;
          return scoreA - scoreB;
        });
        break;
      default:
        break;
    }

    setFilteredAssessments(result);
  }, [assessments, filterType, sortBy]);

  // Fetch assessments when component mounts or userId changes
  useEffect(() => {
    fetchData();
  }, [fetchData, userId]);

  // Add debug state
  const [debugInfo, setDebugInfo] = useState({
    userId: user?.id,
    isLoading: loading,
    hasError: !!error,
    assessmentCount: assessments.length,
    filteredCount: filteredAssessments.length
  });
  
  // Update debug info when key states change
  useEffect(() => {
    setDebugInfo({
      userId: user?.id,
      isLoading: loading,
      hasError: !!error,
      errorMessage: error,
      assessmentCount: assessments.length,
      filteredCount: filteredAssessments.length,
      seeding: seeding,
      lastApiCall: new Date().toISOString()
    });
  }, [user?.id, loading, error, assessments.length, filteredAssessments.length, seeding]);

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}>
              <AssessmentIcon fontSize="large" />
              Assessment Analytics
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {import.meta.env.DEV && assessments.length === 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleSeedTestData}
                  disabled={loading || seeding}>
                  {seeding ? "Seeding..." : "Seed Test Data"}
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading || seeding}>
                Refresh
              </Button>
            </Box>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Monitor your progress across different assessments and analyze your
            performance over time.
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="analytics tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              ".MuiTab-root": {
                minHeight: 48,
                py: 1,
                fontWeight: "medium",
                textTransform: "capitalize",
              },
            }}>
            <Tab
              icon={<BarChartIcon />}
              iconPosition="start"
              label="Assessment Results"
            />
            <Tab
              icon={<FolderSpecialIcon />}
              iconPosition="start"
              label="Assessment Summary"
            />
            <Tab
              icon={<TroubleshootIcon />}
              iconPosition="start"
              label="AI Analysis"
            />
            <Tab
              icon={<SortIcon />}
              iconPosition="start"
              label="Export Report"
            />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : assessments.length === 0 ? (
          // Show welcome dashboard when there are no assessments
          <WelcomeDashboard />
        ) : (
          <>
            {/* Tab Panel 1: Assessment Results */}
            {tabValue === 0 && (
              <>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 3,
                  }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FilterListIcon />}
                      onClick={handleFilterClick}>
                      Filter{" "}
                      {filterType !== "all" &&
                        `(${getAssessmentDisplayName(filterType)})`}
                    </Button>
                    <Menu
                      anchorEl={filterAnchorEl}
                      open={Boolean(filterAnchorEl)}
                      onClose={handleFilterClose}>
                      <MenuItem onClick={() => handleFilterSelect("all")}>
                        All
                      </MenuItem>
                      <MenuItem onClick={() => handleFilterSelect("tremor")}>
                        Tremor
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("speechPattern")}>
                        Speech Pattern
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("responseTime")}>
                        Response Time
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("neckMobility")}>
                        Neck Mobility
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("gaitAnalysis")}>
                        Gait Analysis
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("fingerTapping")}>
                        Finger Tapping
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("facialSymmetry")}>
                        Facial Symmetry
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("eyeMovement")}>
                        Eye Movement
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleFilterSelect("neurobot")}>
                        Conversational Screening
                      </MenuItem>
                    </Menu>
                    <Button
                      variant="outlined"
                      startIcon={<SortIcon />}
                      onClick={handleSortClick}>
                      Sort
                    </Button>
                    <Menu
                      anchorEl={sortAnchorEl}
                      open={Boolean(sortAnchorEl)}
                      onClose={handleSortClose}>
                      <MenuItem onClick={() => handleSortSelect("date-desc")}>
                        Date (Newest)
                      </MenuItem>
                      <MenuItem onClick={() => handleSortSelect("date-asc")}>
                        Date (Oldest)
                      </MenuItem>
                      <MenuItem onClick={() => handleSortSelect("type")}>
                        Type
                      </MenuItem>
                      <MenuItem onClick={() => handleSortSelect("score-desc")}>
                        Score (Highest)
                      </MenuItem>
                      <MenuItem onClick={() => handleSortSelect("score-asc")}>
                        Score (Lowest)
                      </MenuItem>
                    </Menu>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Showing {filteredAssessments.length} of {assessments.length}{" "}
                    assessments
                  </Typography>
                </Box>

                {filteredAssessments.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom>
                      No assessments found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {filterType !== "all"
                        ? `No ${getAssessmentDisplayName(
                            filterType
                          )} assessments available. Try a different filter.`
                        : "Start completing assessments to see your results here."}
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {filteredAssessments.map((assessment) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        key={assessment.id || assessment._id}>
                        <AssessmentCard
                          assessment={assessment}
                          onViewDetails={handleViewDetails}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}

            {/* Tab Panel 2: Assessment Summary */}
            {tabValue === 1 && (
              <Box>
                {assessments.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom>
                      No assessment data available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Complete assessments to view your summary data and
                      progress over time.
                    </Typography>
                  </Paper>
                ) : (
                  <AssessmentSummary
                    assessments={assessments}
                    title="Assessment Progress Summary"
                  />
                )}
              </Box>
            )}

            {/* Tab Panel 3: AI Analysis */}
            {tabValue === 2 && (
              <Box>
                {assessments.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: "center" }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom>
                      No assessment data available for analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Complete multiple assessments to receive AI-powered
                      analysis of your neuromotor health.
                    </Typography>
                  </Paper>
                ) : (
                  <AiAnalysisPanel userId={userId} />
                )}
              </Box>
            )}

            {/* Tab Panel 4: Export Report */}
            {tabValue === 3 && (
              <Box>
                <ExportReportPanel
                  userId={userId}
                  assessmentTypes={getAssessmentTypes()}
                  fullAssessmentData={assessments}
                />
              </Box>
            )}
          </>
        )}

        <AssessmentDetailDialog
          open={detailDialogOpen}
          onClose={handleCloseDetailDialog}
          assessment={selectedAssessment}
        />

        {/* Add debug panel at the bottom of the page, only visible in dev mode */}
        {import.meta.env.DEV && (
          <DebugPanel data={debugInfo} title="Analytics Debug Info" />
        )}
      </Container>
    </Layout>
  );
};

export default Analytics;
