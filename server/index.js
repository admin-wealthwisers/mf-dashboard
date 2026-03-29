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
import { readFileSync } from 'fs';
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
import stocksRouter from './routes/stocks.js';
import stockAnalyticsRouter from './routes/stock-analytics.js';
import stockPortfolioRouter from './routes/stock-portfolio.js';
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

// Stock routes (public)
app.use('/api', stocksRouter);
app.use('/api', stockAnalyticsRouter);

// Stock portfolio (requires auth)
app.use('/api', requireAuth, stockPortfolioRouter);

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

// robots.txt for search engines
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Sitemap: https://mfanalytics.in/sitemap.xml`);
});

// Sitemap index — splits into static + fund sitemaps (Google limit: 50,000 URLs per sitemap)
app.get('/sitemap.xml', (req, res) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://mfanalytics.in/sitemap-static.xml</loc></sitemap>
  <sitemap><loc>https://mfanalytics.in/sitemap-funds.xml</loc></sitemap>
  <sitemap><loc>https://mfanalytics.in/sitemap-stocks.xml</loc></sitemap>
</sitemapindex>`;
  res.type('application/xml').send(xml);
});

app.get('/sitemap-static.xml', (req, res) => {
  const baseUrl = 'https://mfanalytics.in';
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/explore', priority: '0.9', changefreq: 'daily' },
    { loc: '/compare', priority: '0.7', changefreq: 'weekly' },
    { loc: '/dashboard', priority: '0.8', changefreq: 'daily' },
    { loc: '/help', priority: '0.4', changefreq: 'monthly' },
    { loc: '/legal/terms', priority: '0.3', changefreq: 'monthly' },
    { loc: '/legal/privacy', priority: '0.3', changefreq: 'monthly' },
    { loc: '/legal/refund', priority: '0.3', changefreq: 'monthly' },
    { loc: '/legal/contact', priority: '0.3', changefreq: 'monthly' },
    { loc: '/stocks/dashboard', priority: '0.8', changefreq: 'daily' },
    { loc: '/stocks/explore', priority: '0.9', changefreq: 'daily' },
    { loc: '/stocks/compare', priority: '0.7', changefreq: 'weekly' },
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

// Fund sitemap — all 15,000+ scheme scorecard pages
app.get('/sitemap-funds.xml', (req, res) => {
  const baseUrl = 'https://mfanalytics.in';
  const schemes = db.prepare('SELECT scheme_code, scheme_name FROM schemes ORDER BY scheme_code').all();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${schemes.map(s => `  <url>
    <loc>${baseUrl}/scorecard/${s.scheme_code}</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

// Stock sitemap — all stock scorecard pages
app.get('/sitemap-stocks.xml', (req, res) => {
  const baseUrl = 'https://mfanalytics.in';
  let stocks = [];
  try {
    stocks = db.prepare('SELECT symbol FROM stocks ORDER BY symbol').all();
  } catch { /* table may not exist yet */ }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${stocks.map(s => `  <url>
    <loc>${baseUrl}/stocks/scorecard/${s.symbol}</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

// Serve static files
const staticPath = process.env.MF_STATIC_PATH || join(__dirname, '..', 'client', 'dist');
app.use(express.static(staticPath));

// SEO: inject dynamic meta tags for scorecard pages (so Google/social media see fund-specific titles)
let indexHtml = '';
try { indexHtml = readFileSync(join(staticPath, 'index.html'), 'utf-8'); } catch (e) { /* dev mode */ }

app.get('/scorecard/:code', (req, res) => {
  if (!indexHtml) return res.sendFile(join(staticPath, 'index.html'));
  const scheme = db.prepare('SELECT scheme_name, sub_category, amc FROM schemes WHERE scheme_code = ?').get(req.params.code);
  if (!scheme) return res.sendFile(join(staticPath, 'index.html'));

  const title = `${scheme.scheme_name} — Intelligence Score & Analysis | MF Analytics`;
  const desc = `Deep analysis of ${scheme.scheme_name} by ${scheme.amc}. Intelligence Score, Fund DNA radar, performance metrics, risk analysis, rolling returns — ${scheme.sub_category || 'Mutual Fund'}.`;
  const url = `https://mfanalytics.in/scorecard/${req.params.code}`;

  const html = indexHtml
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${desc}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${desc}"`)
    .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${title}"`)
    .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${desc}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${url}"`);
  res.send(html);
});

// SEO: inject dynamic meta tags for stock scorecard pages
app.get('/stocks/scorecard/:symbol', (req, res) => {
  if (!indexHtml) return res.sendFile(join(staticPath, 'index.html'));
  let stock;
  try {
    stock = db.prepare('SELECT symbol, name, sector, industry FROM stocks WHERE symbol = ?').get(req.params.symbol.toUpperCase());
  } catch { /* table may not exist */ }
  if (!stock) return res.sendFile(join(staticPath, 'index.html'));

  const title = `${stock.name} (${stock.symbol}) — Stock Analysis & Score | MF Analytics`;
  const desc = `Deep analysis of ${stock.name} (${stock.symbol}). Stock Score, DNA radar, technical indicators, peer comparison — ${stock.sector || 'Equity'} / ${stock.industry || ''}.`;
  const url = `https://mfanalytics.in/stocks/scorecard/${stock.symbol}`;

  const html = indexHtml
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${desc}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${desc}"`)
    .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta name="twitter:title" content=".*?"/, `<meta name="twitter:title" content="${title}"`)
    .replace(/<meta name="twitter:description" content=".*?"/, `<meta name="twitter:description" content="${desc}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${url}"`);
  res.send(html);
});

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
