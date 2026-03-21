/**
 * Scheduled NAV Update — runs daily at 6 AM IST (Mon-Sat)
 *
 * Smart update logic:
 * 1. Fetch NAV for one popular fund (SBI Liquid Fund) from MFAPI
 * 2. Compare its latest date with our DB's latest date
 * 3. If MFAPI has newer data → run incremental update for all existing schemes
 * 4. If no new data (holiday/weekend) → skip silently
 *
 * Usage: node scripts/scheduledUpdate.js
 * Logs to: /opt/mf-dashboard/logs/scheduled-update.log
 */
import axios from 'axios';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Import DB (reads MF_DB_PATH from env)
const { default: db } = await import('../server/db.js');

// ── Config ───────────────────────────────────────────────────────────────────
const PROBE_SCHEME = '119598'; // SBI Liquid Fund - Direct Growth (updated daily)
const BATCH_DELAY_MS = 80;     // 80ms between MFAPI requests (12.5 req/sec)
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 2;

// ── Logging ──────────────────────────────────────────────────────────────────
const logDir = join(projectRoot, 'logs');
if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
const logFile = join(logDir, 'scheduled-update.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  try {
    appendFileSync(logFile, line + '\n');
  } catch { /* ignore log write errors */ }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseMFAPIDate(dateStr) {
  const [dd, mm, yyyy] = dateStr.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      const { data } = await axios.get(url, { timeout: REQUEST_TIMEOUT });
      return data;
    } catch (err) {
      if (i === retries) throw err;
      await sleep(1000 * (i + 1)); // Backoff: 1s, 2s
    }
  }
}

// ── Prepared statements ──────────────────────────────────────────────────────
const upsertScheme = db.prepare(`
  INSERT OR REPLACE INTO schemes (scheme_code, scheme_name, amc, category, sub_category)
  VALUES (?, ?, ?, ?, ?)
`);

const insertNav = db.prepare(`
  INSERT OR IGNORE INTO nav_history (scheme_code, date, nav)
  VALUES (?, ?, ?)
`);

const batchInsert = db.transaction((rows) => {
  for (const row of rows) {
    insertNav.run(row.code, row.date, row.nav);
  }
});

// ── Main Logic ───────────────────────────────────────────────────────────────
async function run() {
  log('=== Scheduled NAV Update Started ===');

  // Step 1: Check if MFAPI has new data
  log(`Probing MFAPI for latest NAV date (scheme ${PROBE_SCHEME})...`);
  let mfapiLatestDate;
  try {
    const probeData = await fetchWithRetry(`https://api.mfapi.in/mf/${PROBE_SCHEME}`);
    if (!probeData?.data?.[0]?.date) {
      log('ERROR: Could not fetch probe scheme data. Aborting.');
      return;
    }
    mfapiLatestDate = parseMFAPIDate(probeData.data[0].date);
    log(`MFAPI latest date: ${mfapiLatestDate}`);
  } catch (err) {
    log(`ERROR: Failed to probe MFAPI: ${err.message}. Aborting.`);
    return;
  }

  // Step 2: Compare with our DB
  const dbLatest = db.prepare('SELECT MAX(date) as date FROM nav_history').get();
  const dbLatestDate = dbLatest?.date;
  log(`DB latest date: ${dbLatestDate}`);

  if (dbLatestDate && mfapiLatestDate <= dbLatestDate) {
    log(`No new data available (MFAPI: ${mfapiLatestDate}, DB: ${dbLatestDate}). Skipping — likely a holiday.`);
    log('=== Update Complete (skipped) ===');
    return;
  }

  // Step 3: Get all existing scheme codes for incremental update
  const existingSchemes = db.prepare('SELECT scheme_code FROM schemes').all();
  const codes = existingSchemes.map((s) => s.scheme_code);
  log(`Running incremental update for ${codes.length} existing schemes...`);

  const cutoffDate = daysAgo(7); // Only fetch last 7 days of NAV data
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let totalNavInserted = 0;

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];

    try {
      const response = await fetchWithRetry(`https://api.mfapi.in/mf/${code}`);
      const { meta, data: navData } = response;

      if (!meta || !navData) {
        failed++;
        processed++;
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

      // Parse and insert recent NAV records
      const rows = [];
      for (const entry of navData) {
        const isoDate = parseMFAPIDate(entry.date);
        if (isoDate < cutoffDate) break; // NAV data is sorted newest-first, stop early
        const nav = parseFloat(entry.nav);
        if (isNaN(nav)) continue;
        rows.push({ code: String(meta.scheme_code), date: isoDate, nav });
      }

      if (rows.length > 0) {
        batchInsert(rows);
        totalNavInserted += rows.length;
      }

      succeeded++;
    } catch {
      failed++;
    }

    processed++;

    // Progress log every 500 schemes
    if (processed % 500 === 0) {
      log(`Progress: ${processed}/${codes.length} (${succeeded} ok, ${failed} failed, ${totalNavInserted} NAVs)`);
    }

    // Rate limiting
    if (i < codes.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Step 4: Final stats
  const finalSchemeCount = db.prepare('SELECT COUNT(*) as c FROM schemes').get().c;
  const finalNavCount = db.prepare('SELECT COUNT(*) as c FROM nav_history').get().c;
  const newLatest = db.prepare('SELECT MAX(date) as date FROM nav_history').get().date;

  log(`Completed: ${succeeded} succeeded, ${failed} failed, ${totalNavInserted} NAVs inserted`);
  log(`DB now has ${finalSchemeCount} schemes, ${finalNavCount} NAV records, latest: ${newLatest}`);
  log('=== Scheduled NAV Update Complete ===');
}

// Run
run().catch((err) => {
  log(`FATAL ERROR: ${err.message}`);
  process.exit(1);
});
