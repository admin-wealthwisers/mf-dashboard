# Mutual Fund Intelligence Dashboard

## Project Overview
Institutional-grade mutual fund analytics platform for Indian mutual funds.
React + Vite frontend, Express + SQLite backend, AI agent for natural language queries.

## Tech Stack
- Frontend: React 18, Vite, TailwindCSS, react-plotly.js, @tanstack/react-query, framer-motion
- Backend: Node.js, Express, better-sqlite3
- AI: Anthropic Claude API for SQL generation and chart specs
- Charts: Plotly.js with custom dark theme

## Architecture
- `server/` — Express backend with SQLite
- `client/` — React frontend (Vite)
- `scripts/` — Data ingestion CLI tools
- Monorepo with shared package.json

## Code Style
- Use ES modules (import/export)
- Functional React components with hooks only
- Use react-query for all API calls (no raw useEffect for fetching)
- TailwindCSS for styling, no CSS modules
- Use the color variables defined in globals.css for all colors
- All financial numbers: 2 decimal places, INR formatting
- All dates: DD-MMM-YYYY format (Indian standard)

## Database
- SQLite at server/db/mf-data.db
- Use better-sqlite3 (synchronous API)
- Tables: schemes, nav_history, instruments, portfolio_holdings, client_portfolio
- All analytics computed via SQL, not in JS

## Key Commands
- `npm run dev` — starts both Vite + Express (concurrently)
- `npm run server` — Express only on port 3001
- `npm run client` — Vite only on port 5173
- `node scripts/ingestNav.js` — fetch NAV data from MFAPI
- `node scripts/importHoldings.js <csv_path>` — import holdings CSV

## API Conventions
- All routes prefixed with /api/
- Return { data, meta } for lists
- Return { data } for single items
- Errors: { error: "message" }

## Chart Theme
- All Plotly charts MUST use the dark theme from lib/chartTheme.js
- Never use default Plotly colors
- Green (#10B981) for positive, Red (#EF4444) for negative

## Do NOT
- Do not use class components
- Do not use the `sqlite3` package (use better-sqlite3)
- Do not fetch data in useEffect (use react-query)
- Do not use inline colors — always reference the theme