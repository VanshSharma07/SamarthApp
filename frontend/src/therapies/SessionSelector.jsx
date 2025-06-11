import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Grid, Button, Box, Fade } from '@mui/material';
import { motion } from 'framer-motion';
import { SmartToy, FaceRetouchingNatural, DirectionsRun } from '@mui/icons-material';

const disorders = [
  {
    key: 'bells',
    name: "Bell's Palsy",
    description: 'Facial movement and eye exercises',
    icon: <FaceRetouchingNatural sx={{ fontSize: 48, color: 'primary.main' }} />,
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  {
    key: 'als',
    name: 'ALS',
    description: 'Hand, arm, and upper limb exercises',
    icon: <SmartToy sx={{ fontSize: 48, color: 'secondary.main' }} />,
    gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  },
  {
    key: 'parkinsons',
    name: "Parkinson's Disease",
    description: 'Gait, balance, and tremor reduction',
    icon: <DirectionsRun sx={{ fontSize: 48, color: 'success.main' }} />,
    gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  },
];

const MotionCard = motion(Card);

const cardVariants = {
  initial: { opacity: 0, y: 40, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 14 } },
  whileHover: { scale: 1.04, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.25)' },
};

const SessionSelector = () => {
  const navigate = useNavigate();

  const handleSelect = (key) => {
    navigate(`/therapy/${key}`);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        py: { xs: 4, md: 8 },
        minHeight: 500,
        overflow: 'hidden',
      }}
    >
      {/* Futuristic animated background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Blurred gradient blobs */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.7 }}
          animate={{ scale: 1.1, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: 320,
            height: 320,
            background: 'radial-gradient(circle at 30% 30%, #a5b4fc 0%, #f0abfc 100%)',
            filter: 'blur(80px)',
            opacity: 0.5,
            borderRadius: '50%',
          }}
        />
        <motion.div
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.2, opacity: 0.8 }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            bottom: '-12%',
            right: '-8%',
            width: 280,
            height: 280,
            background: 'radial-gradient(circle at 70% 70%, #6ee7b7 0%, #60a5fa 100%)',
            filter: 'blur(70px)',
            opacity: 0.4,
            borderRadius: '50%',
          }}
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1.05, opacity: 0.7 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            width: 180,
            height: 180,
            background: 'radial-gradient(circle at 50% 50%, #f472b6 0%, #818cf8 100%)',
            filter: 'blur(60px)',
            opacity: 0.3,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </motion.div>

      <Grid container spacing={4} justifyContent="center" alignItems="stretch" sx={{ position: 'relative', zIndex: 1 }}>
        {disorders.map((d, idx) => (
          <Grid item xs={12} md={4} key={d.key} sx={{ display: 'flex' }}>
            <Fade in timeout={600 + idx * 200}>
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <MotionCard
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="whileHover"
                  sx={{
                    borderRadius: 5,
                    minHeight: 340,
                    height: '100%',
                    background: d.gradient,
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.13)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    p: 2,
                    transition: 'box-shadow 0.3s',
                    border: '1.5px solid rgba(99,102,241,0.10)',
                    backdropFilter: 'blur(2px)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.6, type: 'spring' }}
                  >
                    <Box sx={{ mb: 2, mt: 1 }}>{d.icon}</Box>
                  </motion.div>
                  <CardContent sx={{ textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 0 }}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                    >
                      <Typography variant="h5" fontWeight="bold" sx={{ letterSpacing: 1, color: '#222', mb: 1 }}>
                        {d.name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
                        {d.description}
                      </Typography>
                    </motion.div>
                  </CardContent>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1, duration: 0.6 }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSelect(d.key)}
                      sx={{
                        borderRadius: 3,
                        fontWeight: 'bold',
                        px: 4,
                        py: 1.2,
                        fontSize: '1.1rem',
                        boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.10)',
                        background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)',
                        transition: 'background 0.2s',
                        mb: 2,
                        '&:hover': {
                          background: 'linear-gradient(90deg, #60a5fa 0%, #6366f1 100%)',
                        },
                      }}
                    >
                      Start
                    </Button>
                  </motion.div>
                  <Box
                    sx={{
                      position: 'absolute',
                      right: -40,
                      bottom: -40,
                      width: 120,
                      height: 120,
                      background: 'rgba(99,102,241,0.08)',
                      borderRadius: '50%',
                      zIndex: 0,
                    }}
                  />
                </MotionCard>
              </Box>
            </Fade>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SessionSelector;
