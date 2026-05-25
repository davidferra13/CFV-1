#!/usr/bin/env bash
# One-time migration: Pi SQLite -> ChefFlow PostgreSQL
# Run while Pi (10.0.0.177) is still reachable
# Prerequisites: ssh access to Pi, psql access to ChefFlow DB

set -euo pipefail

PI_HOST="davidferra@10.0.0.177"
PI_DB="/home/davidferra/openclaw/prices.db"
DUMP_DIR="./tmp/pi-dump"
PG_URL="${DATABASE_URL:-postgresql://localhost:5432/chefflow}"

echo "=== PIE Pi Data Dump ==="
echo "Target: $PG_URL"
echo "Source: $PI_HOST:$PI_DB"
echo ""

mkdir -p "$DUMP_DIR"

# Step 1: Dump key tables from Pi SQLite to CSV
echo "[1/4] Dumping Pi SQLite tables..."

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM prices;'" > "$DUMP_DIR/prices.csv"
echo "  prices: $(wc -l < "$DUMP_DIR/prices.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM canonical_ingredients;'" > "$DUMP_DIR/canonical_ingredients.csv"
echo "  canonical_ingredients: $(wc -l < "$DUMP_DIR/canonical_ingredients.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM stores;'" > "$DUMP_DIR/stores.csv"
echo "  stores: $(wc -l < "$DUMP_DIR/stores.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM seasonal_scores;'" > "$DUMP_DIR/seasonal_scores.csv"
echo "  seasonal_scores: $(wc -l < "$DUMP_DIR/seasonal_scores.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM yield_factors;'" > "$DUMP_DIR/yield_factors.csv"
echo "  yield_factors: $(wc -l < "$DUMP_DIR/yield_factors.csv") rows"

ssh "$PI_HOST" "sqlite3 -header -csv $PI_DB 'SELECT * FROM anomalies;'" > "$DUMP_DIR/anomalies.csv"
echo "  anomalies: $(wc -l < "$DUMP_DIR/anomalies.csv") rows"

# Step 2: Import to PostgreSQL using COPY
echo ""
echo "[2/4] Creating staging tables in PostgreSQL..."

psql "$PG_URL" <<'SQL'
CREATE TABLE IF NOT EXISTS pi_import_prices (
  id TEXT,
  ingredient_name TEXT,
  canonical_ingredient_id TEXT,
  price_cents INTEGER,
  unit TEXT,
  store_name TEXT,
  state TEXT,
  city TEXT,
  source TEXT,
  last_confirmed_at TIMESTAMPTZ,
  product_name TEXT,
  in_stock BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS pi_import_ingredients (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  standard_unit TEXT
);

CREATE TABLE IF NOT EXISTS pi_import_stores (
  id TEXT,
  name TEXT,
  chain TEXT,
  state TEXT,
  city TEXT,
  zip TEXT,
  lat NUMERIC,
  lon NUMERIC,
  source TEXT
);
SQL

echo "[3/4] Importing CSVs..."

psql "$PG_URL" -c "\COPY pi_import_prices FROM '$DUMP_DIR/prices.csv' WITH CSV HEADER"
psql "$PG_URL" -c "\COPY pi_import_ingredients FROM '$DUMP_DIR/canonical_ingredients.csv' WITH CSV HEADER"
psql "$PG_URL" -c "\COPY pi_import_stores FROM '$DUMP_DIR/stores.csv' WITH CSV HEADER"

echo "[4/4] Verifying import..."
psql "$PG_URL" -c "SELECT 'prices' AS t, COUNT(*) FROM pi_import_prices UNION ALL SELECT 'ingredients', COUNT(*) FROM pi_import_ingredients UNION ALL SELECT 'stores', COUNT(*) FROM pi_import_stores;"

echo ""
echo "=== DONE ==="
echo "Data is in staging tables (pi_import_*). Reconciliation with existing openclaw.* tables is next step."
echo "Run: scripts/hermes/pi-data-reconcile.sh to merge into production tables."
