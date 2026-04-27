#!/usr/bin/env bash
# ============================================================================
# ChefFlow Regression Detection
# ============================================================================
# Verifies critical features still exist by checking:
#   1. Route files (page.tsx) exist
#   2. API route files (route.ts) exist
#   3. Critical infrastructure files exist
#   4. Server action functions are exported
#   5. Infrastructure exports exist
#   6. Core DB tables are in schema
#
# Usage:
#   bash scripts/regression-check.sh          # full check
#   bash scripts/regression-check.sh --quick  # routes + files only (fast)
#
# Exit codes: 0 = clean, 1 = regression detected
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REGISTRY="$SCRIPT_DIR/regression-registry.json"
REPORT_FILE="$PROJECT_ROOT/.regression-report.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

FAILURES=0
CHECKS=0
QUICK_MODE=false
FAILED_ITEMS=()

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK_MODE=true ;;
  esac
done

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

pass() { CHECKS=$((CHECKS + 1)); }

fail() {
  CHECKS=$((CHECKS + 1))
  FAILURES=$((FAILURES + 1))
  FAILED_ITEMS+=("$1")
  echo -e "  ${RED}MISSING${NC} $1"
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}[$1]${NC}"
}

# Use node to reliably extract data from JSON registry
node_extract() {
  node -e "$1" "$REGISTRY"
}

# --------------------------------------------------------------------------
# 1. Route existence checks
# --------------------------------------------------------------------------

check_routes() {
  section "ROUTE FILES"

  local groups
  groups=$(node_extract "
    const r = require(process.argv[1]).routes;
    Object.keys(r).filter(k => k !== '_doc').forEach(k => console.log(k));
  ")

  while IFS= read -r group; do
    [ -z "$group" ] && continue
    local routes
    routes=$(node_extract "
      const r = require(process.argv[1]).routes['$group'] || [];
      r.forEach(p => console.log(p));
    ")

    local group_fails=0
    local group_total=0

    while IFS= read -r route; do
      [ -z "$route" ] && continue
      group_total=$((group_total + 1))
      if [ -f "$PROJECT_ROOT/$route" ]; then
        pass
      else
        fail "$route ($group)"
        group_fails=$((group_fails + 1))
      fi
    done <<< "$routes"

    if [ "$group_fails" -eq 0 ] && [ "$group_total" -gt 0 ]; then
      echo -e "  ${GREEN}OK${NC} $group ($group_total routes)"
      CHECKS=$((CHECKS + group_total))
    fi
  done <<< "$groups"
}

# --------------------------------------------------------------------------
# 2. API route existence checks
# --------------------------------------------------------------------------

check_api_routes() {
  section "API ROUTES"

  local groups
  groups=$(node_extract "
    const r = require(process.argv[1]).api_routes;
    Object.keys(r).filter(k => k !== '_doc').forEach(k => console.log(k));
  ")

  while IFS= read -r group; do
    [ -z "$group" ] && continue
    local routes
    routes=$(node_extract "
      const r = require(process.argv[1]).api_routes['$group'] || [];
      r.forEach(p => console.log(p));
    ")

    local group_fails=0
    local group_total=0

    while IFS= read -r route; do
      [ -z "$route" ] && continue
      group_total=$((group_total + 1))
      if [ -f "$PROJECT_ROOT/$route" ]; then
        pass
      else
        fail "$route (api/$group)"
        group_fails=$((group_fails + 1))
      fi
    done <<< "$routes"

    if [ "$group_fails" -eq 0 ] && [ "$group_total" -gt 0 ]; then
      echo -e "  ${GREEN}OK${NC} api/$group ($group_total routes)"
      CHECKS=$((CHECKS + group_total))
    fi
  done <<< "$groups"
}

# --------------------------------------------------------------------------
# 3. Critical file existence checks
# --------------------------------------------------------------------------

check_critical_files() {
  section "CRITICAL FILES"

  local groups
  groups=$(node_extract "
    const r = require(process.argv[1]).critical_files;
    Object.keys(r).filter(k => k !== '_doc').forEach(k => console.log(k));
  ")

  while IFS= read -r group; do
    [ -z "$group" ] && continue
    local files
    files=$(node_extract "
      const r = require(process.argv[1]).critical_files['$group'] || [];
      r.forEach(p => console.log(p));
    ")

    local group_fails=0
    local group_total=0

    while IFS= read -r f; do
      [ -z "$f" ] && continue
      group_total=$((group_total + 1))
      if [ -f "$PROJECT_ROOT/$f" ]; then
        pass
      else
        fail "$f ($group)"
        group_fails=$((group_fails + 1))
      fi
    done <<< "$files"

    if [ "$group_fails" -eq 0 ] && [ "$group_total" -gt 0 ]; then
      echo -e "  ${GREEN}OK${NC} $group ($group_total files)"
      CHECKS=$((CHECKS + group_total))
    fi
  done <<< "$groups"
}

# --------------------------------------------------------------------------
# 4. Server action export checks
# --------------------------------------------------------------------------

check_server_actions() {
  section "SERVER ACTION EXPORTS"

  # Get file:function pairs as "file|function" lines
  local pairs
  pairs=$(node_extract "
    const sa = require(process.argv[1]).server_actions;
    Object.keys(sa).filter(k => k !== '_doc').forEach(file => {
      sa[file].forEach(fn => console.log(file + '|' + fn));
    });
  ")

  local current_file=""
  local file_fails=0
  local file_total=0

  while IFS= read -r pair; do
    [ -z "$pair" ] && continue
    local file="${pair%%|*}"
    local fn="${pair##*|}"
    local full_path="$PROJECT_ROOT/$file"

    # Print summary when switching files
    if [ "$file" != "$current_file" ]; then
      if [ -n "$current_file" ] && [ "$file_fails" -eq 0 ] && [ "$file_total" -gt 0 ]; then
        echo -e "  ${GREEN}OK${NC} $current_file ($file_total exports)"
      fi
      current_file="$file"
      file_fails=0
      file_total=0
    fi

    file_total=$((file_total + 1))

    if [ ! -f "$full_path" ]; then
      fail "$file (FILE MISSING)"
      file_fails=$((file_fails + 1))
      continue
    fi

    if grep -qE "export\s+(async\s+)?function\s+${fn}\b|export\s+const\s+${fn}\b" "$full_path" 2>/dev/null; then
      pass
    else
      fail "$file::$fn()"
      file_fails=$((file_fails + 1))
    fi
  done <<< "$pairs"

  # Print last file summary
  if [ -n "$current_file" ] && [ "$file_fails" -eq 0 ] && [ "$file_total" -gt 0 ]; then
    echo -e "  ${GREEN}OK${NC} $current_file ($file_total exports)"
  fi
}

# --------------------------------------------------------------------------
# 5. Infrastructure export checks
# --------------------------------------------------------------------------

check_critical_exports() {
  section "INFRASTRUCTURE EXPORTS"

  local pairs
  pairs=$(node_extract "
    const ce = require(process.argv[1]).critical_exports;
    Object.keys(ce).filter(k => k !== '_doc').forEach(file => {
      ce[file].forEach(exp => console.log(file + '|' + exp));
    });
  ")

  local current_file=""
  local file_fails=0
  local file_total=0

  while IFS= read -r pair; do
    [ -z "$pair" ] && continue
    local file="${pair%%|*}"
    local exp="${pair##*|}"
    local full_path="$PROJECT_ROOT/$file"

    if [ "$file" != "$current_file" ]; then
      if [ -n "$current_file" ] && [ "$file_fails" -eq 0 ] && [ "$file_total" -gt 0 ]; then
        echo -e "  ${GREEN}OK${NC} $current_file ($file_total exports)"
      fi
      current_file="$file"
      file_fails=0
      file_total=0
    fi

    file_total=$((file_total + 1))

    if [ ! -f "$full_path" ]; then
      fail "$file (FILE MISSING)"
      file_fails=$((file_fails + 1))
      continue
    fi

    if grep -qE "export\s+(async\s+)?(function|const|class|type|interface|let|var)\s+${exp}\b" "$full_path" 2>/dev/null; then
      pass
    else
      fail "$file::$exp"
      file_fails=$((file_fails + 1))
    fi
  done <<< "$pairs"

  if [ -n "$current_file" ] && [ "$file_fails" -eq 0 ] && [ "$file_total" -gt 0 ]; then
    echo -e "  ${GREEN}OK${NC} $current_file ($file_total exports)"
  fi
}

# --------------------------------------------------------------------------
# 6. Schema table checks
# --------------------------------------------------------------------------

check_schema_tables() {
  section "SCHEMA TABLES"

  local schema_file="$PROJECT_ROOT/lib/db/schema/schema.ts"
  if [ ! -f "$schema_file" ]; then
    fail "lib/db/schema/schema.ts (SCHEMA FILE MISSING)"
    return
  fi

  local tables
  tables=$(node_extract "
    const t = require(process.argv[1]).schema_tables.tables;
    t.forEach(name => console.log(name));
  ")

  local table_fails=0
  local table_total=0

  while IFS= read -r table; do
    [ -z "$table" ] && continue
    table_total=$((table_total + 1))
    if grep -q "\"$table\"" "$schema_file" 2>/dev/null; then
      pass
    else
      fail "schema::$table (table not in schema)"
      table_fails=$((table_fails + 1))
    fi
  done <<< "$tables"

  if [ "$table_fails" -eq 0 ] && [ "$table_total" -gt 0 ]; then
    echo -e "  ${GREEN}OK${NC} schema ($table_total tables verified)"
  fi
}

# --------------------------------------------------------------------------
# Run checks
# --------------------------------------------------------------------------

echo -e "${BOLD}ChefFlow Regression Check${NC}"
echo "Mode: $([ "$QUICK_MODE" = true ] && echo "quick" || echo "full")"
echo "================================================"

check_routes
check_api_routes
check_critical_files

if [ "$QUICK_MODE" = false ]; then
  check_server_actions
  check_critical_exports
  check_schema_tables

  # Run semantic regression checks (content-level analysis)
  if [ -f "$SCRIPT_DIR/regression-semantic.sh" ]; then
    echo ""
    echo -e "${BOLD}${CYAN}[SEMANTIC CHECKS]${NC} (delegating to regression-semantic.sh)"
    if bash "$SCRIPT_DIR/regression-semantic.sh" --quiet; then
      echo -e "  ${GREEN}OK${NC} Semantic checks passed"
    else
      echo -e "  ${RED}FAIL${NC} Semantic issues detected (see .regression-semantic-report.md)"
      FAILURES=$((FAILURES + 1))
      FAILED_ITEMS+=("semantic regression checks (run scripts/regression-semantic.sh for details)")
    fi
  fi
fi

# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------

echo ""
echo "================================================"

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}${BOLD}REGRESSION DETECTED${NC}"
  echo -e "  ${RED}$FAILURES failures${NC} / $CHECKS checks"
  echo ""
  echo -e "${BOLD}Missing:${NC}"
  for item in "${FAILED_ITEMS[@]}"; do
    echo "  - $item"
  done

  {
    echo "# Regression Report"
    echo ""
    echo "Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo "Status: **FAILED** ($FAILURES regressions)"
    echo ""
    echo "## Missing Features"
    echo ""
    for item in "${FAILED_ITEMS[@]}"; do
      echo "- \`$item\`"
    done
  } > "$REPORT_FILE"

  echo ""
  echo "Report written to .regression-report.md"
  exit 1
else
  echo -e "${GREEN}${BOLD}NO REGRESSIONS${NC}"
  echo -e "  $CHECKS checks passed"
  [ -f "$REPORT_FILE" ] && rm "$REPORT_FILE"
  exit 0
fi
