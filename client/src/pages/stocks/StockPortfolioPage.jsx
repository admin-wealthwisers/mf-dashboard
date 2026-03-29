import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload, Download, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Plot from 'react-plotly.js';
import StatCard from '../../components/StatCard';
import { defaultConfig } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';
import {
  fetchStocks,
  fetchStockProfiles,
  createStockProfile,
  deleteStockProfile,
  fetchStockProfile,
  uploadStockPortfolioCSV,
  analyzeStockProfile,
} from '../../lib/api';

// ── Stock Selector (inline) ─────────────────────────────────────────────────

function StockSelector({ stocks, onSelect }) {
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
        className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80"
      >
        <Search className="w-3 h-3" /> Select Stock
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute left-0 bottom-full mb-1 w-[300px] bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
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
            <div className="max-h-[200px] overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => { onSelect(s); setIsOpen(false); setQuery(''); }}
                  className="w-full px-3 py-2 text-left hover:bg-background transition-colors"
                >
                  <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-[10px] text-muted">{s.symbol}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StockPortfolioPage() {
  const qc = useQueryClient();
  const chartLayout = useChartLayout();
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data: stocksData } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => fetchStocks(),
    staleTime: 60_000,
  });
  const stocks = stocksData?.data || [];

  const { data: profilesData } = useQuery({
    queryKey: ['stock-profiles'],
    queryFn: fetchStockProfiles,
  });
  const profiles = profilesData?.data || [];

  const { data: profileData } = useQuery({
    queryKey: ['stock-profile', selectedProfileId],
    queryFn: () => fetchStockProfile(selectedProfileId),
    enabled: !!selectedProfileId,
  });
  const profile = profileData?.data;

  const { data: analysisData } = useQuery({
    queryKey: ['stock-profile-analysis', selectedProfileId],
    queryFn: () => analyzeStockProfile(selectedProfileId),
    enabled: !!selectedProfileId && (profile?.holdings?.length || 0) > 0,
  });
  const analysis = analysisData?.data;

  const createMut = useMutation({
    mutationFn: ({ name }) => createStockProfile(name),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['stock-profiles'] });
      setSelectedProfileId(data.data.id);
      setShowCreateModal(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteStockProfile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-profiles'] });
      setSelectedProfileId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono font-bold text-lg">Stock Portfolio</h1>
        <p className="text-sm text-muted">Build and track stock portfolios</p>
      </div>

      {/* Profile Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedProfileId || ''}
          onChange={(e) => setSelectedProfileId(e.target.value || null)}
          className="bg-card border border-border rounded px-3 py-2 text-sm text-foreground min-w-[220px]"
        >
          <option value="">Select a portfolio...</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.holdingCount} stocks)</option>
          ))}
        </select>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono bg-accent text-white rounded hover:bg-accent/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Portfolio
        </button>
        {selectedProfileId && (
          <button
            onClick={() => { if (confirm('Delete this portfolio and all its holdings?')) deleteMut.mutate(selectedProfileId); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-negative border border-negative/30 rounded hover:bg-negative/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
      </div>

      {!selectedProfileId && (
        <div className="text-center py-16">
          <p className="text-sm text-muted mb-4">Select a portfolio above or create a new one to get started.</p>
        </div>
      )}

      {selectedProfileId && profile && (
        <>
          {/* Summary Cards */}
          {profile.summary && profile.summary.holdingCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Current Value" value={profile.summary.totalCurrentValue} format="currency" />
              <StatCard label="Invested Value" value={profile.summary.totalInvestedValue} format="currency" />
              <StatCard label="Total Gain" value={profile.summary.totalGain} format="currency" color={profile.summary.totalGain > 0 ? 'positive' : profile.summary.totalGain < 0 ? 'negative' : ''} />
              <StatCard label="Return %" value={profile.summary.totalGainPct} format="percent" color={profile.summary.totalGainPct > 0 ? 'positive' : profile.summary.totalGainPct < 0 ? 'negative' : ''} />
            </div>
          )}

          {/* Holdings Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h3 className="font-mono font-bold text-sm">Holdings</h3>
              <div className="flex items-center gap-2">
                <a href="/api/stock-portfolio/template" download className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-muted hover:text-foreground border border-border-subtle rounded transition-colors">
                  <Download className="w-3 h-3" /> Template
                </a>
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-accent hover:text-accent/80 border border-accent/30 rounded transition-colors">
                  <Upload className="w-3 h-3" /> Upload CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-background text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Stock</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Buy Price</th>
                    <th className="px-3 py-2 text-right">CMP</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-right">Gain/Loss</th>
                    <th className="px-3 py-2 text-right">Wt%</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.holdings || []).map((h) => (
                    <tr key={h.symbol} className="border-t border-border-subtle/30 hover:bg-background/50">
                      <td className="px-3 py-2">
                        <p className="text-foreground font-medium truncate max-w-[250px]">{h.name || h.symbol}</p>
                        <p className="text-[10px] text-muted">{h.sector}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-data">{h.quantity?.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-right font-data text-muted">{h.purchasePrice ? `₹${h.purchasePrice.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-2 text-right font-data">
                        {h.currentPrice ? `₹${h.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-data">
                        ₹{h.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`px-3 py-2 text-right font-data ${h.gain > 0 ? 'text-positive' : h.gain < 0 ? 'text-negative' : 'text-muted'}`}>
                        {h.gain !== null ? (
                          <>
                            {h.gain > 0 ? '+' : ''}₹{Math.abs(h.gain).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            <span className="text-[10px] ml-0.5">({h.gainPct > 0 ? '+' : ''}{h.gainPct?.toFixed(1)}%)</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-data text-muted">{(h.weight * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  {(profile.holdings || []).length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted">No holdings yet. Upload a CSV to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sector Allocation Pie */}
          {analysis && analysis.sectorAllocation?.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4" style={{ height: 360 }}>
              <h4 className="font-mono text-xs text-muted mb-2">Sector Allocation</h4>
              <Plot
                data={[{
                  type: 'pie',
                  labels: analysis.sectorAllocation.map((s) => s.sector),
                  values: analysis.sectorAllocation.map((s) => s.value),
                  textinfo: 'label+percent',
                  textfont: { ...chartLayout.font, size: 10 },
                  marker: { colors: analysis.sectorAllocation.map((_, i) => ['#3b82f6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'][i % 10]) },
                  hole: 0.4,
                  hovertemplate: '%{label}: ₹%{value:,.0f} (%{percent})<extra></extra>',
                }]}
                layout={{
                  ...chartLayout,
                  margin: { t: 10, r: 10, b: 10, l: 10 },
                  showlegend: true,
                  legend: { font: { ...chartLayout.font, size: 9 }, x: 1, y: 0.5 },
                }}
                config={defaultConfig}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateModal
            onClose={() => setShowCreateModal(false)}
            onCreate={(name) => createMut.mutate({ name })}
          />
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && selectedProfileId && (
          <UploadModal
            profileId={selectedProfileId}
            onClose={() => {
              setShowUploadModal(false);
              qc.invalidateQueries({ queryKey: ['stock-profile', selectedProfileId] });
              qc.invalidateQueries({ queryKey: ['stock-profile-analysis', selectedProfileId] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg p-6 w-[400px]" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <h3 className="font-mono font-bold text-sm mb-4">Create Stock Portfolio</h3>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Portfolio name (e.g., Long-term Picks)" className="w-full bg-background border border-border rounded px-3 py-2 text-sm mb-4" autoFocus onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name)} />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted">Cancel</button>
          <button onClick={() => name.trim() && onCreate(name)} disabled={!name.trim()} className="px-3 py-1.5 text-xs font-mono bg-accent text-white rounded disabled:opacity-40">Create</button>
        </div>
      </motion.div>
    </>
  );
}

function UploadModal({ profileId, onClose }) {
  const [csv, setCsv] = useState('');
  const [results, setResults] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => setCsv(ev.target.result);
    r.readAsText(f);
  };

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
        <h3 className="font-mono font-bold text-sm mb-4">Upload Stock Portfolio CSV</h3>
        {!results && (
          <>
            <p className="text-xs text-muted mb-3">CSV columns: <code className="text-accent">symbol, quantity, purchase_price, purchase_date</code></p>
            <input type="file" accept=".csv" onChange={handleFile} className="text-xs mb-3" />
            {csv && (
              <>
                <pre className="bg-background rounded p-3 text-[10px] font-mono text-muted max-h-[120px] overflow-auto mb-3">{csv.slice(0, 400)}</pre>
                <button
                  onClick={async () => {
                    const d = await uploadStockPortfolioCSV(profileId, csv);
                    setResults(d.data);
                  }}
                  className="px-3 py-1.5 text-xs font-mono bg-accent text-white rounded"
                >
                  Upload
                </button>
              </>
            )}
          </>
        )}
        {results && (
          <div className="text-center py-4">
            <p className="text-sm text-positive mb-1">Upload complete!</p>
            <p className="text-xs text-muted mb-3">
              {results.summary?.imported || 0} imported, {results.summary?.errors || 0} errors
            </p>
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-mono bg-accent text-white rounded">Close</button>
          </div>
        )}
      </motion.div>
    </>
  );
}
