import { Router } from 'express';
import multer from 'multer';
import { readFileSync } from 'fs';
import db from '../db.js';
import { parseECAS, matchToDatabase } from '../utils/ecasParser.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── Prepared statements ─────────────────────────────────────────────────────

const holdingsQuery = db.prepare(
  `SELECT ph.weight, i.instrument_id, i.name, i.isin, i.sector, i.asset_class
   FROM portfolio_holdings ph
   JOIN instruments i ON ph.instrument_id = i.instrument_id
   WHERE ph.scheme_code = ?
     AND ph.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)
   ORDER BY ph.weight DESC`
);

const latestNavQuery = db.prepare(
  `SELECT nav, date FROM nav_history WHERE scheme_code = ? ORDER BY date DESC LIMIT 1`
);

const schemeInfoQuery = db.prepare(
  `SELECT scheme_code, scheme_name, amc, sub_category FROM schemes WHERE scheme_code = ?`
);

// ── Helper: generate slug from name ─────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// ── Helper: fuzzy match fund name → scheme_code ─────────────────────────────

function matchFund(nameOrCode) {
  const trimmed = (nameOrCode || '').trim();
  if (!trimmed) return null;

  // If all digits → exact scheme code lookup
  if (/^\d+$/.test(trimmed)) {
    const scheme = db.prepare('SELECT scheme_code, scheme_name FROM schemes WHERE scheme_code = ?').get(trimmed);
    return scheme ? { code: scheme.scheme_code, name: scheme.scheme_name, confidence: 'exact' } : null;
  }

  // Fuzzy match by name
  const term = trimmed.toLowerCase();
  const matches = db.prepare(
    `SELECT scheme_code, scheme_name FROM schemes
     WHERE LOWER(scheme_name) LIKE '%' || ? || '%'
     ORDER BY LENGTH(scheme_name) ASC
     LIMIT 5`
  ).all(term);

  if (matches.length === 0) return null;
  // Best match = shortest name containing the search term
  return { code: matches[0].scheme_code, name: matches[0].scheme_name, confidence: matches.length === 1 ? 'exact' : 'fuzzy' };
}

// ── Helper: get holdings with current values ────────────────────────────────

function getProfileHoldings(profileId) {
  const holdings = db.prepare(
    `SELECT cp.scheme_code, cp.units, cp.purchase_nav, cp.purchase_date,
            s.scheme_name, s.amc, s.sub_category
     FROM client_portfolio cp
     JOIN schemes s ON cp.scheme_code = s.scheme_code
     WHERE cp.profile_id = ?
     ORDER BY s.scheme_name`
  ).all(profileId);

  let totalCurrentValue = 0;
  let totalInvestedValue = 0;
  let hasInvestmentData = false;

  const enriched = holdings.map((h) => {
    const nav = latestNavQuery.get(h.scheme_code);
    const currentNav = nav?.nav || 0;
    const currentDate = nav?.date || null;
    const currentValue = h.units * currentNav;
    totalCurrentValue += currentValue;

    const investedValue = h.purchase_nav ? h.units * h.purchase_nav : null;
    if (investedValue !== null) {
      totalInvestedValue += investedValue;
      hasInvestmentData = true;
    }

    return {
      schemeCode: h.scheme_code,
      schemeName: h.scheme_name,
      amc: h.amc,
      subCategory: h.sub_category,
      units: h.units,
      purchaseNav: h.purchase_nav,
      purchaseDate: h.purchase_date,
      currentNav,
      currentDate,
      currentValue: Math.round(currentValue * 100) / 100,
      investedValue: investedValue ? Math.round(investedValue * 100) / 100 : null,
    };
  });

  // Calculate weights and gains after we know totalCurrentValue
  for (const h of enriched) {
    h.weight = totalCurrentValue > 0 ? Math.round((h.currentValue / totalCurrentValue) * 10000) / 10000 : 0;
    h.gain = h.investedValue !== null ? Math.round((h.currentValue - h.investedValue) * 100) / 100 : null;
    h.gainPct = h.investedValue ? Math.round(((h.currentValue - h.investedValue) / h.investedValue) * 10000) / 10000 * 100 : null;
  }

  const totalGain = hasInvestmentData ? Math.round((totalCurrentValue - totalInvestedValue) * 100) / 100 : null;
  const totalGainPct = hasInvestmentData && totalInvestedValue > 0
    ? Math.round(((totalCurrentValue - totalInvestedValue) / totalInvestedValue) * 10000) / 100
    : null;

  return {
    holdings: enriched,
    summary: {
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalInvestedValue: hasInvestmentData ? Math.round(totalInvestedValue * 100) / 100 : null,
      totalGain,
      totalGainPct,
      fundCount: enriched.length,
    },
  };
}

// ── GET /api/portfolio/profiles ─────────────────────────────────────────────

router.get('/portfolio/profiles', (req, res) => {
  const profiles = db.prepare('SELECT * FROM portfolio_profiles ORDER BY created_at DESC').all();

  const result = profiles.map((p) => {
    const count = db.prepare('SELECT COUNT(*) as c FROM client_portfolio WHERE profile_id = ?').get(p.profile_id);
    return {
      id: p.profile_id,
      name: p.profile_name,
      createdAt: p.created_at,
      notes: p.notes,
      fundCount: count.c,
    };
  });

  res.json({ data: result });
});

// ── POST /api/portfolio/profiles ────────────────────────────────────────────

router.post('/portfolio/profiles', (req, res) => {
  const { name, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Profile name is required' });

  let profileId = slugify(name);
  // Ensure unique
  const existing = db.prepare('SELECT 1 FROM portfolio_profiles WHERE profile_id = ?').get(profileId);
  if (existing) profileId += '-' + Date.now().toString(36);

  db.prepare('INSERT INTO portfolio_profiles (profile_id, profile_name, notes) VALUES (?, ?, ?)').run(
    profileId, name.trim(), notes || null
  );

  res.json({ data: { id: profileId, name: name.trim() } });
});

// ── DELETE /api/portfolio/profiles/:id ──────────────────────────────────────

router.delete('/portfolio/profiles/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM client_portfolio WHERE profile_id = ?').run(id);
  db.prepare('DELETE FROM portfolio_profiles WHERE profile_id = ?').run(id);
  res.json({ data: { deleted: true } });
});

// ── GET /api/portfolio/profiles/:id ─────────────────────────────────────────

router.get('/portfolio/profiles/:id', (req, res) => {
  const { id } = req.params;
  const profile = db.prepare('SELECT * FROM portfolio_profiles WHERE profile_id = ?').get(id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const { holdings, summary } = getProfileHoldings(id);

  res.json({
    data: {
      profile: { id: profile.profile_id, name: profile.profile_name, createdAt: profile.created_at, notes: profile.notes },
      holdings,
      summary,
    },
  });
});

// ── POST /api/portfolio/profiles/:id/holdings ───────────────────────────────

router.post('/portfolio/profiles/:id/holdings', (req, res) => {
  const { id } = req.params;
  const { schemeCode, units, purchaseNav, purchaseDate } = req.body;

  if (!schemeCode || !units) return res.status(400).json({ error: 'schemeCode and units are required' });

  // Verify scheme exists
  const scheme = schemeInfoQuery.get(schemeCode);
  if (!scheme) return res.status(404).json({ error: `Scheme ${schemeCode} not found` });

  db.prepare(
    `INSERT OR REPLACE INTO client_portfolio (profile_id, scheme_code, units, purchase_nav, purchase_date)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, schemeCode, units, purchaseNav || null, purchaseDate || null);

  res.json({ data: { schemeCode, schemeName: scheme.scheme_name, units } });
});

// ── DELETE /api/portfolio/profiles/:id/holdings/:code ────────────────────────

router.delete('/portfolio/profiles/:id/holdings/:code', (req, res) => {
  const { id, code } = req.params;
  db.prepare('DELETE FROM client_portfolio WHERE profile_id = ? AND scheme_code = ?').run(id, code);
  res.json({ data: { deleted: true } });
});

// ── POST /api/portfolio/profiles/:id/upload ─────────────────────────────────

router.post('/portfolio/profiles/:id/upload', (req, res) => {
  const { id } = req.params;
  const { csv, confirm } = req.body;

  if (!csv) return res.status(400).json({ error: 'CSV content is required' });

  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return res.status(400).json({ error: 'CSV must have a header and at least one data row' });

  // Skip header
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((s) => s.trim());
    if (parts.length < 2) continue;

    const [nameOrCode, unitsStr, purchaseNavStr, purchaseDateStr] = parts;
    const units = parseFloat(unitsStr);
    if (isNaN(units) || units <= 0) {
      results.push({ row: i, input: nameOrCode, status: 'error', error: 'Invalid units' });
      continue;
    }

    const match = matchFund(nameOrCode);
    if (!match) {
      results.push({ row: i, input: nameOrCode, status: 'unmatched', units });
      continue;
    }

    results.push({
      row: i,
      input: nameOrCode,
      status: 'matched',
      confidence: match.confidence,
      schemeCode: match.code,
      schemeName: match.name,
      units,
      purchaseNav: purchaseNavStr ? parseFloat(purchaseNavStr) || null : null,
      purchaseDate: purchaseDateStr || null,
    });
  }

  // If confirm=true, save matched results
  if (confirm) {
    const insert = db.prepare(
      `INSERT OR REPLACE INTO client_portfolio (profile_id, scheme_code, units, purchase_nav, purchase_date)
       VALUES (?, ?, ?, ?, ?)`
    );
    const tx = db.transaction(() => {
      for (const r of results) {
        if (r.status === 'matched') {
          insert.run(id, r.schemeCode, r.units, r.purchaseNav, r.purchaseDate);
        }
      }
    });
    tx();
  }

  res.json({ data: { results, confirmed: !!confirm } });
});

// ── GET /api/portfolio/template ─────────────────────────────────────────────

router.get('/portfolio/template', (req, res) => {
  const csv = `fund_name_or_code,units,purchase_nav,purchase_date
HDFC Flexi Cap Fund - Direct Plan - Growth,500,25.50,2024-01-15
119551,1000,,
Axis Bluechip Fund Direct Growth,200,45.00,2023-06-01
`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="portfolio-template.csv"');
  res.send(csv);
});

// ── GET /api/portfolio/profiles/:id/analyze ─────────────────────────────────

router.get('/portfolio/profiles/:id/analyze', (req, res) => {
  const { id } = req.params;
  const { holdings } = getProfileHoldings(id);

  if (holdings.length === 0) {
    return res.json({ data: { stockExposure: [], sectorExposure: [], concentration: { totalStocks: 0, top10Weight: 0, top10: [], hhi: 0 } } });
  }

  // Build allocations from current weights
  const allocations = holdings.map((h) => ({ code: h.schemeCode, weight: h.weight }));

  // Reuse existing analysis logic
  const stockMap = new Map();
  const sectorMap = new Map();

  for (const { code, weight: allocWeight } of allocations) {
    const hlds = holdingsQuery.all(code, code);
    for (const h of hlds) {
      const effectiveWeight = (h.weight / 100) * allocWeight;
      const existing = stockMap.get(h.instrument_id);
      if (existing) {
        existing.weight += effectiveWeight;
      } else {
        stockMap.set(h.instrument_id, { name: h.name, isin: h.isin, sector: h.sector, weight: effectiveWeight });
      }
      const sector = h.sector || 'Other';
      sectorMap.set(sector, (sectorMap.get(sector) || 0) + effectiveWeight);
    }
  }

  const stockExposure = [...stockMap.values()]
    .sort((a, b) => b.weight - a.weight)
    .map((s) => ({ ...s, weight: Math.round(s.weight * 10000) / 10000 }));

  const sectorExposure = [...sectorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, weight]) => ({ sector, weight: Math.round(weight * 10000) / 10000 }));

  const top10 = stockExposure.slice(0, 10);
  const top10Weight = top10.reduce((s, h) => s + h.weight, 0);
  const hhi = stockExposure.reduce((s, h) => s + h.weight ** 2, 0);

  res.json({
    data: {
      stockExposure,
      sectorExposure,
      concentration: {
        totalStocks: stockExposure.length,
        top10Weight: Math.round(top10Weight * 10000) / 10000,
        top10,
        hhi: Math.round(hhi * 10000) / 10000,
      },
    },
  });
});

// ── POST /api/portfolio/upload-ecas — Parse ECAS PDF and preview holdings ────

router.post('/portfolio/upload-ecas', upload.single('ecas'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    // Parse the ECAS PDF
    const parsed = await parseECAS(req.file.buffer);

    // Match holdings to our database
    const matchedHoldings = matchToDatabase(parsed.holdings, db);

    const matched = matchedHoldings.filter(h => h.matched);
    const unmatched = matchedHoldings.filter(h => !h.matched);

    res.json({
      data: {
        investor: parsed.investor,
        summary: {
          ...parsed.summary,
          matchedCount: matched.length,
          unmatchedCount: unmatched.length,
        },
        holdings: matchedHoldings.map(h => ({
          amc: h.amc,
          folio: h.folio,
          fundName: h.fundName,
          isin: h.isin,
          units: h.units,
          nav: h.nav,
          navDate: h.navDate,
          costValue: h.costValue,
          marketValue: h.marketValue,
          gain: h.gain,
          gainPct: Math.round(h.gainPct * 100) / 100,
          transactions: h.transactions,
          totalPurchased: h.totalPurchased,
          totalRedeemed: h.totalRedeemed,
          sipCount: h.sipCount,
          schemeCode: h.schemeCode,
          matchedSchemeName: h.matchedSchemeName,
          matched: h.matched,
        })),
      },
    });
  } catch (err) {
    console.error('ECAS parse error:', err);
    res.status(500).json({ error: `Failed to parse ECAS PDF: ${err.message}` });
  }
});

// ── POST /api/portfolio/import-ecas — Confirm and save ECAS holdings to profile

router.post('/portfolio/import-ecas', async (req, res) => {
  try {
    const { profileName, holdings } = req.body;

    if (!profileName?.trim()) return res.status(400).json({ error: 'Profile name is required' });
    if (!holdings?.length) return res.status(400).json({ error: 'No holdings to import' });

    // Create profile
    let profileId = slugify(profileName);
    const existing = db.prepare('SELECT 1 FROM portfolio_profiles WHERE profile_id = ?').get(profileId);
    if (existing) profileId += '-' + Date.now().toString(36);

    const tx = db.transaction(() => {
      db.prepare('INSERT INTO portfolio_profiles (profile_id, profile_name, notes) VALUES (?, ?, ?)').run(
        profileId, profileName.trim(), 'Imported from ECAS statement'
      );

      const insert = db.prepare(
        `INSERT OR REPLACE INTO client_portfolio (profile_id, scheme_code, units, purchase_nav, purchase_date)
         VALUES (?, ?, ?, ?, ?)`
      );

      let importedCount = 0;
      for (const h of holdings) {
        if (h.schemeCode && h.units > 0) {
          // Use cost per unit as purchase_nav
          const purchaseNav = h.costValue && h.units ? Math.round((h.costValue / h.units) * 10000) / 10000 : null;
          insert.run(profileId, h.schemeCode, h.units, purchaseNav, null);
          importedCount++;
        }
      }

      return importedCount;
    });

    const importedCount = tx();

    res.json({
      data: {
        profileId,
        profileName: profileName.trim(),
        importedCount,
        totalHoldings: holdings.length,
      },
    });
  } catch (err) {
    console.error('ECAS import error:', err);
    res.status(500).json({ error: `Failed to import ECAS holdings: ${err.message}` });
  }
});

// ── POST /api/portfolio/analyze (legacy — keep for backwards compatibility) ──

router.post('/portfolio/analyze', (req, res) => {
  const { allocations } = req.body;
  if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ error: 'allocations array is required' });
  }

  const stockMap = new Map();
  const sectorMap = new Map();

  for (const { code, weight: allocWeight } of allocations) {
    const holdings = holdingsQuery.all(code, code);
    for (const h of holdings) {
      const effectiveWeight = (h.weight / 100) * allocWeight;
      const existing = stockMap.get(h.instrument_id);
      if (existing) {
        existing.weight += effectiveWeight;
      } else {
        stockMap.set(h.instrument_id, { name: h.name, isin: h.isin, sector: h.sector, weight: effectiveWeight });
      }
      sectorMap.set(h.sector || 'Other', (sectorMap.get(h.sector || 'Other') || 0) + effectiveWeight);
    }
  }

  const stockExposure = [...stockMap.values()]
    .sort((a, b) => b.weight - a.weight)
    .map((s) => ({ ...s, weight: Math.round(s.weight * 10000) / 10000 }));

  const sectorExposure = [...sectorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, weight]) => ({ sector, weight: Math.round(weight * 10000) / 10000 }));

  const top10 = stockExposure.slice(0, 10);

  res.json({
    data: {
      stockExposure,
      sectorExposure,
      concentration: {
        totalStocks: stockExposure.length,
        top10Weight: Math.round(top10.reduce((s, h) => s + h.weight, 0) * 10000) / 10000,
        top10,
        hhi: Math.round(stockExposure.reduce((s, h) => s + h.weight ** 2, 0) * 10000) / 10000,
      },
    },
  });
});

export default router;
