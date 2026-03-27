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
import paymentRouter from './routes/payment.js';
import { requireAuth, requireAdmin, requireDevAccess } from './middleware/auth.js';
import { requireTier, checkChatLimit, checkEcasLimit } from './middleware/featureGate.js';
import { isLaunchMode } from './lib/appSettings.js';

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

// Public config (no auth — needed for landing page)
app.get('/api/config', (req, res) => {
  res.json({ data: { launchMode: isLaunchMode() } });
});

// Auth routes (public)
app.use('/api', authRouter);

// Payment routes (public — webhook must be accessible without auth)
app.use('/api', paymentRouter);

// Free API routes — no tier restriction
app.use('/api', schemesRouter);
app.use('/api', navRouter);
app.use('/api', holdingsRouter);
app.use('/api', analyticsRouter);
app.use('/api', dashboardRouter);

// Gated routes — require trial or pro tier
app.post('/api/agent/query', requireAuth, checkChatLimit);           // AI chat — usage-limited
app.post('/api/ai/fund-summary', requireAuth, checkChatLimit);       // AI summary — usage-limited
// ECAS/Portfolio endpoints disabled in public version — self-hosted edition only
app.post('/api/portfolio/upload-ecas', (req, res) => res.status(503).json({ error: 'Not available', message: 'ECAS upload is available in the self-hosted edition only.' }));
app.post('/api/portfolio/import-ecas', (req, res) => res.status(503).json({ error: 'Not available', message: 'ECAS import is available in the self-hosted edition only.' }));
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

// Dynamic sitemap
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://mfanalytics.in';
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/legal/terms', priority: '0.3', changefreq: 'monthly' },
    { loc: '/legal/privacy', priority: '0.3', changefreq: 'monthly' },
    { loc: '/legal/refund', priority: '0.3', changefreq: 'monthly' },
    { loc: '/legal/contact', priority: '0.3', changefreq: 'monthly' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
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
