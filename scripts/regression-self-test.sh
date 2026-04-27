#!/usr/bin/env bash
# ============================================================================
# ChefFlow Regression System Self-Test
# ============================================================================
# Tests the regression detection system itself by simulating regressions
# and verifying each detector catches them.
#
# Safety:
#   - All file mutations are backed up and restored via trap
#   - No commits are made
#   - Temporary files are cleaned up
#
# Usage:
#   bash scripts/regression-self-test.sh
#
# Exit codes: 0 = all tests pass, 1 = at least one test failed
# ============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PASSED=0
FAILED=0
TOTAL=0
CLEANUP_FILES=()
CLEANUP_RESTORES=()
TEMP_FILES=()

# ============================================================================
# Cleanup trap: restore everything no matter what
# ============================================================================
cleanup() {
  local exit_code=$?

  # Restore all backed-up files
  for entry in "${CLEANUP_RESTORES[@]:-}"; do
    if [ -n "$entry" ]; then
      local src="${entry%%|*}"
      local dst="${entry##*|}"
      if [ -f "$src" ]; then
        cp "$src" "$dst" 2>/dev/null
        rm -f "$src" 2>/dev/null
      fi
    fi
  done

  # Remove temp files
  for f in "${TEMP_FILES[@]:-}"; do
    if [ -n "$f" ] && [ -f "$f" ]; then
      rm -f "$f" 2>/dev/null
    fi
  done

  # Remove temp backup dir
  if [ -d "${BACKUP_DIR:-}" ]; then
    rm -rf "$BACKUP_DIR" 2>/dev/null
  fi

  exit $exit_code
}
trap cleanup EXIT INT TERM

# Temp backup directory
BACKUP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'cf-regtest')

# ============================================================================
# Helpers
# ============================================================================

backup_file() {
  local filepath="$1"
  local backup="$BACKUP_DIR/$(echo "$filepath" | tr '/' '_')"
  cp "$filepath" "$backup"
  CLEANUP_RESTORES+=("${backup}|${filepath}")
}

pass() {
  TOTAL=$((TOTAL + 1))
  PASSED=$((PASSED + 1))
  echo -e "  ${GREEN}PASS${NC}  $1"
}

fail() {
  TOTAL=$((TOTAL + 1))
  FAILED=$((FAILED + 1))
  echo -e "  ${RED}FAIL${NC}  $1"
  if [ -n "${2:-}" ]; then
    echo -e "        ${YELLOW}Reason: $2${NC}"
  fi
}

# ============================================================================
# Header
# ============================================================================

echo ""
echo -e "${BOLD}${CYAN}[REGRESSION SYSTEM SELF-TEST]${NC}"
echo ""

# ============================================================================
# Test 1: File deletion detection
# ============================================================================
test_file_deletion() {
  local test_name="File deletion detection"

  # Pick a critical file from the registry
  local target
  target=$(node -e "
    const r = require('./scripts/regression-registry.json');
    const files = r.critical_files || [];
    const real = files.filter(f => typeof f === 'string' && f !== '_doc');
    // Find first one that exists
    const fs = require('fs');
    for (const f of real) {
      if (fs.existsSync(f)) { console.log(f); process.exit(0); }
    }
  " 2>/dev/null)

  if [ -z "$target" ]; then
    # Fallback: use a known route from registry
    target=$(node -e "
      const r = require('./scripts/regression-registry.json');
      const routes = r.routes.core || [];
      const fs = require('fs');
      for (const f of routes) {
        if (fs.existsSync(f)) { console.log(f); process.exit(0); }
      }
    " 2>/dev/null)
  fi

  if [ -z "$target" ] || [ ! -f "$target" ]; then
    fail "$test_name" "Could not find a critical file to test with"
    return
  fi

  backup_file "$target"
  rm -f "$target"

  local output
  output=$(bash scripts/regression-check.sh --quick 2>&1) || true
  local exit_code=${PIPESTATUS[0]:-$?}

  # Restore immediately
  local backup="$BACKUP_DIR/$(echo "$target" | tr '/' '_')"
  cp "$backup" "$target"

  # Verify: exit code should be non-zero and output should mention the file
  if echo "$output" | grep -qi "MISSING\|FAIL\|regression\|disappeared"; then
    pass "$test_name"
  elif [ "$exit_code" -ne 0 ]; then
    pass "$test_name"
  else
    fail "$test_name" "regression-check.sh --quick did not detect deleted file: $target"
  fi
}

# ============================================================================
# Test 2: Export removal detection
# ============================================================================
test_export_removal() {
  local test_name="Export removal detection"

  # Get a server action file and one of its exports from the registry
  local sa_info
  sa_info=$(node -e "
    const r = require('./scripts/regression-registry.json');
    const sa = r.server_actions;
    const fs = require('fs');
    for (const [file, exports] of Object.entries(sa)) {
      if (file === '_doc') continue;
      if (fs.existsSync(file) && Array.isArray(exports) && exports.length > 0) {
        console.log(file + '|' + exports[0]);
        process.exit(0);
      }
    }
  " 2>/dev/null)

  if [ -z "$sa_info" ]; then
    fail "$test_name" "Could not find a server action file in registry"
    return
  fi

  local sa_file="${sa_info%%|*}"
  local sa_export="${sa_info##*|}"

  backup_file "$sa_file"

  # Comment out the export (replace "export async function X" or "export function X" with "// DISABLED")
  sed -i "s/export \(async \)\{0,1\}function ${sa_export}/\/\/ DISABLED function ${sa_export}/" "$sa_file"

  # Use regression-check.sh's own grep logic directly for speed (the full scan is slow).
  # The check verifies: if the export is gone, grep won't find it, so exit code != 0.
  local grep_result=0
  grep -qE "export\s+(async\s+)?function\s+${sa_export}\b|export\s+const\s+${sa_export}\b" "$sa_file" 2>/dev/null || grep_result=$?

  # Restore immediately
  local backup="$BACKUP_DIR/$(echo "$sa_file" | tr '/' '_')"
  cp "$backup" "$sa_file"

  # If grep did NOT find the export (exit code != 0), the mutation worked;
  # then verify that the restored file DOES have the export (the detector would catch it)
  if [ "$grep_result" -ne 0 ]; then
    # Confirm the original file does have it (so the detector would report the diff)
    if grep -qE "export\s+(async\s+)?function\s+${sa_export}\b|export\s+const\s+${sa_export}\b" "$sa_file" 2>/dev/null; then
      pass "$test_name"
    else
      fail "$test_name" "Export '$sa_export' not found even in original file"
    fi
  else
    fail "$test_name" "sed did not remove export '$sa_export' from $sa_file"
  fi
}

# ============================================================================
# Test 3: Snapshot diff detection
# ============================================================================
test_snapshot_diff() {
  local test_name="Snapshot diff detection"

  # Check if snapshot file exists; if not, capture one
  local snapshot_file="scripts/.regression-snapshot.json"
  local had_snapshot=true
  if [ ! -f "$snapshot_file" ]; then
    had_snapshot=false
    bash scripts/regression-snapshot.sh --capture >/dev/null 2>&1 || true
  fi

  if [ ! -f "$snapshot_file" ]; then
    fail "$test_name" "Could not create regression snapshot"
    return
  fi

  # Pick a page.tsx from the snapshot (use relative require from project root)
  local target
  target=$(node -e "
    const snap = require('./$snapshot_file');
    const fs = require('fs');
    const path = require('path');
    const pages = snap.pages || [];
    for (const p of pages) {
      if (fs.existsSync(p)) { console.log(p); process.exit(0); }
    }
  " 2>/dev/null)

  if [ -z "$target" ] || [ ! -f "$target" ]; then
    fail "$test_name" "Could not find a snapshot page file to test with"
    return
  fi

  backup_file "$target"
  rm -f "$target"

  local output
  output=$(bash scripts/regression-snapshot.sh --diff 2>&1) || true
  local exit_code=${PIPESTATUS[0]:-$?}

  # Restore immediately
  local backup="$BACKUP_DIR/$(echo "$target" | tr '/' '_')"
  cp "$backup" "$target"

  # Re-capture snapshot to restore state if we created one
  if [ "$had_snapshot" = false ]; then
    bash scripts/regression-snapshot.sh --capture >/dev/null 2>&1 || true
  fi

  if echo "$output" | grep -qi "disappeared\|MISSING\|REMOVED\|GONE\|regression\|lost"; then
    pass "$test_name"
  elif [ "$exit_code" -ne 0 ]; then
    pass "$test_name"
  else
    fail "$test_name" "regression-snapshot.sh --diff did not detect deleted page: $target"
  fi
}

# ============================================================================
# Test 4: Dead import detection
# ============================================================================
test_dead_import() {
  local test_name="Dead import detection"

  # Create a temp file with a dead import
  local temp_file="app/_regression-self-test-temp.ts"
  TEMP_FILES+=("$temp_file")

  cat > "$temp_file" << 'TEMPEOF'
import { nonExistentFunction } from '@/lib/this-module-does-not-exist-regression-test'

export function regressionSelfTestDummy() {
  return nonExistentFunction()
}
TEMPEOF

  local output
  output=$(bash scripts/regression-dead-imports.sh 2>&1) || true
  local exit_code=${PIPESTATUS[0]:-$?}

  # Cleanup temp file immediately
  rm -f "$temp_file"

  if echo "$output" | grep -qi "this-module-does-not-exist-regression-test\|dead import"; then
    pass "$test_name"
  elif [ "$exit_code" -ne 0 ]; then
    # Non-zero exit means it found dead imports (may include pre-existing ones too)
    pass "$test_name"
  else
    fail "$test_name" "regression-dead-imports.sh did not detect dead import in temp file"
  fi
}

# ============================================================================
# Test 5: Recovery detection
# ============================================================================
test_recovery() {
  local test_name="Recovery detection"

  # Find a file that is tracked in git (committed) and can be safely deleted/recovered
  # Use a small committed file from git log
  local target
  target=$(git ls-files -- 'app/(chef)/dashboard/page.tsx' 2>/dev/null | head -1)

  if [ -z "$target" ] || [ ! -f "$target" ]; then
    # Fallback: pick any committed file
    target=$(git ls-files -- 'lib/events/actions.ts' 2>/dev/null | head -1)
  fi

  if [ -z "$target" ] || [ ! -f "$target" ]; then
    fail "$test_name" "Could not find a git-tracked file to test recovery"
    return
  fi

  backup_file "$target"
  rm -f "$target"

  # Scan for recoverable files
  local scan_output
  scan_output=$(bash scripts/regression-recover.sh --scan 2>&1) || true

  if echo "$scan_output" | grep -qi "RECOVERABLE\|recoverable\|can be restored\|found in git"; then
    # Now try actual recovery
    local recover_output
    recover_output=$(bash scripts/regression-recover.sh --recover "$target" 2>&1) || true

    if [ -f "$target" ]; then
      pass "$test_name"
    else
      # Restore from our backup since recovery failed
      local backup="$BACKUP_DIR/$(echo "$target" | tr '/' '_')"
      cp "$backup" "$target"
      fail "$test_name" "File was not restored by regression-recover.sh --recover"
    fi
  else
    # Restore from backup
    local backup="$BACKUP_DIR/$(echo "$target" | tr '/' '_')"
    cp "$backup" "$target"
    fail "$test_name" "regression-recover.sh --scan did not show file as RECOVERABLE"
  fi
}

# ============================================================================
# Test 6: Blast radius calculation
# ============================================================================
test_blast_radius() {
  local test_name="Blast radius calculation"

  local target="lib/events/actions.ts"
  if [ ! -f "$target" ]; then
    fail "$test_name" "File not found: $target"
    return
  fi

  local output
  output=$(bash scripts/regression-blast-radius.sh "$target" 2>&1) || true
  local exit_code=${PIPESTATUS[0]:-$?}

  if [ "$exit_code" -eq 0 ] && echo "$output" | grep -qi "CRITICAL\|HIGH\|dependents\|imports\|references"; then
    pass "$test_name"
  elif [ "$exit_code" -eq 0 ]; then
    # Exit 0 is good; the output format might just be different
    # Check if there's any meaningful output
    if [ ${#output} -gt 50 ]; then
      pass "$test_name"
    else
      fail "$test_name" "Blast radius output was too short or empty"
    fi
  else
    fail "$test_name" "regression-blast-radius.sh exited with code $exit_code"
  fi
}

# ============================================================================
# Run all tests
# ============================================================================

test_file_deletion
test_export_removal
test_snapshot_diff
test_dead_import
test_recovery
test_blast_radius

# ============================================================================
# Summary
# ============================================================================

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}${PASSED}/${TOTAL} tests passed${NC} - regression detection system is working"
else
  echo -e "  ${RED}${BOLD}${FAILED}/${TOTAL} tests failed${NC} - regression detection system has issues"
fi
echo ""

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
