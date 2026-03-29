import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import ChartContainer from '../ChartContainer';
import { defaultConfig } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';

export default memo(function StockVolumeChart({ prices }) {
  const chartLayout = useChartLayout();

  const { volumeTrace, smaTrace } = useMemo(() => {
    if (!prices?.length) return { volumeTrace: null, smaTrace: null };

    const dates = prices.map((p) => p.date);
    const volumes = prices.map((p) => p.volume);
    const colors = prices.map((p) =>
      (p.close ?? 0) >= (p.open ?? 0) ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'
    );

    // 20-day volume SMA
    const smaValues = volumes.map((_, i) => {
      if (i < 19) return null;
      const window = volumes.slice(i - 19, i + 1);
      return window.reduce((a, b) => a + b, 0) / 20;
    });

    return {
      volumeTrace: {
        type: 'bar',
        x: dates,
        y: volumes,
        marker: { color: colors },
        name: 'Volume',
        hovertemplate: 'Vol: %{y:,.0f}<extra></extra>',
      },
      smaTrace: {
        type: 'scatter',
        mode: 'lines',
        x: dates,
        y: smaValues,
        line: { color: '#f59e0b', width: 1.5 },
        name: '20D SMA',
        hovertemplate: 'SMA: %{y:,.0f}<extra></extra>',
      },
    };
  }, [prices]);

  const traces = [volumeTrace, smaTrace].filter(Boolean);

  const layout = {
    ...chartLayout,
    xaxis: { ...chartLayout.xaxis, type: 'date' },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'Volume', font: { ...chartLayout.font, size: 10 } },
    },
    showlegend: true,
    legend: { ...chartLayout.legend, font: { ...chartLayout.font, size: 9 } },
    bargap: 0.1,
    margin: { t: 8, r: 16, b: 40, l: 56 },
  };

  return (
    <ChartContainer title="Volume" showTimeframes={false}>
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
