#!/usr/bin/env bash
# regression-session-log.sh - Track which agent sessions touched which files
# Usage:
#   ./scripts/regression-session-log.sh --record [--label "description"]
#   ./scripts/regression-session-log.sh --trace <file_path>
#   ./scripts/regression-session-log.sh --recent [N]
#   ./scripts/regression-session-log.sh --blame

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGFILE="$SCRIPT_DIR/.session-changes.jsonl"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REGRESSION_REPORT="$REPO_ROOT/.regression-report.md"

# Ensure the JSONL file exists
touch "$LOGFILE"

usage() {
  echo "Usage:"
  echo "  $0 --record [--label \"description\"]   Record current session's changed files"
  echo "  $0 --trace <file_path>                 Show sessions that touched a file"
  echo "  $0 --recent [N]                        Show last N session records (default 10)"
  echo "  $0 --blame                             Cross-reference regressions with sessions"
  exit 1
}

# ── MODE: --record ──────────────────────────────────────────────────────────
do_record() {
  local label="${1:-}"

  cd "$REPO_ROOT"

  # Collect unstaged + staged changed files (deduplicated)
  local files
  files=$(
    {
      git diff --name-only 2>/dev/null || true
      git diff --cached --name-only 2>/dev/null || true
    } | sort -u
  )

  if [ -z "$files" ]; then
    echo "No uncommitted changes to record."
    exit 0
  fi

  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

  local last_commit
  last_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "none")

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  local file_count
  file_count=$(echo "$files" | wc -l | tr -d ' ')

  # Write file list to a temp file for node to read (cross-platform)
  local tmpfile
  tmpfile=$(mktemp)
  echo "$files" > "$tmpfile"

  # Build and append the JSON entry via node
  local logfile_escaped
  logfile_escaped=$(echo "$LOGFILE" | sed 's/\\/\\\\/g')

  node -e "
    const fs = require('fs');
    const fileList = fs.readFileSync(process.argv[1], 'utf8').trim().split('\n').filter(Boolean);
    const entry = {
      timestamp: process.argv[2],
      branch: process.argv[3],
      last_commit: process.argv[4],
      files_modified: fileList,
      file_count: parseInt(process.argv[5], 10)
    };
    const label = process.argv[6];
    if (label) entry.label = label;
    fs.appendFileSync(process.argv[7], JSON.stringify(entry) + '\n');
  " "$tmpfile" "$timestamp" "$branch" "$last_commit" "$file_count" "$label" "$LOGFILE"

  rm -f "$tmpfile"

  echo "Recorded session: $file_count files on $branch at $timestamp"
  if [ -n "$label" ]; then
    echo "  Label: $label"
  fi
}

# ── MODE: --trace ───────────────────────────────────────────────────────────
do_trace() {
  local target="$1"

  if [ ! -s "$LOGFILE" ]; then
    echo "No session records found. Run --record first."
    exit 0
  fi

  echo "Sessions that modified $target:"
  echo ""

  node -e "
    const fs = require('fs');
    const logfile = process.argv[1];
    const target = process.argv[2];
    const lines = fs.readFileSync(logfile, 'utf8').trim().split('\n').filter(Boolean);
    let found = false;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const match = entry.files_modified.some(f =>
          f === target || f.endsWith('/' + target) || target.endsWith('/' + f)
        );
        if (match) {
          found = true;
          const ts = entry.timestamp.replace('T', ' ').replace('Z', '');
          const dateStr = ts.substring(0, 16);
          const branch = (entry.branch || 'unknown').padEnd(20);
          const label = entry.label ? '\"' + entry.label + '\"' : '(no label)';
          const count = entry.file_count || entry.files_modified.length;
          console.log('  ' + dateStr + '  ' + branch + ' ' + label.padEnd(30) + ' (' + count + ' files in session)');
        }
      } catch {}
    }

    if (!found) {
      console.log('  (no sessions found for this file)');
    }
  " "$LOGFILE" "$target"
}

# ── MODE: --recent ──────────────────────────────────────────────────────────
do_recent() {
  local count="${1:-10}"

  if [ ! -s "$LOGFILE" ]; then
    echo "No session records found. Run --record first."
    exit 0
  fi

  echo "Last $count session records:"
  echo ""
  printf "  %-17s %-22s %-30s %s\n" "TIMESTAMP" "BRANCH" "LABEL" "FILES"
  printf "  %-17s %-22s %-30s %s\n" "---------" "------" "-----" "-----"

  node -e "
    const fs = require('fs');
    const logfile = process.argv[1];
    const n = parseInt(process.argv[2], 10);
    const lines = fs.readFileSync(logfile, 'utf8').trim().split('\n').filter(Boolean);
    const entries = [];

    for (const line of lines) {
      try { entries.push(JSON.parse(line)); } catch {}
    }

    const recent = entries.slice(-n);
    for (const entry of recent) {
      const ts = entry.timestamp.replace('T', ' ').replace('Z', '').substring(0, 16);
      const branch = (entry.branch || 'unknown').substring(0, 20).padEnd(22);
      const label = (entry.label ? '\"' + entry.label + '\"' : '(no label)').substring(0, 28).padEnd(30);
      const fc = entry.file_count || entry.files_modified.length;
      console.log('  ' + ts + '  ' + branch + ' ' + label + ' ' + fc + ' files');
    }
  " "$LOGFILE" "$count"
}

# ── MODE: --blame ───────────────────────────────────────────────────────────
do_blame() {
  if [ ! -f "$REGRESSION_REPORT" ]; then
    echo "No .regression-report.md found at $REGRESSION_REPORT"
    echo "Create one with file paths to trace regressions."
    exit 1
  fi

  if [ ! -s "$LOGFILE" ]; then
    echo "No session records found. Run --record first."
    exit 0
  fi

  echo "REGRESSION BLAME:"
  echo ""

  # Extract file paths from the regression report (lines containing paths with extensions)
  node -e "
    const fs = require('fs');
    const reportPath = process.argv[1];
    const logfile = process.argv[2];
    const report = fs.readFileSync(reportPath, 'utf8');
    const logLines = fs.readFileSync(logfile, 'utf8').trim().split('\n').filter(Boolean);

    // Parse all session entries
    const entries = [];
    for (const line of logLines) {
      try { entries.push(JSON.parse(line)); } catch {}
    }

    // Extract file paths from regression report
    // Match patterns like: path/to/file.ext, path/to/file.ext::functionName()
    const pathRegex = /(?:^|\s)((?:[\w@.-]+\/)+[\w.-]+(?:::[\w()]+)?)/gm;
    const paths = [];
    const seen = new Set();
    let match;
    while ((match = pathRegex.exec(report)) !== null) {
      const raw = match[1];
      const filePath = raw.split('::')[0];
      if (filePath.includes('.') && !filePath.startsWith('http') && !seen.has(raw)) {
        seen.add(raw);
        paths.push({ display: raw, file: filePath });
      }
    }

    if (paths.length === 0) {
      console.log('  No file paths found in .regression-report.md');
      process.exit(0);
    }

    for (const { display, file } of paths) {
      console.log('  ' + display);

      // Find last session that touched this file
      let lastEntry = null;
      for (const entry of entries) {
        const matched = entry.files_modified.some(f =>
          f === file || f.endsWith('/' + file) || file.endsWith('/' + f)
        );
        if (matched) lastEntry = entry;
      }

      if (lastEntry) {
        const ts = lastEntry.timestamp.replace('T', ' ').replace('Z', '').substring(0, 16);
        const label = lastEntry.label ? ' (\"' + lastEntry.label + '\")' : '';
        console.log('    Last touched: ' + ts + ' on ' + lastEntry.branch + label);
      } else {
        console.log('    (no session record found)');
      }
      console.log('');
    }
  " "$REGRESSION_REPORT" "$LOGFILE"
}

# ── ARGUMENT PARSING ────────────────────────────────────────────────────────

if [ $# -eq 0 ]; then
  usage
fi

case "$1" in
  --record)
    shift
    label=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --label)
          shift
          label="${1:-}"
          shift
          ;;
        *)
          echo "Unknown option for --record: $1"
          usage
          ;;
      esac
    done
    do_record "$label"
    ;;
  --trace)
    shift
    if [ $# -eq 0 ]; then
      echo "Error: --trace requires a file path"
      usage
    fi
    do_trace "$1"
    ;;
  --recent)
    shift
    do_recent "${1:-10}"
    ;;
  --blame)
    do_blame
    ;;
  -h|--help)
    usage
    ;;
  *)
    echo "Unknown command: $1"
    usage
    ;;
esac
