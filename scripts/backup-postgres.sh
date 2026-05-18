#!/bin/bash
# ChefFlow PostgreSQL backup
# Run: bash scripts/backup-postgres.sh
# Keeps last 7 backups, gzipped

set -euo pipefail

BACKUP_DIR="backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER="chefflow_postgres"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: container $CONTAINER not running"
  exit 1
fi

echo "Backing up ChefFlow PostgreSQL..."
docker exec "$CONTAINER" pg_dump -U postgres --format=custom postgres > "$BACKUP_DIR/chefflow_${TIMESTAMP}.dump"

SIZE=$(du -h "$BACKUP_DIR/chefflow_${TIMESTAMP}.dump" | cut -f1)
echo "Backup complete: $BACKUP_DIR/chefflow_${TIMESTAMP}.dump ($SIZE)"

# Rotate: keep last 7
KEPT=0
for f in $(ls -t "$BACKUP_DIR"/chefflow_*.dump 2>/dev/null); do
  KEPT=$((KEPT + 1))
  if [ "$KEPT" -gt 7 ]; then
    rm "$f"
    echo "Rotated old backup: $f"
  fi
done

echo "Done. $KEPT backup(s) on disk."
