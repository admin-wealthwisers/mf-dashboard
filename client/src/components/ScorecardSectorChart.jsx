import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchSectorBreakdown } from '../lib/api';

export default memo(function ScorecardSectorChart({ code }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sector', code],
    queryFn: () => fetchSectorBreakdown(code),
    staleTime: 60_000,
    enabled: !!code,
  });

  const chartLayout = useChartLayout();
  const sectors = data?.data || [];

  const pieTrace = useMemo(() => {
    if (!sectors.length) return null;
    return {
      labels: sectors.map((s) => s.sector || 'Other'),
      values: sectors.map((s) => s.total_weight * 100),
      type: 'pie',
      hole: 0.45,
      marker: {
        colors: sectors.map((_, i) => COLORS[i % COLORS.length]),
        line: { width: 0 },
      },
      textinfo: 'percent',
      textposition: 'outside',
      textfont: { ...chartLayout.font, size: 9 },
      hovertemplate: '%{label}<br>%{value:.1f}%<extra></extra>',
      showlegend: false,
    };
  }, [sectors]);

  const layout = {
    ...chartLayout,
    margin: { t: 8, r: 8, b: 8, l: 8 },
    showlegend: false,
  };

  const isEmpty = !isLoading && sectors.length === 0;

  return (
    <ChartContainer
      title="Sector Allocation"
      subtitle="Portfolio sector breakdown"
      isLoading={isLoading}
      error={error?.message}
      showTimeframes={false}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center h-full text-sm text-muted">
          No sector data available
        </div>
      ) : (
        <div className="grid grid-cols-2 h-full">
          {/* Pie chart */}
          <div className="flex items-center justify-center">
            {pieTrace && (
              <Plot
                data={[pieTrace]}
                layout={layout}
                config={defaultConfig}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
          {/* Table */}
          <div className="overflow-y-auto pr-2 py-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-muted uppercase">
                  <th className="text-left py-1 px-1 font-medium">Sector</th>
                  <th className="text-right py-1 px-1 font-medium">Weight</th>
                  <th className="text-right py-1 px-1 font-medium">Stocks</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s, i) => (
                  <tr key={s.sector || i} className="border-t border-border-subtle/30">
                    <td className="py-1.5 px-1 text-foreground flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate">{s.sector || 'Other'}</span>
                    </td>
                    <td className="py-1.5 px-1 text-right font-data text-foreground">
                      {(s.total_weight * 100).toFixed(1)}%
                    </td>
                    <td className="py-1.5 px-1 text-right font-data text-muted">
                      {s.holding_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ChartContainer>
  );
});
