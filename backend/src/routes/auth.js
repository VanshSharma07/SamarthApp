import express from 'express';
import passport from '../config/passport.js'; // Import passport config
import { login, register, getCurrentUser, updateProfile } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    // Redirect directly to frontend with token
    res.redirect(`https://samarth-app.vercel.app/auth/google/success?token=${token}`);
    // Or: res.json({ token });
  }
);

// Handler for /auth/google/success to support direct browser access (prevents 404)
router.get('/google/success', (req, res) => {
  // If accessed directly, show a simple message or redirect to frontend
  const token = req.query.token;
  // Redirect to frontend route for GoogleAuthHandler
  if (token) {
    // Change the URL below to your deployed frontend URL if needed
    return res.redirect(`https://samarth-app.vercel.app/auth/google/success?token=${token}`);
  }
  // If no token, redirect to login page
  return res.redirect('https://samarth-app.vercel.app/auth');
});

// Protected routes
router.get('/me', auth, getCurrentUser);
router.put('/profile', auth, updateProfile);  // Add this line

export default router;