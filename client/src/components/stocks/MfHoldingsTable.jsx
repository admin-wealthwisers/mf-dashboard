import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function MfHoldingsTable({ holdings }) {
  const navigate = useNavigate();

  if (!holdings?.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center text-sm text-muted">
        No mutual fund holdings data available
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="font-mono font-bold text-sm text-foreground">Mutual Fund Holdings</h3>
        <p className="text-[11px] text-muted mt-0.5">{holdings.length} funds hold this stock</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">Scheme</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">AMC</th>
              <th className="text-right px-4 py-2.5 text-[10px] text-muted uppercase tracking-wider font-medium">Weight</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, i) => (
              <motion.tr
                key={h.scheme_code}
                className="border-b border-border-subtle/50 hover:bg-card-hover cursor-pointer transition-colors"
                onClick={() => navigate(`/scorecard/${h.scheme_code}`)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
              >
                <td className="px-4 py-2.5 text-foreground">
                  <div className="truncate max-w-[300px]">{h.scheme_name}</div>
                </td>
                <td className="px-4 py-2.5 text-muted truncate max-w-[150px]">{h.amc}</td>
                <td className="px-4 py-2.5 text-right font-data text-foreground">
                  {h.weight != null ? `${Number(h.weight).toFixed(2)}%` : '—'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
