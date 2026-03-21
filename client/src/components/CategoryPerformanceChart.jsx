import { memo } from 'react';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';

export default memo(function CategoryPerformanceChart({ data, isLoading }) {
  const chartLayout = useChartLayout();
  if (!data?.length) {
    return (
      <ChartContainer
        title="Category Performance"
        subtitle="Avg 1Y return by category"
        isLoading={isLoading}
        showTimeframes={false}
      >
        <div className="flex items-center justify-center h-full text-sm text-muted">
          No category data available
        </div>
      </ChartContainer>
    );
  }

  const sorted = [...data].filter((d) => d.avgReturn != null).sort((a, b) => a.avgReturn - b.avgReturn);

  const trace = {
    y: sorted.map((d) => {
      // Truncate long category names
      const name = d.category.replace('Open Ended Schemes', '').trim() || d.category;
      return name.length > 30 ? name.slice(0, 28) + '...' : name;
    }),
    x: sorted.map((d) => d.avgReturn),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: sorted.map((d) => (d.avgReturn >= 0 ? '#10b981' : '#ef4444')),
      line: { width: 0 },
    },
    text: sorted.map((d) => `${d.avgReturn > 0 ? '+' : ''}${(d.avgReturn ?? 0).toFixed(1)}%`),
    textposition: 'outside',
    textfont: { ...chartLayout.font, size: 10 },
    hovertemplate: '%{y}: %{x:.2f}%<extra></extra>',
  };

  const layout = {
    ...chartLayout,
    margin: { ...chartLayout.margin, l: 160 },
    xaxis: {
      ...chartLayout.xaxis,
      title: { text: 'Avg 1Y Return (%)', font: { ...chartLayout.font, size: 10 } },
      ticksuffix: '%',
    },
    yaxis: {
      ...chartLayout.yaxis,
      automargin: true,
      tickfont: { ...chartLayout.font, size: 10 },
    },
    bargap: 0.3,
  };

  return (
    <ChartContainer
      title="Category Performance"
      subtitle="Avg 1Y return by fund category"
      showTimeframes={false}
    >
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
