#!/usr/bin/env npx tsx
// Second-pass migration: fix multi-line dispatchPrivate calls
//
// The first migration script only handled single-line calls.
// This script finds multi-line `await dispatchPrivate(...)` calls
// that are missing `.result` and adds it.
//
// Usage: npx tsx scripts/migrate-multiline-fix.ts [--dry-run]

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename_local = fileURLToPath(import.meta.url)
const __dirname_local = dirname(__filename_local)
const ROOT = join(__dirname_local, '..')
const DRY_RUN = process.argv.includes('--dry-run')

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dispatch'])

function walkDir(dir: string, files: string[] = []): string[] {
  try {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) walkDir(fullPath, files)
        else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) files.push(fullPath)
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return files
}

let totalFixed = 0

for (const filePath of walkDir(ROOT)) {
  let content = readFileSync(filePath, 'utf-8')
  if (!content.includes('await dispatchPrivate(')) continue
  if (content.includes('dispatch/')) continue // skip dispatch layer

  const rel = relative(ROOT, filePath).replace(/\\/g, '/')

  // Find all positions of "await dispatchPrivate(" that are NOT already followed by ".result"
  let modified = false
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const idx = line.indexOf('await dispatchPrivate(')
    if (idx === -1) continue

    // Check if this line already has .result (single-line call handled by first pass)
    if (line.includes('.result')) continue

    // Check if the result is already destructured: const { result } = await dispatchPrivate(...)
    // These don't need .result appended - they already extract it
    if (line.includes('{ result }') || line.includes('{result}')) continue

    // Check if the call closes on THIS line
    let depth = 0
    let closedOnThisLine = false
    const searchStart = idx + 'await dispatchPrivate('.length
    for (let j = searchStart; j < line.length; j++) {
      if (line[j] === '(') depth++
      if (line[j] === ')') {
        if (depth === 0) {
          closedOnThisLine = true
          break
        }
        depth--
      }
    }

    if (closedOnThisLine) {
      // Should have been handled by first pass - but wasn't (maybe nested parens confused it)
      // Find the exact closing paren
      depth = 0
      for (let j = searchStart; j < line.length; j++) {
        if (line[j] === '(') depth++
        if (line[j] === ')') {
          if (depth === 0) {
            // Insert .result after the closing paren
            // But we also need to wrap the whole await expression in parens
            const beforeAwait = line.substring(0, idx)
            const awaitCall = line.substring(idx, j + 1)
            const afterCall = line.substring(j + 1)
            lines[i] = `${beforeAwait}(${awaitCall}).result${afterCall}`
            modified = true
            totalFixed++
            break
          }
          depth--
        }
      }
      continue
    }

    // Multi-line call: find the closing paren on a subsequent line
    // Track depth starting from the opening paren
    depth = 0
    let found = false
    for (let k = i; k < lines.length && !found; k++) {
      const startCol = k === i ? searchStart : 0
      for (let j = startCol; j < lines[k].length; j++) {
        if (lines[k][j] === '(') depth++
        if (lines[k][j] === ')') {
          if (depth === 0) {
            // Found the closing paren on line k, column j
            // Add .result after it
            const before = lines[k].substring(0, j + 1)
            const after = lines[k].substring(j + 1)

            // Also wrap the await expression: need ( before "await"
            const awaitLine = lines[i]
            const beforeAwait = awaitLine.substring(0, idx)
            lines[i] = `${beforeAwait}(${awaitLine.substring(idx)}`
            lines[k] = `${before}).result${after}`

            modified = true
            totalFixed++
            found = true
            break
          }
          depth--
        }
      }
    }
  }

  if (modified) {
    const newContent = lines.join('\n')
    console.log(`  Fixed: ${rel}`)
    if (!DRY_RUN) {
      writeFileSync(filePath, newContent, 'utf-8')
    }
  }
}

console.log(`\nTotal multi-line calls fixed: ${totalFixed}`)
if (DRY_RUN) console.log('(dry run - no files modified)')
