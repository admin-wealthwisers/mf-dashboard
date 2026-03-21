import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import HelpButton from '../components/HelpButton';
import MetricCard from '../components/MetricCard';
import CategoryPerformanceChart from '../components/CategoryPerformanceChart';
import AUMDistributionChart from '../components/AUMDistributionChart';
import NavUpdatesTable from '../components/NavUpdatesTable';
import { fetchDashboard } from '../lib/api';

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

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 30_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-10 h-10 text-warning opacity-60" />
        <p className="text-sm text-muted">Failed to load dashboard data</p>
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
  const topPerf = d?.topPerformer;
  const worstPerf = d?.worstPerformer;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-mono font-bold text-lg mb-1">Dashboard</h1>
          <HelpButton helpId="dashboard" />
        </div>
        <p className="text-sm text-muted">Portfolio overview and market summary</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Schemes Tracked"
          value={d?.schemeCount ?? null}
          format="integer"
          color="accent"
          sparklineData={null}
          subtitle={d ? `${d.navCount.toLocaleString('en-IN')} NAV records` : ''}
          index={0}
        />
        <MetricCard
          label="Market Status"
          value={d ? (d.marketOpen ? 'OPEN' : 'CLOSED') : null}
          format="string"
          color={d?.marketOpen ? 'positive' : 'warning'}
          subtitle={d?.latestDate ? `Last update: ${formatDate(d.latestDate)}` : ''}
          index={1}
        />
        <MetricCard
          label="Top Performer (1Y Return)"
          value={topPerf?.return1Y ?? null}
          format="percent"
          prefix={topPerf?.return1Y > 0 ? '+' : ''}
          color="positive"
          sparklineData={null}
          subtitle={topPerf?.scheme_name || ''}
          index={2}
        />
        <MetricCard
          label="Worst Performer (1Y Return)"
          value={worstPerf?.return1Y ?? null}
          format="percent"
          prefix={worstPerf?.return1Y > 0 ? '+' : ''}
          color="negative"
          sparklineData={null}
          subtitle={worstPerf?.scheme_name || ''}
          index={3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CategoryPerformanceChart
          data={d?.categoryPerformance}
          isLoading={isLoading}
        />
        <AUMDistributionChart
          schemes={d?.schemes}
          isLoading={isLoading}
        />
      </div>

      {/* Data Table */}
      <NavUpdatesTable schemes={d?.schemes} />
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}
