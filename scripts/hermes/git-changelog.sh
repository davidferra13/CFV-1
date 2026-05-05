#!/bin/bash
# Hermes Job 3: Git Changelog Digest (v2)
# Runs every 4 hours. Categorized commits, velocity tracking, file hotspots.
# Output: docs/hermes/git-changelog.md

CHEFFLOW="/mnt/c/Users/david/Documents/CFv1"
OUTPUT="$CHEFFLOW/docs/hermes/git-changelog.md"
TS=$(date +"%Y-%m-%d %H:%M")

mkdir -p "$(dirname "$OUTPUT")"
cd "$CHEFFLOW" || exit 1

# Get commits from last 4 hours
COMMITS=$(git log --oneline --since="4 hours ago" 2>/dev/null)
COMMIT_COUNT=0
if [ -n "$COMMITS" ]; then
  COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
fi

# Categorize by conventional commit type
FEAT_COUNT=$(echo "$COMMITS" | grep -c "^[a-f0-9]* feat" 2>/dev/null || echo "0")
FIX_COUNT=$(echo "$COMMITS" | grep -c "^[a-f0-9]* fix" 2>/dev/null || echo "0")
CHORE_COUNT=$(echo "$COMMITS" | grep -c "^[a-f0-9]* chore" 2>/dev/null || echo "0")
REFACTOR_COUNT=$(echo "$COMMITS" | grep -c "^[a-f0-9]* refactor" 2>/dev/null || echo "0")
DOCS_COUNT=$(echo "$COMMITS" | grep -c "^[a-f0-9]* docs" 2>/dev/null || echo "0")
OTHER_COUNT=$((COMMIT_COUNT - FEAT_COUNT - FIX_COUNT - CHORE_COUNT - REFACTOR_COUNT - DOCS_COUNT))
[ "$OTHER_COUNT" -lt 0 ] && OTHER_COUNT=0

# Uncommitted and unpushed
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
UNPUSHED=$(git log "origin/$BRANCH..HEAD" --oneline 2>/dev/null | wc -l | tr -d ' ')

# File hotspots: most-changed files in last 4h
HOTSPOTS=""
if [ "$COMMIT_COUNT" -gt 0 ]; then
  SINCE_HASH=$(git log --oneline --since="4 hours ago" --format="%H" 2>/dev/null | tail -1)
  if [ -n "$SINCE_HASH" ]; then
    HOTSPOTS=$(git diff --stat "$SINCE_HASH" HEAD 2>/dev/null | head -15)
  fi
fi

# 24h velocity (for trend tracking)
COMMITS_24H=$(git log --oneline --since="24 hours ago" 2>/dev/null | wc -l | tr -d ' ')
COMMITS_48H=$(git log --oneline --since="48 hours ago" --until="24 hours ago" 2>/dev/null | wc -l | tr -d ' ')

# Domains touched (extract scope from conventional commits)
DOMAINS=$(echo "$COMMITS" | grep -oP '(?<=\()[^)]+(?=\))' 2>/dev/null | sort | uniq -c | sort -rn | head -5)

# Append entry
cat >> "$OUTPUT" << EOF

## $TS

**Branch:** \`$BRANCH\` | **Commits (4h):** $COMMIT_COUNT | **Velocity (24h):** $COMMITS_24H (prior 24h: $COMMITS_48H)

**Breakdown:** feat:$FEAT_COUNT fix:$FIX_COUNT refactor:$REFACTOR_COUNT chore:$CHORE_COUNT docs:$DOCS_COUNT other:$OTHER_COUNT

**Domains touched:**
$([ -n "$DOMAINS" ] && echo "$DOMAINS" || echo "  none")

**Commits:**
$COMMITS

**Uncommitted:** $UNCOMMITTED | **Unpushed:** $UNPUSHED

$([ -n "$HOTSPOTS" ] && echo "**File hotspots:**" && echo "\`\`\`" && echo "$HOTSPOTS" && echo "\`\`\`")

---
EOF

# Rotate: keep last 7 days
if [ -f "$OUTPUT" ]; then
  LINES=$(wc -l < "$OUTPUT")
  if [ "$LINES" -gt 600 ]; then
    tail -400 "$OUTPUT" > "$OUTPUT.tmp" && mv "$OUTPUT.tmp" "$OUTPUT"
  fi
fi
