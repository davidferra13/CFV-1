#!/usr/bin/env bash
# Generate a pipeline status briefing for Claude Code session start.
# Writes to docs/.pipeline-briefing.md
# Called from session-briefing.sh or standalone.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/.pipeline-briefing.md"

# Fetch from server (fast, in-memory data)
HEALTH=$(curl -s --max-time 3 http://127.0.0.1:3977/healthz 2>/dev/null || echo '{}')
FUNNEL=$(curl -s --max-time 3 http://127.0.0.1:3977/api/pipeline-funnel 2>/dev/null || echo '{}')
TREND=$(curl -s --max-time 3 http://127.0.0.1:3977/api/score-trend 2>/dev/null || echo '{}')
DEDUP=$(curl -s --max-time 3 http://127.0.0.1:3977/api/gap-dedup 2>/dev/null || echo '{}')

# Extract values with node (available, fast)
node -e "
const h = $HEALTH;
const f = $FUNNEL;
const t = $TREND;
const d = $DEDUP;

const lines = [];
lines.push('# Pipeline Briefing');
lines.push('> Auto-generated ' + new Date().toISOString().slice(0,16) + '. Do not edit.');
lines.push('');

// Server status
const status = h.status || 'unknown';
const uptime = h.uptime_s ? Math.round(h.uptime_s / 60) + 'm' : '?';
const ollama = h.ollama || 'unknown';
lines.push('## Server: ' + status + ' (up ' + uptime + ', Ollama: ' + ollama + ')');
lines.push('');

// Build plans
const bp = h.build_plans || {};
lines.push('## Build Plans: ' + (bp.pending||0) + ' pending, ' + (bp.completed||0) + ' completed, ' + (bp.rejected||0) + ' rejected (' + (bp.completion_pct||0) + '% done)');
lines.push('');

// Funnel
if (f.stages) {
  lines.push('## Pipeline Funnel');
  lines.push('| Stage | Count | Notes |');
  lines.push('|-------|-------|-------|');
  for (const s of f.stages) {
    let notes = '';
    if (s.dropped) notes = s.dropped + ' dropped';
    if (s.rejected) notes = s.rejected + ' rejected';
    if (s.plans_produced) notes = s.plans_produced + ' plans';
    lines.push('| ' + s.name + ' | ' + s.count + ' | ' + notes + ' |');
  }
  if (f.conversion) {
    lines.push('');
    lines.push('End-to-end: ' + f.conversion.end_to_end + '%');
  }
  lines.push('');
}

// Score trends
const ts = t.summary || {};
if (ts.improving || ts.regressing || ts.stable) {
  lines.push('## Score Trends: ' + (ts.improving||0) + ' improving, ' + (ts.regressing||0) + ' regressing, ' + (ts.stable||0) + ' stable (avg delta: ' + (ts.avg_delta||0) + ')');
  lines.push('');
}

// Dedup
if (d.total_gaps) {
  lines.push('## Gaps: ' + d.unique_gaps + ' unique / ' + d.total_gaps + ' total (' + d.duplicate_ratio + '% duplicate), ' + (d.near_duplicates?.length||0) + ' near-dupes');
  lines.push('');
}

// Requests
const rq = h.requests || {};
if (rq.total > 0) {
  lines.push('## Requests: ' + rq.total + ' total, ' + rq.errors + ' errors, avg ' + rq.latency_avg_ms + 'ms, max ' + rq.latency_max_ms + 'ms');
  lines.push('');
}

process.stdout.write(lines.join('\n') + '\n');
" > "$OUT" 2>/dev/null

echo "[pipeline-briefing] Written to docs/.pipeline-briefing.md"
