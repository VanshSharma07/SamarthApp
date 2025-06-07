import { useState } from 'react';
import { Box, Paper, Tabs, Tab, Typography, Container } from '@mui/material';
import Login from './Login';
import Signup from './Signup';

const AuthPage = () => {
  const [tab, setTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      minHeight: '100vh',
      bgcolor: '#f8fffe'
    }}>
      {/* Mobile Logo Section / Desktop Full Image Section */}
      <Box sx={{ 
        flex: { xs: 'none', md: 1 },
        minHeight: { xs: 'auto', md: '100vh' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: { xs: '#ffffff', md: 'linear-gradient(135deg, #e8f5e8 0%, #f0f9f0 100%)' },
        background: { xs: '#ffffff', md: 'linear-gradient(135deg, #e8f5e8 0%, #f0f9f0 100%)' },
        p: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        py: { xs: 2, md: 4 }
      }}>
        {/* Desktop background gradient overlay */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: { xs: 'none', md: 'linear-gradient(135deg, rgba(46, 125, 50, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)' },
          display: { xs: 'none', md: 'block' }
        }} />
        
        {/* Logo - always visible */}
        <Box sx={{ 
          zIndex: 2,
          textAlign: 'center',
          mb: { xs: 0, md: 4 },
          width: '100%'
        }}>
          <Box
            component="img"
            src="/images/loogo.png"
            alt="Samarth Logo"
            sx={{
              height: { xs: 100, sm: 110, md: 120 },
              mb: 0,
              mx: 'auto',
              display: 'block',
              filter: { xs: 'none', md: 'drop-shadow(0 2px 8px rgba(46,125,50,0.08))' }
            }}
          />
        </Box>

        {/* Desktop only content - What is Samarth & Image */}
        <Box sx={{ 
          display: { xs: 'none', md: 'block' },
          zIndex: 2,
          textAlign: 'center',
          width: '100%'
        }}>
          {/* What is Samarth - desktop only */}
          <Typography variant="h6" sx={{ 
            color: '#2e7d32',
            fontWeight: 600,
            mb: 0.5,
            mt: 0,
          }}>
            What is Samarth?
          </Typography>
          <Typography variant="body2" sx={{ 
            color: '#1b5e20',
            maxWidth: 320,
            mx: 'auto',
            lineHeight: 1.4,
            mb: 4
          }}>
            AI-powered platform for neurological assessment and rehab. We help detect, monitor, and support neuromotor wellness anytime, anywhere.
          </Typography>

          {/* Patient image - desktop only */}
          <Box 
            component="img"
            src="/images/login.jpg" 
            alt="Neuromotor Patient"
            sx={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(46, 125, 50, 0.2)',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}
          />
        </Box>
      </Box>

      {/* Bottom Section (Mobile) / Right Side (Desktop) - Authentication Forms */}
      <Box sx={{ 
        flex: { xs: 1, md: 1 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#ffffff',
        p: { xs: 2, sm: 3, md: 4 },
        minHeight: { xs: 'auto', md: '100vh' },
        py: { xs: 2, md: 4 }
      }}>
        <Container maxWidth="sm" sx={{ width: '100%' }}>
          <Paper sx={{ 
            p: { xs: 2.5, sm: 3, md: 4 },
            borderRadius: { xs: 2, md: 3 },
            boxShadow: '0 12px 40px rgba(46, 125, 50, 0.15)',
            border: '1px solid rgba(76, 175, 80, 0.2)',
            bgcolor: '#ffffff',
            width: '100%'
          }}>
            <Box sx={{ mb: { xs: 2, md: 3 }, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ 
                color: '#2e7d32',
                fontWeight: 'bold',
                mb: 1,
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
              }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#4caf50',
                fontSize: { xs: '0.875rem', sm: '0.875rem' }
              }}>
                Access your rehabilitation dashboard
              </Typography>
            </Box>

            <Tabs 
              value={tab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{ 
                mb: { xs: 2, md: 3 },
                '& .MuiTab-root': {
                  color: '#81c784',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minHeight: { xs: 40, sm: 48 }
                },
                '& .Mui-selected': {
                  color: '#2e7d32 !important'
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#4caf50',
                  height: 3,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <Tab label="Login" />
              <Tab label="Sign Up" />
            </Tabs>

            <Box>
              {tab === 0 ? <Login /> : <Signup />}
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default AuthPage;