#!/bin/bash
# Rebuild MemPalace from scratch (ChefFlow only)
# Run after closing Claude Code to release ChromaDB locks
# Usage: bash scripts/rebuild-mempalace.sh

set -e
export PYTHONIOENCODING=utf-8

echo "=== MemPalace Rebuild (ChefFlow) ==="
echo "$(date)"
echo ""

# Clean old palace
echo "[0/2] Cleaning old palace..."
rm -rf "C:/Users/david/.mempalace/palace" 2>/dev/null || {
  echo "ERROR: Cannot delete palace directory (files locked)."
  echo "Close Claude Code, kill Python processes, then re-run."
  exit 1
}
mkdir -p "C:/Users/david/.mempalace/palace"
echo "  Cleaned."
echo ""

# 1. Mine CFv1 project files (~6K files)
echo "[1/2] Mining CFv1 project files..."
cd "c:/Users/david/Documents/CFv1"
py -m mempalace mine . 2>&1 | tail -5
echo ""

# 2. Mine CFv1 Claude sessions
echo "[2/2] Mining Claude Code sessions..."
cd "C:/Users/david/.claude/projects/c--Users-david-Documents-CFv1"
py -m mempalace mine . --mode convos --extract general --wing chefflow-conversations 2>&1 | tail -5
echo ""

# Status
echo "=== Final Status ==="
cd "c:/Users/david/Documents/CFv1"
py -m mempalace status 2>&1
echo ""
echo "Rebuild complete: $(date)"
