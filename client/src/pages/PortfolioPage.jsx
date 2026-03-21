import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Plot from 'react-plotly.js';
import HelpButton from '../components/HelpButton';
import FundSelector from '../components/FundSelector';
import OverlapMatrix from '../components/OverlapMatrix';
import StatCard from '../components/StatCard';
import { defaultConfig } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import {
  fetchProfiles, createProfile, deleteProfile, fetchProfile,
  addHolding, removeHolding, uploadPortfolioCSV, analyzeProfile,
  fetchDashboard,
} from '../lib/api';

export default function PortfolioPage() {
  const qc = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEcasModal, setShowEcasModal] = useState(false);
  const [addingFund, setAddingFund] = useState(false);
  const [newUnits, setNewUnits] = useState('');
  const [newPurchaseNav, setNewPurchaseNav] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState('');

  const { data: profilesData } = useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles });
  const profiles = profilesData?.data || [];

  const { data: profileData } = useQuery({
    queryKey: ['profile', selectedProfileId],
    queryFn: () => fetchProfile(selectedProfileId),
    enabled: !!selectedProfileId,
  });
  const profile = profileData?.data;

  const { data: analysisData } = useQuery({
    queryKey: ['profile-analysis', selectedProfileId],
    queryFn: () => analyzeProfile(selectedProfileId),
    enabled: !!selectedProfileId && (profile?.holdings?.length || 0) > 0,
  });
  const analysis = analysisData?.data;

  const { data: dashData } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, staleTime: 60_000 });
  const schemes = dashData?.data?.schemes || [];

  const createMut = useMutation({
    mutationFn: ({ name }) => createProfile(name),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      setSelectedProfileId(data.data.id);
      setShowCreateModal(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteProfile(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles'] }); setSelectedProfileId(null); },
  });

  const addMut = useMutation({
    mutationFn: (h) => addHolding(selectedProfileId, h),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', selectedProfileId] });
      qc.invalidateQueries({ queryKey: ['profile-analysis', selectedProfileId] });
      setAddingFund(false); setNewUnits(''); setNewPurchaseNav(''); setNewPurchaseDate('');
    },
  });

  const removeMut = useMutation({
    mutationFn: (code) => removeHolding(selectedProfileId, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', selectedProfileId] });
      qc.invalidateQueries({ queryKey: ['profile-analysis', selectedProfileId] });
    },
  });

  const selectedCodes = new Set((profile?.holdings || []).map((h) => h.schemeCode));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-mono font-bold text-lg">Portfolio</h1>
          <HelpButton helpId="portfolio" />
        </div>
        <p className="text-sm text-muted">Build and analyze client portfolios</p>
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
            <option key={p.id} value={p.id}>{p.name} ({p.fundCount} funds)</option>
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
          <button
            onClick={() => setShowEcasModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-mono bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition-colors"
          >
            <FileText className="w-4 h-4" /> Import from ECAS Statement (PDF)
          </button>
          <p className="text-[10px] text-muted mt-2">Upload your CAMS/KFintech CAS to auto-create a portfolio</p>
        </div>
      )}

      {selectedProfileId && profile && (
        <>
          {/* Summary Cards */}
          {profile.summary.fundCount > 0 && (
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
                <a href="/api/portfolio/template" download className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-muted hover:text-foreground border border-border-subtle rounded transition-colors">
                  <Download className="w-3 h-3" /> Template
                </a>
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-accent hover:text-accent/80 border border-accent/30 rounded transition-colors">
                  <Upload className="w-3 h-3" /> Upload CSV
                </button>
                <button onClick={() => setShowEcasModal(true)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 border border-emerald-400/30 rounded transition-colors">
                  <FileText className="w-3 h-3" /> Import ECAS
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-background text-[10px] text-muted uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Fund</th>
                    <th className="px-3 py-2 text-right">Units</th>
                    <th className="px-3 py-2 text-right">Buy NAV</th>
                    <th className="px-3 py-2 text-right">Curr NAV</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-right">Gain/Loss</th>
                    <th className="px-3 py-2 text-right">Wt%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {profile.holdings.map((h) => (
                    <tr key={h.schemeCode} className="border-t border-border-subtle/30 hover:bg-background/50">
                      <td className="px-3 py-2">
                        <p className="text-foreground font-medium truncate max-w-[250px]">{h.schemeName}</p>
                        <p className="text-[10px] text-muted">{h.amc}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-data">{h.units.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-right font-data text-muted">{h.purchaseNav ? `₹${h.purchaseNav.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-2 text-right font-data">₹{h.currentNav.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-data">₹{h.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className={`px-3 py-2 text-right font-data ${h.gain > 0 ? 'text-positive' : h.gain < 0 ? 'text-negative' : 'text-muted'}`}>
                        {h.gain !== null ? (<>{h.gain > 0 ? '+' : ''}₹{Math.abs(h.gain).toLocaleString('en-IN', { maximumFractionDigits: 0 })} <span className="text-[10px]">({h.gainPct > 0 ? '+' : ''}{h.gainPct?.toFixed(1)}%)</span></>) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-data text-muted">{(h.weight * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => removeMut.mutate(h.schemeCode)} className="text-muted hover:text-negative transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  ))}
                  {profile.holdings.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted">No holdings yet. Add funds below or upload a CSV.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Fund */}
            <div className="px-4 py-3 border-t border-border-subtle bg-background/30">
              {!addingFund ? (
                <button onClick={() => setAddingFund(true)} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80">
                  <Plus className="w-3.5 h-3.5" /> Add Fund
                </button>
              ) : (
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] text-muted uppercase block mb-1">Fund</label>
                    <FundSelector
                      schemes={schemes}
                      selectedCodes={selectedCodes}
                      onSelect={(s) => {
                        if (!newUnits || parseFloat(newUnits) <= 0) return;
                        addMut.mutate({ schemeCode: s.scheme_code, units: parseFloat(newUnits), purchaseNav: newPurchaseNav ? parseFloat(newPurchaseNav) : null, purchaseDate: newPurchaseDate || null });
                      }}
                      buttonLabel="Select & Add"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-muted uppercase block mb-1">Units</label>
                    <input type="number" value={newUnits} onChange={(e) => setNewUnits(e.target.value)} placeholder="1000" className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs" />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-muted uppercase block mb-1">Buy NAV</label>
                    <input type="number" value={newPurchaseNav} onChange={(e) => setNewPurchaseNav(e.target.value)} placeholder="Optional" className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs" />
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] text-muted uppercase block mb-1">Buy Date</label>
                    <input type="date" value={newPurchaseDate} onChange={(e) => setNewPurchaseDate(e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs" />
                  </div>
                  <button onClick={() => setAddingFund(false)} className="px-2 py-1.5 text-xs text-muted hover:text-foreground">Cancel</button>
                </div>
              )}
            </div>
          </div>

          {/* Analysis */}
          {analysis && analysis.stockExposure?.length > 0 && <AnalysisSection analysis={analysis} holdings={profile.holdings} />}
        </>
      )}

      <AnimatePresence>
        {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} onCreate={(name) => createMut.mutate({ name })} />}
      </AnimatePresence>
      <AnimatePresence>
        {showUploadModal && selectedProfileId && (
          <UploadModal profileId={selectedProfileId} onClose={() => { setShowUploadModal(false); qc.invalidateQueries({ queryKey: ['profile', selectedProfileId] }); qc.invalidateQueries({ queryKey: ['profile-analysis', selectedProfileId] }); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showEcasModal && (
          <EcasUploadModal
            onClose={() => { setShowEcasModal(false); qc.invalidateQueries({ queryKey: ['profiles'] }); }}
            onImported={(profileId) => { setShowEcasModal(false); setSelectedProfileId(profileId); qc.invalidateQueries({ queryKey: ['profiles'] }); qc.invalidateQueries({ queryKey: ['profile', profileId] }); }}
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
        <h3 className="font-mono font-bold text-sm mb-4">Create New Portfolio</h3>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name (e.g., Rahul Sharma)" className="w-full bg-background border border-border rounded px-3 py-2 text-sm mb-4" autoFocus onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name)} />
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
  const [done, setDone] = useState(false);

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
        <h3 className="font-mono font-bold text-sm mb-4">Upload Portfolio CSV</h3>
        {!results && !done && (
          <>
            <p className="text-xs text-muted mb-3">CSV columns: <code className="text-accent">fund_name_or_code, units, purchase_nav, purchase_date</code></p>
            <input type="file" accept=".csv" onChange={handleFile} className="text-xs mb-3" />
            {csv && (
              <>
                <pre className="bg-background rounded p-3 text-[10px] font-mono text-muted max-h-[120px] overflow-auto mb-3">{csv.slice(0, 400)}</pre>
                <button onClick={async () => { const d = await uploadPortfolioCSV(profileId, csv, false); setResults(d.data.results); }} className="px-3 py-1.5 text-xs font-mono bg-accent text-white rounded">Preview Matches</button>
              </>
            )}
          </>
        )}
        {results && !done && (
          <>
            <table className="w-full text-[11px] mb-4">
              <thead><tr className="bg-background text-[10px] text-muted uppercase"><th className="px-2 py-1 text-left">Input</th><th className="px-2 py-1 text-left">Matched Fund</th><th className="px-2 py-1 text-right">Units</th><th className="px-2 py-1 text-center">Status</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border-subtle/30">
                    <td className="px-2 py-1.5 truncate max-w-[150px]">{r.input}</td>
                    <td className="px-2 py-1.5 truncate max-w-[200px]">{r.schemeName || '—'}</td>
                    <td className="px-2 py-1.5 text-right font-data">{r.units || '—'}</td>
                    <td className="px-2 py-1.5 text-center">
                      {r.status === 'matched' && <span className="text-positive text-[10px]">Matched</span>}
                      {r.status === 'unmatched' && <span className="text-negative text-[10px]">Not Found</span>}
                      {r.status === 'error' && <span className="text-warning text-[10px]">{r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setResults(null); setCsv(''); }} className="px-3 py-1.5 text-xs text-muted">Back</button>
              <button onClick={async () => { await uploadPortfolioCSV(profileId, csv, true); setDone(true); }} disabled={!results.some((r) => r.status === 'matched')} className="px-3 py-1.5 text-xs font-mono bg-accent text-white rounded disabled:opacity-40">
                Confirm ({results.filter((r) => r.status === 'matched').length} funds)
              </button>
            </div>
          </>
        )}
        {done && (
          <div className="text-center py-4">
            <p className="text-sm text-positive mb-3">Portfolio imported!</p>
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-mono bg-accent text-white rounded">Close</button>
          </div>
        )}
      </motion.div>
    </>
  );
}

function EcasUploadModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [ecasData, setEcasData] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    setError('');
    const formData = new FormData();
    formData.append('ecas', file);

    try {
      const res = await fetch('/api/portfolio/upload-ecas', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEcasData(json.data);
      setProfileName(json.data.investor?.name || file.name.replace('.pdf', ''));
      setStep('preview');
    } catch (err) {
      setError(err.message || 'Failed to parse ECAS PDF');
    }
  };

  const handleImport = async () => {
    if (!profileName.trim()) return;
    setStep('importing');
    try {
      const matched = ecasData.holdings.filter(h => h.matched);
      const res = await fetch('/api/portfolio/import-ecas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileName: profileName.trim(), holdings: matched }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setImportResult(json.data);
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('preview');
    }
  };

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="fixed z-50 top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg p-6 w-[700px] max-h-[calc(100vh-2rem)] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>

        <h3 className="font-mono font-bold text-sm mb-1">Import from ECAS Statement</h3>
        <p className="text-[11px] text-muted mb-4">Upload your CAMS/KFintech Consolidated Account Statement (PDF) to automatically import all holdings.</p>

        {error && <div className="bg-negative/10 border border-negative/30 rounded p-2 text-xs text-negative mb-3">{error}</div>}

        {step === 'upload' && (
          <div className="text-center py-8">
            <div
              className="border-2 border-dashed border-border-subtle rounded-lg p-8 cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-sm text-foreground mb-1">Drop your ECAS PDF here or click to browse</p>
              <p className="text-[10px] text-muted">Supports CAMS & KFintech consolidated statements</p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
          </div>
        )}

        {step === 'preview' && ecasData && (
          <>
            {/* Investor Info */}
            <div className="bg-background rounded p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted uppercase">Investor</span>
                <span className="text-[10px] text-muted">PAN: {ecasData.investor?.pan || '—'}</span>
              </div>
              <input
                type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-card border border-border rounded px-3 py-2 text-sm font-medium"
                placeholder="Portfolio name"
              />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-background rounded p-2 text-center">
                <p className="text-lg font-bold font-data">{ecasData.summary.totalHoldings}</p>
                <p className="text-[10px] text-muted">Holdings</p>
              </div>
              <div className="bg-background rounded p-2 text-center">
                <p className="text-lg font-bold font-data text-positive">₹{(ecasData.summary.totalMarketValue / 100000).toFixed(1)}L</p>
                <p className="text-[10px] text-muted">Market Value</p>
              </div>
              <div className="bg-background rounded p-2 text-center">
                <p className="text-lg font-bold font-data">₹{(ecasData.summary.totalCost / 100000).toFixed(1)}L</p>
                <p className="text-[10px] text-muted">Cost</p>
              </div>
              <div className="bg-background rounded p-2 text-center">
                <p className={`text-lg font-bold font-data ${ecasData.summary.totalGain > 0 ? 'text-positive' : 'text-negative'}`}>
                  {ecasData.summary.totalGain > 0 ? '+' : ''}₹{(Math.abs(ecasData.summary.totalGain) / 100000).toFixed(1)}L
                </p>
                <p className="text-[10px] text-muted">Gain ({ecasData.summary.totalGainPct > 0 ? '+' : ''}{ecasData.summary.totalGainPct?.toFixed(1)}%)</p>
              </div>
            </div>

            {/* Match status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-positive text-xs">● {ecasData.summary.matchedCount} matched</span>
              {ecasData.summary.unmatchedCount > 0 && (
                <span className="text-warning text-xs">● {ecasData.summary.unmatchedCount} unmatched (will be skipped)</span>
              )}
            </div>

            {/* Holdings Table */}
            <div className="overflow-x-auto mb-4 max-h-[300px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="bg-background text-[10px] text-muted uppercase">
                    <th className="px-2 py-1.5 text-left">Fund</th>
                    <th className="px-2 py-1.5 text-right">Units</th>
                    <th className="px-2 py-1.5 text-right">Cost</th>
                    <th className="px-2 py-1.5 text-right">Value</th>
                    <th className="px-2 py-1.5 text-right">Gain</th>
                    <th className="px-2 py-1.5 text-center">Txns</th>
                    <th className="px-2 py-1.5 text-center">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {ecasData.holdings.map((h, i) => (
                    <tr key={i} className="border-t border-border-subtle/30">
                      <td className="px-2 py-1.5">
                        <p className="truncate max-w-[200px] font-medium">{h.fundName || 'Unknown Fund'}</p>
                        <p className="text-[9px] text-muted">{h.amc} • {h.folio}</p>
                      </td>
                      <td className="px-2 py-1.5 text-right font-data">{h.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</td>
                      <td className="px-2 py-1.5 text-right font-data text-muted">₹{(h.costValue / 1000).toFixed(1)}k</td>
                      <td className="px-2 py-1.5 text-right font-data">₹{(h.marketValue / 1000).toFixed(1)}k</td>
                      <td className={`px-2 py-1.5 text-right font-data ${h.gain > 0 ? 'text-positive' : h.gain < 0 ? 'text-negative' : 'text-muted'}`}>
                        {h.gain !== 0 ? (<>{h.gain > 0 ? '+' : ''}₹{(Math.abs(h.gain) / 1000).toFixed(1)}k</>) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-center text-muted">{h.transactions}</td>
                      <td className="px-2 py-1.5 text-center">
                        {h.matched ? (
                          <span className="text-positive text-[10px]" title={h.matchedSchemeName}>✓</span>
                        ) : (
                          <span className="text-warning text-[10px]" title="No match in database">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setStep('upload'); setEcasData(null); setError(''); }} className="px-3 py-1.5 text-xs text-muted">Back</button>
              <button
                onClick={handleImport}
                disabled={!profileName.trim() || ecasData.summary.matchedCount === 0}
                className="px-4 py-1.5 text-xs font-mono bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-40 transition-colors"
              >
                Import {ecasData.summary.matchedCount} Holdings
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">Importing holdings...</p>
          </div>
        )}

        {step === 'done' && importResult && (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm text-positive font-medium mb-1">Portfolio imported successfully!</p>
            <p className="text-xs text-muted mb-4">{importResult.importedCount} of {importResult.totalHoldings} holdings imported to "{importResult.profileName}"</p>
            <button onClick={() => onImported(importResult.profileId)} className="px-4 py-2 text-xs font-mono bg-accent text-white rounded">View Portfolio</button>
          </div>
        )}
      </motion.div>
    </>
  );
}

function AnalysisSection({ analysis, holdings }) {
  const chartLayout = useChartLayout();
  const { sectorExposure, concentration } = analysis;

  return (
    <div className="space-y-6">
      <h3 className="font-mono font-bold text-sm">Portfolio Analysis</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Unique Stocks" value={concentration.totalStocks} format="integer" />
        <StatCard label="Top 10 Weight" value={concentration.top10Weight * 100} format="percent" />
        <StatCard label="Top 3 Sectors" value={sectorExposure.slice(0, 3).reduce((s, e) => s + e.weight, 0) * 100} format="percent" />
        <StatCard label="HHI Index" value={Math.round(concentration.hhi * 10000)} format="integer" />
      </div>
      {sectorExposure.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4" style={{ height: 320 }}>
          <h4 className="font-mono text-xs text-muted mb-2">Sector Exposure</h4>
          <Plot
            data={[{
              type: 'bar', orientation: 'h',
              y: sectorExposure.map((s) => s.sector).reverse(),
              x: sectorExposure.map((s) => s.weight * 100).reverse(),
              marker: { color: '#3b82f6' },
              hovertemplate: '%{y}: %{x:.1f}%<extra></extra>',
            }]}
            layout={{ ...chartLayout, margin: { l: 140, t: 4, r: 16, b: 30 }, xaxis: { ...chartLayout.xaxis, title: { text: 'Weight (%)', font: chartLayout.font } } }}
            config={defaultConfig} useResizeHandler style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
      {holdings.length >= 2 && <OverlapMatrix codes={holdings.map((h) => h.schemeCode)} />}
    </div>
  );
}
