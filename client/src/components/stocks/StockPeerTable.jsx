import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatNav, formatReturn, returnColor } from '../../lib/formatters';

function formatMarketCap(value) {
  if (value == null) return '—';
  if (value >= 1e5) return `\u20B9${(value / 1e5).toFixed(1)}L Cr`;
  if (value >= 1e2) return `\u20B9${(value / 1e2).toFixed(1)}K Cr`;
  return `\u20B9${Number(value).toFixed(1)} Cr`;
}

export default function StockPeerTable({ peers, currentSymbol }) {
  const navigate = useNavigate();

  if (!peers?.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted">
        No peer data available
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="font-mono font-bold text-sm text-foreground">Sector Peers</h3>
        <p className="text-[11px] text-muted mt-0.5">{peers.length} peers in same sector</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">Symbol</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">Name</th>
              <th className="text-right px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">Price</th>
              <th className="text-right px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">1D %</th>
              <th className="text-right px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">PE</th>
              <th className="text-right px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p, i) => {
              const isCurrent = p.symbol === currentSymbol;
              return (
                <motion.tr
                  key={p.symbol}
                  className={`border-b border-border-subtle/50 hover:bg-card-hover cursor-pointer transition-colors ${
                    isCurrent ? 'bg-accent/5 border-l-2 border-l-accent' : ''
                  }`}
                  onClick={() => navigate(`/stocks/scorecard/${p.symbol}`)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                >
                  <td className="px-4 py-2.5 font-bold text-foreground">
                    {p.symbol}
                    {isCurrent && (
                      <span className="ml-1.5 text-[9px] text-accent font-normal">(current)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted truncate max-w-[200px]">{p.company_name}</td>
                  <td className="px-4 py-2.5 text-right font-data text-foreground">
                    {formatNav(p.close_price ?? p.price)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-data ${returnColor(p.change_pct_1d)}`}>
                    {formatReturn(p.change_pct_1d)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-data text-foreground">
                    {p.pe_ratio != null ? Number(p.pe_ratio).toFixed(1) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-data text-foreground">
                    {formatMarketCap(p.market_cap)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
