import MetricCard from '../MetricCard';

function formatMarketCap(value) {
  if (value == null) return '—';
  if (value >= 1e5) return `\u20B9${(value / 1e5).toFixed(1)}L Cr`;
  if (value >= 1e2) return `\u20B9${(value / 1e2).toFixed(1)}K Cr`;
  return `\u20B9${Number(value).toFixed(1)} Cr`;
}

export default function StockMetricsGrid({ stock }) {
  if (!stock) return null;

  const metrics = [
    { label: 'PE Ratio', value: stock.pe_ratio, format: 'number', color: 'accent' },
    { label: 'PB Ratio', value: stock.pb_ratio, format: 'number', color: 'accent' },
    { label: 'EPS', value: stock.eps, format: 'currency', color: 'accent' },
    { label: 'Market Cap', value: formatMarketCap(stock.market_cap), format: 'string', color: 'accent' },
    { label: 'Div Yield', value: stock.dividend_yield, format: 'percent', suffix: '%', color: 'positive' },
    { label: 'ROE', value: stock.roe, format: 'percent', suffix: '%', color: 'positive' },
    { label: 'Debt / Equity', value: stock.debt_to_equity, format: 'number', color: stock.debt_to_equity > 1 ? 'warning' : 'accent' },
    { label: '52W High', value: stock.high_52w, format: 'currency', color: 'positive' },
    { label: '52W Low', value: stock.low_52w, format: 'currency', color: 'negative' },
    { label: 'Beta', value: stock.beta, format: 'number', color: 'accent' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map((m, i) => (
        <MetricCard
          key={m.label}
          label={m.label}
          value={m.value}
          format={m.format}
          suffix={m.suffix}
          color={m.color}
          index={i}
        />
      ))}
    </div>
  );
}
