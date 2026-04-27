#!/usr/bin/env node
/**
 * Regression Watcher - monitors critical files for deletion or export removal.
 * Reads scripts/regression-registry.json, polls every 5s via fs.watchFile.
 * Zero npm dependencies.
 */

import { readFileSync, existsSync, watchFile, unwatchFile, appendFileSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const REGISTRY_PATH = join(ROOT, 'scripts', 'regression-registry.json');
const LOG_PATH = join(ROOT, 'scripts', '.watcher-alerts.log');

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function log(msg) {
  const line = `[WATCHER] ${ts()} ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_PATH, line + '\n'); } catch {}
}

function loadRegistry() {
  const raw = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));

  // Collect all files to watch + metadata
  const watched = new Map(); // relPath -> { group, exports[] }

  // routes (page.tsx files)
  for (const [group, files] of Object.entries(raw.routes)) {
    if (group === '_doc') continue;
    for (const f of files) {
      watched.set(f, { group: `route/${group}`, exports: [] });
    }
  }

  // api_routes
  for (const [group, files] of Object.entries(raw.api_routes)) {
    if (group === '_doc') continue;
    for (const f of files) {
      watched.set(f, { group: `api/${group}`, exports: [] });
    }
  }

  // server_actions (file -> required exports)
  for (const [file, fns] of Object.entries(raw.server_actions)) {
    if (file === '_doc') continue;
    watched.set(file, { group: 'server_action', exports: [...fns] });
  }

  // critical_files
  for (const [group, files] of Object.entries(raw.critical_files)) {
    if (group === '_doc') continue;
    for (const f of files) {
      if (!watched.has(f)) {
        watched.set(f, { group: `critical/${group}`, exports: [] });
      }
    }
  }

  // critical_exports (merge into existing entries or create new)
  for (const [file, exports] of Object.entries(raw.critical_exports)) {
    if (file === '_doc') continue;
    const existing = watched.get(file);
    if (existing) {
      existing.exports = [...new Set([...existing.exports, ...exports])];
    } else {
      watched.set(file, { group: 'critical_export', exports: [...exports] });
    }
  }

  return watched;
}

function checkExports(absPath, requiredExports) {
  if (requiredExports.length === 0) return [];
  let content;
  try {
    content = readFileSync(absPath, 'utf-8');
  } catch {
    return []; // file unreadable, deletion alert handles this
  }

  const missing = [];
  for (const name of requiredExports) {
    // Match: export function name, export async function name,
    //        export const name, export { name }, export class name
    const patterns = [
      new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b`),
      new RegExp(`export\\s+(const|let|var)\\s+${name}\\b`),
      new RegExp(`export\\s+class\\s+${name}\\b`),
      new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`),
    ];
    const found = patterns.some(p => p.test(content));
    if (!found) missing.push(name);
  }
  return missing;
}

// --- Main ---

const watched = loadRegistry();
const fileState = new Map(); // absPath -> { existed: bool }

console.log(`[WATCHER] ${ts()} Regression watcher starting`);
console.log(`[WATCHER] ${ts()} Monitoring ${watched.size} critical files (polling every 5s)`);
console.log(`[WATCHER] ${ts()} Alerts logged to: scripts/.watcher-alerts.log`);
console.log(`[WATCHER] ${ts()} Press Ctrl+C to stop`);
console.log('');

// Initial scan
let initialMissing = 0;
for (const [relPath, meta] of watched) {
  const absPath = join(ROOT, relPath);
  const exists = existsSync(absPath);
  fileState.set(relPath, { existed: exists });

  if (!exists) {
    log(`STARTUP WARNING: ${relPath} MISSING (${meta.group} group)`);
    initialMissing++;
  } else if (meta.exports.length > 0) {
    const missing = checkExports(absPath, meta.exports);
    if (missing.length > 0) {
      log(`STARTUP WARNING: ${relPath} missing exports: ${missing.join(', ')}`);
    }
  }
}

if (initialMissing > 0) {
  console.log(`\n[WATCHER] ${ts()} ${initialMissing} file(s) already missing at startup\n`);
} else {
  console.log(`[WATCHER] ${ts()} All critical files present. Watching...\n`);
}

// Set up polling watchers
for (const [relPath, meta] of watched) {
  const absPath = join(ROOT, relPath);

  watchFile(absPath, { interval: 5000 }, (curr, prev) => {
    const exists = curr.mtimeMs > 0 && curr.size > 0 && curr.nlink > 0;
    const state = fileState.get(relPath);

    if (!exists && state.existed) {
      // File was deleted
      log(`ALERT: ${relPath} DELETED`);
      log(`  This is a critical file (${meta.group} group)`);
      log(`  Recovery: bash scripts/regression-recover.sh --recover ${relPath}`);
      state.existed = false;
    } else if (exists && !state.existed) {
      // File was restored
      log(`RESTORED: ${relPath} is back`);
      state.existed = true;
      // Check exports on restore
      if (meta.exports.length > 0) {
        const missing = checkExports(absPath, meta.exports);
        if (missing.length > 0) {
          log(`  ALERT: restored but missing exports: ${missing.join(', ')}`);
        } else {
          log(`  OK - all critical exports present`);
        }
      }
    } else if (exists && state.existed && curr.mtimeMs !== prev.mtimeMs) {
      // File was modified
      if (meta.exports.length > 0) {
        log(`MODIFIED: ${relPath} (checking exports...)`);
        const missing = checkExports(absPath, meta.exports);
        if (missing.length > 0) {
          for (const name of missing) {
            log(`  ALERT: export ${name}() no longer found!`);
          }
        } else {
          log(`  OK - all critical exports still present`);
        }
      }
      // For files without registered exports, silent on modify (too noisy)
    }
  });
}

// Graceful shutdown
function shutdown() {
  console.log(`\n[WATCHER] ${ts()} Shutting down...`);
  for (const [relPath] of watched) {
    const absPath = join(ROOT, relPath);
    try { unwatchFile(absPath); } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
