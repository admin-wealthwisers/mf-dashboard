/**
 * Analytics engine for time-series financial computations.
 * All functions expect navSeries as [{date: "YYYY-MM-DD", nav: number}] sorted ascending by date.
 */

const TRADING_DAYS_PER_YEAR = 252;

export function computeCAGR(navSeries) {
  if (navSeries.length < 2) return null;
  const first = navSeries[0];
  const last = navSeries[navSeries.length - 1];
  const years =
    (new Date(last.date) - new Date(first.date)) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0) return null;
  return Math.pow(last.nav / first.nav, 1 / years) - 1;
}

export function computeVolatility(navSeries) {
  if (navSeries.length < 3) return null;
  const logReturns = [];
  for (let i = 1; i < navSeries.length; i++) {
    logReturns.push(Math.log(navSeries[i].nav / navSeries[i - 1].nav));
  }
  const mean = logReturns.reduce((s, r) => s + r, 0) / logReturns.length;
  const variance =
    logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (logReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

export function computeSharpe(navSeries, riskFreeRate = 0.065) {
  const cagr = computeCAGR(navSeries);
  const vol = computeVolatility(navSeries);
  if (cagr === null || vol === null || vol === 0) return null;
  return (cagr - riskFreeRate) / vol;
}

export function computeMaxDrawdown(navSeries) {
  if (navSeries.length < 2) return { maxDrawdown: 0, peakDate: null, troughDate: null };
  let peak = navSeries[0].nav;
  let peakDate = navSeries[0].date;
  let maxDD = 0;
  let ddPeakDate = peakDate;
  let ddTroughDate = navSeries[0].date;

  for (const { date, nav } of navSeries) {
    if (nav > peak) {
      peak = nav;
      peakDate = date;
    }
    const dd = (nav - peak) / peak;
    if (dd < maxDD) {
      maxDD = dd;
      ddPeakDate = peakDate;
      ddTroughDate = date;
    }
  }

  return { maxDrawdown: maxDD, peakDate: ddPeakDate, troughDate: ddTroughDate };
}

export function computeDrawdownSeries(navSeries) {
  if (navSeries.length === 0) return [];
  let peak = navSeries[0].nav;
  return navSeries.map(({ date, nav }) => {
    if (nav > peak) peak = nav;
    return { date, drawdown: (nav - peak) / peak };
  });
}

export function computeRollingReturns(navSeries) {
  const dateMap = new Map();
  for (let i = 0; i < navSeries.length; i++) {
    dateMap.set(navSeries[i].date, i);
  }

  const result = {};
  for (const [label, years] of [['1Y', 1], ['3Y', 3], ['5Y', 5]]) {
    const returns = [];
    for (let i = 0; i < navSeries.length; i++) {
      const endDate = navSeries[i].date;
      const startDate = shiftYears(endDate, -years);
      const startIdx = dateMap.get(startDate);
      if (startIdx !== undefined) {
        const ret = navSeries[i].nav / navSeries[startIdx].nav;
        const annualized = Math.pow(ret, 1 / years) - 1;
        returns.push({ date: endDate, return: annualized });
      }
    }
    result[label] = returns;
  }
  return result;
}

export function computeSortino(navSeries, riskFreeRate = 0.065) {
  const cagr = computeCAGR(navSeries);
  if (cagr === null || navSeries.length < 3) return null;

  const dailyRf = Math.pow(1 + riskFreeRate, 1 / TRADING_DAYS_PER_YEAR) - 1;
  const downsideReturns = [];
  for (let i = 1; i < navSeries.length; i++) {
    const dailyReturn = navSeries[i].nav / navSeries[i - 1].nav - 1;
    const excess = dailyReturn - dailyRf;
    if (excess < 0) downsideReturns.push(excess);
  }

  if (downsideReturns.length === 0) return null;
  const downsideVariance =
    downsideReturns.reduce((s, r) => s + r ** 2, 0) / downsideReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  if (downsideDeviation === 0) return null;
  return (cagr - riskFreeRate) / downsideDeviation;
}

export function computePeriodCAGR(navSeries, years) {
  if (navSeries.length < 2) return null;
  const lastDate = new Date(navSeries[navSeries.length - 1].date);
  const cutoff = new Date(lastDate);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const filtered = navSeries.filter((p) => p.date >= cutoffStr);
  if (filtered.length < 2) return null;

  const first = filtered[0];
  const last = filtered[filtered.length - 1];
  const actualYears =
    (new Date(last.date) - new Date(first.date)) / (365.25 * 24 * 60 * 60 * 1000);
  if (actualYears < years * 0.9) return null;
  return Math.pow(last.nav / first.nav, 1 / actualYears) - 1;
}

export function computePercentileRank(value, peerValues) {
  if (peerValues.length === 0) return 50;
  const sorted = [...peerValues].sort((a, b) => a - b);
  const below = sorted.filter((v) => v <= value).length;
  return Math.round((below / sorted.length) * 100);
}

export function computeSemiDeviation(navSeries, riskFreeRate = 0.065) {
  if (navSeries.length < 3) return null;
  const dailyRf = Math.pow(1 + riskFreeRate, 1 / TRADING_DAYS_PER_YEAR) - 1;
  const downsideReturns = [];
  for (let i = 1; i < navSeries.length; i++) {
    const dailyReturn = navSeries[i].nav / navSeries[i - 1].nav - 1;
    const excess = dailyReturn - dailyRf;
    if (excess < 0) downsideReturns.push(excess);
  }
  if (downsideReturns.length === 0) return 0;
  const variance = downsideReturns.reduce((s, r) => s + r ** 2, 0) / downsideReturns.length;
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

export function computeUlcerIndex(navSeries) {
  if (navSeries.length < 2) return 0;
  const ddSeries = computeDrawdownSeries(navSeries);
  const sumSq = ddSeries.reduce((s, d) => s + d.drawdown ** 2, 0);
  return Math.sqrt(sumSq / ddSeries.length);
}

export function computeMaxDrawdownDuration(navSeries) {
  if (navSeries.length < 2) return 0;
  let peak = navSeries[0].nav;
  let drawdownStart = 0;
  let maxDuration = 0;
  for (let i = 0; i < navSeries.length; i++) {
    if (navSeries[i].nav >= peak) {
      if (i - drawdownStart > maxDuration) {
        maxDuration = i - drawdownStart;
      }
      peak = navSeries[i].nav;
      drawdownStart = i;
    }
  }
  // Check if still in drawdown at end
  if (navSeries.length - 1 - drawdownStart > maxDuration) {
    maxDuration = navSeries.length - 1 - drawdownStart;
  }
  return maxDuration;
}

export function computeDownsideProtection(navSeries) {
  const sortino = computeSortino(navSeries);
  const semiDev = computeSemiDeviation(navSeries);
  const ulcerIndex = computeUlcerIndex(navSeries);
  const maxDDDuration = computeMaxDrawdownDuration(navSeries);
  const { maxDrawdown } = computeMaxDrawdown(navSeries);

  // Sortino component: 40% — map 0→0, 2→100
  const sortinoScore = sortino !== null ? Math.max(0, Math.min(100, (sortino / 2) * 100)) : 50;
  // Ulcer Index component: 30% — map 0→100, 0.15→0
  const ulcerScore = Math.max(0, Math.min(100, (1 - ulcerIndex / 0.15) * 100));
  // Max DD component: 30% — map 0→100, -0.5→0
  const ddScore = Math.max(0, Math.min(100, (1 + maxDrawdown / 0.5) * 100));

  const score = Math.round(sortinoScore * 0.4 + ulcerScore * 0.3 + ddScore * 0.3);

  return {
    score: Math.max(0, Math.min(100, score)),
    semiDeviation: semiDev !== null ? Math.round(semiDev * 10000) / 10000 : null,
    ulcerIndex: Math.round(ulcerIndex * 10000) / 10000,
    maxDrawdownDuration: maxDDDuration,
    sortino: sortino !== null ? Math.round(sortino * 100) / 100 : null,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 10000,
  };
}

function shiftYears(dateStr, years) {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}
