#!/usr/bin/env python3
"""
OpenClaw Growth Tracker
=======================
"Database always growing, never regressing" mandate.

Creates a data_growth_log table in prices.db and provides a snapshot
function that logs current row counts for all tracked tables. If any
core table has fewer rows than the previous snapshot, it broadcasts
a growth_regression alert to the ChefFlow webhook.

Run hourly via cron:
  0 * * * * cd ~/openclaw && python3 scripts/patches/upgrade-growth-tracker.py

Or from the CFv1 repo:
  python3 scripts/openclaw-pull/patches/upgrade-growth-tracker.py
"""

import sqlite3
import os
import sys
import json
import datetime
import urllib.request
import urllib.error

# --- Configuration ---

# Path to prices.db (Pi default, override with PRICES_DB_PATH env var)
PRICES_DB_PATH = os.environ.get(
    "PRICES_DB_PATH",
    os.path.expanduser("~/openclaw-prices/data/prices.db")
)

# ChefFlow webhook endpoint (PC default, override with CHEFFLOW_WEBHOOK_URL)
CHEFFLOW_WEBHOOK_URL = os.environ.get(
    "CHEFFLOW_WEBHOOK_URL",
    "http://10.0.0.153:3000/api/openclaw/webhook"
)

# Shared secret for webhook auth
WEBHOOK_SECRET = os.environ.get(
    "OPENCLAW_WEBHOOK_SECRET",
    "openclaw-internal-2026"
)

# Tables to track (core OpenClaw tables that should only grow)
TRACKED_TABLES = [
    "canonical_ingredients",
    "current_prices",
    "price_changes",
    "price_anomalies",
    "price_trends",
    "normalization_map",
    "catalog_stores",
    "catalog_store_products",
    "scrape_sessions",
]

# Rough bytes-per-row estimates for each table (used for size tracking)
BYTES_PER_ROW_ESTIMATE = {
    "canonical_ingredients": 256,
    "current_prices": 512,
    "price_changes": 384,
    "price_anomalies": 512,
    "price_trends": 384,
    "normalization_map": 192,
    "catalog_stores": 256,
    "catalog_store_products": 384,
    "scrape_sessions": 256,
}

DEFAULT_BYTES_PER_ROW = 300


def ensure_growth_log_table(conn):
    """Create the data_growth_log table if it doesn't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS data_growth_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            table_name TEXT NOT NULL,
            row_count INTEGER NOT NULL,
            bytes_estimate INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    # Index for efficient lookups by table + date
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_growth_log_table_date
        ON data_growth_log (table_name, date DESC)
    """)
    conn.commit()
    print("[growth-tracker] data_growth_log table ready")


def get_table_row_count(conn, table_name):
    """Get the current row count for a table. Returns 0 if table doesn't exist."""
    try:
        cursor = conn.execute(f"SELECT COUNT(*) FROM [{table_name}]")
        return cursor.fetchone()[0]
    except sqlite3.OperationalError:
        # Table doesn't exist yet
        return 0


def get_previous_snapshot(conn, table_name):
    """Get the most recent row count for a table from the growth log."""
    cursor = conn.execute("""
        SELECT row_count, date
        FROM data_growth_log
        WHERE table_name = ?
        ORDER BY date DESC, id DESC
        LIMIT 1
    """, (table_name,))
    row = cursor.fetchone()
    if row:
        return {"row_count": row[0], "date": row[1]}
    return None


def growth_snapshot(conn):
    """
    Log current row counts for all tracked tables.
    Returns a list of regressions (tables with fewer rows than last snapshot).
    """
    today = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    regressions = []

    for table_name in TRACKED_TABLES:
        current_count = get_table_row_count(conn, table_name)
        bytes_per_row = BYTES_PER_ROW_ESTIMATE.get(table_name, DEFAULT_BYTES_PER_ROW)
        bytes_estimate = current_count * bytes_per_row

        # Check for regression against previous snapshot
        previous = get_previous_snapshot(conn, table_name)
        if previous and current_count < previous["row_count"]:
            delta = previous["row_count"] - current_count
            regressions.append({
                "table_name": table_name,
                "previous_count": previous["row_count"],
                "current_count": current_count,
                "rows_lost": delta,
                "previous_snapshot_date": previous["date"],
            })
            print(
                f"[growth-tracker] REGRESSION: {table_name} "
                f"dropped from {previous['row_count']} to {current_count} "
                f"(-{delta} rows)"
            )
        else:
            growth = 0
            if previous:
                growth = current_count - previous["row_count"]
            print(
                f"[growth-tracker] {table_name}: {current_count} rows "
                f"(+{growth} since last snapshot)"
            )

        # Insert the snapshot row
        conn.execute("""
            INSERT INTO data_growth_log (date, table_name, row_count, bytes_estimate)
            VALUES (?, ?, ?, ?)
        """, (today, table_name, current_count, bytes_estimate))

    conn.commit()
    print(f"[growth-tracker] Snapshot recorded at {today}")
    return regressions


def send_regression_alert(regressions):
    """Send growth_regression alert to ChefFlow webhook."""
    payload = {
        "type": "growth_regression",
        "data": {
            "regressions": regressions,
            "detected_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_tables_regressed": len(regressions),
            "total_rows_lost": sum(r["rows_lost"] for r in regressions),
        }
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        CHEFFLOW_WEBHOOK_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {WEBHOOK_SECRET}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            resp_body = resp.read().decode("utf-8")
            print(f"[growth-tracker] Alert sent to ChefFlow: {status} {resp_body}")
    except urllib.error.URLError as e:
        print(f"[growth-tracker] WARNING: Could not reach ChefFlow webhook: {e}")
        print("[growth-tracker] Alert payload saved to stdout for manual review:")
        print(json.dumps(payload, indent=2))
    except Exception as e:
        print(f"[growth-tracker] WARNING: Webhook request failed: {e}")


def main():
    if not os.path.exists(PRICES_DB_PATH):
        print(f"[growth-tracker] ERROR: prices.db not found at {PRICES_DB_PATH}")
        print("[growth-tracker] Set PRICES_DB_PATH environment variable to the correct path")
        sys.exit(1)

    conn = sqlite3.connect(PRICES_DB_PATH)
    try:
        ensure_growth_log_table(conn)
        regressions = growth_snapshot(conn)

        if regressions:
            print(
                f"\n[growth-tracker] ALERT: {len(regressions)} table(s) regressed! "
                f"Sending alert to ChefFlow..."
            )
            send_regression_alert(regressions)
        else:
            print("\n[growth-tracker] All tables healthy (no regressions)")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
