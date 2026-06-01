# MF Analytics — Developer Handoff & KT Document

> **Purpose:** Complete knowledge transfer for a developer (or their AI) to understand, run, and enhance this platform.
> **Last updated:** 01-Jun-2026

---

## 1. What This Product Is

**MF Analytics** (`mfanalytics.in`) is an institutional-grade mutual fund intelligence platform for Indian investors. It provides:

- Deep analytics on 15,900+ AMFI-registered mutual fund schemes
- NAV history from 2006 onwards (16.4M+ data points)
- Portfolio holdings analysis (AMFI monthly disclosures)
- AI-powered natural language queries and fund summaries
- Stock scorecard (Nifty 500 coverage)
- User authentication, trial/subscription monetisation
- ECAS portfolio upload and analysis

**Target users:** Retail investors, financial advisors, wealth managers.

**Business model:**
- Free tier: Dashboard, Explore, basic Scorecard, Compare (2 funds)
- Trial (7 days): Full access, 10 AI chats/day
- Pro (₹299/month + GST): Full access, 20 AI chats/day, unlimited ECAS uploads
- Payment via Razorpay LIVE

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Charts | Plotly.js via react-plotly.js (dark theme always) |
| State / Data fetching | @tanstack/react-query |
| Icons | lucide-react |
| Backend | Node.js, Express (ES modules) |
| Database | SQLite via better-sqlite3 (synchronous API) |
| Auth | Google OAuth 2.0 (passport-google-oauth20), JWT in httpOnly cookie |
| AI | Google Gemini 2.0 Flash (REST API) |
| Payments | Razorpay |
| CDN / SSL | Cloudflare (proxied, Full SSL mode, self-signed cert on origin) |

---

## 3. Repository

- **GitHub:** `https://github.com/admin-wealthwisers/mf-dashboard`
- **Branches:**
  - `dev` — active development, triggers CI + auto-deploy to dev server
  - `prod` — production, auto-merged from dev after CI passes

**GitHub Actions workflows:**
- `.github/workflows/ci.yml` — runs 15 API tests + Vite build on every `dev` push
- `.github/workflows/deploy-dev.yml` — rsync to Hostinger after CI passes on `dev`
- `.github/workflows/deploy-prod.yml` — rsync to Hostinger on push to `prod`

**GitHub Secrets required:**
| Secret | Value |
|---|---|
| `EC2_HOST` | `187.127.130.66` |
| `EC2_SSH_KEY` | ED25519 deploy key (root access to Hostinger) |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## 4. Local Development Setup

```bash
# 1. Clone
git clone https://github.com/admin-wealthwisers/mf-dashboard.git
cd mf-dashboard

# 2. Install deps
npm install

# 3. Create .env (copy from .env.example and fill in)
cp .env.example .env

# 4. Run dev (starts both Express on :3001 and Vite on :5173 concurrently)
npm run dev
```

**Minimum .env for local dev:**
```
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=<your-key>
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-secret>
JWT_SECRET=<any-random-32-char-string>
ADMIN_EMAIL=<your-google-email>
APP_URL=http://localhost:5173
RAZORPAY_KEY_ID=<razorpay-key>
RAZORPAY_KEY_SECRET=<razorpay-secret>
```

**Key commands:**
```bash
npm run dev          # both servers
npm run server       # Express only (:3001)
npm run client       # Vite only (:5173)
npm run build        # production Vite build → client/dist/
node scripts/ingestNav.js          # fetch latest NAVs from MFAPI
node scripts/importHoldings.js <csv>  # import AMFI holdings CSV
```

In production, Express serves the built React app from `client/dist/`. In dev, Vite proxies API calls to Express.

---

## 5. Project Structure

```
mf-dashboard/
├── client/                    # React frontend
│   └── src/
│       ├── pages/             # One file per route
│       │   ├── DashboardPage.jsx
│       │   ├── ExplorePage.jsx
│       │   ├── ScorecardPage.jsx
│       │   ├── ComparePage.jsx
│       │   ├── PortfolioPage.jsx
│       │   ├── SchemeDetailPage.jsx
│       │   ├── AdminPage.jsx
│       │   └── stocks/        # Stock-specific pages
│       ├── components/        # Reusable UI components
│       │   ├── AISummary.jsx       # On-demand Gemini fund summary
│       │   ├── AiPanel.jsx         # Streaming AI chat (right sidebar)
│       │   ├── DrawdownChart.jsx
│       │   ├── RollingReturnsChart.jsx
│       │   ├── ScorecardNavChart.jsx
│       │   ├── FundDNAChart.jsx
│       │   ├── OverlapMatrix.jsx
│       │   ├── PaywallScreen.jsx   # Shown when free user hits limit
│       │   └── ...
│       ├── lib/
│       │   ├── api.js          # All axios API calls
│       │   └── chartTheme.js   # Plotly dark theme (always use this)
│       └── globals.css         # CSS variables / color tokens
│
├── server/
│   ├── index.js               # Express entry point
│   ├── db.js                  # SQLite connection singleton
│   ├── middleware/
│   │   └── auth.js            # JWT verify + tier checks
│   ├── routes/
│   │   ├── auth.js            # Google OAuth + JWT
│   │   ├── schemes.js         # Scheme list + detail
│   │   ├── analytics.js       # All fund analytics (scorecard, rolling, drawdown, etc.)
│   │   ├── holdings.js        # Portfolio holdings per fund
│   │   ├── dashboard.js       # Dashboard aggregates
│   │   ├── ai.js              # Gemini fund summary (POST /api/ai/fund-summary)
│   │   ├── agent.js           # Gemini streaming chat (POST /api/agent/query)
│   │   ├── portfolio.js       # Client portfolio profiles + ECAS upload
│   │   ├── payment.js         # Razorpay order + verify + webhook
│   │   ├── stocks.js          # Stock data routes
│   │   ├── stock-analytics.js # Stock scorecard analytics
│   │   ├── stock-portfolio.js # Stock portfolio routes
│   │   ├── nav.js             # NAV-specific queries
│   │   └── admin.js           # Admin panel (restricted to ADMIN_EMAIL)
│   ├── services/
│   │   ├── analyticsEngine.js      # CAGR, Sharpe, Sortino, drawdown, etc.
│   │   └── stockAnalyticsEngine.js # Stock-specific analytics
│   └── db/
│       └── mf-data.db         # SQLite database (2.2GB)
│
├── scripts/
│   ├── ingestNav.js           # Fetches daily NAV from MFAPI for all schemes
│   ├── scheduledUpdate.js     # PM2 cron wrapper — checks MFAPI date, runs incremental update
│   └── importHoldings.js      # Imports AMFI monthly holdings CSV
│
└── .github/workflows/         # CI/CD
```

---

## 6. Database Schema

All analytics are computed in SQL — never in JavaScript.

```sql
-- Core fund data
schemes         (scheme_code PK, scheme_name, amc, category, sub_category, inception_date, aum)
nav_history     (scheme_code, date, nav)                    -- 16.4M rows
instruments     (instrument_id PK, name, isin, asset_class, sector, country)
portfolio_holdings (scheme_code, instrument_id, weight, report_date)  -- AMFI monthly

-- User / auth / payments
users           (email PK, name, avatar_url, role, tier, trial_start,
                 subscription_id, subscription_status, subscription_end,
                 ecas_uploads_used, chat_count_today, chat_count_date)
payments        (payment_id, email, amount, status, razorpay_order_id, ...)
dev_allowed_users (email, added_by, added_at)
app_settings    (key, value, updated_at)                    -- launch_mode flag

-- Client portfolios (ECAS upload)
portfolio_profiles  (profile_id, profile_name, created_at, notes)
client_portfolio    (profile_id, scheme_code, units, purchase_nav, purchase_date)

-- Stocks (Nifty 500)
stocks              (symbol PK, name, isin, sector, industry, market_cap, is_nifty500)
stock_prices        (symbol, date, open, high, low, close, volume)
stock_fundamentals  (symbol, quarter, pe_ratio, pb_ratio, eps, roe, debt_equity, ...)
stock_latest        (symbol, close, prev_close, change_pct, pe_ratio, roe, ...)
```

**Key conventions:**
- `scheme_code` is the MFAPI numeric ID (e.g. `119598`)
- `report_date` in `portfolio_holdings` is the AMFI disclosure month-end (e.g. `2026-02-27`)
- All dates stored as `YYYY-MM-DD` text
- `nav` is absolute NAV value in INR

---

## 7. API Routes Reference

All routes prefixed `/api/`. Auth required unless noted.

### Auth
| Method | Route | Notes |
|---|---|---|
| GET | `/auth/google` | Initiates OAuth flow |
| GET | `/auth/google/callback` | OAuth callback, sets JWT cookie |
| GET | `/auth/me` | Returns current user + tier |
| POST | `/auth/start-trial` | Activates 7-day trial |
| POST | `/auth/logout` | Clears cookie |

### Schemes
| Method | Route | Notes |
|---|---|---|
| GET | `/schemes?q=&amc=&category=&limit=` | Search/filter schemes |
| GET | `/schemes/:code` | Single scheme detail |

### Analytics (all GET, all require `code` param)
| Route | Returns |
|---|---|
| `/analytics/scorecard/:code` | CAGR (1/3/5Y, since inception), Sharpe, Sortino, max drawdown, intelligence score |
| `/analytics/rolling/:code` | Rolling 1Y/3Y returns series |
| `/analytics/drawdown/:code` | Drawdown timeseries |
| `/analytics/sector/:code` | Sector allocation |
| `/analytics/top-holdings/:code` | Top 10 holdings |
| `/analytics/fund-dna/:code` | Market cap breakdown |
| `/analytics/risk/:code` | Risk metrics |
| `/analytics/overlap?codes=` | Overlap matrix between funds |
| `/analytics/compare?codes=` | Side-by-side comparison |
| `/analytics/universe` | All schemes with scores (Explore page) |
| `/analytics/category-top` | Top funds per category |

### AI
| Method | Route | Notes |
|---|---|---|
| POST | `/ai/fund-summary` | `{ schemeCode }` → Gemini summary. On-demand only. |
| POST | `/agent/query` | `{ question, history }` → SSE streaming Gemini chat |

### Portfolio
| Method | Route | Notes |
|---|---|---|
| GET/POST | `/portfolio/profiles` | List / create profiles |
| DELETE | `/portfolio/profiles/:id` | Delete profile |
| POST | `/portfolio/profiles/:id/holdings` | Add fund to profile |
| GET | `/portfolio/profiles/:id/analyze` | Full portfolio analysis |
| POST | `/portfolio/upload-ecas` | Upload ECAS PDF for parsing |

### Payments
| Method | Route | Notes |
|---|---|---|
| GET | `/payment/config` | Returns Razorpay key ID (public) |
| POST | `/payment/create-order` | Creates Razorpay order |
| POST | `/payment/verify` | Verifies signature, upgrades user to Pro |
| POST | `/payment/webhook` | Razorpay webhook (payment.captured) |

### Admin (restricted to `ADMIN_EMAIL`, dev domain only)
| Route | Purpose |
|---|---|
| GET `/admin/stats` | DB stats, user counts |
| GET `/admin/users` | All users with tier info |
| PUT `/admin/users/:email/tier` | Manually set user tier |
| GET/POST/DELETE `/admin/dev-access` | Manage dev-allowed users |
| POST `/admin/pipeline/start` | Trigger NAV ingest |
| POST `/admin/holdings-pipeline/start` | Trigger holdings import |
| GET/PUT `/admin/launch-mode` | Toggle launch/maintenance mode |

---

## 8. Auth & Access Control

**Flow:**
1. User clicks "Sign in with Google" → `/api/auth/google`
2. Google redirects to `/api/auth/google/callback`
3. Server creates/updates user in `users` table, issues JWT (7-day expiry) in httpOnly cookie `mf-token`
4. All protected routes verify JWT via `server/middleware/auth.js`

**Tiers:**
- `free` — default on signup
- `trial` — set by `/auth/start-trial`, expires 7 days after `trial_start`
- `pro` — set by payment webhook, expires `subscription_end`
- `admin` — manually set, full access + admin panel

**Admin access:** Only `anjanr@gmail.com`. Admin routes are hidden on prod (`mfanalytics.in`) — only accessible on `dev.mfanalytics.in`.

**Dev-only access:** During pre-launch, a whitelist (`dev_allowed_users` table) controls who can access the site. Toggle via `launch_mode` in `app_settings`.

---

## 9. AI Integration

### Fund Summary (`/api/ai/fund-summary`)
- **Trigger:** On-demand only (user clicks "Generate Analysis" button)
- **Model:** `gemini-2.0-flash`
- **Input:** Fund metadata + computed analytics (CAGR, drawdown, holdings, sector)
- **Output:** 2-paragraph analysis cached by react-query for 5 minutes
- **File:** `server/routes/ai.js` → `callGemini()`

### AI Chat Agent (`/api/agent/query`)
- **Model:** `gemini-2.0-flash` with streaming (`streamGenerateContent?alt=sse`)
- **Input:** Natural language question + last 6 messages of history
- **Flow:** Gemini generates SQL → server executes → Gemini explains results
- **Output:** Server-sent events (SSE) streamed to frontend
- **File:** `server/routes/agent.js`
- **Rate limit:** 20 queries/day for Pro, 10 for Trial

---

## 10. Data Pipeline

### NAV Data
- **Source:** [MFAPI.in](https://mfapi.in) (free public API)
- **Schedule:** PM2 cron — **11PM IST, Mon–Fri** (`30 17 * * 1-5`)
- **Script:** `scripts/scheduledUpdate.js`
- **Logic:** Probes MFAPI for latest date → if newer than DB → fetches all 15,904 schemes incrementally
- **Duration:** ~30 minutes for a full run

### Holdings Data
- **Source:** AMFI monthly portfolio disclosure (published ~25th of following month)
- **Script:** `node scripts/importHoldings.js <csv_path>`
- **Frequency:** Monthly, manual trigger
- **Current data:** Feb-2026 (Mar-2026 due)

### Stock Data
- Stock prices and fundamentals loaded separately (check `scripts/` for stock ingestion scripts)

---

## 11. Server Infrastructure

| | |
|---|---|
| **Provider** | Hostinger KVM 1, Mumbai |
| **IP** | `187.127.130.66` |
| **SSH** | `root@187.127.130.66` (password auth or deploy key) |
| **OS** | Ubuntu 24.04 LTS |
| **Specs** | 1 vCPU, 4GB RAM, 50GB NVMe |
| **Node.js** | v22.22.2 |
| **Process manager** | PM2 v7 |
| **Web server** | Nginx 1.24 |
| **SSL** | Self-signed cert on origin, Cloudflare Full mode |

**PM2 processes:**
| Process | Port | Description |
|---|---|---|
| `mf-api` | 3001 | Production API + React app |
| `mf-api-dev` | 3002 | Dev environment |
| `mf-nav-update` | — | Cron job, 11PM IST Mon–Fri |

**App paths on server:**
- Prod: `/opt/mf-dashboard/`
- Dev: `/opt/mf-dashboard-dev/`
- DB: `/opt/mf-dashboard/server/db/mf-data.db` (shared by both)

**Other app on same server:** EGA Scanner (Streamlit, port 8501, `server_name _` catch-all). Do not modify its Nginx config.

**Nginx vhosts:**
- `/etc/nginx/sites-enabled/mfanalytics` — routes `mfanalytics.in`, `www`, `stocks`, `dev` subdomains
- `/etc/nginx/sites-enabled/egascanner` — catch-all, port 8501

---

## 12. Deployment Workflow

```
Developer pushes to dev branch
        ↓
GitHub Actions CI runs (npm test + vite build)
        ↓ (on pass)
deploy-dev.yml rsyncs to /opt/mf-dashboard-dev/
pm2 restart mf-api-dev
        ↓
Auto-merge dev → prod branch
        ↓
deploy-prod.yml rsyncs to /opt/mf-dashboard/
pm2 restart mf-api
```

**Manual deploy (emergency):**
```bash
ssh root@187.127.130.66
cd /opt/mf-dashboard
git pull  # (if git is configured) or rsync from local
npm ci --omit=dev --ignore-scripts
npm rebuild better-sqlite3
pm2 restart mf-api
```

---

## 13. Frontend Conventions

- **No class components.** Functional + hooks only.
- **No raw `useEffect` for data fetching.** Use `useQuery` from `@tanstack/react-query`.
- **All API calls** go through `client/src/lib/api.js` (axios instance with base URL + credentials).
- **All colors** via CSS variables in `globals.css`. Never hardcode hex values.
- **All Plotly charts** must use the dark theme from `client/src/lib/chartTheme.js`.
  - Green `#10B981` for positive, Red `#EF4444` for negative.
- **Styling:** TailwindCSS only. No CSS modules, no inline styles except dynamic values.
- **Numbers:** 2 decimal places, INR formatting (`₹`).
- **Dates:** `DD-MMM-YYYY` format (e.g. `01-Jun-2026`).
- **Routing:** `react-router-dom` v6. Routes defined in `client/src/main.jsx`.

---

## 14. Key Third-Party Services

| Service | Purpose | Credentials location |
|---|---|---|
| Google OAuth | Authentication | `.env` — `GOOGLE_CLIENT_ID/SECRET` |
| Google Gemini | AI analysis + chat | `.env` — `GEMINI_API_KEY` |
| Razorpay | Payments | `.env` — `RAZORPAY_KEY_ID/SECRET` |
| Cloudflare | CDN, SSL, DDoS | Dashboard login (separate) |
| MFAPI.in | NAV data source | Public API, no key needed |
| GitHub Actions | CI/CD | Secrets: `EC2_HOST`, `EC2_SSH_KEY`, `GEMINI_API_KEY` |

**Razorpay:**
- Key ID: `rzp_live_STo9RhTBoUc9Z8` (LIVE, not test)
- Webhook URL: `https://mfanalytics.in/api/payment/webhook`
- Event: `payment.captured`

---

## 15. Known Issues / Technical Debt

1. **Max drawdown data anomaly** — some older funds show -100% drawdown due to bad source data from MFAPI. The Gemini prompt now flags this but the underlying data needs cleaning.
2. **Holdings data is manual** — AMFI holdings must be imported monthly by hand. No automation yet.
3. **Stock data pipeline** — stock prices/fundamentals ingestion is not fully automated.
4. **`mf-api-dev` restart count is high** — 17+ restarts visible in PM2. Investigate any startup crash on the dev server.
5. **Electron dependencies in package.json** — the app has Electron deps from a planned desktop version. `npm ci --ignore-scripts` is required on Linux servers to skip `electron-rebuild`. Could be cleaned up.
6. **No swap on Hostinger** — server has 0 swap configured. If RAM spikes, OOM is possible. Consider adding 1GB swapfile.

---

## 16. Feature Roadmap (known planned work)

- March-2026 AMFI holdings import (overdue)
- Stock data automation
- Alert/notification system for NAV movements
- SIP calculator integration
- Mobile app (React Native or PWA)

---

## 17. Contacts & Credentials Summary

| | |
|---|---|
| **Owner** | Anjan Roy (`anjanr@gmail.com`) |
| **Business** | Wealthwisers Securities, Noida, UP |
| **Business email** | `connect@mfanalytics.in` |
| **GitHub org** | `admin-wealthwisers` |
| **Server SSH** | `root@187.127.130.66` |
| **Admin panel** | `https://dev.mfanalytics.in` (login with owner Google account) |
