/** Shared number formatters for consistent display across the app */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_INT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUM_IN = new Intl.NumberFormat('en-IN');

export function formatNav(value) {
  if (value == null) return '—';
  return INR.format(value);
}

export function formatReturn(value, { prefix = true } = {}) {
  if (value == null) return '—';
  const sign = prefix && value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
}

export function formatAum(value) {
  if (value == null) return '—';
  if (value >= 1e7) return `${INR_INT.format(Math.round(value / 1e7))} Cr`;
  if (value >= 1e5) return `${INR_INT.format(Math.round(value / 1e5))} L`;
  return INR.format(value);
}

export function formatNumber(value, decimals = 2) {
  if (value == null) return '—';
  return Number(value).toFixed(decimals);
}

export function formatInteger(value) {
  if (value == null) return '—';
  return NUM_IN.format(Math.round(value));
}

export function returnColor(value) {
  if (value == null) return 'text-muted';
  return value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : 'text-muted';
}
