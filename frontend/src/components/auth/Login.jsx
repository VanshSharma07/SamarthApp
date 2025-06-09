import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({
        email: email.trim(),
        password: password
      });
      // Navigation will happen in useEffect when user is set
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  // Google Sign-In handler
  const handleGoogleSignIn = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  return (
    <Box>
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            bgcolor: '#e8f5e8',
            color: '#2e7d32',
            '& .MuiAlert-icon': {
              color: '#4caf50'
            }
          }}
        >
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            bgcolor: '#ffebee',
            color: '#c62828',
            '& .MuiAlert-icon': {
              color: '#f44336'
            }
          }}
        >
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="Email Address"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Email sx={{ color: '#4caf50' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { 
                borderColor: '#c8e6c9',
                borderWidth: 2
              },
              '&:hover fieldset': { 
                borderColor: '#81c784' 
              },
              '&.Mui-focused fieldset': { 
                borderColor: '#4caf50',
                borderWidth: 2
              }
            },
            '& .MuiInputLabel-root': {
              color: '#4caf50',
              fontWeight: 500
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#2e7d32'
            }
          }}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock sx={{ color: '#4caf50' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                  sx={{ color: '#4caf50' }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '& fieldset': { 
                borderColor: '#c8e6c9',
                borderWidth: 2
              },
              '&:hover fieldset': { 
                borderColor: '#81c784' 
              },
              '&.Mui-focused fieldset': { 
                borderColor: '#4caf50',
                borderWidth: 2
              }
            },
            '& .MuiInputLabel-root': {
              color: '#4caf50',
              fontWeight: 500
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#2e7d32'
            }
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={authLoading || loading}
          sx={{ 
            mt: 2,
            mb: 2,
            py: 1.5,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
            '&:hover': { 
              background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 20px rgba(46, 125, 50, 0.3)'
            },
            '&:disabled': {
              background: '#c8e6c9',
              color: '#ffffff'
            },
            fontWeight: 600,
            fontSize: '1rem',
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.2)',
            transition: 'all 0.3s ease'
          }}
          startIcon={authLoading || loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {authLoading || loading ? 'Signing In...' : 'Sign In'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Forgot your password?{' '}
            <Button 
              variant="text" 
              sx={{ 
                color: '#4caf50',
                textTransform: 'none',
                fontWeight: 600,
                p: 0,
                minWidth: 'auto',
                '&:hover': {
                  background: 'transparent',
                  color: '#2e7d32'
                }
              }}
            >
              Reset Password
            </Button>
          </Typography>
        </Box>
      </Box>

      {/* Google Sign-In Button */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<GoogleIcon sx={{ color: '#ea4335' }} />}
          onClick={handleGoogleSignIn}
          sx={{
            borderColor: '#c8e6c9',
            color: '#2e7d32',
            fontWeight: 600,
            borderRadius: 2,
            textTransform: 'none',
            background: '#fff',
            '&:hover': {
              background: '#f5f5f5',
              borderColor: '#4caf50',
              color: '#388e3c'
            },
            mt: 2
          }}
        >
          Sign in with Google
        </Button>
      </Box>
    </Box>
  );
};

export default Login;