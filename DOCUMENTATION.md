# MF Intelligence Dashboard — Documentation

Institutional-grade mutual fund analytics platform for Indian mutual funds. React + Vite frontend, Express + SQLite backend, AI-powered natural language queries via Anthropic Claude.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [LLM / AI Configuration](#llm--ai-configuration)
3. [Pages & Features](#pages--features)
4. [AI Features](#ai-features)
5. [API Reference](#api-reference)
6. [Analytics Engine](#analytics-engine)
7. [Database Schema](#database-schema)
8. [Scripts](#scripts)
9. [Tech Stack](#tech-stack)
10. [Environment Variables](#environment-variables)
11. [Project Structure](#project-structure)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- No external database required (SQLite is embedded)

### Installation

```bash
# Install dependencies
npm install

# Initialize the database (creates tables)
npm run db:init

# Seed instrument data
node scripts/seedInstruments.js

# Fetch NAV data from MFAPI (internet required)
node scripts/ingestNav.js

# Import holdings from CSV (optional)
node scripts/importHoldings.js data/holdings/your-file.csv
```

### Running

```bash
# Start both frontend (port 5173) and backend (port 3001)
npm run dev

# Or run them separately:
npm run server   # Express on port 3001
npm run client   # Vite on port 5173
```

Open http://localhost:5173 in your browser. The Vite dev server proxies `/api/*` requests to the Express backend on port 3001.

---

## LLM / AI Configuration

The dashboard has three AI-powered features that require an LLM API key. **The app works fully without AI keys** — all analytics, charts, and data features function independently. Only the AI features below require configuration.

### Setting Up API Keys

Create a `.env` file in the project root (see `.env.example`):

```env
# Primary — powers AI Chat, Fund Summary, and Explain button
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional fallback — used for Fund Summary if Anthropic key is missing
MISTRAL_API_KEY=your-mistral-key-here
```

Alternatively, export as environment variables before running:

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
npm run dev
```

### Which Features Need Which Key

| Feature | ANTHROPIC_API_KEY | MISTRAL_API_KEY |
|---------|:-----------------:|:---------------:|
| AI Chat Panel (natural language queries) | Required | Not used |
| "Explain to Client" button on charts | Required | Not used |
| AI Fund Summary on Scorecard page | Primary | Fallback |
| All other features (charts, analytics, data) | Not needed | Not needed |

### Models Used

| Feature | Provider | Model |
|---------|----------|-------|
| AI Chat / SQL Agent | Anthropic | `claude-sonnet-4-5-20250514` |
| Fund Summary | Anthropic | `claude-sonnet-4-5-20250514` |
| Fund Summary (fallback) | Mistral | `mistral-small-latest` |

### What Happens Without Keys

- **AI Chat Panel**: Shows "AI service not configured. Set ANTHROPIC_API_KEY." when a message is sent
- **Explain Button**: Same error message in the chat panel
- **Fund Summary**: Returns HTTP 503; the summary section on the Scorecard page shows an error state
- **Everything else**: Works normally — all charts, analytics, data browsing, comparisons, and admin features are fully functional

---

## Pages & Features

### Dashboard (`/`)

The landing page with an overview of all fund data.

**What it shows:**
- Metric cards: total schemes, total NAV records, top performer (1Y), worst performer (1Y)
- NAV Growth chart: aggregate NAV trend with sparklines
- Category Performance chart: returns by fund category
- AUM Distribution chart: assets under management breakdown
- Recent NAV Updates table: latest NAV changes across all funds

**Key components:** `MetricCard`, `NavGrowthChart`, `CategoryPerformanceChart`, `AUMDistributionChart`, `NavUpdatesTable`

**API endpoints:** `GET /api/dashboard`

---

### Explore (`/explore`)

Browse and discover the full fund universe.

**What it shows:**
- Search bar: filter by name, AMC, or scheme code
- Category filter: checkbox-based multi-select
- AMC filter: dropdown
- Sort options: Name, NAV, 1Y Return, 1D Change
- **List view**: Fund cards in a grid with NAV sparklines, 1D change, 1Y return
- **Scatter view**: Fund Universe Heatmap — risk (volatility) vs return scatter plot with quadrant labels (Low Risk / High Return, etc.), color-coded by category

**Key components:** `SchemeCard`, `UniverseHeatmap`, `FundSelector`

**API endpoints:** `GET /api/schemes`, `GET /api/nav/:code/latest`, `GET /api/analytics/universe`

---

### Compare (`/compare?codes=X,Y,Z`)

Side-by-side fund comparison. Selected fund codes are stored in URL search params for shareable links.

**What it shows:**
- Fund selector: add up to 5 funds with color-coded chips
- **Comparison Metrics Table**: rows for 1Y/3Y/5Y CAGR, Volatility, Sharpe, Sortino, Max Drawdown, Holdings count, Intelligence Score. Best value per row highlighted in green.
- **NAV Growth Comparison**: Normalized to base 100 line chart with timeframe selector (1M to MAX)
- **Fund Overlap Matrix**: Heatmap of pairwise portfolio overlap by weight
- **Sector Comparison**: Grouped bar chart of sector allocations across selected funds

**Key components:** `FundSelector`, `OverlapMatrix`, `ChartContainer`

**API endpoints:** `GET /api/analytics/compare?codes=X,Y,Z`, `GET /api/nav/:code`, `GET /api/analytics/sector/:code`, `GET /api/analytics/overlap?codes=X,Y,Z`

---

### Portfolio (`/portfolio`)

Custom portfolio builder and analysis.

**What it shows:**
- Add funds with allocation weights
- Portfolio analysis: aggregate sector exposure, overlap detection, risk metrics

**Key components:** `FundSelector`

**API endpoints:** `POST /api/portfolio/analyze`

---

### Scorecard (`/scorecard/:code`)

Deep-dive intelligence report for a single fund. The most feature-rich page.

**What it shows:**

1. **Header**: Fund name, AMC, category, latest NAV, fund selector to switch
2. **Intelligence Score Gauge**: Animated SVG arc (0-100) with 4-tier color system:
   - < 30: Red ("Poor")
   - 30-59: Orange ("Below Average")
   - 60-79: Blue ("Good")
   - 80+: Green ("Excellent")
   - Breakdown bars: Performance (30%), Consistency (25%), Risk (25%), Diversification (20%)

3. **Metrics Cards** (4-column grid):
   - **Performance**: 1Y, 3Y, 5Y CAGR, Since Inception
   - **Risk**: Volatility, Sharpe Ratio, Max Drawdown, Sortino Ratio
   - **Portfolio Structure**: Holdings count, Top 10 Concentration, Sector Diversification Score
   - **Downside Protection**: Composite score (0-100), Semi-Deviation, Ulcer Index, Max Drawdown Duration, Sortino

4. **Fund DNA Radar Chart**: 6-dimension polar chart (Return, Consistency, Risk Control, Diversification, Downside Protection, Recovery Speed) with peer median overlay

5. **Consistency Timeline**: Rolling 1Y returns bar chart — green bars for positive periods, red for negative. Shows hit rate (e.g., "1432/2105 periods positive (68%)")

6. **Charts Grid**:
   - NAV chart with category average comparison
   - Rolling Returns (1Y, 3Y, 5Y lines)
   - Drawdown chart
   - Sector Allocation

7. **AI Summary**: LLM-generated analyst summary (requires ANTHROPIC_API_KEY or MISTRAL_API_KEY)

**Key components:** `IntelligenceScoreGauge`, `MetricsQuadrant`, `DownsideProtectionCard`, `FundDNAChart`, `ConsistencyTimeline`, `ScorecardNavChart`, `RollingReturnsChart`, `DrawdownChart`, `ScorecardSectorChart`, `AISummary`

**API endpoints:** `GET /api/analytics/scorecard/:code`, `GET /api/nav/:code/latest`, `GET /api/analytics/fund-dna/:code`, `GET /api/analytics/rolling/:code`, `GET /api/analytics/drawdown/:code`, `GET /api/analytics/category-nav/:code`, `GET /api/analytics/sector/:code`, `POST /api/ai/fund-summary`

---

### Scheme Detail (`/scheme/:code`)

Individual fund detail page.

**What it shows:**
- NAV history chart with timeframe selector
- Holdings table with instrument details
- Sector exposure pie chart
- Top holdings bar chart

**Key components:** `ChartContainer`, `HoldingsTable`, `SectorExposureChart`, `TopHoldingsChart`

**API endpoints:** `GET /api/schemes/:code`, `GET /api/nav/:code`, `GET /api/holdings/:code`, `GET /api/analytics/sector/:code`, `GET /api/analytics/top-holdings/:code`

---

### Admin (`/admin`)

Database management and data ingestion.

**What it shows:**
- Database statistics: scheme count, NAV record count, holdings count
- NAV ingestion pipeline: fetch from MFAPI with real-time progress (SSE streaming)
- Pipeline abort button
- Holdings import status

**Key components:** `StatCard`

**API endpoints:** `GET /api/admin/stats`, `GET /api/admin/mfapi-schemes`, `POST /api/admin/pipeline/start`, `POST /api/admin/pipeline/abort`, `GET /api/admin/pipeline/status`

---

## AI Features

### AI Chat Panel

A persistent chat panel on the right side of every page. Send natural language questions about your mutual fund data.

**How it works:**
1. User types a question (e.g., "Which funds have highest banking exposure?")
2. Frontend sends question + last 6 messages as context to `POST /api/agent/query`
3. Backend sends the question to Claude with the full database schema as context
4. Claude generates a structured response: explanation text + SQL query + optional Plotly chart spec
5. Backend validates the SQL (blocks DROP/DELETE/UPDATE/INSERT/ALTER/CREATE), executes it, and streams results back via SSE
6. Frontend renders: text response, expandable SQL block, data table (up to 10 rows), and inline Plotly chart

**Suggested queries** (shown on empty state):
- "Compare large cap funds"
- "Show sector exposure for top 5 funds"
- "Which funds have highest banking exposure?"
- "Show drawdown analysis for HDFC Flexi Cap"

### "Explain to Client" Button

Every chart wrapped in `ChartContainer` has a small chat icon button in the header. Clicking it:
1. Opens the AI panel (if closed)
2. Sends a pre-formatted message: "Explain this chart to a client in simple terms: {chart title and context}"
3. Streams a client-friendly explanation from Claude

### AI Fund Summary

On the Scorecard page, an AI-generated analyst summary appears at the bottom. It:
1. Gathers fund metrics (CAGR, volatility, Sharpe, holdings, sector data)
2. Sends them to Claude (or Mistral as fallback) with an analyst prompt
3. Returns a concise, professional fund summary

---

## API Reference

### Schemes

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| GET | `/api/schemes` | List all schemes | `?category=` filter |
| GET | `/api/schemes/:code` | Single scheme details | — |

### NAV

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| GET | `/api/nav/:code` | Full NAV time series | `?from=`, `?to=` date filters |
| GET | `/api/nav/:code/latest` | Latest NAV + 1-day change | — |

### Holdings

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| GET | `/api/holdings/:code` | Holdings with instrument details | — |

### Analytics

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| GET | `/api/analytics/sector/:code` | Sector breakdown | — |
| GET | `/api/analytics/top-holdings/:code` | Top 10 holdings by weight | — |
| GET | `/api/analytics/rolling/:code` | 1Y, 3Y, 5Y rolling returns | — |
| GET | `/api/analytics/drawdown/:code` | Drawdown series | — |
| GET | `/api/analytics/risk/:code` | CAGR, volatility, Sharpe, max drawdown | — |
| GET | `/api/analytics/scorecard/:code` | Full scorecard with Intelligence Score | — |
| GET | `/api/analytics/category-nav/:code` | Category average NAV (base 100) | — |
| GET | `/api/analytics/overlap` | Portfolio overlap matrix | `?codes=X,Y,Z` |
| GET | `/api/analytics/fund-dna/:code` | 6-dimension radar profile vs peers | — |
| GET | `/api/analytics/compare` | Multi-fund comparison | `?codes=X,Y,Z` |
| GET | `/api/analytics/universe` | Risk-return scatter for all funds | — |

### AI

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| POST | `/api/ai/fund-summary` | Generate AI fund summary | Body: `{ schemeCode }` |
| POST | `/api/agent/query` | AI chat — SSE streaming | Body: `{ question, history }` |

### Portfolio

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| POST | `/api/portfolio/analyze` | Analyze portfolio allocations | Body: portfolio data |

### Dashboard

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| GET | `/api/dashboard` | All dashboard metrics | — |

### Admin

| Method | Path | Description | Params |
|--------|------|-------------|--------|
| GET | `/api/admin/stats` | Database statistics | — |
| GET | `/api/admin/mfapi-schemes` | Fetch MFAPI scheme list | — |
| POST | `/api/admin/pipeline/start` | Start NAV ingestion (SSE) | — |
| POST | `/api/admin/pipeline/abort` | Abort running pipeline | — |
| GET | `/api/admin/pipeline/status` | Pipeline status | — |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |

---

## Analytics Engine

All analytics are computed server-side in `server/services/analyticsEngine.js`.

### Computed Metrics

| Metric | Function | Description |
|--------|----------|-------------|
| CAGR | `computeCAGR()` | Compound annual growth rate |
| Period CAGR | `computePeriodCAGR()` | CAGR for 1Y, 3Y, 5Y windows |
| Volatility | `computeVolatility()` | Annualized standard deviation of daily returns |
| Sharpe Ratio | `computeSharpe()` | Risk-adjusted return (risk-free rate: 6.5%) |
| Sortino Ratio | `computeSortino()` | Downside risk-adjusted return |
| Max Drawdown | `computeMaxDrawdown()` | Largest peak-to-trough decline |
| Drawdown Series | `computeDrawdownSeries()` | Running drawdown from peak |
| Rolling Returns | `computeRollingReturns()` | 1Y, 3Y, 5Y rolling CAGR series |
| Semi-Deviation | `computeSemiDeviation()` | Annualized downside volatility |
| Ulcer Index | `computeUlcerIndex()` | RMS of drawdown series — measures pain |
| Max DD Duration | `computeMaxDrawdownDuration()` | Longest peak-to-recovery period (trading days) |
| Percentile Rank | `computePercentileRank()` | Rank vs peer values (0-100) |

### Intelligence Score (0-100)

Composite score with 4 weighted components:

| Component | Weight | How Computed |
|-----------|--------|-------------|
| Performance | 30% | 3Y CAGR percentile rank vs category peers |
| Consistency | 25% | Inverse of rolling return standard deviation |
| Risk | 25% | Combination of Sharpe ratio and max drawdown |
| Diversification | 20% | Sector HHI + top 10 concentration |

### Downside Protection Score (0-100)

| Component | Weight | Mapping |
|-----------|--------|---------|
| Sortino Ratio | 40% | 0 maps to 0, 2 maps to 100 |
| Ulcer Index | 30% | 0 maps to 100, 0.15 maps to 0 |
| Max Drawdown | 30% | 0% maps to 100, -50% maps to 0 |

### Fund DNA Dimensions

6-axis radar chart, each dimension is a percentile rank vs category peers:

1. **Return** — 3Y CAGR rank
2. **Consistency** — Consistency score rank
3. **Risk Control** — Risk score rank
4. **Diversification** — Diversification score rank
5. **Downside Protection** — Sortino ratio rank
6. **Recovery Speed** — Average drawdown recovery speed rank

---

## Database Schema

SQLite database at `server/db/mf-data.db`. WAL mode enabled for concurrent reads.

### schemes

| Column | Type | Description |
|--------|------|-------------|
| scheme_code | TEXT (PK) | Unique fund identifier |
| scheme_name | TEXT | Full fund name |
| amc | TEXT | Asset Management Company |
| category | TEXT | Broad category (e.g., "Open Ended Schemes") |
| sub_category | TEXT | Detailed category (e.g., "Equity Scheme - Large Cap Fund") |
| inception_date | TEXT | Fund inception date |
| aum | REAL | Assets under management |

### nav_history

| Column | Type | Description |
|--------|------|-------------|
| scheme_code | TEXT (PK, FK) | References schemes |
| date | TEXT (PK) | Date in YYYY-MM-DD format |
| nav | REAL | Net Asset Value |

Index: `idx_nav_history_scheme_date` on (scheme_code, date)

### instruments

| Column | Type | Description |
|--------|------|-------------|
| instrument_id | INTEGER (PK, auto) | Unique ID |
| name | TEXT | Instrument name |
| isin | TEXT | ISIN code |
| asset_class | TEXT | Equity, Debt, etc. |
| sector | TEXT | Sector classification |
| country | TEXT | Default: "India" |

### portfolio_holdings

| Column | Type | Description |
|--------|------|-------------|
| scheme_code | TEXT (PK, FK) | References schemes |
| instrument_id | INTEGER (PK, FK) | References instruments |
| weight | REAL | Portfolio weight (0-1) |
| report_date | TEXT (PK) | Holdings report date |

### client_portfolio

| Column | Type | Description |
|--------|------|-------------|
| portfolio_id | TEXT (PK) | User portfolio identifier |
| scheme_code | TEXT (PK, FK) | References schemes |
| allocation_weight | REAL | Allocation percentage |

---

## Scripts

All scripts are in the `scripts/` directory.

| Script | Command | Description |
|--------|---------|-------------|
| `initDb.js` | `npm run db:init` | Create database tables from schema.sql |
| `ingestNav.js` | `node scripts/ingestNav.js` | Fetch NAV history from MFAPI for all configured schemes |
| `importHoldings.js` | `node scripts/importHoldings.js <csv>` | Import portfolio holdings from a CSV file |
| `seedInstruments.js` | `node scripts/seedInstruments.js` | Seed the instruments table with stock/bond master data |
| `generateHoldings.js` | `node scripts/generateHoldings.js` | Generate sample holdings data for testing |

---

## Tech Stack

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 6.0 | Build tool and dev server |
| TailwindCSS | 3.4 | Utility-first CSS |
| react-router-dom | 7.1 | Client-side routing |
| @tanstack/react-query | 5.62 | Server state management and caching |
| react-plotly.js / plotly.js | 2.6 / 2.35 | Interactive charts |
| framer-motion | 11.15 | Animations and transitions |
| lucide-react | 0.468 | Icon library |
| axios | 1.7 | HTTP client |

### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| Express | 4.21 | HTTP server |
| better-sqlite3 | 11.7 | SQLite database driver (synchronous, native addon) |
| cors | 2.8 | Cross-origin resource sharing |

### Dev Tools

| Package | Purpose |
|---------|---------|
| nodemon | Auto-restart server on file changes |
| concurrently | Run frontend + backend simultaneously |
| autoprefixer + postcss | CSS processing for Tailwind |
| @vitejs/plugin-react | React Fast Refresh for Vite |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | For AI features | — | Anthropic Claude API key. Powers AI chat, explain button, fund summary. |
| `MISTRAL_API_KEY` | Optional | — | Mistral API key. Fallback for fund summary if Anthropic unavailable. |
| `PORT` | No | `3001` | Express server port. |
| `NODE_ENV` | No | `development` | Set to `production` to serve static files from `client/dist/`. |

---

## Project Structure

```
mf-dashboard/
├── client/                    # React frontend (Vite)
│   └── src/
│       ├── components/        # 42 React components
│       │   ├── AppLayout.jsx          # Main layout (sidebar + content + AI panel)
│       │   ├── AiPanel.jsx            # AI chat interface with SSE streaming
│       │   ├── ChartContainer.jsx     # Chart wrapper (loading, fullscreen, explain button)
│       │   ├── IntelligenceScoreGauge.jsx  # SVG gauge with 4-tier colors
│       │   ├── FundDNAChart.jsx       # 6-axis radar chart
│       │   ├── ConsistencyTimeline.jsx # Rolling returns bar chart
│       │   ├── DownsideProtectionCard.jsx  # Downside score + metrics
│       │   ├── UniverseHeatmap.jsx    # Risk vs return scatter
│       │   ├── OverlapMatrix.jsx      # Heatmap for fund overlap
│       │   └── ...
│       ├── pages/             # 7 page components
│       │   ├── DashboardPage.jsx
│       │   ├── ExplorePage.jsx
│       │   ├── ComparePage.jsx
│       │   ├── PortfolioPage.jsx
│       │   ├── ScorecardPage.jsx
│       │   ├── SchemeDetailPage.jsx
│       │   └── AdminPage.jsx
│       ├── lib/               # Utilities and hooks
│       │   ├── api.js                 # API client (axios)
│       │   ├── chartTheme.js          # Plotly color scheme
│       │   ├── useChartLayout.js      # Responsive chart layout hook
│       │   ├── formatters.js          # INR, percentage, date formatters
│       │   ├── ThemeContext.jsx        # Dark/light mode
│       │   └── AiPanelContext.jsx     # Cross-component AI panel communication
│       └── App.jsx            # Router configuration
├── server/                    # Express backend
│   ├── index.js               # Server entry point
│   ├── db.js                  # SQLite connection (better-sqlite3)
│   ├── db/
│   │   ├── schema.sql         # Table definitions
│   │   └── mf-data.db         # SQLite database file
│   ├── routes/
│   │   ├── schemes.js         # /api/schemes
│   │   ├── nav.js             # /api/nav
│   │   ├── holdings.js        # /api/holdings
│   │   ├── analytics.js       # /api/analytics (15+ endpoints)
│   │   ├── portfolio.js       # /api/portfolio
│   │   ├── dashboard.js       # /api/dashboard
│   │   ├── ai.js              # /api/ai (fund summary)
│   │   ├── agent.js           # /api/agent (AI chat with SQL generation)
│   │   └── admin.js           # /api/admin (pipeline, stats)
│   └── services/
│       └── analyticsEngine.js # Financial computations (CAGR, Sharpe, etc.)
├── scripts/                   # CLI tools for data ingestion
├── package.json
├── vite.config.js             # Vite config with API proxy to port 3001
├── tailwind.config.js
├── CLAUDE.md                  # AI assistant instructions
├── .env.example               # Environment variable template
└── DOCUMENTATION.md           # This file
```
