import { useState } from 'react';
import { 
  Box, 
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  useTheme,
  Paper,
  Divider,
  Chip,
  Badge,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import { 
  Assessment, 
  Timeline, 
  Person, 
  Settings,
  Analytics,
  TrendingUp,
  Speed,
  Assignment,
  LocalHospital,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Info as InfoIcon // Add this new import for the About icon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from './Layout';
import { motion } from 'framer-motion';

// Styled Motion components
const MotionCard = motion(Card);
const MotionContainer = motion(Container);
const MotionPaper = motion(Paper);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Add loading state for user
  if (!user) {
    return (
      <Layout>
        <Box sx={{ 
          p: 4, 
          textAlign: 'center', 
          borderRadius: 2,
          backgroundColor: 'background.paper',
          boxShadow: 1,
          mt: 4
        }}>
          <Typography variant="h5" color="text.secondary">Please log in to access dashboard</Typography>
        </Box>
      </Layout>
    );
  }

  // Feature cards configuration - replace the healthScore card with aboutSamarth
  const featureCards = [
    {
      id: 'assessments',
      title: 'Assessments',
      value: '8',
      subtitle: 'Total evaluations',
      icon: Assessment,
      route: '/assessment',
      color: '#FF9F43'
    },
    {
      id: 'progress',
      title: 'Progress',
      value: '75%',
      subtitle: 'Monthly improvement',
      icon: TrendingUp,
      route: '/analytics',
      color: '#4CAF50'
    },
    {
      id: 'therapies',
      title: 'Therapies',
      value: '3',
      subtitle: 'Available treatments',
      icon: LocalHospital,
      route: '/therapy',
      color: '#9C27B0'
    },
    {
      id: 'aboutSamarth',
      title: 'About Samarth',
      value: 'Learn more',
      subtitle: 'Platform overview',
      icon: InfoIcon,
      route: '/about',
      color: '#2196F3'
    }
  ];

  // Quick action buttons
  const quickActions = [
    {
      id: 'newAssessment',
      title: 'Start New Assessment',
      icon: Assessment,
      route: '/assessment',
      color: '#FF6B6B',
      gradientEnd: '#FF8E8E',
      hoverStart: '#FF5252',
      hoverEnd: '#FF7676'
    },
    {
      id: 'viewAnalytics',
      title: 'View Analytics',
      icon: Analytics,
      route: '/analytics',
      color: '#2196F3',
      gradientEnd: '#21CBF3',
      hoverStart: '#1E88E5',
      hoverEnd: '#1CB5E0'
    },
    {
      id: 'updateProfile',
      title: 'Update Profile',
      icon: Person,
      route: '/profile',
      color: '#4CAF50',
      gradientEnd: '#81C784',
      hoverStart: '#43A047',
      hoverEnd: '#66BB6A'
    }
  ];

  // Recent activity list (example data)
  const recentActivities = [
    {
      id: 1,
      type: 'assessment',
      title: 'Eye Movement Assessment',
      date: '2 days ago',
      status: 'completed',
      score: '92/100'
    },
    {
      id: 2,
      type: 'therapy',
      title: 'Balance Therapy Session',
      date: '1 week ago',
      status: 'completed',
      duration: '45 min'
    },
    {
      id: 3,
      type: 'assessment',
      title: 'Response Time Assessment',
      date: '2 weeks ago',
      status: 'completed',
      score: '87/100'
    }
  ];

  // Helper to get corresponding icon based on activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'assessment':
        return Assessment;
      case 'therapy':
        return LocalHospital;
      default:
        return Timeline;
    }
  };

  return (
    <Layout>
      <MotionContainer 
        maxWidth="xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Welcome Section */}
        <MotionPaper 
          elevation={3}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          sx={{
            mb: 4,
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Color accent at top of card */}
          <Box sx={{ 
            height: 6, 
            width: '100%', 
            backgroundColor: '#9C27B0',
            position: 'absolute',
            top: 0,
            left: 0
          }} />
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold',
                mb: 1,
                background: 'linear-gradient(45deg, #FFFFFF 30%, #E0E0E0 90%)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'User'}! 👋
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
              Your health journey dashboard
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/assessment')}
                sx={{
                  borderRadius: 8,
                  px: 3,
                  py: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                Continue Your Journey
              </Button>
            </Box>
          </Box>
          
          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '300px',
              height: '100%',
              background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%)',
              transform: 'skewX(-20deg)',
              transformOrigin: 'top right'
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              right: 80,
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.08)',
            }}
          />
        </MotionPaper>

        {/* Stats Grid */}
        <Box sx={{ mb: 5 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3, 
              fontWeight: 600,
              px: isMobile ? 2 : 0
            }}
          >
            Your Health Overview
          </Typography>
          
          <Grid container spacing={3}>
            {featureCards.map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={card.id}>
                <MotionCard 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 6,
                    },
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                  onClick={() => navigate(card.route)}
                >
                  {/* Color accent at top of card */}
                  <Box sx={{ 
                    height: 6, 
                    width: '100%', 
                    backgroundColor: card.color
                  }} />
                  
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mb: 2 
                    }}>
                      <Box 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: '50%', 
                          backgroundColor: `${card.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <card.icon sx={{ 
                          fontSize: 28, 
                          color: card.color
                        }} />
                      </Box>
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {card.title}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        mb: 1, 
                        fontWeight: 'bold',
                        color: card.color
                      }}
                    >
                      {card.value}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      {card.subtitle}
                    </Typography>
                    
                    {/* Subtle decorative elements */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        bgcolor: `${card.color}08`,
                        zIndex: 0
                      }}
                    />
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ mb: 5 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3, 
              fontWeight: 600,
              px: isMobile ? 2 : 0 
            }}
          >
            Quick Actions
          </Typography>
          
          <Grid container spacing={3}>
            {quickActions.map((action, index) => (
              <Grid item xs={12} md={4} key={action.id}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Button 
                    variant="contained" 
                    fullWidth 
                    size="large"
                    startIcon={<action.icon />}
                    onClick={() => navigate(action.route)}
                    sx={{
                      py: 3,
                      borderRadius: 3,
                      background: `linear-gradient(45deg, ${action.color} 30%, ${action.gradientEnd} 90%)`,
                      boxShadow: `0 4px 20px 0 ${action.color}40`,
                      '&:hover': {
                        background: `linear-gradient(45deg, ${action.hoverStart} 30%, ${action.hoverEnd} 90%)`,
                        transform: 'translateY(-3px)',
                        boxShadow: `0 6px 25px 0 ${action.color}60`,
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {action.title}
                  </Button>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
        
        {/* Recent Activity Section */}
        <Box sx={{ mb: 5 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3, 
              fontWeight: 600,
              px: isMobile ? 2 : 0 
            }}
          >
            Recent Activity
          </Typography>
          
          <Paper 
            elevation={2} 
            sx={{ 
              borderRadius: 3,
              overflow: 'hidden'
            }}
          >
            {recentActivities.map((activity, index) => {
              const ActivityIcon = getActivityIcon(activity.type);
              
              return (
                <Box key={activity.id}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      p: 3,
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.02)'
                      }
                    }}
                  >
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        borderRadius: '50%', 
                        bgcolor: activity.type === 'assessment' 
                          ? 'rgba(33, 150, 243, 0.1)' 
                          : 'rgba(156, 39, 176, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2
                      }}
                    >
                      <ActivityIcon sx={{ 
                        fontSize: 24, 
                        color: activity.type === 'assessment' 
                          ? '#2196F3' 
                          : '#9C27B0'
                      }} />
                    </Box>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={500}>
                        {activity.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.date}
                      </Typography>
                    </Box>
                    
                    <Box>
                      {activity.status === 'completed' && (
                        <Chip 
                          icon={<CheckCircleIcon />}
                          label="Completed"
                          size="small"
                          color="success"
                          sx={{ fontWeight: 500 }}
                        />
                      )}
                      
                      {activity.score && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 1, 
                            textAlign: 'right',
                            color: 'text.secondary',
                            fontWeight: 500
                          }}
                        >
                          Score: {activity.score}
                        </Typography>
                      )}
                      
                      {activity.duration && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 1, 
                            textAlign: 'right',
                            color: 'text.secondary',
                            fontWeight: 500
                          }}
                        >
                          Duration: {activity.duration}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {index < recentActivities.length - 1 && (
                    <Divider />
                  )}
                </Box>
              );
            })}
          </Paper>
        </Box>
        
        {/* Upcoming Appointments */}
        <Box sx={{ mb: 5 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3, 
              fontWeight: 600,
              px: isMobile ? 2 : 0 
            }}
          >
            Recommended For You
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <MotionCard 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {/* Color accent at top of card */}
                <Box sx={{ 
                  height: 6, 
                  width: '100%', 
                  backgroundColor: '#4CAF50'
                }} />
                
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Complete Your Assessment
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    You've completed 6 out of 8 assessments. Continue your progress to get a complete health evaluation.
                  </Typography>
                  
                  <Box 
                    sx={{
                      height: 8,
                      width: '100%',
                      bgcolor: 'grey.200',
                      borderRadius: 5,
                      position: 'relative',
                      overflow: 'hidden',
                      mb: 3
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: '75%',
                        background: 'linear-gradient(90deg, #4CAF50 30%, #81C784 90%)',
                        borderRadius: 5
                      }}
                    />
                  </Box>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    sx={{ 
                      borderRadius: 8,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                    onClick={() => navigate('/assessment')}
                  >
                    Continue Assessment
                  </Button>
                </CardContent>
              </MotionCard>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <MotionCard 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                sx={{ 
                  height: '100%',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {/* Color accent at top of card */}
                <Box sx={{ 
                  height: 6, 
                  width: '100%', 
                  backgroundColor: '#FF9F43'
                }} />
                
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Daily Exercise Reminder
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Regular exercise helps improve your coordination and balance. Today's recommended exercise: Hand-eye coordination training.
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    mb: 3
                  }}>
                    <Box 
                      sx={{ 
                        p: 1, 
                        borderRadius: '50%', 
                        backgroundColor: '#FF9F4315',
                        mr: 1.5
                      }}
                    >
                      <Timeline sx={{ color: '#FF9F43', fontSize: 20 }} />
                    </Box>
                    <Typography variant="body2" fontWeight={500}>
                      Estimated time: 15 minutes
                    </Typography>
                  </Box>
                  
                  <Button
                    variant="outlined"
                    color="warning"
                    sx={{ 
                      borderRadius: 8,
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                    onClick={() => navigate('/therapy')}
                  >
                    View Exercise
                  </Button>
                </CardContent>
              </MotionCard>
            </Grid>
          </Grid>
        </Box>
      </MotionContainer>
    </Layout>
  );
};

export default Dashboard;