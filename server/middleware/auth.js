import jwt from 'jsonwebtoken';
import db from '../db.js';

// Ensure dev_allowed_users table exists
try {
  db.exec(`CREATE TABLE IF NOT EXISTS dev_allowed_users (
    email TEXT PRIMARY KEY,
    added_by TEXT,
    added_at TEXT DEFAULT (datetime('now'))
  )`);
  // Seed admin email if table is empty
  const count = db.prepare('SELECT COUNT(*) as c FROM dev_allowed_users').get().c;
  if (count === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'anjanr@gmail.com';
    db.prepare('INSERT OR IGNORE INTO dev_allowed_users (email, added_by) VALUES (?, ?)').run(adminEmail, 'system');
  }
} catch { /* table may already exist */ }

export function requireAuth(req, res, next) {
  const token = req.cookies?.['mf-token'];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const secret = process.env.JWT_SECRET || 'mf-intel-dev-secret-change-in-production';
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Dev instance access control.
 * Only allows whitelisted emails to access the dev environment.
 * Applied only when APP_URL contains 'dev.' — production is unaffected.
 */
export function requireDevAccess(req, res, next) {
  const appUrl = process.env.APP_URL || '';
  if (!appUrl.includes('dev.')) return next(); // Production — no restriction

  // Health check and auth routes always accessible
  if (req.path === '/api/health') return next();
  if (req.path.startsWith('/api/auth/')) return next();

  // Static files (frontend) — let them through, frontend handles auth
  if (!req.path.startsWith('/api/')) return next();

  // Check if user is authenticated and whitelisted
  const token = req.cookies?.['mf-token'];
  if (!token) return next(); // Let requireAuth handle the 401

  try {
    const secret = process.env.JWT_SECRET || 'mf-intel-dev-secret-change-in-production';
    const user = jwt.verify(token, secret);

    const allowed = db.prepare('SELECT 1 FROM dev_allowed_users WHERE email = ?').get(user.email);
    if (!allowed) {
      return res.status(403).json({
        error: 'Access denied — your account is not authorized for the dev environment.',
      });
    }
    next();
  } catch {
    next(); // Let downstream auth handle invalid tokens
  }
}
