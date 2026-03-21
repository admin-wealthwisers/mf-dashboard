import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchSectorBreakdown } from '../lib/api';

export default memo(function SectorExposureChart({ code }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sector', code],
    queryFn: () => fetchSectorBreakdown(code),
    staleTime: 60_000,
    enabled: !!code,
  });

  const chartLayout = useChartLayout();
  const sectors = data?.data || [];

  // Sort descending and reverse for horizontal bar (bottom-up rendering)
  const sorted = [...sectors].sort((a, b) => a.total_weight - b.total_weight);

  const trace = {
    y: sorted.map((s) => s.sector || 'Other'),
    x: sorted.map((s) => s.total_weight),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: COLORS[0],
      line: { width: 0 },
    },
    text: sorted.map((s) => `${s.total_weight.toFixed(1)}%`),
    textposition: 'outside',
    textfont: { ...chartLayout.font, size: 10 },
    hovertemplate: '%{y}: %{x:.2f}%<extra></extra>',
  };

  const layout = {
    ...chartLayout,
    margin: { ...chartLayout.margin, l: 140 },
    xaxis: {
      ...chartLayout.xaxis,
      title: { text: 'Weight (%)', font: { ...chartLayout.font, size: 10 } },
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
      title="Sector Exposure"
      subtitle={`Scheme ${code}`}
      isLoading={isLoading}
      error={error?.message}
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
