import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const from = 0;
    const to = typeof target === 'number' ? target : parseFloat(target) || 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(from + (to - from) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

function MiniSparkline({ data, color = '#3b82f6', width = 80, height = 32 }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="opacity-40">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polygon points={areaPoints} fill={color} opacity="0.1" />
    </svg>
  );
}

export default function MetricCard({
  label,
  value,
  format = 'number',
  suffix = '',
  prefix = '',
  color = 'accent',
  sparklineData,
  sparklineColor,
  subtitle,
  index = 0,
}) {
  const colorMap = {
    accent: { border: 'border-l-accent', spark: '#3b82f6' },
    positive: { border: 'border-l-positive', spark: '#10b981' },
    negative: { border: 'border-l-negative', spark: '#ef4444' },
    warning: { border: 'border-l-warning', spark: '#f59e0b' },
  };

  const c = colorMap[color] || colorMap.accent;
  const animated = useCountUp(typeof value === 'number' ? value : null, 800);

  let displayValue;
  if (typeof value === 'number') {
    if (format === 'percent') {
      displayValue = `${prefix}${animated.toFixed(2)}${suffix || '%'}`;
    } else if (format === 'integer') {
      displayValue = `${prefix}${Math.round(animated).toLocaleString('en-IN')}${suffix}`;
    } else if (format === 'currency') {
      displayValue = `₹${animated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      displayValue = `${prefix}${animated.toFixed(2)}${suffix}`;
    }
  } else {
    displayValue = value || '—';
  }

  return (
    <motion.div
      className={`bg-card border border-border ${c.border} border-l-[3px] rounded-lg p-4 flex justify-between items-start gap-3 min-w-0`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08, ease: 'easeOut' }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5 truncate">
          {label}
        </p>
        <p className="font-mono font-bold text-xl text-foreground truncate">
          {displayValue}
        </p>
        {subtitle && (
          <p className="text-[11px] text-muted mt-1 line-clamp-2 leading-tight">{subtitle}</p>
        )}
      </div>
      {sparklineData && (
        <div className="shrink-0 mt-1">
          <MiniSparkline
            data={sparklineData}
            color={sparklineColor || c.spark}
          />
        </div>
      )}
    </motion.div>
  );
}
