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
import GoogleAuthHandler from './components/auth/GoogleAuthHandler';

// Pages and components
import Dashboard from './components/Dashboard';
import Profile from './pages/Profile';
import Assessment from './pages/Assessment';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Diagnostics from './pages/Diagnostics';
import ProtectedRoute from './components/routing/ProtectedRoute';
import AboutPage from './pages/AboutSamarth';
import SelectDisorder from './pages/SelectDisorder';
import ParkinsonQuestionnaire from './components/disorderQuestion/ParkinsonQuestionnaire';
import AlzheimerQuestionnaire from './components/disorderQuestion/AlzheimerQuestionnaire';
import EpilepsyQuestionnaire from './components/disorderQuestion/EpilepsyQuestionnaire';
// Use the disorder questionnaire component directly from components
import DisorderQuestionnaire from './components/disorderQuestion/DisorderQuestionnaire';
import NeuroAssessment from './pages/NeuroAssessment';

// Assessment Components
import EyeMovement from './components/assessments/EyeMovement/EyeMovementTest';
import NeckMobility from './components/assessments/NeckMobility';
import Tremor from './components/assessments/Tremor';
import ResponseTime from './components/assessments/ResponseTime';
import GaitAnalysis from './components/assessments/GaitAnalysis';
import FingerTapping from './components/assessments/FingerTapping';
import TherapyHome from './therapies/TherapyHome'; // Import TherapyHome
import BellsPalsyTherapy from './therapies/BellsPalsyTherapy'; // Import dedicated therapy modules
import ALSTherapy from './therapies/ALSTherapy';
import ParkinsonsTherapy from './therapies/parkinsons/ParkinsonsTherapy';
import GaitBalanceExercise from './therapies/parkinsons/GaitBalanceExercise';
import FingerTappingTest from './therapies/parkinsons/FingerTappingTest';
import FacialExercise from './therapies/parkinsons/FacialExercise';
// Import Bell's Palsy exercise components
import FacialMovementExercise from './therapies/bells/FacialMovementExercise';
// Import ALS exercise components
import HandRangeExercise from './therapies/als/HandRangeExercise';
import UpperLimbExercise from './therapies/als/UpperLimbExercise';

// Import AuthProvider and ThemeProvider
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

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
            {/* Google OAuth Success Handler */}
            <Route path="/auth/google/success" element={<GoogleAuthHandler />} />
            {/* Root redirect: If not authenticated, go to /login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
            <Route path="/questionnaire" element={<ProtectedRoute><DisorderQuestionnaire /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/select-disorder" element={<ProtectedRoute><SelectDisorder /></ProtectedRoute>} />
            <Route path="/disorders/parkinsons" element={<ProtectedRoute><ParkinsonQuestionnaire /></ProtectedRoute>} />
            <Route path="/disorders/alzheimers" element={<ProtectedRoute><AlzheimerQuestionnaire /></ProtectedRoute>} />
            <Route path="/disorders/epilepsy" element={<ProtectedRoute><EpilepsyQuestionnaire /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/diagnostics" element={<ProtectedRoute><Diagnostics /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><AboutPage/></ProtectedRoute>} />
            
            {/* Assessment Routes */}
            <Route path="/assessment/eye-movement" element={<ProtectedRoute><EyeMovement /></ProtectedRoute>} />
            <Route path="/assessment/neck-mobility" element={<ProtectedRoute><NeckMobility /></ProtectedRoute>} />
            <Route path="/assessment/neuro" element={<ProtectedRoute><NeuroAssessment /></ProtectedRoute>} />
            {/* Facial Symmetry assessment removed from app routes */}
            <Route path="/assessment/tremor" element={<ProtectedRoute><Tremor /></ProtectedRoute>} />
            <Route path="/assessment/response-time" element={<ProtectedRoute><ResponseTime /></ProtectedRoute>} />
            <Route path="/assessment/gait-analysis" element={<ProtectedRoute><GaitAnalysis /></ProtectedRoute>} />
            <Route path="/assessment/finger-tapping" element={<ProtectedRoute><FingerTapping /></ProtectedRoute>} />

            {/* Therapy Module Route */}
            <Route path="/therapy" element={<ProtectedRoute><TherapyHome /></ProtectedRoute>} />
            <Route path="/therapy/bells" element={<ProtectedRoute><BellsPalsyTherapy /></ProtectedRoute>} />
            <Route path="/therapy/als" element={<ProtectedRoute><ALSTherapy /></ProtectedRoute>} />
            <Route path="/therapy/parkinsons" element={<ProtectedRoute><ParkinsonsTherapy /></ProtectedRoute>} />
            {/* Parkinson's individual exercise routes */}
            <Route path="/therapy/parkinsons/gait-balance" element={<ProtectedRoute><GaitBalanceExercise /></ProtectedRoute>} />
            <Route path="/therapy/parkinsons/tremor-drill" element={<ProtectedRoute><FingerTappingTest /></ProtectedRoute>} />
            <Route path="/therapy/parkinsons/facial-exercise" element={<ProtectedRoute><FacialExercise /></ProtectedRoute>} />
            {/* Bell's Palsy exercise routes */}
            <Route path="/therapy/bells/facial-movement" element={<ProtectedRoute><FacialMovementExercise /></ProtectedRoute>} />
            {/* ALS exercise routes */}
            <Route path="/therapy/als/hand-range" element={<ProtectedRoute><HandRangeExercise /></ProtectedRoute>} />
            <Route path="/therapy/als/upper-limb" element={<ProtectedRoute><UpperLimbExercise /></ProtectedRoute>} />
            <Route path="/therapy/:disorder" element={<ProtectedRoute><TherapyHome /></ProtectedRoute>} />
            
            {/* Catch all unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
