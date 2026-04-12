#!/usr/bin/env python3
import sqlite3, os, sys, json, datetime, urllib.request, urllib.error, time

DB = os.path.expanduser("~/openclaw-prices/data/prices.db")
LOG_DB = os.environ.get("OPENCLAW_GROWTH_LOG_DB_PATH", os.path.expanduser("~/openclaw-prices/data/growth-tracker.db"))
URL = os.environ.get("CHEFFLOW_WEBHOOK_URL", "http://10.0.0.153:3000/api/openclaw/webhook")
SECRET = os.environ.get("OPENCLAW_WEBHOOK_SECRET", "openclaw-internal-2026")
TABLES = ["canonical_ingredients","current_prices","price_changes","price_anomalies","price_trends","normalization_map","catalog_stores","catalog_store_products","catalog_scrape_runs"]

if not os.path.exists(DB):
    sys.exit(1)


def connect_prices_db():
    conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True, timeout=30)
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def connect_log_db():
    conn = sqlite3.connect(LOG_DB, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def run_snapshot():
    prices_conn = connect_prices_db()
    log_conn = connect_log_db()
    try:
        log_conn.execute("CREATE TABLE IF NOT EXISTS data_growth_log (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, table_name TEXT NOT NULL, row_count INTEGER NOT NULL, bytes_estimate INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
        log_conn.execute("CREATE INDEX IF NOT EXISTS idx_gl ON data_growth_log(table_name, date DESC)")

        now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        regs = []
        for t in TABLES:
            try:
                cnt = prices_conn.execute("SELECT COUNT(*) FROM [" + t + "]").fetchone()[0]
            except Exception:
                cnt = 0
            prev = log_conn.execute("SELECT row_count FROM data_growth_log WHERE table_name=? ORDER BY date DESC, id DESC LIMIT 1", (t,)).fetchone()
            if prev and cnt < prev[0]:
                regs.append({"table_name":t,"previous_count":prev[0],"current_count":cnt,"rows_lost":prev[0]-cnt})
            log_conn.execute("INSERT INTO data_growth_log(date,table_name,row_count,bytes_estimate) VALUES(?,?,?,?)", (now, t, cnt, cnt * 300))

        log_conn.commit()
        return now, regs
    finally:
        prices_conn.close()
        log_conn.close()


last_exc = None
for attempt in range(5):
    try:
        now, regs = run_snapshot()
        break
    except sqlite3.OperationalError as exc:
        last_exc = exc
        if "locked" not in str(exc).lower() or attempt == 4:
            raise
        delay = 5 * (attempt + 1)
        print("[" + datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ") + "] database locked; retrying in " + str(delay) + "s")
        time.sleep(delay)
else:
    raise last_exc

if regs:
    payload = json.dumps({"type":"growth_regression","data":{"regressions":regs,"detected_at":now,"total_tables_regressed":len(regs),"total_rows_lost":sum(r["rows_lost"] for r in regs)}}).encode()
    try:
        req = urllib.request.Request(URL, data=payload, headers={"Content-Type":"application/json","Authorization":"Bearer " + SECRET}, method="POST")
        urllib.request.urlopen(req, timeout=10)
    except:
        pass
else:
    print("[" + now + "] All tables healthy")
