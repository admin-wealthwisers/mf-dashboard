CREATE TABLE IF NOT EXISTS schemes (
  scheme_code TEXT PRIMARY KEY,
  scheme_name TEXT NOT NULL,
  amc TEXT,
  category TEXT,
  sub_category TEXT,
  inception_date TEXT,
  aum REAL
);

CREATE TABLE IF NOT EXISTS nav_history (
  scheme_code TEXT NOT NULL,
  date TEXT NOT NULL,
  nav REAL NOT NULL,
  PRIMARY KEY (scheme_code, date),
  FOREIGN KEY (scheme_code) REFERENCES schemes(scheme_code)
);

CREATE INDEX IF NOT EXISTS idx_nav_history_scheme_date
  ON nav_history(scheme_code, date);

CREATE TABLE IF NOT EXISTS instruments (
  instrument_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  isin TEXT,
  asset_class TEXT,
  sector TEXT,
  country TEXT DEFAULT 'India'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_isin
  ON instruments(isin) WHERE isin IS NOT NULL;

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  scheme_code TEXT NOT NULL,
  instrument_id INTEGER NOT NULL,
  weight REAL NOT NULL,
  report_date TEXT NOT NULL,
  PRIMARY KEY (scheme_code, instrument_id, report_date),
  FOREIGN KEY (scheme_code) REFERENCES schemes(scheme_code),
  FOREIGN KEY (instrument_id) REFERENCES instruments(instrument_id)
);

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS portfolio_profiles (
  profile_id TEXT PRIMARY KEY,
  profile_name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS client_portfolio (
  profile_id TEXT NOT NULL,
  scheme_code TEXT NOT NULL,
  units REAL NOT NULL,
  purchase_nav REAL,
  purchase_date TEXT,
  PRIMARY KEY (profile_id, scheme_code),
  FOREIGN KEY (profile_id) REFERENCES portfolio_profiles(profile_id) ON DELETE CASCADE,
  FOREIGN KEY (scheme_code) REFERENCES schemes(scheme_code)
);
