import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import MetricCard from '../../components/MetricCard';
import { fetchStockDashboard } from '../../lib/api';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-36 bg-card rounded animate-pulse" />
        <div className="h-4 w-64 bg-card rounded animate-pulse mt-1" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-[360px] bg-card border border-border rounded-lg animate-pulse" />
        <div className="h-[360px] bg-card border border-border rounded-lg animate-pulse" />
      </div>
      <div className="h-[300px] bg-card border border-border rounded-lg animate-pulse" />
    </div>
  );
}

function StockCard({ stock, type = 'gainer', index = 0 }) {
  const isGainer = type === 'gainer';
  return (
    <motion.div
      className="flex items-center justify-between px-3 py-2.5 bg-card border border-border rounded-lg hover:bg-card-hover transition-colors cursor-pointer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={() => window.location.href = `/stocks/scorecard/${stock.symbol}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{stock.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-accent">{stock.symbol}</span>
          <span className="text-[10px] text-muted">{stock.sector}</span>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className="text-xs font-data text-foreground">
          {stock.close != null ? `₹${Number(stock.close).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
        </p>
        <p className={`text-[11px] font-data flex items-center justify-end gap-0.5 ${isGainer ? 'text-positive' : 'text-negative'}`}>
          {isGainer ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {stock.change_pct != null ? `${stock.change_pct > 0 ? '+' : ''}${stock.change_pct.toFixed(2)}%` : '—'}
        </p>
      </div>
    </motion.div>
  );
}

function SectorHeatmap({ sectors }) {
  if (!sectors || sectors.length === 0) return null;

  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.avgChangePct)), 0.01);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-mono font-bold text-sm text-foreground mb-3">Sector Performance</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sectors.map((s) => {
          const intensity = Math.min(Math.abs(s.avgChangePct) / maxAbs, 1);
          const isPositive = s.avgChangePct >= 0;
          const bg = isPositive
            ? `rgba(16, 185, 129, ${0.1 + intensity * 0.3})`
            : `rgba(239, 68, 68, ${0.1 + intensity * 0.3})`;
          return (
            <div
              key={s.sector}
              className="rounded-lg p-2.5 border border-border-subtle"
              style={{ backgroundColor: bg }}
            >
              <p className="text-[10px] text-muted truncate">{s.sector}</p>
              <p className={`text-sm font-data font-bold ${isPositive ? 'text-positive' : 'text-negative'}`}>
                {isPositive ? '+' : ''}{s.avgChangePct.toFixed(2)}%
              </p>
              <p className="text-[9px] text-muted">{s.count} stocks</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StockDashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stock-dashboard'],
    queryFn: fetchStockDashboard,
    staleTime: 30_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-10 h-10 text-warning opacity-60" />
        <p className="text-sm text-muted">Failed to load stock dashboard</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-accent text-white rounded hover:bg-accent/90 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const d = data?.data;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div>
        <h1 className="font-mono font-bold text-lg mb-1">Stock Market</h1>
        <p className="text-sm text-muted">Market overview and sector performance</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Stocks"
          value={d?.totalStocks ?? null}
          format="integer"
          color="accent"
          sparklineData={null}
          subtitle="Tracked in database"
          index={0}
        />
        <MetricCard
          label="Advancing"
          value={d?.advancing ?? null}
          format="integer"
          color="positive"
          sparklineData={null}
          subtitle="Stocks with positive change"
          index={1}
        />
        <MetricCard
          label="Declining"
          value={d?.declining ?? null}
          format="integer"
          color="negative"
          sparklineData={null}
          subtitle="Stocks with negative change"
          index={2}
        />
        <MetricCard
          label="Advance/Decline"
          value={d && d.declining > 0 ? (d.advancing / d.declining).toFixed(2) : d?.advancing ?? null}
          format="number"
          color={d && d.advancing > d.declining ? 'positive' : 'negative'}
          sparklineData={null}
          subtitle="Market breadth ratio"
          index={3}
        />
      </div>

      {/* Top Gainers & Losers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-positive" />
            <h3 className="font-mono font-bold text-sm text-foreground">Top Gainers</h3>
          </div>
          <div className="space-y-1.5">
            {(d?.gainers || []).map((stock, i) => (
              <StockCard key={stock.symbol} stock={stock} type="gainer" index={i} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-negative" />
            <h3 className="font-mono font-bold text-sm text-foreground">Top Losers</h3>
          </div>
          <div className="space-y-1.5">
            {(d?.losers || []).map((stock, i) => (
              <StockCard key={stock.symbol} stock={stock} type="loser" index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Sector Heatmap */}
      <SectorHeatmap sectors={d?.sectorPerformance} />
    </motion.div>
  );
}
