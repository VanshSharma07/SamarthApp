import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import { Assessment, Analytics, Settings, LocalHospital } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Home = () => {
  const navigate = useNavigate();

  const NavigationCard = ({ title, subtitle, onPress, icon: Icon }) => (
    <Card 
      sx={{ 
        cursor: 'pointer',
        background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(220, 0, 78, 0.1))',
        '&:hover': {
          transform: 'scale(1.02)',
          transition: 'transform 0.2s ease-in-out'
        }
      }}
      onClick={onPress}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
        <Icon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Box>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      {/* Hero Section with Welcome Image */}
      <Box
        sx={{
          position: 'relative',
          height: '300px',
          width: '100%',
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Box
          component="img"
          src="/images/welcome.jpg"
          alt="Welcome"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.7)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            textAlign: 'center',
            zIndex: 1,
            p: 3,
            background: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5))'
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              fontWeight: 'bold'
            }}
          >
            Welcome to Samarth
          </Typography>
          <Typography 
            variant="h6"
            sx={{ 
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              maxWidth: '600px'
            }}
          >
            Your personal health assessment companion
          </Typography>
        </Box>
      </Box>

      {/* Navigation Cards */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <NavigationCard
              title="Start Assessment"
              subtitle="Begin your health evaluation"
              icon={Assessment}
              onPress={() => navigate('/assessment')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <NavigationCard
              title="View Analytics"
              subtitle="Track your progress"
              icon={Analytics}
              onPress={() => navigate('/analytics')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <NavigationCard
              title="Settings"
              subtitle="Customize your experience"
              icon={Settings}
              onPress={() => navigate('/settings')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <NavigationCard
              title="Therapies"
              subtitle="View available treatments"
              icon={LocalHospital}
              onPress={() => navigate('/therapy')}
            />
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default Home;