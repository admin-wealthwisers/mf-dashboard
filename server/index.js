// dotenv must run before any other imports that read env vars
// With ES modules, static imports are hoisted, so we use a sync workaround
import { config } from 'dotenv';
config({ override: process.env.NODE_ENV !== 'test' });
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import authRouter from './routes/auth.js';
import schemesRouter from './routes/schemes.js';
import navRouter from './routes/nav.js';
import holdingsRouter from './routes/holdings.js';
import analyticsRouter from './routes/analytics.js';
import portfolioRouter from './routes/portfolio.js';
import dashboardRouter from './routes/dashboard.js';
import aiRouter from './routes/ai.js';
import agentRouter from './routes/agent.js';
import adminRouter from './routes/admin.js';
import { requireAdmin, requireDevAccess } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Dev access control (only active when APP_URL contains 'dev.')
app.use(requireDevAccess);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (public)
app.use('/api', authRouter);

// API routes (public — free until March 31)
app.use('/api', schemesRouter);
app.use('/api', navRouter);
app.use('/api', holdingsRouter);
app.use('/api', analyticsRouter);
app.use('/api', portfolioRouter);
app.use('/api', dashboardRouter);
app.use('/api', aiRouter);
app.use('/api', agentRouter);

// Admin routes (admin-only, dev environment only)
const isDevEnv = (process.env.APP_URL || '').includes('dev.');
if (isDevEnv) {
  app.use('/api', requireAdmin, adminRouter);
} else {
  // In production, return 404 for all admin routes (as if they don't exist)
  app.all('/api/admin/*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Catch-all for unknown /api/ routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// Serve static files
const staticPath = process.env.MF_STATIC_PATH || join(__dirname, '..', 'client', 'dist');
app.use(express.static(staticPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(staticPath, 'index.html'));
  }
});

// Start server (skip if imported as module for testing)
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, server };
