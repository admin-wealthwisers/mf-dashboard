import { memo } from 'react';
import Plot from 'react-plotly.js';
import ChartContainer from '../ChartContainer';
import { defaultConfig } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';

const AXES = ['Growth', 'Value', 'Quality', 'Momentum', 'Stability', 'Size'];

export default memo(function StockDNAChart({ dna, peerAvg }) {
  const chartLayout = useChartLayout();

  if (!dna) {
    return (
      <ChartContainer title="Stock DNA" subtitle="Multi-dimensional profile" showTimeframes={false}>
        <div className="flex items-center justify-center h-full text-sm text-muted">
          No data available
        </div>
      </ChartContainer>
    );
  }

  const scores = AXES.map((a) => dna[a.toLowerCase()] ?? 0);
  const peerScores = peerAvg ? AXES.map((a) => peerAvg[a.toLowerCase()] ?? 0) : null;

  // Close the polygon
  const theta = [...AXES, AXES[0]];
  const fundR = [...scores, scores[0]];
  const peerR = peerScores ? [...peerScores, peerScores[0]] : null;

  const traces = [
    {
      type: 'scatterpolar',
      r: fundR,
      theta,
      fill: 'toself',
      fillcolor: 'rgba(37, 99, 235, 0.15)',
      line: { color: 'var(--accent)', width: 2 },
      name: 'Stock',
      hovertemplate: '%{theta}: %{r}<extra></extra>',
    },
  ];

  if (peerR) {
    traces.push({
      type: 'scatterpolar',
      r: peerR,
      theta,
      fill: 'none',
      line: { color: 'var(--muted)', width: 1, dash: 'dot' },
      name: 'Peer Avg',
      hovertemplate: '%{theta}: %{r}<extra></extra>',
    });
  }

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
      title="Stock DNA"
      subtitle={`6-dimension profile${peerAvg ? ' vs peers' : ''}`}
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
