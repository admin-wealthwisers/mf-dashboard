import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.MF_DB_PATH || join(__dirname, 'db', 'mf-data.db');

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema on first run
const schema = readFileSync(join(__dirname, 'db', 'schema.sql'), 'utf-8');
db.exec(schema);

// Migration: create users table (idempotent — schema.sql handles it, but belt-and-suspenders)
try {
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
  )`);
} catch { /* already exists */ }

// Migration: add unique index on instruments.isin (idempotent)
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_isin ON instruments(isin) WHERE isin IS NOT NULL');
} catch { /* index already exists or table not ready */ }

// Migration: update client_portfolio if it has old schema (allocation_weight column)
try {
  const cols = db.pragma('table_info(client_portfolio)').map((c) => c.name);
  if (cols.includes('allocation_weight')) {
    db.exec('DROP TABLE IF EXISTS client_portfolio');
    db.exec(`CREATE TABLE IF NOT EXISTS client_portfolio (
      profile_id TEXT NOT NULL,
      scheme_code TEXT NOT NULL,
      units REAL NOT NULL,
      purchase_nav REAL,
      purchase_date TEXT,
      PRIMARY KEY (profile_id, scheme_code),
      FOREIGN KEY (profile_id) REFERENCES portfolio_profiles(profile_id) ON DELETE CASCADE,
      FOREIGN KEY (scheme_code) REFERENCES schemes(scheme_code)
    )`);
  }
} catch { /* table doesn't exist yet, schema.sql will create it */ }

export default db;
