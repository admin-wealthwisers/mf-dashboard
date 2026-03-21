import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/nav/:code — full NAV time series with optional ?from=&to= filters
router.get('/nav/:code', (req, res) => {
  const { code } = req.params;
  const { from, to } = req.query;

  let sql = 'SELECT date, nav FROM nav_history WHERE scheme_code = ?';
  const params = [code];

  if (from) {
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND date <= ?';
    params.push(to);
  }
  sql += ' ORDER BY date';

  const rows = db.prepare(sql).all(...params);
  const meta = {
    count: rows.length,
    from: rows.length > 0 ? rows[0].date : null,
    to: rows.length > 0 ? rows[rows.length - 1].date : null,
  };

  res.json({ data: rows, meta });
});

// GET /api/nav/:code/latest — latest NAV + 1d change
router.get('/nav/:code/latest', (req, res) => {
  const rows = db
    .prepare(
      'SELECT date, nav FROM nav_history WHERE scheme_code = ? ORDER BY date DESC LIMIT 2'
    )
    .all(req.params.code);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No NAV data found' });
  }

  const latest = rows[0];
  const prev = rows[1] || null;
  const change = prev ? latest.nav - prev.nav : null;
  const changePct = prev ? (change / prev.nav) * 100 : null;

  res.json({
    data: {
      date: latest.date,
      nav: latest.nav,
      prevNav: prev ? prev.nav : null,
      change: change !== null ? Math.round(change * 100) / 100 : null,
      changePct: changePct !== null ? Math.round(changePct * 100) / 100 : null,
    },
  });
});

export default router;
