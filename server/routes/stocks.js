import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ── Prepared statements ─────────────────────────────────────────────────────

const stockListQuery = db.prepare(
  `SELECT sl.*, s.name, s.sector, s.industry, s.isin
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   ORDER BY s.symbol`
);

const stockSearchQuery = db.prepare(
  `SELECT sl.*, s.name, s.sector, s.industry, s.isin
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE (UPPER(s.symbol) LIKE UPPER(?) OR UPPER(s.name) LIKE UPPER(?))
   ORDER BY s.symbol`
);

const stockDetailQuery = db.prepare(
  `SELECT sl.*, s.name, s.sector, s.industry, s.isin, s.is_nifty500
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE sl.symbol = ?`
);

const stockPricesQuery = db.prepare(
  `SELECT date, open, high, low, close, volume
   FROM stock_prices
   WHERE symbol = ? AND date >= ?
   ORDER BY date ASC`
);

const stockFundamentalsQuery = db.prepare(
  `SELECT *
   FROM stock_fundamentals
   WHERE symbol = ?
   ORDER BY quarter DESC`
);

// ── GET /api/stocks — list stocks with filtering and sorting ─────────────────

router.get('/stocks', (req, res) => {
  const { search, sector, industry, sort, dir, nifty500 } = req.query;

  let rows;
  if (search) {
    const term = `%${search}%`;
    rows = stockSearchQuery.all(term, term);
  } else {
    rows = stockListQuery.all();
  }

  // Filter by sector
  if (sector) {
    rows = rows.filter((r) => r.sector === sector);
  }

  // Filter by industry
  if (industry) {
    rows = rows.filter((r) => r.industry === industry);
  }

  // Filter Nifty 500
  if (nifty500 === '1') {
    rows = rows.filter((r) => r.nifty500 === 1);
  }

  // Sort
  const sortField = sort || 'symbol';
  const sortDir = dir === 'desc' ? -1 : 1;
  const validSorts = ['symbol', 'name', 'market_cap', 'pe_ratio', 'change_pct'];
  if (validSorts.includes(sortField)) {
    rows.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') return aVal.localeCompare(bVal) * sortDir;
      return (aVal - bVal) * sortDir;
    });
  }

  res.json({ data: rows, meta: { count: rows.length } });
});

// ── GET /api/stocks/:symbol — single stock detail ───────────────────────────

router.get('/stocks/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const row = stockDetailQuery.get(symbol);

  if (!row) {
    return res.status(404).json({ error: 'Stock not found' });
  }

  res.json({ data: row });
});

// ── GET /api/stocks/:symbol/prices — OHLCV price history ────────────────────

router.get('/stocks/:symbol/prices', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const { from, to, period } = req.query;

  // Determine start date from period or explicit 'from'
  let startDate;
  if (from) {
    startDate = from;
  } else {
    const now = new Date();
    const periodMap = {
      '1m': 30,
      '3m': 91,
      '6m': 182,
      '1y': 365,
      '3y': 1095,
      '5y': 1825,
      '10y': 3650,
      'max': 36500,
    };
    const days = periodMap[period] || 365;
    now.setDate(now.getDate() - days);
    startDate = now.toISOString().slice(0, 10);
  }

  let rows = stockPricesQuery.all(symbol, startDate);

  // Filter by end date if specified
  if (to) {
    rows = rows.filter((r) => r.date <= to);
  }

  res.json({ data: rows });
});

// ── GET /api/stocks/:symbol/fundamentals — quarterly fundamentals ───────────

router.get('/stocks/:symbol/fundamentals', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const rows = stockFundamentalsQuery.all(symbol);

  res.json({ data: rows });
});

export default router;
