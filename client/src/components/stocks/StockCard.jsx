import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatNav, formatReturn, returnColor } from '../../lib/formatters';

export default function StockCard({ stock, index = 0 }) {
  const navigate = useNavigate();
  const s = stock;

  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-3.5 cursor-pointer hover:bg-card-hover hover:border-muted/30 transition-colors overflow-hidden"
      onClick={() => navigate(`/stocks/scorecard/${s.symbol}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.5), ease: 'easeOut' }}
    >
      {/* Symbol — bold identifier */}
      <p className="text-[13px] font-bold text-foreground leading-snug mb-0.5">
        {s.symbol}
      </p>
      {/* Company name — truncated */}
      <p className="text-[10px] text-muted truncate mb-2">{s.company_name}</p>

      {/* Sector badge */}
      {s.sector && (
        <span className="inline-block text-[9px] font-mono px-1.5 py-0.5 bg-background text-muted rounded-sm border border-border-subtle mb-2.5 truncate max-w-full">
          {s.sector}
        </span>
      )}

      {/* Bottom: Price + 1D% + 1Y% */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">Price</p>
          <p className="font-data text-[11px] text-foreground">{formatNav(s.close_price ?? s.price)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">1D</p>
          <p className={`font-data text-[11px] ${returnColor(s.change_pct_1d)}`}>
            {formatReturn(s.change_pct_1d)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-muted uppercase tracking-wider">1Y</p>
          <p className={`font-data text-[11px] ${returnColor(s.change_pct_1y)}`}>
            {formatReturn(s.change_pct_1y)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
