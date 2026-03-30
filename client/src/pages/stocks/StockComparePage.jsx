import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompareArrows, Search } from 'lucide-react';
import Plot from 'react-plotly.js';
import ChartContainer from '../../components/ChartContainer';
import { defaultConfig, COLORS } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';
import { fetchStocks, fetchStockCompare } from '../../lib/api';

const METRICS = [
  { key: 'pe_ratio', label: 'PE Ratio', format: 'number', higherBetter: false },
  { key: 'pb_ratio', label: 'PB Ratio', format: 'number', higherBetter: false },
  { key: 'roe', label: 'ROE', format: 'percent', higherBetter: true },
  { key: 'revenue_growth', label: 'Revenue Growth', format: 'percent', higherBetter: true },
  { key: 'profit_growth', label: 'Profit Growth', format: 'percent', higherBetter: true },
  { key: 'debt_to_equity', label: 'Debt/Equity', format: 'number', higherBetter: false },
  { key: 'dividend_yield', label: 'Div Yield', format: 'percent', higherBetter: true },
];

function formatValue(value, format) {
  if (value == null) return '—';
  if (format === 'percent') return `${Number(value).toFixed(2)}%`;
  return Number(value).toFixed(2);
}

// ── Stock Selector ──────────────────────────────────────────────────────────

function StockSelector({ stocks, selectedSymbols, onSelect, buttonLabel = 'Add Stock' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const available = useMemo(() => {
    return (stocks || []).filter((s) => !selectedSymbols.has(s.symbol));
  }, [stocks, selectedSymbols]);

  const filtered = useMemo(() => {
    if (!query) return available.slice(0, 8);
    const q = query.toLowerCase();
    return available.filter(
      (s) => s.symbol?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [available, query]);

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
                  className="w-full px-3 py-2 text-left hover:bg-background transition-colors"
                >
                  <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-[10px] text-muted">{s.symbol} &middot; {s.sector}</p>
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

export default function StockComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const symbolsFromUrl = searchParams.get('symbols')?.split(',').filter(Boolean) || [];
  const [selectedSymbols, setSelectedSymbols] = useState(new Set(symbolsFromUrl));
  const chartLayout = useChartLayout();

  const { data: stocksData } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => fetchStocks(),
    staleTime: 60_000,
  });
  const stocks = stocksData?.data || [];

  const symbols = useMemo(() => [...selectedSymbols], [selectedSymbols]);

  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ['stock-compare', symbols.join(',')],
    queryFn: () => fetchStockCompare(symbols),
    staleTime: 30_000,
    enabled: symbols.length >= 2,
  });

  const updateSymbols = useCallback(
    (newSymbols) => {
      setSelectedSymbols(newSymbols);
      const arr = [...newSymbols];
      if (arr.length > 0) {
        setSearchParams({ symbols: arr.join(',') });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams]
  );

  const handleAddStock = useCallback(
    (stock) => {
      if (selectedSymbols.size >= 5) return;
      const next = new Set(selectedSymbols);
      next.add(stock.symbol);
      updateSymbols(next);
    },
    [selectedSymbols, updateSymbols]
  );

  const handleRemoveStock = useCallback(
    (symbol) => {
      const next = new Set(selectedSymbols);
      next.delete(symbol);
      updateSymbols(next);
    },
    [selectedSymbols, updateSymbols]
  );

  const funds = compareData?.data || [];

  // NAV overlay traces (normalized to base 100)
  const priceTraces = useMemo(() => {
    return funds.map((f, i) => {
      if (!f.prices || f.prices.length === 0) return null;
      return {
        x: f.prices.map((p) => p.date),
        y: f.prices.map((p) => p.value),
        type: 'scatter',
        mode: 'lines',
        name: f.name?.slice(0, 30) || f.symbol,
        line: { color: COLORS[i % COLORS.length], width: 2 },
        hovertemplate: '%{x}: %{y:.1f}<extra>%{fullData.name}</extra>',
      };
    }).filter(Boolean);
  }, [funds]);

  // Best values for highlighting
  const bestValues = useMemo(() => {
    if (funds.length < 2) return {};
    const bv = {};
    for (const m of METRICS) {
      const values = funds.map((f) => f.fundamentals?.[m.key]).filter((v) => v != null);
      if (values.length === 0) continue;
      bv[m.key] = m.higherBetter ? Math.max(...values) : Math.min(...values);
    }
    return bv;
  }, [funds]);

  // DNA radar overlay
  const dnaTraces = useMemo(() => {
    // Build a simple DNA comparison from fundamentals if available
    return [];
  }, []);

  // ── Landing state ─────────────────────────────────────────────────────────

  if (symbols.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono font-bold text-lg mb-1">Stock Compare</h1>
            <p className="text-sm text-muted">Side-by-side stock comparison</p>
          </div>
        </div>

        {/* Selected chips */}
        {symbols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {symbols.map((sym) => {
              const s = stocks.find((x) => x.symbol === sym);
              return (
                <span
                  key={sym}
                  className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full"
                >
                  {s?.name?.slice(0, 30) || sym}
                  <button onClick={() => handleRemoveStock(sym)} className="hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <GitCompareArrows className="w-12 h-12 text-muted/20" />
          <p className="text-sm text-muted">
            {symbols.length === 0 ? 'Select at least 2 stocks to compare' : 'Select 1 more stock'}
          </p>
          <StockSelector
            stocks={stocks}
            selectedSymbols={selectedSymbols}
            onSelect={handleAddStock}
            buttonLabel="Add Stock"
          />
        </div>
      </div>
    );
  }

  // ── Main comparison view ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono font-bold text-lg mb-1">Stock Compare</h1>
          <p className="text-sm text-muted">Side-by-side stock comparison</p>
        </div>
        {symbols.length < 5 && (
          <StockSelector
            stocks={stocks}
            selectedSymbols={selectedSymbols}
            onSelect={handleAddStock}
            buttonLabel="Add Stock"
          />
        )}
      </div>

      {/* Stock chips */}
      <div className="flex flex-wrap gap-2">
        {symbols.map((sym, i) => {
          const s = funds.find((f) => f.symbol === sym) || stocks.find((x) => x.symbol === sym);
          return (
            <span
              key={sym}
              className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 border rounded-full"
              style={{
                color: COLORS[i % COLORS.length],
                borderColor: COLORS[i % COLORS.length] + '40',
                backgroundColor: COLORS[i % COLORS.length] + '10',
              }}
            >
              {s?.name?.slice(0, 35) || sym}
              <button onClick={() => handleRemoveStock(sym)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      <AnimatePresence>
        {compareLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Fundamentals Table */}
            {funds.length >= 2 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle">
                  <h3 className="font-mono font-bold text-sm text-foreground">Fundamentals Comparison</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="text-left px-4 py-2.5 text-muted font-medium text-[11px]">Metric</th>
                        {funds.map((f, i) => (
                          <th
                            key={f.symbol}
                            className="px-4 py-2.5 text-center font-medium text-[11px]"
                            style={{ color: COLORS[i % COLORS.length] }}
                          >
                            {f.name?.slice(0, 20) || f.symbol}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {METRICS.filter((m) => {
                        // Skip rows where ALL stocks have null values
                        return funds.some((f) => f.fundamentals?.[m.key] != null);
                      }).map((m) => (
                        <tr key={m.key} className="border-b border-border-subtle/50">
                          <td className="px-4 py-2 text-muted text-[11px]">{m.label}</td>
                          {funds.map((f) => {
                            const val = f.fundamentals?.[m.key];
                            const isBest = val != null && val === bestValues[m.key];
                            return (
                              <td
                                key={f.symbol}
                                className={`px-4 py-2 text-center font-data ${
                                  isBest ? 'text-accent font-bold' : 'text-foreground'
                                }`}
                              >
                                {formatValue(val, m.format)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Normalized Price Chart */}
            {priceTraces.length > 0 && (
              <ChartContainer
                title="Price Growth Comparison"
                subtitle="Normalized to base 100"
                showTimeframes={false}
              >
                <Plot
                  data={priceTraces}
                  layout={{
                    ...chartLayout,
                    margin: { ...chartLayout.margin, t: 10 },
                    xaxis: { ...chartLayout.xaxis, type: 'date' },
                    yaxis: {
                      ...chartLayout.yaxis,
                      title: { text: 'Growth (Base 100)', font: { ...chartLayout.font, size: 10 } },
                    },
                    showlegend: true,
                    legend: {
                      font: { ...chartLayout.font, size: 9 },
                      x: 0,
                      y: -0.2,
                      orientation: 'h',
                    },
                  }}
                  config={defaultConfig}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </ChartContainer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
