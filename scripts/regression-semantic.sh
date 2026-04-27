#!/usr/bin/env bash
# ============================================================================
# ChefFlow Semantic Regression Detection
# ============================================================================
# Catches regressions that file-existence checks miss by analyzing code
# content for missing auth gates, no-op returns, empty handlers, and
# hardcoded financial values.
#
#   1. Auth gate audit (server action files must have auth gates)
#   2. No-op detection (return { success: true } without logic)
#   3. Empty handler detection (onClick={() => {}} in UI files)
#   4. Hardcoded financial values ($0.00, amount: 0, etc.)
#
# Usage:
#   bash scripts/regression-semantic.sh          # run all checks
#   bash scripts/regression-semantic.sh --quiet  # no per-file output, summary only
#
# Exit codes: 0 = clean, 1 = issues found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_FILE="$PROJECT_ROOT/.regression-semantic-report.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

FAILURES=0
CHECKS=0
WARNINGS=0
FAILED_ITEMS=()
WARNING_ITEMS=()
QUIET=false

for arg in "$@"; do
  case "$arg" in
    --quiet) QUIET=true ;;
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
  if [ "$QUIET" = false ]; then
    echo -e "  ${RED}FAIL${NC} $1"
  fi
}

warn() {
  WARNINGS=$((WARNINGS + 1))
  WARNING_ITEMS+=("$1")
  if [ "$QUIET" = false ]; then
    echo -e "  ${YELLOW}WARN${NC} $1"
  fi
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}[$1]${NC}"
}

# --------------------------------------------------------------------------
# Whitelist: server action files that legitimately have no auth gate
# --------------------------------------------------------------------------
# Add relative paths (from project root) for files that intentionally
# skip auth, e.g. public-facing server actions.

AUTH_WHITELIST=(
  "lib/auth/actions.ts"
  "lib/auth/get-user.ts"
  "lib/auth/admin.ts"
  "lib/public-consumer/menu-actions.ts"
  "lib/ai/remy-public-context.ts"
  "lib/directory/actions.ts"
)

is_whitelisted() {
  local file="$1"
  for wl in "${AUTH_WHITELIST[@]}"; do
    if [ "$file" = "$wl" ]; then
      return 0
    fi
  done
  return 1
}

# --------------------------------------------------------------------------
# 1. Auth gate audit
# --------------------------------------------------------------------------
# Every file with 'use server' must call at least one auth gate function,
# unless whitelisted or in app/api/ (API routes handle auth differently).

check_auth_gates() {
  section "AUTH GATE AUDIT"

  local found_count=0
  local fail_count=0

  # Find files with 'use server' as an actual top-level directive (not in comments).
  # Then verify they export async functions (real server actions, not type/constant files).
  # Only those files need auth gates.

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    # Use node to check if 'use server' is a real directive and file exports async functions
    local is_server_action
    is_server_action=$(node -e '
      const fs = require("fs");
      const content = fs.readFileSync(process.argv[1], "utf8");
      const lines = content.split("\n");

      // Check: use server must appear as a standalone directive in the first 10 non-empty, non-comment lines
      let isDirective = false;
      let nonEmptyCount = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
        nonEmptyCount++;
        if (nonEmptyCount > 10) break;
        if (/^["'"'"']use server["'"'"'];?$/.test(trimmed)) {
          isDirective = true;
          break;
        }
      }
      if (!isDirective) { process.exit(0); }

      // Check: file must export at least one async function (a real server action)
      const hasAsyncExport = /export\s+async\s+function\s+\w+/.test(content);
      if (hasAsyncExport) {
        console.log("yes");
      }
    ' "$file" 2>/dev/null || true)

    if [ "$is_server_action" != "yes" ]; then
      continue
    fi

    # Get path relative to project root
    local rel_path="${file#$PROJECT_ROOT/}"

    # Skip app/api/ files (API routes handle auth differently)
    if [[ "$rel_path" == app/api/* ]]; then
      continue
    fi

    # Skip whitelisted files
    if is_whitelisted "$rel_path"; then
      continue
    fi

    found_count=$((found_count + 1))

    # Check for at least one auth gate call
    if grep -qE 'require(Chef|Client|Auth|Admin|Partner|Staff|ChefAdmin)\b' "$file" 2>/dev/null; then
      pass
    else
      fail "Missing auth gate: $rel_path"
      fail_count=$((fail_count + 1))
    fi
  done < <(grep -rl "'use server'" "$PROJECT_ROOT/lib" "$PROJECT_ROOT/app" --include='*.ts' --include='*.tsx' 2>/dev/null || true)

  if [ "$fail_count" -eq 0 ] && [ "$found_count" -gt 0 ]; then
    echo -e "  ${GREEN}PASS${NC} All $found_count server action files have auth gates"
  elif [ "$found_count" -eq 0 ]; then
    echo -e "  ${YELLOW}SKIP${NC} No server action files found"
  fi
}

# --------------------------------------------------------------------------
# 2. No-op detection
# --------------------------------------------------------------------------
# Find return { success: true } that appears suspiciously close to a
# function definition (within 5 lines), suggesting no real work is done.

check_noop_returns() {
  section "NO-OP DETECTION"

  local fail_count=0
  local checked=0

  # Search for files containing "return { success: true }" or "return {success: true}"
  while IFS= read -r file; do
    [ -z "$file" ] && continue

    local rel_path="${file#$PROJECT_ROOT/}"

    # Skip test files
    if [[ "$rel_path" == tests/* ]] || [[ "$rel_path" == *.test.* ]] || [[ "$rel_path" == *.spec.* ]]; then
      continue
    fi

    # Use node to do the line-proximity check
    local suspects
    suspects=$(node -e '
      const fs = require("fs");
      const lines = fs.readFileSync(process.argv[1], "utf8").split("\n");
      const results = [];

      for (let i = 0; i < lines.length; i++) {
        // Look for return { success: true } patterns
        if (/return\s*\{\s*success:\s*true\s*,?\s*\}/.test(lines[i])) {
          // Look backwards up to 5 lines for a function start
          let funcLine = -1;
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            if (/^\s*(export\s+)?(async\s+)?function\s+\w+/.test(lines[j]) ||
                /^\s*const\s+\w+\s*=\s*(async\s*)?\(/.test(lines[j]) ||
                /\)\s*(:.*?)?\s*=>\s*\{?\s*$/.test(lines[j]) ||
                /\)\s*(:.*?)?\s*\{\s*$/.test(lines[j])) {
              funcLine = j + 1;
              break;
            }
          }
          if (funcLine > 0) {
            // Check if there is any meaningful logic between function start and return
            let hasMeaningfulWork = false;
            const startIdx = funcLine - 1;
            for (let k = startIdx + 1; k < i; k++) {
              const line = lines[k].trim();
              if (line === "" || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) continue;
              if (/await\s/.test(line) || /\.insert\b/.test(line) || /\.update\b/.test(line) ||
                  /\.delete\b/.test(line) || /\.execute\b/.test(line) || /db[\.\[]/.test(line) ||
                  /sql`/.test(line) || /fetch\(/.test(line) || /revalidate/.test(line)) {
                hasMeaningfulWork = true;
                break;
              }
            }
            if (!hasMeaningfulWork) {
              results.push("L" + (i + 1));
            }
          }
        }
      }

      if (results.length > 0) {
        console.log(results.join(","));
      }
    ' "$file" 2>/dev/null || true)

    checked=$((checked + 1))

    if [ -n "$suspects" ]; then
      fail "No-op return { success: true } in $rel_path at $suspects"
      fail_count=$((fail_count + 1))
    else
      pass
    fi
  done < <(grep -rl "return.*success.*true" "$PROJECT_ROOT/lib" "$PROJECT_ROOT/app" --include='*.ts' --include='*.tsx' 2>/dev/null || true)

  if [ "$fail_count" -eq 0 ] && [ "$checked" -gt 0 ]; then
    echo -e "  ${GREEN}PASS${NC} No suspicious no-op returns found ($checked files checked)"
  elif [ "$checked" -eq 0 ]; then
    echo -e "  ${YELLOW}SKIP${NC} No files with success returns found"
  fi
}

# --------------------------------------------------------------------------
# 3. Empty handler detection
# --------------------------------------------------------------------------
# Find onClick={() => {}} or onClick={()=>{}} in tsx files under app/ and
# components/. These are Zero Hallucination violations (non-functional
# features rendered as functional).

check_empty_handlers() {
  section "EMPTY HANDLER DETECTION"

  local fail_count=0
  local checked=0

  # Pattern: onClick={() => {}} with optional whitespace variants
  # Also catches onSubmit, onChange, onBlur, etc.
  local pattern='on[A-Z][a-zA-Z]*=\{[[:space:]]*\([^)]*\)[[:space:]]*=>[[:space:]]*\{[[:space:]]*\}[[:space:]]*\}'

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    local rel_path="${file#$PROJECT_ROOT/}"

    # Skip test files
    if [[ "$rel_path" == tests/* ]] || [[ "$rel_path" == *.test.* ]] || [[ "$rel_path" == *.spec.* ]]; then
      continue
    fi

    checked=$((checked + 1))

    # Use node for more reliable multi-pattern matching
    local hits
    hits=$(node -e '
      const fs = require("fs");
      const lines = fs.readFileSync(process.argv[1], "utf8").split("\n");
      const results = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match onClick={() => {}} and variants (onSubmit, onChange, etc.)
        if (/on[A-Z][a-zA-Z]*=\{\s*\(?[^)]*\)?\s*=>\s*\{\s*\}\s*\}/.test(line)) {
          if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
          results.push("L" + (i + 1));
        }
      }

      if (results.length > 0) {
        console.log(results.join(","));
      }
    ' "$file" 2>/dev/null || true)

    if [ -n "$hits" ]; then
      fail "Empty event handler in $rel_path at $hits"
      fail_count=$((fail_count + 1))
    else
      pass
    fi
  done < <(find "$PROJECT_ROOT/app" "$PROJECT_ROOT/components" -name '*.tsx' -type f 2>/dev/null || true)

  if [ "$fail_count" -eq 0 ] && [ "$checked" -gt 0 ]; then
    echo -e "  ${GREEN}PASS${NC} No empty event handlers found ($checked files checked)"
  elif [ "$checked" -eq 0 ]; then
    echo -e "  ${YELLOW}SKIP${NC} No tsx files found"
  fi
}

# --------------------------------------------------------------------------
# 4. Hardcoded financial values
# --------------------------------------------------------------------------
# Find patterns like $0.00, $0, amount: 0, total: 0, balance: 0 in tsx
# files that render financial data. Excludes test files and type defs.

check_hardcoded_financials() {
  section "HARDCODED FINANCIAL VALUES"

  local fail_count=0
  local checked=0

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    local rel_path="${file#$PROJECT_ROOT/}"

    # Skip test files
    if [[ "$rel_path" == tests/* ]] || [[ "$rel_path" == *.test.* ]] || [[ "$rel_path" == *.spec.* ]]; then
      continue
    fi

    # Skip type definition files
    if [[ "$rel_path" == types/* ]] || [[ "$rel_path" == *.d.ts ]]; then
      continue
    fi

    checked=$((checked + 1))

    local hits
    hits=$(node -e '
      const fs = require("fs");
      const lines = fs.readFileSync(process.argv[1], "utf8").split("\n");
      const results = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

        // Skip imports, type definitions, interfaces
        if (/^\s*(import|type|interface|export\s+type|export\s+interface)\b/.test(line)) continue;

        // Skip fallback/default patterns (total || 0), ?? 0 - these are safe
        if (/\?\?\s*0\b/.test(line) || /\|\|\s*0\b/.test(line) || /\?\?\s*["'"'"']/.test(line) || /\|\|\s*["'"'"']/.test(line)) continue;

        // Skip formatters and labels
        if (/NumberFormat|formatCurrency|formatMoney|toCurrency/.test(line)) continue;
        if (/placeholder|label|aria-label|title=|alt=/i.test(line)) continue;

        // Pattern 1: Hardcoded dollar rendering like >$0.00< or >$0<
        if (/[>"'"'"']\$0(\.00)?[<"'"'"']/.test(line) || /[>"'"'"']\$0(\.00)?\s/.test(line)) {
          if (!/\?.*\$0/.test(line) && !/error/i.test(line) && !/message/i.test(line)) {
            results.push("L" + (i + 1) + " [hardcoded-dollar] " + trimmed.substring(0, 80));
          }
        }

        // Pattern 2: Financial object properties hardcoded to 0
        if (/\b(amount|total|balance|revenue|cost|price|profit|subtotal|grandTotal|foodCost)\s*:\s*0\b/.test(line)) {
          if (!/type\s|interface\s|as\s+\{|:\s*\{/.test(line)) {
            if (!/useState|useReducer|initialState|defaultValues|defaultProps/.test(line)) {
              results.push("L" + (i + 1) + " [zero-financial] " + trimmed.substring(0, 80));
            }
          }
        }
      }

      if (results.length > 0) {
        results.forEach(r => console.log(r));
      }
    ' "$file" 2>/dev/null || true)

    if [ -n "$hits" ]; then
      # These are warnings, not hard failures, because some zeros are legitimate defaults
      while IFS= read -r hit; do
        warn "Suspicious financial value in $rel_path: $hit"
      done <<< "$hits"
    else
      pass
    fi
  done < <(find "$PROJECT_ROOT/app" "$PROJECT_ROOT/components" -name '*.tsx' -type f 2>/dev/null || true)

  if [ "$WARNINGS" -eq 0 ] && [ "$checked" -gt 0 ]; then
    echo -e "  ${GREEN}PASS${NC} No suspicious hardcoded financial values ($checked files checked)"
  elif [ "$checked" -eq 0 ]; then
    echo -e "  ${YELLOW}SKIP${NC} No tsx files found"
  else
    echo -e "  ${YELLOW}NOTE${NC} $WARNINGS warnings found (review manually; some may be legitimate)"
  fi
}

# --------------------------------------------------------------------------
# Run checks
# --------------------------------------------------------------------------

echo -e "${BOLD}ChefFlow Semantic Regression Check${NC}"
echo "================================================"

check_auth_gates
check_noop_returns
check_empty_handlers
check_hardcoded_financials

# --------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------

echo ""
echo "================================================"

TOTAL_ISSUES=$((FAILURES + WARNINGS))

# Write report file
{
  echo "# Semantic Regression Report"
  echo ""
  echo "Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

  if [ "$FAILURES" -gt 0 ]; then
    echo "Status: FAILED ($FAILURES failures, $WARNINGS warnings)"
  elif [ "$WARNINGS" -gt 0 ]; then
    echo "Status: WARNINGS ($WARNINGS warnings)"
  else
    echo "Status: CLEAN"
  fi

  echo ""
  echo "Checks run: $CHECKS"
  echo ""

  if [ "$FAILURES" -gt 0 ]; then
    echo "## Failures"
    echo ""
    for item in "${FAILED_ITEMS[@]}"; do
      echo "- \`$item\`"
    done
    echo ""
  fi

  if [ "$WARNINGS" -gt 0 ]; then
    echo "## Warnings"
    echo ""
    for item in "${WARNING_ITEMS[@]}"; do
      echo "- \`$item\`"
    done
    echo ""
  fi

  echo '## Checks'
  echo ''
  echo '1. Auth gate audit - server action files must have auth gates'
  echo '2. No-op detection - return { success: true } without preceding logic'
  echo '3. Empty handler detection - onClick={() => {}} in UI files'
  echo '4. Hardcoded financial values - suspicious $0/amount:0 in rendering code'
} > "$REPORT_FILE"

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}${BOLD}SEMANTIC ISSUES DETECTED${NC}"
  echo -e "  ${RED}$FAILURES failures${NC} / ${YELLOW}$WARNINGS warnings${NC} / $CHECKS checks"
  echo ""
  echo -e "${BOLD}Failures:${NC}"
  for item in "${FAILED_ITEMS[@]}"; do
    echo -e "  ${RED}-${NC} $item"
  done
  if [ "$WARNINGS" -gt 0 ]; then
    echo ""
    echo -e "${BOLD}Warnings:${NC}"
    for item in "${WARNING_ITEMS[@]}"; do
      echo -e "  ${YELLOW}-${NC} $item"
    done
  fi
  echo ""
  echo "Report written to .regression-semantic-report.md"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}${BOLD}WARNINGS ONLY${NC}"
  echo -e "  $CHECKS checks passed / ${YELLOW}$WARNINGS warnings${NC}"
  echo ""
  echo "Report written to .regression-semantic-report.md"
  # Warnings alone don't fail the check
  exit 0
else
  echo -e "${GREEN}${BOLD}SEMANTICALLY CLEAN${NC}"
  echo -e "  $CHECKS checks passed"
  [ -f "$REPORT_FILE" ] && rm "$REPORT_FILE"
  exit 0
fi
