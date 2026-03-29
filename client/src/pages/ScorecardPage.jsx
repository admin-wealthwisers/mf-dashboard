import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Shield, PieChart, ArrowLeft, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import FundSelector from '../components/FundSelector';
import IntelligenceScoreGauge from '../components/IntelligenceScoreGauge';
import MetricsQuadrant from '../components/MetricsQuadrant';
import RollingReturnsChart from '../components/RollingReturnsChart';
import DrawdownChart from '../components/DrawdownChart';
import ScorecardNavChart from '../components/ScorecardNavChart';
import ScorecardSectorChart from '../components/ScorecardSectorChart';
import AISummary from '../components/AISummary';
import FundDNAChart from '../components/FundDNAChart';
import ConsistencyTimeline from '../components/ConsistencyTimeline';
import DownsideProtectionCard from '../components/DownsideProtectionCard';
import { fetchSchemes, fetchScorecard, fetchLatestNav } from '../lib/api';
import HelpButton from '../components/HelpButton';

function ShareButton({ code, schemeName }) {
  const [copied, setCopied] = useState(false);
  const url = `https://mfanalytics.in/scorecard/${code}`;
  const handleShare = async () => {
    const text = `Check out the analysis for ${schemeName || 'this fund'} on Intelligent Market Analytics`;
    if (navigator.share) {
      try { await navigator.share({ title: schemeName, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handleShare}
      className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors"
      title="Share this scorecard"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}

export default function ScorecardPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const { data: schemesData } = useQuery({
    queryKey: ['schemes'],
    queryFn: () => fetchSchemes(),
    staleTime: 60_000,
  });
  const schemes = schemesData?.data || [];
  const selectedCodes = useMemo(() => new Set(code ? [code] : []), [code]);

  const { data: scorecardData, isLoading } = useQuery({
    queryKey: ['scorecard', code],
    queryFn: () => fetchScorecard(code),
    staleTime: 30_000,
    enabled: !!code,
  });

  const { data: latestNavData } = useQuery({
    queryKey: ['latestNav', code],
    queryFn: () => fetchLatestNav(code),
    staleTime: 30_000,
    enabled: !!code,
  });

  const result = scorecardData?.data;
  const latestNav = latestNavData?.data;

  const handleSelectFund = (scheme) => {
    navigate(`/scorecard/${scheme.scheme_code}`);
  };

  // No code: landing state
  if (!code) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-lg mb-0.5">Fund Scorecard</h1>
            <HelpButton helpId="scorecard" />
          </div>
          <p className="text-xs text-muted">Intelligence-driven fund analysis and ratings</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-sm text-muted">Select a fund to view its scorecard</p>
          <FundSelector
            schemes={schemes}
            selectedCodes={selectedCodes}
            onSelect={handleSelectFund}
            buttonLabel="Select Fund"
          />
        </div>
      </div>
    );
  }

  const performanceMetrics = result
    ? [
        { label: '1Y CAGR', value: result.performance.cagr1Y, format: 'percent' },
        { label: '3Y CAGR', value: result.performance.cagr3Y, format: 'percent' },
        { label: '5Y CAGR', value: result.performance.cagr5Y, format: 'percent' },
        { label: 'Since Inception', value: result.performance.cagrSinceInception, format: 'percent' },
      ]
    : [];

  const riskMetrics = result
    ? [
        { label: 'Volatility', value: result.risk.volatility, format: 'percent' },
        { label: 'Sharpe Ratio', value: result.risk.sharpe, format: 'number' },
        { label: 'Max Drawdown', value: result.risk.maxDrawdown, format: 'percent', color: 'negative' },
        { label: 'Sortino Ratio', value: result.risk.sortino, format: 'number' },
      ]
    : [];

  const portfolioMetrics = result
    ? [
        { label: 'Holdings', value: result.portfolio.holdingsCount, format: 'integer' },
        { label: 'Top 10 Conc.', value: result.portfolio.top10Concentration, format: 'percent' },
        { label: 'Sector Div.', value: result.portfolio.sectorDiversificationScore, format: 'number' },
      ]
    : [];

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      {/* Share button removed */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/scorecard')}
              className="p-1 text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-mono font-bold text-lg truncate">
              {result?.scheme?.scheme_name || 'Loading...'}
            </h1>
            <HelpButton helpId="scorecard" />
          </div>
          {result?.scheme && (
            <div className="flex items-center gap-2 ml-8">
              <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded font-mono">
                {result.scheme.amc}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-background text-muted rounded font-mono">
                {result.scheme.category}
              </span>
              {latestNav && (
                <span className="text-[10px] font-data text-foreground">
                  NAV: ₹{latestNav.nav?.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
        <FundSelector
          schemes={schemes}
          selectedCodes={selectedCodes}
          onSelect={handleSelectFund}
          buttonLabel="Switch Fund"
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex justify-center">
            <div className="w-40 h-40 rounded-full bg-card animate-pulse" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Hero: Score + Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Intelligence Score */}
              <div className="lg:col-span-1 bg-card border border-border rounded-lg p-6 flex items-center justify-center">
                <IntelligenceScoreGauge
                  score={result.intelligenceScore.overall}
                  breakdown={result.intelligenceScore.breakdown}
                />
              </div>

              {/* Metrics Quadrants + Downside Protection */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricsQuadrant
                  title="Performance"
                  icon={TrendingUp}
                  metrics={performanceMetrics}
                  index={0}
                />
                <MetricsQuadrant
                  title="Risk"
                  icon={Shield}
                  metrics={riskMetrics}
                  index={1}
                />
                <MetricsQuadrant
                  title="Portfolio Structure"
                  icon={PieChart}
                  metrics={portfolioMetrics}
                  index={2}
                />
                <DownsideProtectionCard
                  data={result.downsideProtection}
                  index={3}
                />
              </div>
            </div>

            {/* Fund DNA */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <FundDNAChart code={code} />
              <ConsistencyTimeline code={code} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ScorecardNavChart code={code} />
              <RollingReturnsChart code={code} />
              <DrawdownChart code={code} />
              <ScorecardSectorChart code={code} />
            </div>

            {/* AI Summary */}
            <AISummary code={code} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
