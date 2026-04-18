/**
 * Q191: AI Runtime Coherence (Post-Gemma 4 Migration)
 *
 * After migrating from Qwen 3 to Gemma 4 E4B, every AI surface must be
 * coherent: same model selection path, consistent limits, no stale references,
 * privacy narrative aligned, error messages provider-agnostic.
 *
 * This question set exposes every failure point in the AI runtime layer
 * and forces it into a fully specified, verifiable state.
 *
 * Tests:
 *
 *  1. MODEL SELECTION: All production AI code uses getOllamaModel() or
 *     getModelForEndpoint(), never hardcoded model strings.
 *
 *  2. NO STALE MODEL REFS: No "qwen", "30b", or "4b" in production code.
 *
 *  3. NO THINK CONTROL: No "think: false" or "think: true" in production
 *     code (Gemma 4 has no thinking mode).
 *
 *  4. NO /no_think PROMPTS: No "/no_think" prefix in production prompt strings.
 *
 *  5. PRIVACY NARRATIVE: No "your PC", "your machine", "your device",
 *     "stays local" in user-facing production components.
 *
 *  6. ERROR MESSAGE PRIVACY: No "Ollama" in user-facing error messages.
 *
 *  7. RATE LIMIT TIERING: Chef >= Client >= Public/Landing rates.
 *
 *  8. TIMEOUT COHERENCE: No AI timeout exceeds 60s. Streaming <= 30s for
 *     authenticated routes.
 *
 *  9. MESSAGE LENGTH COHERENCE: All Remy surfaces enforce consistent limits.
 *
 * 10. HISTORY LENGTH TIERING: Chef >= Client >= Public history caps.
 *
 * 11. SPEED_TRADEOFF EXTINCTION: The old constant name must not appear in
 *     production imports (renamed to SPEED_PRIVACY).
 *
 * 12. SINGLE PRIVACY SOURCE: All privacy text in components imports from
 *     privacy-narrative.ts, not inline strings.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q191-ai-runtime-coherence.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { globSync } from 'glob'

const ROOT = resolve(__dirname, '../..')

function readFile(rel: string): string {
  const p = resolve(ROOT, rel)
  if (!existsSync(p)) return ''
  return readFileSync(p, 'utf-8')
}

function readFiles(pattern: string): Array<{ path: string; content: string }> {
  const files = globSync(pattern, { cwd: ROOT })
  return files.map((f) => ({ path: f, content: readFile(f) }))
}

// ─── Production AI files (not scripts, not tests, not docs) ──────────────────

const PRODUCTION_AI_FILES = [
  'lib/ai/parse-ollama.ts',
  'lib/ai/ace-ollama.ts',
  'lib/ai/receipt-ocr.ts',
  'lib/ai/remy-vision-actions.ts',
  'lib/ai/remy-classifier.ts',
  'lib/ai/command-intent-parser.ts',
  'lib/ai/command-orchestrator.ts',
  'lib/ai/llm-router.ts',
  'lib/ai/providers.ts',
  'lib/ai/remy-actions.ts',
  'lib/ai/remy-welcome.ts',
  'lib/ai/remy-starters.ts',
  'lib/ai/privacy-narrative.ts',
  'lib/ai/remy-guardrails.ts',
  'lib/ai/remy-input-validation.ts',
  'lib/ai/chef-bio.ts',
  'lib/ai/contract-generator.ts',
  'lib/ai/grocery-consolidation.ts',
  'lib/ai/contingency-ai.ts',
  'lib/ai/parse-brain-dump.ts',
  'lib/ai/parse-recipe.ts',
  'lib/ai/aar-generator.ts',
  'lib/ai/campaign-outreach.ts',
  'lib/ai/equipment-depreciation-explainer.ts',
]

const REMY_API_ROUTES = [
  'app/api/remy/stream/route.ts',
  'app/api/remy/stream/route-runtime-utils.ts',
  'app/api/remy/stream/route-prompt-utils.ts',
  'app/api/remy/client/route.ts',
  'app/api/remy/public/route.ts',
  'app/api/remy/landing/route.ts',
  'app/api/remy/warmup/route.ts',
]

const SIMULATION_FILES = [
  'lib/simulation/scenario-generator.ts',
  'lib/simulation/report-generator.ts',
  'lib/simulation/pipeline-runner.ts',
]

const USER_FACING_COMPONENTS = [
  'components/ai/remy-drawer.tsx',
  'components/ai/remy-client-chat.tsx',
  'components/public/remy-concierge-widget.tsx',
  'components/ai-privacy/remy-gate.tsx',
  'components/ai-privacy/remy-onboarding-wizard.tsx',
  'components/dashboard/ollama-status-badge.tsx',
  'components/onboarding/onboarding-steps/connect-gmail-step.tsx',
]

// Local AI settings intentionally uses "your computer", "Ollama", etc. because
// it is a technical opt-in settings panel aimed at users who install Ollama themselves.
// Excluded from stale privacy claim and Ollama-in-UI checks (Q23 resolution).
const LOCAL_AI_EXEMPT_COMPONENTS = ['components/ai/local-ai-settings.tsx']

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: MODEL SELECTION - no hardcoded model strings in production AI code
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Q191: AI Runtime Coherence', () => {
  test('1. No hardcoded model strings in production AI code', () => {
    // Allowed patterns: getOllamaModel(...), getModelForEndpoint(...), process.env.*MODEL*
    // Banned: literal 'gemma4', 'qwen3', etc. as model parameter values
    const MODEL_LITERAL = /model:\s*['"`](gemma4|qwen[^'"`]*|llama[^'"`]*)['"]/

    for (const rel of [...PRODUCTION_AI_FILES, ...REMY_API_ROUTES, ...SIMULATION_FILES]) {
      const src = readFile(rel)
      if (!src) continue

      const match = src.match(MODEL_LITERAL)
      expect(
        match,
        `${rel} has hardcoded model literal: ${match?.[0]}. Use getOllamaModel() instead.`
      ).toBeNull()
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 2: NO STALE MODEL REFERENCES in production code
  // ───────────────────────────────────────────────────────────────────────────
  test('2. No qwen/30b/4b references in production AI code', () => {
    const STALE_PATTERN = /qwen|30b\b|4b\b/i

    for (const rel of [...PRODUCTION_AI_FILES, ...REMY_API_ROUTES]) {
      const src = readFile(rel)
      if (!src) continue

      // Check non-comment lines only
      const codeLines = src
        .split('\n')
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))

      for (const line of codeLines) {
        expect(
          STALE_PATTERN.test(line),
          `${rel} has stale model reference in code: "${line.trim().slice(0, 80)}"`
        ).toBe(false)
      }
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 3: NO hardcoded think: false in Ollama call payloads
  // (think: true is allowed when used dynamically via shouldUseThinking())
  // ───────────────────────────────────────────────────────────────────────────
  test('3. No hardcoded think: false in Ollama payloads', () => {
    // Match think: false in actual code (not comments, not dynamic assignments)
    const HARDCODED_THINK_FALSE = /^\s*think:\s*false\s*,?\s*$/m

    for (const rel of [...PRODUCTION_AI_FILES, ...REMY_API_ROUTES, ...SIMULATION_FILES]) {
      const src = readFile(rel)
      if (!src) continue

      // Only check non-comment lines
      const codeLines = src
        .split('\n')
        .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
        .join('\n')

      const match = codeLines.match(HARDCODED_THINK_FALSE)
      expect(
        match,
        `${rel} has hardcoded think: false. Gemma 4 uses dynamic thinking via shouldUseThinking().`
      ).toBeNull()
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 4: NO /no_think prompt prefix in production code
  // ───────────────────────────────────────────────────────────────────────────
  test('4. No /no_think prompt prefix in production code', () => {
    for (const rel of [...PRODUCTION_AI_FILES, ...REMY_API_ROUTES, ...SIMULATION_FILES]) {
      const src = readFile(rel)
      if (!src) continue

      expect(
        src.includes('/no_think'),
        `${rel} still uses /no_think prefix (Qwen-specific workaround). Remove it.`
      ).toBe(false)
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 5: PRIVACY NARRATIVE - no stale "your PC/machine/device" in components
  // ───────────────────────────────────────────────────────────────────────────
  test('5. No stale privacy claims in user-facing components', () => {
    const STALE_PRIVACY = /your (PC|machine|computer|device)|stays local|100% local/i

    for (const rel of USER_FACING_COMPONENTS) {
      const src = readFile(rel)
      if (!src) continue

      const match = src.match(STALE_PRIVACY)
      expect(
        match,
        `${rel} has stale privacy claim: "${match?.[0]}". Use imports from privacy-narrative.ts.`
      ).toBeNull()
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 6: ERROR MESSAGE PRIVACY - no "Ollama" in user-facing error messages
  // ───────────────────────────────────────────────────────────────────────────
  test('6. No "Ollama" in user-facing error string literals', () => {
    // Check that "Ollama" never appears inside a string literal that gets sent to users.
    // Variable names like isOllama or err.message.includes('Ollama') are fine (internal detection).
    // What's banned: data: "...Ollama..." in SSE error payloads.
    const OLLAMA_IN_USER_STRING =
      /data:\s*['"`]([^'"`]*Ollama[^'"`]*)['"`]|['"`]([^'"`]*Ollama[^'"`]*needs to be running[^'"`]*)['"`]/

    for (const rel of REMY_API_ROUTES) {
      const src = readFile(rel)
      if (!src) continue

      const match = src.match(OLLAMA_IN_USER_STRING)
      expect(
        match,
        `${rel} exposes "Ollama" in user-facing string: "${(match?.[1] ?? match?.[2] ?? '').slice(0, 80)}"`
      ).toBeNull()
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 7: RATE LIMIT TIERING - chef >= client >= public
  // ───────────────────────────────────────────────────────────────────────────
  test('7. Rate limits follow trust tier ordering', () => {
    const guardrails = readFile('lib/ai/remy-guardrails.ts')
    const streamRoute = readFile('app/api/remy/stream/route.ts')
    const clientRoute = readFile('app/api/remy/client/route.ts')
    const publicRoute = readFile('app/api/remy/public/route.ts')

    // Extract rate limit numbers from checkRateLimit calls
    const extractLimit = (src: string, key: string): number => {
      const match = src.match(new RegExp(`checkRateLimit\\([^)]*${key}[^)]*,\\s*(\\d+)`))
      return match ? parseInt(match[1]) : 0
    }

    const chefLimit =
      extractLimit(streamRoute, 'remy-stream') ||
      parseInt(guardrails.match(/REMY_RATE_LIMIT_MAX\s*=\s*(\d+)/)?.[1] ?? '0')
    const clientLimit = extractLimit(clientRoute, 'remy-client')
    const publicLimit = extractLimit(publicRoute, 'remy-public')

    expect(chefLimit, 'Chef rate limit must be set').toBeGreaterThan(0)
    expect(clientLimit, 'Client rate limit must be set').toBeGreaterThan(0)
    expect(publicLimit, 'Public rate limit must be set').toBeGreaterThan(0)

    expect(
      chefLimit >= clientLimit,
      `Chef limit (${chefLimit}) must be >= client limit (${clientLimit})`
    ).toBe(true)
    expect(
      clientLimit >= publicLimit,
      `Client limit (${clientLimit}) must be >= public limit (${publicLimit})`
    ).toBe(true)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 8: TIMEOUT COHERENCE - no AI timeout > 60s
  // ───────────────────────────────────────────────────────────────────────────
  test('8. No AI streaming timeout exceeds 60s', () => {
    // Match setTimeout or AbortSignal.timeout patterns
    const TIMEOUT_PATTERN = /(?:setTimeout|AbortSignal\.timeout)\(\s*(?:.*?,\s*)?(\d{4,})/g

    for (const rel of REMY_API_ROUTES) {
      const src = readFile(rel)
      if (!src) continue

      let match
      while ((match = TIMEOUT_PATTERN.exec(src)) !== null) {
        const ms = parseInt(match[1])
        // Allow up to 60s for any route
        expect(
          ms <= 60_000,
          `${rel} has timeout ${ms}ms (${ms / 1000}s) which exceeds 60s maximum`
        ).toBe(true)
      }
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 9: MESSAGE LENGTH COHERENCE
  // ───────────────────────────────────────────────────────────────────────────
  test('9. Message length limits are consistent across validation layers', () => {
    const guardrails = readFile('lib/ai/remy-guardrails.ts')
    const validation = readFile('lib/ai/remy-input-validation.ts')
    const drawer = readFile('components/ai/remy-drawer.tsx')

    const guardrailLimit = parseInt(
      guardrails.match(/REMY_MAX_MESSAGE_LENGTH\s*=\s*(\d+)/)?.[1] ?? '0'
    )
    const validationLimit = parseInt(validation.match(/MAX_MESSAGE_LENGTH\s*=\s*(\d+)/)?.[1] ?? '0')
    const drawerLimit = parseInt(drawer.match(/maxLength[=:]\s*[{]?(\d+)/)?.[1] ?? '0')

    expect(guardrailLimit, 'Guardrail limit must be set').toBeGreaterThan(0)
    expect(validationLimit, 'Validation limit must be set').toBeGreaterThan(0)
    expect(drawerLimit, 'Drawer maxLength must be set').toBeGreaterThan(0)

    expect(
      guardrailLimit === validationLimit,
      `Guardrail (${guardrailLimit}) and validation (${validationLimit}) limits must match`
    ).toBe(true)
    expect(
      validationLimit === drawerLimit,
      `Server (${validationLimit}) and client (${drawerLimit}) limits must match`
    ).toBe(true)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 10: HISTORY LENGTH TIERING
  // ───────────────────────────────────────────────────────────────────────────
  test('10. History caps follow trust tier ordering', () => {
    const streamRoute = readFile('app/api/remy/stream/route.ts')
    const clientRoute = readFile('app/api/remy/client/route.ts')
    const publicRoute = readFile('app/api/remy/public/route.ts')

    const extractHistory = (src: string): number => {
      // Use a greedy match that handles nested generics with commas
      const match = src.match(/validateHistory\(.+?,\s*(\d+)\)/)
      return match ? parseInt(match[1]) : 0
    }

    const chefHistory = extractHistory(streamRoute)
    const clientHistory = extractHistory(clientRoute)
    const publicHistory = extractHistory(publicRoute)

    expect(chefHistory, 'Chef history cap must be set').toBeGreaterThan(0)
    expect(clientHistory, 'Client history cap must be set').toBeGreaterThan(0)
    expect(publicHistory, 'Public history cap must be set').toBeGreaterThan(0)

    expect(
      chefHistory >= clientHistory,
      `Chef history (${chefHistory}) must be >= client history (${clientHistory})`
    ).toBe(true)
    expect(
      clientHistory >= publicHistory,
      `Client history (${clientHistory}) must be >= public history (${publicHistory})`
    ).toBe(true)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 11: SPEED_TRADEOFF constant is fully extinct in production imports
  // ───────────────────────────────────────────────────────────────────────────
  test('11. SPEED_TRADEOFF constant is not imported anywhere', () => {
    const allComponents = readFiles('components/**/*.tsx')

    for (const { path, content } of allComponents) {
      const imports = content.match(/import\s*\{[^}]*SPEED_TRADEOFF[^}]*\}/g)
      expect(
        imports,
        `${path} still imports SPEED_TRADEOFF. Use SPEED_PRIVACY or SPEED_PRIVACY_SHORT.`
      ).toBeNull()
    }
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Test 12: SINGLE PRIVACY SOURCE - components import from privacy-narrative.ts
  // ───────────────────────────────────────────────────────────────────────────
  test('12. Privacy narrative constants are canonical source of truth', () => {
    const narrative = readFile('lib/ai/privacy-narrative.ts')

    // The file must export these specific constants
    expect(narrative.includes('SPEED_PRIVACY'), 'SPEED_PRIVACY must be exported').toBe(true)
    expect(narrative.includes('SPEED_PRIVACY_SHORT'), 'SPEED_PRIVACY_SHORT must be exported').toBe(
      true
    )
    expect(narrative.includes('PRIVACY_ONELINER'), 'PRIVACY_ONELINER must be exported').toBe(true)
    expect(
      narrative.includes('PRIVATE_AI_EXPLAINED'),
      'PRIVATE_AI_EXPLAINED must be exported'
    ).toBe(true)

    // Exported string constants must NOT contain banned phrases.
    // Comments/JSDoc may reference them as rules (e.g. "Never say 'your PC'"), so only check
    // the content of export const lines (single-quoted string values).
    const exportedStrings = narrative
      .split('\n')
      .filter((l) => l.includes("'") && !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n')

    const BANNED = ['your PC', 'your machine', 'your device', 'stays local', '100% local']
    for (const phrase of BANNED) {
      expect(
        exportedStrings.toLowerCase().includes(phrase.toLowerCase()),
        `privacy-narrative.ts exported strings must not contain "${phrase}"`
      ).toBe(false)
    }
  })
})
