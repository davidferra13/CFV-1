#!/usr/bin/env bash
# Migrate from PostgreSQL Docker PostgreSQL to standalone PostgreSQL
# This script:
#   1. Dumps the current PostgreSQL database
#   2. Stops PostgreSQL Docker containers
#   3. Starts standalone PostgreSQL via docker-compose
#   4. Restores the dump into the new container
#
# Prerequisites: docker, docker compose
# Usage: bash scripts/migrate-to-standalone-pg.sh

set -euo pipefail

DUMP_FILE="backup-database-final-$(date +%Y%m%d%H%M%S).sql"
DATABASE_CONTAINER="database_db_CFv1"
STANDALONE_CONTAINER="chefflow_postgres"

echo "=== Step 1: Dump PostgreSQL PostgreSQL ==="
docker exec -i "$DATABASE_CONTAINER" pg_dump -U postgres -d postgres --no-owner --no-acl > "$DUMP_FILE"
echo "Dump saved to: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

echo ""
echo "=== Step 2: Stop PostgreSQL Docker ==="
npx database stop
echo "PostgreSQL containers stopped."

echo ""
echo "=== Step 3: Start standalone PostgreSQL ==="
docker compose up -d
echo "Waiting for PostgreSQL to be ready..."
until docker exec "$STANDALONE_CONTAINER" pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready."

echo ""
echo "=== Step 4: Restore dump ==="
docker exec -i "$STANDALONE_CONTAINER" psql -U postgres -d postgres < "$DUMP_FILE"
echo "Restore complete."

echo ""
echo "=== Step 5: Verify ==="
TABLE_COUNT=$(docker exec -i "$STANDALONE_CONTAINER" psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")
echo "Tables in standalone PostgreSQL: $TABLE_COUNT"

echo ""
echo "=== Done ==="
echo "Connection string: postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres"
echo "This is the same connection string as before (port 54322)."
echo ""
echo "You can now remove database/ config if you no longer need it."
echo "To revert: bash scripts/migrate-to-standalone-pg.sh (just re-run docker compose up -d)"
