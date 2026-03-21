import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BREAKDOWN_LABELS = {
  performance: 'Performance',
  consistency: 'Consistency',
  risk: 'Risk',
  diversification: 'Diversification',
};

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
  if (score < 30) return 'Poor';
  if (score < 60) return 'Below Average';
  if (score < 80) return 'Good';
  return 'Excellent';
}

export default function IntelligenceScoreGauge({ score, breakdown }) {
  const [displayScore, setDisplayScore] = useState(0);

  // Animate counter
  useEffect(() => {
    if (score == null) return;
    const duration = 800;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  // SVG arc config
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degree arc
  const offset = arcLength - (arcLength * (score || 0)) / 100;

  if (score == null) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-40 h-40 rounded-full bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform rotate-[135deg]"
        >
          {/* Background arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: arcLength }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-data text-3xl font-bold"
            style={{ color: scoreColor(score) }}
          >
            {displayScore}
          </span>
          <span className="text-[10px] text-muted mt-0.5">/ 100</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-mono text-muted">Intelligence Score</p>
        <p className="text-[10px] font-mono mt-0.5" style={{ color: scoreColor(score) }}>
          {scoreLabel(score)}
        </p>
      </div>

      {/* Breakdown bars */}
      {breakdown && (
        <div className="w-full max-w-[280px] space-y-2.5">
          {Object.entries(breakdown).map(([key, { score: s, weight }]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted">
                  {BREAKDOWN_LABELS[key] || key}{' '}
                  <span className="text-muted/60">({(weight * 100).toFixed(0)}%)</span>
                </span>
                <span className="font-data text-foreground">{s}</span>
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${scoreColorClass(s)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${s}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
