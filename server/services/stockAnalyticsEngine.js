/**
 * Stock analytics engine for technical analysis computations.
 * All functions expect prices as [{date, open, high, low, close, volume}] sorted ascending by date.
 */

const TRADING_DAYS_PER_YEAR = 252;

/**
 * Simple Moving Average
 * @param {Array} prices - OHLCV data sorted ascending
 * @param {number} period - lookback period
 * @returns {Array} [{date, sma}]
 */
export function computeSMA(prices, period) {
  if (prices.length < period) return [];
  const result = [];
  let sum = 0;

  for (let i = 0; i < prices.length; i++) {
    sum += prices[i].close;
    if (i >= period) {
      sum -= prices[i - period].close;
    }
    if (i >= period - 1) {
      result.push({
        date: prices[i].date,
        sma: Math.round((sum / period) * 100) / 100,
      });
    }
  }

  return result;
}

/**
 * Exponential Moving Average (internal helper)
 */
function computeEMA(prices, period) {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i].close;
  }
  let ema = sum / period;
  result.push({ date: prices[period - 1].date, ema });

  for (let i = period; i < prices.length; i++) {
    ema = prices[i].close * k + ema * (1 - k);
    result.push({ date: prices[i].date, ema });
  }

  return result;
}

/**
 * Relative Strength Index
 * @param {Array} prices - OHLCV data sorted ascending
 * @param {number} period - lookback period (default 14)
 * @returns {Array} [{date, rsi}]
 */
export function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return [];

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push({
      date: prices[i].date,
      change: prices[i].close - prices[i - 1].close,
    });
  }

  // Initial average gain/loss from first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i].change > 0) avgGain += changes[i].change;
    else avgLoss += Math.abs(changes[i].change);
  }
  avgGain /= period;
  avgLoss /= period;

  const result = [];
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    date: changes[period - 1].date,
    rsi: Math.round((100 - 100 / (1 + rs)) * 100) / 100,
  });

  // Smoothed RSI for remaining periods
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i].change > 0 ? changes[i].change : 0;
    const loss = changes[i].change < 0 ? Math.abs(changes[i].change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsVal = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      date: changes[i].date,
      rsi: Math.round((100 - 100 / (1 + rsVal)) * 100) / 100,
    });
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param {Array} prices - OHLCV data sorted ascending
 * @param {number} fast - fast EMA period (default 12)
 * @param {number} slow - slow EMA period (default 26)
 * @param {number} signal - signal EMA period (default 9)
 * @returns {Array} [{date, macd, signal, histogram}]
 */
export function computeMACD(prices, fast = 12, slow = 26, signal = 9) {
  const fastEMA = computeEMA(prices, fast);
  const slowEMA = computeEMA(prices, slow);

  if (fastEMA.length === 0 || slowEMA.length === 0) return [];

  // Align by date — slow EMA starts later
  const slowDateSet = new Map(slowEMA.map((e) => [e.date, e.ema]));
  const macdLine = [];

  for (const f of fastEMA) {
    const s = slowDateSet.get(f.date);
    if (s !== undefined) {
      macdLine.push({
        date: f.date,
        close: f.ema - s, // reuse close field for EMA computation
      });
    }
  }

  if (macdLine.length < signal) return [];

  // Compute signal line as EMA of MACD line
  const k = 2 / (signal + 1);
  let sum = 0;
  for (let i = 0; i < signal; i++) {
    sum += macdLine[i].close;
  }
  let signalEma = sum / signal;

  const result = [];
  result.push({
    date: macdLine[signal - 1].date,
    macd: Math.round(macdLine[signal - 1].close * 100) / 100,
    signal: Math.round(signalEma * 100) / 100,
    histogram: Math.round((macdLine[signal - 1].close - signalEma) * 100) / 100,
  });

  for (let i = signal; i < macdLine.length; i++) {
    signalEma = macdLine[i].close * k + signalEma * (1 - k);
    result.push({
      date: macdLine[i].date,
      macd: Math.round(macdLine[i].close * 100) / 100,
      signal: Math.round(signalEma * 100) / 100,
      histogram: Math.round((macdLine[i].close - signalEma) * 100) / 100,
    });
  }

  return result;
}

/**
 * Bollinger Bands
 * @param {Array} prices - OHLCV data sorted ascending
 * @param {number} period - lookback period (default 20)
 * @param {number} stddev - number of standard deviations (default 2)
 * @returns {Array} [{date, upper, middle, lower}]
 */
export function computeBollingerBands(prices, period = 20, stddev = 2) {
  if (prices.length < period) return [];
  const result = [];

  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += prices[j].close;
    }
    const mean = sum / period;

    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += (prices[j].close - mean) ** 2;
    }
    const sd = Math.sqrt(sqSum / period);

    result.push({
      date: prices[i].date,
      upper: Math.round((mean + stddev * sd) * 100) / 100,
      middle: Math.round(mean * 100) / 100,
      lower: Math.round((mean - stddev * sd) * 100) / 100,
    });
  }

  return result;
}

/**
 * Compute period returns for a stock
 * @param {Array} prices - OHLCV data sorted ascending
 * @returns {Object} {return1D, return1W, return1M, return3M, return6M, return1Y, return3Y, return5Y} as percentages
 */
export function computeStockReturns(prices) {
  if (prices.length < 2) {
    return { return1D: null, return1W: null, return1M: null, return3M: null, return6M: null, return1Y: null, return3Y: null, return5Y: null };
  }

  const latest = prices[prices.length - 1];
  const latestDate = new Date(latest.date);

  function findReturn(daysBack) {
    const target = new Date(latestDate);
    target.setDate(target.getDate() - daysBack);
    const targetStr = target.toISOString().slice(0, 10);

    // Find the closest date on or before the target
    let closest = null;
    for (let i = prices.length - 1; i >= 0; i--) {
      if (prices[i].date <= targetStr) {
        closest = prices[i];
        break;
      }
    }
    if (!closest) return null;
    return Math.round(((latest.close - closest.close) / closest.close) * 10000) / 100;
  }

  return {
    return1D: findReturn(1),
    return1W: findReturn(7),
    return1M: findReturn(30),
    return3M: findReturn(91),
    return6M: findReturn(182),
    return1Y: findReturn(365),
    return3Y: findReturn(1095),
    return5Y: findReturn(1825),
  };
}

/**
 * Compute Stock DNA — 6-axis radar scores (0-100)
 * @param {Array} prices - OHLCV data sorted ascending
 * @param {Object} fundamentals - latest fundamental data {pe_ratio, pb_ratio, roe, eps, debt_equity, dividend_yield, market_cap}
 * @param {Array} peers - array of peer stock_latest objects for percentile ranking
 * @returns {Object} {Growth, Value, Quality, Momentum, Stability, Size}
 */
export function computeStockDNA(prices, fundamentals, peers) {
  const f = fundamentals || {};
  const peerData = peers || [];

  // Growth: EPS percentile + ROE percentile (proxy for growth since we don't have revenue_growth)
  const epsValues = peerData.map((p) => p.eps).filter((v) => v != null);
  const roeValues = peerData.map((p) => p.roe).filter((v) => v != null);
  const epsPctile = percentileRank(f.eps, epsValues);
  const roeGrowthPctile = percentileRank(f.roe, roeValues);
  const Growth = Math.round((epsPctile * 0.5 + roeGrowthPctile * 0.5));

  // Value: inverse PE + inverse PB percentile (lower is more value)
  const peRatios = peerData.map((p) => p.pe_ratio).filter((v) => v != null && v > 0);
  const pbRatios = peerData.map((p) => p.pb_ratio).filter((v) => v != null && v > 0);
  const pePctile = 100 - percentileRank(f.pe_ratio, peRatios);
  const pbPctile = 100 - percentileRank(f.pb_ratio, pbRatios);
  const Value = Math.round((pePctile * 0.5 + pbPctile * 0.5));

  // Quality: ROE percentile + inverse debt-to-equity percentile
  const roes = peerData.map((p) => p.roe).filter((v) => v != null);
  const dtes = peerData.map((p) => p.debt_equity).filter((v) => v != null);
  const roePctile = percentileRank(f.roe, roes);
  const dtePctile = 100 - percentileRank(f.debt_equity, dtes);
  const Quality = Math.round((roePctile * 0.6 + dtePctile * 0.4));

  // Momentum: price return percentiles (3M + 1Y)
  const returns = computeStockReturns(prices);
  const peerReturns3M = peerData.map((p) => p.return3M).filter((v) => v != null);
  const peerReturns1Y = peerData.map((p) => p.return1Y).filter((v) => v != null);
  const mom3M = percentileRank(returns.return3M, peerReturns3M);
  const mom1Y = percentileRank(returns.return1Y, peerReturns1Y);
  const Momentum = Math.round((mom3M * 0.5 + mom1Y * 0.5));

  // Stability: inverse volatility percentile
  let Stability = 50;
  if (prices.length >= 30) {
    const logReturns = [];
    for (let i = 1; i < prices.length; i++) {
      logReturns.push(Math.log(prices[i].close / prices[i - 1].close));
    }
    const mean = logReturns.reduce((s, r) => s + r, 0) / logReturns.length;
    const variance = logReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (logReturns.length - 1);
    const vol = Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    // Map volatility: 0% → 100, 60%+ → 0
    Stability = Math.max(0, Math.min(100, Math.round((1 - vol / 0.6) * 100)));
  }

  // Size: market cap percentile
  const marketCaps = peerData.map((p) => p.market_cap).filter((v) => v != null && v > 0);
  const Size = percentileRank(f.market_cap, marketCaps);

  return {
    Growth: clamp(Growth),
    Value: clamp(Value),
    Quality: clamp(Quality),
    Momentum: clamp(Momentum),
    Stability: clamp(Stability),
    Size: clamp(Size),
  };
}

/**
 * Composite Intelligence Score (0-100)
 * Weighted combination of DNA axes
 */
export function computeStockScore(prices, fundamentals, peers) {
  const dna = computeStockDNA(prices, fundamentals, peers);

  const score = Math.round(
    dna.Growth * 0.20 +
    dna.Value * 0.15 +
    dna.Quality * 0.25 +
    dna.Momentum * 0.15 +
    dna.Stability * 0.15 +
    dna.Size * 0.10
  );

  return clamp(score);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function percentileRank(value, peerValues) {
  if (value == null || peerValues.length === 0) return 50;
  const sorted = [...peerValues].sort((a, b) => a - b);
  const below = sorted.filter((v) => v <= value).length;
  return Math.round((below / sorted.length) * 100);
}

function clamp(v) {
  return Math.max(0, Math.min(100, v));
}
