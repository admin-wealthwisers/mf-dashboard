import axios from 'axios';
import db from '../db.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SITEMAP_URL = 'https://groww.in/mf-sitemap.xml';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Prepared statements ────────────────────────────────────────────────────

const findInstrumentByName = db.prepare(
  'SELECT instrument_id FROM instruments WHERE name = ? COLLATE NOCASE'
);

const findInstrumentByIsin = db.prepare(
  'SELECT instrument_id FROM instruments WHERE isin = ?'
);

const insertInstrument = db.prepare(
  `INSERT INTO instruments (name, isin, asset_class, sector, country) VALUES (?, ?, ?, ?, 'India')`
);

const insertHolding = db.prepare(
  `INSERT OR REPLACE INTO portfolio_holdings (scheme_code, instrument_id, weight, report_date) VALUES (?, ?, ?, ?)`
);

const deleteOldHoldings = db.prepare(
  'DELETE FROM portfolio_holdings WHERE scheme_code = ?'
);

const schemeExists = db.prepare(
  'SELECT 1 FROM schemes WHERE scheme_code = ?'
);

// ── Map Groww instrument_name → asset_class ────────────────────────────────

function mapAssetClass(instrumentName) {
  if (!instrumentName) return 'Other';
  const n = instrumentName.toLowerCase();
  if (n.includes('equity') || n === 'eq') return 'Equity';
  if (n.includes('forgn')) return 'Equity';
  if (n.includes('debt') || n.includes('bond') || n.includes('debenture') || n.includes('ncd')) return 'Debt';
  if (n.includes('govt') || n.includes('gsec') || n.includes('t-bill') || n.includes('sov')) return 'Govt Securities';
  if (n.includes('cash') || n.includes('repo') || n.includes('trep') || n.includes('cblo') || n.includes('net ca')) return 'Cash';
  if (n.includes('reit') || n.includes('invit')) return 'REIT/InvIT';
  if (n.includes('gold') || n.includes('silver')) return 'Commodity';
  if (n.includes('cd') || n.includes('cp') || n.includes('commercial')) return 'Money Market';
  if (n.includes('mf') || n.includes('mutual') || n.includes('etf')) return 'MF/ETF';
  return 'Other';
}

// ── Fetch sitemap and extract Direct-Growth fund slugs ─────────────────────

async function fetchSitemapSlugs() {
  const res = await axios.get(SITEMAP_URL, {
    headers: { 'User-Agent': UA },
    timeout: 30000,
  });

  const urls =
    res.data.match(
      /https:\/\/groww\.in\/mutual-funds\/[a-z0-9][a-z0-9'-]+[^<\s]*/g
    ) || [];

  // Filter to fund detail pages with "direct" and "growth" in the slug
  const slugs = urls
    .filter((u) => u.includes('-direct') && u.includes('growth'))
    .map((u) => u.replace('https://groww.in/mutual-funds/', ''));

  return [...new Set(slugs)]; // deduplicate
}

// ── Fetch a single fund page and parse __NEXT_DATA__ ───────────────────────

async function fetchFundData(slug) {
  const url = `https://groww.in/mutual-funds/${slug}`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    timeout: 20000,
    validateStatus: (s) => s < 500,
  });

  if (res.status !== 200) return null;

  const match = res.data.match(
    /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
  );
  if (!match) return null;

  const nd = JSON.parse(match[1]);
  const mf = nd.props?.pageProps?.mfServerSideData;
  if (!mf) return null;

  return {
    schemeCode: String(mf.scheme_code),
    schemeName: mf.scheme_name || slug,
    holdings: mf.holdings || [],
  };
}

// ── Store holdings for a single scheme ─────────────────────────────────────

const storeSchemeHoldings = db.transaction((schemeCode, holdings, reportDate) => {
  // Clear old holdings for this scheme, then insert fresh
  deleteOldHoldings.run(schemeCode);

  let created = 0;
  for (const h of holdings) {
    const name = h.company_name?.trim();
    if (!name) continue;

    const weight = h.corpus_per / 100; // convert percentage to decimal
    if (weight <= 0) continue;

    const sector = h.sector_name || 'Other';
    const assetClass = mapAssetClass(h.instrument_name || h.nature_name);
    const isin = h.isin || null; // Groww doesn't always provide ISIN

    // Find or create instrument
    let instrumentId;
    if (isin) {
      const existing = findInstrumentByIsin.get(isin);
      if (existing) {
        instrumentId = existing.instrument_id;
      }
    }
    if (!instrumentId) {
      const byName = findInstrumentByName.get(name);
      if (byName) {
        instrumentId = byName.instrument_id;
      }
    }
    if (!instrumentId) {
      const result = insertInstrument.run(name, isin, assetClass, sector);
      instrumentId = result.lastInsertRowid;
      created++;
    }

    insertHolding.run(schemeCode, instrumentId, weight, reportDate);
  }

  return { holdingsInserted: holdings.length, instrumentsCreated: created };
});

// ── Main pipeline orchestrator ─────────────────────────────────────────────

export async function scrapeHoldings({
  limit = 500,
  onProgress,
  onStatus,
  shouldAbort,
  delay = 500,
}) {
  const stats = {
    total: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    holdingsInserted: 0,
    instrumentsCreated: 0,
  };

  // Step 1: Fetch sitemap
  onStatus?.('Fetching Groww mutual fund sitemap...');
  let slugs;
  try {
    slugs = await fetchSitemapSlugs();
    onStatus?.(`Found ${slugs.length} Direct-Growth fund pages in sitemap`);
  } catch (e) {
    throw new Error(`Failed to fetch sitemap: ${e.message}`);
  }

  // Step 2: Optionally limit to schemes in our DB
  // Get our scheme codes for matching
  const ourSchemes = new Set(
    db
      .prepare('SELECT scheme_code FROM schemes')
      .all()
      .map((r) => r.scheme_code)
  );

  stats.total = Math.min(slugs.length, limit);
  onStatus?.(
    `Processing up to ${stats.total} funds (our DB has ${ourSchemes.size} schemes)...`
  );

  const today = new Date().toISOString().slice(0, 10);
  let consecutiveErrors = 0;
  let currentDelay = delay;

  for (let i = 0; i < slugs.length && stats.succeeded + stats.failed + stats.skipped < limit; i++) {
    if (shouldAbort?.()) {
      onStatus?.('Pipeline aborted by user');
      break;
    }

    const slug = slugs[i];

    try {
      const fundData = await fetchFundData(slug);

      if (!fundData) {
        stats.skipped++;
        consecutiveErrors = 0;
        // Don't log skips to reduce noise
        if ((stats.skipped % 20) === 0) {
          onProgress?.({
            current: stats.succeeded + stats.failed + stats.skipped,
            total: stats.total,
            succeeded: stats.succeeded,
            failed: stats.failed,
            holdingsInserted: stats.holdingsInserted,
            message: `Skipped ${stats.skipped} non-matching pages...`,
          });
        }
        await sleep(currentDelay);
        continue;
      }

      // Check if this scheme exists in our DB
      if (!ourSchemes.has(fundData.schemeCode)) {
        stats.skipped++;
        await sleep(currentDelay);
        continue;
      }

      if (fundData.holdings.length === 0) {
        stats.skipped++;
        await sleep(currentDelay);
        continue;
      }

      // Store holdings
      const reportDate =
        fundData.holdings[0]?.portfolio_date?.slice(0, 10) || today;
      const result = storeSchemeHoldings(
        fundData.schemeCode,
        fundData.holdings,
        reportDate
      );

      stats.succeeded++;
      stats.holdingsInserted += result.holdingsInserted;
      stats.instrumentsCreated += result.instrumentsCreated;
      consecutiveErrors = 0;
      currentDelay = delay; // reset delay after success

      onProgress?.({
        current: stats.succeeded + stats.failed + stats.skipped,
        total: stats.total,
        succeeded: stats.succeeded,
        failed: stats.failed,
        holdingsInserted: stats.holdingsInserted,
        message: `${fundData.schemeName} (${fundData.holdings.length} holdings)`,
      });
    } catch (e) {
      const statusCode = e.response?.status;

      if (statusCode === 429) {
        // Rate limited — back off
        currentDelay = Math.min(currentDelay * 2, 5000);
        onStatus?.(
          `Rate limited. Backing off to ${currentDelay}ms between requests...`
        );
        await sleep(currentDelay);
        i--; // retry this slug
        continue;
      }

      stats.failed++;
      consecutiveErrors++;

      if (consecutiveErrors >= 20) {
        onStatus?.(
          `Warning: ${consecutiveErrors} consecutive errors. Network may be down.`
        );
      }

      // Only log every 5th failure to reduce noise
      if (stats.failed % 5 === 1) {
        onProgress?.({
          current: stats.succeeded + stats.failed + stats.skipped,
          total: stats.total,
          succeeded: stats.succeeded,
          failed: stats.failed,
          holdingsInserted: stats.holdingsInserted,
          message: `Error on ${slug}: ${e.message?.slice(0, 80)}`,
        });
      }
    }

    await sleep(currentDelay);
  }

  // Final DB stats
  const dbHoldings = db
    .prepare('SELECT COUNT(*) as c FROM portfolio_holdings')
    .get().c;
  const dbInstruments = db
    .prepare('SELECT COUNT(*) as c FROM instruments')
    .get().c;
  const schemesWithHoldings = db
    .prepare('SELECT COUNT(DISTINCT scheme_code) as c FROM portfolio_holdings')
    .get().c;

  return {
    ...stats,
    dbHoldings,
    dbInstruments,
    schemesWithHoldings,
  };
}
