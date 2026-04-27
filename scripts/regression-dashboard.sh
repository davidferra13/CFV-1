#!/usr/bin/env bash
# regression-dashboard.sh - Generate a self-contained HTML regression dashboard
# Usage: bash scripts/regression-dashboard.sh [--open]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT="$SCRIPT_DIR/.regression-dashboard.html"

TREND_FILE="$SCRIPT_DIR/.regression-trend.jsonl"
SNAPSHOT_FILE="$SCRIPT_DIR/.regression-snapshot.json"
SESSION_FILE="$SCRIPT_DIR/.session-changes.jsonl"
FRAGILE_FILE="$SCRIPT_DIR/.fragile-watchlist.json"
REGRESSION_REPORT="$PROJECT_ROOT/.regression-report.md"
SEMANTIC_REPORT="$PROJECT_ROOT/.regression-semantic-report.md"

OPEN_AFTER=false
if [[ "${1:-}" == "--open" ]]; then
  OPEN_AFTER=true
fi

BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Write a temporary node script to avoid bash quoting hell
TMPJS=$(mktemp /tmp/regression-dashboard-XXXXXX.mjs)
trap "rm -f '$TMPJS'" EXIT

cat > "$TMPJS" << 'ENDSCRIPT'
import fs from "fs";

const [,, trendFile, snapshotFile, sessionFile, fragileFile, regressionReport, semanticReport, branch, now, outputFile] = process.argv;

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// --- Read data sources ---
let trendData = [];
try {
  const lines = fs.readFileSync(trendFile, "utf8").trim().split("\n").filter(Boolean);
  trendData = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
} catch {}

let snapshot = null;
try {
  snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
} catch {}

let sessions = [];
try {
  const lines = fs.readFileSync(sessionFile, "utf8").trim().split("\n").filter(Boolean);
  sessions = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
} catch {}

let fragileFiles = [];
try {
  const data = JSON.parse(fs.readFileSync(fragileFile, "utf8"));
  fragileFiles = Array.isArray(data) ? data : (data.files || data.watchlist || Object.entries(data).map(([k,v]) => ({file: k, ...v})));
} catch {}

let regressionLines = [];
let hasRegressions = false;
try {
  const content = fs.readFileSync(regressionReport, "utf8");
  hasRegressions = true;
  regressionLines = content.split("\n").filter(l => l.startsWith("- ") || l.startsWith("* "));
} catch {}

let semanticStatus = null;
let semanticFailures = [];
let semanticWarnings = 0;
let semanticChecks = 0;
try {
  const content = fs.readFileSync(semanticReport, "utf8");
  const statusMatch = content.match(/Status:\s*(PASSED|FAILED)[^\n]*/);
  if (statusMatch) semanticStatus = statusMatch[0];
  const warnMatch = content.match(/(\d+)\s*warning/i);
  if (warnMatch) semanticWarnings = parseInt(warnMatch[1]);
  const checkMatch = content.match(/Checks run:\s*(\d+)/);
  if (checkMatch) semanticChecks = parseInt(checkMatch[1]);
  semanticFailures = content.split("\n").filter(l => l.match(/^-\s+`/)).slice(0, 20);
} catch {}

// --- Compute vitals ---
const latest = trendData.length > 0 ? trendData[trendData.length - 1] : null;
const prev = trendData.length > 1 ? trendData[trendData.length - 2] : null;

function getVitals() {
  if (latest) return latest;
  if (snapshot && snapshot._meta) {
    return {
      pages: snapshot._meta.pages_count || 0,
      api_routes: snapshot._meta.api_routes_count || 0,
      exports: snapshot._meta.server_action_exports_count || 0,
      tables: snapshot._meta.tables_count || 0
    };
  }
  return { pages: 0, api_routes: 0, exports: 0, tables: 0 };
}

const v = getVitals();

function delta(key) {
  if (!latest || !prev) return "";
  const diff = (latest[key] || 0) - (prev[key] || 0);
  if (diff === 0) return '<span class="delta neutral">-</span>';
  if (diff > 0) return '<span class="delta up">&#9650; +' + diff + '</span>';
  return '<span class="delta down">&#9660; ' + diff + '</span>';
}

// --- Overall status ---
const isClean = !hasRegressions && (!latest || latest.status === "clean");
const statusText = isClean ? "ALL CLEAR" : "REGRESSIONS DETECTED";
const statusClass = isClean ? "status-clean" : "status-fail";

// --- Build trend chart ---
function buildChart() {
  const chartData = trendData.slice(-20);
  if (chartData.length === 0) return '<p class="muted">No trend data available.</p>';
  const maxPages = Math.max(...chartData.map(d => d.pages || 0), 1);
  const maxExports = Math.max(...chartData.map(d => d.exports || 0), 1);
  let rows = "";
  for (const d of chartData) {
    const pagesW = Math.max(Math.round(((d.pages || 0) / maxPages) * 100), 3);
    const exportsW = Math.max(Math.round(((d.exports || 0) / maxExports) * 100), 3);
    const ts = (d.timestamp || "").replace("T", " ").replace("Z", "").slice(5, 16);
    rows += `<div class="chart-row">
      <span class="chart-label">${ts}</span>
      <div class="chart-bars">
        <div class="bar bar-pages" style="width:${pagesW}%" title="Pages: ${d.pages||0}">${d.pages||0}</div>
        <div class="bar bar-exports" style="width:${exportsW}%" title="Exports: ${d.exports||0}">${d.exports||0}</div>
      </div>
    </div>`;
  }
  return `<div class="chart-container">
    <div class="chart-legend"><span class="legend-pages"></span> Pages <span class="legend-exports"></span> Exports</div>
    <div class="chart-rows">${rows}</div>
  </div>`;
}

// --- Build regressions section ---
function buildRegressions() {
  if (!hasRegressions && semanticFailures.length === 0) {
    return '<p class="muted">No regressions detected.</p>';
  }
  let html = "";
  if (hasRegressions) {
    html += "<h3>File Regressions</h3><ul class=\"regression-list\">";
    for (const line of regressionLines.slice(0, 30)) {
      const text = line.replace(/^[-*]\s*/, "");
      const fileMatch = text.match(/`([^`]+)`/);
      const file = fileMatch ? fileMatch[1] : text;
      const category = text.replace(/`[^`]+`\s*/, "").trim() || "general";
      html += `<li><code>${escHtml(file)}</code> <span class="tag">${escHtml(category)}</span></li>`;
    }
    html += "</ul>";
  }
  if (semanticFailures.length > 0) {
    html += "<h3>Semantic Checks</h3>";
    html += `<p>${escHtml(semanticStatus || "")} | Checks: ${semanticChecks} | Warnings: ${semanticWarnings}</p>`;
    html += '<ul class="regression-list">';
    for (const line of semanticFailures) {
      const text = line.replace(/^[-*]\s*/, "").replace(/`/g, "");
      html += `<li><code>${escHtml(text)}</code></li>`;
    }
    if (semanticFailures.length >= 20) html += '<li class="muted">... and more (see .regression-semantic-report.md)</li>';
    html += "</ul>";
  }
  return html;
}

// --- Build sessions section ---
function buildSessions() {
  const recent = sessions.slice(-10).reverse();
  if (recent.length === 0) return '<p class="muted">No session data.</p>';
  let rows = "";
  for (const s of recent) {
    const ts = (s.timestamp || "").replace("T", " ").replace("Z", "").slice(0, 16);
    rows += `<tr>
      <td>${escHtml(ts)}</td>
      <td>${escHtml(s.branch || "-")}</td>
      <td>${s.file_count || (s.files_modified || []).length || 0}</td>
      <td>${escHtml(s.label || "-")}</td>
    </tr>`;
  }
  return `<table><thead><tr><th>Time</th><th>Branch</th><th>Files</th><th>Label</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// --- Build fragile files section ---
function buildFragile() {
  if (fragileFiles.length === 0) return '<p class="muted">No fragile watchlist found.</p>';
  let rows = "";
  for (const f of fragileFiles) {
    const file = f.file || f.path || f.name || String(f);
    const risk = f.risk || f.level || f.severity || "unknown";
    const reason = f.reason || f.note || f.description || "";
    const riskClass = risk === "high" ? "risk-high" : risk === "medium" ? "risk-med" : "risk-low";
    rows += `<tr>
      <td><code>${escHtml(file)}</code></td>
      <td><span class="risk-badge ${riskClass}">${escHtml(risk)}</span></td>
      <td>${escHtml(reason)}</td>
    </tr>`;
  }
  return `<table><thead><tr><th>File</th><th>Risk</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// --- Assemble ---
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChefFlow Regression Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; padding: 20px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 1.4em; margin-bottom: 4px; color: #e6edf3; }
  h2 { font-size: 1.15em; color: #e6edf3; margin: 24px 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #21262d; }
  h3 { font-size: 1em; color: #8b949e; margin: 12px 0 8px 0; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .header-meta { font-size: 0.82em; color: #8b949e; text-align: right; }
  .status-banner { padding: 16px 24px; border-radius: 8px; text-align: center; font-size: 1.5em; font-weight: 700; letter-spacing: 1px; margin-bottom: 20px; }
  .status-clean { background: #0d3520; color: #3fb950; border: 1px solid #238636; }
  .status-fail { background: #3d1a1a; color: #f85149; border: 1px solid #da3633; }
  .vitals { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 8px; }
  .vital-card { background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 16px; text-align: center; }
  .vital-value { font-size: 2em; font-weight: 700; color: #e6edf3; }
  .vital-label { font-size: 0.85em; color: #8b949e; margin-top: 4px; }
  .delta { font-size: 0.7em; margin-left: 6px; }
  .delta.up { color: #3fb950; }
  .delta.down { color: #f85149; }
  .delta.neutral { color: #484f58; }
  .chart-container { background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 16px; }
  .chart-legend { font-size: 0.8em; color: #8b949e; margin-bottom: 10px; display: flex; gap: 16px; }
  .legend-pages { display: inline-block; width: 12px; height: 12px; background: #58a6ff; border-radius: 2px; vertical-align: middle; margin-right: 4px; }
  .legend-exports { display: inline-block; width: 12px; height: 12px; background: #8b5cf6; border-radius: 2px; vertical-align: middle; margin-right: 4px; }
  .chart-rows { display: flex; flex-direction: column; gap: 4px; }
  .chart-row { display: flex; align-items: center; gap: 8px; }
  .chart-label { font-size: 0.72em; color: #8b949e; min-width: 90px; text-align: right; font-family: monospace; }
  .chart-bars { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .bar { height: 16px; border-radius: 3px; font-size: 0.68em; line-height: 16px; padding-left: 6px; color: #fff; min-width: 28px; white-space: nowrap; }
  .bar-pages { background: #58a6ff; }
  .bar-exports { background: #8b5cf6; }
  .regression-list { list-style: none; padding: 0; }
  .regression-list li { padding: 6px 10px; border-bottom: 1px solid #21262d; font-size: 0.88em; }
  .regression-list li:last-child { border-bottom: none; }
  .regression-list code { color: #f0883e; }
  .tag { font-size: 0.75em; background: #21262d; color: #8b949e; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
  table { width: 100%; border-collapse: collapse; background: #161b22; border: 1px solid #21262d; border-radius: 8px; overflow: hidden; font-size: 0.88em; }
  th { background: #1c2128; color: #8b949e; text-align: left; padding: 8px 12px; font-weight: 600; }
  td { padding: 8px 12px; border-top: 1px solid #21262d; }
  td code { color: #f0883e; }
  .risk-badge { padding: 2px 10px; border-radius: 10px; font-size: 0.8em; font-weight: 600; text-transform: uppercase; }
  .risk-high { background: #3d1a1a; color: #f85149; }
  .risk-med { background: #3d2e00; color: #d29922; }
  .risk-low { background: #0d3520; color: #3fb950; }
  .muted { color: #484f58; font-style: italic; }
  .section { background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  footer { text-align: center; color: #484f58; font-size: 0.75em; margin-top: 24px; padding-top: 12px; border-top: 1px solid #21262d; }
</style>
</head>
<body>

<div class="header">
  <h1>ChefFlow Regression Dashboard</h1>
  <div class="header-meta">
    <div>${escHtml(branch)}</div>
    <div>${escHtml(now)}</div>
  </div>
</div>

<div class="status-banner ${statusClass}">${statusText}</div>

<h2>Codebase Vitals</h2>
<div class="vitals">
  <div class="vital-card">
    <div class="vital-value">${v.pages || 0} ${delta("pages")}</div>
    <div class="vital-label">Pages</div>
  </div>
  <div class="vital-card">
    <div class="vital-value">${v.api_routes || 0} ${delta("api_routes")}</div>
    <div class="vital-label">API Routes</div>
  </div>
  <div class="vital-card">
    <div class="vital-value">${v.exports || 0} ${delta("exports")}</div>
    <div class="vital-label">Exports</div>
  </div>
  <div class="vital-card">
    <div class="vital-value">${v.tables || 0} ${delta("tables")}</div>
    <div class="vital-label">Tables</div>
  </div>
</div>

<h2>Trend</h2>
${buildChart()}

<h2>Current Regressions</h2>
<div class="section">
${buildRegressions()}
</div>

<h2>Recent Sessions</h2>
${buildSessions()}

<h2>Fragile Files</h2>
${buildFragile()}

<footer>Generated by regression-dashboard.sh | ChefFlow V1</footer>

</body>
</html>`;

fs.writeFileSync(outputFile, html, "utf8");
console.log("Dashboard written to " + outputFile);
ENDSCRIPT

node "$TMPJS" \
  "$TREND_FILE" \
  "$SNAPSHOT_FILE" \
  "$SESSION_FILE" \
  "$FRAGILE_FILE" \
  "$REGRESSION_REPORT" \
  "$SEMANTIC_REPORT" \
  "$BRANCH" \
  "$NOW" \
  "$OUTPUT"

if $OPEN_AFTER; then
  if command -v start &>/dev/null; then
    start "$OUTPUT"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$OUTPUT"
  elif command -v open &>/dev/null; then
    open "$OUTPUT"
  else
    echo "Could not auto-open. Open manually: $OUTPUT"
  fi
fi
