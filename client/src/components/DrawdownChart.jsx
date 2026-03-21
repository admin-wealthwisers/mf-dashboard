import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer, { timeframeToDate } from './ChartContainer';
import { defaultConfig } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchDrawdown } from '../lib/api';

export default memo(function DrawdownChart({ code }) {
  const chartLayout = useChartLayout();
  const [timeframe, setTimeframe] = useState('3Y');
  const from = timeframeToDate(timeframe);

  const { data, isLoading, error } = useQuery({
    queryKey: ['drawdown', code],
    queryFn: () => fetchDrawdown(code),
    staleTime: 60_000,
    enabled: !!code,
  });

  const series = data?.data || [];

  // Filter by timeframe
  const filtered = from ? series.filter((d) => d.date >= from) : series;

  const trace = {
    x: filtered.map((d) => d.date),
    y: filtered.map((d) => d.drawdown * 100),
    type: 'scatter',
    mode: 'lines',
    name: 'Drawdown',
    line: { color: '#ef4444', width: 1.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(239, 68, 68, 0.15)',
    hovertemplate: '%{x|%d %b %Y}<br>Drawdown: %{y:.2f}%<extra></extra>',
  };

  const layout = {
    ...chartLayout,
    xaxis: {
      ...chartLayout.xaxis,
      type: 'date',
    },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'Drawdown (%)', font: { ...chartLayout.font, size: 10 } },
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
      title="Drawdown"
      subtitle="Peak-to-trough decline"
      isLoading={isLoading}
      error={error?.message}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
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
