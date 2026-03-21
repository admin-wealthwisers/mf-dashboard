import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const COLUMNS = [
  { key: 'name', label: 'Name', align: 'left', sortable: true },
  { key: 'isin', label: 'ISIN', align: 'left', sortable: false },
  { key: 'sector', label: 'Sector', align: 'left', sortable: true },
  { key: 'weight', label: 'Weight %', align: 'right', sortable: true },
  { key: 'asset_class', label: 'Asset Class', align: 'left', sortable: true },
];

export default function HoldingsTable({ holdings }) {
  const [sortKey, setSortKey] = useState('weight');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...(holdings || [])].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (!holdings || holdings.length === 0) {
    return (
      <motion.div
        className="bg-card border border-border rounded-lg p-8 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <p className="text-sm text-muted">No holdings data available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-card border border-border rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="font-mono font-bold text-sm text-foreground">Portfolio Holdings</h3>
        <p className="text-[11px] text-muted mt-0.5">{sorted.length} instruments</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted font-medium ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : col.sortable ? (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((h, i) => (
              <tr
                key={h.isin || i}
                className="border-b border-border-subtle/50 hover:bg-card-hover transition-colors"
              >
                <td className="px-4 py-2.5 text-foreground max-w-[250px] truncate">
                  {h.name || '—'}
                </td>
                <td className="px-4 py-2.5 font-data text-muted text-xs">
                  {h.isin || '—'}
                </td>
                <td className="px-4 py-2.5 text-muted text-xs truncate max-w-[150px]">
                  {h.sector || '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-data text-foreground">
                  {h.weight != null ? `${h.weight.toFixed(2)}%` : '—'}
                </td>
                <td className="px-4 py-2.5 text-muted text-xs">
                  {h.asset_class || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
