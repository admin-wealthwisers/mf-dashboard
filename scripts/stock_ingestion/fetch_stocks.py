#!/usr/bin/env python3
"""
Fetch Nifty 500 stock data from Yahoo Finance and write to SQLite.
Usage: python fetch_stocks.py [--db PATH] [--incremental] [--symbol SYMBOL]
"""

import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run: pip install yfinance", file=sys.stderr)
    sys.exit(1)

# Nifty 500 symbols — fetched from NSE or hardcoded fallback
# Yahoo Finance uses .NS suffix for NSE stocks
NIFTY500_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv"

DEFAULT_DB = os.path.join(os.path.dirname(__file__), '..', '..', 'server', 'db', 'mf-data.db')

def get_nifty500_symbols():
    """Fetch Nifty 500 constituent list from NSE or use fallback."""
    try:
        import urllib.request
        req = urllib.request.Request(NIFTY500_URL, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, timeout=30)
        import csv, io
        content = response.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(content))
        symbols = []
        for row in reader:
            sym = row.get('Symbol', '').strip()
            name = row.get('Company Name', '').strip()
            industry = row.get('Industry', '').strip()
            if sym:
                symbols.append({'symbol': sym, 'name': name, 'industry': industry})
        if symbols:
            print(f"Fetched {len(symbols)} Nifty 500 symbols from NSE")
            return symbols
    except Exception as e:
        print(f"Warning: Could not fetch from NSE ({e}), using yfinance search", file=sys.stderr)

    # Fallback: well-known Nifty 50 + some large caps
    return get_fallback_symbols()


def get_fallback_symbols():
    """Fallback list of major Indian stocks if NSE CSV fails."""
    major = [
        'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC',
        'SBIN', 'BHARTIARTL', 'BAJFINANCE', 'KOTAKBANK', 'LT', 'HCLTECH', 'AXISBANK',
        'ASIANPAINT', 'MARUTI', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'WIPRO',
        'NESTLEIND', 'TECHM', 'POWERGRID', 'NTPC', 'M&M', 'TATAMOTORS', 'BAJAJFINSV',
        'HDFCLIFE', 'ONGC', 'JSWSTEEL', 'TATASTEEL', 'ADANIENT', 'ADANIPORTS',
        'COALINDIA', 'GRASIM', 'CIPLA', 'DRREDDY', 'BPCL', 'DIVISLAB', 'APOLLOHOSP',
        'EICHERMOT', 'BRITANNIA', 'HEROMOTOCO', 'INDUSINDBK', 'SBILIFE', 'TATACONSUM',
        'BAJAJ-AUTO', 'HINDALCO', 'UPL', 'SHREECEM'
    ]
    return [{'symbol': s, 'name': s, 'industry': ''} for s in major]


def setup_db(db_path):
    """Connect to SQLite and ensure stock tables exist."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript("""
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
            open REAL, high REAL, low REAL, close REAL, volume INTEGER,
            PRIMARY KEY (symbol, date),
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        );
        CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON stock_prices(symbol, date);
        CREATE TABLE IF NOT EXISTS stock_fundamentals (
            symbol TEXT NOT NULL, quarter TEXT NOT NULL,
            pe_ratio REAL, pb_ratio REAL, eps REAL, dividend_yield REAL,
            roe REAL, debt_equity REAL, revenue REAL, net_profit REAL,
            market_cap REAL, book_value REAL, face_value REAL,
            PRIMARY KEY (symbol, quarter),
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        );
        CREATE TABLE IF NOT EXISTS stock_latest (
            symbol TEXT PRIMARY KEY,
            close REAL, prev_close REAL, change_pct REAL, volume INTEGER,
            pe_ratio REAL, pb_ratio REAL, eps REAL, market_cap REAL,
            high_52w REAL, low_52w REAL, beta REAL,
            dividend_yield REAL, roe REAL, debt_equity REAL, date TEXT,
            FOREIGN KEY (symbol) REFERENCES stocks(symbol)
        );
    """)
    conn.commit()
    return conn


def fetch_and_store_stock(conn, symbol, name, industry, period="10y", incremental=False):
    """Fetch price history + fundamentals for one stock and write to DB."""
    yf_symbol = f"{symbol}.NS"

    try:
        ticker = yf.Ticker(yf_symbol)

        # Fetch price history
        if incremental:
            hist = ticker.history(period="7d", auto_adjust=True)
        else:
            hist = ticker.history(period=period, auto_adjust=True)

        if hist.empty:
            return {'status': 'no_data', 'prices': 0}

        # Get fundamentals
        info = {}
        try:
            info = ticker.info or {}
        except Exception:
            pass

        sector = info.get('sector', '')
        ind = info.get('industry', industry or '')
        isin = info.get('isin', '')
        mcap = info.get('marketCap', None)
        full_name = info.get('longName', name or symbol)

        # Upsert stock metadata
        conn.execute("""
            INSERT INTO stocks (symbol, name, isin, sector, industry, market_cap, is_nifty500, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
            ON CONFLICT(symbol) DO UPDATE SET
                name=excluded.name, isin=COALESCE(excluded.isin, stocks.isin),
                sector=COALESCE(excluded.sector, stocks.sector),
                industry=COALESCE(excluded.industry, stocks.industry),
                market_cap=COALESCE(excluded.market_cap, stocks.market_cap),
                last_updated=datetime('now')
        """, (symbol, full_name, isin, sector, ind, mcap))

        # Insert price history
        prices_inserted = 0
        for date_idx, row in hist.iterrows():
            date_str = date_idx.strftime('%Y-%m-%d')
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO stock_prices (symbol, date, open, high, low, close, volume)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (symbol, date_str,
                      round(float(row['Open']), 2) if row['Open'] == row['Open'] else None,
                      round(float(row['High']), 2) if row['High'] == row['High'] else None,
                      round(float(row['Low']), 2) if row['Low'] == row['Low'] else None,
                      round(float(row['Close']), 2) if row['Close'] == row['Close'] else None,
                      int(row['Volume']) if row['Volume'] == row['Volume'] else 0))
                prices_inserted += 1
            except Exception:
                continue

        # Update stock_latest
        pe = info.get('trailingPE') or info.get('forwardPE')
        pb = info.get('priceToBook')
        eps_val = info.get('trailingEps')
        div_yield = info.get('dividendYield')
        if div_yield:
            # Yahoo returns ratio (e.g., 0.0041) or percentage (e.g., 0.41)
            # If > 1, it's already a percentage; otherwise multiply by 100
            div_yield = round(div_yield * 100, 2) if div_yield < 1 else round(div_yield, 2)
        roe_val = info.get('returnOnEquity')
        if roe_val:
            roe_val = round(roe_val * 100, 2)
        de = info.get('debtToEquity')
        if de:
            de = round(de / 100, 2)  # Yahoo gives as percentage
        beta_val = info.get('beta')
        high52 = info.get('fiftyTwoWeekHigh')
        low52 = info.get('fiftyTwoWeekLow')
        prev_close = info.get('previousClose') or info.get('regularMarketPreviousClose')
        last_close = round(float(hist['Close'].iloc[-1]), 2) if len(hist) > 0 else None
        last_date = hist.index[-1].strftime('%Y-%m-%d') if len(hist) > 0 else None
        last_vol = int(hist['Volume'].iloc[-1]) if len(hist) > 0 else None

        change_pct = None
        if last_close and prev_close and prev_close > 0:
            change_pct = round((last_close - prev_close) / prev_close * 100, 2)

        conn.execute("""
            INSERT INTO stock_latest (symbol, close, prev_close, change_pct, volume,
                pe_ratio, pb_ratio, eps, market_cap, high_52w, low_52w, beta,
                dividend_yield, roe, debt_equity, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(symbol) DO UPDATE SET
                close=excluded.close, prev_close=excluded.prev_close,
                change_pct=excluded.change_pct, volume=excluded.volume,
                pe_ratio=COALESCE(excluded.pe_ratio, stock_latest.pe_ratio),
                pb_ratio=COALESCE(excluded.pb_ratio, stock_latest.pb_ratio),
                eps=COALESCE(excluded.eps, stock_latest.eps),
                market_cap=COALESCE(excluded.market_cap, stock_latest.market_cap),
                high_52w=COALESCE(excluded.high_52w, stock_latest.high_52w),
                low_52w=COALESCE(excluded.low_52w, stock_latest.low_52w),
                beta=COALESCE(excluded.beta, stock_latest.beta),
                dividend_yield=COALESCE(excluded.dividend_yield, stock_latest.dividend_yield),
                roe=COALESCE(excluded.roe, stock_latest.roe),
                debt_equity=COALESCE(excluded.debt_equity, stock_latest.debt_equity),
                date=excluded.date
        """, (symbol, last_close, prev_close, change_pct, last_vol,
              pe, pb, eps_val, mcap, high52, low52, beta_val,
              div_yield, roe_val, de, last_date))

        # Store current fundamentals as a quarterly snapshot
        quarter = f"Q{((datetime.now().month - 1) // 3) + 1}FY{datetime.now().year % 100 + (1 if datetime.now().month > 3 else 0):02d}"
        conn.execute("""
            INSERT OR REPLACE INTO stock_fundamentals
                (symbol, quarter, pe_ratio, pb_ratio, eps, dividend_yield, roe, debt_equity,
                 revenue, net_profit, market_cap, book_value, face_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (symbol, quarter, pe, pb, eps_val, div_yield, roe_val, de,
              info.get('totalRevenue'), info.get('netIncomeToCommon'),
              mcap, info.get('bookValue'), info.get('faceValue')))

        conn.commit()
        return {'status': 'ok', 'prices': prices_inserted}

    except Exception as e:
        return {'status': 'error', 'error': str(e), 'prices': 0}


def main():
    parser = argparse.ArgumentParser(description='Fetch Nifty 500 stock data from Yahoo Finance')
    parser.add_argument('--db', default=DEFAULT_DB, help='Path to SQLite database')
    parser.add_argument('--incremental', action='store_true', help='Only fetch last 7 days')
    parser.add_argument('--symbol', help='Fetch single symbol only')
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    print(f"Database: {db_path}")
    conn = setup_db(db_path)

    if args.symbol:
        symbols = [{'symbol': args.symbol, 'name': args.symbol, 'industry': ''}]
    else:
        symbols = get_nifty500_symbols()

    total = len(symbols)
    succeeded = 0
    failed = 0
    total_prices = 0

    print(f"Processing {total} stocks ({'incremental' if args.incremental else 'full 10yr'})...")

    for i, s in enumerate(symbols):
        sym = s['symbol']
        result = fetch_and_store_stock(conn, sym, s['name'], s['industry'],
                                        incremental=args.incremental)

        if result['status'] == 'ok':
            succeeded += 1
            total_prices += result['prices']
        elif result['status'] == 'no_data':
            failed += 1
        else:
            failed += 1

        if (i + 1) % 10 == 0 or i == total - 1:
            msg = json.dumps({
                'current': i + 1, 'total': total,
                'succeeded': succeeded, 'failed': failed,
                'pricesInserted': total_prices,
                'message': f"{sym} ({result['prices']} prices)"
            })
            print(msg, flush=True)

        # Rate limiting — be gentle with Yahoo Finance
        time.sleep(0.3)

    conn.close()

    print(f"DONE: {json.dumps({'total': total, 'succeeded': succeeded, 'failed': failed, 'pricesInserted': total_prices})}")


if __name__ == '__main__':
    main()
