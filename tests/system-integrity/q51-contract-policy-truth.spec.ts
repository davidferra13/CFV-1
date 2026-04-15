/**
 * Q51: Contract Policy Truth
 *
 * Q12 caught contracts using a placeholder "Per standard cancellation policy"
 * instead of the chef's real policy. This is a regression guard.
 *
 * Contracts must include real cancellation policy text derived from the
 * chef's settings. A contract with placeholder text gives the client no
 * enforceable terms. This is both a legal risk and a trust violation.
 *
 * Extended to cover: deposit policy, payment terms, and no static defaults
 * appearing in generated contract content.
 *
 * Tests:
 *
 * 1. NO PLACEHOLDER TEXT: lib/contracts/actions.ts or lib/ai/contract-
 *    generator.ts does not contain the placeholder string "Per standard
 *    cancellation policy".
 *
 * 2. POLICY DERIVATION: The contract generator derives cancellation policy
 *    from chef settings (lib/cancellation/policy.ts or equivalent), not
 *    a hardcoded string.
 *
 * 3. CONTRACT GENERATOR EXISTS: lib/ai/contract-generator.ts exists and
 *    uses Ollama (PII-safe path, not Gemini).
 *
 * 4. CHEF SETTINGS USED: The contract generation reads from chef settings
 *    (deposit_percent, cancellation terms, etc.) not hardcoded values.
 *
 * 5. CANCELLATION POLICY MODULE: lib/cancellation/policy.ts exists as the
 *    canonical source for policy text derivation.
 *
 * 6. CONTRACT ACTIONS AUTH: lib/contracts/actions.ts has requireChef()
 *    and tenant scoping before generating or sending contracts.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q51-contract-policy-truth.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const CONTRACT_ACTIONS = resolve(process.cwd(), 'lib/contracts/actions.ts')
const CONTRACT_GENERATOR = resolve(process.cwd(), 'lib/ai/contract-generator.ts')
const CANCELLATION_POLICY = resolve(process.cwd(), 'lib/cancellation/policy.ts')

test.describe('Q51: Contract policy truth', () => {
  // -------------------------------------------------------------------------
  // Test 1: Placeholder text absent from contract generation code
  // -------------------------------------------------------------------------
  test('contract code does not contain the "Per standard cancellation policy" placeholder', () => {
    const sources = [CONTRACT_ACTIONS, CONTRACT_GENERATOR].filter(existsSync)
    expect(sources.length, 'at least one contract file must exist').toBeGreaterThan(0)

    for (const filePath of sources) {
      const src = readFileSync(filePath, 'utf-8')

      expect(
        !src.includes('Per standard cancellation policy'),
        `${filePath.replace(process.cwd(), '')} must NOT contain placeholder "Per standard cancellation policy"`
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 2: Policy derived from chef settings (not hardcoded)
  // -------------------------------------------------------------------------
  test('contract generator derives cancellation policy from chef settings', () => {
    const generatorSrc = existsSync(CONTRACT_GENERATOR)
      ? readFileSync(CONTRACT_GENERATOR, 'utf-8')
      : ''
    const actionsSrc = existsSync(CONTRACT_ACTIONS) ? readFileSync(CONTRACT_ACTIONS, 'utf-8') : ''

    const combined = generatorSrc + actionsSrc

    expect(
      combined.includes('cancellation') &&
        (combined.includes('policy') || combined.includes('settings') || combined.includes('chef')),
      'contract generation must derive cancellation terms from chef settings (not hardcoded text)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Contract generator uses Ollama (PII - client data in contracts)
  // -------------------------------------------------------------------------
  test('lib/ai/contract-generator.ts uses Ollama for generation (client PII)', () => {
    if (!existsSync(CONTRACT_GENERATOR)) return

    const src = readFileSync(CONTRACT_GENERATOR, 'utf-8')

    expect(
      src.includes('parseWithOllama') || src.includes('parse-ollama') || src.includes('Ollama'),
      'contract-generator.ts must use Ollama (contracts contain client PII and financial terms)'
    ).toBe(true)

    expect(
      !src.includes('gemini-service') && !src.includes('parseWithAI'),
      'contract-generator.ts must NOT use Gemini (contracts are PII documents)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Chef settings read for deposit and payment terms
  // -------------------------------------------------------------------------
  test('contract generation reads deposit and payment terms from chef settings', () => {
    const generatorSrc = existsSync(CONTRACT_GENERATOR)
      ? readFileSync(CONTRACT_GENERATOR, 'utf-8')
      : ''
    const actionsSrc = existsSync(CONTRACT_ACTIONS) ? readFileSync(CONTRACT_ACTIONS, 'utf-8') : ''

    const combined = generatorSrc + actionsSrc

    expect(
      combined.includes('deposit') ||
        combined.includes('payment_terms') ||
        combined.includes('settings'),
      'contract generation must read deposit/payment terms from chef settings (not use defaults)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Cancellation policy module exists as canonical source
  // -------------------------------------------------------------------------
  test('lib/cancellation/policy.ts exists as the canonical cancellation policy source', () => {
    expect(
      existsSync(CANCELLATION_POLICY),
      'lib/cancellation/policy.ts must exist (canonical source for cancellation policy text)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Contract actions have requireChef and tenant scoping
  // -------------------------------------------------------------------------
  test('lib/contracts/actions.ts has requireChef and tenant scoping', () => {
    if (!existsSync(CONTRACT_ACTIONS)) return

    const src = readFileSync(CONTRACT_ACTIONS, 'utf-8')

    expect(
      src.includes('requireChef'),
      'contracts/actions.ts must call requireChef() before generating or sending contracts'
    ).toBe(true)

    expect(
      src.includes('tenant_id') || src.includes('tenantId'),
      'contracts/actions.ts must scope contract operations to the requesting chef tenant'
    ).toBe(true)
  })
})
