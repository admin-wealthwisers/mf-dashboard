import { motion } from 'framer-motion';
import StatCard from './StatCard';

export default function MetricsQuadrant({ title, icon: Icon, metrics, index = 0 }) {
  return (
    <motion.div
      className="bg-card border border-border rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-accent" />}
        <h3 className="font-mono font-bold text-sm text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-0">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`px-4 py-3 ${
              i % 2 === 0 ? 'border-r border-border-subtle/30' : ''
            } ${i < metrics.length - 2 ? 'border-b border-border-subtle/30' : ''}`}
          >
            <p className="text-[10px] text-muted uppercase tracking-wide mb-1">{m.label}</p>
            <p className={`font-data text-sm ${m.color ? `text-${m.color}` : 'text-foreground'}`}>
              {m.value != null ? formatValue(m.value, m.format) : '—'}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function formatValue(value, format) {
  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(2)}%`;
    case 'number':
      return typeof value === 'number' ? value.toFixed(2) : value;
    case 'integer':
      return String(value);
    default:
      return String(value);
  }
}
