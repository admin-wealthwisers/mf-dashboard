import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Simple cache for expensive dashboard computation
let dashboardCache = null;
let dashboardCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Map verbose MFAPI sub_category to clean display names
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

// Prepared statements for per-scheme queries (avoid re-preparing each time)
const latestNavStmt = db.prepare('SELECT date, nav FROM nav_history WHERE scheme_code = ? ORDER BY date DESC LIMIT 2');
const yearAgoNavStmt = db.prepare('SELECT nav FROM nav_history WHERE scheme_code = ? AND date >= ? ORDER BY date ASC LIMIT 1');
const sparklineStmt = db.prepare('SELECT nav FROM nav_history WHERE scheme_code = ? ORDER BY date DESC LIMIT 30');
const navCountStmt = db.prepare('SELECT COUNT(*) as cnt FROM nav_history WHERE scheme_code = ?');

// GET /api/dashboard — all metrics for the dashboard page in one call
router.get('/dashboard', (req, res) => {
  // Return cached response if fresh
  if (dashboardCache && (Date.now() - dashboardCacheTime) < CACHE_TTL) {
    return res.json(dashboardCache);
  }

  // Total schemes
  const schemeCount = db.prepare('SELECT COUNT(*) as count FROM schemes').get().count;
  const navCount = db.prepare('SELECT COUNT(*) as count FROM nav_history').get().count;

  // Build set of scheme codes that have holdings data
  const schemesWithHoldings = new Set(
    db.prepare('SELECT DISTINCT scheme_code FROM portfolio_holdings').all().map((r) => r.scheme_code)
  );

  // Get the latest date in the database
  const latestDateRow = db.prepare('SELECT MAX(date) as date FROM nav_history').get();
  const latestDate = latestDateRow?.date;

  // Get schemes
  const schemes = db.prepare(
    "SELECT * FROM schemes WHERE scheme_name NOT LIKE '%Segregated%' AND scheme_name NOT LIKE '%segregated%' ORDER BY scheme_name"
  ).all();

  const schemeMetrics = schemes.map((s) => {
    // Latest 2 NAVs for 1d change (using prepared statement)
    const navs = latestNavStmt.all(s.scheme_code);

    const latest = navs[0] || null;
    const prev = navs[1] || null;
    const change = latest && prev ? latest.nav - prev.nav : null;
    const changePct = latest && prev ? ((latest.nav - prev.nav) / prev.nav) * 100 : null;

    // 1Y return
    let return1Y = null;
    if (latest) {
      const oneYearAgo = new Date(latest.date);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);
      const yearAgoNav = yearAgoNavStmt.get(s.scheme_code, yearAgoStr);
      if (yearAgoNav) {
        return1Y = ((latest.nav - yearAgoNav.nav) / yearAgoNav.nav) * 100;
      }
    }

    // Last 30 data points for sparkline
    const sparkline = sparklineStmt.all(s.scheme_code).reverse().map((r) => r.nav);

    // Total NAV records
    const navRecordCount = navCountStmt.get(s.scheme_code).cnt;

    return {
      scheme_code: s.scheme_code,
      scheme_name: s.scheme_name,
      amc: s.amc,
      category: s.category,
      sub_category: s.sub_category,
      nav: latest?.nav || null,
      navDate: latest?.date || null,
      change: change !== null ? Math.round(change * 100) / 100 : null,
      changePct: changePct !== null ? Math.round(changePct * 100) / 100 : null,
      return1Y: return1Y !== null ? Math.round(return1Y * 100) / 100 : null,
      navRecordCount,
      sparkline,
      hasHoldings: schemesWithHoldings.has(s.scheme_code),
    };
  });

  // Top and worst performers by 1Y return — only mainstream equity/hybrid categories
  const mainstreamCategories = new Set([
    'Large Cap', 'Mid Cap', 'Small Cap', 'Multi Cap', 'Flexi Cap',
    'Large & Mid Cap', 'Focused', 'Contra', 'Value', 'ELSS',
    'Sectoral / Thematic', 'Aggressive Hybrid', 'Balanced / BAF',
    'Multi Asset', 'Equity Savings',
  ]);
  const mainstream = schemeMetrics.filter((s) => {
    if (s.return1Y === null) return false;
    const cat = cleanCategory(s.sub_category);
    if (!mainstreamCategories.has(cat)) return false;
    const name = (s.scheme_name || '').toLowerCase();
    if (name.includes('segregated') || name.includes('serial') || name.includes('fmp ')) return false;
    if (s.return1Y > 200 || s.return1Y < -80) return false;
    return true;
  });
  const sortedByReturn = [...mainstream].sort((a, b) => b.return1Y - a.return1Y);
  const topPerformer = sortedByReturn[0] || null;
  const worstPerformer = sortedByReturn[sortedByReturn.length - 1] || null;

  // Category performance — avg 1Y return by cleaned sub_category
  const categoryMap = new Map();
  for (const s of schemeMetrics) {
    if (s.return1Y === null) continue;
    if (Math.abs(s.return1Y) > 200) continue;
    const cat = cleanCategory(s.sub_category);
    if (cat === 'Other') continue;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat).push(s.return1Y);
  }
  const categoryPerformance = [...categoryMap.entries()]
    .map(([category, returns]) => ({
      category,
      avgReturn: Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100,
      count: returns.length,
    }))
    .filter((c) => c.count >= 3)
    .sort((a, b) => b.avgReturn - a.avgReturn);

  // Market status (Indian market hours: 9:15 AM - 3:30 PM IST, Mon-Fri)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const hours = ist.getHours() + ist.getMinutes() / 60;
  const dayOfWeek = ist.getDay();
  const marketOpen = dayOfWeek >= 1 && dayOfWeek <= 5 && hours >= 9.25 && hours <= 15.5;

  const response = {
    data: {
      schemeCount,
      navCount,
      latestDate,
      marketOpen,
      topPerformer,
      worstPerformer,
      categoryPerformance,
      schemes: schemeMetrics,
    },
  };

  // Cache the response
  dashboardCache = response;
  dashboardCacheTime = Date.now();

  res.json(response);
});

export default router;
