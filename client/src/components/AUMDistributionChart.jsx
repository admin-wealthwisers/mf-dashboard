import { memo, useMemo } from 'react';
import Plot from 'react-plotly.js';
import ChartContainer from './ChartContainer';
import { defaultConfig, COLORS } from '../lib/chartTheme';
import { useChartLayout } from '../lib/useChartLayout';

// Same clean mapping as ExplorePage
function cleanCategory(sub) {
  if (!sub) return 'Other';
  const s = sub.toLowerCase();
  if (s.includes('large & mid cap')) return 'Large & Mid Cap';
  if (s.includes('large cap')) return 'Large Cap';
  if (s.includes('mid cap')) return 'Mid Cap';
  if (s.includes('small cap')) return 'Small Cap';
  if (s.includes('multi cap')) return 'Multi Cap';
  if (s.includes('flexi cap')) return 'Flexi Cap';
  if (s.includes('focused')) return 'Focused';
  if (s.includes('contra')) return 'Contra';
  if (s.includes('value')) return 'Value';
  if (s.includes('elss')) return 'ELSS';
  if (s.includes('sectoral') || s.includes('thematic')) return 'Sectoral / Thematic';
  if (s.includes('index') || s.includes('etf')) return 'Index / ETF';
  if (s.includes('fof') || s.includes('fund of fund')) return 'Fund of Funds';
  if (s.includes('liquid')) return 'Liquid';
  if (s.includes('overnight')) return 'Overnight';
  if (s.includes('money market')) return 'Money Market';
  if (s.includes('ultra short')) return 'Ultra Short';
  if (s.includes('low duration')) return 'Low Duration';
  if (s.includes('short duration') || s.includes('short term')) return 'Short Duration';
  if (s.includes('medium')) return 'Medium Duration';
  if (s.includes('long duration') || s.includes('long term')) return 'Long Duration';
  if (s.includes('dynamic bond')) return 'Dynamic Bond';
  if (s.includes('corporate bond')) return 'Corporate Bond';
  if (s.includes('credit risk')) return 'Credit Risk';
  if (s.includes('banking and psu')) return 'Banking & PSU';
  if (s.includes('gilt')) return 'Gilt';
  if (s.includes('floater')) return 'Floater';
  if (s.includes('arbitrage')) return 'Arbitrage';
  if (s.includes('aggressive hybrid')) return 'Aggressive Hybrid';
  if (s.includes('balanced') || s.includes('dynamic asset')) return 'Balanced / BAF';
  if (s.includes('conservative hybrid')) return 'Conservative Hybrid';
  if (s.includes('equity savings')) return 'Equity Savings';
  if (s.includes('multi asset')) return 'Multi Asset';
  if (s.includes('retirement')) return 'Retirement';
  if (s.includes('children')) return "Children's Fund";
  return 'Other';
}

export default memo(function AUMDistributionChart({ schemes, isLoading }) {
  const chartLayout = useChartLayout();

  const catData = useMemo(() => {
    const map = new Map();
    for (const s of schemes || []) {
      const cat = cleanCategory(s.sub_category);
      if (cat === 'Other') continue;
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 categories
  }, [schemes]);

  if (!catData.length) {
    return (
      <ChartContainer
        title="Scheme Distribution"
        subtitle="Number of schemes by category"
        isLoading={isLoading}
        showTimeframes={false}
      >
        <div className="flex items-center justify-center h-full text-sm text-muted">
          No data available
        </div>
      </ChartContainer>
    );
  }

  const trace = {
    type: 'pie',
    labels: catData.map((d) => d.name),
    values: catData.map((d) => d.count),
    hole: 0.4,
    textinfo: 'label+percent',
    textposition: 'outside',
    textfont: { ...chartLayout.font, size: 9 },
    marker: {
      colors: catData.map((_, i) => COLORS[i % COLORS.length]),
      line: { color: '#1a1d2e', width: 1.5 },
    },
    hovertemplate: '%{label}<br>%{value} schemes (%{percent})<extra></extra>',
    sort: false,
    automargin: true,
  };

  const layout = {
    ...chartLayout,
    margin: { t: 20, r: 20, b: 20, l: 20 },
    showlegend: false,
  };

  return (
    <ChartContainer
      title="Scheme Distribution"
      subtitle="Number of schemes by category"
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
