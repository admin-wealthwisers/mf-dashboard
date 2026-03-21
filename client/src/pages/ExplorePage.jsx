import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, SlidersHorizontal, List, ScatterChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SchemeCard from '../components/SchemeCard';
import UniverseHeatmap from '../components/UniverseHeatmap';
import HelpButton from '../components/HelpButton';
import { fetchDashboard } from '../lib/api';

const SORT_OPTIONS = [
  { key: 'navRecordCount', label: 'Data Points' },
  { key: 'return1Y', label: '1Y Return' },
  { key: 'changePct', label: '1D Change' },
  { key: 'nav', label: 'NAV' },
  { key: 'scheme_name', label: 'Name' },
];

// Map verbose MFAPI sub_category to clean display names
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

const PAGE_SIZE = 20;

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedAmc, setSelectedAmc] = useState('');
  const [sortBy, setSortBy] = useState('navRecordCount');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'scatter'
  const [fullDataOnly, setFullDataOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 30_000,
  });

  const schemes = data?.data?.schemes || [];

  // Extract unique categories and AMCs for filter options
  const categories = useMemo(() => {
    const set = new Set();
    schemes.forEach((s) => {
      set.add(cleanCategory(s.sub_category));
    });
    return [...set].sort();
  }, [schemes]);

  const amcs = useMemo(() => {
    const set = new Set();
    schemes.forEach((s) => { if (s.amc) set.add(s.amc); });
    return [...set].sort();
  }, [schemes]);

  // Filter + sort
  const filtered = useMemo(() => {
    // Exclude segregated/illiquid portfolio schemes (safety net)
    let result = schemes.filter(
      (s) => !s.scheme_name.toLowerCase().includes('segregated')
    );

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.scheme_name.toLowerCase().includes(q) ||
          s.amc?.toLowerCase().includes(q) ||
          s.scheme_code.includes(q)
      );
    }

    // Full data only filter
    if (fullDataOnly) {
      result = result.filter((s) => s.hasHoldings);
    }

    // Category filter
    if (selectedCategories.size > 0) {
      result = result.filter(
        (s) => selectedCategories.has(cleanCategory(s.sub_category))
      );
    }

    // AMC filter
    if (selectedAmc) {
      result = result.filter((s) => s.amc === selectedAmc);
    }

    // Sort
    result = [...result].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [schemes, search, selectedCategories, selectedAmc, sortBy, sortDir, fullDataOnly]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
    setPage(0);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Filter Sidebar */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.aside
            className="w-[180px] shrink-0 space-y-5 overflow-y-auto pr-2"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 180, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted block mb-1.5">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Name, AMC, code..."
                  className="w-full bg-background border border-border rounded pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Full Data Only */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={fullDataOnly}
                onChange={(e) => { setFullDataOnly(e.target.checked); setPage(0); }}
                className="w-3 h-3 rounded-sm border-border bg-background accent-accent"
              />
              <span className="text-[10px] text-muted group-hover:text-foreground transition-colors">
                Full data only
              </span>
            </label>

            {/* Categories */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted block mb-1.5">
                Category
              </label>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 text-xs text-muted hover:text-foreground cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="w-3 h-3 rounded-sm border-border bg-background accent-accent"
                    />
                    <span className="truncate">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* AMC */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted block mb-1.5">
                AMC
              </label>
              <div className="relative">
                <select
                  value={selectedAmc}
                  onChange={(e) => { setSelectedAmc(e.target.value); setPage(0); }}
                  className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent appearance-none cursor-pointer"
                >
                  <option value="">All AMCs</option>
                  {amcs.map((amc) => (
                    <option key={amc} value={amc}>
                      {amc}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted block mb-1.5">
                Sort By
              </label>
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (sortBy === opt.key) {
                        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortBy(opt.key);
                        setSortDir('desc');
                      }
                      setPage(0);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                      sortBy === opt.key
                        ? 'bg-accent/10 text-accent'
                        : 'text-muted hover:text-foreground hover:bg-background'
                    }`}
                  >
                    {opt.label}
                    {sortBy === opt.key && (
                      <span className="ml-1 opacity-60">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-lg mb-0.5">Explore</h1>
              <HelpButton helpId="explore" />
            </div>
            <p className="text-xs text-muted">
              {filtered.length} scheme{filtered.length !== 1 ? 's' : ''}
              {search || selectedCategories.size || selectedAmc ? ' (filtered)' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex bg-background rounded p-0.5 border border-border-subtle">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-sm transition-colors ${
                  viewMode === 'list' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('scatter')}
                className={`p-1.5 rounded-sm transition-colors ${
                  viewMode === 'scatter' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
                }`}
                title="Scatter view"
              >
                <ScatterChart className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`p-1.5 rounded transition-colors ${
                filtersOpen ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scatter View */}
        {viewMode === 'scatter' && (
          <UniverseHeatmap />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {/* Loading */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-lg h-[140px] animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Cards Grid */}
            {!isLoading && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {paged.map((s, i) => (
                    <SchemeCard key={s.scheme_code} scheme={s} index={i} />
                  ))}
                </div>

                {paged.length === 0 && (
                  <div className="text-center py-16 text-sm text-muted">
                    No schemes match your filters
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 text-xs font-mono border border-border rounded disabled:opacity-30 text-muted hover:text-foreground hover:border-muted transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-muted font-mono">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1 text-xs font-mono border border-border rounded disabled:opacity-30 text-muted hover:text-foreground hover:border-muted transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
