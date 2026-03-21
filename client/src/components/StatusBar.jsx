import { useQuery } from '@tanstack/react-query';
import { fetchAdminStats } from '../lib/api';

export default function StatusBar() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    staleTime: 60_000,
  });

  const d = stats?.data;

  return (
    <footer className="h-7 bg-sidebar border-t border-border flex items-center justify-between px-4 text-[11px] font-mono text-muted">
      <div className="flex items-center gap-3">
        <span>{d ? d.schemes.toLocaleString('en-IN') : '—'} schemes</span>
        <span className="text-border">·</span>
        <span>{d ? d.navRecords.toLocaleString('en-IN') : '—'} NAV records</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="px-1.5 py-0.5 bg-background rounded-sm">SQLite</span>
        <span className="px-1.5 py-0.5 bg-background rounded-sm">Express</span>
        <span className="px-1.5 py-0.5 bg-background rounded-sm">React</span>
      </div>
    </footer>
  );
}
