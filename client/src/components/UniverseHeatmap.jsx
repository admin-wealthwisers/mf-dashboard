import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';
import { fetchUniverse } from '../lib/api';

export default memo(function UniverseHeatmap() {
  const chartLayout = useChartLayout();
  const { data, isLoading } = useQuery({
    queryKey: ['universe'],
    queryFn: fetchUniverse,
    staleTime: 120_000,
  });

  const funds = data?.data || [];

  // Group by top 5 categories, rest as "Other"
  const { traces, annotations } = useMemo(() => {
    if (funds.length === 0) return { traces: [], annotations: [] };

    const catCounts = {};
    for (const f of funds) {
      const cat = f.category || 'Other';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const topCats = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);

    const groups = {};
    for (const f of funds) {
      const cat = topCats.includes(f.category) ? f.category : 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    }

    const allCats = [...topCats];
    if (groups['Other']) allCats.push('Other');

    const t = allCats.map((cat, i) => {
      const g = groups[cat] || [];
      return {
        x: g.map((f) => f.volatilityPct),
        y: g.map((f) => f.returnPct),
        text: g.map((f) => f.scheme_name),
        customdata: g.map((f) => f.category),
        type: 'scatter',
        mode: 'markers',
        name: cat.replace('Open Ended Schemes', '').trim() || cat,
        marker: {
          color: cat === 'Other' ? 'rgba(128,128,128,0.4)' : COLORS[i % COLORS.length],
          size: 6,
          line: { width: 0 },
        },
        hovertemplate:
          '<b>%{text}</b><br>' +
          'Return: %{y:.1f}%<br>' +
          'Volatility: %{x:.1f}%<br>' +
          '%{customdata}<extra></extra>',
      };
    });

    // Quadrant annotations
    const a = [
      { x: 0.02, y: 0.98, text: 'Low Risk / High Return', font: { color: '#10b981' } },
      { x: 0.98, y: 0.98, text: 'High Risk / High Return', font: { color: '#f59e0b' } },
      { x: 0.02, y: 0.02, text: 'Low Risk / Low Return', font: { color: '#6b7280' } },
      { x: 0.98, y: 0.02, text: 'High Risk / Low Return', font: { color: '#ef4444' } },
    ].map((ann) => ({
      ...ann,
      xref: 'paper',
      yref: 'paper',
      showarrow: false,
      font: { ...ann.font, size: 9, family: 'monospace' },
      opacity: 0.5,
      xanchor: ann.x < 0.5 ? 'left' : 'right',
      yanchor: ann.y < 0.5 ? 'bottom' : 'top',
    }));

    return { traces: t, annotations: a };
  }, [funds]);

  if (!funds.length && !isLoading) {
    return (
      <ChartContainer
        title="Fund Universe"
        subtitle="Risk vs Return scatter"
        showTimeframes={false}
      >
        <div className="flex items-center justify-center h-full text-sm text-muted">
          Insufficient data for universe view
        </div>
      </ChartContainer>
    );
  }

  const layout = {
    ...chartLayout,
    margin: { t: 10, r: 20, b: 50, l: 60 },
    xaxis: {
      ...chartLayout.xaxis,
      title: { text: 'Volatility (%)', font: { ...chartLayout.font, size: 11 } },
      ticksuffix: '%',
    },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: '1Y Return (%)', font: { ...chartLayout.font, size: 11 } },
      ticksuffix: '%',
      zeroline: true,
      zerolinecolor: chartLayout.font?.color || '#fff',
      zerolinewidth: 1,
    },
    showlegend: true,
    legend: {
      font: { ...chartLayout.font, size: 9 },
      x: 0,
      y: -0.2,
      orientation: 'h',
    },
    annotations,
  };

  return (
    <ChartContainer
      title="Fund Universe — Risk vs Return"
      subtitle={`${funds.length} funds plotted`}
      isLoading={isLoading}
      showTimeframes={false}
      className="h-[500px]"
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
