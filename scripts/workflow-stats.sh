#!/usr/bin/env bash
# workflow-stats.sh - Track and log workflow metrics
# Usage:
#   bash scripts/workflow-stats.sh log <metric> <value> <unit> <result> [notes]
#   bash scripts/workflow-stats.sh snapshot
#   bash scripts/workflow-stats.sh report
#   bash scripts/workflow-stats.sh avg <metric>
#
# Examples:
#   bash scripts/workflow-stats.sh log tsc 42 seconds pass
#   bash scripts/workflow-stats.sh log next-build 187 seconds pass "after adding 6 missing files"
#   bash scripts/workflow-stats.sh snapshot
#   bash scripts/workflow-stats.sh report
#   bash scripts/workflow-stats.sh avg next-build

set -euo pipefail

STATS_FILE="docs/build-times.log"
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "dirty")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log_metric() {
  local metric="$1"
  local value="$2"
  local unit="$3"
  local result="$4"
  local notes="${5:-}"
  echo "$TIMESTAMP | $metric | $value | $unit | $result | $COMMIT | $notes" >> "$STATS_FILE"
  echo "[stats] $metric: ${value}${unit:+ $unit} ($result)"
}

snapshot() {
  # File count
  local file_count
  file_count=$(git ls-files '*.ts' '*.tsx' | wc -l | tr -d ' ')
  log_metric "file-count" "$file_count" "files" "snap"

  # Lines of code (ts/tsx only, exclude generated)
  local loc
  loc=$(git ls-files '*.ts' '*.tsx' | grep -v 'types/database.ts' | grep -v '.v1-builder' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
  log_metric "loc" "$loc" "lines" "snap"

  # Bundle size (.next directory)
  if [ -d ".next" ]; then
    local bundle_kb
    bundle_kb=$(du -sk .next 2>/dev/null | awk '{print $1}')
    local bundle_mb=$((bundle_kb / 1024))
    log_metric "bundle-size" "$bundle_mb" "MB" "snap"
  fi

  # Node modules size
  if [ -d "node_modules" ]; then
    local nm_kb
    nm_kb=$(du -sk node_modules 2>/dev/null | awk '{print $1}')
    local nm_mb=$((nm_kb / 1024))
    log_metric "node-modules" "$nm_mb" "MB" "snap"
  fi

  # Git repo size
  local repo_kb
  repo_kb=$(du -sk .git 2>/dev/null | awk '{print $1}')
  local repo_mb=$((repo_kb / 1024))
  log_metric "git-repo-size" "$repo_mb" "MB" "snap"

  # Dependency count
  local dep_count
  dep_count=$(node -e "const p=require('./package.json'); console.log(Object.keys(p.dependencies||{}).length)" 2>/dev/null || echo "?")
  log_metric "dep-count" "$dep_count" "packages" "snap"

  # Route count
  local route_count
  route_count=$(find app -name "page.tsx" -not -path "*/.v1-builder*" 2>/dev/null | wc -l | tr -d ' ')
  log_metric "route-count" "$route_count" "routes" "snap"

  # Migration count
  local migration_count
  migration_count=$(find database/migrations -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')
  log_metric "migration-count" "$migration_count" "migrations" "snap"

  echo ""
  echo "[stats] Snapshot complete at $TIMESTAMP (commit $COMMIT)"
}

report() {
  echo "=== ChefFlow Workflow Stats ==="
  echo ""

  # Last 10 entries per key metric
  for metric in tsc next-build bundle-size server-start; do
    local entries
    entries=$(grep "| $metric |" "$STATS_FILE" 2>/dev/null | tail -5)
    if [ -n "$entries" ]; then
      echo "--- $metric (last 5) ---"
      echo "$entries"
      echo ""
    fi
  done

  # Latest snapshot values
  echo "--- Latest Snapshot ---"
  for metric in file-count loc bundle-size dep-count route-count migration-count; do
    local latest
    latest=$(grep "| $metric |" "$STATS_FILE" 2>/dev/null | tail -1)
    if [ -n "$latest" ]; then
      echo "$latest"
    fi
  done
}

avg() {
  local metric="$1"
  local values
  values=$(grep "| $metric |" "$STATS_FILE" 2>/dev/null | grep "| pass |" | awk -F'|' '{gsub(/ /,"",$3); print $3}')
  if [ -z "$values" ]; then
    echo "[stats] No pass entries for $metric yet"
    return
  fi
  local count=0
  local total=0
  local min=999999
  local max=0
  while read -r val; do
    total=$((total + val))
    count=$((count + 1))
    [ "$val" -lt "$min" ] && min=$val
    [ "$val" -gt "$max" ] && max=$val
  done <<< "$values"

  if [ "$count" -gt 0 ]; then
    local avg=$((total / count))
    echo "[stats] $metric: avg=${avg}s min=${min}s max=${max}s (n=$count)"
  fi
}

# Timed wrapper: bash scripts/workflow-stats.sh timed <metric> <command...>
timed() {
  local metric="$1"
  shift
  local start_time
  start_time=$(date +%s)

  local exit_code=0
  "$@" || exit_code=$?

  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))

  local result="pass"
  [ "$exit_code" -ne 0 ] && result="fail"

  log_metric "$metric" "$duration" "seconds" "$result"

  return $exit_code
}

case "${1:-}" in
  log)
    shift
    log_metric "$@"
    ;;
  snapshot)
    snapshot
    ;;
  report)
    report
    ;;
  avg)
    avg "${2:-next-build}"
    ;;
  timed)
    shift
    timed "$@"
    ;;
  *)
    echo "Usage: bash scripts/workflow-stats.sh {log|snapshot|report|avg|timed} [args]"
    echo ""
    echo "  log <metric> <value> <unit> <result> [notes]"
    echo "  snapshot                          - Capture codebase metrics"
    echo "  report                            - Show recent stats"
    echo "  avg <metric>                      - Show average for metric"
    echo "  timed <metric> <command...>       - Time a command and log it"
    echo ""
    echo "Examples:"
    echo "  bash scripts/workflow-stats.sh timed tsc node scripts/run-typecheck.mjs -p tsconfig.ci.json"
    echo "  bash scripts/workflow-stats.sh timed next-build node scripts/run-next-build.mjs"
    echo "  bash scripts/workflow-stats.sh snapshot"
    exit 1
    ;;
esac
