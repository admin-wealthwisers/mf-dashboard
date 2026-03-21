import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Database,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  BarChart3,
  Layers,
} from 'lucide-react';
import { fetchAdminStats, abortPipeline, abortHoldingsPipeline } from '../lib/api';
import HelpButton from '../components/HelpButton';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    staleTime: 10_000,
  });

  const [pipelineState, setPipelineState] = useState('idle'); // idle | running | complete | error
  const [progress, setProgress] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pipelineMode, setPipelineMode] = useState('all-growth');
  const logsEndRef = useRef(null);

  // Holdings pipeline state
  const [holdingsState, setHoldingsState] = useState('idle');
  const [holdingsProgress, setHoldingsProgress] = useState(null);
  const [holdingsLogs, setHoldingsLogs] = useState([]);
  const [holdingsLimit, setHoldingsLimit] = useState(500);
  const holdingsLogsEndRef = useRef(null);

  const scrollLogs = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const startPipeline = useCallback(async () => {
    setPipelineState('running');
    setProgress(null);
    setLogs([]);

    try {
      const response = await fetch('/api/admin/pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: pipelineMode }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'progress') {
              setProgress(event);
              setLogs((prev) => [...prev.slice(-200), { time: new Date(), ...event }]);
              scrollLogs();
            } else if (event.type === 'status') {
              setLogs((prev) => [...prev.slice(-200), { time: new Date(), type: 'status', message: event.message }]);
              scrollLogs();
            } else if (event.type === 'complete') {
              setProgress(event);
              setPipelineState('complete');
              setLogs((prev) => [
                ...prev,
                {
                  time: new Date(),
                  type: 'complete',
                  message: `Done! ${event.succeeded} schemes ingested, ${event.totalNavInserted} NAV records. DB: ${event.dbSchemes} schemes, ${event.dbNavRecords} NAVs.`,
                },
              ]);
              // Refresh stats
              refetch();
              queryClient.invalidateQueries();
            } else if (event.type === 'error') {
              setPipelineState('error');
              setLogs((prev) => [...prev, { time: new Date(), type: 'error', message: event.message }]);
            }
          } catch {
            // skip parse errors
          }
        }
      }

      if (pipelineState === 'running') {
        setPipelineState('complete');
      }
    } catch (err) {
      setPipelineState('error');
      setLogs((prev) => [...prev, { time: new Date(), type: 'error', message: err.message }]);
    }
  }, [pipelineMode, refetch, queryClient, scrollLogs]);

  const handleAbort = async () => {
    try {
      await abortPipeline();
      setLogs((prev) => [...prev, { time: new Date(), type: 'status', message: 'Abort signal sent...' }]);
    } catch {
      // ignore
    }
  };

  const scrollHoldingsLogs = useCallback(() => {
    holdingsLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const startHoldingsPipeline = useCallback(async () => {
    setHoldingsState('running');
    setHoldingsProgress(null);
    setHoldingsLogs([]);

    try {
      const response = await fetch('/api/admin/holdings-pipeline/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: holdingsLimit }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'progress') {
              setHoldingsProgress(event);
              setHoldingsLogs((prev) => [...prev.slice(-200), { time: new Date(), ...event }]);
              scrollHoldingsLogs();
            } else if (event.type === 'status') {
              setHoldingsLogs((prev) => [...prev.slice(-200), { time: new Date(), type: 'status', message: event.message }]);
              scrollHoldingsLogs();
            } else if (event.type === 'complete') {
              setHoldingsProgress(event);
              setHoldingsState('complete');
              setHoldingsLogs((prev) => [
                ...prev,
                {
                  time: new Date(),
                  type: 'complete',
                  message: `Done! ${event.succeeded} schemes scraped, ${event.holdingsInserted} holdings inserted, ${event.instrumentsCreated} new instruments. DB: ${event.schemesWithHoldings} schemes with holdings.`,
                },
              ]);
              refetch();
              queryClient.invalidateQueries();
            } else if (event.type === 'error') {
              setHoldingsState('error');
              setHoldingsLogs((prev) => [...prev, { time: new Date(), type: 'error', message: event.message }]);
            }
          } catch {
            // skip parse errors
          }
        }
      }

      if (holdingsState === 'running') {
        setHoldingsState('complete');
      }
    } catch (err) {
      setHoldingsState('error');
      setHoldingsLogs((prev) => [...prev, { time: new Date(), type: 'error', message: err.message }]);
    }
  }, [holdingsLimit, refetch, queryClient, scrollHoldingsLogs]);

  const handleAbortHoldings = async () => {
    try {
      await abortHoldingsPipeline();
      setHoldingsLogs((prev) => [...prev, { time: new Date(), type: 'status', message: 'Abort signal sent...' }]);
    } catch {
      // ignore
    }
  };

  const dbStats = stats?.data;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">Admin</h1>
          <HelpButton helpId="admin" />
        </div>
        <p className="text-sm text-muted mt-1">Database management and data pipelines</p>
      </div>

      {/* DB Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Database}
          label="Schemes"
          value={isLoading ? '...' : dbStats?.schemes?.toLocaleString('en-IN')}
          index={0}
        />
        <StatCard
          icon={BarChart3}
          label="NAV Records"
          value={isLoading ? '...' : dbStats?.navRecords?.toLocaleString('en-IN')}
          index={1}
        />
        <StatCard
          icon={Layers}
          label="Holdings"
          value={isLoading ? '...' : dbStats?.holdings?.toLocaleString('en-IN')}
          index={2}
        />
        <StatCard
          icon={HardDrive}
          label="Funds w/ Holdings"
          value={isLoading ? '...' : dbStats?.schemesWithHoldings?.toLocaleString('en-IN') || '0'}
          index={3}
        />
        <StatCard
          icon={Clock}
          label="Latest NAV"
          value={isLoading ? '...' : dbStats?.latestNavDate || '—'}
          index={4}
        />
      </div>

      {/* Category breakdown */}
      {dbStats?.categories?.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-mono font-bold text-foreground mb-3 uppercase tracking-wider">
            Schemes by Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {dbStats.categories.map((cat) => (
              <span
                key={cat.category || 'null'}
                className="text-[11px] font-mono px-2.5 py-1 bg-background border border-border-subtle rounded-full text-muted"
              >
                {cat.category || 'Uncategorized'}: <span className="text-foreground">{cat.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Control */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
            Data Pipeline — MFAPI Ingestion
          </h3>
          <p className="text-[11px] text-muted mt-1">
            Fetch mutual fund scheme data and NAV history from api.mfapi.in
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode selector + controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted font-mono">Mode:</label>
              <select
                value={pipelineMode}
                onChange={(e) => setPipelineMode(e.target.value)}
                disabled={pipelineState === 'running'}
                className="text-xs bg-background border border-border-subtle rounded px-2 py-1.5 text-foreground outline-none focus:border-accent/50 disabled:opacity-50"
              >
                <option value="all-growth">All Growth Plans (~14,600 Direct + Regular)</option>
                <option value="direct-growth">Direct-Growth Only (~5,000 schemes)</option>
                <option value="full">Full (all MFAPI schemes ~37,500)</option>
                <option value="incremental">Incremental (last 30 days)</option>
              </select>
            </div>

            {pipelineState !== 'running' ? (
              <button
                onClick={startPipeline}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded hover:bg-accent/90 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Start Pipeline
              </button>
            ) : (
              <button
                onClick={handleAbort}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-negative text-white text-xs font-medium rounded hover:bg-negative/90 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Abort
              </button>
            )}

            <button
              onClick={refetch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border-subtle text-muted text-xs rounded hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Stats
            </button>
          </div>

          {/* Progress bar */}
          {progress && (progress.current != null) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                <span>{progress.current} / {progress.total} schemes</span>
                <span className="flex items-center gap-3">
                  <span className="text-positive">{progress.succeeded} ok</span>
                  {progress.failed > 0 && <span className="text-negative">{progress.failed} failed</span>}
                  <span>{progress.navRecords?.toLocaleString('en-IN')} NAVs</span>
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Status indicator */}
          {pipelineState === 'complete' && (
            <div className="flex items-center gap-2 text-xs text-positive">
              <CheckCircle2 className="w-4 h-4" />
              Pipeline completed successfully
            </div>
          )}
          {pipelineState === 'error' && (
            <div className="flex items-center gap-2 text-xs text-negative">
              <AlertTriangle className="w-4 h-4" />
              Pipeline encountered an error
            </div>
          )}

          {/* Log output */}
          {logs.length > 0 && (
            <div className="bg-background border border-border-subtle rounded-lg max-h-64 overflow-y-auto">
              <div className="p-3 space-y-0.5">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`text-[10px] font-mono leading-relaxed ${
                      log.type === 'error'
                        ? 'text-negative'
                        : log.type === 'complete'
                        ? 'text-positive'
                        : 'text-muted'
                    }`}
                  >
                    <span className="text-muted/50">
                      {log.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>{' '}
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Holdings Pipeline */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border-subtle">
          <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
            Holdings Pipeline — Groww Scraping
          </h3>
          <p className="text-[11px] text-muted mt-1">
            Scrape portfolio holdings data from Groww.in fund pages (sitemap-based)
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted font-mono">Limit:</label>
              <input
                type="number"
                value={holdingsLimit}
                onChange={(e) => setHoldingsLimit(Math.max(5, Math.min(2000, parseInt(e.target.value) || 500)))}
                disabled={holdingsState === 'running'}
                className="text-xs bg-background border border-border-subtle rounded px-2 py-1.5 text-foreground outline-none focus:border-accent/50 disabled:opacity-50 w-20 font-mono"
                min={5}
                max={2000}
              />
              <span className="text-[10px] text-muted">funds from sitemap</span>
            </div>

            {holdingsState !== 'running' ? (
              <button
                onClick={startHoldingsPipeline}
                disabled={pipelineState === 'running'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                Start Holdings Pipeline
              </button>
            ) : (
              <button
                onClick={handleAbortHoldings}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-negative text-white text-xs font-medium rounded hover:bg-negative/90 transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Abort
              </button>
            )}
          </div>

          {/* Progress bar */}
          {holdingsProgress && (holdingsProgress.current != null) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                <span>{holdingsProgress.current} / {holdingsProgress.total} processed</span>
                <span className="flex items-center gap-3">
                  <span className="text-positive">{holdingsProgress.succeeded} scraped</span>
                  {holdingsProgress.failed > 0 && <span className="text-negative">{holdingsProgress.failed} failed</span>}
                  <span>{holdingsProgress.holdingsInserted?.toLocaleString('en-IN')} holdings</span>
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(holdingsProgress.current / holdingsProgress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Status indicator */}
          {holdingsState === 'complete' && (
            <div className="flex items-center gap-2 text-xs text-positive">
              <CheckCircle2 className="w-4 h-4" />
              Holdings pipeline completed successfully
            </div>
          )}
          {holdingsState === 'error' && (
            <div className="flex items-center gap-2 text-xs text-negative">
              <AlertTriangle className="w-4 h-4" />
              Holdings pipeline encountered an error
            </div>
          )}

          {/* Log output */}
          {holdingsLogs.length > 0 && (
            <div className="bg-background border border-border-subtle rounded-lg max-h-64 overflow-y-auto">
              <div className="p-3 space-y-0.5">
                {holdingsLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`text-[10px] font-mono leading-relaxed ${
                      log.type === 'error'
                        ? 'text-negative'
                        : log.type === 'complete'
                        ? 'text-positive'
                        : 'text-muted'
                    }`}
                  >
                    <span className="text-muted/50">
                      {log.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>{' '}
                    {log.message}
                  </div>
                ))}
                <div ref={holdingsLogsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, index = 0 }) {
  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-accent" />
        <span className="text-[11px] text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-mono font-bold text-lg text-foreground">{value}</p>
    </motion.div>
  );
}
