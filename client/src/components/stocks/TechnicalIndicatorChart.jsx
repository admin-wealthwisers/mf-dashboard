import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import ChartContainer from '../ChartContainer';
import { defaultConfig } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';

export default memo(function TechnicalIndicatorChart({ rsi, macd }) {
  const chartLayout = useChartLayout();

  const traces = useMemo(() => {
    const result = [];

    // RSI traces (subplot row 1)
    if (rsi?.length) {
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: rsi.map((d) => d.date),
        y: rsi.map((d) => d.rsi),
        line: { color: '#3b82f6', width: 1.5 },
        name: 'RSI',
        yaxis: 'y',
        hovertemplate: 'RSI: %{y:.1f}<extra></extra>',
      });
      // Overbought line (70)
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: [rsi[0].date, rsi[rsi.length - 1].date],
        y: [70, 70],
        line: { color: '#ef4444', width: 1, dash: 'dash' },
        name: 'Overbought (70)',
        yaxis: 'y',
        showlegend: false,
        hoverinfo: 'skip',
      });
      // Oversold line (30)
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: [rsi[0].date, rsi[rsi.length - 1].date],
        y: [30, 30],
        line: { color: '#10b981', width: 1, dash: 'dash' },
        name: 'Oversold (30)',
        yaxis: 'y',
        showlegend: false,
        hoverinfo: 'skip',
      });
    }

    // MACD traces (subplot row 2)
    if (macd?.length) {
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: macd.map((d) => d.date),
        y: macd.map((d) => d.macd),
        line: { color: '#3b82f6', width: 1.5 },
        name: 'MACD',
        yaxis: 'y2',
        hovertemplate: 'MACD: %{y:.2f}<extra></extra>',
      });
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: macd.map((d) => d.date),
        y: macd.map((d) => d.signal),
        line: { color: '#f59e0b', width: 1.5 },
        name: 'Signal',
        yaxis: 'y2',
        hovertemplate: 'Signal: %{y:.2f}<extra></extra>',
      });
      result.push({
        type: 'bar',
        x: macd.map((d) => d.date),
        y: macd.map((d) => d.histogram),
        marker: {
          color: macd.map((d) =>
            d.histogram >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          ),
        },
        name: 'Histogram',
        yaxis: 'y2',
        hovertemplate: 'Hist: %{y:.2f}<extra></extra>',
      });
    }

    return result;
  }, [rsi, macd]);

  const layout = {
    ...chartLayout,
    grid: { rows: 2, columns: 1, pattern: 'independent', roworder: 'top to bottom' },
    xaxis: { ...chartLayout.xaxis, type: 'date' },
    xaxis2: { ...chartLayout.xaxis, type: 'date' },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'RSI', font: { ...chartLayout.font, size: 10 } },
      range: [0, 100],
      domain: [0.55, 1],
    },
    yaxis2: {
      ...chartLayout.yaxis,
      title: { text: 'MACD', font: { ...chartLayout.font, size: 10 } },
      domain: [0, 0.45],
    },
    showlegend: true,
    legend: { ...chartLayout.legend, font: { ...chartLayout.font, size: 9 } },
    margin: { t: 8, r: 16, b: 40, l: 56 },
  };

  return (
    <ChartContainer title="Technical Indicators" subtitle="RSI & MACD" showTimeframes={false}>
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
