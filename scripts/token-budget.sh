#!/usr/bin/env bash
# token-budget.sh - Estimate per-conversation context tax
# Run: bash scripts/token-budget.sh
# No cloud calls. Pure local math.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEMORY_DIR="$HOME/.claude/projects/c--Users-david-Documents-CFv1/memory"

# ~4 chars per token (conservative estimate)
CHARS_PER_TOKEN=4

estimate_tokens() {
  local bytes=$1
  echo $(( bytes / CHARS_PER_TOKEN ))
}

divider() {
  echo "────────────────────────────────────────────────────"
}

echo ""
echo "  TOKEN BUDGET REPORT"
echo "  $(date '+%Y-%m-%d %H:%M')"
divider

# Always-loaded files
total_bytes=0
echo ""
echo "  ALWAYS LOADED (every conversation + every agent spawn)"
echo ""

# Only files with @docs/ import in CLAUDE.md are auto-loaded
# CLAUDE-REFERENCE.md was made on-demand (2026-04-17)
for f in "$REPO_ROOT/CLAUDE.md" "$REPO_ROOT/docs/CLAUDE-ARCHITECTURE.md"; do
  if [ -f "$f" ]; then
    b=$(wc -c < "$f")
    t=$(estimate_tokens "$b")
    total_bytes=$((total_bytes + b))
    printf "  %-42s %6d bytes  ~%5d tokens\n" "$(basename "$f")" "$b" "$t"
  fi
done

if [ -f "$MEMORY_DIR/MEMORY.md" ]; then
  b=$(wc -c < "$MEMORY_DIR/MEMORY.md")
  t=$(estimate_tokens "$b")
  total_bytes=$((total_bytes + b))
  printf "  %-42s %6d bytes  ~%5d tokens\n" "MEMORY.md" "$b" "$t"
fi

divider
total_tokens=$(estimate_tokens "$total_bytes")
printf "  %-42s %6d bytes  ~%5d tokens\n" "TOTAL CONTEXT TAX" "$total_bytes" "$total_tokens"

# Cost projection
echo ""
echo "  COST PROJECTION (Opus input: \$15/M tokens)"
echo ""
# Use awk for float math (bc not on Windows)
cost_1=$(awk "BEGIN {printf \"%.4f\", $total_tokens * 15 / 1000000}")
cost_10=$(awk "BEGIN {printf \"%.4f\", $total_tokens * 15 * 10 / 1000000}")
cost_50=$(awk "BEGIN {printf \"%.4f\", $total_tokens * 15 * 50 / 1000000}")
printf "  1 conversation:    \$%s\n" "$cost_1"
printf "  10 conversations:  \$%s\n" "$cost_10"
printf "  50 conversations:  \$%s\n" "$cost_50"
echo "  (multiply by agent spawns per conversation)"

# Big docs warning
echo ""
divider
echo ""
echo "  LARGE DOCS (>50KB, spike risk if read)"
echo ""
found_large=0
while IFS= read -r line; do
  bytes=$(echo "$line" | awk '{print $1}')
  file=$(echo "$line" | awk '{print $2}')
  if [ "$bytes" -gt 51200 ] 2>/dev/null; then
    t=$(estimate_tokens "$bytes")
    rel="${file#$REPO_ROOT/}"
    printf "  %-50s %7d bytes  ~%6d tokens\n" "$rel" "$bytes" "$t"
    found_large=1
  fi
done < <(find "$REPO_ROOT/docs" -name "*.md" -exec wc -c {} \; 2>/dev/null | sort -rn)

if [ "$found_large" -eq 0 ]; then
  echo "  None found."
fi

# Agent definition sizes
echo ""
divider
echo ""
echo "  AGENT DEFINITIONS (re-loaded per spawn)"
echo ""
agent_total=0
if [ -d "$REPO_ROOT/.claude/agents" ]; then
  while IFS= read -r line; do
    bytes=$(echo "$line" | awk '{print $1}')
    file=$(echo "$line" | awk '{print $2}')
    t=$(estimate_tokens "$bytes")
    rel="${file#$REPO_ROOT/}"
    printf "  %-42s %6d bytes  ~%5d tokens\n" "$rel" "$bytes" "$t"
    agent_total=$((agent_total + bytes))
  done < <(find "$REPO_ROOT/.claude/agents" -name "*.md" -exec wc -c {} \; 2>/dev/null | sort -rn)
fi
printf "  %-42s %6d bytes  ~%5d tokens\n" "Agent defs total" "$agent_total" "$(estimate_tokens $agent_total)"

# Skill sizes
echo ""
divider
echo ""
echo "  SKILL DEFINITIONS (loaded on invocation)"
echo ""
skill_total=0
if [ -d "$REPO_ROOT/.claude/skills" ]; then
  while IFS= read -r line; do
    bytes=$(echo "$line" | awk '{print $1}')
    file=$(echo "$line" | awk '{print $2}')
    t=$(estimate_tokens "$bytes")
    rel="${file#$REPO_ROOT/}"
    printf "  %-50s %6d bytes  ~%5d tokens\n" "$(basename "$(dirname "$file")")/$(basename "$file")" "$bytes" "$t"
    skill_total=$((skill_total + bytes))
  done < <(find "$REPO_ROOT/.claude/skills" -name "*.md" -exec wc -c {} \; 2>/dev/null | sort -rn)
fi
printf "  %-50s %6d bytes  ~%5d tokens\n" "Skills total" "$skill_total" "$(estimate_tokens $skill_total)"

echo ""
divider
echo ""
echo "  Per-agent-spawn tax: ~$(estimate_tokens $((total_bytes + agent_total))) tokens"
echo "  3-agent conversation: ~$(estimate_tokens $((total_bytes * 4 + agent_total * 3))) tokens (context alone)"
echo ""
