import { Router } from 'express';
import axios from 'axios';
import db from '../db.js';
import { scrapeHoldings } from '../lib/holdingsScraper.js';

const router = Router();

// Rate limit helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Date helpers
function parseMFAPIDate(dateStr) {
  // MFAPI format: DD-MM-YYYY
  const [dd, mm, yyyy] = dateStr.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Prepared statements
const upsertScheme = db.prepare(`
  INSERT OR REPLACE INTO schemes (scheme_code, scheme_name, amc, category, sub_category)
  VALUES (?, ?, ?, ?, ?)
`);

const insertNav = db.prepare(`
  INSERT OR IGNORE INTO nav_history (scheme_code, date, nav)
  VALUES (?, ?, ?)
`);

// DB stats
router.get('/admin/stats', (req, res) => {
  const schemeCount = db.prepare('SELECT COUNT(*) as count FROM schemes').get();
  const navCount = db.prepare('SELECT COUNT(*) as count FROM nav_history').get();
  const holdingCount = db.prepare('SELECT COUNT(*) as count FROM portfolio_holdings').get();
  const instrumentCount = db.prepare('SELECT COUNT(*) as count FROM instruments').get();
  const latestNav = db.prepare('SELECT MAX(date) as date FROM nav_history').get();
  const categories = db.prepare('SELECT category, COUNT(*) as count FROM schemes GROUP BY category ORDER BY count DESC').all();

  const schemesWithHoldings = db.prepare('SELECT COUNT(DISTINCT scheme_code) as count FROM portfolio_holdings').get();

  res.json({
    data: {
      schemes: schemeCount.count,
      navRecords: navCount.count,
      holdings: holdingCount.count,
      instruments: instrumentCount.count,
      latestNavDate: latestNav.date,
      schemesWithHoldings: schemesWithHoldings.count,
      categories,
    },
  });
});

// Pipeline: fetch all MF scheme list from MFAPI
router.get('/admin/mfapi-schemes', async (req, res) => {
  try {
    const { data } = await axios.get('https://api.mfapi.in/mf', { timeout: 30000 });
    res.json({ data: data.length, schemes: data.slice(0, 50) });
  } catch (err) {
    res.status(502).json({ error: `Failed to fetch MFAPI scheme list: ${err.message}` });
  }
});

// Pipeline: ingest NAV data — SSE streaming progress
let pipelineRunning = false;
let pipelineAbort = false;

router.post('/admin/pipeline/start', async (req, res) => {
  if (pipelineRunning) {
    return res.status(409).json({ error: 'Pipeline already running' });
  }

  const { mode = 'full', schemeCodes } = req.body;
  // mode: 'full' = all MFAPI schemes, 'incremental' = last 30 days, 'custom' = specific codes

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Cloudflare/Nginx buffering for SSE
  res.flushHeaders();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  pipelineRunning = true;
  pipelineAbort = false;

  try {
    let codes = schemeCodes || [];

    if (mode === 'all-growth' || mode === 'direct-growth') {
      // Fetch all schemes, filter to Growth plans
      const label = mode === 'all-growth' ? 'All Growth (Direct + Regular)' : 'Direct-Growth only';
      send({ type: 'status', message: `Fetching ${label} scheme list from MFAPI...` });
      const { data: allSchemes } = await axios.get('https://api.mfapi.in/mf', { timeout: 30000 });
      codes = allSchemes
        .filter((s) => {
          const name = (s.schemeName || '').toLowerCase();
          const isIDCW = name.includes('idcw') || name.includes('dividend payout') || name.includes('dividend reinvestment') || name.includes('dividend option');
          const isGrowth = name.includes('growth') && !isIDCW;
          if (mode === 'all-growth') return isGrowth;
          return isGrowth && name.includes('direct');
        })
        .map((s) => s.schemeCode);
      send({ type: 'status', message: `Found ${codes.length} ${label} schemes (filtered from ${allSchemes.length} total)` });
    } else if (mode === 'full' || (!schemeCodes && mode !== 'incremental')) {
      // Fetch all scheme codes from MFAPI
      send({ type: 'status', message: 'Fetching scheme list from MFAPI...' });
      const { data: allSchemes } = await axios.get('https://api.mfapi.in/mf', { timeout: 30000 });
      codes = allSchemes.map((s) => s.schemeCode);
      send({ type: 'status', message: `Found ${codes.length} schemes on MFAPI` });
    }

    if (mode === 'incremental' && codes.length === 0) {
      // Use schemes already in our DB
      const existing = db.prepare('SELECT scheme_code FROM schemes').all();
      codes = existing.map((s) => s.scheme_code);
      send({ type: 'status', message: `Incremental update for ${codes.length} existing schemes` });
    }

    const cutoffDate = mode === 'incremental' ? daysAgo(30) : null;
    const total = codes.length;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let totalNavInserted = 0;

    const batchInsert = db.transaction((rows) => {
      for (const row of rows) {
        insertNav.run(row.code, row.date, row.nav);
      }
    });

    for (let i = 0; i < total; i++) {
      if (pipelineAbort) {
        send({ type: 'status', message: 'Pipeline aborted by user' });
        break;
      }

      const code = String(codes[i]);

      try {
        const { data: response } = await axios.get(
          `https://api.mfapi.in/mf/${code}`,
          { timeout: 15000 }
        );

        const { meta, data: navData } = response;

        if (!meta || !meta.scheme_name || !navData) {
          failed++;
          processed++;
          if (i % 50 === 0) {
            send({
              type: 'progress',
              current: processed,
              total,
              succeeded,
              failed,
              navRecords: totalNavInserted,
              message: `Skipped ${code} — no data`,
            });
          }
          continue;
        }

        // Upsert scheme metadata
        upsertScheme.run(
          String(meta.scheme_code),
          meta.scheme_name,
          meta.fund_house || null,
          meta.scheme_type || null,
          meta.scheme_category || null
        );

        // Parse and batch insert NAV records
        const rows = [];
        for (const entry of navData) {
          const isoDate = parseMFAPIDate(entry.date);
          if (cutoffDate && isoDate < cutoffDate) continue;
          const nav = parseFloat(entry.nav);
          if (isNaN(nav)) continue;
          rows.push({ code: String(meta.scheme_code), date: isoDate, nav });
        }

        if (rows.length > 0) {
          batchInsert(rows);
          totalNavInserted += rows.length;
        }

        succeeded++;
        processed++;

        // Send progress every 10 schemes or on first/last
        if (i % 10 === 0 || i === total - 1) {
          send({
            type: 'progress',
            current: processed,
            total,
            succeeded,
            failed,
            navRecords: totalNavInserted,
            message: `Ingested ${meta.scheme_name} (${rows.length} NAVs)`,
          });
        }
      } catch (err) {
        failed++;
        processed++;
        if (i % 50 === 0) {
          send({
            type: 'progress',
            current: processed,
            total,
            succeeded,
            failed,
            navRecords: totalNavInserted,
            message: `Error on ${code}: ${err.message}`,
          });
        }
      }

      // Rate limiting: 50ms between requests
      if (i < total - 1) {
        await sleep(50);
      }
    }

    // Final stats
    const schemeCount = db.prepare('SELECT COUNT(*) as count FROM schemes').get();
    const navCount = db.prepare('SELECT COUNT(*) as count FROM nav_history').get();

    send({
      type: 'complete',
      succeeded,
      failed,
      totalNavInserted,
      dbSchemes: schemeCount.count,
      dbNavRecords: navCount.count,
    });
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    pipelineRunning = false;
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Abort pipeline
router.post('/admin/pipeline/abort', (req, res) => {
  if (!pipelineRunning) {
    return res.status(400).json({ error: 'No pipeline running' });
  }
  pipelineAbort = true;
  res.json({ data: { message: 'Abort signal sent' } });
});

// Pipeline status
router.get('/admin/pipeline/status', (req, res) => {
  res.json({ data: { running: pipelineRunning, holdingsRunning: holdingsPipelineRunning } });
});

// ── Holdings Pipeline: scrape portfolio holdings from Groww ────────────────

let holdingsPipelineRunning = false;
let holdingsPipelineAbort = false;

router.post('/admin/holdings-pipeline/start', async (req, res) => {
  if (holdingsPipelineRunning) {
    return res.status(409).json({ error: 'Holdings pipeline already running' });
  }
  if (pipelineRunning) {
    return res.status(409).json({ error: 'NAV pipeline is running — wait for it to finish' });
  }

  const { limit = 500 } = req.body;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Cloudflare/Nginx buffering for SSE
  res.flushHeaders();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  holdingsPipelineRunning = true;
  holdingsPipelineAbort = false;

  try {
    const result = await scrapeHoldings({
      limit: Math.min(limit, 2000),
      delay: 500,
      onProgress: (event) => send({ type: 'progress', ...event }),
      onStatus: (message) => send({ type: 'status', message }),
      shouldAbort: () => holdingsPipelineAbort,
    });

    send({
      type: 'complete',
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      holdingsInserted: result.holdingsInserted,
      instrumentsCreated: result.instrumentsCreated,
      dbHoldings: result.dbHoldings,
      dbInstruments: result.dbInstruments,
      schemesWithHoldings: result.schemesWithHoldings,
    });
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    holdingsPipelineRunning = false;
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

router.post('/admin/holdings-pipeline/abort', (req, res) => {
  if (!holdingsPipelineRunning) {
    return res.status(400).json({ error: 'No holdings pipeline running' });
  }
  holdingsPipelineAbort = true;
  res.json({ data: { message: 'Abort signal sent' } });
});

// ── Dev Access Management ────────────────────────────────────────────────────

// List all dev-authorized emails
router.get('/admin/dev-access', (req, res) => {
  const users = db.prepare('SELECT email, added_by, added_at FROM dev_allowed_users ORDER BY added_at').all();
  res.json({ data: users });
});

// Add an email to dev whitelist
router.post('/admin/dev-access', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  try {
    db.prepare('INSERT OR IGNORE INTO dev_allowed_users (email, added_by) VALUES (?, ?)').run(
      email.toLowerCase().trim(),
      req.user?.email || 'admin'
    );
    res.json({ data: { email: email.toLowerCase().trim(), added: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove an email from dev whitelist
router.delete('/admin/dev-access/:email', (req, res) => {
  const { email } = req.params;
  const adminEmail = process.env.ADMIN_EMAIL || 'anjanr@gmail.com';
  if (email === adminEmail) {
    return res.status(400).json({ error: 'Cannot remove the primary admin from dev access' });
  }
  const result = db.prepare('DELETE FROM dev_allowed_users WHERE email = ?').run(email);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Email not found in dev access list' });
  }
  res.json({ data: { email, removed: true } });
});

export default router;
