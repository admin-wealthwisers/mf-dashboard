import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCompareArrows, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import Plot from 'react-plotly.js';
import FundSelector from '../components/FundSelector';
import OverlapMatrix from '../components/OverlapMatrix';
import ChartContainer from '../components/ChartContainer';
import HelpButton from '../components/HelpButton';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import {
  fetchSchemes,
  fetchCompare,
  fetchNav,
  fetchSectorBreakdown,
  fetchCategoryTop,
  fetchDashboard,
} from '../lib/api';

const METRICS = [
  { key: 'cagr1Y', label: '1Y CAGR', format: 'percent', higherBetter: true },
  { key: 'cagr3Y', label: '3Y CAGR', format: 'percent', higherBetter: true },
  { key: 'cagr5Y', label: '5Y CAGR', format: 'percent', higherBetter: true },
  { key: 'volatility', label: 'Volatility', format: 'percent', higherBetter: false },
  { key: 'sharpe', label: 'Sharpe', format: 'number', higherBetter: true },
  { key: 'sortino', label: 'Sortino', format: 'number', higherBetter: true },
  { key: 'maxDrawdown', label: 'Max Drawdown', format: 'percent', higherBetter: false },
  { key: 'holdingsCount', label: 'Holdings', format: 'integer', higherBetter: true },
  { key: 'intelligenceScore', label: 'Intel Score', format: 'integer', higherBetter: true },
];

const RANK_PERIODS = [
  { value: 1, label: '1Y' },
  { value: 3, label: '3Y' },
  { value: 5, label: '5Y' },
];

// Same cleanCategory as ExplorePage/dashboard — maps sub_category to display name
function cleanCategory(sub_category) {
  if (!sub_category) return 'Other';
  const s = sub_category.toLowerCase();
  if (s.includes('large & mid cap')) return 'Large & Mid Cap';
  if (s.includes('large cap')) return 'Large Cap';
  if (s.includes('mid cap')) return 'Mid Cap';
  if (s.includes('small cap')) return 'Small Cap';
  if (s.includes('multi cap')) return 'Multi Cap';
  if (s.includes('flexi cap')) return 'Flexi Cap';
  if (s.includes('focused')) return 'Focused';
  if (s.includes('contra')) return 'Contra';
  if (s.includes('value')) return 'Value';
  if (s.includes('elss')) return 'ELSS (Tax Saver)';
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

function formatValue(value, format) {
  if (value == null) return '—';
  if (format === 'percent') return `${(value * 100).toFixed(2)}%`;
  if (format === 'integer') return String(value);
  return value.toFixed(2);
}

function timeframeToDate(tf) {
  if (tf === 'MAX') return null;
  const d = new Date();
  const map = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 };
  d.setMonth(d.getMonth() - map[tf]);
  return d.toISOString().slice(0, 10);
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const codesFromUrl = searchParams.get('codes')?.split(',').filter(Boolean) || [];
  const [selectedCodes, setSelectedCodes] = useState(new Set(codesFromUrl));
  const [navTimeframe, setNavTimeframe] = useState('1Y');
  const [fullDataOnly, setFullDataOnly] = useState(false);
  const [compareMode, setCompareMode] = useState('head-to-head'); // 'head-to-head' | 'category'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rankPeriod, setRankPeriod] = useState(1);
  const chartLayout = useChartLayout();

  // Schemes for head-to-head FundSelector
  const { data: schemesData } = useQuery({
    queryKey: ['schemes'],
    queryFn: () => fetchSchemes(),
    staleTime: 60_000,
  });
  const schemes = schemesData?.data || [];

  // Dashboard data for deriving category list
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 30_000,
  });

  const categories = useMemo(() => {
    const dashSchemes = dashboardData?.data?.schemes || [];
    const set = new Set();
    dashSchemes.forEach((s) => {
      const cat = cleanCategory(s.sub_category);
      if (cat !== 'Other') set.add(cat);
    });
    return [...set].sort();
  }, [dashboardData]);

  // Category top funds query
  const { data: categoryTopData, isLoading: categoryTopLoading } = useQuery({
    queryKey: ['category-top', selectedCategory, rankPeriod],
    queryFn: () => fetchCategoryTop(selectedCategory, rankPeriod, 3),
    staleTime: 60_000,
    enabled: compareMode === 'category' && selectedCategory !== '',
  });

  // Auto-populate codes when category top data arrives
  useEffect(() => {
    if (compareMode !== 'category') return;
    const topFunds = categoryTopData?.data?.funds || [];
    if (topFunds.length >= 2) {
      const newCodes = new Set(topFunds.map((f) => f.scheme_code));
      setSelectedCodes(newCodes);
      setSearchParams({ codes: topFunds.map((f) => f.scheme_code).join(','), mode: 'category' });
    }
  }, [categoryTopData, compareMode, setSearchParams]);

  const codes = useMemo(() => [...selectedCodes], [selectedCodes]);

  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ['compare', codes.join(',')],
    queryFn: () => fetchCompare(codes),
    staleTime: 30_000,
    enabled: codes.length >= 2,
  });

  // Fetch NAV for each fund for overlay chart
  const navFrom = timeframeToDate(navTimeframe);
  const navQueries = useQueries({
    queries: codes.map((code) => ({
      queryKey: ['nav', code, navFrom],
      queryFn: () => fetchNav(code, { from: navFrom }),
      staleTime: 60_000,
      enabled: codes.length >= 2,
    })),
  });

  // Fetch sector data for each fund
  const sectorQueries = useQueries({
    queries: codes.map((code) => ({
      queryKey: ['sector', code],
      queryFn: () => fetchSectorBreakdown(code),
      staleTime: 60_000,
      enabled: codes.length >= 2,
    })),
  });

  const updateCodes = useCallback(
    (newCodes) => {
      setSelectedCodes(newCodes);
      const arr = [...newCodes];
      if (arr.length > 0) {
        setSearchParams({ codes: arr.join(',') });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams]
  );

  const handleAddFund = useCallback(
    (scheme) => {
      if (selectedCodes.size >= 5) return;
      const next = new Set(selectedCodes);
      next.add(scheme.scheme_code);
      updateCodes(next);
    },
    [selectedCodes, updateCodes]
  );

  const handleRemoveFund = useCallback(
    (code) => {
      const next = new Set(selectedCodes);
      next.delete(code);
      updateCodes(next);
    },
    [selectedCodes, updateCodes]
  );

  const handleModeSwitch = useCallback(
    (mode) => {
      setCompareMode(mode);
      if (mode === 'head-to-head') {
        // Clear category-selected codes
        setSelectedCodes(new Set());
        setSearchParams({});
      }
    },
    [setSearchParams]
  );

  const funds = compareData?.data?.funds || [];
  const overlap = compareData?.data?.overlap;

  // Find best value per metric
  const bestValues = useMemo(() => {
    if (funds.length < 2) return {};
    const bv = {};
    for (const m of METRICS) {
      const values = funds.map((f) => f[m.key]).filter((v) => v != null);
      if (values.length === 0) continue;
      if (m.key === 'maxDrawdown') {
        bv[m.key] = Math.max(...values);
      } else if (m.key === 'volatility') {
        bv[m.key] = Math.min(...values);
      } else {
        bv[m.key] = m.higherBetter ? Math.max(...values) : Math.min(...values);
      }
    }
    return bv;
  }, [funds]);

  // NAV overlay traces
  const navTraces = useMemo(() => {
    return navQueries.map((q, i) => {
      const navData = q.data?.data || [];
      if (navData.length === 0) return null;
      const baseNav = navData[0].nav;
      const fund = funds[i];
      return {
        x: navData.map((d) => d.date),
        y: navData.map((d) => (d.nav / baseNav) * 100),
        type: 'scatter',
        mode: 'lines',
        name: fund?.scheme_name?.slice(0, 30) || codes[i],
        line: { color: COLORS[i % COLORS.length], width: 2 },
        hovertemplate: '%{x}: %{y:.1f}<extra>%{fullData.name}</extra>',
      };
    }).filter(Boolean);
  }, [navQueries, funds, codes]);

  // Sector comparison traces
  const sectorTraces = useMemo(() => {
    const allSectors = new Set();
    const fundSectors = sectorQueries.map((q) => {
      const data = q.data?.data || [];
      const map = {};
      for (const row of data) {
        if (row.sector) {
          map[row.sector] = row.total_weight;
          allSectors.add(row.sector);
        }
      }
      return map;
    });

    const sectors = [...allSectors].sort();
    return codes.map((code, i) => ({
      x: sectors,
      y: sectors.map((s) => ((fundSectors[i]?.[s] || 0) * 100)),
      type: 'bar',
      name: funds[i]?.scheme_name?.slice(0, 25) || code,
      marker: { color: COLORS[i % COLORS.length] },
      hovertemplate: '%{x}: %{y:.1f}%<extra>%{fullData.name}</extra>',
    }));
  }, [sectorQueries, codes, funds]);

  // ── Mode toggle component ──────────────────────────────────────────────

  const modeToggle = (
    <div className="flex bg-background rounded p-0.5 border border-border-subtle">
      {[
        { key: 'head-to-head', label: 'Head-to-Head' },
        { key: 'category', label: 'Category' },
      ].map((m) => (
        <button
          key={m.key}
          onClick={() => handleModeSwitch(m.key)}
          className={`px-3 py-1 text-xs font-mono rounded-sm transition-colors ${
            compareMode === m.key
              ? 'bg-accent text-white'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  // ── Category selector (shown in category mode) ─────────────────────────

  const categorySelector = (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-muted font-mono">Category:</label>
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-background border border-border-subtle rounded px-2.5 py-1.5 pr-7 text-foreground outline-none focus:border-accent/50 appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="">Select a category...</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted font-mono">Rank by:</span>
        <div className="flex bg-background rounded p-0.5 border border-border-subtle">
          {RANK_PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setRankPeriod(p.value)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded-sm transition-colors ${
                rankPeriod === p.value
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {categoryTopLoading && (
        <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
      )}

      {categoryTopData?.data?.totalInCategory && (
        <span className="text-[10px] text-muted">
          Top 3 of {categoryTopData.data.totalInCategory} Direct-Growth funds
        </span>
      )}
    </div>
  );

  // ── Landing state (head-to-head mode, < 2 funds selected) ─────────────

  if (compareMode === 'head-to-head' && codes.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-lg mb-1">Compare</h1>
              <HelpButton helpId="compare" />
            </div>
            <p className="text-sm text-muted">Side-by-side fund comparison and overlap analysis</p>
          </div>
          {modeToggle}
        </div>

        {/* Selected fund chips */}
        {codes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {codes.map((code) => {
              const s = schemes.find((x) => x.scheme_code === code);
              return (
                <span
                  key={code}
                  className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full"
                >
                  {s?.scheme_name?.slice(0, 30) || code}
                  <button onClick={() => handleRemoveFund(code)} className="hover:text-foreground">
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
            {codes.length === 0 ? 'Select at least 2 funds to compare' : 'Select 1 more fund'}
          </p>
          <FundSelector
            schemes={schemes}
            selectedCodes={selectedCodes}
            onSelect={handleAddFund}
            buttonLabel="Add Fund"
            fullDataOnly={fullDataOnly}
            onFullDataOnlyChange={setFullDataOnly}
          />
        </div>
      </div>
    );
  }

  // ── Category mode landing (no category selected yet) ───────────────────

  if (compareMode === 'category' && (!selectedCategory || codes.length < 2)) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-lg mb-1">Compare</h1>
              <HelpButton helpId="compare" />
            </div>
            <p className="text-sm text-muted">Compare top funds within a category</p>
          </div>
          {modeToggle}
        </div>

        {categorySelector}

        {!selectedCategory && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <GitCompareArrows className="w-12 h-12 text-muted/20" />
            <p className="text-sm text-muted">Select a category to compare top funds</p>
          </div>
        )}

        {selectedCategory && categoryTopLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <p className="text-sm text-muted">Finding top {selectedCategory} funds...</p>
          </div>
        )}
      </div>
    );
  }

  // ── Main comparison view (both modes, >= 2 funds) ──────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-lg mb-1">Compare</h1>
            <HelpButton helpId="compare" />
          </div>
          <p className="text-sm text-muted">
            {compareMode === 'category'
              ? `Top ${selectedCategory} funds by ${rankPeriod}Y returns`
              : 'Side-by-side fund comparison'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {compareMode === 'head-to-head' && codes.length < 5 && (
            <FundSelector
              schemes={schemes}
              selectedCodes={selectedCodes}
              onSelect={handleAddFund}
              buttonLabel="Add Fund"
              fullDataOnly={fullDataOnly}
              onFullDataOnlyChange={setFullDataOnly}
            />
          )}
          {modeToggle}
        </div>
      </div>

      {/* Category selector (category mode only) */}
      {compareMode === 'category' && categorySelector}

      {/* Fund chips */}
      <div className="flex flex-wrap gap-2">
        {codes.map((code, i) => {
          const s = funds.find((f) => f.scheme_code === code) ||
            schemes.find((x) => x.scheme_code === code);
          const topFund = categoryTopData?.data?.funds?.find((f) => f.scheme_code === code);
          return (
            <span
              key={code}
              className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 border rounded-full"
              style={{
                color: COLORS[i % COLORS.length],
                borderColor: COLORS[i % COLORS.length] + '40',
                backgroundColor: COLORS[i % COLORS.length] + '10',
              }}
            >
              {s?.scheme_name?.slice(0, 35) || code}
              {topFund && (
                <span className="text-[9px] opacity-60">
                  ({(topFund.cagr * 100).toFixed(1)}%)
                </span>
              )}
              {compareMode === 'head-to-head' && (
                <button onClick={() => handleRemoveFund(code)} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              )}
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
            {/* Metrics Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle">
                <h3 className="font-mono font-bold text-sm text-foreground">Comparison Metrics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left px-4 py-2.5 text-muted font-medium text-[11px]">Metric</th>
                      {funds.map((f, i) => (
                        <th
                          key={f.scheme_code}
                          className="px-4 py-2.5 text-center font-medium text-[11px]"
                          style={{ color: COLORS[i % COLORS.length] }}
                        >
                          {f.scheme_name?.slice(0, 20)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((m) => (
                      <tr key={m.key} className="border-b border-border-subtle/50">
                        <td className="px-4 py-2 text-muted text-[11px]">{m.label}</td>
                        {funds.map((f) => {
                          const val = f[m.key];
                          const isBest = val != null && val === bestValues[m.key];
                          const isNegReturn = m.format === 'percent' && val != null && val < 0;
                          return (
                            <td
                              key={f.scheme_code}
                              className={`px-4 py-2 text-center font-data ${
                                isBest ? 'text-accent font-bold' : isNegReturn ? 'text-negative' : 'text-foreground'
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

            {/* NAV Overlay Chart */}
            {navTraces.length > 0 && (
              <ChartContainer
                title="NAV Growth Comparison"
                subtitle="Normalized to base 100"
                timeframe={navTimeframe}
                onTimeframeChange={setNavTimeframe}
              >
                <Plot
                  data={navTraces}
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

            {/* Overlap + Sector */}
            {(() => {
              const fundsWithoutHoldings = funds.filter((f) => f.holdingsCount === 0);
              const allMissing = fundsWithoutHoldings.length === funds.length;
              const someMissing = fundsWithoutHoldings.length > 0;

              if (allMissing) {
                return (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-3 text-muted">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">No holdings data available</p>
                        <p className="text-xs mt-1">
                          None of the selected funds have portfolio holdings data. Overlap analysis and sector comparison require holdings data.
                          Use the "Full data only" filter when adding funds, or run the Holdings Pipeline from the Admin page.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <>
                  {someMissing && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/10 rounded-lg text-xs text-muted">
                      <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>
                        Holdings data unavailable for{' '}
                        {fundsWithoutHoldings.map((f) => f.scheme_name?.split(' - ')[0]).join(', ')}.
                        Overlap and sector data will be partial.
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {overlap && (
                      <OverlapMatrix schemes={overlap.schemes} matrix={overlap.matrix} />
                    )}

                    {sectorTraces.length > 0 && (
                      <ChartContainer
                        title="Sector Comparison"
                        subtitle="Portfolio allocation by sector"
                        showTimeframes={false}
                      >
                        <Plot
                          data={sectorTraces}
                          layout={{
                            ...chartLayout,
                            margin: { ...chartLayout.margin, b: 100 },
                            barmode: 'group',
                            xaxis: {
                              ...chartLayout.xaxis,
                              tickangle: -45,
                              tickfont: { ...chartLayout.font, size: 9 },
                            },
                            yaxis: {
                              ...chartLayout.yaxis,
                              title: { text: 'Weight (%)', font: { ...chartLayout.font, size: 10 } },
                              ticksuffix: '%',
                            },
                            showlegend: true,
                            legend: {
                              font: { ...chartLayout.font, size: 9 },
                              x: 0,
                              y: -0.4,
                              orientation: 'h',
                            },
                          }}
                          config={defaultConfig}
                          useResizeHandler
                          style={{ width: '100%', height: '100%' }}
                        />
                      </ChartContainer>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
