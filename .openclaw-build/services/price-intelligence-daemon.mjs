/**
 * OpenClaw - Price Intelligence Daemon
 *
 * The central orchestrator for all data acquisition. Runs 24/7 on the Pi.
 * Manages multiple scrapers, monitors health, self-heals on failure,
 * and adapts strategy when sources get blocked.
 *
 * Principle: No single point of failure. Every chain has multiple data
 * acquisition paths. If one fails, the system degrades gracefully.
 *
 * Usage:
 *   node services/price-intelligence-daemon.mjs
 *
 * Strategies (in priority order):
 *   1. Official APIs (Kroger, USDA) - highest reliability, zero blocking risk
 *   2. Structured APIs (Flipp, Amazon/WF) - low blocking risk
 *   3. Website scraping (Instacart) - moderate blocking risk, used surgically
 *   4. Receipt processing - zero blocking risk, sparse data
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATUS_FILE = join(__dirname, '..', 'data', 'daemon-status.json');

// ── SCRAPER REGISTRY ──
// Each scraper has: id, script, schedule, strategy tier, health tracking

const SCRAPERS = [
  {
    id: 'kroger-api',
    script: 'services/scraper-kroger-api.mjs',
    name: 'Kroger Official API',
    tier: 1,
    interval_hours: 24, // once per day (5K calls/day limit)
    requires_env: ['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET'],
    enabled: true,
  },
  {
    id: 'flipp-nationwide',
    script: 'services/scraper-flipp.mjs',
    name: 'Flipp Weekly Ads (Nationwide)',
    tier: 2,
    interval_hours: 168, // weekly (ads change weekly)
    requires_env: [],
    enabled: true,
  },
  {
    id: 'wholefoods-nationwide',
    script: 'services/scraper-wholefoodsapfresh.mjs',
    name: 'Whole Foods (Amazon ALM)',
    tier: 2,
    interval_hours: 72, // every 3 days
    requires_env: [],
    enabled: true,
  },
  {
    id: 'instacart-nationwide',
    script: 'services/scraper-instacart-bulk.mjs',
    name: 'Instacart (Nationwide)',
    tier: 3,
    interval_hours: 168, // weekly (if not blocked)
    requires_env: [],
    enabled: false, // disabled until captcha resolved
  },
];

// ── STATE ──

let scraperStatus = {};

function loadStatus() {
  try {
    if (existsSync(STATUS_FILE)) {
      scraperStatus = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
    }
  } catch {}
}

function saveStatus() {
  try {
    writeFileSync(STATUS_FILE, JSON.stringify({
      ...scraperStatus,
      daemon_heartbeat: new Date().toISOString(),
    }, null, 2));
  } catch {}
}

function getScraperState(id) {
  if (!scraperStatus[id]) {
    scraperStatus[id] = {
      last_run: null,
      last_success: null,
      last_failure: null,
      consecutive_failures: 0,
      total_runs: 0,
      status: 'idle',
    };
  }
  return scraperStatus[id];
}

// ── EXECUTION ──

function shouldRun(scraper) {
  if (!scraper.enabled) return false;

  // Check environment requirements
  for (const env of scraper.requires_env) {
    if (!process.env[env]) {
      return false;
    }
  }

  const state = getScraperState(scraper.id);

  // Never run if currently running
  if (state.status === 'running') return false;

  // Back off on consecutive failures (exponential)
  if (state.consecutive_failures >= 3) {
    const backoffHours = Math.min(state.consecutive_failures * 24, 168); // max 1 week
    const hoursSinceFailure = state.last_failure
      ? (Date.now() - new Date(state.last_failure).getTime()) / (1000 * 60 * 60)
      : Infinity;
    if (hoursSinceFailure < backoffHours) return false;
  }

  // Check interval
  if (!state.last_run) return true;
  const hoursSinceRun = (Date.now() - new Date(state.last_run).getTime()) / (1000 * 60 * 60);
  return hoursSinceRun >= scraper.interval_hours;
}

function runScraper(scraper) {
  return new Promise((resolve) => {
    const state = getScraperState(scraper.id);
    state.status = 'running';
    state.last_run = new Date().toISOString();
    state.total_runs++;
    saveStatus();

    log(`Starting: ${scraper.name} (tier ${scraper.tier})`);

    const child = spawn('node', [scraper.script], {
      cwd: join(__dirname, '..'),
      timeout: 4 * 60 * 60 * 1000, // 4 hour max per scraper run
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        state.status = 'idle';
        state.last_success = new Date().toISOString();
        state.consecutive_failures = 0;
        log(`  Success: ${scraper.name}`);
      } else {
        state.status = 'failed';
        state.last_failure = new Date().toISOString();
        state.consecutive_failures++;
        log(`  FAILED: ${scraper.name} (exit ${code}, failures: ${state.consecutive_failures})`);
        if (stderr) {
          const lastLine = stderr.trim().split('\n').pop();
          log(`    Error: ${lastLine}`);
        }
      }
      saveStatus();
      resolve(code === 0);
    });

    child.on('error', (err) => {
      state.status = 'failed';
      state.last_failure = new Date().toISOString();
      state.consecutive_failures++;
      log(`  ERROR: ${scraper.name}: ${err.message}`);
      saveStatus();
      resolve(false);
    });
  });
}

// ── MAIN LOOP ──

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function tick() {
  loadStatus();

  for (const scraper of SCRAPERS) {
    if (shouldRun(scraper)) {
      await runScraper(scraper);
    }
  }

  saveStatus();
}

async function main() {
  log('=== Price Intelligence Daemon ===');
  log(`Registered scrapers: ${SCRAPERS.length}`);
  for (const s of SCRAPERS) {
    const envOk = s.requires_env.every(e => process.env[e]);
    log(`  [${s.enabled ? 'ON' : 'OFF'}] ${s.name} (tier ${s.tier}, every ${s.interval_hours}h)${!envOk && s.requires_env.length ? ' [MISSING ENV]' : ''}`);
  }

  // Run immediately, then check every 30 minutes
  await tick();

  setInterval(async () => {
    await tick();
  }, 30 * 60 * 1000);

  log('Daemon running. Checking every 30 minutes. Ctrl+C to stop.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
