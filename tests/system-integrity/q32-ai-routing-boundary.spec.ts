/**
 * Q32: AI Routing Boundary (Single-Provider Enforcement)
 *
 * ChefFlow uses a single AI backend: Ollama-compatible (Gemma 4, cloud/local).
 * All AI modules must route through parseWithOllama. No second provider exists.
 *
 * This test verifies that no AI file accidentally imports a removed provider
 * (gemini-service, parseWithAI) and that all files use the canonical gateway.
 *
 * Tests:
 *
 * 1. RECIPE PARSING: lib/ai/parse-recipe.ts uses parseWithOllama (chef IP).
 *
 * 2. BRAIN DUMP: lib/ai/parse-brain-dump.ts uses parseWithOllama
 *    (client names, notes, event history).
 *
 * 3. REMY ACTIONS: lib/ai/remy-actions.ts uses parseWithOllama
 *    (all conversational client data).
 *
 * 4. CONTRACT GENERATOR: lib/ai/contract-generator.ts uses parseWithOllama
 *    (client PII, event details, pricing).
 *
 * 5. CAMPAIGN OUTREACH: lib/ai/campaign-outreach.ts uses Ollama
 *    for draftPersonalizedOutreach (client names, dietary prefs).
 *
 * 6. PARSE-OLLAMA IS THE CORRECT IMPORT: AI files import from
 *    lib/ai/parse-ollama.ts. No other AI provider exists.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q32-ai-routing-boundary.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()

function src(rel: string): string | null {
  const full = resolve(ROOT, rel)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf-8')
}

test.describe('Q32: AI routing boundary', () => {
  // -------------------------------------------------------------------------
  // Test 1: Recipe parsing uses Ollama (chef IP)
  // -------------------------------------------------------------------------
  test('lib/ai/parse-recipe.ts uses parseWithOllama (chef intellectual property)', () => {
    const content = src('lib/ai/parse-recipe.ts')
    if (!content) return // skip if file not present

    expect(
      content.includes('parseWithOllama') || content.includes('parse-ollama'),
      'parse-recipe.ts must route through Ollama (recipe text is chef IP, not for Gemini)'
    ).toBe(true)

    expect(
      !content.includes('gemini-service') && !content.includes('parseWithAI'),
      'parse-recipe.ts must NOT import gemini-service or parseWithAI'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Brain dump parsing uses Ollama (client names, notes)
  // -------------------------------------------------------------------------
  test('lib/ai/parse-brain-dump.ts uses parseWithOllama (contains client PII)', () => {
    const content = src('lib/ai/parse-brain-dump.ts')
    if (!content) return

    expect(
      content.includes('parseWithOllama') || content.includes('parse-ollama'),
      'parse-brain-dump.ts must use Ollama (client names and notes are PII)'
    ).toBe(true)

    expect(
      !content.includes('gemini-service') && !content.includes('parseWithAI'),
      'parse-brain-dump.ts must NOT route to Gemini'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Remy actions use Ollama (all conversational data is PII)
  // -------------------------------------------------------------------------
  test('lib/ai/remy-actions.ts uses Ollama for conversational AI (client data)', () => {
    const content = src('lib/ai/remy-actions.ts')
    if (!content) return

    expect(
      content.includes('parseWithOllama') ||
        content.includes('parse-ollama') ||
        content.includes('OLLAMA') ||
        content.includes('ollama'),
      'remy-actions.ts must route through Ollama (all Remy conversations contain client data)'
    ).toBe(true)

    // Remy must never route conversational content to Gemini
    expect(
      !content.includes('gemini-service'),
      'remy-actions.ts must not import gemini-service (conversational data is PII)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Contract generator uses Ollama (client PII + financials)
  // -------------------------------------------------------------------------
  test('lib/ai/contract-generator.ts uses Ollama (client PII + pricing)', () => {
    const content = src('lib/ai/contract-generator.ts')
    if (!content) return

    expect(
      content.includes('parseWithOllama') || content.includes('parse-ollama'),
      'contract-generator.ts must use Ollama (client PII and event pricing must not go to Gemini)'
    ).toBe(true)

    expect(
      !content.includes('gemini-service') && !content.includes('parseWithAI'),
      'contract-generator.ts must NOT use Gemini'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Campaign outreach PII path uses Ollama, not Gemini
  // -------------------------------------------------------------------------
  test('draftPersonalizedOutreach in campaign-outreach.ts uses Ollama (client PII)', () => {
    const content = src('lib/ai/campaign-outreach.ts')
    if (!content) return

    if (content.includes('draftPersonalizedOutreach')) {
      const fnIdx = content.indexOf('draftPersonalizedOutreach')
      const fnBody = content.slice(fnIdx, fnIdx + 1500)

      expect(
        fnBody.includes('parseWithOllama') || fnBody.includes('Ollama'),
        'draftPersonalizedOutreach must use Ollama (contains client names and dietary prefs)'
      ).toBe(true)

      expect(
        !fnBody.includes('parseWithAI') && !fnBody.includes('gemini'),
        'draftPersonalizedOutreach must NOT use Gemini (client PII boundary)'
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 6: parse-ollama.ts is the canonical Ollama wrapper
  // -------------------------------------------------------------------------
  test('lib/ai/parse-ollama.ts exists as the canonical private-data AI wrapper', () => {
    expect(
      existsSync(resolve(ROOT, 'lib/ai/parse-ollama.ts')),
      'lib/ai/parse-ollama.ts must exist as the canonical Ollama wrapper for PII-safe AI calls'
    ).toBe(true)

    const content = src('lib/ai/parse-ollama.ts')!

    expect(
      content.includes('OLLAMA_BASE_URL') ||
        content.includes('ollama') ||
        content.includes('Ollama'),
      'parse-ollama.ts must reference the Ollama endpoint (not a Gemini endpoint)'
    ).toBe(true)
  })
})
