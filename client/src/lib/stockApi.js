import api from './api';

export function fetchStocks(params) {
  return api.get('/stocks', { params }).then((r) => r.data);
}

export function fetchStock(symbol) {
  return api.get(`/stocks/${symbol}`).then((r) => r.data);
}

export function fetchStockPrices(symbol, params) {
  return api.get(`/stocks/${symbol}/prices`, { params }).then((r) => r.data);
}

export function fetchStockScorecard(symbol) {
  return api.get(`/stock-analytics/scorecard/${symbol}`).then((r) => r.data);
}

export function fetchStockDashboard() {
  return api.get('/stock-analytics/dashboard').then((r) => r.data);
}

export function fetchStockTechnical(symbol, params) {
  return api.get(`/stock-analytics/technical/${symbol}`, { params }).then((r) => r.data);
}

export function fetchStockCompare(symbols) {
  return api.get('/stock-analytics/compare', { params: { symbols: symbols.join(',') } }).then((r) => r.data);
}

export function fetchStockPeers(symbol) {
  return api.get(`/stock-analytics/peers/${symbol}`).then((r) => r.data);
}

export function fetchStockMfHoldings(symbol) {
  return api.get(`/stock-analytics/mf-holdings/${symbol}`).then((r) => r.data);
}
