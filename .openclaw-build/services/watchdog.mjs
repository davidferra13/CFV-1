/**
 * OpenClaw - Watchdog Service
 * Monitors all OpenClaw services and ensures they're running correctly.
 *
 * Responsibilities:
 *   1. Check if sync-api is responsive (HTTP health check)
 *   2. Check if receipt-processor is responsive
 *   3. Verify database integrity
 *   4. Check disk space on Pi
 *   5. Check if scrapers ran on schedule (via last_scraped_at)
 *   6. Monitor database size growth
 *   7. Log all findings to watchdog.log
 *   8. Auto-restart services that are down (via systemd)
 *
 * Runs every 15 minutes via cron.
 */

import { existsSync, statSync, appendFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, '..', 'logs');
const LOG_FILE = join(LOG_DIR, 'watchdog.log');
const DB_PATH = join(__dirname, '..', 'data', 'prices.db');

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n');
}

/**
 * Check if an HTTP endpoint is responding.
 */
async function checkHttp(name, url, timeoutMs = 5000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      log('OK', `${name} is healthy (${res.status})`);
      return true;
    }
    log('WARN', `${name} responded with ${res.status}`);
    return false;
  } catch (err) {
    log('ERROR', `${name} is DOWN: ${err.message}`);
    return false;
  }
}

/**
 * Check disk space on the Pi.
 */
function checkDiskSpace() {
  try {
    const df = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf8' }).trim();
    const usagePct = parseInt(df);
    if (usagePct > 90) {
      log('CRITICAL', `Disk usage: ${df} - RUNNING LOW`);
    } else if (usagePct > 75) {
      log('WARN', `Disk usage: ${df} - getting high`);
    } else {
      log('OK', `Disk usage: ${df}`);
    }
    return usagePct;
  } catch (err) {
    log('ERROR', `Failed to check disk space: ${err.message}`);
    return -1;
  }
}

/**
 * Check database integrity.
 */
function checkDatabase() {
  try {
    const db = getDb();

    // Quick integrity check
    const integrity = db.prepare('PRAGMA integrity_check').get();
    if (integrity.integrity_check === 'ok') {
      log('OK', 'Database integrity: OK');
    } else {
      log('CRITICAL', `Database integrity FAILED: ${integrity.integrity_check}`);
      return false;
    }

    // Check database size
    if (existsSync(DB_PATH)) {
      const sizeMB = statSync(DB_PATH).size / (1024 * 1024);
      if (sizeMB > 500) {
        log('WARN', `Database size: ${sizeMB.toFixed(1)} MB - consider running aggregator for data aging`);
      } else {
        log('OK', `Database size: ${sizeMB.toFixed(1)} MB`);
      }
    }

    // Check scraper freshness
    const sources = db.prepare(`
      SELECT source_id, name, last_scraped_at, scrape_failures_consecutive, status
      FROM source_registry
      ORDER BY last_scraped_at ASC
    `).all();

    const now = new Date();
    let staleCount = 0;

    for (const source of sources) {
      if (!source.last_scraped_at) {
        log('WARN', `${source.name}: Never scraped`);
        staleCount++;
        continue;
      }

      const lastScrape = new Date(source.last_scraped_at);
      const hoursSince = (now - lastScrape) / (1000 * 60 * 60);

      if (source.scrape_failures_consecutive > 3) {
        log('ERROR', `${source.name}: ${source.scrape_failures_consecutive} consecutive failures`);
      }

      // Per-source staleness thresholds
      // All retail sources scrape daily - alert after 26h (daily scrape + buffer)
      // Government data updates monthly - 720h
      // Flipp/flyer sources are weekly - 168h (7 days)
      let maxHours = 26;
      if (source.source_id.startsWith('gov-')) maxHours = 720;
      if (source.source_id.includes('flipp') || source.source_id.includes('flyer')) maxHours = 168;

      const level = source.source_id.startsWith('gov-') ? 'INFO' : hoursSince > 48 ? 'ERROR' : 'WARN';
      if (hoursSince > maxHours) {
        log(level, `${source.name}: Last scraped ${Math.round(hoursSince)}h ago (max: ${maxHours}h)`);
        staleCount++;
      }
    }

    if (staleCount === 0) {
      log('OK', `All ${sources.length} sources are fresh`);
    }

    // Quick stats
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM current_prices) as prices,
        (SELECT COUNT(*) FROM price_changes) as changes,
        (SELECT COUNT(*) FROM normalization_map) as mappings
    `).get();
    log('INFO', `DB stats: ${stats.prices} prices, ${stats.changes} changes, ${stats.mappings} mappings`);

    // Whole Foods specific: verify we have actual price data per region
    try {
      const wfRegions = db.prepare(
        "SELECT source_id, COUNT(*) as count FROM current_prices WHERE source_id LIKE 'whole-foods-%' GROUP BY source_id"
      ).all();
      if (wfRegions.length === 0) {
        log('ERROR', 'Whole Foods: 0 regions with prices');
      } else {
        for (const r of wfRegions) {
          if (r.count < 30) {
            log('WARN', `${r.source_id}: only ${r.count} prices (expected 40+)`);
          } else {
            log('OK', `${r.source_id}: ${r.count} active prices`);
          }
        }
      }
    } catch {
      // Table may not exist yet
    }

    return true;
  } catch (err) {
    log('CRITICAL', `Database check failed: ${err.message}`);
    return false;
  }
}

/**
 * Check memory usage.
 */
function checkMemory() {
  try {
    const memInfo = execSync("free -m | grep Mem | awk '{print $3, $2}'", { encoding: 'utf8' }).trim();
    const [used, total] = memInfo.split(' ').map(Number);
    const pct = Math.round((used / total) * 100);

    if (pct > 90) {
      log('CRITICAL', `Memory: ${used}MB/${total}MB (${pct}%) - VERY HIGH`);
    } else if (pct > 75) {
      log('WARN', `Memory: ${used}MB/${total}MB (${pct}%)`);
    } else {
      log('OK', `Memory: ${used}MB/${total}MB (${pct}%)`);
    }
    return pct;
  } catch (err) {
    log('ERROR', `Failed to check memory: ${err.message}`);
    return -1;
  }
}

/**
 * Check CPU temperature (Pi-specific).
 */
function checkCpuTemp() {
  try {
    const temp = execSync("cat /sys/class/thermal/thermal_zone0/temp", { encoding: 'utf8' }).trim();
    const tempC = parseInt(temp) / 1000;

    if (tempC > 80) {
      log('CRITICAL', `CPU temp: ${tempC}C - OVERHEATING`);
    } else if (tempC > 70) {
      log('WARN', `CPU temp: ${tempC}C - running hot`);
    } else {
      log('OK', `CPU temp: ${tempC}C`);
    }
    return tempC;
  } catch {
    // Not a Pi or thermal zone not available
    return -1;
  }
}

/**
 * Try to restart a systemd service if it's not running.
 */
function tryRestartService(serviceName) {
  try {
    const status = execSync(`systemctl is-active ${serviceName} 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (status === 'active') {
      log('OK', `Service ${serviceName}: active`);
      return true;
    }
    log('WARN', `Service ${serviceName}: ${status} - attempting restart`);
    execSync(`sudo systemctl restart ${serviceName}`);
    log('OK', `Service ${serviceName}: restarted`);
    return true;
  } catch (err) {
    // Service might not be set up via systemd yet
    log('INFO', `Service ${serviceName}: not managed by systemd (${err.message})`);
    return false;
  }
}

/**
 * Trim the watchdog log if it gets too large (keep last 1000 lines).
 */
function trimLog() {
  try {
    if (!existsSync(LOG_FILE)) return;
    const sizeMB = statSync(LOG_FILE).size / (1024 * 1024);
    if (sizeMB > 5) {
      execSync(`tail -1000 "${LOG_FILE}" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "${LOG_FILE}"`);
      log('INFO', 'Trimmed watchdog log (was >5MB)');
    }
  } catch {
    // Non-critical
  }
}

/**
 * Kill any scraper process that has been running longer than maxMinutes.
 * Pi has limited RAM (1GB); only one Puppeteer scraper at a time.
 * If a scraper hangs, it blocks all others.
 */
function killHungScrapers(maxMinutes = 30) {
  try {
    // Find node processes running scraper-*.mjs
    const ps = execSync(
      "ps -eo pid,etimes,args | grep 'scraper-.*\\.mjs' | grep -v grep",
      { encoding: 'utf8' }
    ).trim();

    if (!ps) return;

    for (const line of ps.split('\n')) {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
      if (!match) continue;

      const pid = parseInt(match[1]);
      const elapsedSec = parseInt(match[2]);
      const cmd = match[3];

      if (elapsedSec > maxMinutes * 60) {
        log('WARN', `Killing hung scraper (${Math.round(elapsedSec / 60)}min): PID ${pid} - ${cmd}`);
        try {
          execSync(`kill ${pid}`);
          log('OK', `Killed PID ${pid}`);
        } catch (err) {
          log('ERROR', `Failed to kill PID ${pid}: ${err.message}`);
        }
      }
    }
  } catch {
    // No scraper processes running, or ps failed
  }
}

async function main() {
  log('INFO', '=== Watchdog check started ===');

  // System checks
  checkDiskSpace();
  checkMemory();
  checkCpuTemp();

  // Service health checks
  await checkHttp('Sync API', 'http://localhost:8081/health');
  await checkHttp('Receipt Processor', 'http://localhost:8082/status');

  // Database checks
  checkDatabase();

  // Kill hung scrapers (Pi memory guard)
  killHungScrapers(30);

  // Service management (only if systemd services are configured)
  tryRestartService('openclaw-sync-api');
  tryRestartService('openclaw-receipt-processor');

  // Log management
  trimLog();

  log('INFO', '=== Watchdog check complete ===\n');
}

main().catch(err => {
  log('CRITICAL', `Watchdog crashed: ${err.message}`);
  process.exit(1);
});
