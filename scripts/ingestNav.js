import axios from 'axios';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import db from '../server/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const incremental = process.argv.includes('--incremental');
const allDirect = process.argv.includes('--all-direct');
const allGrowth = process.argv.includes('--all-growth');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Date helpers
function parseDDMMYYYY(dateStr) {
  const [dd, mm, yyyy] = dateStr.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Load scheme codes
let schemeCodes;
if (allGrowth || allDirect) {
  const label = allGrowth ? 'All Growth (Direct + Regular)' : 'Direct-Growth only';
  console.log(`Fetching ${label} schemes from MFAPI...`);
  const { data } = await axios.get('https://api.mfapi.in/mf', { timeout: 30000 });
  schemeCodes = data
    .filter((s) => {
      const name = (s.schemeName || '').toLowerCase();
      // Exclude IDCW/dividend PLAN types, but keep funds with "dividend" in category name (e.g. "Dividend Yield Fund")
      const isIDCW = name.includes('idcw') || name.includes('dividend payout') || name.includes('dividend reinvestment') || name.includes('dividend option');
      const isGrowth = name.includes('growth') && !isIDCW;
      if (allGrowth) return isGrowth;
      return isGrowth && name.includes('direct');
    })
    .map((s) => s.schemeCode);
  console.log(`Found ${schemeCodes.length} schemes (filtered from ${data.length} total)`);
} else {
  schemeCodes = JSON.parse(
    readFileSync(join(__dirname, 'schemeList.json'), 'utf-8')
  );
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

const cutoffDate = incremental ? daysAgo(30) : null;

console.log(
  `Starting ${incremental ? 'incremental (last 30 days)' : 'full'} NAV ingestion for ${schemeCodes.length} schemes...\n`
);

let totalNavRecords = 0;

for (let i = 0; i < schemeCodes.length; i++) {
  const code = schemeCodes[i];

  try {
    const { data: response } = await axios.get(
      `https://api.mfapi.in/mf/${code}`
    );

    const { meta, data: navData } = response;

    if (!meta || !meta.scheme_name || !navData) {
      console.warn(`  [${i + 1}/${schemeCodes.length}] Scheme ${code} — no data, skipping`);
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

    // Batch insert NAV records in a transaction
    let inserted = 0;
    const insertBatch = db.transaction((rows) => {
      for (const row of rows) {
        insertNav.run(row.code, row.date, row.nav);
        inserted++;
      }
    });

    const rows = [];
    for (const entry of navData) {
      const isoDate = parseDDMMYYYY(entry.date);
      if (cutoffDate && isoDate < cutoffDate) continue;
      const nav = parseFloat(entry.nav);
      if (isNaN(nav)) continue;
      rows.push({ code: String(code), date: isoDate, nav });
    }

    insertBatch(rows);
    totalNavRecords += inserted;

    console.log(
      `  Ingested [${i + 1}/${schemeCodes.length}] ${meta.scheme_name} — ${inserted} NAV records`
    );
  } catch (err) {
    console.warn(
      `  [${i + 1}/${schemeCodes.length}] Scheme ${code} — ERROR: ${err.message}`
    );
  }

  // Rate limiting
  if (i < schemeCodes.length - 1) {
    await sleep(100);
  }
}

console.log(`\nDone. Total NAV records inserted: ${totalNavRecords}`);

// Summary
const schemeCount = db.prepare('SELECT COUNT(*) as count FROM schemes').get();
const navCount = db.prepare('SELECT COUNT(*) as count FROM nav_history').get();
console.log(`Database: ${schemeCount.count} schemes, ${navCount.count} NAV records`);
