import { motion } from 'framer-motion';

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

function cellBg(weight) {
  if (weight == null || weight === 1) return '';
  // Scale from 0 to ~50% overlap → opacity 0.05 to 0.4
  const intensity = Math.min(weight * 0.8, 0.4);
  return `rgba(59, 130, 246, ${intensity})`;
}

export default function OverlapMatrix({ schemes, matrix }) {
  if (!schemes || schemes.length < 2 || !matrix) return null;

  return (
    <motion.div
      className="bg-card border border-border rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="font-mono font-bold text-sm text-foreground">Fund Overlap Matrix</h3>
        <p className="text-[11px] text-muted mt-0.5">Pairwise holding overlap by weight</p>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 text-muted font-medium" />
              {schemes.map((s) => (
                <th
                  key={s.scheme_code}
                  className="px-2 py-2 text-[10px] text-muted font-medium text-center max-w-[120px]"
                  title={s.scheme_name}
                >
                  {truncate(s.scheme_name, 18)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schemes.map((rowScheme, i) => (
              <tr key={rowScheme.scheme_code}>
                <td
                  className="px-2 py-2 text-[10px] text-muted font-medium max-w-[120px] truncate"
                  title={rowScheme.scheme_name}
                >
                  {truncate(rowScheme.scheme_name, 18)}
                </td>
                {matrix[i].map((cell, j) => (
                  <td
                    key={j}
                    className="px-2 py-2 text-center border border-border-subtle/30 rounded-sm"
                    style={{ backgroundColor: cellBg(cell.weight) }}
                  >
                    {i === j ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <div>
                        <div className="font-data text-foreground">
                          {(cell.weight * 100).toFixed(1)}%
                        </div>
                        <div className="text-[9px] text-muted">{cell.count} stocks</div>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
