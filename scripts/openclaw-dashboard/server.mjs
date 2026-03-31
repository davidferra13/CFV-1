import express from 'express';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRICES_DIR = path.join(os.homedir(), 'openclaw-prices');
const DB_PATH = path.join(PRICES_DIR, 'data', 'prices.db');
const LOGS_DIR = path.join(PRICES_DIR, 'logs');

const app = express();
const PORT = 8090;

// --- helpers ---

function openDb() {
  return new Database(DB_PATH, { readonly: true, fileMustExist: true });
}

function safeExec(cmd, fallback = '') {
  try { return execSync(cmd, { timeout: 5000, encoding: 'utf8' }).trim(); }
  catch { return fallback; }
}

function retryRead(fn, retries = 3, delay = 100) {
  for (let i = 0; i < retries; i++) {
    try { return fn(); }
    catch (e) {
      if (i === retries - 1) throw e;
      const start = Date.now();
      while (Date.now() - start < delay) { /* busy wait */ }
    }
  }
}

// --- API: active jobs ---

function getActiveJobs() {
  const raw = safeExec("ps -eo pid,pcpu,pmem,etime,args --sort=-pcpu", '');
  const lines = raw.split('\n').filter(l =>
    /openclaw|scraper|enricher|cross-match|aggregator|watchdog|receipt|sync-to/i.test(l) &&
    !/grep|ps -eo|node server\.mjs/i.test(l)
  );
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[0];
    const cpu = parts[1];
    const mem = parts[2];
    const elapsed = parts[3];
    const cmd = parts.slice(4).join(' ');
    return { pid, cpu, mem, elapsed, cmd };
  });
}

// --- API: job history ---

function getJobHistory() {
  return retryRead(() => {
    const db = openDb();
    try {
      return db.prepare(`
        SELECT scraper_name, scope, started_at, finished_at,
               products_found, products_updated, products_new,
               errors, error_details, duration_seconds
        FROM catalog_scrape_runs
        ORDER BY started_at DESC
        LIMIT 50
      `).all();
    } finally { db.close(); }
  });
}

// --- API: database pulse ---

function getDatabasePulse() {
  return retryRead(() => {
    const db = openDb();
    try {
      const q = (sql) => db.prepare(sql).get();
      const canonical = q('SELECT count(*) as c FROM canonical_ingredients').c;
      const prices = q('SELECT count(*) as c FROM current_prices').c;
      const coverage = canonical > 0 ? Math.round((prices / canonical) * 100) : 0;
      const changes7d = q(`SELECT count(*) as c FROM price_changes WHERE observed_at >= datetime('now', '-7 days')`).c;
      const freshest = q('SELECT MAX(last_confirmed_at) as t FROM current_prices').t;
      const stalest = q(`SELECT MIN(last_confirmed_at) as t FROM current_prices WHERE last_confirmed_at IS NOT NULL`).t;
      const catalogProducts = q('SELECT count(*) as c FROM catalog_products').c;
      const stores = q('SELECT count(*) as c FROM catalog_stores').c;
      const anomalies = q('SELECT count(*) as c FROM price_anomalies').c;
      return { canonical, prices, coverage, changes7d, freshest, stalest, catalogProducts, stores, anomalies };
    } finally { db.close(); }
  });
}

// --- API: scraper health ---

function getScraperHealth() {
  return retryRead(() => {
    const db = openDb();
    try {
      return db.prepare(`
        SELECT scraper_name,
               MAX(started_at) as last_run,
               SUM(CASE WHEN errors > 0 THEN 1 ELSE 0 END) as error_runs,
               SUM(products_found) as total_found,
               COUNT(*) as total_runs,
               MAX(CASE WHEN errors > 0 THEN error_details END) as last_error
        FROM catalog_scrape_runs
        GROUP BY scraper_name
        ORDER BY last_run DESC
      `).all().map(row => {
        const lastRunDate = row.last_run ? new Date(row.last_run + 'Z') : null;
        const hoursAgo = lastRunDate ? (Date.now() - lastRunDate.getTime()) / 3600000 : Infinity;
        let status = 'gray';
        if (hoursAgo <= 24 && row.error_runs === 0) status = 'green';
        else if (hoursAgo <= 24) status = 'yellow';
        else if (hoursAgo <= 48) status = 'yellow';
        else if (hoursAgo < Infinity) status = 'red';
        return { ...row, status, hoursAgo: Math.round(hoursAgo * 10) / 10 };
      });
    } finally { db.close(); }
  });
}

// --- API: system resources ---

function getSystemResources() {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  const cpuPct = Math.round((loadAvg[0] / cpus.length) * 100);
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPct = Math.round((usedMem / totalMem) * 100);

  let diskTotal = 0, diskUsed = 0, diskPct = 0;
  const dfRaw = safeExec("df -B1 / | tail -1", '');
  if (dfRaw) {
    const parts = dfRaw.split(/\s+/);
    diskTotal = parseInt(parts[1]) || 0;
    diskUsed = parseInt(parts[2]) || 0;
    diskPct = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;
  }

  const uptimeRaw = safeExec('uptime -p', '');
  let tempC = null;
  const tempRaw = safeExec('cat /sys/class/thermal/thermal_zone0/temp', '');
  if (tempRaw) tempC = Math.round(parseInt(tempRaw) / 1000);

  return {
    cpuPct, cpuCores: cpus.length, loadAvg: loadAvg[0],
    memUsedGB: +(usedMem / 1073741824).toFixed(1),
    memTotalGB: +(totalMem / 1073741824).toFixed(1),
    memPct,
    diskUsedGB: +(diskUsed / 1073741824).toFixed(1),
    diskTotalGB: +(diskTotal / 1073741824).toFixed(1),
    diskPct,
    uptime: uptimeRaw.replace('up ', ''),
    tempC
  };
}

// --- API: cron schedule ---

function getCronSchedule() {
  const raw = safeExec('crontab -l', '');
  if (!raw) return [];

  const lines = raw.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('SHELL') && !l.startsWith('PATH') && !l.startsWith('OPENCLAW'));
  const now = new Date();
  const entries = [];

  for (const line of lines) {
    const match = line.match(/^([\d*\/,]+)\s+([\d*\/,]+)\s+([\d*\/,]+)\s+([\d*\/,]+)\s+([\d*\/,]+)\s+(.+)$/);
    if (!match) continue;
    const [, minute, hour, dom, month, dow, command] = match;

    // Extract a readable name from the command
    let name = command;
    const nodeMatch = command.match(/node\s+\S+\/([\w-]+)\.mjs/);
    const bashMatch = command.match(/bash\s+\S+\/([\w-]+)\.sh\s+([\w-]+)/);
    const findMatch = command.match(/^find\s+/);
    if (nodeMatch) name = nodeMatch[1];
    else if (bashMatch) name = `${bashMatch[1]} (${bashMatch[2]})`;
    else if (findMatch) name = 'log-rotation';

    // Compute next run (simplified: nearest matching hour:minute in next 24h)
    const nextRun = computeNextRun(minute, hour, dow, now);
    if (nextRun) {
      const diffMs = nextRun.getTime() - now.getTime();
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin >= 0 && diffMin <= 720) { // within 12 hours
        entries.push({ name, nextRun: nextRun.toISOString(), minutesUntil: diffMin, command });
      }
    }
  }

  return entries.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

function computeNextRun(minute, hour, dow, now) {
  const mins = expandCronField(minute, 0, 59);
  const hours = expandCronField(hour, 0, 23);
  const dows = expandCronField(dow, 0, 6);

  // Check next 48 hours worth of slots
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    for (const h of hours) {
      for (const m of mins) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + dayOffset);
        candidate.setHours(h, m, 0, 0);
        if (candidate <= now) continue;
        if (!dows.includes(candidate.getDay())) continue;
        return candidate;
      }
    }
  }
  return null;
}

function expandCronField(field, min, max) {
  if (field === '*') {
    const arr = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
  }
  const results = [];
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const s = parseInt(step);
      const start = range === '*' ? min : parseInt(range);
      for (let i = start; i <= max; i += s) results.push(i);
    } else {
      results.push(parseInt(part));
    }
  }
  return results.sort((a, b) => a - b);
}

// --- API: recent errors ---

function getRecentErrors() {
  return retryRead(() => {
    const db = openDb();
    try {
      return db.prepare(`
        SELECT scraper_name, started_at, error_details, errors
        FROM catalog_scrape_runs
        WHERE errors > 0
        ORDER BY started_at DESC
        LIMIT 50
      `).all();
    } finally { db.close(); }
  });
}

// --- routes ---

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
  try {
    res.json({
      timestamp: new Date().toISOString(),
      activeJobs: getActiveJobs(),
      jobHistory: getJobHistory(),
      databasePulse: getDatabasePulse(),
      scraperHealth: getScraperHealth(),
      systemResources: getSystemResources(),
      cronSchedule: getCronSchedule(),
      recentErrors: getRecentErrors()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/jobs/active', (req, res) => {
  try { res.json(getActiveJobs()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/jobs/history', (req, res) => {
  try { res.json(getJobHistory()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/database/pulse', (req, res) => {
  try { res.json(getDatabasePulse()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scrapers/health', (req, res) => {
  try { res.json(getScraperHealth()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/system/resources', (req, res) => {
  try { res.json(getSystemResources()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cron/schedule', (req, res) => {
  try { res.json(getCronSchedule()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/errors/recent', (req, res) => {
  try { res.json(getRecentErrors()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenCLAW Mission Control running on http://0.0.0.0:${PORT}`);
});
