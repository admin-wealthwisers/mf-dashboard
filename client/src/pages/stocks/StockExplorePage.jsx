import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchStocks } from '../../lib/api';

const SORT_OPTIONS = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'market_cap', label: 'Market Cap' },
  { key: 'pe_ratio', label: 'PE Ratio' },
  { key: 'change_pct', label: '1D Change' },
];

const PAGE_SIZE = 24;

function formatMarketCap(value) {
  if (value == null) return '—';
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `₹${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(0)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(0)}L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function StockExploreCard({ stock, index }) {
  const navigate = useNavigate();
  const isPositive = stock.change_pct > 0;
  const isNegative = stock.change_pct < 0;

  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-3.5 cursor-pointer hover:bg-card-hover hover:border-muted/30 transition-colors overflow-hidden"
      onClick={() => navigate(`/stocks/scorecard/${stock.symbol}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.5), ease: 'easeOut' }}
    >
      {/* Stock name */}
      <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 mb-0.5">
        {stock.name}
      </p>
      <p className="text-[10px] text-muted truncate mb-2">{stock.symbol}</p>

      {/* Sector badge */}
      {stock.sector && (
        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 bg-background text-muted rounded-sm border border-border-subtle mb-2.5 truncate max-w-full">
          {stock.sector}
        </span>
      )}

      {/* Bottom: Price + 1D Change + Market Cap */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">Price</p>
          <p className="font-data text-[11px] text-foreground">
            {stock.close != null ? `₹${Number(stock.close).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">1D</p>
          <p className={`font-data text-[11px] flex items-center justify-center gap-0.5 ${isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-muted'}`}>
            {isPositive && <ArrowUpRight className="w-2.5 h-2.5" />}
            {isNegative && <ArrowDownRight className="w-2.5 h-2.5" />}
            {stock.change_pct != null ? `${stock.change_pct > 0 ? '+' : ''}${stock.change_pct.toFixed(2)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">MCap</p>
          <p className="font-data text-[11px] text-foreground">{formatMarketCap(stock.market_cap)}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function StockExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedSectors, setSelectedSectors] = useState(new Set());
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => fetchStocks(),
    staleTime: 30_000,
  });

  const stocks = data?.data || [];

  // Extract unique sectors and industries
  const sectors = useMemo(() => {
    const set = new Set();
    stocks.forEach((s) => { if (s.sector) set.add(s.sector); });
    return [...set].sort();
  }, [stocks]);

  const industries = useMemo(() => {
    const set = new Set();
    stocks.forEach((s) => { if (s.industry) set.add(s.industry); });
    return [...set].sort();
  }, [stocks]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...stocks];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.symbol?.toLowerCase().includes(q) ||
          s.name?.toLowerCase().includes(q) ||
          s.isin?.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSectors.size > 0) {
      result = result.filter((s) => selectedSectors.has(s.sector));
    }

    // Industry filter
    if (selectedIndustry) {
      result = result.filter((s) => s.industry === selectedIndustry);
    }

    // Sort
    result.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [stocks, search, selectedSectors, selectedIndustry, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSector = (sector) => {
    setSelectedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
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
                  placeholder="Symbol, name..."
                  className="w-full bg-background border border-border rounded pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Sectors */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted block mb-1.5">
                Sector
              </label>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {sectors.map((sector) => (
                  <label
                    key={sector}
                    className="flex items-center gap-2 text-xs text-muted hover:text-foreground cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSectors.has(sector)}
                      onChange={() => toggleSector(sector)}
                      className="w-3 h-3 rounded-sm border-border bg-background accent-accent"
                    />
                    <span className="truncate">{sector}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted block mb-1.5">
                Industry
              </label>
              <select
                value={selectedIndustry}
                onChange={(e) => { setSelectedIndustry(e.target.value); setPage(0); }}
                className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-accent appearance-none cursor-pointer"
              >
                <option value="">All Industries</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
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
            <h1 className="font-mono font-bold text-lg mb-0.5">Stocks</h1>
            <p className="text-xs text-muted">
              {filtered.length} stock{filtered.length !== 1 ? 's' : ''}
              {search || selectedSectors.size || selectedIndustry ? ' (filtered)' : ''}
            </p>
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
                <StockExploreCard key={s.symbol} stock={s} index={i} />
              ))}
            </div>

            {paged.length === 0 && (
              <div className="text-center py-16 text-sm text-muted">
                No stocks match your filters
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
      </div>
    </div>
  );
}
