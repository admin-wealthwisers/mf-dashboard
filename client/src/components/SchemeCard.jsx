import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatNav, formatReturn, returnColor } from '../lib/formatters';

export default function SchemeCard({ scheme, index = 0 }) {
  const navigate = useNavigate();
  const s = scheme;

  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-3.5 cursor-pointer hover:bg-card-hover hover:border-muted/30 transition-colors overflow-hidden"
      onClick={() => navigate(`/scorecard/${s.scheme_code}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.5), ease: 'easeOut' }}
    >
      {/* Fund name — full width, 2 lines max */}
      <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 mb-0.5">
        {s.scheme_name}
      </p>
      <p className="text-[10px] text-muted truncate mb-2">{s.amc}</p>

      {/* Category badge */}
      {s.sub_category && (
        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 bg-background text-muted rounded-sm border border-border-subtle mb-2.5 truncate max-w-full">
          {s.sub_category.replace(/^(Equity Scheme|Debt Scheme|Hybrid Scheme|Other Scheme|Solution Oriented Scheme)\s*-\s*/i, '')}
        </span>
      )}

      {/* Bottom: NAV + 1D + 1Y — use tabular layout */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">NAV</p>
          <p className="font-data text-[11px] text-foreground">{formatNav(s.nav)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">1D</p>
          <p className={`font-data text-[11px] ${returnColor(s.changePct)}`}>
            {formatReturn(s.changePct)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">1Y</p>
          <p className={`font-data text-[11px] ${returnColor(s.return1Y)}`}>
            {formatReturn(s.return1Y)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
