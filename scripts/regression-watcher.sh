#!/usr/bin/env bash
# Regression Watcher - monitors critical files for deletion or suspicious modification.
# Usage: bash scripts/regression-watcher.sh
# Background: bash scripts/regression-watcher.sh &
# Stop: Ctrl+C (foreground) or kill %1 (background)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/regression-watcher.mjs"
