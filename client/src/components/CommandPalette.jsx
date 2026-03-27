import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { fetchSchemes } from '../lib/api';

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['schemes'],
    queryFn: () => fetchSchemes(),
    staleTime: 60_000,
  });

  const schemes = data?.data || [];
  const filtered = query
    ? schemes.filter(
        (s) =>
          s.scheme_name.toLowerCase().includes(query.toLowerCase()) ||
          s.amc?.toLowerCase().includes(query.toLowerCase()) ||
          s.scheme_code.includes(query)
      )
    : schemes;

  const visible = filtered.slice(0, 8);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (scheme) => {
      onClose();
      navigate(`/scorecard/${scheme.scheme_code}`);
    },
    [navigate, onClose]
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
        onClose();
      }
    },
    [visible, selectedIndex, handleSelect, onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search schemes by name, AMC, or code..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
              />
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted">
                  {query ? 'No schemes found' : 'Loading schemes...'}
                </div>
              ) : (
                visible.map((scheme, i) => (
                  <button
                    key={scheme.scheme_code}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selectedIndex
                        ? 'bg-accent/10 text-foreground'
                        : 'text-muted hover:bg-card-hover hover:text-foreground'
                    }`}
                    onClick={() => handleSelect(scheme)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{scheme.scheme_name}</div>
                      <div className="text-[11px] text-muted truncate">
                        {scheme.amc} · {scheme.sub_category || scheme.category}
                      </div>
                    </div>
                    <ArrowRight className="w-3 h-3 shrink-0 opacity-40" />
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-4 text-[10px] text-muted">
              <span><kbd className="font-mono bg-background px-1 rounded-sm">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono bg-background px-1 rounded-sm">↵</kbd> select</span>
              <span><kbd className="font-mono bg-background px-1 rounded-sm">esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
