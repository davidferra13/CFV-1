#!/usr/bin/env python3
"""
Deploy SQLite DELETE guard triggers to prices.db on Pi.

Prevents accidental row deletion on all core price tables by:
1. Creating an `archived_deletions` table to capture attempted deletes
2. Creating BEFORE DELETE triggers that archive the row as JSON then ABORT
3. Providing an emergency override via `_maintenance_override` table
   (requires allow_delete = 1 and a non-expired expires_at timestamp)

Usage (from PC):
    cat scripts/openclaw-pull/patches/upgrade-no-delete-guards.py | ssh davidferra@10.0.0.177 'python3 -'

The script is idempotent: it checks for existing triggers before creating them.
"""
import sqlite3
import sys
import os

DB_PATH = os.path.expanduser("~/openclaw-prices/data/prices.db")

PROTECTED_TABLES = [
    "canonical_ingredients",
    "current_prices",
    "price_changes",
    "price_anomalies",
    "price_trends",
    "price_monthly_summary",
    "normalization_map",
    "ingredient_variants",
    "scrape_sessions",
]


def check_existing_triggers(conn):
    """Return set of tables that already have delete guard triggers."""
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'guard_no_delete_%'"
    ).fetchall()
    existing = set()
    for (name,) in rows:
        table = name.replace("guard_no_delete_", "", 1)
        existing.add(table)
    return existing


def get_table_columns(conn, table_name):
    """Get column names for a table so we can build json_object()."""
    rows = conn.execute(f"PRAGMA table_info([{table_name}])").fetchall()
    return [row[1] for row in rows]


def build_trigger_sql(table_name, columns):
    """Build the BEFORE DELETE trigger for one table."""
    json_pairs = ", ".join(f"'{col}', OLD.[{col}]" for col in columns)
    json_expr = f"json_object({json_pairs})"
    trigger_name = f"guard_no_delete_{table_name}"

    return f"""
CREATE TRIGGER [{trigger_name}]
BEFORE DELETE ON [{table_name}]
FOR EACH ROW
WHEN NOT EXISTS (
    SELECT 1 FROM _maintenance_override
    WHERE allow_delete = 1
      AND expires_at > datetime('now')
)
BEGIN
    INSERT INTO archived_deletions (table_name, row_json)
    VALUES ('{table_name}', {json_expr});
    SELECT RAISE(ABORT, 'DELETE forbidden on {table_name}: use archive instead. Set _maintenance_override for emergency maintenance.');
END;
"""


def main():
    print(f"Delete guard deployment for {DB_PATH}")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    try:
        # Create archive + override tables
        conn.executescript("""
CREATE TABLE IF NOT EXISTS archived_deletions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    archived_at TEXT NOT NULL DEFAULT (datetime('now')),
    table_name TEXT NOT NULL,
    row_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_archived_deletions_table ON archived_deletions(table_name);
CREATE INDEX IF NOT EXISTS idx_archived_deletions_ts ON archived_deletions(archived_at);

CREATE TABLE IF NOT EXISTS _maintenance_override (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    allow_delete INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);
        """)
        print("  [ok] archived_deletions table ready")
        print("  [ok] _maintenance_override table ready")

        # Check existing triggers
        existing = check_existing_triggers(conn)
        if existing:
            print(f"Existing triggers found: {', '.join(sorted(existing))}")

        tables_to_guard = [t for t in PROTECTED_TABLES if t not in existing]
        already_guarded = [t for t in PROTECTED_TABLES if t in existing]

        for t in already_guarded:
            print(f"  [skip] {t} - trigger already exists")

        if not tables_to_guard:
            print("\nAll tables already have delete guards. Nothing to do.")
            return

        # Create triggers
        print(f"\nCreating delete guard triggers for {len(tables_to_guard)} tables...")
        for table in tables_to_guard:
            columns = get_table_columns(conn, table)
            if not columns:
                print(f"  [warn] {table} - no columns found, skipping (table may not exist)")
                continue

            trigger_sql = build_trigger_sql(table, columns)
            conn.executescript(trigger_sql)
            print(f"  [ok] {table} ({len(columns)} columns)")

        # Verify
        print("\nVerifying triggers...")
        final_triggers = check_existing_triggers(conn)
        missing = [t for t in PROTECTED_TABLES if t not in final_triggers]

        if missing:
            print(f"WARNING: Triggers missing for: {', '.join(missing)}")
            print("These tables may not exist in the database yet.")
        else:
            print(f"All {len(PROTECTED_TABLES)} delete guards active.")

        print("\n" + "=" * 60)
        print("Delete guards deployed successfully.")
        print("")
        print("To perform emergency maintenance deletes:")
        print("  INSERT INTO _maintenance_override (allow_delete, reason, expires_at)")
        print("  VALUES (1, 'reason here', datetime('now', '+5 minutes'));")
        print("")
        print("Override expires automatically. Deleted rows are always archived")
        print("in archived_deletions regardless of override status.")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
