import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { getEffectiveTier, getTrialInfo, startTrial } from '../middleware/featureGate.js';

const router = Router();

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Prepared statements
const upsertUser = db.prepare(`
  INSERT INTO users (email, name, avatar_url, role, last_login)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    last_login = datetime('now')
`);

const getUser = db.prepare('SELECT * FROM users WHERE email = ?');

// Lazy init: register Google strategy on first request (env vars are loaded by then)
let strategyRegistered = false;
function ensureStrategy() {
  if (strategyRegistered) return;
  strategyRegistered = true;

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (clientID && clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL: process.env.APP_URL ? process.env.APP_URL + '/api/auth/google/callback' : '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        (accessToken, refreshToken, profile, done) => {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          const name = profile.displayName || '';
          const avatar = profile.photos?.[0]?.value || '';
          const adminEmail = process.env.ADMIN_EMAIL || 'anjanr@gmail.com';
          const role = email === adminEmail ? 'admin' : 'user';

          upsertUser.run(email, name, avatar, role);
          const user = getUser.get(email);

          // Auto-start 7-day trial for new users (and legacy free users)
          if (!user.trial_start && role !== 'admin') {
            startTrial(email);
          }

          done(null, user);
        }
      )
    );
    console.log('Google OAuth strategy registered');
  } else {
    console.warn('Google OAuth not configured — GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET missing from .env');
  }
}

passport.serializeUser((user, done) => done(null, user.email));
passport.deserializeUser((email, done) => {
  const user = getUser.get(email);
  done(null, user);
});

// Sign JWT and set cookie
function signAndSetCookie(res, user) {
  const secret = process.env.JWT_SECRET || 'mf-intel-dev-secret-change-in-production';
  const token = jwt.sign(
    { email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url },
    secret,
    { expiresIn: '7d' }
  );

  res.cookie('mf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return token;
}

// ── Routes ─────────────────────────────────────────────────────────────────

// Initiate Google OAuth
router.get('/auth/google', (req, res, next) => {
  ensureStrategy();

  if (!process.env.GOOGLE_CLIENT_ID) {
    // Dev mode: auto-login as admin
    const adminEmail = process.env.ADMIN_EMAIL || 'anjanr@gmail.com';
    const devUser = { email: adminEmail, name: 'Dev Admin', avatar_url: '', role: 'admin' };
    upsertUser.run(devUser.email, devUser.name, devUser.avatar_url, devUser.role);
    const user = getUser.get(devUser.email);
    signAndSetCookie(res, user);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    return res.redirect(appUrl);
  }

  passport.authenticate('google', { scope: ['profile', 'email'], session: false, prompt: 'select_account' })(req, res, next);
});

// Google OAuth callback
router.get('/auth/google/callback', (req, res, next) => {
  ensureStrategy();
  passport.authenticate('google', { session: false, failureRedirect: '/?error=auth_failed' })(req, res, (err) => {
    if (err) return next(err);
    signAndSetCookie(res, req.user);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    res.redirect(appUrl);
  });
});

// Get current user (includes tier info)
router.get('/auth/me', (req, res) => {
  const token = req.cookies?.['mf-token'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const secret = process.env.JWT_SECRET || 'mf-intel-dev-secret-change-in-production';
    const decoded = jwt.verify(token, secret);
    const user = getUser.get(decoded.email);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const appUrl = process.env.APP_URL || '';

    // Get effective tier (handles trial/subscription expiry)
    // getEffectiveTier, getTrialInfo imported at top
    const { tier } = getEffectiveTier(user.email);
    const trialInfo = getTrialInfo(user.email);

    res.json({
      data: {
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
        isDev: appUrl.includes('dev.'),
        tier,
        trialInfo,
        chatUsage: {
          used: user.chat_count_date === new Date().toISOString().slice(0, 10)
            ? (user.chat_count_today || 0)
            : 0,
          limit: tier === 'pro' ? 20 : tier === 'trial' ? 10 : 0,
        },
      },
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Start free trial
router.post('/auth/start-trial', (req, res) => {
  const token = req.cookies?.['mf-token'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const secret = process.env.JWT_SECRET || 'mf-intel-dev-secret-change-in-production';
    const decoded = jwt.verify(token, secret);
    const user = getUser.get(decoded.email);
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.trial_start) {
      return res.status(400).json({ error: 'Trial already used' });
    }
    if (user.tier === 'pro') {
      return res.status(400).json({ error: 'Already on Pro plan' });
    }

    // startTrial, getTrialInfo imported at top
    startTrial(decoded.email);
    const trialInfo = getTrialInfo(decoded.email);

    res.json({ data: { tier: 'trial', trialInfo } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('mf-token', { path: '/' });
  res.json({ data: { message: 'Logged out' } });
});

export default router;
