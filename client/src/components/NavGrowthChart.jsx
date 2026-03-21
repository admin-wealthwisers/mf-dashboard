import { useState, useMemo, memo } from 'react';
import { useQueries } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer, { timeframeToDate } from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchNav } from '../lib/api';

export default memo(function NavGrowthChart({ codes, names }) {
  const chartLayout = useChartLayout();
  const [timeframe, setTimeframe] = useState('1Y');
  const from = timeframeToDate(timeframe);

  const queries = useQueries({
    queries: codes.map((code) => ({
      queryKey: ['nav', code, from],
      queryFn: () => fetchNav(code, { from }),
      staleTime: 60_000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error?.message;

  const traces = useMemo(() => {
    return queries
      .map((q, i) => {
        if (!q.data?.data?.length) return null;
        const navData = q.data.data;
        const baseNav = navData[0].nav;

        return {
          x: navData.map((d) => d.date),
          y: navData.map((d) => (d.nav / baseNav) * 100),
          type: 'scatter',
          mode: 'lines',
          name: names?.[i] || codes[i],
          line: { color: COLORS[i % COLORS.length], width: 1.5 },
          fill: codes.length === 1 ? 'tozeroy' : 'none',
          fillcolor: codes.length === 1
            ? COLORS[i % COLORS.length].replace(')', ', 0.08)').replace('rgb', 'rgba').replace('#', '')
            : undefined,
          hovertemplate: '%{y:.2f}<extra>%{fullData.name}</extra>',
        };
      })
      .filter(Boolean);
  }, [queries.map((q) => q.dataUpdatedAt).join(','), codes.join(',')]);

  // Fix fill color for hex colors
  const processedTraces = traces.map((t) => {
    if (t.fill === 'tozeroy' && t.line.color.startsWith('#')) {
      const hex = t.line.color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { ...t, fillcolor: `rgba(${r}, ${g}, ${b}, 0.08)` };
    }
    return t;
  });

  const layout = {
    ...chartLayout,
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'Growth (base 100)', font: { ...chartLayout.font, size: 10 } },
    },
    xaxis: {
      ...chartLayout.xaxis,
      type: 'date',
    },
    shapes: [
      {
        type: 'line',
        x0: 0, x1: 1, xref: 'paper',
        y0: 100, y1: 100,
        line: { color: 'rgba(229, 231, 235, 0.15)', width: 1, dash: 'dot' },
      },
    ],
  };

  return (
    <ChartContainer
      title="NAV Growth"
      subtitle={codes.length > 1 ? 'Normalized to base 100' : `Scheme ${codes[0]}`}
      isLoading={isLoading}
      error={error}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
    >
      {processedTraces.length === 0 && !isLoading ? (
        <div className="flex items-center justify-center h-full text-sm text-muted">
          No NAV data available for this period. Try selecting a longer timeframe.
        </div>
      ) : (
        <Plot
          data={processedTraces}
          layout={layout}
          config={defaultConfig}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </ChartContainer>
  );
});
