import { memo, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer, { timeframeToDate } from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchNav, fetchCategoryNav } from '../lib/api';

export default memo(function ScorecardNavChart({ code }) {
  const chartLayout = useChartLayout();
  const [timeframe, setTimeframe] = useState('3Y');
  const from = timeframeToDate(timeframe);

  const { data: navData, isLoading: navLoading } = useQuery({
    queryKey: ['nav', code, from],
    queryFn: () => fetchNav(code, { from }),
    staleTime: 60_000,
    enabled: !!code,
  });

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['categoryNav', code, from],
    queryFn: () => fetchCategoryNav(code, { from }),
    staleTime: 60_000,
    enabled: !!code,
  });

  const isLoading = navLoading || catLoading;

  const traces = useMemo(() => {
    const result = [];

    if (navData?.data?.length) {
      const series = navData.data;
      const baseNav = series[0].nav;
      result.push({
        x: series.map((d) => d.date),
        y: series.map((d) => (d.nav / baseNav) * 100),
        type: 'scatter',
        mode: 'lines',
        name: 'Fund',
        line: { color: COLORS[0], width: 2 },
        fill: 'tozeroy',
        fillcolor: 'rgba(59, 130, 246, 0.08)',
        hovertemplate: '%{x|%d %b %Y}<br>%{y:.2f}<extra>Fund</extra>',
      });
    }

    if (catData?.data?.length) {
      const series = catData.data;
      const baseNav = series[0].nav;
      result.push({
        x: series.map((d) => d.date),
        y: series.map((d) => (d.nav / baseNav) * 100),
        type: 'scatter',
        mode: 'lines',
        name: `Category Avg (${catData.meta?.peerCount || 0} peers)`,
        line: { color: COLORS[1], width: 1.5, dash: 'dot' },
        hovertemplate: '%{x|%d %b %Y}<br>%{y:.2f}<extra>Category Avg</extra>',
      });
    }

    return result;
  }, [navData, catData]);

  const layout = {
    ...chartLayout,
    showlegend: true,
    legend: {
      ...chartLayout.legend,
      x: 0,
      y: 1.15,
      orientation: 'h',
    },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'Growth (Base 100)', font: { ...chartLayout.font, size: 10 } },
    },
    xaxis: { ...chartLayout.xaxis },
  };

  return (
    <ChartContainer
      title="NAV Growth"
      subtitle="Normalized to base 100 vs category average"
      isLoading={isLoading}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
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
