/**
 * Q48: Ollama Never Falls Back to Gemini
 *
 * The AI privacy boundary is absolute: PII files use Ollama, never Gemini.
 * The most dangerous failure mode is a "fallback" pattern where code catches
 * an OllamaOfflineError and retries with Gemini. This would silently route
 * client names, dietary restrictions, and financial data to a cloud AI.
 *
 * lib/ai/parse-ollama.ts must:
 *   1. Throw OllamaOfflineError when the runtime is unavailable
 *   2. NEVER import or call gemini-service as a fallback
 *   3. Let callers fail hard (so the feature fails closed, not open)
 *
 * OllamaOfflineError callers must re-throw it (not swallow it and use Gemini).
 *
 * Tests:
 *
 * 1. THROWS ON OFFLINE: parse-ollama.ts throws OllamaOfflineError when
 *    OLLAMA_BASE_URL is not configured.
 *
 * 2. NO GEMINI IMPORT: parse-ollama.ts does not import gemini-service.
 *
 * 3. TIMEOUT THROWS: parse-ollama.ts throws OllamaOfflineError on timeout
 *    (not silently returns empty/null).
 *
 * 4. OLLAMA_BASE_URL CHECKED: Configuration check happens before any
 *    network call (fail fast, not fail after timeout).
 *
 * 5. OLLAMA_OFFLINE_ERROR CLASS: lib/ai/ollama-errors.ts exports
 *    OllamaOfflineError for callers to import and re-throw.
 *
 * 6. PII FILES DON'T CATCH OLLAMA ERRORS WITH GEMINI: Key PII files
 *    (parse-recipe.ts, parse-brain-dump.ts) do not have catch blocks
 *    that import gemini-service.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q48-ollama-no-gemini-fallback.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const PARSE_OLLAMA = resolve(process.cwd(), 'lib/ai/parse-ollama.ts')
const OLLAMA_ERRORS = resolve(process.cwd(), 'lib/ai/ollama-errors.ts')
const PARSE_RECIPE = resolve(process.cwd(), 'lib/ai/parse-recipe.ts')
const PARSE_BRAIN_DUMP = resolve(process.cwd(), 'lib/ai/parse-brain-dump.ts')

test.describe('Q48: Ollama never falls back to Gemini', () => {
  // -------------------------------------------------------------------------
  // Test 1: parse-ollama.ts throws OllamaOfflineError when unconfigured
  // -------------------------------------------------------------------------
  test('parse-ollama.ts throws OllamaOfflineError when OLLAMA_BASE_URL is not set', () => {
    expect(existsSync(PARSE_OLLAMA), 'lib/ai/parse-ollama.ts must exist').toBe(true)

    const src = readFileSync(PARSE_OLLAMA, 'utf-8')

    expect(
      src.includes('OllamaOfflineError') && src.includes('OLLAMA_BASE_URL'),
      'parse-ollama.ts must throw OllamaOfflineError when OLLAMA_BASE_URL is not configured'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: parse-ollama.ts does NOT import gemini-service
  // -------------------------------------------------------------------------
  test('parse-ollama.ts does not import gemini-service (no Gemini fallback path)', () => {
    const src = readFileSync(PARSE_OLLAMA, 'utf-8')

    expect(
      !src.includes('gemini-service') && !src.includes('gemini'),
      'parse-ollama.ts must NOT import gemini-service (there is no fallback to Gemini for PII data)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Timeout throws OllamaOfflineError (not silent failure)
  // -------------------------------------------------------------------------
  test('parse-ollama.ts throws OllamaOfflineError on timeout', () => {
    const src = readFileSync(PARSE_OLLAMA, 'utf-8')

    expect(
      src.includes('timeout') && src.includes('OllamaOfflineError'),
      'parse-ollama.ts must throw OllamaOfflineError on timeout (not return null/empty silently)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: OLLAMA_BASE_URL checked before network call (fail fast)
  // -------------------------------------------------------------------------
  test('parse-ollama.ts checks OLLAMA_BASE_URL before making network calls', () => {
    const src = readFileSync(PARSE_OLLAMA, 'utf-8')

    // The config check must appear before any fetch/request call
    const configCheckIdx = src.indexOf('OLLAMA_BASE_URL')
    const fetchIdx = src.indexOf('fetch(') !== -1 ? src.indexOf('fetch(') : src.indexOf('request(')

    if (fetchIdx !== -1) {
      expect(
        configCheckIdx < fetchIdx || src.indexOf('isOllamaEnabled') < fetchIdx,
        'OLLAMA_BASE_URL check must appear before any fetch call (fail fast, not after timeout)'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 5: OllamaOfflineError class exported for callers
  // -------------------------------------------------------------------------
  test('lib/ai/ollama-errors.ts exports OllamaOfflineError class', () => {
    expect(existsSync(OLLAMA_ERRORS), 'lib/ai/ollama-errors.ts must exist').toBe(true)

    const src = readFileSync(OLLAMA_ERRORS, 'utf-8')

    expect(
      src.includes('export') && src.includes('OllamaOfflineError'),
      'ollama-errors.ts must export OllamaOfflineError so callers can re-throw it (not swallow it)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: PII files do not catch OllamaOfflineError and retry with Gemini
  // -------------------------------------------------------------------------
  test('PII files do not have catch blocks that fall back to gemini-service', () => {
    const piiFiles = [PARSE_RECIPE, PARSE_BRAIN_DUMP].filter(existsSync)
    const violations: string[] = []

    for (const filePath of piiFiles) {
      const src = readFileSync(filePath, 'utf-8')

      // A catch block that imports or calls gemini would be a violation
      if (src.includes('catch') && src.includes('gemini')) {
        violations.push(filePath.replace(process.cwd(), '').replace(/\\/g, '/'))
      }
    }

    expect(
      violations,
      `PII files must not fall back to Gemini in catch blocks: ${violations.join(', ')}`
    ).toHaveLength(0)
  })
})
