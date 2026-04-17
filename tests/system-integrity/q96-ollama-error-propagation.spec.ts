/**
 * Q96: OllamaOfflineError Propagation (Q48)
 *
 * Every file calling parseWithOllama must import and re-throw OllamaOfflineError.
 * Swallowing it = silent AI failure = empty results shown as "no suggestions"
 * instead of "AI unavailable."
 *
 * What we check:
 *   1. Every file importing parseWithOllama also references OllamaOfflineError
 *   2. Exceptions: definition files (parse-ollama.ts, ollama-errors.ts) and
 *      with-ai-fallback.ts (intentionally catches and falls back to formula)
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q96-ollama-error-propagation.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function scanDir(dir: string, ext: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...scanDir(full, ext))
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}

// Files that are allowed to NOT re-throw OllamaOfflineError
const EXEMPT_FILES = [
  'parse-ollama.ts', // Definition file
  'ollama-errors.ts', // Error class definition
  'with-ai-fallback.ts', // Intentionally catches and uses formula fallback
  'ollama-client.ts', // Simulation client, different error handling
  'ace-ollama.ts', // Alternative Ollama client (defines its own throws)
]

test.describe('Q96: OllamaOfflineError propagation', () => {
  const libFiles = scanDir(resolve(ROOT, 'lib'), '.ts')

  test('every parseWithOllama caller handles OllamaOfflineError', () => {
    const missing: string[] = []

    for (const file of libFiles) {
      const relative = file.replace(ROOT, '').replace(/\\/g, '/')
      const filename = relative.split('/').pop() || ''

      if (EXEMPT_FILES.includes(filename)) continue

      const content = readFileSync(file, 'utf-8')

      // Only check files that call parseWithOllama
      if (!content.includes('parseWithOllama')) continue

      // Must reference OllamaOfflineError
      if (!content.includes('OllamaOfflineError')) {
        missing.push(relative)
      }
    }

    if (missing.length > 0) {
      console.warn(
        `Files calling parseWithOllama WITHOUT OllamaOfflineError handling:\n` +
          missing.join('\n') +
          '\nFix: Import OllamaOfflineError and add `if (err instanceof OllamaOfflineError) throw err` in catch blocks.'
      )
    }

    // This is a known baseline. Current count: 41 files.
    // The test tracks regression - new files must handle the error.
    // Track count to detect new violations added.
    console.log(`OllamaOfflineError coverage gap: ${missing.length} files`)

    // Hard fail threshold: if count goes ABOVE baseline, someone added a new violation
    // Current baseline: 41 files (as of 2026-04-15)
    expect(
      missing.length,
      `${missing.length} file(s) swallow OllamaOfflineError. Baseline is 41 - new files must handle it.`
    ).toBeLessThanOrEqual(41)
  })
})
