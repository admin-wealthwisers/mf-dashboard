/**
 * Central help content repository for the MF Intelligence Dashboard.
 * Used by both the global HelpPage and contextual HelpContentPage.
 *
 * Structure: { [helpId]: { title, icon, sections: [{ heading, body }] } }
 * Body text supports basic HTML for formatting.
 */

const helpContent = {
  'getting-started': {
    title: 'Getting Started',
    icon: 'Rocket',
    sections: [
      {
        heading: 'What is MF Intelligence?',
        body: `MF Intelligence is an institutional-grade analytics platform for Indian mutual funds. It provides deep quantitative analysis, risk metrics, portfolio construction tools, and AI-powered insights across thousands of Direct-Growth mutual fund schemes sourced from MFAPI (api.mfapi.in).

The platform is built for investors, advisors, and analysts who need more than basic NAV charts — it delivers intelligence scores, fund DNA profiling, downside protection analysis, and natural language querying of the entire dataset.`,
      },
      {
        heading: 'Navigating the Interface',
        body: `The interface has four key areas:

<strong>Left Sidebar</strong> — Primary navigation between pages. Click any item to switch views. The sidebar can be collapsed with the chevron at the bottom or by pressing <kbd>Ctrl+B</kbd>.

<strong>Top Bar</strong> — Contains the global search (press <kbd>Ctrl+K</kbd> to open the Command Palette), current date, AI chat toggle, and dark/light theme switch.

<strong>Main Content Area</strong> — The active page content. Each page has a contextual help button (?) in the top-right area.

<strong>AI Chat Panel</strong> — A sliding panel on the right side. Toggle it from the top bar. Ask questions in natural language about any fund or the entire dataset.`,
      },
      {
        heading: 'Keyboard Shortcuts',
        body: `<kbd>Ctrl+K</kbd> — Open Command Palette (search for any fund by name, code, or AMC)
<kbd>Ctrl+B</kbd> — Toggle sidebar collapse
<kbd>Escape</kbd> — Close modals and panels`,
      },
      {
        heading: 'Data Source',
        body: `All mutual fund data is sourced from MFAPI (api.mfapi.in), a free and open API for Indian mutual fund NAV data. The database includes historical NAV data, scheme metadata, fund house information, and scheme categories. Data can be updated from the Admin page.`,
      },
    ],
  },

  dashboard: {
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    sections: [
      {
        heading: 'Overview',
        body: `The Dashboard is your landing page — a market snapshot showing key metrics and performance highlights across your entire fund universe. It answers the question: "What's happening in the market right now?"`,
      },
      {
        heading: 'Metric Cards',
        body: `<strong>Schemes Tracked</strong> — Total number of mutual fund schemes in your database, with total NAV data points.

<strong>Market Status</strong> — Whether the Indian stock market is currently open or closed (trading hours: 9:15 AM - 3:30 PM IST, Mon-Fri), and the date of the latest NAV data available.

<strong>Top Performer (1Y Return)</strong> — The scheme with the highest 1-year return among mainstream equity and hybrid categories (shown in green). Only considers funds from widely recognized categories to avoid misleading results from illiquid or niche funds.

<strong>Worst Performer (1Y Return)</strong> — The scheme with the lowest 1-year return among the same mainstream categories (shown in red).

<strong>Mainstream categories included:</strong> Large Cap, Mid Cap, Small Cap, Multi Cap, Flexi Cap, Large & Mid Cap, Focused, Contra, Value, ELSS, Sectoral/Thematic, Aggressive Hybrid, Balanced/BAF, Multi Asset, and Equity Savings. Debt funds, liquid funds, overnight funds, FMPs, interval funds, and other niche categories are excluded from the top/worst performer calculation as their return profiles are not directly comparable to equity.`,
      },
      {
        heading: 'Category Performance Chart',
        body: `A horizontal bar chart showing average 1-year return by fund category. Categories are derived from SEBI's mutual fund classification (e.g., Large Cap, Mid Cap, Flexi Cap, Liquid, Dynamic Bond, etc.). Only categories with 3 or more schemes are shown. Extreme outliers (segregated portfolios, defunct funds with >200% returns) are excluded.

This helps identify which asset classes are outperforming or underperforming relative to each other.`,
      },
      {
        heading: 'Scheme Distribution Chart',
        body: `A donut chart showing how many schemes exist in each category. This reveals the composition of your fund universe — for example, Index/ETF and Sectoral/Thematic funds typically have the highest count, while niche categories like Contra or Children's Funds have fewer schemes.

Hover over any slice to see the exact count and percentage.`,
      },
      {
        heading: 'Latest NAV Updates Table',
        body: `A table showing the most recent NAV values for all tracked schemes, sorted by the latest update. Columns include scheme name, latest NAV, 1-day change (absolute and percentage), and the date.`,
      },
    ],
  },

  explore: {
    title: 'Explore Funds',
    icon: 'Search',
    sections: [
      {
        heading: 'Overview',
        body: `The Explore page is your fund discovery tool. Browse, search, and filter through the entire fund universe. Switch between a card grid view and a scatter plot visualization to find funds that match your criteria.`,
      },
      {
        heading: 'Search & Filters',
        body: `<strong>Search Box</strong> — Type any part of a fund name, AMC name, or scheme code to filter instantly.

<strong>Category Checkboxes</strong> — Filter by fund category using clean SEBI classifications (Large Cap, Mid Cap, Small Cap, Flexi Cap, ELSS, Liquid, Dynamic Bond, Arbitrage, etc.).

<strong>AMC Dropdown</strong> — Filter by specific fund house (e.g., HDFC, SBI, ICICI Prudential).

<strong>Sort Options</strong> — Sort the results by name, CAGR, volatility, or Sharpe ratio.`,
      },
      {
        heading: 'List View (Card Grid)',
        body: `Each fund card shows:
- Fund name and AMC
- Category badge
- Key metrics (CAGR, volatility, Sharpe ratio)
- A small NAV sparkline showing recent trend

Click any card to navigate to the full Scheme Detail page. Results are paginated at 20 per page.`,
      },
      {
        heading: 'Universe Heatmap (Scatter View)',
        body: `A scatter plot of all funds in the universe where:
- <strong>X-axis</strong> = Annualized Volatility (risk)
- <strong>Y-axis</strong> = CAGR (return)

Each dot represents a fund. This visualization helps you quickly identify:
- <strong>Top-left quadrant</strong>: High return, low risk (ideal)
- <strong>Top-right quadrant</strong>: High return, high risk
- <strong>Bottom-left quadrant</strong>: Low return, low risk
- <strong>Bottom-right quadrant</strong>: Low return, high risk (avoid)

Hover over any dot to see the fund name and metrics. Click to open the fund detail page.`,
      },
    ],
  },

  compare: {
    title: 'Compare Funds',
    icon: 'GitCompareArrows',
    sections: [
      {
        heading: 'Overview',
        body: `The Compare page lets you place up to 5 funds side by side to evaluate their performance, risk, and portfolio characteristics. This is the core tool for making investment selection decisions.`,
      },
      {
        heading: 'Adding Funds to Compare',
        body: `Use the Fund Selector dropdown to search and add funds. You can add up to 5 funds. Each fund is assigned a unique color for easy identification across all charts. Remove a fund by clicking the X on its chip.

You can also share comparison links — the URL updates with the selected scheme codes (e.g., ?codes=119551,119598).`,
      },
      {
        heading: 'Comparison Metrics Table',
        body: `A table showing key metrics for each selected fund, side by side:

<strong>CAGR</strong> — Compound Annual Growth Rate. The annualized return of the fund. Higher is better.

<strong>Volatility</strong> — Annualized standard deviation of returns. Measures how much the fund's value fluctuates. Lower means more stable.

<strong>Sharpe Ratio</strong> — Risk-adjusted return (return per unit of risk). Higher is better. A Sharpe above 1.0 is generally considered good.

<strong>Sortino Ratio</strong> — Similar to Sharpe but only penalizes downside volatility. More relevant for risk-averse investors.

<strong>Max Drawdown</strong> — The largest peak-to-trough decline in NAV. Shows the worst-case loss. Lower (closer to 0%) is better.

The best value in each row is highlighted to help you quickly identify the leader in each metric.`,
      },
      {
        heading: 'Normalized NAV Growth Chart',
        body: `All selected funds are rebased to 100 on the same starting date, allowing a direct visual comparison of cumulative returns. This is the most important comparison chart because it normalizes away the difference in NAV levels.

For example, if Fund A has NAV 500 and Fund B has NAV 50, both start at 100 on the chart, making their relative growth directly comparable.`,
      },
      {
        heading: 'Sector Comparison',
        body: `A grouped bar chart showing how each fund allocates across sectors (Financial, Technology, Healthcare, etc.). This reveals whether funds are concentrated in the same sectors or offer diversification.`,
      },
      {
        heading: 'Holdings Overlap Matrix',
        body: `A heatmap showing the percentage of common holdings between every pair of funds. High overlap (dark color, e.g., 80%) means the two funds hold many of the same stocks — adding both to a portfolio provides limited diversification benefit.

Low overlap (light color, e.g., 15%) means the funds are complementary and combining them improves diversification.`,
      },
    ],
  },

  portfolio: {
    title: 'Portfolio Manager',
    icon: 'Briefcase',
    sections: [
      {
        heading: 'Overview',
        body: `The Portfolio page lets you create named client portfolios, add mutual fund holdings with units, track current values and gains, and analyze the combined exposure. You can manage multiple portfolios (one per client) and switch between them.`,
      },
      {
        heading: 'Creating a Portfolio',
        body: `1. Click <strong>"New Portfolio"</strong> and enter the client's name (e.g., "Rahul Sharma").
2. A portfolio profile is created with a unique ID derived from the name.
3. You can create multiple portfolios for different clients.
4. Switch between portfolios using the dropdown at the top.
5. Delete a portfolio with the Delete button (removes all holdings).`,
      },
      {
        heading: 'Adding Holdings',
        body: `There are two ways to add funds to a portfolio:

<strong>Manual Entry:</strong>
1. Click "Add Fund" at the bottom of the holdings table
2. Enter the number of units held
3. Optionally enter the purchase NAV and purchase date (for gain/loss tracking)
4. Select the fund from the dropdown and it's added immediately

<strong>CSV Upload:</strong>
1. Download the template CSV using the "Template" button
2. Fill in your holdings: fund name (or scheme code), units, purchase NAV (optional), purchase date (optional)
3. Click "Upload CSV" and select your file
4. Review the matched funds — the system auto-matches fund names (fuzzy) or exact scheme codes
5. Confirm to import all matched holdings`,
      },
      {
        heading: 'Portfolio Valuation',
        body: `<strong>Current Value</strong> — Units × Latest NAV for each fund, summed across all holdings.

<strong>Invested Value</strong> — Units × Purchase NAV (only shown when purchase NAV was provided).

<strong>Gain/Loss</strong> — Current Value minus Invested Value, shown both as absolute amount and percentage.

<strong>Weight</strong> — Each fund's current value as a percentage of total portfolio value. Weights are auto-calculated based on current NAV, not manually entered.`,
      },
      {
        heading: 'Portfolio Analysis',
        body: `Analysis is automatically computed from current portfolio weights:

<strong>Unique Stocks</strong> — Total distinct stocks across all funds (requires holdings data).

<strong>Top 10 Concentration</strong> — Combined weight of the top 10 stock holdings.

<strong>HHI Index</strong> — Herfindahl-Hirschman concentration measure (0-10,000). Below 1,500 = well-diversified.

<strong>Sector Exposure</strong> — Horizontal bar chart of portfolio allocation by sector.

<strong>Overlap Matrix</strong> — Pairwise overlap between funds in the portfolio.`,
      },
      {
        heading: 'AI Chat Integration',
        body: `You can ask the AI Assistant questions about any portfolio by name:
- "What is Rahul's portfolio value?"
- "Which fund has the highest gain in Priya's portfolio?"
- "Compare Rahul and Priya's portfolios"

The AI queries the portfolio database directly and can compute values, gains, and comparisons across profiles.`,
      },
      {
        heading: 'Overlap Matrix',
        body: `Same as the Compare page overlap matrix, but applied to your portfolio funds. Helps identify if your chosen funds are too similar, reducing the diversification benefit.`,
      },
    ],
  },

  scorecard: {
    title: 'Fund Scorecard',
    icon: 'Award',
    sections: [
      {
        heading: 'Overview',
        body: `The Scorecard is the deepest single-fund analysis page. It provides an Intelligence Score, fund DNA profiling, consistency analysis, downside protection metrics, and comprehensive risk/return analytics. Use this to thoroughly evaluate any fund before investing.`,
      },
      {
        heading: 'Intelligence Score',
        body: `A composite score from 0 to 100 that rates the fund across four dimensions:

<strong>Performance (30% weight)</strong> — CAGR relative to category peers, alpha generation, and return consistency.

<strong>Consistency (25% weight)</strong> — How stable the returns are over time. Measured by the percentage of rolling periods with positive returns and the stability of rolling return distributions.

<strong>Risk Management (25% weight)</strong> — Sharpe ratio, Sortino ratio, maximum drawdown, and recovery time from drawdowns.

<strong>Diversification (20% weight)</strong> — Portfolio concentration (HHI), number of holdings, sector spread, and single-stock exposure limits.

Score interpretation:
- <strong>80-100</strong>: Excellent — Top-tier fund with strong metrics across all dimensions
- <strong>60-79</strong>: Good — Solid fund with minor weaknesses
- <strong>40-59</strong>: Average — Middling performance, notable risk areas
- <strong>0-39</strong>: Below Average — Significant concerns in multiple areas`,
      },
      {
        heading: 'Fund DNA Radar Chart',
        body: `A spider/radar chart showing the fund's profile across multiple dimensions:
- Return magnitude
- Return consistency
- Volatility control
- Drawdown recovery
- Risk-adjusted returns (Sharpe)
- Portfolio diversification

Each axis goes from 0 (center) to 100 (outer edge). A wider, more rounded shape indicates a well-balanced fund. A lopsided shape reveals strengths and weaknesses at a glance.`,
      },
      {
        heading: 'Consistency Timeline',
        body: `A timeline chart showing the fund's rolling returns over time. Color-coded periods indicate:
- <strong>Green</strong>: Positive rolling returns (fund is generating gains)
- <strong>Red</strong>: Negative rolling returns (fund is losing value)

A consistently green timeline indicates the fund delivers steady returns regardless of market conditions.`,
      },
      {
        heading: 'Downside Protection',
        body: `Metrics focused specifically on how the fund behaves during market downturns:

<strong>Max Drawdown</strong> — The worst peak-to-trough decline in the fund's history. Shows the largest loss an investor could have experienced.

<strong>Recovery Time</strong> — How many days it took to recover from the maximum drawdown. Shorter is better.

<strong>Downside Capture</strong> — When the market falls, what percentage of that fall does the fund capture? Below 100% means the fund falls less than the market (good protection).

<strong>Downside Deviation</strong> — Standard deviation of only negative returns. Unlike volatility (which counts all movement), this focuses solely on harmful downward movement.`,
      },
      {
        heading: 'Metrics Quadrants',
        body: `Four card groups showing detailed metrics:

<strong>Performance Quadrant</strong> — CAGR, absolute return, alpha, best/worst periods.

<strong>Risk Quadrant</strong> — Volatility, Sharpe, Sortino, max drawdown, VaR.

<strong>Portfolio Quadrant</strong> — Number of holdings, top-10 weight, sector concentration, HHI.

<strong>Downside Quadrant</strong> — Downside deviation, capture ratio, recovery metrics.`,
      },
      {
        heading: 'Charts',
        body: `<strong>NAV Growth</strong> — Historical NAV with optional timeframe selection (1Y, 3Y, 5Y, All).

<strong>Rolling Returns</strong> — Distribution of rolling 1-year, 3-year, and 5-year returns. Shows the range of outcomes an investor might experience.

<strong>Drawdown Chart</strong> — Visualizes every drawdown period, with depth and duration. Helps understand the fund's risk behavior over time.

<strong>Sector Exposure</strong> — Pie/bar chart of sector allocation from the fund's latest portfolio.`,
      },
      {
        heading: 'AI Fund Summary',
        body: `An AI-generated narrative summary of the fund's characteristics, strengths, and risk factors. Powered by the Anthropic Claude API (requires an API key configured in your .env file).`,
      },
    ],
  },

  'scheme-detail': {
    title: 'Scheme Detail',
    icon: 'FileText',
    sections: [
      {
        heading: 'Overview',
        body: `The Scheme Detail page provides a comprehensive view of an individual mutual fund scheme. Access it by clicking any fund from the Explore page, Dashboard, or Command Palette search results.`,
      },
      {
        heading: 'Header & Metrics Ribbon',
        body: `The top section shows:
- Fund name and AMC (fund house)
- Category badge (e.g., Open Ended, Equity)
- Key metrics in a horizontal ribbon: Latest NAV, 1-day change, CAGR, Volatility, Sharpe Ratio, Max Drawdown

Green/red colors indicate positive/negative values.`,
      },
      {
        heading: 'NAV Growth Chart',
        body: `Historical NAV plotted over time. Use the timeframe selector (1Y, 3Y, 5Y, All) to adjust the view period. This is the most basic indicator of fund performance.`,
      },
      {
        heading: 'Rolling Returns Chart',
        body: `Shows the distribution of rolling returns over 1-year, 3-year, and 5-year windows. A rolling return measures the return you would have earned if you invested for that period starting on any given day.

If the chart shows mostly positive values with tight clustering, the fund delivers consistent returns. Wide spread or frequent negatives indicate inconsistency.`,
      },
      {
        heading: 'Drawdown Chart',
        body: `Visualizes every decline from a peak NAV value. Each dip below the zero line represents a drawdown period. The depth shows how much was lost, and the width shows how long recovery took.

Key things to look for:
- How deep are the worst drawdowns?
- How quickly does the fund recover?
- Are drawdowns becoming less severe over time?`,
      },
      {
        heading: 'Sector Exposure & Holdings',
        body: `<strong>Sector Exposure</strong> — Chart showing the fund's allocation across market sectors (Financial, Technology, Healthcare, etc.) based on the latest available portfolio data.

<strong>Holdings Table</strong> — Detailed list of individual stocks/bonds held by the fund, including name, ISIN, sector, and weight in the portfolio.`,
      },
    ],
  },

  admin: {
    title: 'Admin & Data Management',
    icon: 'Settings',
    sections: [
      {
        heading: 'Overview',
        body: `The Admin page manages your database and data pipeline. Use it to view database statistics, update NAV data, and monitor ingestion progress.`,
      },
      {
        heading: 'Database Statistics',
        body: `Shows current database state:
- Total schemes in the database
- Total NAV records (data points)
- Total holdings and instruments tracked
- Latest NAV date (how fresh your data is)
- Category breakdown chips showing how many schemes per category`,
      },
      {
        heading: 'Data Pipeline',
        body: `The pipeline fetches NAV data from MFAPI and stores it in your local SQLite database. Three modes are available:

<strong>Direct-Growth Plans (~5,000 schemes)</strong> — Fetches all Direct Plan Growth schemes (excludes Regular plans, Dividend/IDCW options). This is the recommended mode for most users.

<strong>Full (all MFAPI schemes ~37,500)</strong> — Fetches every single scheme from MFAPI, including Regular plans, Dividend options, and closed funds. Takes much longer.

<strong>Incremental (last 30 days)</strong> — Only updates NAV data for schemes already in your database, fetching only the last 30 days of data. Fastest option for daily updates.`,
      },
      {
        heading: 'Running the Pipeline',
        body: `1. Select a pipeline mode from the dropdown
2. Click "Start Pipeline"
3. Watch the live progress stream showing:
   - Current scheme being processed (X of Y)
   - Number of NAV records inserted
   - Success/failure count
   - Progress bar
4. You can abort the pipeline at any time with the Abort button
5. Once complete, click "Refresh Stats" to see updated database counts`,
      },
      {
        heading: 'Data Freshness',
        body: `MFAPI typically updates NAV data by 11 PM IST on trading days. For the most current data, run an Incremental update each evening. The "Latest NAV Date" in the stats section shows how fresh your data is.`,
      },
    ],
  },

  'ai-chat': {
    title: 'AI Chat & Natural Language Queries',
    icon: 'MessageSquare',
    sections: [
      {
        heading: 'Overview',
        body: `The AI Chat panel (accessible from the top bar) lets you ask questions about your fund data in natural language. The AI agent translates your question into SQL queries, executes them against the database, and returns both text answers and interactive charts.`,
      },
      {
        heading: 'How It Works',
        body: `Behind the scenes:
1. Your question is sent to the Claude AI API
2. Claude analyzes the database schema and generates an appropriate SQL query
3. The SQL is executed against your local SQLite database
4. Results are formatted as text and optionally as a Plotly chart specification
5. Both are streamed back to you in real-time

This means the AI can answer any question that can be answered from your NAV and holdings data.`,
      },
      {
        heading: 'Example Questions',
        body: `Try asking:
- "Which large cap funds have the best 3-year CAGR?"
- "Show me a chart of SBI Bluechip Fund vs HDFC Top 100 performance"
- "What are the top 5 funds by Sharpe ratio?"
- "Compare sector allocation of ICICI Prudential and Axis Bluechip"
- "Which funds have the lowest maximum drawdown?"
- "Show me the NAV trend of Parag Parikh Flexi Cap over the last 5 years"`,
      },
      {
        heading: 'Requirements',
        body: `The AI chat requires an Anthropic Claude API key. Configure it in your .env file:

ANTHROPIC_API_KEY=sk-ant-your-key-here

Without this key, the AI chat and AI fund summaries will not function. All other features (charts, analytics, comparisons) work without any API key.`,
      },
    ],
  },

  'api-keys': {
    title: 'API Key Configuration',
    icon: 'Key',
    sections: [
      {
        heading: 'Where to Configure Keys',
        body: `API keys are stored in a .env file in your application data directory:

<strong>Windows:</strong> %APPDATA%\\mf-dashboard\\.env
<strong>If running in dev mode:</strong> Project root .env file

Open this file in any text editor (Notepad, VS Code, etc.) and add your keys.`,
      },
      {
        heading: 'Anthropic Claude API Key',
        body: `<strong>Purpose:</strong> Powers the AI chat panel, "Explain" button on charts, and AI-generated fund summaries.

<strong>How to get:</strong>
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys
4. Create a new key
5. Copy it and paste into your .env file:

ANTHROPIC_API_KEY=sk-ant-your-key-here

<strong>Cost:</strong> Pay-per-use. A typical analysis session uses ~$0.01-0.05 worth of API calls.`,
      },
      {
        heading: 'Mistral API Key (Optional)',
        body: `<strong>Purpose:</strong> Fallback for AI fund summaries if the Anthropic API is unavailable.

<strong>How to get:</strong>
1. Visit https://console.mistral.ai/
2. Sign up or log in
3. Create an API key
4. Add to your .env:

MISTRAL_API_KEY=your-key-here

This key is entirely optional. The app works fully without it.`,
      },
      {
        heading: 'What Works Without Keys',
        body: `Everything except AI features works without any API keys:
- All charts and analytics
- Fund comparison
- Portfolio analysis
- Intelligence scores and metrics
- Data pipeline and updates
- Search and exploration

Only these features require an API key:
- AI Chat panel (requires Anthropic key)
- AI Fund Summaries (requires Anthropic or Mistral key)`,
      },
    ],
  },
};

export default helpContent;
