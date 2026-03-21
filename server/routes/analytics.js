import { Router } from 'express';
import db from '../db.js';
import {
  computeCAGR,
  computeVolatility,
  computeSharpe,
  computeSortino,
  computeMaxDrawdown,
  computeDrawdownSeries,
  computeRollingReturns,
  computePeriodCAGR,
  computePercentileRank,
  computeDownsideProtection,
} from '../services/analyticsEngine.js';

const router = Router();

// Helper: fetch NAV series for a scheme
function getNavSeries(code) {
  return db
    .prepare('SELECT date, nav FROM nav_history WHERE scheme_code = ? ORDER BY date')
    .all(code);
}

// Helper: latest report date subquery
const LATEST_REPORT = `(SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)`;

// GET /api/analytics/sector/:code — sector breakdown
router.get('/analytics/sector/:code', (req, res) => {
  const { code } = req.params;

  const rows = db
    .prepare(
      `SELECT i.sector, SUM(ph.weight) as total_weight, COUNT(*) as holding_count
       FROM portfolio_holdings ph
       JOIN instruments i ON ph.instrument_id = i.instrument_id
       WHERE ph.scheme_code = ? AND ph.report_date = ${LATEST_REPORT}
       GROUP BY i.sector
       ORDER BY total_weight DESC`
    )
    .all(code, code);

  res.json({ data: rows, meta: { count: rows.length } });
});

// GET /api/analytics/top-holdings/:code — top 10 holdings by weight
router.get('/analytics/top-holdings/:code', (req, res) => {
  const { code } = req.params;

  const rows = db
    .prepare(
      `SELECT ph.weight, i.name, i.isin, i.sector
       FROM portfolio_holdings ph
       JOIN instruments i ON ph.instrument_id = i.instrument_id
       WHERE ph.scheme_code = ? AND ph.report_date = ${LATEST_REPORT}
       ORDER BY ph.weight DESC
       LIMIT 10`
    )
    .all(code, code);

  res.json({ data: rows, meta: { count: rows.length } });
});

// GET /api/analytics/rolling/:code — 1Y, 3Y, 5Y rolling returns
router.get('/analytics/rolling/:code', (req, res) => {
  const navSeries = getNavSeries(req.params.code);
  if (navSeries.length === 0) {
    return res.status(404).json({ error: 'No NAV data found' });
  }

  const returns = computeRollingReturns(navSeries);
  res.json({ data: returns });
});

// GET /api/analytics/drawdown/:code — drawdown series
router.get('/analytics/drawdown/:code', (req, res) => {
  const navSeries = getNavSeries(req.params.code);
  if (navSeries.length === 0) {
    return res.status(404).json({ error: 'No NAV data found' });
  }

  const series = computeDrawdownSeries(navSeries);
  res.json({ data: series, meta: { count: series.length } });
});

// GET /api/analytics/risk/:code — CAGR, volatility, Sharpe, max drawdown
router.get('/analytics/risk/:code', (req, res) => {
  const navSeries = getNavSeries(req.params.code);
  if (navSeries.length === 0) {
    return res.status(404).json({ error: 'No NAV data found' });
  }

  const cagr = computeCAGR(navSeries);
  const volatility = computeVolatility(navSeries);
  const sharpe = computeSharpe(navSeries);
  const { maxDrawdown, peakDate, troughDate } = computeMaxDrawdown(navSeries);

  res.json({
    data: {
      cagr: cagr !== null ? Math.round(cagr * 10000) / 10000 : null,
      volatility: volatility !== null ? Math.round(volatility * 10000) / 10000 : null,
      sharpe: sharpe !== null ? Math.round(sharpe * 100) / 100 : null,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
      maxDrawdownPeak: peakDate,
      maxDrawdownTrough: troughDate,
    },
  });
});

// GET /api/analytics/scorecard/:code — composite scorecard data
router.get('/analytics/scorecard/:code', (req, res) => {
  const { code } = req.params;

  const scheme = db
    .prepare('SELECT scheme_code, scheme_name, amc, category, sub_category FROM schemes WHERE scheme_code = ?')
    .get(code);
  if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

  const navSeries = getNavSeries(code);
  if (navSeries.length === 0) return res.status(404).json({ error: 'No NAV data found' });

  // Performance
  const cagrSinceInception = computeCAGR(navSeries);
  const cagr1Y = computePeriodCAGR(navSeries, 1);
  const cagr3Y = computePeriodCAGR(navSeries, 3);
  const cagr5Y = computePeriodCAGR(navSeries, 5);

  // Risk
  const volatility = computeVolatility(navSeries);
  const sharpe = computeSharpe(navSeries);
  const sortino = computeSortino(navSeries);
  const { maxDrawdown, peakDate, troughDate } = computeMaxDrawdown(navSeries);

  // Portfolio structure
  const holdingsRow = db
    .prepare(
      `SELECT COUNT(DISTINCT instrument_id) as count FROM portfolio_holdings
       WHERE scheme_code = ? AND report_date = ${LATEST_REPORT}`
    )
    .get(code, code);
  const holdingsCount = holdingsRow?.count || 0;

  const top10Row = db
    .prepare(
      `SELECT SUM(weight) as total FROM (
         SELECT weight FROM portfolio_holdings
         WHERE scheme_code = ? AND report_date = ${LATEST_REPORT}
         ORDER BY weight DESC LIMIT 10
       )`
    )
    .get(code, code);
  const top10Concentration = top10Row?.total || 0;

  // Sector diversification: 1 - HHI (higher = more diversified)
  const sectorRows = db
    .prepare(
      `SELECT SUM(ph.weight) as w FROM portfolio_holdings ph
       JOIN instruments i ON ph.instrument_id = i.instrument_id
       WHERE ph.scheme_code = ? AND ph.report_date = ${LATEST_REPORT}
       GROUP BY i.sector`
    )
    .all(code, code);
  const sectorHHI = sectorRows.reduce((s, r) => s + r.w ** 2, 0);
  const sectorDiversificationScore = sectorRows.length > 0 ? 1 - sectorHHI : 0;

  // Intelligence Score — compute sub-scores
  const performanceScore = computePerformanceScore(code, cagr3Y, scheme.category);
  const consistencyScore = computeConsistencyScore(navSeries);
  const riskScore = computeRiskScore(sharpe, maxDrawdown);
  const diversificationScore = computeDiversificationScore(sectorHHI, top10Concentration);

  const overall = Math.round(
    performanceScore * 0.30 +
    consistencyScore * 0.25 +
    riskScore * 0.25 +
    diversificationScore * 0.20
  );

  const downsideProtection = computeDownsideProtection(navSeries);

  const round4 = (v) => (v !== null ? Math.round(v * 10000) / 10000 : null);

  res.json({
    data: {
      scheme,
      performance: {
        cagr1Y: round4(cagr1Y),
        cagr3Y: round4(cagr3Y),
        cagr5Y: round4(cagr5Y),
        cagrSinceInception: round4(cagrSinceInception),
      },
      risk: {
        volatility: round4(volatility),
        sharpe: sharpe !== null ? Math.round(sharpe * 100) / 100 : null,
        sortino: sortino !== null ? Math.round(sortino * 100) / 100 : null,
        maxDrawdown: round4(maxDrawdown),
        maxDrawdownPeak: peakDate,
        maxDrawdownTrough: troughDate,
      },
      portfolio: {
        holdingsCount,
        top10Concentration: round4(top10Concentration),
        sectorDiversificationScore: Math.round(sectorDiversificationScore * 10000) / 10000,
      },
      intelligenceScore: {
        overall: Math.max(0, Math.min(100, overall)),
        breakdown: {
          performance: { score: Math.round(performanceScore), weight: 0.30 },
          consistency: { score: Math.round(consistencyScore), weight: 0.25 },
          risk: { score: Math.round(riskScore), weight: 0.25 },
          diversification: { score: Math.round(diversificationScore), weight: 0.20 },
        },
      },
      downsideProtection,
    },
  });
});

// Intelligence Score helpers
function computePerformanceScore(code, cagr3Y, category) {
  if (cagr3Y === null) return 50; // default if insufficient data
  const peers = db
    .prepare('SELECT scheme_code FROM schemes WHERE category = ?')
    .all(category)
    .map((r) => r.scheme_code);

  const peerCAGRs = [];
  for (const peerCode of peers) {
    const nav = getNavSeries(peerCode);
    const c = computePeriodCAGR(nav, 3);
    if (c !== null) peerCAGRs.push(c);
  }
  if (peerCAGRs.length < 2) return 50;

  peerCAGRs.sort((a, b) => a - b);
  const rank = peerCAGRs.filter((c) => c <= cagr3Y).length;
  return Math.round((rank / peerCAGRs.length) * 100);
}

function computeConsistencyScore(navSeries) {
  const rolling = computeRollingReturns(navSeries);
  const returns1Y = rolling['1Y'];
  if (!returns1Y || returns1Y.length < 2) return 50;

  const values = returns1Y.map((r) => r.return);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
  );
  // Lower std dev = higher consistency. Map: stdDev 0 → 100, stdDev 0.3+ → 0
  return Math.max(0, Math.min(100, Math.round((1 - stdDev / 0.3) * 100)));
}

function computeRiskScore(sharpe, maxDrawdown) {
  // Sharpe component: map to 0-100 via sigmoid-like. Sharpe 1.0 → ~70
  const sharpeScore = sharpe !== null
    ? Math.max(0, Math.min(100, Math.round(100 / (1 + Math.exp(-2 * (sharpe - 0.5))))))
    : 50;
  // Drawdown component: smaller drawdown = better. Map: 0% → 100, -50%+ → 0
  const ddScore = Math.max(0, Math.min(100, Math.round((1 + maxDrawdown / 0.5) * 100)));
  return sharpeScore * 0.6 + ddScore * 0.4;
}

function computeDiversificationScore(sectorHHI, top10Concentration) {
  // Lower HHI = more diversified. Map: HHI 0 → 100, HHI 1 → 0
  const hhiScore = Math.round((1 - sectorHHI) * 100);
  // Lower top10 concentration = more diversified. Map: 0 → 100, 1 → 0
  const concScore = Math.round((1 - top10Concentration) * 100);
  return Math.max(0, Math.min(100, hhiScore * 0.5 + concScore * 0.5));
}

// GET /api/analytics/category-nav/:code — category average NAV (base 100)
router.get('/analytics/category-nav/:code', (req, res) => {
  const { code } = req.params;
  const { from } = req.query;

  const scheme = db
    .prepare('SELECT category FROM schemes WHERE scheme_code = ?')
    .get(code);
  if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

  // Get peer schemes in same category (limit to 20 by AUM for performance)
  const peers = db
    .prepare(
      `SELECT scheme_code FROM schemes WHERE category = ? AND scheme_code != ?
       ORDER BY aum DESC LIMIT 20`
    )
    .all(scheme.category, code);

  if (peers.length === 0) {
    return res.json({ data: [], meta: { category: scheme.category, peerCount: 0 } });
  }

  const peerCodes = peers.map((p) => p.scheme_code);
  const fromClause = from ? ` AND date >= '${from.replace(/[^0-9-]/g, '')}'` : '';

  // Collect all peer NAV series, normalize each to base 100
  const dateValues = new Map(); // date -> [normalized values]
  for (const peerCode of peerCodes) {
    const navs = db
      .prepare(`SELECT date, nav FROM nav_history WHERE scheme_code = ?${fromClause} ORDER BY date`)
      .all(peerCode);
    if (navs.length < 2) continue;
    const baseNav = navs[0].nav;
    for (const { date, nav } of navs) {
      const normalized = (nav / baseNav) * 100;
      if (!dateValues.has(date)) dateValues.set(date, []);
      dateValues.get(date).push(normalized);
    }
  }

  // Compute cross-sectional average per date
  const result = [];
  for (const [date, values] of [...dateValues.entries()].sort()) {
    if (values.length >= 2) {
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      result.push({ date, nav: Math.round(avg * 100) / 100 });
    }
  }

  res.json({
    data: result,
    meta: { category: scheme.category, peerCount: peerCodes.length },
  });
});

// GET /api/analytics/overlap?codes=X,Y,Z — portfolio overlap matrix
router.get('/analytics/overlap', (req, res) => {
  const codesParam = req.query.codes;
  if (!codesParam) {
    return res.status(400).json({ error: 'Missing codes query parameter' });
  }

  const codes = codesParam.split(',').map((c) => c.trim());
  if (codes.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 scheme codes' });
  }

  // Get scheme names for labels
  const schemes = codes.map((code) => {
    const row = db.prepare('SELECT scheme_code, scheme_name FROM schemes WHERE scheme_code = ?').get(code);
    return row || { scheme_code: code, scheme_name: code };
  });

  // Build overlap matrix
  const overlapCount = db.prepare(
    `SELECT COUNT(*) as count FROM portfolio_holdings a
     JOIN portfolio_holdings b ON a.instrument_id = b.instrument_id
     WHERE a.scheme_code = ? AND b.scheme_code = ?
       AND a.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)
       AND b.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)`
  );

  const overlapWeight = db.prepare(
    `SELECT SUM(MIN(a.weight, b.weight)) as weight FROM portfolio_holdings a
     JOIN portfolio_holdings b ON a.instrument_id = b.instrument_id
     WHERE a.scheme_code = ? AND b.scheme_code = ?
       AND a.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)
       AND b.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)`
  );

  const matrix = [];
  for (let i = 0; i < codes.length; i++) {
    const row = [];
    for (let j = 0; j < codes.length; j++) {
      if (i === j) {
        row.push({ count: null, weight: 1 });
      } else {
        const cnt = overlapCount.get(codes[i], codes[j], codes[i], codes[j]);
        const wt = overlapWeight.get(codes[i], codes[j], codes[i], codes[j]);
        row.push({
          count: cnt.count,
          weight: wt.weight !== null ? Math.round(wt.weight * 10000) / 10000 : 0,
        });
      }
    }
    matrix.push(row);
  }

  res.json({ data: { schemes, matrix } });
});

// GET /api/analytics/fund-dna/:code — 6-dimension radar profile
router.get('/analytics/fund-dna/:code', (req, res) => {
  const { code } = req.params;

  const scheme = db
    .prepare('SELECT scheme_code, scheme_name, category FROM schemes WHERE scheme_code = ?')
    .get(code);
  if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

  const navSeries = getNavSeries(code);
  if (navSeries.length === 0) return res.status(404).json({ error: 'No NAV data found' });

  // Get peer codes in same category
  const peers = db
    .prepare('SELECT scheme_code FROM schemes WHERE category = ?')
    .all(scheme.category)
    .map((r) => r.scheme_code);

  // Compute peer values for each dimension
  const peerReturn = [];
  const peerSortino = [];
  const peerVolatility = [];
  for (const peerCode of peers) {
    const pNav = getNavSeries(peerCode);
    if (pNav.length < 100) continue;
    const c = computePeriodCAGR(pNav, 3);
    if (c !== null) peerReturn.push(c);
    const s = computeSortino(pNav);
    if (s !== null) peerSortino.push(s);
    const v = computeVolatility(pNav);
    if (v !== null) peerVolatility.push(v);
  }

  const cagr3Y = computePeriodCAGR(navSeries, 3);
  const sharpe = computeSharpe(navSeries);
  const sortino = computeSortino(navSeries);
  const { maxDrawdown } = computeMaxDrawdown(navSeries);
  const volatility = computeVolatility(navSeries);

  // Portfolio metrics
  const sectorRows = db
    .prepare(
      `SELECT SUM(ph.weight) as w FROM portfolio_holdings ph
       JOIN instruments i ON ph.instrument_id = i.instrument_id
       WHERE ph.scheme_code = ? AND ph.report_date = ${LATEST_REPORT}
       GROUP BY i.sector`
    )
    .all(code, code);
  const sectorHHI = sectorRows.reduce((s, r) => s + r.w ** 2, 0);
  const top10Row = db
    .prepare(
      `SELECT SUM(weight) as total FROM (
         SELECT weight FROM portfolio_holdings
         WHERE scheme_code = ? AND report_date = ${LATEST_REPORT}
         ORDER BY weight DESC LIMIT 10
       )`
    )
    .get(code, code);
  const top10Conc = top10Row?.total || 0;

  // Recovery speed: inverse of max drawdown duration (higher = faster recovery)
  const ddSeries = computeDrawdownSeries(navSeries);
  let maxDDDur = 0;
  let durStart = 0;
  for (let i = 0; i < ddSeries.length; i++) {
    if (ddSeries[i].drawdown === 0) {
      if (i - durStart > maxDDDur) maxDDDur = i - durStart;
      durStart = i;
    }
  }
  if (ddSeries.length - 1 - durStart > maxDDDur) maxDDDur = ddSeries.length - 1 - durStart;
  // Map: 0 days → 100, 500+ days → 0
  const recoveryScore = Math.max(0, Math.min(100, Math.round((1 - maxDDDur / 500) * 100)));

  const dimensions = [
    {
      name: 'Return',
      score: cagr3Y !== null ? computePercentileRank(cagr3Y, peerReturn) : 50,
      peerMedian: peerReturn.length > 0 ? 50 : null,
    },
    {
      name: 'Consistency',
      score: computeConsistencyScore(navSeries),
      peerMedian: 50,
    },
    {
      name: 'Risk Control',
      score: Math.round(computeRiskScore(sharpe, maxDrawdown)),
      peerMedian: 50,
    },
    {
      name: 'Diversification',
      score: Math.round(computeDiversificationScore(sectorHHI, top10Conc)),
      peerMedian: 50,
    },
    {
      name: 'Downside Protection',
      score: sortino !== null ? computePercentileRank(sortino, peerSortino) : 50,
      peerMedian: 50,
    },
    {
      name: 'Recovery Speed',
      score: recoveryScore,
      peerMedian: 50,
    },
  ];

  res.json({ data: { dimensions, peerCount: peers.length } });
});

// GET /api/analytics/compare?codes=X,Y,Z — multi-fund comparison
router.get('/analytics/compare', (req, res) => {
  const codesParam = req.query.codes;
  if (!codesParam) return res.status(400).json({ error: 'Missing codes query parameter' });

  const codes = codesParam.split(',').map((c) => c.trim()).slice(0, 5);
  if (codes.length < 2) return res.status(400).json({ error: 'Need at least 2 scheme codes' });

  const round4 = (v) => (v !== null ? Math.round(v * 10000) / 10000 : null);

  const funds = codes.map((code) => {
    const scheme = db
      .prepare('SELECT scheme_code, scheme_name, amc, category FROM schemes WHERE scheme_code = ?')
      .get(code);
    if (!scheme) return { scheme_code: code, error: 'Not found' };

    const navSeries = getNavSeries(code);
    const cagr1Y = computePeriodCAGR(navSeries, 1);
    const cagr3Y = computePeriodCAGR(navSeries, 3);
    const cagr5Y = computePeriodCAGR(navSeries, 5);
    const volatility = computeVolatility(navSeries);
    const sharpe = computeSharpe(navSeries);
    const sortino = computeSortino(navSeries);
    const { maxDrawdown } = computeMaxDrawdown(navSeries);

    const holdingsRow = db
      .prepare(
        `SELECT COUNT(DISTINCT instrument_id) as count FROM portfolio_holdings
         WHERE scheme_code = ? AND report_date = ${LATEST_REPORT}`
      )
      .get(code, code);

    const top10Row = db
      .prepare(
        `SELECT SUM(weight) as total FROM (
           SELECT weight FROM portfolio_holdings
           WHERE scheme_code = ? AND report_date = ${LATEST_REPORT}
           ORDER BY weight DESC LIMIT 10
         )`
      )
      .get(code, code);

    // Compute intelligence score
    const sectorRows = db
      .prepare(
        `SELECT SUM(ph.weight) as w FROM portfolio_holdings ph
         JOIN instruments i ON ph.instrument_id = i.instrument_id
         WHERE ph.scheme_code = ? AND ph.report_date = ${LATEST_REPORT}
         GROUP BY i.sector`
      )
      .all(code, code);
    const sectorHHI = sectorRows.reduce((s, r) => s + r.w ** 2, 0);
    const top10Conc = top10Row?.total || 0;

    const perfScore = computePerformanceScore(code, cagr3Y, scheme.category);
    const consScore = computeConsistencyScore(navSeries);
    const riskSc = computeRiskScore(sharpe, maxDrawdown);
    const divScore = computeDiversificationScore(sectorHHI, top10Conc);
    const overall = Math.round(perfScore * 0.30 + consScore * 0.25 + riskSc * 0.25 + divScore * 0.20);

    return {
      ...scheme,
      cagr1Y: round4(cagr1Y),
      cagr3Y: round4(cagr3Y),
      cagr5Y: round4(cagr5Y),
      volatility: round4(volatility),
      sharpe: sharpe !== null ? Math.round(sharpe * 100) / 100 : null,
      sortino: sortino !== null ? Math.round(sortino * 100) / 100 : null,
      maxDrawdown: round4(maxDrawdown),
      holdingsCount: holdingsRow?.count || 0,
      top10Concentration: round4(top10Conc),
      intelligenceScore: Math.max(0, Math.min(100, overall)),
    };
  });

  // Overlap matrix (reuse logic)
  const overlapCountStmt = db.prepare(
    `SELECT COUNT(*) as count FROM portfolio_holdings a
     JOIN portfolio_holdings b ON a.instrument_id = b.instrument_id
     WHERE a.scheme_code = ? AND b.scheme_code = ?
       AND a.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)
       AND b.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)`
  );
  const overlapWeightStmt = db.prepare(
    `SELECT SUM(MIN(a.weight, b.weight)) as weight FROM portfolio_holdings a
     JOIN portfolio_holdings b ON a.instrument_id = b.instrument_id
     WHERE a.scheme_code = ? AND b.scheme_code = ?
       AND a.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)
       AND b.report_date = (SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)`
  );

  const matrix = [];
  for (let i = 0; i < codes.length; i++) {
    const row = [];
    for (let j = 0; j < codes.length; j++) {
      if (i === j) {
        row.push({ count: null, weight: 1 });
      } else {
        const cnt = overlapCountStmt.get(codes[i], codes[j], codes[i], codes[j]);
        const wt = overlapWeightStmt.get(codes[i], codes[j], codes[i], codes[j]);
        row.push({
          count: cnt.count,
          weight: wt.weight !== null ? Math.round(wt.weight * 10000) / 10000 : 0,
        });
      }
    }
    matrix.push(row);
  }

  const schemes = funds.map((f) => ({ scheme_code: f.scheme_code, scheme_name: f.scheme_name }));

  res.json({ data: { funds, overlap: { schemes, matrix } } });
});

// GET /api/analytics/universe — risk-return scatter for all funds
router.get('/analytics/universe', (req, res) => {
  // Get schemes with sufficient NAV data
  const schemesWithData = db
    .prepare(
      `SELECT s.scheme_code, s.scheme_name, s.category, COUNT(*) as nav_count
       FROM schemes s
       JOIN nav_history nh ON s.scheme_code = nh.scheme_code
       GROUP BY s.scheme_code
       HAVING nav_count >= 250
       ORDER BY nav_count DESC
       LIMIT 200`
    )
    .all();

  const result = [];
  for (const s of schemesWithData) {
    const navSeries = getNavSeries(s.scheme_code);
    const cagr1Y = computePeriodCAGR(navSeries, 1);
    const vol = computeVolatility(navSeries);
    if (cagr1Y === null || vol === null) continue;

    result.push({
      scheme_code: s.scheme_code,
      scheme_name: s.scheme_name,
      category: s.category,
      returnPct: Math.round(cagr1Y * 10000) / 100,
      volatilityPct: Math.round(vol * 10000) / 100,
    });
  }

  res.json({ data: result });
});

// ── Category Top Funds — top N by CAGR in a category ──────────────────────

function cleanCategory(sub) {
  if (!sub) return 'Other';
  const s = sub.toLowerCase();
  if (s.includes('large & mid cap')) return 'Large & Mid Cap';
  if (s.includes('large cap')) return 'Large Cap';
  if (s.includes('mid cap')) return 'Mid Cap';
  if (s.includes('small cap')) return 'Small Cap';
  if (s.includes('multi cap')) return 'Multi Cap';
  if (s.includes('flexi cap')) return 'Flexi Cap';
  if (s.includes('focused')) return 'Focused';
  if (s.includes('contra')) return 'Contra';
  if (s.includes('value')) return 'Value';
  if (s.includes('elss')) return 'ELSS';
  if (s.includes('sectoral') || s.includes('thematic')) return 'Sectoral / Thematic';
  if (s.includes('index') || s.includes('etf')) return 'Index / ETF';
  if (s.includes('fof') || s.includes('fund of fund')) return 'Fund of Funds';
  if (s.includes('liquid')) return 'Liquid';
  if (s.includes('overnight')) return 'Overnight';
  if (s.includes('money market')) return 'Money Market';
  if (s.includes('ultra short')) return 'Ultra Short Duration';
  if (s.includes('low duration')) return 'Low Duration';
  if (s.includes('short duration') || s.includes('short term')) return 'Short Duration';
  if (s.includes('medium to long')) return 'Medium to Long Duration';
  if (s.includes('medium duration') || s.includes('medium term')) return 'Medium Duration';
  if (s.includes('long duration') || s.includes('long term')) return 'Long Duration';
  if (s.includes('dynamic bond')) return 'Dynamic Bond';
  if (s.includes('corporate bond')) return 'Corporate Bond';
  if (s.includes('credit risk')) return 'Credit Risk';
  if (s.includes('banking and psu')) return 'Banking & PSU';
  if (s.includes('gilt')) return 'Gilt';
  if (s.includes('floater')) return 'Floater';
  if (s.includes('arbitrage')) return 'Arbitrage';
  if (s.includes('aggressive hybrid')) return 'Aggressive Hybrid';
  if (s.includes('balanced') || s.includes('dynamic asset') || s.includes('balanced advantage')) return 'Balanced / BAF';
  if (s.includes('conservative hybrid')) return 'Conservative Hybrid';
  if (s.includes('equity savings')) return 'Equity Savings';
  if (s.includes('multi asset')) return 'Multi Asset';
  if (s.includes('retirement')) return 'Retirement';
  if (s.includes('children')) return "Children's Fund";
  if (s.includes('debt') || s.includes('income')) return 'Debt - Other';
  if (s.includes('equity') || s.includes('growth')) return 'Equity - Other';
  if (s.includes('hybrid')) return 'Hybrid - Other';
  return 'Other';
}

router.get('/analytics/category-top', (req, res) => {
  const { category, period = '1', limit = '3' } = req.query;
  if (!category) return res.status(400).json({ error: 'Missing category parameter' });

  const years = parseInt(period) || 1;
  const topN = Math.min(parseInt(limit) || 3, 10);

  // Get all Direct-Growth schemes in this category
  const allSchemes = db
    .prepare(
      `SELECT scheme_code, scheme_name, amc, sub_category FROM schemes
       WHERE scheme_name LIKE '%Direct%'
         AND scheme_name LIKE '%Growth%'
         AND scheme_name NOT LIKE '%IDCW%'
         AND scheme_name NOT LIKE '%Dividend%'`
    )
    .all()
    .filter((s) => cleanCategory(s.sub_category) === category);

  if (allSchemes.length === 0) {
    return res.json({ data: { category, period: years, funds: [] } });
  }

  // Compute CAGR for each and rank
  const ranked = [];
  for (const s of allSchemes) {
    const navSeries = getNavSeries(s.scheme_code);
    if (navSeries.length < 50) continue; // skip funds with very little data
    const cagr = computePeriodCAGR(navSeries, years);
    if (cagr === null) continue;
    ranked.push({
      scheme_code: s.scheme_code,
      scheme_name: s.scheme_name,
      amc: s.amc,
      cagr: Math.round(cagr * 10000) / 10000,
    });
  }

  ranked.sort((a, b) => b.cagr - a.cagr);
  const top = ranked.slice(0, topN);

  res.json({
    data: {
      category,
      period: years,
      totalInCategory: allSchemes.length,
      funds: top,
    },
  });
});

export default router;
