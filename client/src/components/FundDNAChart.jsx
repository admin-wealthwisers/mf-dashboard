import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchFundDNA } from '../lib/api';

export default memo(function FundDNAChart({ code }) {
  const chartLayout = useChartLayout();
  const { data, isLoading } = useQuery({
    queryKey: ['fund-dna', code],
    queryFn: () => fetchFundDNA(code),
    staleTime: 60_000,
    enabled: !!code,
  });

  const dimensions = data?.data?.dimensions;
  const peerCount = data?.data?.peerCount;

  if (!dimensions?.length && !isLoading) {
    return (
      <ChartContainer title="Fund DNA" subtitle="Multi-dimensional profile" showTimeframes={false}>
        <div className="flex items-center justify-center h-full text-sm text-muted">
          No data available
        </div>
      </ChartContainer>
    );
  }

  const categories = dimensions?.map((d) => d.name) || [];
  const scores = dimensions?.map((d) => d.score) || [];
  const medians = dimensions?.map((d) => d.peerMedian) || [];

  // Close the polygon
  const theta = [...categories, categories[0]];
  const fundR = [...scores, scores[0]];
  const peerR = [...medians, medians[0]];

  const traces = [
    {
      type: 'scatterpolar',
      r: fundR,
      theta,
      fill: 'toself',
      fillcolor: 'rgba(37, 99, 235, 0.15)',
      line: { color: 'var(--accent)', width: 2 },
      name: 'Fund',
      hovertemplate: '%{theta}: %{r}<extra></extra>',
    },
    {
      type: 'scatterpolar',
      r: peerR,
      theta,
      fill: 'none',
      line: { color: 'var(--muted)', width: 1, dash: 'dot' },
      name: 'Peer Median',
      hovertemplate: '%{theta}: %{r}<extra></extra>',
    },
  ];

  const layout = {
    ...chartLayout,
    polar: {
      bgcolor: 'transparent',
      radialaxis: {
        visible: true,
        range: [0, 100],
        tickfont: { ...chartLayout.font, size: 9 },
        gridcolor: chartLayout.xaxis?.gridcolor || 'rgba(255,255,255,0.06)',
        linecolor: 'transparent',
      },
      angularaxis: {
        tickfont: { ...chartLayout.font, size: 10 },
        gridcolor: chartLayout.xaxis?.gridcolor || 'rgba(255,255,255,0.06)',
        linecolor: 'transparent',
      },
    },
    showlegend: true,
    legend: {
      font: { ...chartLayout.font, size: 10 },
      x: 0,
      y: -0.15,
      orientation: 'h',
    },
    margin: { t: 20, b: 40, l: 60, r: 60 },
  };

  return (
    <ChartContainer
      title="Fund DNA"
      subtitle={`6-dimension profile${peerCount ? ` vs ${peerCount} peers` : ''}`}
      isLoading={isLoading}
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
