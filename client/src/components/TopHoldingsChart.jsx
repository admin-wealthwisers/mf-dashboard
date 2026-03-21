import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchTopHoldings } from '../lib/api';

export default memo(function TopHoldingsChart({ code }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['topHoldings', code],
    queryFn: () => fetchTopHoldings(code),
    staleTime: 60_000,
    enabled: !!code,
  });

  const chartLayout = useChartLayout();
  const holdings = data?.data || [];

  // Top 10, sort ascending for horizontal bar (bottom-up)
  const top10 = [...holdings].slice(0, 10).reverse();

  const trace = {
    y: top10.map((h) => {
      const name = h.name || h.company_name || h.instrument_name || 'Unknown';
      return name.length > 30 ? name.slice(0, 28) + '...' : name;
    }),
    x: top10.map((h) => h.weight),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: top10.map((_, i) => COLORS[i % COLORS.length]),
      line: { width: 0 },
    },
    text: top10.map((h) => `${h.weight.toFixed(1)}%`),
    textposition: 'outside',
    textfont: { ...chartLayout.font, size: 10 },
    hovertemplate: '%{y}: %{x:.2f}%<extra></extra>',
  };

  const layout = {
    ...chartLayout,
    margin: { ...chartLayout.margin, l: 160 },
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
      title="Top Holdings"
      subtitle="By portfolio weight"
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
