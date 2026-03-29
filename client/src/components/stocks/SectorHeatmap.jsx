import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import ChartContainer from '../ChartContainer';
import { defaultConfig } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';

export default memo(function SectorHeatmap({ sectors }) {
  const chartLayout = useChartLayout();

  const trace = useMemo(() => {
    if (!sectors?.length) return null;

    const labels = sectors.map((s) => s.sector);
    const parents = sectors.map(() => '');
    const values = sectors.map((s) => s.market_cap || s.count || 1);
    const colors = sectors.map((s) => s.change_pct ?? 0);
    const text = sectors.map(
      (s) => `${s.sector}<br>${(s.change_pct ?? 0) >= 0 ? '+' : ''}${(s.change_pct ?? 0).toFixed(2)}%`
    );

    return {
      type: 'treemap',
      labels,
      parents,
      values,
      text,
      textinfo: 'text',
      hovertemplate: '%{label}<br>Change: %{color:.2f}%<br>Stocks: %{customdata}<extra></extra>',
      customdata: sectors.map((s) => s.count ?? 0),
      marker: {
        colors,
        colorscale: [
          [0, '#ef4444'],
          [0.5, '#374151'],
          [1, '#10b981'],
        ],
        cmid: 0,
        showscale: true,
        colorbar: {
          title: { text: 'Change %', font: { ...chartLayout.font, size: 9 } },
          thickness: 12,
          len: 0.6,
          tickfont: { ...chartLayout.font, size: 9 },
        },
      },
      textfont: { ...chartLayout.font, size: 12 },
    };
  }, [sectors, chartLayout.font]);

  const layout = {
    ...chartLayout,
    margin: { t: 8, r: 8, b: 8, l: 8 },
  };

  if (!trace) {
    return (
      <ChartContainer title="Sector Heatmap" showTimeframes={false}>
        <div className="flex items-center justify-center h-full text-sm text-muted">
          No data available
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="Sector Heatmap" subtitle="By performance" showTimeframes={false}>
      <Plot
        data={[trace]}
        layout={layout}
        config={defaultConfig}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </ChartContainer>
  );
});
