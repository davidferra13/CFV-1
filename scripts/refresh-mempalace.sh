#!/bin/bash
# Refresh MemPalace - re-mines ChefFlow sources sequentially, then compresses to build L1.
# Run periodically to keep the memory palace current.
# Usage: bash scripts/refresh-mempalace.sh
#
# NOTE: If MemPalace is updated via pip, re-check the miner.py patch:
#   scan_project() must accept exclude_patterns, and mine() must pass config.get("exclude", [])
#   See: memory/reference_mempalace_setup.md for details.

set -e
export PYTHONIOENCODING=utf-8

echo "=== MemPalace Refresh ==="
echo "$(date)"
echo ""

# 1. Mine CFv1 project files
echo "[1/3] Mining CFv1 project files..."
cd "c:/Users/david/Documents/CFv1"
py -m mempalace mine . 2>&1 | tail -5
echo ""

# 2. Mine CFv1 Claude sessions
echo "[2/3] Mining Claude Code sessions..."
cd "C:/Users/david/.claude/projects/c--Users-david-Documents-CFv1"
py -m mempalace mine . --mode convos --extract general --wing chefflow-conversations 2>&1 | tail -5
echo ""

# 3. Compress to build L1 distilled memory layer
echo "[3/3] Compressing to build L1..."
cd "c:/Users/david/Documents/CFv1"
py -m mempalace compress 2>&1 | tail -5
echo ""

# Status
echo "=== Final Status ==="
py -m mempalace status 2>&1
echo ""
echo "Refresh complete: $(date)"
