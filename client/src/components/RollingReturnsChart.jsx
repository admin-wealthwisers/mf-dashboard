import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchRollingReturns } from '../lib/api';

const LINE_STYLES = {
  '1Y': { dash: 'solid', width: 1.5 },
  '3Y': { dash: 'dash', width: 1.5 },
  '5Y': { dash: 'dot', width: 1.5 },
};

export default memo(function RollingReturnsChart({ code }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rolling', code],
    queryFn: () => fetchRollingReturns(code),
    staleTime: 60_000,
    enabled: !!code,
  });

  const chartLayout = useChartLayout();
  const rolling = data?.data || {};

  const traces = Object.entries(rolling).map(([period, points], i) => ({
    x: points.map((p) => p.date),
    y: points.map((p) => p.return * 100),
    type: 'scatter',
    mode: 'lines',
    name: `${period} Return`,
    line: {
      color: COLORS[i % COLORS.length],
      ...LINE_STYLES[period],
    },
    hovertemplate: `${period}: %{y:.2f}%<extra></extra>`,
  }));

  const layout = {
    ...chartLayout,
    xaxis: {
      ...chartLayout.xaxis,
      type: 'date',
    },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'Annualized Return (%)', font: { ...chartLayout.font, size: 10 } },
      ticksuffix: '%',
    },
    shapes: [
      {
        type: 'line',
        x0: 0, x1: 1, xref: 'paper',
        y0: 0, y1: 0,
        line: { color: 'rgba(229, 231, 235, 0.15)', width: 1, dash: 'dot' },
      },
    ],
  };

  return (
    <ChartContainer
      title="Rolling Returns"
      subtitle="Annualized 1Y / 3Y / 5Y"
      isLoading={isLoading}
      error={error?.message}
      showTimeframes={false}
    >
      <Plot
        data={traces}
        layout={layout}
        config={defaultConfig}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </ChartContainer>
  );
});
