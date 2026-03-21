import { motion } from 'framer-motion';
import { formatNav } from '../lib/formatters';

const COLOR_MAP = {
  accent: 'text-accent',
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
  muted: 'text-muted',
  foreground: 'text-foreground',
};

export default function StatCard({ label, value, format = 'number', prefix = '', suffix = '', color = 'foreground', index = 0 }) {
  const isLoading = value === undefined || value === null;
  const textColor = COLOR_MAP[color] || COLOR_MAP.foreground;

  let displayValue = '—';
  if (!isLoading) {
    if (format === 'percent') {
      displayValue = `${prefix}${Number(value).toFixed(2)}%`;
    } else if (format === 'currency') {
      displayValue = formatNav(value);
    } else if (format === 'number') {
      displayValue = `${prefix}${Number(value).toFixed(2)}${suffix}`;
    } else {
      displayValue = `${prefix}${value}${suffix}`;
    }
  }

  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: 'easeOut' }}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted mb-1">{label}</p>
      {isLoading ? (
        <div className="h-7 w-20 bg-background rounded animate-pulse" />
      ) : (
        <p className={`font-data text-lg font-bold ${textColor}`}>{displayValue}</p>
      )}
    </motion.div>
  );
}
