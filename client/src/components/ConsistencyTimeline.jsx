import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchRollingReturns } from '../lib/api';

export default memo(function ConsistencyTimeline({ code }) {
  const chartLayout = useChartLayout();
  const { data, isLoading } = useQuery({
    queryKey: ['rolling', code],
    queryFn: () => fetchRollingReturns(code),
    staleTime: 60_000,
    enabled: !!code,
  });

  const returns1Y = data?.data?.['1Y'] || [];

  const hitRate = useMemo(() => {
    if (returns1Y.length === 0) return null;
    const positive = returns1Y.filter((r) => r.return > 0).length;
    return {
      positive,
      total: returns1Y.length,
      pct: Math.round((positive / returns1Y.length) * 100),
    };
  }, [returns1Y]);

  if (!returns1Y.length && !isLoading) {
    return (
      <ChartContainer title="Consistency" subtitle="Rolling 1Y returns" showTimeframes={false}>
        <div className="flex items-center justify-center h-full text-sm text-muted">
          Insufficient data
        </div>
      </ChartContainer>
    );
  }

  // Sample every 5th point for performance if too many
  const sampled = returns1Y.length > 300
    ? returns1Y.filter((_, i) => i % 5 === 0 || i === returns1Y.length - 1)
    : returns1Y;

  const trace = {
    x: sampled.map((r) => r.date),
    y: sampled.map((r) => r.return * 100),
    type: 'bar',
    marker: {
      color: sampled.map((r) => (r.return >= 0 ? '#10b981' : '#ef4444')),
      line: { width: 0 },
    },
    hovertemplate: '%{x}: %{y:.1f}%<extra></extra>',
  };

  const layout = {
    ...chartLayout,
    margin: { ...chartLayout.margin, t: 10 },
    xaxis: {
      ...chartLayout.xaxis,
      type: 'date',
    },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'Rolling 1Y Return (%)', font: { ...chartLayout.font, size: 10 } },
      ticksuffix: '%',
      zeroline: true,
      zerolinecolor: chartLayout.font?.color || '#fff',
      zerolinewidth: 1,
    },
    bargap: 0.1,
    shapes: [
      {
        type: 'line',
        x0: 0,
        x1: 1,
        xref: 'paper',
        y0: 0,
        y1: 0,
        line: { color: chartLayout.font?.color || '#fff', width: 1, dash: 'dot' },
      },
    ],
  };

  return (
    <ChartContainer
      title="Consistency — Rolling 1Y Returns"
      subtitle={
        hitRate
          ? `${hitRate.positive}/${hitRate.total} periods positive (${hitRate.pct}%)`
          : 'Rolling 1Y return timeline'
      }
      isLoading={isLoading}
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
