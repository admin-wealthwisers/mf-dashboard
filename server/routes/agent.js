import { Router } from 'express';
import db from '../db.js';

const router = Router();

const SYSTEM_PROMPT = `You are a mutual fund data analyst assistant. You have access to a SQLite database with Indian mutual fund data.

## Database Schema

### schemes
- scheme_code TEXT PRIMARY KEY — unique fund identifier
- scheme_name TEXT — full fund name
- amc TEXT — Asset Management Company name
- category TEXT — broad category (e.g. "Open Ended Schemes")
- sub_category TEXT — detailed category (e.g. "Equity Scheme - Large Cap Fund")
- inception_date TEXT — fund launch date (YYYY-MM-DD)
- aum REAL — Assets Under Management in crores

### nav_history
- scheme_code TEXT FK → schemes
- date TEXT — date (YYYY-MM-DD)
- nav REAL — Net Asset Value on that date
- PRIMARY KEY (scheme_code, date)

### instruments
- instrument_id INTEGER PRIMARY KEY
- name TEXT — stock/bond name
- isin TEXT — ISIN code
- asset_class TEXT — Equity, Debt, etc.
- sector TEXT — industry sector
- country TEXT DEFAULT 'India'

### portfolio_holdings
- scheme_code TEXT FK → schemes
- instrument_id INTEGER FK → instruments
- weight REAL — holding weight as decimal (0-1, so 0.05 = 5%)
- report_date TEXT — portfolio report date
- PRIMARY KEY (scheme_code, instrument_id, report_date)

### portfolio_profiles — named client portfolios
- profile_id TEXT PK (slug like "rahul-sharma")
- profile_name TEXT (display name like "Rahul Sharma")
- created_at TEXT
- notes TEXT

### client_portfolio — units-based holdings per profile
- profile_id TEXT FK → portfolio_profiles
- scheme_code TEXT FK → schemes
- units REAL (number of units held)
- purchase_nav REAL (nullable, NAV at time of purchase)
- purchase_date TEXT (nullable, YYYY-MM-DD)
- PRIMARY KEY (profile_id, scheme_code)

To calculate a client's portfolio value: JOIN client_portfolio cp WITH nav_history to get latest NAV, then compute current_value = cp.units * latest_nav. For gains: (current_value - cp.units * cp.purchase_nav).

## Rules
1. Generate SELECT-only SQL. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, or CREATE statements.
2. You MUST return ONLY valid JSON with this exact structure:
   {"text": "your explanation here", "sql": "SELECT ... or null", "chartSpec": null or chart object}
3. "text" — Plain English explanation of your findings or answer.
4. "sql" — The SQL query to execute, or null if no query is needed (e.g. for greetings).
5. "chartSpec" — When a visualization would help understanding, include a Plotly chart config:
   {"traces": [{"type": "bar", "x": [...], "y": [...], "name": "..."}], "layout": {"title": "..."}}
   Set to null when no chart is needed.
6. Weights in the DB are decimals (0-1). Multiply by 100 when displaying percentages.
7. Dates are stored as YYYY-MM-DD strings.
8. Keep SQL simple and efficient. Always add LIMIT (max 50 rows).
9. For NAV returns, calculate as: (latest_nav / earlier_nav - 1) * 100 for percentage.
10. Use table aliases for readability.
11. Do NOT wrap the JSON in markdown code blocks. Return raw JSON only.

## Example Responses

Question: "How many funds are there?"
{"text": "There are 9 mutual fund schemes in the database.", "sql": "SELECT COUNT(*) as count FROM schemes", "chartSpec": null}

Question: "Show top funds by 1 year return"
{"text": "Here are the top funds ranked by their 1-year NAV return.", "sql": "SELECT s.scheme_name, ROUND((latest.nav / older.nav - 1) * 100, 2) as return_1y FROM schemes s JOIN nav_history latest ON s.scheme_code = latest.scheme_code AND latest.date = (SELECT MAX(date) FROM nav_history WHERE scheme_code = s.scheme_code) JOIN nav_history older ON s.scheme_code = older.scheme_code AND older.date = (SELECT MIN(date) FROM nav_history WHERE scheme_code = s.scheme_code AND date >= date('now', '-1 year')) WHERE older.nav > 0 ORDER BY return_1y DESC LIMIT 10", "chartSpec": {"traces": [{"type": "bar", "x": [], "y": [], "marker": {"color": "#3b82f6"}}], "layout": {"title": "Top Funds by 1Y Return", "yaxis": {"title": "Return (%)"}}}}

IMPORTANT SQL patterns:
- For 1Y return: Join nav_history twice — "latest" = MAX(date) per scheme, "older" = MIN(date) >= date('now','-1 year') per scheme. ALWAYS use per-scheme subqueries.
- For comparing across periods: Always compute dates PER SCHEME, not globally.
- Use sub_category to filter by fund type: 'Equity Scheme - Large Cap Fund', 'Equity Scheme - Mid Cap Fund', 'Equity Scheme - Flexi Cap Fund', etc.
- Chart traces x and y can be empty arrays — the server auto-populates them from SQL results.
- NEVER include explanatory text before or after the JSON. Return ONLY the JSON object.`;

const UNSAFE_SQL = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|ATTACH|DETACH|PRAGMA|VACUUM)\b/i;

function parseAIResponse(text) {
  const trimmed = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch { /* fall through */ }

  // Try extracting from code blocks
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch { /* fall through */ }
  }

  // Find the outermost JSON object by matching braces
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace >= 0) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = trimmed.slice(firstBrace, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            // AI sometimes outputs unescaped newlines inside JSON strings
            // Try to fix by replacing newlines inside string values
            try {
              let fixed = '';
              let inStr = false;
              let esc2 = false;
              for (let j = 0; j < candidate.length; j++) {
                const c = candidate[j];
                if (esc2) { fixed += c; esc2 = false; continue; }
                if (c === '\\') { fixed += c; esc2 = true; continue; }
                if (c === '"') { inStr = !inStr; fixed += c; continue; }
                if (inStr && c === '\n') { fixed += '\\n'; continue; }
                fixed += c;
              }
              return JSON.parse(fixed);
            } catch { /* fall through */ }
          }
          break;
        }
      }
    }
  }

  // Couldn't parse — return as plain text
  return { text: trimmed, sql: null, chartSpec: null };
}

// POST /api/agent/query — SSE streaming AI agent
router.post('/agent/query', async (req, res) => {
  const { question, history } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  // Determine which AI model to use based on user tier
  // Trial users → Mistral (free/cheap), Pro users → Claude (better quality)
  const userTier = req.userTier || 'trial';
  const useMistral = userTier !== 'pro';
  const mistralKey = process.env.MISTRAL_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (useMistral && !mistralKey) {
    return res.status(503).json({ error: 'AI service not configured.' });
  }
  if (!useMistral && !anthropicKey) {
    return res.status(503).json({ error: 'AI service not configured.' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // Build messages array with optional history
    const messages = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: question });

    let response;
    if (useMistral) {
      // Mistral API (for trial users — cheaper)
      response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralKey}`,
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          max_tokens: 2048,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          stream: true,
        }),
      });
    } else {
      // Anthropic Claude API (for pro users — better quality)
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages,
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      res.write(`data: ${JSON.stringify({ type: 'error', content: `API error: ${response.status}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Stream the response
    let fullText = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          // Handle both Anthropic and Mistral/OpenAI streaming formats
          let token = null;
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            // Anthropic format
            token = event.delta.text;
          } else if (event.choices?.[0]?.delta?.content) {
            // Mistral/OpenAI format
            token = event.choices[0].delta.content;
          }
          if (token) {
            fullText += token;
            res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    // Parse the full AI response
    const parsed = parseAIResponse(fullText);
    let sqlResult = null;

    // Execute SQL if present
    if (parsed.sql) {
      if (UNSAFE_SQL.test(parsed.sql)) {
        parsed.text = 'I can only run read-only queries. I cannot modify the database.';
        parsed.sql = null;
      } else {
        try {
          const rows = db.prepare(parsed.sql).all();
          sqlResult = rows.slice(0, 100);

          // Auto-populate chart traces from SQL results
          if (parsed.chartSpec && sqlResult.length > 0) {
            const keys = Object.keys(sqlResult[0]);
            if (parsed.chartSpec.traces?.length > 0 && keys.length >= 2) {
              const trace = parsed.chartSpec.traces[0];
              const labelKey = keys[0];
              const valueKey = keys[keys.length - 1];

              // Force unsupported chart types to bar
              if (['heatmap', 'contour', 'surface', 'scatter3d'].includes(trace.type)) {
                trace.type = 'bar';
              }

              const labels = sqlResult.map((r) => {
                const v = String(r[labelKey]);
                return v.length > 35 ? v.slice(0, 33) + '..' : v;
              });
              const values = sqlResult.map((r) => r[valueKey]);

              // Populate based on chart type
              if (trace.type === 'pie') {
                trace.labels = labels;
                trace.values = values;
              } else if (trace.type === 'bar' && sqlResult.length > 5) {
                // Horizontal bar for many items — fund names are readable
                trace.orientation = 'h';
                trace.y = [...labels].reverse();
                trace.x = [...values].reverse();
                if (parsed.chartSpec.layout) {
                  parsed.chartSpec.layout.margin = { l: 220, t: 30, r: 16, b: 40 };
                  const xT = parsed.chartSpec.layout.xaxis?.title;
                  const yT = parsed.chartSpec.layout.yaxis?.title;
                  parsed.chartSpec.layout.xaxis = { title: yT || '' };
                  parsed.chartSpec.layout.yaxis = { title: '' };
                }
              } else {
                trace.x = labels;
                trace.y = values;
              }
              if (!trace.name) trace.name = valueKey;
            }
          }
        } catch (err) {
          parsed.text += `\n\nSQL execution error: ${err.message}`;
          sqlResult = null;
        }
      }
    }

    // Send final result
    res.write(`data: ${JSON.stringify({
      type: 'result',
      text: parsed.text,
      sql: parsed.sql,
      data: sqlResult,
      chartSpec: parsed.chartSpec,
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Agent query error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to process query' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export default router;
