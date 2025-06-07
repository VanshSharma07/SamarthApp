import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  InputAdornment,
  IconButton,
  Grid
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email, 
  Lock, 
  Person,
  PersonOutline 
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { firstName, lastName, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      return setError("Passwords don't match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters long");
    }

    try {
      setLoading(true);
      await signup(email, password, { firstName, lastName });
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setError(
        error.message || 
        (error.errors ? Object.values(error.errors).join(', ') : 'Failed to create account')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box>
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
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First Name"
              name="firstName"
              fullWidth
              margin="normal"
              value={formData.firstName}
              onChange={handleChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: '#4caf50' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
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
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last Name"
              name="lastName"
              fullWidth
              margin="normal"
              value={formData.lastName}
              onChange={handleChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: '#4caf50' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
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
          </Grid>
        </Grid>

        <TextField
          label="Email Address"
          name="email"
          type="email"
          fullWidth
          margin="normal"
          value={formData.email}
          onChange={handleChange}
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
          name="password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          value={formData.password}
          onChange={handleChange}
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
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          value={formData.confirmPassword}
          onChange={handleChange}
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
                  aria-label="toggle confirm password visibility"
                  onClick={handleClickShowConfirmPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                  sx={{ color: '#4caf50' }}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
          disabled={loading}
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
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            By signing up, you agree to our{' '}
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
              Terms of Service
            </Button>
            {' '}and{' '}
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
              Privacy Policy
            </Button>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Signup;