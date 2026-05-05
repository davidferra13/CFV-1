#!/bin/bash
# Hermes Job 8: Disk & Resource Monitor
# Runs every 4 hours. Tracks disk usage for key directories, node_modules, .next, backups.
# Output: docs/hermes/disk-resources.jsonl

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/disk-resources.jsonl"
ALERTS="$CHEFFLOW/docs/hermes/ALERTS.md"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$(dirname "$OUTPUT")"

# Directory sizes (du is slow on NTFS mount, so timeout each)
size_of() {
  local DIR="$1"
  if [ -d "$DIR" ]; then
    local RESULT
    RESULT=$(timeout 30 du -sb "$DIR" 2>/dev/null | cut -f1)
    echo "${RESULT:-0}"
  else
    echo "0"
  fi
}

human_size() {
  local BYTES="$1"
  if [ "$BYTES" -gt 1073741824 ] 2>/dev/null; then
    echo "$(( BYTES / 1073741824 ))GB"
  elif [ "$BYTES" -gt 1048576 ] 2>/dev/null; then
    echo "$(( BYTES / 1048576 ))MB"
  else
    echo "${BYTES}B"
  fi
}

NODE_MODULES=$(size_of "$CHEFFLOW/node_modules")
NEXT_DIR=$(size_of "$CHEFFLOW/.next")
BACKUPS=$(size_of "$CHEFFLOW/backups")
DOCS=$(size_of "$CHEFFLOW/docs")
STORAGE=$(size_of "$CHEFFLOW/storage")
HERMES_OUT=$(size_of "$CHEFFLOW/docs/hermes")

# Disk free on C: drive (from WSL perspective)
DISK_FREE=$(df -B1 /mnt/c 2>/dev/null | tail -1 | awk '{print $4}')
DISK_TOTAL=$(df -B1 /mnt/c 2>/dev/null | tail -1 | awk '{print $2}')
DISK_USED_PCT=$(df /mnt/c 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')

# File counts
UNCOMMITTED_COUNT=$(cd "$CHEFFLOW" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
TOTAL_TS_FILES=$(find "$CHEFFLOW/app" "$CHEFFLOW/lib" "$CHEFFLOW/components" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')

# Alerts
if [ -n "$DISK_USED_PCT" ] && [ "$DISK_USED_PCT" -gt 90 ] 2>/dev/null; then
  echo "- **$TS** [CRITICAL] C: drive ${DISK_USED_PCT}% full ($(human_size $DISK_FREE) free)" >> "$ALERTS"
elif [ -n "$DISK_USED_PCT" ] && [ "$DISK_USED_PCT" -gt 80 ] 2>/dev/null; then
  echo "- **$TS** [WARN] C: drive ${DISK_USED_PCT}% full ($(human_size $DISK_FREE) free)" >> "$ALERTS"
fi

# Alert on massive backups
if [ "$BACKUPS" -gt 107374182400 ] 2>/dev/null; then  # >100GB
  echo "- **$TS** [WARN] Backups directory is $(human_size $BACKUPS)" >> "$ALERTS"
fi

echo "{\"ts\":\"$TS\",\"disk\":{\"free\":$DISK_FREE,\"total\":$DISK_TOTAL,\"used_pct\":$DISK_USED_PCT},\"dirs\":{\"node_modules\":$NODE_MODULES,\".next\":$NEXT_DIR,\"backups\":$BACKUPS,\"docs\":$DOCS,\"storage\":$STORAGE,\"hermes\":$HERMES_OUT},\"files\":{\"uncommitted\":$UNCOMMITTED_COUNT,\"ts_tsx_total\":$TOTAL_TS_FILES}}" >> "$OUTPUT"

# Rotate
if [ -f "$OUTPUT" ]; then
  LINES=$(wc -l < "$OUTPUT")
  if [ "$LINES" -gt 50 ]; then
    tail -42 "$OUTPUT" > "$OUTPUT.tmp" && mv "$OUTPUT.tmp" "$OUTPUT"
  fi
fi
