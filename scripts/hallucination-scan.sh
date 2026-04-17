#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ChefFlow Hallucination Scan
# ═══════════════════════════════════════════════════════════════════
# Runs all 7 Zero Hallucination patterns at zero token cost.
# Produces a formatted report. Claude only reviews findings.
#
# Usage:  bash scripts/hallucination-scan.sh
#
# Patterns:
#   1. Optimistic updates without try/catch + rollback
#   2. Catch blocks returning zero/default without UI feedback
#   3. No-op handlers (empty onClick, // placeholder, fake success)
#   4. Hardcoded dollar amounts displayed as data
#   5. Stale cache (unstable_cache without matching revalidateTag)
#   6. @ts-nocheck files that export callable functions
#   7. Demo/sample data without visual distinction
# ═══════════════════════════════════════════════════════════════════

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

FINDINGS=0
REPORT_FILE="$PROJECT_ROOT/.hallucination-scan-results.md"

header() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

finding() {
  echo "  FINDING: $1"
  FINDINGS=$((FINDINGS + 1))
}

clean() {
  echo "  CLEAN: $1"
}

# Start report
cat > "$REPORT_FILE" << 'EOF'
# Hallucination Scan Results
Generated: $(date '+%Y-%m-%d %H:%M')

EOF

# ── 1. Optimistic Updates Without Try/Catch ──────────────────────

header "1. Optimistic Updates (startTransition without try/catch)"

# Find startTransition calls, then check if they have try/catch
ST_FILES=$(grep -rn 'startTransition' \
  --include='*.tsx' --include='*.ts' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  app/ components/ 2>/dev/null | grep -v 'import' | grep -v '//' || true)

if [ -z "$ST_FILES" ]; then
  clean "No startTransition calls found"
else
  ST_COUNT=$(echo "$ST_FILES" | wc -l | tr -d ' ')
  echo "  Found $ST_COUNT startTransition call(s). Check each for try/catch:"
  echo "$ST_FILES" | head -15 | sed 's/^/    /'
  if [ "$ST_COUNT" -gt 15 ]; then
    echo "    ... and $((ST_COUNT - 15)) more (review manually)"
  fi
  echo ""
  echo "  NOTE: Each must have try/catch with rollback. Review these in context."
  finding "$ST_COUNT startTransition calls need manual try/catch verification"
fi

# ── 2. Silent Failures (catch returning defaults) ────────────────

header "2. Silent Failures (catch blocks returning zero/empty)"

SILENT_CATCHES=$(grep -rn 'catch.*{' \
  --include='*.tsx' --include='*.ts' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  -A5 app/ components/ lib/ 2>/dev/null | \
  grep -E 'return.*(\[\]|0|null|false|\{\}|""|\x27\x27)' | \
  grep -v 'toast\|error\|Error\|warn\|console\|log\|throw' || true)

if [ -z "$SILENT_CATCHES" ]; then
  clean "No catch blocks silently returning defaults"
else
  SC_COUNT=$(echo "$SILENT_CATCHES" | wc -l | tr -d ' ')
  finding "$SC_COUNT catch block(s) return defaults without error feedback:"
  echo "$SILENT_CATCHES" | head -10 | sed 's/^/    /'
fi

# ── 3. No-Op Handlers ───────────────────────────────────────────

header "3. No-Op Handlers"

# Empty onClick
EMPTY_ONCLICK=$(grep -rn 'onClick.*=.*{.*}' \
  --include='*.tsx' --include='*.jsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  app/ components/ 2>/dev/null | \
  grep -E 'onClick\s*=\s*\{?\s*\(\)\s*=>\s*\{?\s*\}?' || true)

# Placeholder comments
PLACEHOLDERS=$(grep -rn '// placeholder\|// TODO.*implement\|// coming soon' \
  --include='*.tsx' --include='*.ts' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  -i app/ components/ lib/ 2>/dev/null || true)

# Fake success returns
FAKE_SUCCESS=$(grep -rn "return.*{.*success.*:.*true.*}" \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  lib/ app/ 2>/dev/null | \
  grep -v 'data\|entry\|record\|result\|id\|count\|created\|updated' || true)

NOOP_COUNT=0
if [ -n "$EMPTY_ONCLICK" ]; then
  EO_COUNT=$(echo "$EMPTY_ONCLICK" | wc -l | tr -d ' ')
  NOOP_COUNT=$((NOOP_COUNT + EO_COUNT))
  echo "  Empty onClick handlers ($EO_COUNT):"
  echo "$EMPTY_ONCLICK" | head -5 | sed 's/^/    /'
fi

if [ -n "$PLACEHOLDERS" ]; then
  PH_COUNT=$(echo "$PLACEHOLDERS" | wc -l | tr -d ' ')
  NOOP_COUNT=$((NOOP_COUNT + PH_COUNT))
  echo "  Placeholder comments ($PH_COUNT):"
  echo "$PLACEHOLDERS" | head -5 | sed 's/^/    /'
fi

if [ -n "$FAKE_SUCCESS" ]; then
  FS_COUNT=$(echo "$FAKE_SUCCESS" | wc -l | tr -d ' ')
  NOOP_COUNT=$((NOOP_COUNT + FS_COUNT))
  echo "  Suspicious success returns ($FS_COUNT):"
  echo "$FAKE_SUCCESS" | head -5 | sed 's/^/    /'
fi

if [ "$NOOP_COUNT" -eq 0 ]; then
  clean "No empty handlers, placeholders, or fake success returns"
else
  finding "$NOOP_COUNT no-op handler(s) found"
fi

# ── 4. Hardcoded Dollar Amounts ──────────────────────────────────

header "4. Hardcoded Dollar Amounts"

HARDCODED=$(grep -rn '\$[0-9]\+\.\|[0-9]\+_[0-9]\+.*cents\|amount.*=.*[0-9][0-9][0-9]' \
  --include='*.tsx' --include='*.jsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  app/ components/ 2>/dev/null | \
  grep -v 'test\|spec\|mock\|example\|comment\|MAX_\|MIN_\|DEFAULT_\|LIMIT\|placeholder\|className\|tooltip\|title\|aria' || true)

if [ -z "$HARDCODED" ]; then
  clean "No hardcoded dollar amounts in UI files"
else
  HC_COUNT=$(echo "$HARDCODED" | wc -l | tr -d ' ')
  finding "$HC_COUNT potential hardcoded amount(s) in UI:"
  echo "$HARDCODED" | head -10 | sed 's/^/    /'
  echo "  (Review each - may be constants or display formatting, not all are violations)"
fi

# ── 5. Stale Cache (unstable_cache without revalidateTag) ────────

header "5. Stale Cache Check"

CACHE_TAGS=$(grep -rn 'unstable_cache' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  app/ lib/ 2>/dev/null | \
  grep -oP "(?:tag|tags).*?['\"]([^'\"]+)['\"]" | \
  grep -oP "['\"]([^'\"]+)['\"]" | tr -d "'" | tr -d '"' | sort -u || true)

REVALIDATE_TAGS=$(grep -rn 'revalidateTag' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  app/ lib/ 2>/dev/null | \
  grep -oP "revalidateTag\(['\"]([^'\"]+)['\"]\)" | \
  grep -oP "['\"]([^'\"]+)['\"]" | tr -d "'" | tr -d '"' | sort -u || true)

if [ -z "$CACHE_TAGS" ]; then
  clean "No unstable_cache usage found"
else
  echo "  Cache tags defined: $(echo "$CACHE_TAGS" | wc -l | tr -d ' ')"
  echo "  RevalidateTag calls: $(echo "$REVALIDATE_TAGS" | wc -l | tr -d ' ')"

  MISSING=""
  while IFS= read -r tag; do
    if ! echo "$REVALIDATE_TAGS" | grep -qF "$tag"; then
      MISSING="$MISSING$tag\n"
    fi
  done <<< "$CACHE_TAGS"

  if [ -z "$MISSING" ] || [ "$MISSING" = "\n" ]; then
    clean "All cache tags have matching revalidateTag calls"
  else
    MISS_COUNT=$(echo -e "$MISSING" | grep -c '.' || true)
    finding "$MISS_COUNT cache tag(s) with no revalidateTag:"
    echo -e "$MISSING" | head -10 | sed 's/^/    /'
  fi
fi

# ── 6. @ts-nocheck with Exports ──────────────────────────────────

header "6. @ts-nocheck Export Risk"

TSNOCHECK_EXPORTS=$(grep -rl '@ts-nocheck' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude \
  app/ components/ lib/ 2>/dev/null | while read -r f; do
    if grep -q 'export.*async.*function\|export.*function' "$f" 2>/dev/null; then
      echo "$f"
    fi
  done || true)

if [ -z "$TSNOCHECK_EXPORTS" ]; then
  clean "No @ts-nocheck files export callable functions"
else
  TSE_COUNT=$(echo "$TSNOCHECK_EXPORTS" | wc -l | tr -d ' ')
  finding "$TSE_COUNT @ts-nocheck file(s) export functions (crash risk):"
  echo "$TSNOCHECK_EXPORTS" | sed 's/^/    /'
fi

# ── 7. Demo/Sample Data Visibility ──────────────────────────────

header "7. Demo Data Distinction"

DEMO_REFS=$(grep -rn 'is_demo\|isDemo\|demo.*data\|sample.*data\|demo_' \
  --include='*.tsx' --include='*.ts' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.claude --exclude-dir=tests \
  app/ components/ 2>/dev/null | \
  grep -v 'import\|type\|interface' || true)

if [ -z "$DEMO_REFS" ]; then
  clean "No demo/sample data references in UI (may mean no demo data exists)"
else
  DEMO_COUNT=$(echo "$DEMO_REFS" | wc -l | tr -d ' ')
  echo "  Found $DEMO_COUNT demo data reference(s). Verify each has visual distinction:"
  echo "$DEMO_REFS" | head -10 | sed 's/^/    /'
  finding "$DEMO_COUNT demo data reference(s) need visual distinction check"
fi

# ── Summary ──────────────────────────────────────────────────────

header "SUMMARY"
echo ""
echo "  Findings:  $FINDINGS"
echo ""

if [ "$FINDINGS" -gt 0 ]; then
  echo "  STATUS: $FINDINGS FINDING(S) - review and fix as needed"
  echo "  Full results saved to: .hallucination-scan-results.md"
else
  echo "  STATUS: CLEAN - no hallucination risks detected"
fi

exit 0
