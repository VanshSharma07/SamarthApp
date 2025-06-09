import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// This component handles /auth/google/success?token=...
const GoogleAuthHandler = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    // Parse token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Optionally clear userId if you store it
      localStorage.removeItem('userId');
      // Refresh user context
      refreshUser().then(() => {
        navigate('/dashboard', { replace: true });
      });
    } else {
      // If no token, redirect to login
      navigate('/auth', { replace: true });
    }
  }, [navigate, refreshUser]);

  return null;
};

export default GoogleAuthHandler;
