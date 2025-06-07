import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Signup';
import AuthPage from './components/auth/AuthPage'; // Import AuthPage

// Pages and components
import Dashboard from './components/Dashboard';
import Profile from './pages/Profile';
import Assessment from './pages/Assessment';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Diagnostics from './pages/Diagnostics';
import ProtectedRoute from './components/routing/ProtectedRoute';
import Therapies from './pages/Therapies';
import TherapyDetail from './components/therapies/TherapyDetail';

// Therapy pages
import ParkinsonsTherapy from './pages/therapies/ParkinsonsTherapy';
import BellsPalsyTherapy from './pages/therapies/BellsPalsyTherapy';
import ALSTherapy from './pages/therapies/ALSTherapy';

// Parkinsons therapy types
import ParkinsonsPhysicalTherapy from './pages/therapies/parkinsons/PhysicalTherapy';
import ParkinsonsSpeechTherapy from './pages/therapies/parkinsons/SpeechTherapy';
import ParkinsonsOccupationalTherapy from './pages/therapies/parkinsons/OccupationalTherapy';

// Bell's Palsy therapy types
import BellsPalsyPhysicalTherapy from './pages/therapies/bells-palsy/PhysicalTherapy';
import BellsPalsySpeechTherapy from './pages/therapies/bells-palsy/SpeechTherapy';
import BellsPalsyOccupationalTherapy from './pages/therapies/bells-palsy/OccupationalTherapy';

// ALS therapy types
import ALSPhysicalTherapy from './pages/therapies/als/PhysicalTherapy';
import ALSSpeechTherapy from './pages/therapies/als/SpeechTherapy';
import ALSOccupationalTherapy from './pages/therapies/als/OccupationalTherapy';

// Assessment Components
import EyeMovement from './components/assessments/EyeMovement/EyeMovementTest';
import NeckMobility from './components/assessments/NeckMobility';
import FacialSymmetry from './components/assessments/FacialSymmetry';
import Tremor from './components/assessments/Tremor';
import ResponseTime from './components/assessments/ResponseTime';
import GaitAnalysis from './components/assessments/GaitAnalysis';
import FingerTapping from './components/assessments/FingerTapping';

// Import AuthProvider and ThemeProvider
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AboutPage from './pages/AboutSamarth';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />

            {/* Root redirect: If not authenticated, go to /login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/diagnostics" element={<ProtectedRoute><Diagnostics /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><AboutPage/></ProtectedRoute>} />
            
            {/* Assessment Routes */}
            <Route path="/assessment/eye-movement" element={<ProtectedRoute><EyeMovement /></ProtectedRoute>} />
            <Route path="/assessment/neck-mobility" element={<ProtectedRoute><NeckMobility /></ProtectedRoute>} />
            <Route path="/assessment/facial-symmetry" element={<ProtectedRoute><FacialSymmetry /></ProtectedRoute>} />
            <Route path="/assessment/tremor" element={<ProtectedRoute><Tremor /></ProtectedRoute>} />
            <Route path="/assessment/response-time" element={<ProtectedRoute><ResponseTime /></ProtectedRoute>} />
            <Route path="/assessment/gait-analysis" element={<ProtectedRoute><GaitAnalysis /></ProtectedRoute>} />
            <Route path="/assessment/finger-tapping" element={<ProtectedRoute><FingerTapping /></ProtectedRoute>} />
            
            {/* Main therapy routes */}
            <Route path="/therapies" element={<ProtectedRoute><Therapies /></ProtectedRoute>} />
            
            {/* Condition-specific therapy routes */}
            <Route path="/therapies/parkinsons" element={<ProtectedRoute><ParkinsonsTherapy /></ProtectedRoute>} />
            <Route path="/therapies/bells-palsy" element={<ProtectedRoute><BellsPalsyTherapy /></ProtectedRoute>} />
            <Route path="/therapies/als" element={<ProtectedRoute><ALSTherapy /></ProtectedRoute>} />
            
            {/* Parkinsons therapy types */}
            <Route path="/therapies/parkinsons/physical" element={<ProtectedRoute><ParkinsonsPhysicalTherapy /></ProtectedRoute>} />
            <Route path="/therapies/parkinsons/speech" element={<ProtectedRoute><ParkinsonsSpeechTherapy /></ProtectedRoute>} />
            <Route path="/therapies/parkinsons/occupational" element={<ProtectedRoute><ParkinsonsOccupationalTherapy /></ProtectedRoute>} />
            
            {/* Bell's Palsy therapy types */}
            <Route path="/therapies/bells-palsy/physical" element={<ProtectedRoute><BellsPalsyPhysicalTherapy /></ProtectedRoute>} />
            <Route path="/therapies/bells-palsy/speech" element={<ProtectedRoute><BellsPalsySpeechTherapy /></ProtectedRoute>} />
            <Route path="/therapies/bells-palsy/occupational" element={<ProtectedRoute><BellsPalsyOccupationalTherapy /></ProtectedRoute>} />
            
            {/* ALS therapy types */}
            <Route path="/therapies/als/physical" element={<ProtectedRoute><ALSPhysicalTherapy /></ProtectedRoute>} />
            <Route path="/therapies/als/speech" element={<ProtectedRoute><ALSSpeechTherapy /></ProtectedRoute>} />
            <Route path="/therapies/als/occupational" element={<ProtectedRoute><ALSOccupationalTherapy /></ProtectedRoute>} />
            
            {/* Generic therapy detail route */}
            <Route path="/therapies/:condition/:type" element={<ProtectedRoute><TherapyDetail /></ProtectedRoute>} />
            
            {/* Catch all unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
