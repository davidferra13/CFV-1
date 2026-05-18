#!/bin/bash
# Hermes Job 7: Database Health Monitor
# Runs every 2 hours. Checks PostgreSQL connectivity, table counts, size, connections.
# Output: docs/hermes/db-health.jsonl

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/db-health.jsonl"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

mkdir -p "$(dirname "$OUTPUT")"

# Check if PostgreSQL is reachable
if ! psql "$DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo "{\"ts\":\"$TS\",\"pg_alive\":false}" >> "$OUTPUT"
  echo "- **$TS** [CRITICAL] PostgreSQL not responding on port 54322" >> "$ALERTS"
  exit 0
fi

# Database size
DB_SIZE=$(psql "$DB_URL" -t -A -c "SELECT pg_size_pretty(pg_database_size('postgres'))" 2>/dev/null | tr -d ' ')

# Total tables
TABLE_COUNT=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' ')

# Row counts for critical tables
EVENTS=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM events" 2>/dev/null | tr -d ' ')
USERS=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM users" 2>/dev/null | tr -d ' ')
INQUIRIES=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM inquiries" 2>/dev/null | tr -d ' ')
RECIPES=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM recipes" 2>/dev/null | tr -d ' ')
LEDGER=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM ledger_entries" 2>/dev/null | tr -d ' ')
MESSAGES=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM messages" 2>/dev/null | tr -d ' ')

# Active connections
CONNECTIONS=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE state='active'" 2>/dev/null | tr -d ' ')
TOTAL_CONNECTIONS=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM pg_stat_activity" 2>/dev/null | tr -d ' ')

# Dead tuples (bloat indicator)
DEAD_TUPLES=$(psql "$DB_URL" -t -A -c "SELECT sum(n_dead_tup) FROM pg_stat_user_tables" 2>/dev/null | tr -d ' ')

# Long-running queries (>30 seconds)
LONG_QUERIES=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE state='active' AND query_start < now() - interval '30 seconds' AND query NOT LIKE '%pg_stat%'" 2>/dev/null | tr -d ' ')

# Default empty values
EVENTS=${EVENTS:-0}
USERS=${USERS:-0}
INQUIRIES=${INQUIRIES:-0}
RECIPES=${RECIPES:-0}
LEDGER=${LEDGER:-0}
MESSAGES=${MESSAGES:-0}
CONNECTIONS=${CONNECTIONS:-0}
TOTAL_CONNECTIONS=${TOTAL_CONNECTIONS:-0}
DEAD_TUPLES=${DEAD_TUPLES:-0}
LONG_QUERIES=${LONG_QUERIES:-0}

# Alert on high connections
if [ "$TOTAL_CONNECTIONS" -gt 16 ]; then
  echo "- **$TS** [WARN] PostgreSQL connections high: $TOTAL_CONNECTIONS" >> "$ALERTS"
fi

# Alert on long queries
if [ "$LONG_QUERIES" -gt 0 ]; then
  echo "- **$TS** [WARN] $LONG_QUERIES long-running queries (>30s)" >> "$ALERTS"
fi

# Alert on excessive dead tuples (needs vacuum)
if [ "$DEAD_TUPLES" -gt 100000 ]; then
  echo "- **$TS** [WARN] $DEAD_TUPLES dead tuples across tables (consider VACUUM)" >> "$ALERTS"
fi

echo "{\"ts\":\"$TS\",\"pg_alive\":true,\"db_size\":\"$DB_SIZE\",\"tables\":$TABLE_COUNT,\"rows\":{\"events\":$EVENTS,\"users\":$USERS,\"inquiries\":$INQUIRIES,\"recipes\":$RECIPES,\"ledger_entries\":$LEDGER,\"messages\":$MESSAGES},\"connections\":{\"active\":$CONNECTIONS,\"total\":$TOTAL_CONNECTIONS},\"dead_tuples\":$DEAD_TUPLES,\"long_queries\":$LONG_QUERIES}" >> "$OUTPUT"

# Rotate
if [ -f "$OUTPUT" ]; then
  LINES=$(wc -l < "$OUTPUT")
  if [ "$LINES" -gt 100 ]; then
    tail -84 "$OUTPUT" > "$OUTPUT.tmp" && mv "$OUTPUT.tmp" "$OUTPUT"
  fi
fi
