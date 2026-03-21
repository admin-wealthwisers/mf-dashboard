import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import StatCard from '../components/StatCard';
import NavGrowthChart from '../components/NavGrowthChart';
import RollingReturnsChart from '../components/RollingReturnsChart';
import DrawdownChart from '../components/DrawdownChart';
import SectorExposureChart from '../components/SectorExposureChart';
import TopHoldingsChart from '../components/TopHoldingsChart';
import HoldingsTable from '../components/HoldingsTable';
import { fetchScheme, fetchLatestNav, fetchRiskMetrics, fetchHoldings } from '../lib/api';
import HelpButton from '../components/HelpButton';

export default function SchemeDetailPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const { data: schemeData, isLoading: schemeLoading, error: schemeError, refetch } = useQuery({
    queryKey: ['scheme', code],
    queryFn: () => fetchScheme(code),
    staleTime: 60_000,
  });

  const { data: navData, isLoading: navLoading } = useQuery({
    queryKey: ['latestNav', code],
    queryFn: () => fetchLatestNav(code),
    staleTime: 30_000,
  });

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ['risk', code],
    queryFn: () => fetchRiskMetrics(code),
    staleTime: 60_000,
  });

  const { data: holdingsData } = useQuery({
    queryKey: ['holdings', code],
    queryFn: () => fetchHoldings(code),
    staleTime: 60_000,
  });

  const scheme = schemeData?.data;
  const nav = navData?.data;
  const risk = riskData?.data;
  const holdings = holdingsData?.data || [];

  if (schemeError) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-warning opacity-60" />
          <p className="text-sm text-muted">Failed to load scheme details</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-accent text-white rounded hover:bg-accent/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (schemeLoading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-12 bg-card rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-7 w-96 bg-card rounded animate-pulse" />
          <div className="h-4 w-64 bg-card rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[72px] bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[360px] bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* Header */}
      {scheme ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-mono font-bold text-xl text-foreground">
              {scheme.scheme_name}
            </h1>
            <HelpButton helpId="scheme-detail" />
          </div>
          <div className="flex flex-wrap gap-2">
            {scheme.amc && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-accent/10 text-accent rounded-sm border border-accent/20">
                {scheme.amc}
              </span>
            )}
            {scheme.category && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-background text-muted rounded-sm border border-border">
                {scheme.category}
              </span>
            )}
            {scheme.sub_category && scheme.sub_category !== scheme.category && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-background text-muted rounded-sm border border-border">
                {scheme.sub_category}
              </span>
            )}
            {scheme.scheme_type && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-background text-muted rounded-sm border border-border">
                {scheme.scheme_type}
              </span>
            )}
          </div>
        </motion.div>
      ) : null}

      {/* Metric Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Latest NAV"
          value={nav?.nav}
          format="currency"
          color="foreground"
          index={0}
        />
        <StatCard
          label="1D Change"
          value={nav?.changePct}
          format="percent"
          prefix={nav?.changePct > 0 ? '+' : ''}
          color={nav?.changePct > 0 ? 'positive' : nav?.changePct < 0 ? 'negative' : 'muted'}
          index={1}
        />
        <StatCard
          label="CAGR"
          value={risk?.cagr != null ? risk.cagr * 100 : null}
          format="percent"
          prefix={risk?.cagr > 0 ? '+' : ''}
          color={risk?.cagr > 0 ? 'positive' : risk?.cagr < 0 ? 'negative' : 'muted'}
          index={2}
        />
        <StatCard
          label="Volatility"
          value={risk?.volatility != null ? risk.volatility * 100 : null}
          format="percent"
          color="warning"
          index={3}
        />
        <StatCard
          label="Sharpe Ratio"
          value={risk?.sharpe}
          format="number"
          color={risk?.sharpe > 1 ? 'positive' : risk?.sharpe > 0 ? 'accent' : 'negative'}
          index={4}
        />
        <StatCard
          label="Max Drawdown"
          value={risk?.maxDrawdown != null ? risk.maxDrawdown * 100 : null}
          format="percent"
          color="negative"
          index={5}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <NavGrowthChart codes={[code]} names={[scheme?.scheme_name || code]} />
        <RollingReturnsChart code={code} />
        <DrawdownChart code={code} />
        <SectorExposureChart code={code} />
        <TopHoldingsChart code={code} />
      </div>

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings} />
    </div>
  );
}
