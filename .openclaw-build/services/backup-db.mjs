/**
 * OpenClaw - Database Backup Service
 * Nightly backup of prices.db to local timestamped files + SCP to ChefFlow server.
 *
 * Keeps last 7 days on Pi. Keeps last 7 days on ChefFlow.
 * File size: ~5MB. Storage cost: zero.
 *
 * Cron: 0 1 * * * node services/backup-db.mjs >> logs/backup.log 2>&1
 */

import { copyFileSync, readdirSync, unlinkSync, mkdirSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'prices.db');
const BACKUP_DIR = join(__dirname, '..', 'backups');
const LOG_DIR = join(__dirname, '..', 'logs');

// ChefFlow server backup target (SCP over local network)
const CHEFFLOW_HOST = process.env.CHEFFLOW_BACKUP_HOST || '10.0.0.100';
const CHEFFLOW_USER = process.env.CHEFFLOW_BACKUP_USER || 'david';
const CHEFFLOW_BACKUP_PATH = process.env.CHEFFLOW_BACKUP_PATH || '/c/Users/david/Documents/CFv1/data/openclaw-backups';

const MAX_BACKUPS = 7;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getDateStamp() {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Remove old backups, keeping only the most recent MAX_BACKUPS files.
 */
function pruneBackups(dir, prefix = 'prices-') {
  try {
    const files = readdirSync(dir)
      .filter(f => f.startsWith(prefix) && f.endsWith('.db'))
      .sort()
      .reverse();

    for (let i = MAX_BACKUPS; i < files.length; i++) {
      const fullPath = join(dir, files[i]);
      unlinkSync(fullPath);
      log(`Pruned old backup: ${files[i]}`);
    }
  } catch (err) {
    log(`Warning: prune failed for ${dir}: ${err.message}`);
  }
}

/**
 * SCP the backup file to ChefFlow server.
 */
function scpToChefFlow(localPath, filename) {
  try {
    const remotePath = `${CHEFFLOW_USER}@${CHEFFLOW_HOST}:${CHEFFLOW_BACKUP_PATH}/${filename}`;
    execSync(`scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no "${localPath}" "${remotePath}"`, {
      encoding: 'utf8',
      timeout: 60000,
    });
    log(`SCP success: ${filename} -> ${CHEFFLOW_HOST}`);
    return true;
  } catch (err) {
    log(`SCP failed: ${err.message}`);
    log('Backup exists locally. Will retry on next run.');
    return false;
  }
}

async function main() {
  log('=== OpenClaw Database Backup ===');

  // Verify source database exists
  if (!existsSync(DB_PATH)) {
    log('ERROR: prices.db not found at ' + DB_PATH);
    process.exit(1);
  }

  const dbSize = statSync(DB_PATH).size;
  log(`Source DB: ${DB_PATH} (${(dbSize / 1024 / 1024).toFixed(2)} MB)`);

  // Ensure backup directory
  ensureDir(BACKUP_DIR);
  ensureDir(LOG_DIR);

  // Create timestamped backup
  const dateStamp = getDateStamp();
  const backupFilename = `prices-${dateStamp}.db`;
  const backupPath = join(BACKUP_DIR, backupFilename);

  try {
    copyFileSync(DB_PATH, backupPath);
    const backupSize = statSync(backupPath).size;
    log(`Local backup created: ${backupFilename} (${(backupSize / 1024 / 1024).toFixed(2)} MB)`);
  } catch (err) {
    log(`ERROR: Failed to create local backup: ${err.message}`);
    process.exit(1);
  }

  // Prune old local backups
  pruneBackups(BACKUP_DIR);

  // SCP to ChefFlow server
  scpToChefFlow(backupPath, backupFilename);

  // List current backups
  const backups = readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('prices-') && f.endsWith('.db'))
    .sort()
    .reverse();
  log(`Local backups (${backups.length}): ${backups.join(', ')}`);

  log('=== Backup complete ===');
}

main().catch(err => {
  log(`CRITICAL: Backup script crashed: ${err.message}`);
  process.exit(1);
});
