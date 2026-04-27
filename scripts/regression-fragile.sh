#!/usr/bin/env bash
# ============================================================================
# ChefFlow Fragile File Tracker
# ============================================================================
# Identifies files that are frequently modified and/or involved in regressions.
# High churn + yo-yo patterns + regression presence = fragile code.
#
# Usage:
#   bash scripts/regression-fragile.sh              # analyze (default)
#   bash scripts/regression-fragile.sh --analyze     # same as above
#   bash scripts/regression-fragile.sh --watch <file> [reason]
#   bash scripts/regression-fragile.sh --watchlist
#   bash scripts/regression-fragile.sh --auto-watch  # analyze + sync watchlist
#
# Output: .regression-fragile-report.md
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Use relative paths for node compatibility (node on Windows doesn't understand /c/ paths)
cd "$PROJECT_ROOT"

REPORT_FILE=".regression-fragile-report.md"
WATCHLIST_FILE="scripts/.fragile-watchlist.json"
SESSION_LOG="scripts/.session-changes.jsonl"
REGRESSION_REPORT=".regression-report.md"
REGISTRY_FILE="scripts/regression-registry.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# -------------------------------------------------------------------------
# Mode dispatch
# -------------------------------------------------------------------------
MODE="analyze"
WATCH_FILE=""
WATCH_REASON=""

case "${1:-}" in
  --watch)
    MODE="watch"
    WATCH_FILE="${2:-}"
    WATCH_REASON="${3:-Manually flagged}"
    if [[ -z "$WATCH_FILE" ]]; then
      echo -e "${RED}Usage: $0 --watch <file-path> [reason]${NC}"
      exit 1
    fi
    ;;
  --watchlist)
    MODE="watchlist"
    ;;
  --auto-watch)
    MODE="auto-watch"
    ;;
  --analyze|"")
    MODE="analyze"
    ;;
  *)
    echo -e "${RED}Unknown flag: $1${NC}"
    echo "Usage: $0 [--analyze | --watch <file> [reason] | --watchlist | --auto-watch]"
    exit 1
    ;;
esac

# -------------------------------------------------------------------------
# --watch: add a file to the watchlist
# -------------------------------------------------------------------------
if [[ "$MODE" == "watch" ]]; then
  # Initialize watchlist if missing
  if [[ ! -f "$WATCHLIST_FILE" ]]; then
    echo '[]' > "$WATCHLIST_FILE"
  fi

  node -e "
    const fs = require('fs');
    const list = JSON.parse(fs.readFileSync('$WATCHLIST_FILE', 'utf8'));
    const file = process.argv[1];
    const reason = process.argv[2];

    // Deduplicate
    const existing = list.findIndex(e => e.file === file);
    if (existing !== -1) {
      list[existing].reason = reason;
      list[existing].updated = new Date().toISOString().slice(0, 10);
      console.log('Updated: ' + file);
    } else {
      list.push({ file, reason, added: new Date().toISOString().slice(0, 10) });
      console.log('Added: ' + file);
    }
    fs.writeFileSync('$WATCHLIST_FILE', JSON.stringify(list, null, 2) + '\n');
  " "$WATCH_FILE" "$WATCH_REASON"
  exit 0
fi

# -------------------------------------------------------------------------
# --watchlist: display current watchlist
# -------------------------------------------------------------------------
if [[ "$MODE" == "watchlist" ]]; then
  if [[ ! -f "$WATCHLIST_FILE" ]] || [[ "$(cat "$WATCHLIST_FILE" 2>/dev/null)" == "[]" ]]; then
    echo -e "${DIM}Watchlist is empty.${NC}"
    exit 0
  fi

  echo -e "${BOLD}[FRAGILE WATCHLIST]${NC}"
  echo ""
  node -e "
    const fs = require('fs');
    const list = JSON.parse(fs.readFileSync('$WATCHLIST_FILE', 'utf8'));
    if (!list.length) { console.log('  (empty)'); process.exit(0); }
    const maxFile = Math.max(...list.map(e => e.file.length), 4);
    console.log('  ' + 'File'.padEnd(maxFile + 2) + 'Added       Reason');
    console.log('  ' + '-'.repeat(maxFile + 2) + '----------  ------');
    for (const e of list) {
      const date = e.updated || e.added;
      console.log('  ' + e.file.padEnd(maxFile + 2) + date + '  ' + e.reason);
    }
    console.log();
    console.log('  ' + list.length + ' file(s) watched.');
  "
  exit 0
fi

# -------------------------------------------------------------------------
# --analyze: full fragile file analysis
# -------------------------------------------------------------------------
echo -e "${BOLD}${CYAN}[FRAGILE FILE ANALYSIS]${NC} scanning last 30 days..."
echo ""

# Use project-local temp dir (mktemp paths don't work with node on Windows/MSYS2)
FRAGILE_TMP="scripts/.fragile-tmp"
mkdir -p "$FRAGILE_TMP"
trap 'rm -rf "$FRAGILE_TMP"' EXIT

# 1. Git churn: count commits per file (last 30 days)
git log --name-only --since="30 days ago" --pretty=format:"" -- . \
  | grep -v '^$' \
  | sort \
  | uniq -c \
  | sort -rn \
  > "$FRAGILE_TMP/churn.txt"

# 2. Yo-yo detection: files deleted then re-added in the last 30 days
git log --diff-filter=D --name-only --since="30 days ago" --pretty=format:"" -- . \
  | grep -v '^$' \
  | sort -u \
  > "$FRAGILE_TMP/deleted.txt"

git log --diff-filter=A --name-only --since="30 days ago" --pretty=format:"" -- . \
  | grep -v '^$' \
  | sort -u \
  > "$FRAGILE_TMP/added.txt"

# Files that appear in both deleted AND added = yo-yo
comm -12 "$FRAGILE_TMP/deleted.txt" "$FRAGILE_TMP/added.txt" > "$FRAGILE_TMP/yoyo.txt"

# Count yo-yo occurrences (how many times deleted)
: > "$FRAGILE_TMP/yoyo-counts.txt"
if [[ -s "$FRAGILE_TMP/yoyo.txt" ]]; then
  while IFS= read -r f; do
    count=$(git log --diff-filter=D --since="30 days ago" --pretty=format:"x" -- "$f" 2>/dev/null | wc -l | tr -d ' ')
    echo "$count $f" >> "$FRAGILE_TMP/yoyo-counts.txt"
  done < "$FRAGILE_TMP/yoyo.txt"
fi

# 3. Session changes: count how many sessions touched each file
: > "$FRAGILE_TMP/sessions.txt"
if [[ -f "$SESSION_LOG" ]]; then
  node -e "
    const fs = require('fs');
    const lines = fs.readFileSync(process.argv[1], 'utf8').trim().split('\n').filter(Boolean);
    const counts = {};
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        const files = obj.files_modified || [];
        for (const f of files) {
          counts[f] = (counts[f] || 0) + 1;
        }
      } catch {}
    }
    for (const [f, c] of Object.entries(counts)) {
      console.log(c + ' ' + f);
    }
  " "$SESSION_LOG" | sort -rn > "$FRAGILE_TMP/sessions.txt"
fi

# 4. Files in regression report
: > "$FRAGILE_TMP/regression-files.txt"
if [[ -f "$REGRESSION_REPORT" ]]; then
  grep -oE '[a-zA-Z][a-zA-Z0-9_./\[\]-]+\.(ts|tsx|js|jsx|mjs|json|css|sh)' "$REGRESSION_REPORT" \
    | sort -u > "$FRAGILE_TMP/regression-files.txt" 2>/dev/null || true
fi

# 5. Files in regression registry (critical files)
: > "$FRAGILE_TMP/registry-files.txt"
if [[ -f "$REGISTRY_FILE" ]]; then
  node -e "
    const fs = require('fs');
    const reg = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    const files = new Set();
    function walk(obj) {
      if (Array.isArray(obj)) {
        for (const v of obj) {
          if (typeof v === 'string' && !v.startsWith('_')) files.add(v);
          else if (typeof v === 'object' && v !== null) walk(v);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [k, v] of Object.entries(obj)) {
          if (k.startsWith('_')) continue;
          walk(v);
        }
      }
    }
    walk(reg);
    for (const f of files) console.log(f);
  " "$REGISTRY_FILE" | sort -u > "$FRAGILE_TMP/registry-files.txt"
fi

# 6. Watchlist files
: > "$FRAGILE_TMP/watchlist-files.txt"
if [[ -f "$WATCHLIST_FILE" ]]; then
  node -e "
    const fs = require('fs');
    const list = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    for (const e of list) console.log(e.file);
  " "$WATCHLIST_FILE" > "$FRAGILE_TMP/watchlist-files.txt" 2>/dev/null || true
fi

# 7. Combine everything and score with node
TMP_DIR="$FRAGILE_TMP" node -e "
  const fs = require('fs');
  const path = require('path');
  const tmp = process.env.TMP_DIR;

  // Parse churn: '  47 lib/ai/remy-actions.ts'
  const churnLines = fs.readFileSync(path.join(tmp, 'churn.txt'), 'utf8').trim().split('\n').filter(Boolean);
  const churn = {};
  for (const line of churnLines) {
    const m = line.trim().match(/^(\d+)\s+(.+)$/);
    if (m) churn[m[2]] = parseInt(m[1]);
  }

  // Parse session counts
  const sessFile = path.join(tmp, 'sessions.txt');
  const sessionLines = fs.existsSync(sessFile) && fs.statSync(sessFile).size > 0
    ? fs.readFileSync(sessFile, 'utf8').trim().split('\n').filter(Boolean)
    : [];
  const sessions = {};
  for (const line of sessionLines) {
    const m = line.trim().match(/^(\d+)\s+(.+)$/);
    if (m) sessions[m[2]] = parseInt(m[1]);
  }

  // Parse yo-yo counts
  const yoyoFile = path.join(tmp, 'yoyo-counts.txt');
  const yoyoLines = fs.existsSync(yoyoFile) && fs.statSync(yoyoFile).size > 0
    ? fs.readFileSync(yoyoFile, 'utf8').trim().split('\n').filter(Boolean)
    : [];
  const yoyo = {};
  for (const line of yoyoLines) {
    const m = line.trim().match(/^(\d+)\s+(.+)$/);
    if (m) yoyo[m[2]] = parseInt(m[1]);
  }

  // Regression report files
  const regFile = path.join(tmp, 'regression-files.txt');
  const regressionFiles = new Set(
    fs.existsSync(regFile) && fs.statSync(regFile).size > 0
      ? fs.readFileSync(regFile, 'utf8').trim().split('\n').filter(Boolean)
      : []
  );

  // Registry files (critical)
  const registryFile = path.join(tmp, 'registry-files.txt');
  const registryFiles = new Set(
    fs.existsSync(registryFile) && fs.statSync(registryFile).size > 0
      ? fs.readFileSync(registryFile, 'utf8').trim().split('\n').filter(Boolean)
      : []
  );

  // Watchlist files
  const watchFile = path.join(tmp, 'watchlist-files.txt');
  const watchlistFiles = new Set(
    fs.existsSync(watchFile) && fs.statSync(watchFile).size > 0
      ? fs.readFileSync(watchFile, 'utf8').trim().split('\n').filter(Boolean)
      : []
  );

  // Skip non-code files
  const skipPatterns = [
    /^\.openclaw-deploy\//,
    /^logs\//,
    /^docs\/uptime/,
    /^system\/persona/,
    /^\.regression/,
    /^docs\/session-digests/,
    /package-lock\.json$/,
    /\.jsonl$/,
  ];
  function shouldSkip(f) {
    return skipPatterns.some(p => p.test(f));
  }

  // All files with any signal
  const allFiles = new Set([
    ...Object.keys(churn),
    ...Object.keys(sessions),
    ...Object.keys(yoyo),
  ]);

  // Score each file
  const scored = [];
  for (const file of allFiles) {
    if (shouldSkip(file)) continue;

    const commits = churn[file] || 0;
    const sess = sessions[file] || 0;
    const yoyoCount = yoyo[file] || 0;
    const inRegression = regressionFiles.has(file);
    const inRegistry = registryFiles.has(file);
    const inWatchlist = watchlistFiles.has(file);

    // Base risk from commits
    let riskLevel = 0; // 0=LOW, 1=MED, 2=HIGH, 3=CRIT
    if (commits >= 50) riskLevel = 3;
    else if (commits >= 30) riskLevel = 2;
    else if (commits >= 15) riskLevel = 1;
    else riskLevel = 0;

    // Modifiers
    if (yoyoCount > 0) riskLevel = Math.min(3, riskLevel + 1);
    if (inRegression) riskLevel = Math.min(3, riskLevel + 1);
    if (inRegistry && commits >= 10) riskLevel = Math.min(3, riskLevel + 1);
    if (inWatchlist) riskLevel = Math.min(3, riskLevel + 1);

    // Numeric score for sorting (higher = more fragile)
    const score = commits * 2 + sess * 3 + yoyoCount * 20 + (inRegression ? 30 : 0) + (inRegistry ? 10 : 0) + (inWatchlist ? 15 : 0);

    scored.push({
      file, commits, sess, yoyoCount, inRegression, inRegistry, inWatchlist,
      riskLevel, score
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const riskLabels = ['LOW ', 'MED ', 'HIGH', 'CRIT'];
  const riskColors = ['\x1b[0m', '\x1b[1;33m', '\x1b[0;31m', '\x1b[1;31m'];
  const NC = '\x1b[0m';
  const BOLD = '\x1b[1m';
  const DIM = '\x1b[2m';
  const CYAN = '\x1b[0;36m';

  // Terminal output (top 20)
  const top = scored.filter(s => s.riskLevel >= 1).slice(0, 20);
  const critCount = scored.filter(s => s.riskLevel === 3).length;
  const highCount = scored.filter(s => s.riskLevel === 2).length;
  const medCount = scored.filter(s => s.riskLevel === 1).length;

  console.log(BOLD + '[FRAGILE FILES]' + NC + ' (last 30 days)');
  console.log();

  if (top.length === 0) {
    console.log('  No fragile files detected. Codebase is stable.');
  } else {
    // Header
    const maxFile = Math.min(60, Math.max(...top.map(s => s.file.length), 4));
    console.log(
      '  ' + 'Risk'.padEnd(6) +
      'File'.padEnd(maxFile + 2) +
      'Commits'.padEnd(10) +
      'Sessions'.padEnd(10) +
      'Yo-yo'.padEnd(8) +
      'In-regression'
    );
    console.log(
      '  ' + '----'.padEnd(6) +
      '----'.padEnd(maxFile + 2) +
      '-------'.padEnd(10) +
      '--------'.padEnd(10) +
      '-----'.padEnd(8) +
      '-------------'
    );

    for (const s of top) {
      const color = riskColors[s.riskLevel];
      const label = riskLabels[s.riskLevel];
      const yoyoStr = s.yoyoCount > 0 ? s.yoyoCount + 'x' : '-';
      const regStr = s.inRegression ? 'YES' : '-';
      const fileStr = s.file.length > maxFile ? '...' + s.file.slice(-(maxFile - 3)) : s.file;

      console.log(
        '  ' + color + label + NC + '  ' +
        fileStr.padEnd(maxFile + 2) +
        String(s.commits).padEnd(10) +
        String(s.sess).padEnd(10) +
        yoyoStr.padEnd(8) +
        regStr
      );
    }

    console.log();
    console.log(DIM + '  Summary: ' + critCount + ' CRIT, ' + highCount + ' HIGH, ' + medCount + ' MED out of ' + scored.length + ' files analyzed.' + NC);
    console.log(DIM + '  Full report: .regression-fragile-report.md' + NC);
  }

  // Write full markdown report
  const reportFile = process.argv[1];
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let md = '# Fragile File Report\n\n';
  md += '> Generated: ' + now + ' UTC\n';
  md += '> Window: last 30 days\n';
  md += '> Files analyzed: ' + scored.length + '\n\n';

  md += '## Summary\n\n';
  md += '| Risk | Count |\n';
  md += '|------|-------|\n';
  md += '| CRIT | ' + critCount + ' |\n';
  md += '| HIGH | ' + highCount + ' |\n';
  md += '| MED  | ' + medCount + ' |\n';
  md += '| LOW  | ' + scored.filter(s => s.riskLevel === 0).length + ' |\n\n';

  md += '## Top Fragile Files\n\n';
  md += '| Risk | File | Commits | Sessions | Yo-yo | In Regression | In Registry | On Watchlist |\n';
  md += '|------|------|---------|----------|-------|---------------|-------------|-------------|\n';

  const reportTop = scored.filter(s => s.riskLevel >= 1).slice(0, 50);
  for (const s of reportTop) {
    const label = riskLabels[s.riskLevel].trim();
    const yoyoStr = s.yoyoCount > 0 ? s.yoyoCount + 'x' : '-';
    md += '| ' + label + ' | \`' + s.file + '\` | ' + s.commits + ' | ' + s.sess + ' | ' + yoyoStr + ' | ' + (s.inRegression ? 'YES' : '-') + ' | ' + (s.inRegistry ? 'YES' : '-') + ' | ' + (s.inWatchlist ? 'YES' : '-') + ' |\n';
  }

  if (scored.filter(s => s.riskLevel === 0).length > 0) {
    md += '\n## Low-Risk Files (high churn but no other signals)\n\n';
    md += '<details><summary>Show ' + scored.filter(s => s.riskLevel === 0 && s.commits >= 5).length + ' files</summary>\n\n';
    md += '| File | Commits | Sessions |\n';
    md += '|------|---------|----------|\n';
    for (const s of scored.filter(s => s.riskLevel === 0 && s.commits >= 5).slice(0, 50)) {
      md += '| \`' + s.file + '\` | ' + s.commits + ' | ' + s.sess + ' |\n';
    }
    md += '\n</details>\n';
  }

  // Yo-yo section
  const yoyoFiles = scored.filter(s => s.yoyoCount > 0);
  if (yoyoFiles.length > 0) {
    md += '\n## Yo-yo Files (deleted and re-added)\n\n';
    md += 'These files were deleted and then re-added within 30 days, indicating instability.\n\n';
    md += '| File | Times Deleted | Current Risk |\n';
    md += '|------|---------------|-------------|\n';
    for (const s of yoyoFiles) {
      md += '| \`' + s.file + '\` | ' + s.yoyoCount + ' | ' + riskLabels[s.riskLevel].trim() + ' |\n';
    }
  }

  md += '\n---\n';
  md += '*Generated by \`scripts/regression-fragile.sh\`*\n';

  fs.writeFileSync(reportFile, md);

  // Write scored data as JSON for --auto-watch consumption
  const scoredJsonFile = path.join(tmp, 'scored.json');
  fs.writeFileSync(scoredJsonFile, JSON.stringify(scored));
" "$REPORT_FILE" 2>&1

echo ""
echo -e "${DIM}Report written to .regression-fragile-report.md${NC}"

# -------------------------------------------------------------------------
# --auto-watch: sync watchlist from analyze results
# -------------------------------------------------------------------------
if [[ "$MODE" == "auto-watch" ]]; then
  echo ""
  echo -e "${BOLD}${CYAN}[AUTO-WATCH]${NC} Syncing watchlist from analysis results..."

  # Initialize watchlist if missing
  if [[ ! -f "$WATCHLIST_FILE" ]]; then
    echo '[]' > "$WATCHLIST_FILE"
  fi

  TMP_DIR="$FRAGILE_TMP" node -e "
    const fs = require('fs');
    const path = require('path');
    const tmp = process.env.TMP_DIR;

    const scored = JSON.parse(fs.readFileSync(path.join(tmp, 'scored.json'), 'utf8'));
    const watchlistPath = process.argv[1];
    const watchlist = JSON.parse(fs.readFileSync(watchlistPath, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);

    const riskLabels = ['LOW', 'MED', 'HIGH', 'CRIT'];

    // Build set of files that qualify (CRIT=3 or HIGH=2)
    const qualifyingFiles = new Map();
    for (const s of scored) {
      if (s.riskLevel >= 2) {
        // Build reason string
        const parts = ['Auto-added: ' + riskLabels[s.riskLevel] + ' risk'];
        parts.push(s.commits + ' commits in 30 days');
        if (s.yoyoCount > 0) parts.push('yo-yo file');
        if (s.inRegression) parts.push('in regression report');
        if (s.inRegistry) parts.push('in registry');
        // Join: first part is label, rest are details
        const reason = parts[0] + ', ' + parts.slice(1).join(', ');
        qualifyingFiles.set(s.file, reason);
      }
    }

    // Track changes
    let added = 0;
    let updated = 0;
    let removed = 0;

    // Add or update qualifying files
    for (const [file, reason] of qualifyingFiles) {
      const idx = watchlist.findIndex(e => e.file === file);
      if (idx !== -1) {
        // Update if reason changed (but keep manually-flagged entries as-is)
        if (watchlist[idx].reason.startsWith('Auto-added:')) {
          watchlist[idx].reason = reason;
          watchlist[idx].updated = today;
          updated++;
        }
      } else {
        watchlist.push({ file, reason, added: today });
        added++;
      }
    }

    // Remove stale auto-added entries that dropped below HIGH
    const before = watchlist.length;
    const filtered = watchlist.filter(e => {
      // Keep manually-added entries always
      if (!e.reason.startsWith('Auto-added:')) return true;
      // Keep if still qualifying
      if (qualifyingFiles.has(e.file)) return true;
      // Dropped below threshold; remove
      removed++;
      return false;
    });

    fs.writeFileSync(watchlistPath, JSON.stringify(filtered, null, 2) + '\n');

    const total = filtered.length;
    console.log('Added ' + added + ' files, removed ' + removed + ' files, watchlist now has ' + total + ' files');
    if (updated > 0) {
      console.log('(' + updated + ' existing auto-watch entries updated)');
    }
  " "$WATCHLIST_FILE" 2>&1
fi
