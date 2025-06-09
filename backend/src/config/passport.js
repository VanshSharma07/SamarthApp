import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({
        email: profile.emails[0].value,
        name: profile.displayName,
        profile: {
          firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'Google',
          lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || 'User'
        },
        password: Math.random().toString(36), // Dummy password, not used
        // You may want to add a flag like isGoogleUser: true
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

export default passport;