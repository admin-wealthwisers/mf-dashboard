import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StockSelector({ stocks, selectedSymbols, onSelect, buttonLabel = 'Add Stock' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const available = (stocks || []).filter((s) => !selectedSymbols.has(s.symbol));

  const filtered = query
    ? available.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.company_name?.toLowerCase().includes(query.toLowerCase()) ||
          s.sector?.toLowerCase().includes(query.toLowerCase())
      )
    : available;

  const visible = filtered.slice(0, 6);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = useCallback(
    (stock) => {
      onSelect(stock);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, visible.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && visible[selectedIndex]) {
        handleSelect(visible[selectedIndex]);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [visible, selectedIndex, handleSelect]
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-accent/10 text-accent border border-accent/20 rounded hover:bg-accent/20 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {buttonLabel}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 mt-2 w-[400px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden z-30"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
              <Search className="w-3.5 h-3.5 text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by symbol, name, or sector..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted outline-none"
              />
            </div>

            <div className="max-h-[240px] overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted">
                  {query ? 'No stocks found' : 'No more stocks available'}
                </div>
              ) : (
                visible.map((stock, i) => (
                  <button
                    key={stock.symbol}
                    className={`w-full flex items-center px-3 py-2 text-left transition-colors ${
                      i === selectedIndex
                        ? 'bg-accent/10 text-foreground'
                        : 'text-muted hover:bg-card-hover hover:text-foreground'
                    }`}
                    onClick={() => handleSelect(stock)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <div className="min-w-0">
                      <div className="text-xs truncate">
                        <span className="font-bold text-foreground">{stock.symbol}</span>
                        <span className="text-muted ml-2">{stock.company_name}</span>
                      </div>
                      <div className="text-[10px] text-muted truncate">
                        {stock.sector}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
