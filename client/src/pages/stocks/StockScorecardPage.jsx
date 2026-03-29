import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Check, Search, TrendingUp, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import Plot from 'react-plotly.js';
import ChartContainer from '../../components/ChartContainer';
import { defaultConfig, COLORS } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';
import {
  fetchStocks,
  fetchStockScorecard,
  fetchStockPrices,
  fetchStockTechnical,
  fetchStockMfHoldings,
} from '../../lib/api';

// ── Stock Selector ──────────────────────────────────────────────────────────

function StockSelector({ stocks, onSelect, buttonLabel = 'Select Stock' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return (stocks || []).slice(0, 8);
    const q = query.toLowerCase();
    return (stocks || []).filter(
      (s) => s.symbol?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [stocks, query]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-card border border-border rounded hover:bg-card-hover transition-colors"
      >
        <Search className="w-3 h-3" />
        {buttonLabel}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 top-full mt-1 w-[320px] bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="p-2 border-b border-border-subtle">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search symbol or name..."
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                autoFocus
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => { onSelect(s); setIsOpen(false); setQuery(''); }}
                  className="w-full px-3 py-2 text-left hover:bg-background transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted">{s.symbol} &middot; {s.sector}</p>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted text-center">No stocks found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Share Button ─────────────────────────────────────────────────────────────

function ShareButton({ symbol, stockName }) {
  const [copied, setCopied] = useState(false);
  const url = `https://mfanalytics.in/stocks/scorecard/${symbol}`;
  const handleShare = async () => {
    const text = `Check out the analysis for ${stockName || symbol} on Intelligent Market Analytics`;
    if (navigator.share) {
      try { await navigator.share({ title: stockName, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleShare}
      className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors"
      title="Share this scorecard"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}

// ── Score Gauge ──────────────────────────────────────────────────────────────

function StockScoreGauge({ score, breakdown }) {
  if (score == null) return null;
  const pct = Math.min(score, 100);
  const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${pct * 2.64} 264`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-data" style={{ color }}>{Math.round(pct)}</span>
          <span className="text-[9px] text-muted uppercase tracking-wider">Score</span>
        </div>
      </div>
      {breakdown && (
        <div className="mt-3 space-y-1 w-full max-w-[180px]">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-[10px]">
              <span className="text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="font-data text-foreground">{Math.round(val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DNA Radar ────────────────────────────────────────────────────────────────

function StockDNAChart({ dna }) {
  const chartLayout = useChartLayout();
  if (!dna || !dna.dimensions) return null;

  const dims = dna.dimensions;
  const labels = Object.keys(dims);
  const values = Object.values(dims);

  return (
    <div className="bg-card border border-border rounded-lg p-4" style={{ height: 340 }}>
      <h4 className="font-mono text-xs text-muted mb-2">Stock DNA</h4>
      <Plot
        data={[{
          type: 'scatterpolar',
          r: [...values, values[0]],
          theta: [...labels.map((l) => l.replace(/([A-Z])/g, ' $1').trim()), labels[0].replace(/([A-Z])/g, ' $1').trim()],
          fill: 'toself',
          fillcolor: 'rgba(59,130,246,0.15)',
          line: { color: '#3b82f6', width: 2 },
          marker: { size: 4 },
        }]}
        layout={{
          ...chartLayout,
          polar: {
            bgcolor: 'transparent',
            radialaxis: {
              visible: true,
              range: [0, 100],
              tickfont: { ...chartLayout.font, size: 8 },
              gridcolor: chartLayout.xaxis?.gridcolor || 'rgba(255,255,255,0.05)',
            },
            angularaxis: {
              tickfont: { ...chartLayout.font, size: 9 },
              gridcolor: chartLayout.xaxis?.gridcolor || 'rgba(255,255,255,0.05)',
            },
          },
          margin: { t: 10, r: 40, b: 10, l: 40 },
          showlegend: false,
        }}
        config={defaultConfig}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// ── Peer Table ───────────────────────────────────────────────────────────────

function PeerTable({ peers, currentSymbol }) {
  if (!peers || peers.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="font-mono font-bold text-sm text-foreground">Sector Peers</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-[10px] text-muted uppercase">
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">1D Chg</th>
              <th className="px-3 py-2 text-right">MCap</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <tr
                key={p}
                className="border-t border-border-subtle/30 text-muted text-[11px]"
              >
                <td className="px-3 py-2 font-mono text-accent">{p}</td>
                <td className="px-3 py-2" colSpan={4}>
                  <span className="text-[10px]">View scorecard</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MF Holdings Table ────────────────────────────────────────────────────────

function MfHoldingsTable({ symbol }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-mf-holdings', symbol],
    queryFn: () => fetchStockMfHoldings(symbol),
    staleTime: 60_000,
    enabled: !!symbol,
  });

  const holdings = data?.data || [];

  if (isLoading) {
    return <div className="h-[200px] bg-card border border-border rounded-lg animate-pulse" />;
  }

  if (holdings.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="font-mono font-bold text-sm text-foreground">
          Mutual Funds Holding {symbol}
          <span className="text-[10px] text-muted font-normal ml-2">({holdings.length} funds)</span>
        </h3>
      </div>
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border-subtle text-[10px] text-muted uppercase">
              <th className="px-3 py-2 text-left">Fund</th>
              <th className="px-3 py-2 text-left">AMC</th>
              <th className="px-3 py-2 text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr
                key={h.scheme_code}
                className="border-t border-border-subtle/30 hover:bg-background/50 cursor-pointer"
                onClick={() => window.location.href = `/scorecard/${h.scheme_code}`}
              >
                <td className="px-3 py-2">
                  <p className="text-foreground truncate max-w-[300px]">{h.scheme_name}</p>
                </td>
                <td className="px-3 py-2 text-muted">{h.amc}</td>
                <td className="px-3 py-2 text-right font-data">
                  {h.weight != null ? `${(h.weight * 100).toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function StockScorecardPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const chartLayout = useChartLayout();
  const [priceTimeframe, setPriceTimeframe] = useState('1Y');
  const [showSMA, setShowSMA] = useState(false);
  const [showBB, setShowBB] = useState(false);

  const { data: stocksData } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => fetchStocks(),
    staleTime: 60_000,
  });
  const stocks = stocksData?.data || [];

  const { data: scorecardData, isLoading } = useQuery({
    queryKey: ['stock-scorecard', symbol],
    queryFn: () => fetchStockScorecard(symbol),
    staleTime: 30_000,
    enabled: !!symbol,
  });

  const periodMap = { '1M': '1m', '3M': '3m', '6M': '6m', '1Y': '1y', '3Y': '3y', '5Y': '5y', MAX: 'max' };
  const { data: pricesData } = useQuery({
    queryKey: ['stock-prices', symbol, priceTimeframe],
    queryFn: () => fetchStockPrices(symbol, { period: periodMap[priceTimeframe] || '1y' }),
    staleTime: 60_000,
    enabled: !!symbol,
  });

  const { data: technicalData } = useQuery({
    queryKey: ['stock-technical', symbol],
    queryFn: () => fetchStockTechnical(symbol),
    staleTime: 60_000,
    enabled: !!symbol,
  });

  const result = scorecardData?.data;
  const prices = pricesData?.data || [];
  const technical = technicalData?.data;

  const handleSelectStock = useCallback((stock) => {
    navigate(`/stocks/scorecard/${stock.symbol}`);
  }, [navigate]);

  // No symbol: landing state
  if (!symbol) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-mono font-bold text-lg mb-0.5">Stock Scorecard</h1>
          <p className="text-xs text-muted">Intelligence-driven stock analysis and ratings</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-sm text-muted">Select a stock to view its scorecard</p>
          <StockSelector
            stocks={stocks}
            onSelect={handleSelectStock}
            buttonLabel="Select Stock"
          />
        </div>
      </div>
    );
  }

  const stock = result?.stock;
  const isNifty500 = stock?.nifty500 === 1;
  const fundamentals = result?.fundamentals;
  const returns = result?.returns;
  const dna = result?.dna;
  const score = result?.score;

  // Price chart traces
  const priceTraces = useMemo(() => {
    if (prices.length === 0) return [];
    const traces = [{
      x: prices.map((p) => p.date),
      y: prices.map((p) => p.close),
      type: 'scatter',
      mode: 'lines',
      name: 'Close',
      line: { color: '#3b82f6', width: 1.5 },
      hovertemplate: '%{x}: ₹%{y:.2f}<extra></extra>',
    }];

    if (showSMA && technical) {
      if (technical.sma20) {
        traces.push({
          x: technical.sma20.map((p) => p.date),
          y: technical.sma20.map((p) => p.value),
          type: 'scatter', mode: 'lines', name: 'SMA 20',
          line: { color: '#F59E0B', width: 1, dash: 'dot' },
        });
      }
      if (technical.sma50) {
        traces.push({
          x: technical.sma50.map((p) => p.date),
          y: technical.sma50.map((p) => p.value),
          type: 'scatter', mode: 'lines', name: 'SMA 50',
          line: { color: '#10B981', width: 1, dash: 'dot' },
        });
      }
      if (technical.sma200) {
        traces.push({
          x: technical.sma200.map((p) => p.date),
          y: technical.sma200.map((p) => p.value),
          type: 'scatter', mode: 'lines', name: 'SMA 200',
          line: { color: '#EF4444', width: 1, dash: 'dot' },
        });
      }
    }

    if (showBB && technical?.bollingerBands) {
      const bb = technical.bollingerBands;
      traces.push({
        x: bb.map((p) => p.date),
        y: bb.map((p) => p.upper),
        type: 'scatter', mode: 'lines', name: 'BB Upper',
        line: { color: 'rgba(139,92,246,0.5)', width: 1 },
      });
      traces.push({
        x: bb.map((p) => p.date),
        y: bb.map((p) => p.lower),
        type: 'scatter', mode: 'lines', name: 'BB Lower',
        line: { color: 'rgba(139,92,246,0.5)', width: 1 },
        fill: 'tonexty',
        fillcolor: 'rgba(139,92,246,0.05)',
      });
    }

    return traces;
  }, [prices, showSMA, showBB, technical]);

  // Volume chart trace
  const volumeTrace = useMemo(() => {
    if (prices.length === 0) return null;
    return {
      x: prices.map((p) => p.date),
      y: prices.map((p) => p.volume),
      type: 'bar',
      name: 'Volume',
      marker: {
        color: prices.map((p, i) =>
          i > 0 && p.close >= prices[i - 1].close ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
        ),
      },
      hovertemplate: '%{x}: %{y:,.0f}<extra></extra>',
    };
  }, [prices]);

  // RSI trace
  const rsiTrace = useMemo(() => {
    if (!technical?.rsi) return null;
    return {
      x: technical.rsi.map((p) => p.date),
      y: technical.rsi.map((p) => p.value),
      type: 'scatter',
      mode: 'lines',
      name: 'RSI (14)',
      line: { color: '#8B5CF6', width: 1.5 },
    };
  }, [technical]);

  // MACD traces
  const macdTraces = useMemo(() => {
    if (!technical?.macd) return [];
    const m = technical.macd;
    return [
      {
        x: m.map((p) => p.date),
        y: m.map((p) => p.macd),
        type: 'scatter', mode: 'lines', name: 'MACD',
        line: { color: '#3b82f6', width: 1.5 },
      },
      {
        x: m.map((p) => p.date),
        y: m.map((p) => p.signal),
        type: 'scatter', mode: 'lines', name: 'Signal',
        line: { color: '#EF4444', width: 1 },
      },
      {
        x: m.map((p) => p.date),
        y: m.map((p) => p.histogram),
        type: 'bar', name: 'Histogram',
        marker: { color: m.map((p) => p.histogram >= 0 ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)') },
      },
    ];
  }, [technical]);

  const isPositiveChange = stock?.change_pct > 0;

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      {symbol && <ShareButton symbol={symbol} stockName={stock?.name} />}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/stocks/scorecard')}
              className="p-1 text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-mono font-bold text-lg truncate">
              {stock?.name || 'Loading...'}
            </h1>
          </div>
          {stock && (
            <div className="flex items-center gap-2 ml-8 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded font-mono">
                {stock.symbol}
              </span>
              {stock.sector && (
                <span className="text-[10px] px-1.5 py-0.5 bg-background text-muted rounded font-mono">
                  {stock.sector}
                </span>
              )}
              {stock.industry && (
                <span className="text-[10px] px-1.5 py-0.5 bg-background text-muted rounded font-mono">
                  {stock.industry}
                </span>
              )}
              {stock.close != null && (
                <span className="text-[10px] font-data text-foreground">
                  ₹{Number(stock.close).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              )}
              {stock.change_pct != null && (
                <span className={`text-[10px] font-data flex items-center gap-0.5 ${isPositiveChange ? 'text-positive' : 'text-negative'}`}>
                  {isPositiveChange ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stock.change_pct > 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
        <StockSelector
          stocks={stocks}
          onSelect={handleSelectStock}
          buttonLabel="Switch Stock"
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex justify-center">
            <div className="w-40 h-40 rounded-full bg-card animate-pulse" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Non-Nifty500 notice */}
      {stock && !isNifty500 && !isLoading && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Limited data available</p>
              <p className="text-xs text-muted mt-1">
                Full analytics (DNA, score, technical indicators, peer comparison) are available for Nifty 500 stocks only.
                Basic price data is shown below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Row 1: Score + Metrics */}
            {score && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 bg-card border border-border rounded-lg p-6 flex items-center justify-center">
                  <StockScoreGauge score={score.overall} breakdown={score.breakdown} />
                </div>
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {[
                    { label: 'PE Ratio', value: fundamentals?.pe_ratio ?? stock?.pe_ratio, fmt: (v) => v?.toFixed(1) },
                    { label: 'PB Ratio', value: fundamentals?.pb_ratio, fmt: (v) => v?.toFixed(2) },
                    { label: 'ROE', value: fundamentals?.roe, fmt: (v) => v != null ? `${(v * 100).toFixed(1)}%` : null },
                    { label: 'Debt/Equity', value: fundamentals?.debt_to_equity, fmt: (v) => v?.toFixed(2) },
                    { label: 'Div Yield', value: fundamentals?.dividend_yield ?? stock?.dividend_yield, fmt: (v) => v != null ? `${v.toFixed(2)}%` : null },
                    { label: '1M Return', value: returns?.return1M, fmt: (v) => v != null ? `${(v * 100).toFixed(1)}%` : null, color: true },
                    { label: '3M Return', value: returns?.return3M, fmt: (v) => v != null ? `${(v * 100).toFixed(1)}%` : null, color: true },
                    { label: '6M Return', value: returns?.return6M, fmt: (v) => v != null ? `${(v * 100).toFixed(1)}%` : null, color: true },
                    { label: '1Y Return', value: returns?.return1Y, fmt: (v) => v != null ? `${(v * 100).toFixed(1)}%` : null, color: true },
                    { label: 'Market Cap', value: stock?.market_cap, fmt: (v) => {
                      if (v == null) return null;
                      if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}T`;
                      if (v >= 1e9) return `₹${(v / 1e9).toFixed(0)}B`;
                      return `₹${(v / 1e7).toFixed(0)}Cr`;
                    }},
                  ].map((m) => (
                    <div key={m.label} className="bg-card border border-border rounded-lg p-3">
                      <p className="text-[9px] text-muted uppercase tracking-wider mb-1">{m.label}</p>
                      <p className={`text-sm font-data font-bold ${
                        m.color && m.value != null
                          ? m.value > 0 ? 'text-positive' : m.value < 0 ? 'text-negative' : 'text-foreground'
                          : 'text-foreground'
                      }`}>
                        {m.value != null ? m.fmt(m.value) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 2: Price Chart */}
            {priceTraces.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-1.5 text-[10px] text-muted cursor-pointer">
                    <input type="checkbox" checked={showSMA} onChange={(e) => setShowSMA(e.target.checked)} className="w-3 h-3 accent-accent" />
                    SMA
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] text-muted cursor-pointer">
                    <input type="checkbox" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} className="w-3 h-3 accent-accent" />
                    Bollinger Bands
                  </label>
                </div>
                <ChartContainer
                  title="Price History"
                  subtitle={stock?.name}
                  timeframe={priceTimeframe}
                  onTimeframeChange={setPriceTimeframe}
                >
                  <Plot
                    data={priceTraces}
                    layout={{
                      ...chartLayout,
                      margin: { ...chartLayout.margin, t: 10 },
                      xaxis: { ...chartLayout.xaxis, type: 'date' },
                      yaxis: {
                        ...chartLayout.yaxis,
                        title: { text: 'Price (₹)', font: { ...chartLayout.font, size: 10 } },
                      },
                      showlegend: true,
                      legend: { font: { ...chartLayout.font, size: 9 }, x: 0, y: -0.15, orientation: 'h' },
                    }}
                    config={defaultConfig}
                    useResizeHandler
                    style={{ width: '100%', height: '100%' }}
                  />
                </ChartContainer>
              </div>
            )}

            {/* Row 3: Volume + RSI/MACD */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {volumeTrace && (
                <ChartContainer title="Volume" showTimeframes={false}>
                  <Plot
                    data={[volumeTrace]}
                    layout={{
                      ...chartLayout,
                      margin: { ...chartLayout.margin, t: 10 },
                      xaxis: { ...chartLayout.xaxis, type: 'date' },
                      yaxis: { ...chartLayout.yaxis },
                      showlegend: false,
                    }}
                    config={defaultConfig}
                    useResizeHandler
                    style={{ width: '100%', height: '100%' }}
                  />
                </ChartContainer>
              )}

              {rsiTrace && (
                <ChartContainer title="RSI (14)" showTimeframes={false}>
                  <Plot
                    data={[
                      rsiTrace,
                      { x: rsiTrace.x, y: rsiTrace.x.map(() => 70), type: 'scatter', mode: 'lines', line: { color: 'rgba(239,68,68,0.3)', width: 1, dash: 'dash' }, showlegend: false, hoverinfo: 'skip' },
                      { x: rsiTrace.x, y: rsiTrace.x.map(() => 30), type: 'scatter', mode: 'lines', line: { color: 'rgba(16,185,129,0.3)', width: 1, dash: 'dash' }, showlegend: false, hoverinfo: 'skip' },
                    ]}
                    layout={{
                      ...chartLayout,
                      margin: { ...chartLayout.margin, t: 10 },
                      xaxis: { ...chartLayout.xaxis, type: 'date' },
                      yaxis: { ...chartLayout.yaxis, range: [0, 100] },
                      showlegend: false,
                    }}
                    config={defaultConfig}
                    useResizeHandler
                    style={{ width: '100%', height: '100%' }}
                  />
                </ChartContainer>
              )}
            </div>

            {/* MACD */}
            {macdTraces.length > 0 && (
              <ChartContainer title="MACD" showTimeframes={false}>
                <Plot
                  data={macdTraces}
                  layout={{
                    ...chartLayout,
                    margin: { ...chartLayout.margin, t: 10 },
                    xaxis: { ...chartLayout.xaxis, type: 'date' },
                    yaxis: { ...chartLayout.yaxis },
                    showlegend: true,
                    legend: { font: { ...chartLayout.font, size: 9 }, x: 0, y: -0.15, orientation: 'h' },
                  }}
                  config={defaultConfig}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </ChartContainer>
            )}

            {/* Row 4: DNA + Peers */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <StockDNAChart dna={dna} />
              <PeerTable peers={result?.peerSymbols} currentSymbol={symbol} />
            </div>

            {/* Row 5: MF Holdings */}
            <MfHoldingsTable symbol={symbol} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
