#!/usr/bin/env bash
# OpenClaw Ingredient Knowledge Enrichment - Cron Runner
#
# Designed to run on the Raspberry Pi or Windows Task Scheduler.
# Processes a batch of 200 unenriched ingredients per run.
#
# Pi cron setup (crontab -e):
#   0 2 * * * /home/davidferra/openclaw-operator/scripts/wiki-enrich.sh >> /home/davidferra/openclaw-operator/logs/wiki-enrichment.log 2>&1
#
# Windows Task Scheduler:
#   Program: node
#   Arguments: C:\Users\david\Documents\CFv1\scripts\openclaw-wiki-enrichment.mjs --limit 200 --resume
#   Start in: C:\Users\david\Documents\CFv1
#
# Manual full run: node scripts/openclaw-wiki-enrichment.mjs --resume
# Manual test:     node scripts/openclaw-wiki-enrichment.mjs --name "basil"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [wiki-enrichment]"

echo "$LOG_PREFIX Starting batch enrichment (200 ingredients)"

cd "$PROJECT_DIR"

node scripts/openclaw-wiki-enrichment.mjs --limit 200 --resume

echo "$LOG_PREFIX Batch complete"
