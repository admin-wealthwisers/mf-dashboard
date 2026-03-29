import { Router } from 'express';
import db from '../db.js';
import {
  computeSMA,
  computeRSI,
  computeMACD,
  computeBollingerBands,
  computeStockReturns,
  computeStockDNA,
  computeStockScore,
} from '../services/stockAnalyticsEngine.js';

const router = Router();

// ── Dashboard cache ─────────────────────────────────────────────────────────

let dashboardCache = null;
let dashboardCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Prepared statements ─────────────────────────────────────────────────────

const topGainersStmt = db.prepare(
  `SELECT sl.*, s.name, s.sector, s.industry
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE sl.change_pct IS NOT NULL
   ORDER BY sl.change_pct DESC
   LIMIT 5`
);

const topLosersStmt = db.prepare(
  `SELECT sl.*, s.name, s.sector, s.industry
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE sl.change_pct IS NOT NULL
   ORDER BY sl.change_pct ASC
   LIMIT 5`
);

const totalStocksStmt = db.prepare(
  `SELECT COUNT(*) as count FROM stock_latest`
);

const advancingStmt = db.prepare(
  `SELECT COUNT(*) as count FROM stock_latest WHERE change_pct > 0`
);

const decliningStmt = db.prepare(
  `SELECT COUNT(*) as count FROM stock_latest WHERE change_pct < 0`
);

const sectorPerfStmt = db.prepare(
  `SELECT s.sector, AVG(sl.change_pct) as avg_change_pct, COUNT(*) as count
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE s.sector IS NOT NULL AND sl.change_pct IS NOT NULL
   GROUP BY s.sector
   ORDER BY avg_change_pct DESC`
);

const stockDetailStmt = db.prepare(
  `SELECT sl.*, s.name, s.sector, s.industry, s.isin, s.is_nifty500
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE sl.symbol = ?`
);

const stockPricesStmt = db.prepare(
  `SELECT date, open, high, low, close, volume
   FROM stock_prices
   WHERE symbol = ?
   ORDER BY date ASC`
);

const stockFundamentalsStmt = db.prepare(
  `SELECT * FROM stock_fundamentals
   WHERE symbol = ?
   ORDER BY quarter DESC
   LIMIT 1`
);

const peersBySymbolStmt = db.prepare(
  `SELECT sl.*, s.name, s.sector, s.industry
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE s.sector = (SELECT sector FROM stocks WHERE symbol = ?)
     AND sl.symbol != ?
   ORDER BY sl.market_cap DESC
   LIMIT 10`
);

const peerFundamentalsStmt = db.prepare(
  `SELECT sf.symbol, sf.pe_ratio, sf.pb_ratio, sf.roe, sf.revenue_growth,
          sf.profit_growth, sf.debt_to_equity, sf.dividend_yield, sl.market_cap
   FROM stock_fundamentals sf
   JOIN stock_latest sl ON sf.symbol = sl.symbol
   JOIN stocks s ON sf.symbol = s.symbol
   WHERE s.sector = (SELECT sector FROM stocks WHERE symbol = ?)
   ORDER BY sf.quarter DESC`
);

const sectorAvgStmt = db.prepare(
  `SELECT s.sector,
          AVG(sl.change_pct) as avg_change_pct,
          AVG(sl.pe_ratio) as avg_pe,
          AVG(sl.market_cap) as avg_market_cap,
          COUNT(*) as count
   FROM stock_latest sl
   JOIN stocks s ON sl.symbol = s.symbol
   WHERE s.sector IS NOT NULL
   GROUP BY s.sector
   ORDER BY avg_change_pct DESC`
);

// ── GET /api/stock-analytics/dashboard ──────────────────────────────────────

router.get('/stock-analytics/dashboard', (req, res) => {
  if (dashboardCache && (Date.now() - dashboardCacheTime) < CACHE_TTL) {
    return res.json(dashboardCache);
  }

  const gainers = topGainersStmt.all();
  const losers = topLosersStmt.all();
  const totalStocks = totalStocksStmt.get().count;
  const advancing = advancingStmt.get().count;
  const declining = decliningStmt.get().count;
  const sectorPerformance = sectorPerfStmt.all().map((r) => ({
    sector: r.sector,
    avgChangePct: Math.round(r.avg_change_pct * 100) / 100,
    count: r.count,
  }));

  const response = {
    data: {
      gainers,
      losers,
      totalStocks,
      advancing,
      declining,
      sectorPerformance,
    },
  };

  dashboardCache = response;
  dashboardCacheTime = Date.now();

  res.json(response);
});

// ── GET /api/stock-analytics/scorecard/:symbol ──────────────────────────────

router.get('/stock-analytics/scorecard/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  const stock = stockDetailStmt.get(symbol);
  if (!stock) {
    return res.status(404).json({ error: 'Stock not found' });
  }

  const prices = stockPricesStmt.all(symbol);
  const fundamentals = stockFundamentalsStmt.get(symbol);

  // Gather peer fundamentals for percentile ranking
  const peerFundRows = peerFundamentalsStmt.all(symbol);
  // Deduplicate — keep latest quarter per symbol
  const peerMap = new Map();
  for (const row of peerFundRows) {
    if (!peerMap.has(row.symbol)) {
      peerMap.set(row.symbol, row);
    }
  }
  const peers = [...peerMap.values()];

  // Peer symbols
  const peerStocks = peersBySymbolStmt.all(symbol, symbol);
  const peerSymbols = peerStocks.map((p) => p.symbol);

  // Add return data to peers for momentum percentile
  const peerReturns = peerStocks.map((p) => {
    const pPrices = stockPricesStmt.all(p.symbol);
    const r = computeStockReturns(pPrices);
    return { ...p, return3M: r.return3M, return1Y: r.return1Y };
  });

  // Merge peer fundamentals with return data
  const mergedPeers = peers.map((p) => {
    const ret = peerReturns.find((r) => r.symbol === p.symbol);
    return { ...p, return3M: ret?.return3M, return1Y: ret?.return1Y };
  });

  const returns = computeStockReturns(prices);
  const dna = computeStockDNA(prices, fundamentals || {}, mergedPeers);
  const score = computeStockScore(prices, fundamentals || {}, mergedPeers);

  res.json({
    data: {
      stock,
      fundamentals,
      returns,
      dna,
      score,
      peerSymbols,
    },
  });
});

// ── GET /api/stock-analytics/technical/:symbol ──────────────────────────────

router.get('/stock-analytics/technical/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const { indicators } = req.query;

  const prices = stockPricesStmt.all(symbol);
  if (prices.length === 0) {
    return res.status(404).json({ error: 'No price data found' });
  }

  const requested = indicators ? indicators.split(',').map((s) => s.trim().toLowerCase()) : ['sma', 'rsi', 'macd', 'bb'];
  const result = {};

  if (requested.includes('sma')) {
    result.sma20 = computeSMA(prices, 20);
    result.sma50 = computeSMA(prices, 50);
    result.sma200 = computeSMA(prices, 200);
  }

  if (requested.includes('rsi')) {
    result.rsi = computeRSI(prices, 14);
  }

  if (requested.includes('macd')) {
    result.macd = computeMACD(prices);
  }

  if (requested.includes('bb')) {
    result.bollingerBands = computeBollingerBands(prices, 20, 2);
  }

  res.json({ data: result });
});

// ── GET /api/stock-analytics/compare ────────────────────────────────────────

router.get('/stock-analytics/compare', (req, res) => {
  const { symbols } = req.query;
  if (!symbols) {
    return res.status(400).json({ error: 'symbols query parameter is required (comma-separated)' });
  }

  const symbolList = symbols.split(',').map((s) => s.trim().toUpperCase()).slice(0, 5);
  const result = [];

  for (const symbol of symbolList) {
    const stock = stockDetailStmt.get(symbol);
    if (!stock) continue;

    const prices = stockPricesStmt.all(symbol);
    const fundamentals = stockFundamentalsStmt.get(symbol);

    // Normalize prices to base 100 from first available date
    let normalized = [];
    if (prices.length > 0) {
      const base = prices[0].close;
      normalized = prices.map((p) => ({
        date: p.date,
        value: Math.round((p.close / base) * 10000) / 100,
      }));
    }

    result.push({
      symbol,
      name: stock.name,
      prices: normalized,
      fundamentals,
    });
  }

  res.json({ data: result });
});

// ── GET /api/stock-analytics/peers/:symbol ──────────────────────────────────

router.get('/stock-analytics/peers/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  const stock = db.prepare('SELECT sector FROM stocks WHERE symbol = ?').get(symbol);
  if (!stock) {
    return res.status(404).json({ error: 'Stock not found' });
  }

  const peers = peersBySymbolStmt.all(symbol, symbol);

  res.json({ data: peers, meta: { count: peers.length, sector: stock.sector } });
});

// ── GET /api/stock-analytics/mf-holdings/:symbol ────────────────────────────

router.get('/stock-analytics/mf-holdings/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  // Look up ISIN from stocks table
  const stock = db.prepare('SELECT isin FROM stocks WHERE symbol = ?').get(symbol);
  if (!stock || !stock.isin) {
    return res.json({ data: [], meta: { count: 0 } });
  }

  // Find instrument by ISIN
  const instrument = db.prepare('SELECT instrument_id FROM instruments WHERE isin = ?').get(stock.isin);
  if (!instrument) {
    return res.json({ data: [], meta: { count: 0 } });
  }

  // Find MF schemes holding this instrument
  const holdings = db.prepare(
    `SELECT ph.scheme_code, s.scheme_name, s.amc, ph.weight
     FROM portfolio_holdings ph
     JOIN schemes s ON ph.scheme_code = s.scheme_code
     WHERE ph.instrument_id = ?
       AND ph.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE instrument_id = ?)
     ORDER BY ph.weight DESC`
  ).all(instrument.instrument_id, instrument.instrument_id);

  res.json({ data: holdings, meta: { count: holdings.length } });
});

// ── GET /api/stock-analytics/sector-performance ─────────────────────────────

router.get('/stock-analytics/sector-performance', (req, res) => {
  const sectors = sectorAvgStmt.all().map((r) => ({
    sector: r.sector,
    avgChangePct: Math.round(r.avg_change_pct * 100) / 100,
    avgPE: r.avg_pe !== null ? Math.round(r.avg_pe * 100) / 100 : null,
    avgMarketCap: r.avg_market_cap !== null ? Math.round(r.avg_market_cap) : null,
    count: r.count,
  }));

  res.json({ data: sectors, meta: { count: sectors.length } });
});

export default router;
