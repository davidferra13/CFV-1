#!/usr/bin/env bash
# ============================================================================
# ChefFlow Regression Trend Logger
# ============================================================================
# Tracks regression check results over time to spot patterns.
#
# Usage:
#   bash scripts/regression-trend.sh --log       # append current state
#   bash scripts/regression-trend.sh --show       # display last 20 entries
#   bash scripts/regression-trend.sh --show 10    # display last 10 entries
#
# Data stored in scripts/.regression-trend.jsonl (JSON Lines, one object/line).
# Tracked in git so trends persist across branches.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TREND_FILE="$SCRIPT_DIR/.regression-trend.jsonl"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# -------------------------------------------------------------------------
# Help
# -------------------------------------------------------------------------
print_help() {
  echo -e "${BOLD}ChefFlow Regression Trend Logger${NC}"
  echo ""
  echo "Usage:"
  echo "  bash scripts/regression-trend.sh --log       Log current state"
  echo "  bash scripts/regression-trend.sh --show      Show last 20 entries"
  echo "  bash scripts/regression-trend.sh --show N    Show last N entries"
  echo ""
  echo "Data: scripts/.regression-trend.jsonl"
  exit 0
}

# -------------------------------------------------------------------------
# --log: Capture current state and append to trend file
# -------------------------------------------------------------------------
do_log() {
  local timestamp branch status registry_checks registry_failures

  timestamp=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

  # Run regression check (quick mode) and capture result
  status="clean"
  registry_checks=0
  registry_failures=0

  local reg_output
  if reg_output=$(bash "$SCRIPT_DIR/regression-check.sh" --quick 2>&1); then
    status="clean"
  else
    status="regression"
  fi

  # Extract check/failure counts from output
  registry_checks=$(echo "$reg_output" | grep -oE '[0-9]+ checks' | head -1 | grep -oE '[0-9]+' || echo "0")
  registry_failures=$(echo "$reg_output" | grep -oE '[0-9]+ failures' | head -1 | grep -oE '[0-9]+' || echo "0")

  # Count pages, API routes, and server action exports via node
  node -e "
const fs = require('fs');
const path = require('path');

const root = process.argv[1];
const trendFile = process.argv[2];
const timestamp = process.argv[3];
const branch = process.argv[4];
const regChecks = parseInt(process.argv[5]) || 0;
const regFailures = parseInt(process.argv[6]) || 0;
const status = process.argv[7];

// Find files recursively
function findFiles(dir, filename, results) {
  results = results || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      findFiles(full, filename, results);
    } else if (e.name === filename) {
      results.push(full);
    }
  }
  return results;
}

function findAllTs(dir, results) {
  results = results || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      findAllTs(full, results);
    } else if (e.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const appDir = path.join(root, 'app');

// Count page.tsx files
const pages = findFiles(appDir, 'page.tsx').length;

// Count route.ts files
const apiRoutes = findFiles(path.join(root, 'app', 'api'), 'route.ts').length;

// Count 'use server' export functions
let exports = 0;
const libDir = path.join(root, 'lib');
const tsFiles = findAllTs(libDir);
for (const file of tsFiles) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch { continue; }
  if (!content.includes(\"'use server'\") && !content.includes('\"use server\"')) continue;
  const fnRegex = /export\\s+(?:async\\s+)?function\\s+\\w+/g;
  let m;
  while ((m = fnRegex.exec(content)) !== null) {
    exports++;
  }
}

// Count schema tables
let tables = 0;
try {
  const schemaContent = fs.readFileSync(path.join(root, 'lib', 'db', 'schema', 'schema.ts'), 'utf8');
  const tableRegex = /pgTable\\(\"[^\"]+\"/g;
  const matches = schemaContent.match(tableRegex);
  if (matches) {
    tables = new Set(matches.map(m => m.match(/\"([^\"]+)\"/)[1])).size;
  }
} catch {}

const entry = {
  timestamp,
  branch,
  pages,
  api_routes: apiRoutes,
  exports,
  tables,
  registry_checks: regChecks,
  registry_failures: regFailures,
  status
};

fs.appendFileSync(trendFile, JSON.stringify(entry) + '\\n');

console.log('Trend logged: ' + pages + ' pages, ' + apiRoutes + ' APIs, ' + exports + ' exports, ' + tables + ' tables [' + status + ']');
" "$PROJECT_ROOT" "$TREND_FILE" "$timestamp" "$branch" "$registry_checks" "$registry_failures" "$status"
}

# -------------------------------------------------------------------------
# --show: Display trend history as a table
# -------------------------------------------------------------------------
do_show() {
  local count="${1:-20}"

  if [ ! -f "$TREND_FILE" ]; then
    echo -e "${YELLOW}No trend data yet.${NC} Run --log first."
    exit 0
  fi

  node -e "
const fs = require('fs');

const file = process.argv[1];
const count = parseInt(process.argv[2]) || 20;

const lines = fs.readFileSync(file, 'utf8').trim().split('\\n').filter(Boolean);
const entries = lines.map(l => {
  try { return JSON.parse(l); }
  catch { return null; }
}).filter(Boolean);

if (entries.length === 0) {
  console.log('No trend data.');
  process.exit(0);
}

// Take last N entries
const show = entries.slice(-count);

// Colors
const RED = '\\x1b[0;31m';
const GREEN = '\\x1b[0;32m';
const YELLOW = '\\x1b[1;33m';
const CYAN = '\\x1b[0;36m';
const BOLD = '\\x1b[1m';
const DIM = '\\x1b[2m';
const NC = '\\x1b[0m';

// Delta arrows
function delta(curr, prev) {
  if (prev === undefined || prev === null) return '';
  const d = curr - prev;
  if (d > 0) return GREEN + ' +' + d + NC;
  if (d < 0) return RED + ' ' + d + NC;
  return '';
}

// Header
const hdr = [
  'Date'.padEnd(12),
  'Branch'.padEnd(30),
  'Pages'.padEnd(12),
  'APIs'.padEnd(12),
  'Exports'.padEnd(14),
  'Tables'.padEnd(12),
  'Status'
];
console.log(BOLD + hdr.join('') + NC);
console.log('-'.repeat(100));

for (let i = 0; i < show.length; i++) {
  const e = show[i];
  const prev = i > 0 ? show[i - 1] : (entries.length > count ? entries[entries.length - count - 1] : null);

  const date = e.timestamp.substring(0, 10);
  const branch = (e.branch || 'unknown').substring(0, 28);

  const pagesStr = String(e.pages).padEnd(6) + (delta(e.pages, prev ? prev.pages : undefined)).padEnd(6);
  const apisStr = String(e.api_routes).padEnd(6) + (delta(e.api_routes, prev ? prev.api_routes : undefined)).padEnd(6);
  const exportsStr = String(e.exports).padEnd(6) + (delta(e.exports, prev ? prev.exports : undefined)).padEnd(8);
  const tablesStr = String(e.tables).padEnd(6) + (delta(e.tables, prev ? prev.tables : undefined)).padEnd(6);

  let statusStr;
  if (e.status === 'regression') {
    statusStr = RED + BOLD + 'REGRESSION (' + e.registry_failures + ')' + NC;
  } else {
    statusStr = GREEN + 'clean' + NC;
  }

  // Build line with raw padding (before ANSI codes mess up alignment)
  const line = date.padEnd(12)
    + branch.padEnd(30)
    + pagesStr
    + apisStr
    + exportsStr
    + tablesStr
    + statusStr;

  console.log(line);
}

console.log('');
console.log(DIM + entries.length + ' total entries, showing last ' + show.length + NC);
" "$TREND_FILE" "$count"
}

# -------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------

case "${1:-}" in
  --log)
    do_log
    ;;
  --show)
    do_show "${2:-20}"
    ;;
  *)
    print_help
    ;;
esac
