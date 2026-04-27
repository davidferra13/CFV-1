#!/usr/bin/env bash
# ============================================================================
# ChefFlow Dead Import Detector
# ============================================================================
# Scans all .ts/.tsx files under app/ and lib/ for import statements that
# point to non-existent files. Common regression when parallel agents delete
# or move files without updating all consumers.
#
# Resolves:
#   - @/ alias imports (maps to project root)
#   - Relative imports (../, ./)
#   - Extension probing (.ts, .tsx, /index.ts, /index.tsx)
#
# Usage:
#   bash scripts/regression-dead-imports.sh
#
# Exit codes: 0 = clean, 1 = dead imports found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

node -e "
const fs = require('fs');
const path = require('path');

const root = process.argv[1];
const scanDirs = ['app', 'lib'];

// Collect all .ts/.tsx files from scan dirs
function walk(dir) {
  let results = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // skip non-source dirs
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
      results = results.concat(walk(full));
    } else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      results.push(full);
    }
  }
  return results;
}

// Check if a resolved import target exists (with extension probing)
function resolveImport(importPath, importerDir) {
  // If importPath starts with @/, resolve from project root
  let resolved;
  if (importPath.startsWith('@/')) {
    resolved = path.join(root, importPath.slice(2));
  } else if (importPath.startsWith('.')) {
    resolved = path.join(importerDir, importPath);
  } else {
    // bare specifier (npm package) -- skip
    return true;
  }

  // Normalize to forward slashes then back for Windows compat
  resolved = path.normalize(resolved);

  // Extension probing order
  const probes = [
    resolved,
    resolved + '.ts',
    resolved + '.tsx',
    resolved + '.js',
    resolved + '.jsx',
    resolved + '.json',
    path.join(resolved, 'index.ts'),
    path.join(resolved, 'index.tsx'),
    path.join(resolved, 'index.js'),
  ];

  for (const p of probes) {
    try {
      if (fs.statSync(p).isFile()) return true;
    } catch {}
  }
  return false;
}

// Regex to capture import paths from:
//   import X from 'path'
//   import 'path'
//   import { X } from 'path'
//   export { X } from 'path'
//   export * from 'path'
// Skips dynamic imports and require() (different beast)
const importRe = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g;

let broken = [];
let scanned = 0;

for (const dir of scanDirs) {
  const absDir = path.join(root, dir);
  if (!fs.existsSync(absDir)) continue;
  const files = walk(absDir);
  for (const file of files) {
    scanned++;
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const importerDir = path.dirname(file);
    let match;
    importRe.lastIndex = 0;

    // Reset and re-run for each file
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m;
      const lineRe = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g;
      while ((m = lineRe.exec(line)) !== null) {
        const importPath = m[1];
        // Only check local imports (@ alias or relative)
        if (!importPath.startsWith('@/') && !importPath.startsWith('.')) continue;
        if (!resolveImport(importPath, importerDir)) {
          const relFile = path.relative(root, file).replace(/\\\\/g, '/');
          broken.push({ file: relFile, target: importPath });
        }
      }
    }
  }
}

// Output
console.log('');
console.log('[DEAD IMPORTS]');
if (broken.length === 0) {
  console.log('  No dead imports found (' + scanned + ' files scanned)');
  console.log('');
  process.exit(0);
} else {
  for (const b of broken) {
    console.log('  BROKEN  ' + b.file + ' -> ' + b.target);
  }
  console.log('');
  console.log('  ' + broken.length + ' dead import' + (broken.length === 1 ? '' : 's') + ' found');
  console.log('');
  process.exit(1);
}
" "$PROJECT_ROOT"
