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

-- ── Stock Analytics Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stocks (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  isin TEXT,
  sector TEXT,
  industry TEXT,
  market_cap REAL,
  is_nifty500 INTEGER DEFAULT 1,
  last_updated TEXT
);

CREATE TABLE IF NOT EXISTS stock_prices (
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER,
  PRIMARY KEY (symbol, date),
  FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON stock_prices(symbol, date);

CREATE TABLE IF NOT EXISTS stock_fundamentals (
  symbol TEXT NOT NULL,
  quarter TEXT NOT NULL,
  pe_ratio REAL,
  pb_ratio REAL,
  eps REAL,
  dividend_yield REAL,
  roe REAL,
  debt_equity REAL,
  revenue REAL,
  net_profit REAL,
  market_cap REAL,
  book_value REAL,
  face_value REAL,
  PRIMARY KEY (symbol, quarter),
  FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

CREATE TABLE IF NOT EXISTS stock_latest (
  symbol TEXT PRIMARY KEY,
  close REAL,
  prev_close REAL,
  change_pct REAL,
  volume INTEGER,
  pe_ratio REAL,
  pb_ratio REAL,
  eps REAL,
  market_cap REAL,
  high_52w REAL,
  low_52w REAL,
  beta REAL,
  dividend_yield REAL,
  roe REAL,
  debt_equity REAL,
  date TEXT,
  FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);

CREATE TABLE IF NOT EXISTS stock_portfolio_profiles (
  profile_id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  notes TEXT,
  FOREIGN KEY (user_email) REFERENCES users(email)
);

CREATE TABLE IF NOT EXISTS stock_portfolio_holdings (
  profile_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quantity REAL NOT NULL,
  purchase_price REAL,
  purchase_date TEXT,
  PRIMARY KEY (profile_id, symbol),
  FOREIGN KEY (profile_id) REFERENCES stock_portfolio_profiles(profile_id) ON DELETE CASCADE,
  FOREIGN KEY (symbol) REFERENCES stocks(symbol)
);
