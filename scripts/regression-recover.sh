#!/usr/bin/env bash
# ============================================================================
# ChefFlow Regression Auto-Recovery
# ============================================================================
# Detects missing files from regression checks and recovers them from git
# history. Safe: never overwrites existing files, never modifies git history.
#
# Usage:
#   bash scripts/regression-recover.sh              # scan only (default)
#   bash scripts/regression-recover.sh --scan        # same as above
#   bash scripts/regression-recover.sh --recover     # restore all recoverable
#   bash scripts/regression-recover.sh --recover <file>  # restore one file
#   bash scripts/regression-recover.sh --dry-run     # show what would be done
#
# Exit codes: 0 = success, 1 = unrecoverable items found, 2 = usage error
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'
BOLD='\033[1m'

# --------------------------------------------------------------------------
# Parse arguments
# --------------------------------------------------------------------------

MODE="scan"
SINGLE_FILE=""

case "${1:-}" in
  --scan)
    MODE="scan"
    ;;
  --recover)
    MODE="recover"
    if [ -n "${2:-}" ] && [[ ! "${2:-}" == --* ]]; then
      SINGLE_FILE="$2"
    fi
    ;;
  --dry-run)
    MODE="dry-run"
    ;;
  "")
    MODE="scan"
    ;;
  *)
    echo "Usage: bash scripts/regression-recover.sh [--scan | --recover [file] | --dry-run]"
    exit 2
    ;;
esac

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

# Find the last commit where a file existed.
# Returns the commit hash, or empty string if never existed.
find_last_commit() {
  local filepath="$1"
  # --all searches all branches; --diff-filter=D finds the deletion commit;
  # we want the commit BEFORE deletion, so we get the parent.
  # Alternatively, --follow tracks renames.

  # Strategy: find last commit that touched this file (across all branches)
  local commit
  commit=$(git -C "$PROJECT_ROOT" log --all --follow --diff-filter=d -1 --format='%H' -- "$filepath" 2>/dev/null || true)

  if [ -z "$commit" ]; then
    # Try without --follow (handles some edge cases)
    commit=$(git -C "$PROJECT_ROOT" log --all -1 --format='%H' -- "$filepath" 2>/dev/null || true)
  fi

  if [ -z "$commit" ]; then
    echo ""
    return
  fi

  # Verify the file actually exists at this commit
  if git -C "$PROJECT_ROOT" cat-file -e "${commit}:${filepath}" 2>/dev/null; then
    echo "$commit"
    return
  fi

  # The commit we found might be the deletion commit. Try its parent.
  local parent
  parent=$(git -C "$PROJECT_ROOT" rev-parse "${commit}^" 2>/dev/null || true)
  if [ -n "$parent" ] && git -C "$PROJECT_ROOT" cat-file -e "${parent}:${filepath}" 2>/dev/null; then
    echo "$parent"
    return
  fi

  # Broader search: find any commit where file existed
  local any_commit
  any_commit=$(git -C "$PROJECT_ROOT" log --all --format='%H' -- "$filepath" 2>/dev/null | head -20)
  while IFS= read -r c; do
    [ -z "$c" ] && continue
    if git -C "$PROJECT_ROOT" cat-file -e "${c}:${filepath}" 2>/dev/null; then
      echo "$c"
      return
    fi
    # Check parent
    local p
    p=$(git -C "$PROJECT_ROOT" rev-parse "${c}^" 2>/dev/null || true)
    if [ -n "$p" ] && git -C "$PROJECT_ROOT" cat-file -e "${p}:${filepath}" 2>/dev/null; then
      echo "$p"
      return
    fi
  done <<< "$any_commit"

  echo ""
}

# Get commit details: short hash, date, author, subject
get_commit_info() {
  local commit="$1"
  local filepath="$2"
  git -C "$PROJECT_ROOT" log -1 --format='%h (%ai) by %an%n    "%s"' "$commit" -- 2>/dev/null || \
    git -C "$PROJECT_ROOT" log -1 --format='%h (%ai) by %an%n    "%s"' "$commit" 2>/dev/null
}

# Check if the deletion was intentional (commit message contains delete/remove/intentional)
check_intentional_deletion() {
  local filepath="$1"
  # Find the commit that deleted this file
  local del_commit
  del_commit=$(git -C "$PROJECT_ROOT" log --all --diff-filter=D -1 --format='%H' -- "$filepath" 2>/dev/null || true)
  if [ -z "$del_commit" ]; then
    echo "false"
    return
  fi
  local msg
  msg=$(git -C "$PROJECT_ROOT" log -1 --format='%s %b' "$del_commit" 2>/dev/null || true)
  # Case-insensitive check for intentional deletion keywords
  if echo "$msg" | grep -iqE '(intentional|remove|delete|deprecat|drop|clean.?up)'; then
    local short
    short=$(git -C "$PROJECT_ROOT" log -1 --format='%h' "$del_commit" 2>/dev/null)
    local subject
    subject=$(git -C "$PROJECT_ROOT" log -1 --format='%s' "$del_commit" 2>/dev/null)
    echo "true|${short}|${subject}"
  else
    echo "false"
  fi
}

# Restore a file from a specific commit
restore_file() {
  local commit="$1"
  local filepath="$2"
  local full_path="$PROJECT_ROOT/$filepath"

  # Safety: never overwrite existing files
  if [ -f "$full_path" ]; then
    echo -e "  ${YELLOW}SKIP${NC}     $filepath (file already exists)"
    return 1
  fi

  # Create parent directory
  local dir
  dir=$(dirname "$full_path")
  mkdir -p "$dir"

  # Restore from git
  git -C "$PROJECT_ROOT" show "${commit}:${filepath}" > "$full_path" 2>/dev/null
  echo -e "  ${GREEN}RESTORED${NC} $filepath"
  echo -e "           ${DIM}from $commit${NC}"
  return 0
}

# --------------------------------------------------------------------------
# Single file recovery mode
# --------------------------------------------------------------------------

if [ -n "$SINGLE_FILE" ]; then
  echo -e "${BOLD}ChefFlow Regression Recovery${NC}"
  echo -e "Mode: single file"
  echo "================================================"
  echo ""

  filepath="$SINGLE_FILE"

  # Check if file already exists
  if [ -f "$PROJECT_ROOT/$filepath" ]; then
    echo -e "  ${YELLOW}SKIP${NC} $filepath already exists. Will not overwrite."
    exit 0
  fi

  commit=$(find_last_commit "$filepath")
  if [ -z "$commit" ]; then
    echo -e "  ${RED}NOT FOUND${NC} $filepath"
    echo "    Never existed in git history"
    exit 1
  fi

  info=$(get_commit_info "$commit" "$filepath")
  echo -e "  ${CYAN}FOUND${NC}    $filepath"
  echo "    Last seen: $info"

  # Check for intentional deletion
  intent=$(check_intentional_deletion "$filepath")
  if [[ "$intent" == true* ]]; then
    local_short=$(echo "$intent" | cut -d'|' -f2)
    local_subject=$(echo "$intent" | cut -d'|' -f3-)
    echo -e "  ${YELLOW}WARNING${NC}  Deletion may have been intentional"
    echo "    Deleted in: $local_short \"$local_subject\""
    echo ""
    echo -n "  Proceed anyway? [y/N] "
    read -r answer
    if [[ ! "$answer" =~ ^[Yy] ]]; then
      echo "  Aborted."
      exit 0
    fi
  fi

  restore_file "$commit" "$filepath"
  echo ""
  echo "Done. Review the restored file before committing."
  exit 0
fi

# --------------------------------------------------------------------------
# Collect missing files from regression check
# --------------------------------------------------------------------------

echo -e "${BOLD}ChefFlow Regression Recovery${NC}"
echo -e "Mode: ${MODE}"
echo "================================================"
echo ""

echo -e "${DIM}Running regression check...${NC}"

# Run regression check and capture output
REGRESSION_OUTPUT=""
REGRESSION_EXIT=0
REGRESSION_OUTPUT=$(bash "$SCRIPT_DIR/regression-check.sh" --quick 2>&1) || REGRESSION_EXIT=$?

if [ "$REGRESSION_EXIT" -eq 0 ]; then
  echo ""
  echo -e "${GREEN}No regressions detected.${NC} Nothing to recover."
  exit 0
fi

# Parse MISSING items from the regression check output.
# The format is:   MISSING  filepath (group)
# We also check .regression-report.md for the list.
MISSING_FILES=()

# Parse from the report file (more reliable)
REPORT_FILE="$PROJECT_ROOT/.regression-report.md"
if [ -f "$REPORT_FILE" ]; then
  while IFS= read -r line; do
    # Lines look like: - `app/(chef)/events/new/page.tsx (core)`
    # or: - `lib/ai/remy-actions.ts::functionName()`
    # or: - `lib/db/schema/schema.ts (FILE MISSING)`
    # We only want file-level missing items, not export-level
    if [[ "$line" =~ ^-\ \` ]]; then
      # Extract the path between backticks
      item=$(echo "$line" | sed 's/^- `//; s/`$//')

      # Skip export-level items (contain ::)
      if [[ "$item" == *"::"* ]]; then
        continue
      fi

      # Skip schema table items
      if [[ "$item" == schema::* ]]; then
        continue
      fi

      # Skip semantic regression references
      if [[ "$item" == *"semantic regression"* ]]; then
        continue
      fi

      # Strip the group label: "filepath (group)" -> "filepath"
      # Also handle "filepath (FILE MISSING)" -> "filepath"
      filepath=$(echo "$item" | sed 's/ ([^)]*)$//')

      # Verify it's actually missing (not just an export issue)
      if [ ! -f "$PROJECT_ROOT/$filepath" ]; then
        MISSING_FILES+=("$filepath")
      fi
    fi
  done < "$REPORT_FILE"
fi

# Deduplicate
if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo ""
  echo -e "${YELLOW}Regression detected but no missing files found.${NC}"
  echo "The regression may be export-level (missing functions, not files)."
  echo "Export-level regressions require manual code fixes, not file recovery."
  exit 0
fi

# Deduplicate the array
UNIQUE_FILES=()
declare -A seen
for f in "${MISSING_FILES[@]}"; do
  if [ -z "${seen[$f]:-}" ]; then
    UNIQUE_FILES+=("$f")
    seen[$f]=1
  fi
done
MISSING_FILES=("${UNIQUE_FILES[@]}")

# --------------------------------------------------------------------------
# Scan each missing file in git history
# --------------------------------------------------------------------------

echo ""
echo -e "${BOLD}[RECOVERY SCAN]${NC}"

RECOVERABLE=()
RECOVERABLE_COMMITS=()
NOT_FOUND=()
WARNED=()

for filepath in "${MISSING_FILES[@]}"; do
  commit=$(find_last_commit "$filepath")

  if [ -z "$commit" ]; then
    echo -e "  ${RED}NOT FOUND${NC}    $filepath"
    echo "    Never existed in git history"
    echo ""
    NOT_FOUND+=("$filepath")
    continue
  fi

  info=$(get_commit_info "$commit" "$filepath")

  # Check for intentional deletion
  intent=$(check_intentional_deletion "$filepath")
  if [[ "$intent" == true* ]]; then
    del_short=$(echo "$intent" | cut -d'|' -f2)
    del_subject=$(echo "$intent" | cut -d'|' -f3-)
    echo -e "  ${YELLOW}WARNING${NC}  $filepath"
    echo "    Last seen: $info"
    echo -e "    ${YELLOW}Deletion may have been intentional${NC}"
    echo "    Deleted in: $del_short \"$del_subject\""
    echo ""
    WARNED+=("$filepath")
  else
    echo -e "  ${GREEN}RECOVERABLE${NC}  $filepath"
    echo "    Last seen: $info"
    echo ""
  fi

  RECOVERABLE+=("$filepath")
  RECOVERABLE_COMMITS+=("$commit")
done

# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------

echo "  ${#RECOVERABLE[@]} recoverable / ${#NOT_FOUND[@]} not found"
if [ ${#WARNED[@]} -gt 0 ]; then
  echo -e "  ${YELLOW}${#WARNED[@]} with intentional-deletion warnings${NC}"
fi

# --------------------------------------------------------------------------
# Recover (or dry-run)
# --------------------------------------------------------------------------

if [ "$MODE" = "scan" ]; then
  echo ""
  if [ ${#RECOVERABLE[@]} -gt 0 ]; then
    echo "Run with --recover to restore, or --dry-run to preview."
  fi
  exit 0
fi

if [ ${#RECOVERABLE[@]} -eq 0 ]; then
  echo ""
  echo "Nothing to recover."
  exit 1
fi

echo ""
if [ "$MODE" = "dry-run" ]; then
  echo -e "${BOLD}[DRY RUN] Would restore:${NC}"
else
  echo -e "${BOLD}[RECOVERING]${NC}"
fi

RESTORED=0
SKIPPED=0

for i in "${!RECOVERABLE[@]}"; do
  filepath="${RECOVERABLE[$i]}"
  commit="${RECOVERABLE_COMMITS[$i]}"

  # Safety: never overwrite existing files
  if [ -f "$PROJECT_ROOT/$filepath" ]; then
    echo -e "  ${YELLOW}SKIP${NC}     $filepath (file now exists)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [ "$MODE" = "dry-run" ]; then
    short=$(git -C "$PROJECT_ROOT" log -1 --format='%h' "$commit" 2>/dev/null)
    echo -e "  ${CYAN}WOULD RESTORE${NC} $filepath"
    echo -e "                ${DIM}from ${short}${NC}"
  else
    if restore_file "$commit" "$filepath"; then
      RESTORED=$((RESTORED + 1))
    else
      SKIPPED=$((SKIPPED + 1))
    fi
  fi
done

echo ""
echo "================================================"
if [ "$MODE" = "dry-run" ]; then
  echo -e "Dry run complete. ${#RECOVERABLE[@]} files would be restored."
  echo "Run with --recover to actually restore."
else
  echo -e "${GREEN}${BOLD}Recovery complete.${NC}"
  echo "  $RESTORED restored / $SKIPPED skipped / ${#NOT_FOUND[@]} not found"
  if [ "$RESTORED" -gt 0 ]; then
    echo ""
    echo "Review restored files before committing. Files are unstaged."
  fi
fi

if [ ${#NOT_FOUND[@]} -gt 0 ]; then
  exit 1
fi
exit 0
