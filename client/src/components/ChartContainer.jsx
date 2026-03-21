import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { useAiPanel } from '../lib/AiPanelContext';

const TIMEFRAMES = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX'];

function timeframeToDate(tf) {
  if (tf === 'MAX') return null;
  const d = new Date();
  const map = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 };
  d.setMonth(d.getMonth() - map[tf]);
  return d.toISOString().slice(0, 10);
}

export default function ChartContainer({
  title,
  subtitle,
  children,
  isLoading,
  error,
  onRetry,
  timeframe,
  onTimeframeChange,
  showTimeframes = true,
  className = '',
  explainContext,
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [fsKey, setFsKey] = useState(0);

  const toggleFullscreen = () => {
    setFullscreen((f) => !f);
    // Force Plotly to remount and measure the new container size
    setTimeout(() => setFsKey((k) => k + 1), 50);
  };
  const aiPanel = useAiPanel();

  const content = (
    <div
      className={`bg-card border border-border rounded-lg overflow-hidden ${
        fullscreen ? 'fixed inset-4 z-40 flex flex-col' : className
      }`}
    >
      {/* Header — z-10 ensures controls are above Plotly chart */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle relative z-10">
        <div className="min-w-0">
          <h3 className="font-mono font-bold text-sm text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-muted truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showTimeframes && onTimeframeChange && (
            <div className="flex gap-0.5 bg-background rounded p-0.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-2 py-1 text-[10px] font-mono rounded-sm transition-colors ${
                    timeframe === tf
                      ? 'bg-accent text-white'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
          {aiPanel && (
            <button
              onClick={() => aiPanel.sendMessage(
                `Explain this chart to a client in simple terms (text only, do NOT generate a chart or SQL query): ${explainContext || title}${subtitle ? ` — ${subtitle}` : ''}`
              )}
              className="p-1.5 text-muted hover:text-accent transition-colors"
              title="Explain to client"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-muted hover:text-foreground transition-colors"
          >
            {fullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`relative ${fullscreen ? 'flex-1 min-h-0' : 'h-[320px]'}`}>
        <div className="absolute inset-0" key={fsKey}>
          {isLoading && <LoadingSkeleton />}
          {error && <ErrorState message={error} onRetry={onRetry} />}
          {!isLoading && !error && children}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {content}
      {/* Fullscreen backdrop */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleFullscreen}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col gap-3 p-4">
      <div className="flex-1 bg-background rounded animate-pulse" />
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-3 bg-background rounded animate-pulse flex-1" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2 opacity-50" />
        <p className="text-sm text-muted mb-3">{message || 'Failed to load chart data'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-accent text-white rounded hover:bg-accent/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export { timeframeToDate };
