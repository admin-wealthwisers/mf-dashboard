import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/schemes — list all schemes, optional ?category= filter
router.get('/schemes', (req, res) => {
  const { category } = req.query;

  let rows;
  if (category) {
    // Try exact match on category first, then sub_category, then partial match on sub_category
    rows = db
      .prepare("SELECT * FROM schemes WHERE category = ? AND scheme_name NOT LIKE '%Segregated%' AND scheme_name NOT LIKE '%segregated%' ORDER BY scheme_name")
      .all(category);
    if (rows.length === 0) {
      rows = db
        .prepare("SELECT * FROM schemes WHERE sub_category = ? AND scheme_name NOT LIKE '%Segregated%' AND scheme_name NOT LIKE '%segregated%' ORDER BY scheme_name")
        .all(category);
    }
    if (rows.length === 0) {
      rows = db
        .prepare("SELECT * FROM schemes WHERE sub_category LIKE ? AND scheme_name NOT LIKE '%Segregated%' AND scheme_name NOT LIKE '%segregated%' ORDER BY scheme_name")
        .all(`%${category}%`);
    }
  } else {
    rows = db.prepare("SELECT * FROM schemes WHERE scheme_name NOT LIKE '%Segregated%' AND scheme_name NOT LIKE '%segregated%' ORDER BY scheme_name").all();
  }

  // Add hasHoldings flag
  const holdingsCodes = new Set(
    db.prepare('SELECT DISTINCT scheme_code FROM portfolio_holdings').all().map((r) => r.scheme_code)
  );
  rows = rows.map((r) => ({ ...r, hasHoldings: holdingsCodes.has(r.scheme_code) }));

  res.json({ data: rows, meta: { count: rows.length } });
});

// GET /api/schemes/:code — single scheme detail
router.get('/schemes/:code', (req, res) => {
  const row = db
    .prepare('SELECT * FROM schemes WHERE scheme_code = ?')
    .get(req.params.code);

  if (!row) {
    return res.status(404).json({ error: 'Scheme not found' });
  }
  res.json({ data: row });
});

export default router;
