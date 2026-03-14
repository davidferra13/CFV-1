#!/usr/bin/env npx tsx
// Migration Script: parseWithOllama -> dispatchPrivate
//
// Performs the mechanical import swap across all files that directly
// import parseWithOllama outside the dispatch layer.
//
// What it does:
// 1. Replaces `import { parseWithOllama } from '...'` with `import { dispatchPrivate } from '@/lib/ai/dispatch'`
// 2. Replaces `await parseWithOllama(systemPrompt, userContent, schema, options)` with
//    `(await dispatchPrivate(systemPrompt, userContent, schema, { ...options })).result`
// 3. Skips files with non-standard parseWithOllama usage (cast as any, etc.)
//
// Usage: npx tsx scripts/migrate-to-dispatch.ts [--dry-run]
//
// This is a one-time migration tool. Delete it after migration is complete.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename_local = fileURLToPath(import.meta.url)
const __dirname_local = dirname(__filename_local)
const ROOT = join(__dirname_local, '..')

const DRY_RUN = process.argv.includes('--dry-run')

// Files to skip (non-standard usage, already migrated, or dispatch layer itself)
const SKIP_FILES = new Set([
  'lib/ai/dispatch/router.ts',
  'lib/ai/dispatch/index.ts',
  'lib/ai/dispatch/types.ts',
  'lib/ai/dispatch/classifier.ts',
  'lib/ai/dispatch/privacy-gate.ts',
  'lib/ai/dispatch/routing-table.ts',
  'lib/ai/dispatch/cost-tracker.ts',
  'lib/ai/parse-ollama.ts',
  'lib/ai/providers.ts',
  'lib/ai/ollama-errors.ts',
  'lib/ai/ollama-health.ts',
  'lib/ai/ollama-wake.ts',
  'lib/ai/ollama-cache.ts',
  'lib/ai/llm-router.ts',
  'lib/ai/with-ai-fallback.ts',
  'lib/ai/ai-metrics.ts',
  'lib/ai/parse-groq.ts',
  'lib/ai/parse-github-models.ts',
  'lib/ai/parse-workers-ai.ts',
  'lib/ai/gemini-service.ts',
  // Already migrated
  'lib/ai/allergen-risk.ts',
  'lib/ai/parse-inquiry.ts',
  'lib/ai/campaign-outreach.ts',
  // Non-standard usage (cast as any)
  'lib/prospecting/pipeline-actions.ts',
])

// Import patterns to detect
const IMPORT_PATTERNS = [/import\s*\{[^}]*parseWithOllama[^}]*\}\s*from\s*['"]([^'"]+)['"]/]

interface MigrationResult {
  file: string
  importSwapped: boolean
  callsWrapped: number
  skipped: boolean
  reason?: string
}

function walkDir(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          walkDir(fullPath, files)
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          files.push(fullPath)
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return files
}

function migrateFile(filePath: string): MigrationResult {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/')

  if (SKIP_FILES.has(rel)) {
    return {
      file: rel,
      importSwapped: false,
      callsWrapped: 0,
      skipped: true,
      reason: 'in skip list',
    }
  }

  let content = readFileSync(filePath, 'utf-8')

  // Check if file imports parseWithOllama
  const hasImport = IMPORT_PATTERNS.some((p) => p.test(content))
  if (!hasImport) {
    return {
      file: rel,
      importSwapped: false,
      callsWrapped: 0,
      skipped: true,
      reason: 'no parseWithOllama import',
    }
  }

  // Check for non-standard usage (cast as any)
  if (content.includes('parseWithOllama as any')) {
    return {
      file: rel,
      importSwapped: false,
      callsWrapped: 0,
      skipped: true,
      reason: 'non-standard usage (as any cast)',
    }
  }

  let importSwapped = false
  let callsWrapped = 0

  // Step 1: Replace import statement
  // Handle both relative and absolute imports
  // Also handle multi-import lines like `import { parseWithOllama, someOther } from '...'`
  const importRegex = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]*parse-ollama)['"]/g
  content = content.replace(importRegex, (match, imports: string, _path: string) => {
    const importNames = imports
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)

    if (importNames.length === 1 && importNames[0] === 'parseWithOllama') {
      // Simple case: only parseWithOllama imported
      importSwapped = true
      return `import { dispatchPrivate } from '@/lib/ai/dispatch'`
    }

    // Multiple imports - remove parseWithOllama, keep others
    const others = importNames.filter((n: string) => n !== 'parseWithOllama')
    importSwapped = true
    const otherImport = others.length > 0 ? `import { ${others.join(', ')} } from '${_path}'\n` : ''
    return `${otherImport}import { dispatchPrivate } from '@/lib/ai/dispatch'`
  })

  // Step 2: Replace parseWithOllama calls
  // Pattern: await parseWithOllama(systemPrompt, userContent, schema)
  // Pattern: await parseWithOllama(systemPrompt, userContent, schema, options)
  //
  // We need to wrap the result: (await dispatchPrivate(...)).result
  // But we need to handle different contexts:
  //   const result = await parseWithOllama(...)  -> const result = (await dispatchPrivate(..., { isPrivate: true })).result
  //   return await parseWithOllama(...)          -> return (await dispatchPrivate(..., { isPrivate: true })).result
  //   () => parseWithOllama(...)                 -> async () => (await dispatchPrivate(..., { isPrivate: true })).result

  // Replace all `parseWithOllama(` with `dispatchPrivate(` and add `.result` accessor
  // This is the tricky part - we need to find the matching closing paren

  // Simple approach: use a line-by-line scan
  const lines = content.split('\n')
  const newLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (line.includes('parseWithOllama(') && !line.includes('import')) {
      // Check if this is a simple single-line call
      // Pattern: "X = await parseWithOllama(...)" or "return await parseWithOllama(...)"
      // or "() => parseWithOllama(...)"

      // Replace parseWithOllama with dispatchPrivate
      line = line.replace(/parseWithOllama\(/g, () => {
        callsWrapped++
        return 'dispatchPrivate('
      })

      // Now we need to add .result to the awaited call
      // Find the pattern: await dispatchPrivate(...) and wrap it

      // For lines like: const x = await dispatchPrivate(...)
      // We need: const x = (await dispatchPrivate(...)).result
      if (line.includes('await dispatchPrivate(')) {
        // Check if the call ends on this line (has closing paren + possible semicolon/comma)
        const afterAwait = line.indexOf('await dispatchPrivate(')
        const beforeAwait = line.substring(0, afterAwait)

        // Count parens to find if call closes on this line
        let depth = 0
        let closeIndex = -1
        const searchFrom = afterAwait + 'await dispatchPrivate('.length
        for (let j = searchFrom; j < line.length; j++) {
          if (line[j] === '(') depth++
          if (line[j] === ')') {
            if (depth === 0) {
              closeIndex = j
              break
            }
            depth--
          }
        }

        if (closeIndex >= 0) {
          // Single-line call - wrap with .result
          const call = line.substring(afterAwait, closeIndex + 1)
          const after = line.substring(closeIndex + 1)
          line = `${beforeAwait}(${call}).result${after}`
        }
        // Multi-line calls are harder - we'll handle them with a second pass
      }

      // For arrow functions without await: () => parseWithOllama(...)
      // These become: async () => (await dispatchPrivate(...)).result
      if (line.includes('() => dispatchPrivate(') && !line.includes('await')) {
        line = line.replace('() => dispatchPrivate(', 'async () => (await dispatchPrivate(')
        // Find closing paren and add .result
        let depth = 0
        for (
          let j = line.indexOf('dispatchPrivate(') + 'dispatchPrivate('.length;
          j < line.length;
          j++
        ) {
          if (line[j] === '(') depth++
          if (line[j] === ')') {
            if (depth === 0) {
              line = line.substring(0, j + 1) + ').result' + line.substring(j + 1)
              break
            }
            depth--
          }
        }
      }
    }

    newLines.push(line)
  }

  content = newLines.join('\n')

  if (!DRY_RUN && (importSwapped || callsWrapped > 0)) {
    writeFileSync(filePath, content, 'utf-8')
  }

  return { file: rel, importSwapped, callsWrapped, skipped: false }
}

// ── Main ──
console.log(DRY_RUN ? '\n=== DRY RUN (no files modified) ===\n' : '\n=== MIGRATING ===\n')

const files = walkDir(ROOT)
const results: MigrationResult[] = []

for (const file of files) {
  const result = migrateFile(file)
  if (!result.skipped || result.reason !== 'no parseWithOllama import') {
    results.push(result)
  }
}

const migrated = results.filter((r) => !r.skipped)
const skipped = results.filter((r) => r.skipped)

if (migrated.length > 0) {
  console.log('Migrated files:')
  for (const r of migrated) {
    console.log(
      `  ${r.file} (import: ${r.importSwapped ? 'yes' : 'no'}, calls wrapped: ${r.callsWrapped})`
    )
  }
}

if (skipped.length > 0) {
  console.log('\nSkipped files:')
  for (const r of skipped) {
    console.log(`  ${r.file} (${r.reason})`)
  }
}

console.log(`\nTotal: ${migrated.length} migrated, ${skipped.length} skipped`)
const totalCalls = migrated.reduce((sum, r) => sum + r.callsWrapped, 0)
console.log(`Total parseWithOllama calls wrapped: ${totalCalls}`)
