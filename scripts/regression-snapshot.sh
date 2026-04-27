#!/usr/bin/env bash
# ============================================================================
# ChefFlow Automatic Regression Snapshot
# ============================================================================
# Zero-config regression detection. No manual registry needed.
# Captures the full surface area of the app automatically, then diffs
# against a blessed snapshot to catch deletions (regressions).
#
# Usage:
#   bash scripts/regression-snapshot.sh --capture   # snapshot current state
#   bash scripts/regression-snapshot.sh --diff      # compare against snapshot
#   bash scripts/regression-snapshot.sh             # print help
#
# The snapshot file (scripts/.regression-snapshot.json) is tracked in git.
# Run --capture after milestones, commit the result. All agents compare
# against that shared baseline.
#
# Exit codes:
#   0 = no regressions (additions are fine)
#   1 = something disappeared since last snapshot
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SNAPSHOT_FILE="$SCRIPT_DIR/.regression-snapshot.json"

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
  echo -e "${BOLD}ChefFlow Regression Snapshot${NC}"
  echo ""
  echo "Usage:"
  echo "  bash scripts/regression-snapshot.sh --capture   Snapshot current state"
  echo "  bash scripts/regression-snapshot.sh --diff      Compare against snapshot"
  echo ""
  echo "The snapshot file is scripts/.regression-snapshot.json"
  echo "Commit it to git so all agents share the same baseline."
  exit 0
}

# -------------------------------------------------------------------------
# Mode 1: --capture
# -------------------------------------------------------------------------
do_capture() {
  echo -e "${BOLD}${CYAN}[CAPTURE]${NC} Scanning codebase..."

  node -e "
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.argv[1];

// --- 1. All page.tsx under app/ ---
function findFiles(dir, pattern, results) {
  results = results || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      findFiles(full, pattern, results);
    } else if (e.name === pattern) {
      results.push(full);
    }
  }
  return results;
}

const appDir = path.join(root, 'app');
const pages = findFiles(appDir, 'page.tsx')
  .map(f => path.relative(root, f).replace(/\\\\/g, '/'))
  .sort();

const apiRoutes = findFiles(path.join(root, 'app', 'api'), 'route.ts')
  .map(f => path.relative(root, f).replace(/\\\\/g, '/'))
  .sort();

// --- 2. Server action exports from lib/ ---
function findAllFiles(dir, ext, results) {
  results = results || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      findAllFiles(full, ext, results);
    } else if (e.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const libDir = path.join(root, 'lib');
const serverActions = {};
const tsFiles = findAllFiles(libDir, '.ts');

for (const file of tsFiles) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch { continue; }

  // Only files with 'use server' directive
  if (!content.includes(\"'use server'\") && !content.includes('\"use server\"')) continue;

  const relPath = path.relative(root, file).replace(/\\\\/g, '/');
  const fns = [];

  // Match: export async function NAME or export function NAME
  const fnRegex = /export\\s+(?:async\\s+)?function\\s+(\\w+)/g;
  let m;
  while ((m = fnRegex.exec(content)) !== null) {
    fns.push(m[1]);
  }

  if (fns.length > 0) {
    serverActions[relPath] = fns.sort();
  }
}

// --- 3. Schema tables ---
const schemaFile = path.join(root, 'lib', 'db', 'schema', 'schema.ts');
let tables = [];
try {
  const schemaContent = fs.readFileSync(schemaFile, 'utf8');
  const tableRegex = /pgTable\\(\"([^\"]+)\"/g;
  let tm;
  while ((tm = tableRegex.exec(schemaContent)) !== null) {
    tables.push(tm[1]);
  }
  tables = [...new Set(tables)].sort();
} catch {
  console.error('Warning: could not read schema file');
}

// --- Build snapshot ---
const snapshot = {
  _meta: {
    captured_at: new Date().toISOString(),
    captured_by: 'regression-snapshot.sh --capture',
    pages_count: pages.length,
    api_routes_count: apiRoutes.length,
    server_action_files_count: Object.keys(serverActions).length,
    server_action_exports_count: Object.values(serverActions).reduce((a, b) => a + b.length, 0),
    tables_count: tables.length
  },
  pages: pages,
  api_routes: apiRoutes,
  server_actions: serverActions,
  tables: tables
};

fs.writeFileSync(process.argv[2], JSON.stringify(snapshot, null, 2) + '\\n');

console.log('  Pages:          ' + pages.length);
console.log('  API routes:     ' + apiRoutes.length);
console.log('  Action files:   ' + Object.keys(serverActions).length);
console.log('  Action exports: ' + Object.values(serverActions).reduce((a, b) => a + b.length, 0));
console.log('  Schema tables:  ' + tables.length);
" "$PROJECT_ROOT" "$SNAPSHOT_FILE"

  echo ""
  echo -e "${GREEN}${BOLD}Snapshot saved${NC} to scripts/.regression-snapshot.json"
  echo "Commit it to git so all agents share this baseline."
}

# -------------------------------------------------------------------------
# Mode 2: --diff
# -------------------------------------------------------------------------
do_diff() {
  if [ ! -f "$SNAPSHOT_FILE" ]; then
    echo -e "${RED}No snapshot found.${NC} Run --capture first."
    exit 1
  fi

  node -e "
const fs = require('fs');
const path = require('path');

const root = process.argv[1];
const snapshotFile = process.argv[2];
const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));

// --- Re-scan current state (same logic as capture) ---
function findFiles(dir, pattern, results) {
  results = results || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      findFiles(full, pattern, results);
    } else if (e.name === pattern) {
      results.push(full);
    }
  }
  return results;
}

function findAllFiles(dir, ext, results) {
  results = results || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      findAllFiles(full, ext, results);
    } else if (e.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const appDir = path.join(root, 'app');
const nowPages = new Set(
  findFiles(appDir, 'page.tsx').map(f => path.relative(root, f).replace(/\\\\/g, '/'))
);
const nowApiRoutes = new Set(
  findFiles(path.join(root, 'app', 'api'), 'route.ts').map(f => path.relative(root, f).replace(/\\\\/g, '/'))
);

// Server actions
const libDir = path.join(root, 'lib');
const nowActions = {};
const tsFiles = findAllFiles(libDir, '.ts');
for (const file of tsFiles) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); }
  catch { continue; }
  if (!content.includes(\"'use server'\") && !content.includes('\"use server\"')) continue;
  const relPath = path.relative(root, file).replace(/\\\\/g, '/');
  const fns = [];
  const fnRegex = /export\\s+(?:async\\s+)?function\\s+(\\w+)/g;
  let m;
  while ((m = fnRegex.exec(content)) !== null) {
    fns.push(m[1]);
  }
  if (fns.length > 0) nowActions[relPath] = new Set(fns);
}

// Schema tables
const schemaFile = path.join(root, 'lib', 'db', 'schema', 'schema.ts');
const nowTables = new Set();
try {
  const sc = fs.readFileSync(schemaFile, 'utf8');
  const tr = /pgTable\\(\"([^\"]+)\"/g;
  let tm;
  while ((tm = tr.exec(sc)) !== null) nowTables.add(tm[1]);
} catch {}

// --- Diff ---
const disappeared = [];
const added = [];

// Pages
for (const p of snapshot.pages) {
  if (!nowPages.has(p)) disappeared.push(p);
}
for (const p of nowPages) {
  if (!snapshot.pages.includes(p)) added.push(p);
}

// API routes
for (const r of snapshot.api_routes) {
  if (!nowApiRoutes.has(r)) disappeared.push(r);
}
for (const r of nowApiRoutes) {
  if (!snapshot.api_routes.includes(r)) added.push(r);
}

// Server actions
for (const [file, fns] of Object.entries(snapshot.server_actions)) {
  const currentFns = nowActions[file];
  for (const fn of fns) {
    if (!currentFns || !currentFns.has(fn)) {
      disappeared.push(file + '::' + fn);
    }
  }
}
for (const [file, fns] of Object.entries(nowActions)) {
  const snapshotFns = new Set(snapshot.server_actions[file] || []);
  for (const fn of fns) {
    if (!snapshotFns.has(fn)) {
      added.push(file + '::' + fn);
    }
  }
}

// Tables
for (const t of snapshot.tables) {
  if (!nowTables.has(t)) disappeared.push('schema::' + t);
}
for (const t of nowTables) {
  if (!snapshot.tables.includes(t)) added.push('schema::' + t);
}

// --- Output ---
const RED = '\\x1b[0;31m';
const GREEN = '\\x1b[0;32m';
const YELLOW = '\\x1b[1;33m';
const CYAN = '\\x1b[0;36m';
const BOLD = '\\x1b[1m';
const DIM = '\\x1b[2m';
const NC = '\\x1b[0m';

console.log(BOLD + '[SNAPSHOT DIFF]' + NC);
console.log(DIM + 'Baseline: ' + snapshot._meta.captured_at + NC);
console.log('');

if (disappeared.length === 0 && added.length === 0) {
  console.log(GREEN + BOLD + '  No changes since snapshot.' + NC);
  process.exit(0);
}

disappeared.sort();
added.sort();

for (const d of disappeared) {
  console.log(RED + '  DISAPPEARED  ' + NC + d);
}
for (const a of added) {
  console.log(GREEN + '  NEW          ' + NC + a);
}

console.log('');
const summary = [];
if (disappeared.length > 0) summary.push(RED + disappeared.length + ' regressions' + NC);
if (added.length > 0) summary.push(GREEN + added.length + ' additions' + NC);
console.log('  ' + summary.join(' / '));

if (disappeared.length > 0) {
  process.exit(1);
}
" "$PROJECT_ROOT" "$SNAPSHOT_FILE"
}

# -------------------------------------------------------------------------
# Main
# -------------------------------------------------------------------------

case "${1:-}" in
  --capture)
    do_capture
    ;;
  --diff)
    do_diff
    ;;
  *)
    print_help
    ;;
esac
