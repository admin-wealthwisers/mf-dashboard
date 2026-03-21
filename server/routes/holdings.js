import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/holdings/:code — holdings with instrument details (latest report date)
router.get('/holdings/:code', (req, res) => {
  const { code } = req.params;

  const rows = db
    .prepare(
      `SELECT ph.scheme_code, ph.instrument_id, ph.weight, ph.report_date,
              i.name, i.isin, i.asset_class, i.sector, i.country
       FROM portfolio_holdings ph
       JOIN instruments i ON ph.instrument_id = i.instrument_id
       WHERE ph.scheme_code = ?
         AND ph.report_date = (
           SELECT MAX(report_date) FROM portfolio_holdings WHERE scheme_code = ?
         )
       ORDER BY ph.weight DESC`
    )
    .all(code, code);

  const reportDate = rows.length > 0 ? rows[0].report_date : null;

  res.json({ data: rows, meta: { count: rows.length, reportDate } });
});

export default router;
