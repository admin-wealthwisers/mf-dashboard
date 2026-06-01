import { Router } from 'express';
import db from '../db.js';
import {
  computeCAGR,
  computePeriodCAGR,
  computeVolatility,
  computeSharpe,
  computeSortino,
  computeMaxDrawdown,
} from '../services/analyticsEngine.js';

const router = Router();

function getNavSeries(code) {
  return db
    .prepare('SELECT date, nav FROM nav_history WHERE scheme_code = ? ORDER BY date')
    .all(code);
}

const LATEST_REPORT = `(SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?)`;

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    summary: data.candidates[0].content.parts[0].text,
    model: 'gemini-2.0-flash',
  };
}

// POST /api/ai/fund-summary
router.post('/ai/fund-summary', async (req, res) => {
  const { schemeCode } = req.body;
  if (!schemeCode) {
    return res.status(400).json({ error: 'Missing schemeCode' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured.' });
  }

  try {
    // Gather fund data for context
    const scheme = db
      .prepare('SELECT scheme_code, scheme_name, amc, category, sub_category FROM schemes WHERE scheme_code = ?')
      .get(schemeCode);
    if (!scheme) return res.status(404).json({ error: 'Scheme not found' });

    const navSeries = getNavSeries(schemeCode);
    const cagr = computeCAGR(navSeries);
    const cagr1Y = computePeriodCAGR(navSeries, 1);
    const cagr3Y = computePeriodCAGR(navSeries, 3);
    const cagr5Y = computePeriodCAGR(navSeries, 5);
    const volatility = computeVolatility(navSeries);
    const sharpe = computeSharpe(navSeries);
    const sortino = computeSortino(navSeries);
    const { maxDrawdown } = computeMaxDrawdown(navSeries);

    const sectors = db
      .prepare(
        `SELECT i.sector, SUM(ph.weight) as total_weight
         FROM portfolio_holdings ph
         JOIN instruments i ON ph.instrument_id = i.instrument_id
         WHERE ph.scheme_code = ? AND ph.report_date = ${LATEST_REPORT}
         GROUP BY i.sector ORDER BY total_weight DESC LIMIT 5`
      )
      .all(schemeCode, schemeCode);

    const topHoldings = db
      .prepare(
        `SELECT i.name, ph.weight FROM portfolio_holdings ph
         JOIN instruments i ON ph.instrument_id = i.instrument_id
         WHERE ph.scheme_code = ? AND ph.report_date = ${LATEST_REPORT}
         ORDER BY ph.weight DESC LIMIT 5`
      )
      .all(schemeCode, schemeCode);

    const fmt = (v) => (v !== null ? (v * 100).toFixed(2) + '%' : 'N/A');

    const metricsContext = [
      `Fund: ${scheme.scheme_name}`,
      `AMC: ${scheme.amc}`,
      `Category: ${scheme.category} / ${scheme.sub_category}`,
      `CAGR — 1Y: ${fmt(cagr1Y)}, 3Y: ${fmt(cagr3Y)}, 5Y: ${fmt(cagr5Y)}, Since Inception: ${fmt(cagr)}`,
      `Volatility: ${fmt(volatility)}`,
      `Sharpe Ratio: ${sharpe !== null ? sharpe.toFixed(2) : 'N/A'}`,
      `Sortino Ratio: ${sortino !== null ? sortino.toFixed(2) : 'N/A'}`,
      `Max Drawdown: ${fmt(maxDrawdown)}`,
      `NAV Data Points: ${navSeries.length}`,
    ];

    if (sectors.length > 0) {
      metricsContext.push('Top Sectors: ' + sectors.map((s) => `${s.sector} (${(s.total_weight * 100).toFixed(1)}%)`).join(', '));
    }
    if (topHoldings.length > 0) {
      metricsContext.push('Top Holdings: ' + topHoldings.map((h) => `${h.name} (${(h.weight * 100).toFixed(1)}%)`).join(', '));
    }

    const systemPrompt =
      'You are a professional mutual fund analyst writing a concise research note for an institutional audience. ' +
      'Write 2-3 paragraphs analyzing the fund based on the provided metrics. ' +
      'Cover performance trends, risk characteristics, and portfolio positioning. ' +
      'Be factual and measured in tone. Do not use markdown headers or bullet points. ' +
      'If data is unavailable (N/A), acknowledge the limitation briefly.';

    const userPrompt = metricsContext.join('\n');

    const result = await callGemini(systemPrompt, userPrompt);

    res.json({
      data: {
        summary: result.summary,
        model: result.model,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('AI fund summary error:', err.message);
    res.status(502).json({ error: 'Failed to generate summary' });
  }
});

export default router;
