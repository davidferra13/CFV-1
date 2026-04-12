#!/usr/bin/env node

import { spawnSync } from 'child_process';

const HOST = process.env.OPENCLAW_SSH_HOST || 'pi';
const REMOTE_DIR = process.env.OPENCLAW_REMOTE_DIR || '/home/davidferra/openclaw-prices';
const JSON_MODE = process.argv.includes('--json');

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(`${cmd} ${args.join(' ')} failed (${result.status})${stderr ? `: ${stderr}` : stdout ? `: ${stdout}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function sshBash(script) {
  return run('ssh', [HOST, 'bash', '-lc', script]);
}

function sshPython(code) {
  return run('ssh', [HOST, 'python3', '-'], { input: code });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Could not parse remote JSON: ${err.message}\n${text}`);
  }
}

const services = safeJsonParse(sshPython(`
import json, subprocess

service_names = ["openclaw-sync-api", "openclaw-receipt-processor"]
payload = {}
for name in service_names:
    status = subprocess.run(["systemctl", "is-active", name], capture_output=True, text=True)
    payload[name] = (status.stdout or status.stderr).strip() or "unknown"
print(json.dumps(payload))
`));

const endpoints = safeJsonParse(sshPython(`
import json, urllib.request, urllib.error

targets = {
    "sync_api": "http://localhost:8081/health",
    "receipt_processor": "http://localhost:8082/status",
}
payload = {}
for name, url in targets.items():
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            body = resp.read(200).decode("utf-8", "replace")
            payload[name] = {"ok": True, "status": resp.status, "body": body}
    except Exception as exc:
        payload[name] = {"ok": False, "error": str(exc)}
print(json.dumps(payload))
`));

const runtime = safeJsonParse(sshPython(`
import collections, datetime, json, os, sqlite3

db_path = os.path.expanduser("${REMOTE_DIR.replace(/\\/g, '/')}/data/prices.db")
log_dir = os.path.expanduser("${REMOTE_DIR.replace(/\\/g, '/')}/logs")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

def scalar(sql, params=()):
    row = cur.execute(sql, params).fetchone()
    if row is None:
        return None
    if isinstance(row, sqlite3.Row):
        return row[0]
    return row[0]

def tail_lines(path, limit=2500):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8", errors="replace") as handle:
        return handle.readlines()[-limit:]

source_rows = cur.execute("""
    SELECT source_id, name, last_scraped_at, scrape_method, status
    FROM source_registry
    WHERE COALESCE(status, 'active') = 'active'
      AND COALESCE(scrape_method, 'none') != 'none'
    ORDER BY last_scraped_at ASC
""").fetchall()

now = datetime.datetime.utcnow()
stale = []
never_scraped = []
for row in source_rows:
    source_id = row["source_id"]
    last_scraped_at = row["last_scraped_at"]
    if not last_scraped_at:
        never_scraped.append({
            "source_id": source_id,
            "name": row["name"],
        })
        continue

    try:
        last_dt = datetime.datetime.fromisoformat(last_scraped_at.replace("Z", "+00:00"))
    except ValueError:
        last_dt = datetime.datetime.strptime(last_scraped_at, "%Y-%m-%d %H:%M:%S")
    if last_dt.tzinfo is not None:
        last_dt = last_dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)

    hours_since = round((now - last_dt).total_seconds() / 3600, 1)
    max_hours = 26
    if source_id.startswith("gov-"):
        max_hours = 720
    elif "flipp" in source_id or "flyer" in source_id:
        max_hours = 168

    if hours_since > max_hours:
        stale.append({
            "source_id": source_id,
            "name": row["name"],
            "hours_since": hours_since,
            "max_hours": max_hours,
        })

whole_foods_counts = [
    dict(row)
    for row in cur.execute("""
        SELECT source_id, COUNT(*) AS price_count
        FROM current_prices
        WHERE source_id LIKE 'whole-foods-%'
        GROUP BY source_id
        ORDER BY price_count ASC
    """).fetchall()
]

log_map = {
    "cross_match": os.path.join(log_dir, "cross-match.log"),
    "aggregator": os.path.join(log_dir, "aggregator.log"),
    "growth_tracker": os.path.join(log_dir, "growth-tracker.log"),
    "whole_foods": os.path.join(log_dir, "scraper-wholefoods.log"),
    "watchdog": os.path.join(log_dir, "watchdog.log"),
}

error_counts = {}
for key, path in log_map.items():
    lines = tail_lines(path)
    joined = "".join(lines).lower()
    error_counts[key] = {
        "database_locked": joined.count("database is locked"),
        "delete_guard": joined.count("delete forbidden on current_prices"),
        "learned_pattern_conflict": joined.count("on conflict clause does not match any primary key or unique constraint"),
        "latest_excerpt": "".join(lines[-20:]).strip()[-1200:],
    }

payload = {
    "timestamp_utc": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "db_stats": {
        "prices": scalar("SELECT COUNT(*) FROM current_prices"),
        "changes": scalar("SELECT COUNT(*) FROM price_changes"),
        "mappings": scalar("SELECT COUNT(*) FROM normalization_map"),
        "catalog_stores_total": scalar("SELECT COUNT(*) FROM catalog_stores"),
        "catalog_stores_cataloged": scalar("SELECT COUNT(*) FROM catalog_stores WHERE last_cataloged_at IS NOT NULL"),
        "catalog_stores_touched_24h": scalar("SELECT COUNT(*) FROM catalog_stores WHERE last_cataloged_at >= datetime('now', '-24 hours')"),
        "catalog_chains_cataloged": scalar("SELECT COUNT(DISTINCT chain_slug) FROM catalog_stores WHERE last_cataloged_at IS NOT NULL"),
        "last_cataloged_at": scalar("SELECT MAX(last_cataloged_at) FROM catalog_stores WHERE last_cataloged_at IS NOT NULL"),
    },
    "freshness": {
        "stale_count": len(stale),
        "never_scraped_count": len(never_scraped),
        "top_stale": stale[:10],
        "top_never_scraped": never_scraped[:10],
        "whole_foods_underfilled": [row for row in whole_foods_counts if row["price_count"] < 40][:10],
    },
    "logs": error_counts,
}

print(json.dumps(payload))
`));

const critical = [];
const warnings = [];

if (services['openclaw-sync-api'] !== 'active') critical.push(`sync-api service is ${services['openclaw-sync-api']}`);
if (services['openclaw-receipt-processor'] !== 'active') critical.push(`receipt-processor service is ${services['openclaw-receipt-processor']}`);

if (!endpoints.sync_api.ok) critical.push(`sync-api health check failed: ${endpoints.sync_api.error}`);
if (!endpoints.receipt_processor.ok) critical.push(`receipt-processor status check failed: ${endpoints.receipt_processor.error}`);

if (runtime.logs.cross_match.delete_guard > 0) critical.push(`cross-match delete guard errors in recent log tail: ${runtime.logs.cross_match.delete_guard}`);
if (runtime.logs.aggregator.learned_pattern_conflict > 0) critical.push(`aggregator learned_patterns schema errors in recent log tail: ${runtime.logs.aggregator.learned_pattern_conflict}`);

if (runtime.logs.growth_tracker.database_locked > 0) warnings.push(`growth-tracker lock events in recent log tail: ${runtime.logs.growth_tracker.database_locked}`);
if (runtime.logs.whole_foods.database_locked > 0) warnings.push(`whole-foods lock events in recent log tail: ${runtime.logs.whole_foods.database_locked}`);
if (runtime.freshness.stale_count > 0) warnings.push(`stale scraped sources: ${runtime.freshness.stale_count}`);
if (runtime.freshness.never_scraped_count > 0) warnings.push(`never-scraped queued sources: ${runtime.freshness.never_scraped_count}`);
if (runtime.freshness.whole_foods_underfilled.length > 0) warnings.push(`whole-foods underfilled regions: ${runtime.freshness.whole_foods_underfilled.length}`);

const summary = {
  host: HOST,
  remote_dir: REMOTE_DIR,
  audited_at_utc: runtime.timestamp_utc,
  services,
  endpoints,
  runtime,
  critical,
  warnings,
  healthy: critical.length === 0,
};

if (JSON_MODE) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.healthy ? 0 : 1);
}

console.log(`OpenClaw runtime audit - ${summary.audited_at_utc}`);
console.log('');
console.log('Services');
console.log(`- openclaw-sync-api: ${services['openclaw-sync-api']}`);
console.log(`- openclaw-receipt-processor: ${services['openclaw-receipt-processor']}`);
console.log(`- sync-api health: ${endpoints.sync_api.ok ? `ok ${endpoints.sync_api.status}` : endpoints.sync_api.error}`);
console.log(`- receipt-processor health: ${endpoints.receipt_processor.ok ? `ok ${endpoints.receipt_processor.status}` : endpoints.receipt_processor.error}`);
console.log('');
console.log('Runtime');
console.log(`- prices: ${runtime.db_stats.prices}`);
console.log(`- changes: ${runtime.db_stats.changes}`);
console.log(`- mappings: ${runtime.db_stats.mappings}`);
console.log(`- catalog stores touched last 24h: ${runtime.db_stats.catalog_stores_touched_24h}`);
console.log(`- catalog chains ever touched: ${runtime.db_stats.catalog_chains_cataloged}`);
console.log(`- last cataloged_at: ${runtime.db_stats.last_cataloged_at || 'none'}`);
console.log('');

if (critical.length > 0) {
  console.log('Critical');
  for (const item of critical) console.log(`- ${item}`);
  console.log('');
}

if (warnings.length > 0) {
  console.log('Warnings');
  for (const item of warnings) console.log(`- ${item}`);
  console.log('');
}

if (runtime.freshness.top_stale.length > 0) {
  console.log('Top stale sources');
  for (const item of runtime.freshness.top_stale.slice(0, 5)) {
    console.log(`- ${item.source_id}: ${item.hours_since}h since scrape (max ${item.max_hours}h)`);
  }
  console.log('');
}

if (runtime.freshness.top_never_scraped.length > 0) {
  console.log('Top never-scraped queued sources');
  for (const item of runtime.freshness.top_never_scraped.slice(0, 5)) {
    console.log(`- ${item.source_id}`);
  }
  console.log('');
}

if (runtime.freshness.whole_foods_underfilled.length > 0) {
  console.log('Whole Foods underfilled');
  for (const item of runtime.freshness.whole_foods_underfilled.slice(0, 5)) {
    console.log(`- ${item.source_id}: ${item.price_count} prices`);
  }
  console.log('');
}

console.log(summary.healthy ? 'Verdict: healthy' : 'Verdict: needs attention');
process.exit(summary.healthy ? 0 : 1);
