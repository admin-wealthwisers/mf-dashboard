import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export function fetchSchemes(category) {
  const params = category ? { category } : {};
  return api.get('/schemes', { params }).then((r) => r.data);
}

export function fetchScheme(code) {
  return api.get(`/schemes/${code}`).then((r) => r.data);
}

export function fetchNav(code, { from, to } = {}) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return api.get(`/nav/${code}`, { params }).then((r) => r.data);
}

export function fetchLatestNav(code) {
  return api.get(`/nav/${code}/latest`).then((r) => r.data);
}

export function fetchHoldings(code) {
  return api.get(`/holdings/${code}`).then((r) => r.data);
}

export function fetchSectorBreakdown(code) {
  return api.get(`/analytics/sector/${code}`).then((r) => r.data);
}

export function fetchTopHoldings(code) {
  return api.get(`/analytics/top-holdings/${code}`).then((r) => r.data);
}

export function fetchRollingReturns(code) {
  return api.get(`/analytics/rolling/${code}`).then((r) => r.data);
}

export function fetchDrawdown(code) {
  return api.get(`/analytics/drawdown/${code}`).then((r) => r.data);
}

export function fetchRiskMetrics(code) {
  return api.get(`/analytics/risk/${code}`).then((r) => r.data);
}

export function fetchOverlap(codes) {
  return api.get('/analytics/overlap', { params: { codes: codes.join(',') } }).then((r) => r.data);
}

export function analyzePortfolio(allocations) {
  return api.post('/portfolio/analyze', { allocations }).then((r) => r.data);
}

export function fetchDashboard() {
  return api.get('/dashboard').then((r) => r.data);
}

export function fetchScorecard(code) {
  return api.get(`/analytics/scorecard/${code}`).then((r) => r.data);
}

export function fetchCategoryNav(code, { from } = {}) {
  const params = {};
  if (from) params.from = from;
  return api.get(`/analytics/category-nav/${code}`, { params }).then((r) => r.data);
}

export function fetchFundSummary(code) {
  return api.post('/ai/fund-summary', { schemeCode: code }).then((r) => r.data);
}

export function fetchAdminStats() {
  return api.get('/admin/stats').then((r) => r.data);
}

export function abortPipeline() {
  return api.post('/admin/pipeline/abort').then((r) => r.data);
}

export function abortHoldingsPipeline() {
  return api.post('/admin/holdings-pipeline/abort').then((r) => r.data);
}

export function fetchPipelineStatus() {
  return api.get('/admin/pipeline/status').then((r) => r.data);
}

export function fetchFundDNA(code) {
  return api.get(`/analytics/fund-dna/${code}`).then((r) => r.data);
}

export function fetchCategoryTop(category, period = 1, limit = 3) {
  return api.get('/analytics/category-top', { params: { category, period, limit } }).then((r) => r.data);
}

export function fetchCompare(codes) {
  return api.get('/analytics/compare', { params: { codes: codes.join(',') } }).then((r) => r.data);
}

export function fetchUniverse() {
  return api.get('/analytics/universe').then((r) => r.data);
}

// ── Portfolio Profiles ──────────────────────────────────────────────────────

export function fetchProfiles() {
  return api.get('/portfolio/profiles').then((r) => r.data);
}

export function createProfile(name, notes) {
  return api.post('/portfolio/profiles', { name, notes }).then((r) => r.data);
}

export function deleteProfile(id) {
  return api.delete(`/portfolio/profiles/${id}`).then((r) => r.data);
}

export function fetchProfile(id) {
  return api.get(`/portfolio/profiles/${id}`).then((r) => r.data);
}

export function addHolding(profileId, { schemeCode, units, purchaseNav, purchaseDate }) {
  return api.post(`/portfolio/profiles/${profileId}/holdings`, { schemeCode, units, purchaseNav, purchaseDate }).then((r) => r.data);
}

export function removeHolding(profileId, schemeCode) {
  return api.delete(`/portfolio/profiles/${profileId}/holdings/${schemeCode}`).then((r) => r.data);
}

export function uploadPortfolioCSV(profileId, csv, confirm = false) {
  return api.post(`/portfolio/profiles/${profileId}/upload`, { csv, confirm }).then((r) => r.data);
}

export function analyzeProfile(profileId) {
  return api.get(`/portfolio/profiles/${profileId}/analyze`).then((r) => r.data);
}

// ── Stocks ────────────────────────────────────────────────────────────────────

export function fetchStocks(params = {}) {
  return api.get('/stocks', { params }).then((r) => r.data);
}

export function fetchStockDetail(symbol) {
  return api.get(`/stocks/${symbol}`).then((r) => r.data);
}

export function fetchStockPrices(symbol, params = {}) {
  return api.get(`/stocks/${symbol}/prices`, { params }).then((r) => r.data);
}

export function fetchStockFundamentals(symbol) {
  return api.get(`/stocks/${symbol}/fundamentals`).then((r) => r.data);
}

export function fetchStockDashboard() {
  return api.get('/stock-analytics/dashboard').then((r) => r.data);
}

export function fetchStockScorecard(symbol) {
  return api.get(`/stock-analytics/scorecard/${symbol}`).then((r) => r.data);
}

export function fetchStockTechnical(symbol, indicators) {
  const params = indicators ? { indicators } : {};
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

export function fetchStockSectorPerformance() {
  return api.get('/stock-analytics/sector-performance').then((r) => r.data);
}

// ── Stock Portfolio ───────────────────────────────────────────────────────────

export function fetchStockProfiles() {
  return api.get('/stock-portfolio/profiles').then((r) => r.data);
}

export function createStockProfile(name, notes) {
  return api.post('/stock-portfolio/profiles', { name, notes }).then((r) => r.data);
}

export function deleteStockProfile(id) {
  return api.delete(`/stock-portfolio/profiles/${id}`).then((r) => r.data);
}

export function fetchStockProfile(id) {
  return api.get(`/stock-portfolio/profiles/${id}`).then((r) => r.data);
}

export function uploadStockPortfolioCSV(profileId, csv) {
  return api.post(`/stock-portfolio/profiles/${profileId}/upload`, { csv }).then((r) => r.data);
}

export function analyzeStockProfile(profileId) {
  return api.get(`/stock-portfolio/profiles/${profileId}/analyze`).then((r) => r.data);
}

export default api;
