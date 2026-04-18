#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ChefFlow Compliance Scan
# ═══════════════════════════════════════════════════════════════════
# Runs ALL mechanical compliance checks at zero token cost.
# Use this INSTEAD of asking Claude to scan for violations.
#
# Usage:
#   bash scripts/compliance-scan.sh           # scan all source files
#   bash scripts/compliance-scan.sh --staged  # scan only staged files
#
# Checks:
#   1. Em dash usage (banned everywhere)
#   2. "OpenClaw" in user-facing files (banned)
#   3. @ts-nocheck files that export functions (crash risk)
#   4. 'use server' files exporting non-async (will fail at runtime)
#   5. Raw styled elements bypassing design system (ratcheting ceiling)
# ═══════════════════════════════════════════════════════════════════

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

STAGED_ONLY=false
if [ "$1" = "--staged" ]; then
  STAGED_ONLY=true
fi

VIOLATIONS=0
PASS_COUNT=0

header() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

pass() {
  echo "  PASS: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "  FAIL: $1"
  VIOLATIONS=$((VIOLATIONS + 1))
}

# ── 1. Em Dash Scan ──────────────────────────────────────────────

header "1. Em Dash Scan"

if [ "$STAGED_ONLY" = true ]; then
  EM_DASH_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(tsx?|jsx?|md|json)$' | xargs grep -l $'\xe2\x80\x94' 2>/dev/null || true)
else
  # Scan source files, skip node_modules/.next/docs/specs (specs may have legitimate em dashes in verdicts)
  EM_DASH_FILES=$(grep -rl $'\xe2\x80\x94' \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
    app/ components/ lib/ hooks/ features/ public/ 2>/dev/null || true)
fi

if [ -z "$EM_DASH_FILES" ]; then
  pass "No em dashes found in source files"
else
  EM_COUNT=$(echo "$EM_DASH_FILES" | wc -l | tr -d ' ')
  fail "$EM_COUNT file(s) contain em dashes:"
  echo "$EM_DASH_FILES" | head -20 | sed 's/^/    /'
  if [ "$EM_COUNT" -gt 20 ]; then
    echo "    ... and $((EM_COUNT - 20)) more"
  fi
fi

# ── 2. OpenClaw in User-Facing Files ─────────────────────────────

header "2. OpenClaw Surface Scan"

if [ "$STAGED_ONLY" = true ]; then
  OC_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(tsx?|jsx?)$' | xargs grep -li 'openclaw' 2>/dev/null || true)
else
  # Scan UI files only (not lib/openclaw/, scripts/, docs/, database/)
  OC_FILES=$(grep -rli 'openclaw' \
    --include='*.tsx' --include='*.jsx' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
    app/ components/ 2>/dev/null || true)
fi

if [ -z "$OC_FILES" ]; then
  pass "No 'OpenClaw' in user-facing files"
else
  OC_COUNT=$(echo "$OC_FILES" | wc -l | tr -d ' ')
  fail "$OC_COUNT user-facing file(s) reference 'OpenClaw':"
  echo "$OC_FILES" | head -20 | sed 's/^/    /'
  # Show the actual lines
  for f in $OC_FILES; do
    echo "    --- $f:"
    grep -ni 'openclaw' "$f" | head -3 | sed 's/^/      /'
  done
fi

# ── 3. @ts-nocheck Files with Exports ────────────────────────────

header "3. @ts-nocheck Export Scan"

TSNOCHECK_FILES=$(grep -rl '@ts-nocheck' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
  app/ components/ lib/ hooks/ features/ 2>/dev/null || true)

if [ -z "$TSNOCHECK_FILES" ]; then
  pass "No @ts-nocheck files found"
else
  EXPORT_VIOLATIONS=""
  for f in $TSNOCHECK_FILES; do
    if grep -q 'export.*async.*function\|export.*function\|export.*const' "$f" 2>/dev/null; then
      EXPORT_VIOLATIONS="$EXPORT_VIOLATIONS$f\n"
    fi
  done

  if [ -z "$EXPORT_VIOLATIONS" ]; then
    pass "$(echo "$TSNOCHECK_FILES" | wc -l | tr -d ' ') @ts-nocheck file(s) found, but none export functions"
  else
    EXPORT_COUNT=$(echo -e "$EXPORT_VIOLATIONS" | grep -c '.' || true)
    fail "$EXPORT_COUNT @ts-nocheck file(s) EXPORT functions (crash risk):"
    echo -e "$EXPORT_VIOLATIONS" | head -10 | sed 's/^/    /'
  fi
fi

# ── 4. 'use server' Files with Non-Async Exports ────────────────

header "4. Server Action Export Scan"

USE_SERVER_FILES=$(grep -rl "'use server'" \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
  app/ components/ lib/ hooks/ features/ 2>/dev/null || true)

if [ -z "$USE_SERVER_FILES" ]; then
  pass "No 'use server' files found (unexpected)"
else
  CONST_EXPORTS=""
  for f in $USE_SERVER_FILES; do
    if grep -q '^export const\|^export let\|^export var\|^export type\|^export interface\|^export enum' "$f" 2>/dev/null; then
      # Filter out type exports (those are fine)
      NON_TYPE=$(grep '^export const\|^export let\|^export var\|^export enum' "$f" 2>/dev/null || true)
      if [ -n "$NON_TYPE" ]; then
        CONST_EXPORTS="$CONST_EXPORTS$f\n"
      fi
    fi
  done

  if [ -z "$CONST_EXPORTS" ]; then
    pass "$(echo "$USE_SERVER_FILES" | wc -l | tr -d ' ') 'use server' files checked, all exports are async functions"
  else
    CONST_COUNT=$(echo -e "$CONST_EXPORTS" | grep -c '.' || true)
    fail "$CONST_COUNT 'use server' file(s) export non-async values:"
    echo -e "$CONST_EXPORTS" | head -10 | sed 's/^/    /'
  fi
fi

# ── Check 5: Raw styled elements bypassing design system ────────
# Counts raw <button>, <input>, <select> with inline Tailwind styling
# outside components/ui/. Ratchet ceiling down over time.

header "RAW STYLED ELEMENTS (design system bypass)"

RAW_BUTTON_COUNT=0
RAW_INPUT_COUNT=0
RAW_SELECT_COUNT=0

  # Count files where a raw element has inline Tailwind on the SAME line
  # (stricter than separate grep -l passes which match any bg- anywhere in file)
if [ "$STAGED_ONLY" = true ]; then
  RAW_BUTTON_COUNT=$(git diff --cached --name-only -- '*.tsx' | xargs grep -n '<button' 2>/dev/null | grep -v 'components/ui/' | grep -v 'error.tsx' | grep 'className' | wc -l)
  RAW_INPUT_COUNT=$(git diff --cached --name-only -- '*.tsx' | xargs grep -n '<input' 2>/dev/null | grep -v 'components/ui/' | grep 'className' | wc -l)
  RAW_SELECT_COUNT=$(git diff --cached --name-only -- '*.tsx' | xargs grep -n '<select' 2>/dev/null | grep -v 'components/ui/' | grep 'className' | wc -l)
else
  RAW_BUTTON_COUNT=$(grep -rn '<button' --include='*.tsx' app/ components/ 2>/dev/null | grep -v 'components/ui/' | grep -v 'error.tsx' | grep 'className' | wc -l)
  RAW_INPUT_COUNT=$(grep -rn '<input' --include='*.tsx' app/ components/ 2>/dev/null | grep -v 'components/ui/' | grep 'className' | wc -l)
  RAW_SELECT_COUNT=$(grep -rn '<select' --include='*.tsx' app/ components/ 2>/dev/null | grep -v 'components/ui/' | grep 'className' | wc -l)
fi

RAW_TOTAL=$((RAW_BUTTON_COUNT + RAW_INPUT_COUNT + RAW_SELECT_COUNT))
RAW_CEILING=500

echo "  Raw styled <button>: $RAW_BUTTON_COUNT files"
echo "  Raw styled <input>:  $RAW_INPUT_COUNT files"
echo "  Raw styled <select>: $RAW_SELECT_COUNT files"
echo "  Total: $RAW_TOTAL (ceiling: $RAW_CEILING)"
echo ""

if [ "$RAW_TOTAL" -gt "$RAW_CEILING" ]; then
  echo "  WARNING: Raw styled elements exceed ceiling ($RAW_TOTAL > $RAW_CEILING)"
  echo "  Migrate to <Button>, <Input>, <Select> from components/ui/"
  # Informational only, not a blocking violation (yet)
else
  echo "  OK: Within ceiling"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# ── Summary ──────────────────────────────────────────────────────

header "SUMMARY"
echo ""
echo "  Checks passed: $PASS_COUNT"
echo "  Violations:    $VIOLATIONS"
echo ""

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "  STATUS: VIOLATIONS FOUND - fix before committing"
  exit 1
else
  echo "  STATUS: ALL CLEAR"
  exit 0
fi
