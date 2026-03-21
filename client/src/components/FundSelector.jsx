import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FundSelector({ schemes, selectedCodes, onSelect, buttonLabel = 'Add Fund', fullDataOnly = false, onFullDataOnlyChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  let available = (schemes || []).filter((s) => !selectedCodes.has(s.scheme_code));
  if (fullDataOnly) {
    available = available.filter((s) => s.hasHoldings);
  }

  const filtered = query
    ? available.filter(
        (s) =>
          s.scheme_name.toLowerCase().includes(query.toLowerCase()) ||
          s.amc?.toLowerCase().includes(query.toLowerCase()) ||
          s.scheme_code.includes(query)
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
    (scheme) => {
      onSelect(scheme);
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
                placeholder="Search by name, AMC, or code..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted outline-none"
              />
            </div>
            {onFullDataOnlyChange && (
              <label className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle cursor-pointer hover:bg-card-hover">
                <input
                  type="checkbox"
                  checked={fullDataOnly}
                  onChange={(e) => onFullDataOnlyChange(e.target.checked)}
                  className="w-3 h-3 rounded-sm border-border bg-background accent-accent"
                />
                <span className="text-[10px] text-muted">Full data only (with holdings)</span>
              </label>
            )}

            <div className="max-h-[240px] overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-muted">
                  {query ? 'No schemes found' : 'No more schemes available'}
                </div>
              ) : (
                visible.map((scheme, i) => (
                  <button
                    key={scheme.scheme_code}
                    className={`w-full flex items-center px-3 py-2 text-left transition-colors ${
                      i === selectedIndex
                        ? 'bg-accent/10 text-foreground'
                        : 'text-muted hover:bg-card-hover hover:text-foreground'
                    }`}
                    onClick={() => handleSelect(scheme)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <div className="min-w-0">
                      <div className="text-xs truncate">{scheme.scheme_name}</div>
                      <div className="text-[10px] text-muted truncate">
                        {scheme.amc} · {scheme.sub_category || scheme.category}
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
