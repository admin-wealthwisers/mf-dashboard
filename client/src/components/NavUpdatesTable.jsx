import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import { formatNav, formatReturn, returnColor } from '../lib/formatters';

const COLUMNS = [
  { key: 'scheme_name', label: 'Scheme', align: 'left', sortable: true },
  { key: 'nav', label: 'Latest NAV', align: 'right', sortable: true },
  { key: 'changePct', label: '1D Change', align: 'right', sortable: true },
  { key: 'return1Y', label: '1Y Return', align: 'right', sortable: true },
  { key: 'category', label: 'Category', align: 'left', sortable: true },
];

export default function NavUpdatesTable({ schemes }) {
  const [sortKey, setSortKey] = useState('changePct');
  const [sortDir, setSortDir] = useState('desc');
  const navigate = useNavigate();

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...(schemes || [])].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  if (!schemes || schemes.length === 0) {
    return (
      <motion.div
        className="bg-card border border-border rounded-lg p-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Inbox className="w-8 h-8 text-muted/30" />
          <p className="text-sm text-muted">No NAV data available yet</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-card border border-border rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="font-mono font-bold text-sm text-foreground">Recent NAV Updates</h3>
        <p className="text-[11px] text-muted mt-0.5">Click any row to view scheme details</p>
      </div>

      {/* Table */}
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
            {sorted.map((s) => (
              <tr
                key={s.scheme_code}
                onClick={() => navigate(`/scorecard/${s.scheme_code}`)}
                className="border-b border-border-subtle/50 cursor-pointer hover:bg-card-hover transition-colors"
              >
                <td className="px-4 py-2.5 text-foreground max-w-[300px] truncate">
                  {s.scheme_name}
                </td>
                <td className="px-4 py-2.5 text-right font-data">
                  {formatNav(s.nav)}
                </td>
                <td className={`px-4 py-2.5 text-right font-data ${returnColor(s.changePct)}`}>
                  {formatReturn(s.changePct)}
                </td>
                <td className={`px-4 py-2.5 text-right font-data ${returnColor(s.return1Y)}`}>
                  {formatReturn(s.return1Y)}
                </td>
                <td className="px-4 py-2.5 text-muted text-xs truncate max-w-[180px]">
                  {s.sub_category || s.category || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
