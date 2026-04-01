/**
 * Patch: Add --session-file override to both Instacart walkers
 *
 * After this patch, walkers accept:
 *   node instacart-department-walker.mjs market-basket --session-file ../data/sessions/session-10001.json
 *
 * If --session-file is provided, it loads that file instead of the default captured-session.json.
 * This enables multi-zip operation: different session cookies per geographic region.
 *
 * Run on Pi: node patch-session-override.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function patchWalker(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const original = content;

  // Already patched?
  if (content.includes('--session-file')) {
    console.log(`Already patched: ${filePath}`);
    return false;
  }

  // 1. Add session file arg parsing after the existing args parsing
  // Find the loadSession() call in main() and add override logic
  const loadSessionCall = "const session = loadSession();";
  if (!content.includes(loadSessionCall)) {
    console.log(`Could not find loadSession() call in ${filePath}`);
    return false;
  }

  const sessionOverride = `// Check for --session-file override (multi-zip support)
  const sessionFileIdx = args.indexOf('--session-file');
  let session;
  if (sessionFileIdx > -1 && args[sessionFileIdx + 1]) {
    const sessionPath = args[sessionFileIdx + 1];
    try {
      const { readFileSync: rfs } = await import('fs');
      const { resolve } = await import('path');
      const absPath = resolve(sessionPath);
      session = JSON.parse(rfs(absPath, 'utf8'));
      console.log('[session] Loaded override: ' + absPath);
      if (session.zip) console.log('[session] Zip: ' + session.zip + ' (' + session.metro + ', ' + session.state + ')');
    } catch (e) {
      console.error('Failed to load session file: ' + sessionPath, e.message);
      process.exit(1);
    }
  } else {
    session = loadSession();
  }`;

  content = content.replace(
    loadSessionCall,
    sessionOverride
  );

  // 2. Update usage line to show new option
  content = content.replace(
    /Usage: node .+\.mjs <slug> \[lat\] \[lng\]/,
    (match) => match + ' [--session-file <path>]'
  );

  if (content !== original) {
    writeFileSync(filePath, content);
    console.log('Patched: ' + filePath);
    return true;
  }
  console.log('No changes needed: ' + filePath);
  return false;
}

// Patch both walkers
const servicesDir = join(__dirname, 'services');
const deptWalker = join(servicesDir, 'instacart-department-walker.mjs');
const catWalker = join(servicesDir, 'instacart-catalog-walker.mjs');

console.log('=== Patching walkers for --session-file support ===');
patchWalker(deptWalker);
patchWalker(catWalker);
console.log('Done.');
