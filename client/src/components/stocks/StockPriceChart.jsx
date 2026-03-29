import { useState, useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import ChartContainer, { timeframeToDate } from '../ChartContainer';
import { defaultConfig } from '../../lib/chartTheme';
import { useChartLayout } from '../../lib/useChartLayout';

const OVERLAY_OPTIONS = [
  { key: 'sma20', label: 'SMA 20', color: '#3b82f6' },
  { key: 'sma50', label: 'SMA 50', color: '#f59e0b' },
  { key: 'sma200', label: 'SMA 200', color: '#ef4444' },
  { key: 'bb', label: 'Bollinger', color: '#8b5cf6' },
];

export default memo(function StockPriceChart({ symbol, prices, technicals }) {
  const chartLayout = useChartLayout();
  const [timeframe, setTimeframe] = useState('1Y');
  const [overlays, setOverlays] = useState({ sma20: true, sma50: false, sma200: false, bb: false });

  const toggleOverlay = (key) => setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));

  const filtered = useMemo(() => {
    if (!prices?.length) return [];
    const cutoff = timeframeToDate(timeframe);
    if (!cutoff) return prices;
    return prices.filter((p) => p.date >= cutoff);
  }, [prices, timeframe]);

  const traces = useMemo(() => {
    if (!filtered.length) return [];

    const dates = filtered.map((p) => p.date);
    const result = [
      {
        type: 'candlestick',
        x: dates,
        open: filtered.map((p) => p.open),
        high: filtered.map((p) => p.high),
        low: filtered.map((p) => p.low),
        close: filtered.map((p) => p.close),
        increasing: { line: { color: '#10B981' } },
        decreasing: { line: { color: '#EF4444' } },
        name: symbol,
        hoverinfo: 'x+text',
      },
    ];

    // SMA overlays from technicals data
    if (technicals && overlays.sma20 && technicals.sma20?.length) {
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: technicals.sma20.map((d) => d.date),
        y: technicals.sma20.map((d) => d.value),
        line: { color: '#3b82f6', width: 1.5 },
        name: 'SMA 20',
        hovertemplate: 'SMA20: %{y:.2f}<extra></extra>',
      });
    }

    if (technicals && overlays.sma50 && technicals.sma50?.length) {
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: technicals.sma50.map((d) => d.date),
        y: technicals.sma50.map((d) => d.value),
        line: { color: '#f59e0b', width: 1.5 },
        name: 'SMA 50',
        hovertemplate: 'SMA50: %{y:.2f}<extra></extra>',
      });
    }

    if (technicals && overlays.sma200 && technicals.sma200?.length) {
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: technicals.sma200.map((d) => d.date),
        y: technicals.sma200.map((d) => d.value),
        line: { color: '#ef4444', width: 1.5 },
        name: 'SMA 200',
        hovertemplate: 'SMA200: %{y:.2f}<extra></extra>',
      });
    }

    // Bollinger Bands
    if (technicals && overlays.bb && technicals.bb?.length) {
      const bbDates = technicals.bb.map((d) => d.date);
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: bbDates,
        y: technicals.bb.map((d) => d.upper),
        line: { color: '#8b5cf6', width: 1, dash: 'dot' },
        name: 'BB Upper',
        showlegend: false,
        hovertemplate: 'BB Upper: %{y:.2f}<extra></extra>',
      });
      result.push({
        type: 'scatter',
        mode: 'lines',
        x: bbDates,
        y: technicals.bb.map((d) => d.lower),
        line: { color: '#8b5cf6', width: 1, dash: 'dot' },
        fill: 'tonexty',
        fillcolor: 'rgba(139, 92, 246, 0.06)',
        name: 'BB Lower',
        showlegend: false,
        hovertemplate: 'BB Lower: %{y:.2f}<extra></extra>',
      });
    }

    return result;
  }, [filtered, technicals, overlays, symbol]);

  const layout = {
    ...chartLayout,
    xaxis: {
      ...chartLayout.xaxis,
      rangeslider: { visible: false },
      type: 'date',
    },
    yaxis: {
      ...chartLayout.yaxis,
      title: { text: 'Price (\u20B9)', font: { ...chartLayout.font, size: 10 } },
    },
    showlegend: true,
    legend: {
      ...chartLayout.legend,
      font: { ...chartLayout.font, size: 9 },
    },
    margin: { t: 8, r: 16, b: 40, l: 56 },
  };

  return (
    <ChartContainer
      title="Price Chart"
      subtitle={symbol}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
    >
      {/* Overlay toggles */}
      <div className="absolute top-1 right-2 z-10 flex gap-2">
        {OVERLAY_OPTIONS.map((opt) => (
          <label key={opt.key} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={overlays[opt.key]}
              onChange={() => toggleOverlay(opt.key)}
              className="w-3 h-3 rounded-sm border-border bg-background accent-accent"
            />
            <span className="text-[9px] font-mono" style={{ color: opt.color }}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>

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
