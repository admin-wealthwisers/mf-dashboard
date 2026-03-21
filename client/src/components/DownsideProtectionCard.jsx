import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

function scoreColor(score) {
  if (score < 30) return 'var(--negative)';
  if (score < 60) return 'var(--warning)';
  if (score < 80) return 'var(--accent)';
  return 'var(--positive)';
}

function scoreColorClass(score) {
  if (score < 30) return 'bg-negative';
  if (score < 60) return 'bg-warning';
  if (score < 80) return 'bg-accent';
  return 'bg-positive';
}

function scoreLabel(score) {
  if (score < 30) return 'Weak';
  if (score < 60) return 'Moderate';
  if (score < 80) return 'Strong';
  return 'Excellent';
}

export default function DownsideProtectionCard({ data, index = 0 }) {
  if (!data) return null;

  const metrics = [
    {
      label: 'Semi-Deviation',
      value: data.semiDeviation !== null ? `${(data.semiDeviation * 100).toFixed(1)}%` : '—',
    },
    {
      label: 'Ulcer Index',
      value: data.ulcerIndex !== null ? data.ulcerIndex.toFixed(4) : '—',
    },
    {
      label: 'Max DD Duration',
      value: data.maxDrawdownDuration ? `${data.maxDrawdownDuration} days` : '—',
    },
    {
      label: 'Sortino Ratio',
      value: data.sortino !== null ? data.sortino.toFixed(2) : '—',
    },
  ];

  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-accent" />
        <span className="text-[11px] text-muted uppercase tracking-wider font-mono">
          Downside Protection
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span
          className="font-data text-2xl font-bold"
          style={{ color: scoreColor(data.score) }}
        >
          {data.score}
        </span>
        <div>
          <span className="text-[10px] text-muted">/ 100</span>
          <p
            className="text-[10px] font-mono"
            style={{ color: scoreColor(data.score) }}
          >
            {scoreLabel(data.score)}
          </p>
        </div>
      </div>

      <div className="h-1.5 bg-background rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${scoreColorClass(data.score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${data.score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <div className="space-y-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between text-[10px]">
            <span className="text-muted">{m.label}</span>
            <span className="font-data text-foreground">{m.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
