import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ── Ensure stock_portfolio tables exist ─────────────────────────────────────

try {
  db.exec(`CREATE TABLE IF NOT EXISTS stock_portfolio_profiles (
    profile_id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    profile_name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_email) REFERENCES users(email)
  )`);
} catch { /* table may already exist */ }

try {
  db.exec(`CREATE TABLE IF NOT EXISTS stock_portfolio_holdings (
    profile_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    quantity REAL NOT NULL,
    purchase_price REAL,
    purchase_date TEXT,
    PRIMARY KEY (profile_id, symbol),
    FOREIGN KEY (profile_id) REFERENCES stock_portfolio_profiles(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (symbol) REFERENCES stocks(symbol)
  )`);
} catch { /* table may already exist */ }

// ── Helper: generate slug from name ─────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// ── GET /api/stock-portfolio/profiles ───────────────────────────────────────

router.get('/stock-portfolio/profiles', (req, res) => {
  const email = req.user.email;

  const profiles = db.prepare(
    `SELECT * FROM stock_portfolio_profiles WHERE user_email = ? ORDER BY created_at DESC`
  ).all(email);

  const result = profiles.map((p) => {
    const count = db.prepare(
      'SELECT COUNT(*) as c FROM stock_portfolio_holdings WHERE profile_id = ?'
    ).get(p.profile_id);
    return {
      id: p.profile_id,
      name: p.profile_name,
      notes: p.notes,
      createdAt: p.created_at,
      holdingCount: count.c,
    };
  });

  res.json({ data: result });
});

// ── POST /api/stock-portfolio/profiles ──────────────────────────────────────

router.post('/stock-portfolio/profiles', (req, res) => {
  const email = req.user.email;
  const { name, notes } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Profile name is required' });
  }

  let profileId = slugify(name);
  const existing = db.prepare(
    'SELECT 1 FROM stock_portfolio_profiles WHERE profile_id = ?'
  ).get(profileId);
  if (existing) profileId += '-' + Date.now().toString(36);

  db.prepare(
    `INSERT INTO stock_portfolio_profiles (profile_id, user_email, profile_name, notes)
     VALUES (?, ?, ?, ?)`
  ).run(profileId, email, name.trim(), notes || null);

  res.json({ data: { id: profileId, name: name.trim() } });
});

// ── DELETE /api/stock-portfolio/profiles/:id ────────────────────────────────

router.delete('/stock-portfolio/profiles/:id', (req, res) => {
  const { id } = req.params;
  const email = req.user.email;

  const profile = db.prepare(
    'SELECT * FROM stock_portfolio_profiles WHERE profile_id = ? AND user_email = ?'
  ).get(id, email);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  db.prepare('DELETE FROM stock_portfolio_holdings WHERE profile_id = ?').run(id);
  db.prepare('DELETE FROM stock_portfolio_profiles WHERE profile_id = ?').run(id);

  res.json({ data: { deleted: true } });
});

// ── GET /api/stock-portfolio/profiles/:id ───────────────────────────────────

router.get('/stock-portfolio/profiles/:id', (req, res) => {
  const { id } = req.params;
  const email = req.user.email;

  const profile = db.prepare(
    'SELECT * FROM stock_portfolio_profiles WHERE profile_id = ? AND user_email = ?'
  ).get(id, email);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  // Get holdings joined with stock_latest for current values
  const holdings = db.prepare(
    `SELECT sph.symbol, sph.quantity, sph.purchase_price, sph.purchase_date,
            sl.close as current_price, sl.change_pct, sl.market_cap, sl.pe_ratio,
            s.name, s.sector, s.industry
     FROM stock_portfolio_holdings sph
     LEFT JOIN stock_latest sl ON sph.symbol = sl.symbol
     LEFT JOIN stocks s ON sph.symbol = s.symbol
     WHERE sph.profile_id = ?
     ORDER BY s.name`
  ).all(id);

  let totalCurrentValue = 0;
  let totalInvestedValue = 0;
  let hasInvestmentData = false;

  const enriched = holdings.map((h) => {
    const currentValue = h.quantity * (h.current_price || 0);
    totalCurrentValue += currentValue;

    const investedValue = h.purchase_price ? h.quantity * h.purchase_price : null;
    if (investedValue !== null) {
      totalInvestedValue += investedValue;
      hasInvestmentData = true;
    }

    return {
      symbol: h.symbol,
      name: h.name,
      sector: h.sector,
      industry: h.industry,
      quantity: h.quantity,
      purchasePrice: h.purchase_price,
      purchaseDate: h.purchase_date,
      currentPrice: h.current_price,
      changePct: h.change_pct,
      currentValue: Math.round(currentValue * 100) / 100,
      investedValue: investedValue ? Math.round(investedValue * 100) / 100 : null,
    };
  });

  // Calculate weights and gains
  for (const h of enriched) {
    h.weight = totalCurrentValue > 0
      ? Math.round((h.currentValue / totalCurrentValue) * 10000) / 10000
      : 0;
    h.gain = h.investedValue !== null
      ? Math.round((h.currentValue - h.investedValue) * 100) / 100
      : null;
    h.gainPct = h.investedValue
      ? Math.round(((h.currentValue - h.investedValue) / h.investedValue) * 10000) / 100
      : null;
  }

  const totalGain = hasInvestmentData
    ? Math.round((totalCurrentValue - totalInvestedValue) * 100) / 100
    : null;
  const totalGainPct = hasInvestmentData && totalInvestedValue > 0
    ? Math.round(((totalCurrentValue - totalInvestedValue) / totalInvestedValue) * 10000) / 100
    : null;

  res.json({
    data: {
      profile: {
        id: profile.profile_id,
        name: profile.profile_name,
        notes: profile.notes,
        createdAt: profile.created_at,
      },
      holdings: enriched,
      summary: {
        totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
        totalInvestedValue: hasInvestmentData ? Math.round(totalInvestedValue * 100) / 100 : null,
        totalGain,
        totalGainPct,
        holdingCount: enriched.length,
      },
    },
  });
});

// ── POST /api/stock-portfolio/profiles/:id/upload ───────────────────────────

router.post('/stock-portfolio/profiles/:id/upload', (req, res) => {
  const { id } = req.params;
  const email = req.user.email;

  const profile = db.prepare(
    'SELECT * FROM stock_portfolio_profiles WHERE profile_id = ? AND user_email = ?'
  ).get(id, email);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const { csv } = req.body;
  if (!csv) {
    return res.status(400).json({ error: 'CSV content is required' });
  }

  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV must have a header and at least one data row' });
  }

  const results = [];
  const insert = db.prepare(
    `INSERT OR REPLACE INTO stock_portfolio_holdings (profile_id, symbol, quantity, purchase_price, purchase_date)
     VALUES (?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((s) => s.trim());
      if (parts.length < 2) continue;

      const [symbolRaw, quantityStr, priceStr, dateStr] = parts;
      const symbol = symbolRaw.toUpperCase();
      const quantity = parseFloat(quantityStr);

      if (isNaN(quantity) || quantity <= 0) {
        results.push({ row: i, symbol, status: 'error', error: 'Invalid quantity' });
        continue;
      }

      // Validate symbol exists in stocks table
      const stockExists = db.prepare('SELECT 1 FROM stocks WHERE symbol = ?').get(symbol);
      if (!stockExists) {
        results.push({ row: i, symbol, status: 'error', error: 'Symbol not found' });
        continue;
      }

      const purchasePrice = priceStr ? parseFloat(priceStr) || null : null;
      const purchaseDate = dateStr || null;

      insert.run(id, symbol, quantity, purchasePrice, purchaseDate);
      results.push({ row: i, symbol, status: 'imported', quantity, purchasePrice, purchaseDate });
    }
  });

  tx();

  const imported = results.filter((r) => r.status === 'imported').length;
  const errors = results.filter((r) => r.status === 'error').length;

  res.json({
    data: {
      results,
      summary: { imported, errors, total: results.length },
    },
  });
});

// ── GET /api/stock-portfolio/profiles/:id/analyze ───────────────────────────

router.get('/stock-portfolio/profiles/:id/analyze', (req, res) => {
  const { id } = req.params;
  const email = req.user.email;

  const profile = db.prepare(
    'SELECT * FROM stock_portfolio_profiles WHERE profile_id = ? AND user_email = ?'
  ).get(id, email);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const holdings = db.prepare(
    `SELECT sph.symbol, sph.quantity, sph.purchase_price,
            sl.close as current_price, sl.pe_ratio, sl.market_cap,
            s.name, s.sector, s.industry
     FROM stock_portfolio_holdings sph
     LEFT JOIN stock_latest sl ON sph.symbol = sl.symbol
     LEFT JOIN stocks s ON sph.symbol = s.symbol
     WHERE sph.profile_id = ?`
  ).all(id);

  if (holdings.length === 0) {
    return res.json({
      data: {
        sectorAllocation: [],
        totalValue: 0,
        totalInvested: null,
        totalGain: null,
        totalGainPct: null,
        holdingCount: 0,
      },
    });
  }

  let totalValue = 0;
  let totalInvested = 0;
  let hasInvestmentData = false;
  const sectorMap = new Map();

  for (const h of holdings) {
    const currentValue = h.quantity * (h.current_price || 0);
    totalValue += currentValue;

    if (h.purchase_price) {
      totalInvested += h.quantity * h.purchase_price;
      hasInvestmentData = true;
    }

    const sector = h.sector || 'Other';
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + currentValue);
  }

  const sectorAllocation = [...sectorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, value]) => ({
      sector,
      value: Math.round(value * 100) / 100,
      weight: totalValue > 0 ? Math.round((value / totalValue) * 10000) / 10000 : 0,
    }));

  const totalGain = hasInvestmentData
    ? Math.round((totalValue - totalInvested) * 100) / 100
    : null;
  const totalGainPct = hasInvestmentData && totalInvested > 0
    ? Math.round(((totalValue - totalInvested) / totalInvested) * 10000) / 100
    : null;

  res.json({
    data: {
      sectorAllocation,
      totalValue: Math.round(totalValue * 100) / 100,
      totalInvested: hasInvestmentData ? Math.round(totalInvested * 100) / 100 : null,
      totalGain,
      totalGainPct,
      holdingCount: holdings.length,
    },
  });
});

export default router;
