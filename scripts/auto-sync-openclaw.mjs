/**
 * OpenClaw Auto-Sync
 *
 * Runs sync-all.mjs on a schedule. Designed to run as a background
 * process on the PC (or via Task Scheduler / cron).
 *
 * Default: syncs every 4 hours. The Pi scrapes continuously;
 * this pulls new data into ChefFlow's PostgreSQL.
 *
 * Usage:
 *   node scripts/auto-sync-openclaw.mjs              # run once
 *   node scripts/auto-sync-openclaw.mjs --daemon      # run every 4 hours
 *   node scripts/auto-sync-openclaw.mjs --interval 2  # run every 2 hours
 *
 * Can also be set up as a Windows Task Scheduler task:
 *   Action: node
 *   Arguments: C:\Users\david\Documents\CFv1\scripts\auto-sync-openclaw.mjs
 *   Trigger: Every 4 hours
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const SYNC_SCRIPT = join(__dirname, 'openclaw-pull', 'sync-all.mjs');
const STATUS_FILE = join(PROJECT_ROOT, 'docs', 'sync-status.json');

const args = process.argv.slice(2);
const isDaemon = args.includes('--daemon');
const intervalHours = parseInt(args.find(a => a.startsWith('--interval'))?.split('=')[1] || args[args.indexOf('--interval') + 1] || '4');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function updateStatus(status) {
  try {
    const data = {
      last_sync: new Date().toISOString(),
      status,
      next_sync: isDaemon ? new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString() : null,
      interval_hours: isDaemon ? intervalHours : null,
    };
    writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

async function runSync() {
  log(`Starting OpenClaw -> ChefFlow sync...`);
  const start = Date.now();

  try {
    const output = execSync(`node "${SYNC_SCRIPT}"`, {
      cwd: PROJECT_ROOT,
      timeout: 10 * 60 * 1000, // 10 minute timeout
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`Sync complete in ${elapsed}s`);

    // Extract key stats from output
    const lines = output.split('\n');
    const statsLine = lines.find(l => l.includes('synced') || l.includes('Sync complete') || l.includes('prices'));
    if (statsLine) log(`  ${statsLine.trim()}`);

    updateStatus('success');
    return true;
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`Sync FAILED after ${elapsed}s: ${err.message}`);
    updateStatus('failed');
    return false;
  }
}

async function main() {
  if (!isDaemon) {
    // Single run
    await runSync();
    return;
  }

  // Daemon mode
  log(`Auto-sync daemon started. Interval: ${intervalHours}h`);
  log(`Sync script: ${SYNC_SCRIPT}`);
  log(`Status file: ${STATUS_FILE}`);

  // Run immediately on start
  await runSync();

  // Then schedule
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(async () => {
    await runSync();
  }, intervalMs);

  log(`Next sync in ${intervalHours} hours. Press Ctrl+C to stop.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
