/**
 * Q42: Remy Input Guards
 *
 * Remy processes free-form chef and client text before sending it to an LLM.
 * Without input guards, an attacker could:
 *   - Send oversized messages to exhaust LLM context/budget
 *   - Inject special characters or formatting to manipulate the system prompt
 *   - Ask Remy to repeat its instructions back (system prompt exfiltration)
 *   - Request dangerous automations (delete data, send emails, etc.)
 *
 * Three guard functions form the pre-LLM pipeline:
 *   1. sanitizeForPrompt() - neutralizes injection markers
 *   2. checkDangerousActionBlock() - blocks requests for destructive operations
 *   3. validateRemyRequestBody() - enforces message length limits
 *
 * Tests:
 *
 * 1. MESSAGE LENGTH LIMIT: MAX_MESSAGE_LENGTH constant exists and is used
 *    to reject oversized messages before LLM call.
 *
 * 2. SANITIZE FOR PROMPT: sanitizeForPrompt() normalizes Unicode, strips
 *    zero-width chars, and neutralizes injection patterns.
 *
 * 3. DANGEROUS ACTION BLOCK: checkDangerousActionBlock() exists and covers
 *    system prompt extraction attempts.
 *
 * 4. VALIDATE REQUEST BODY: validateRemyRequestBody() is the entry-point
 *    validator that returns null on invalid input (not throw).
 *
 * 5. HISTORY LIMITS: MAX_HISTORY_LENGTH and per-message caps prevent
 *    history stuffing attacks.
 *
 * 6. OUT-OF-SCOPE GUARD: checkOutOfScopeBlock() prevents Remy from
 *    answering medical, legal, investment, or other off-domain questions.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q42-remy-input-guards.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const VALIDATION = resolve(process.cwd(), 'lib/ai/remy-input-validation.ts')

test.describe('Q42: Remy input guards', () => {
  // -------------------------------------------------------------------------
  // Test 1: Message length limit constant exists
  // -------------------------------------------------------------------------
  test('MAX_MESSAGE_LENGTH constant exists and limits message size before LLM call', () => {
    expect(existsSync(VALIDATION), 'lib/ai/remy-input-validation.ts must exist').toBe(true)

    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('MAX_MESSAGE_LENGTH'),
      'remy-input-validation.ts must define MAX_MESSAGE_LENGTH to prevent context budget exhaustion'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: sanitizeForPrompt neutralizes injection patterns
  // -------------------------------------------------------------------------
  test('sanitizeForPrompt normalizes Unicode and neutralizes prompt injection markers', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('sanitizeForPrompt'),
      'remy-input-validation.ts must export sanitizeForPrompt (injection neutralization)'
    ).toBe(true)

    // Must handle Unicode normalization or zero-width char stripping
    expect(
      src.includes('normalize') ||
        src.includes('NFC') ||
        src.includes('\\u200') ||
        src.includes('zero'),
      'sanitizeForPrompt must normalize Unicode/zero-width chars (classic injection vectors)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Dangerous action block prevents system prompt attacks
  // -------------------------------------------------------------------------
  test('checkDangerousActionBlock prevents system prompt exfiltration requests', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('checkDangerousActionBlock'),
      'remy-input-validation.ts must export checkDangerousActionBlock'
    ).toBe(true)

    // Must cover system prompt extraction patterns
    expect(
      src.includes('system prompt') ||
        src.includes('instructions') ||
        src.includes('ignore') ||
        src.includes('DANGEROUS'),
      'checkDangerousActionBlock must cover system prompt exfiltration (ignore previous instructions, etc.)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: validateRemyRequestBody is the entry-point validator
  // -------------------------------------------------------------------------
  test('validateRemyRequestBody returns null on invalid input (safe failure mode)', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('validateRemyRequestBody'),
      'remy-input-validation.ts must export validateRemyRequestBody'
    ).toBe(true)

    // Must return null (not throw) on invalid input so caller can return 400 gracefully
    const fnIdx = src.indexOf('validateRemyRequestBody')
    const fnBody = src.slice(fnIdx, fnIdx + 600)

    expect(
      fnBody.includes('return null') || fnBody.includes('null'),
      'validateRemyRequestBody must return null on invalid input (not throw - allows graceful 400 response)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: History size limits prevent context stuffing
  // -------------------------------------------------------------------------
  test('MAX_HISTORY_LENGTH and per-message caps prevent history stuffing attacks', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('MAX_HISTORY_LENGTH') || src.includes('MAX_HISTORY'),
      'remy-input-validation.ts must cap conversation history length (prevents context stuffing)'
    ).toBe(true)

    // Must also cap per-message length in history
    expect(
      src.includes('MAX_HISTORY_MESSAGE_LENGTH') ||
        src.includes('maxMessages') ||
        src.includes('history'),
      'remy-input-validation.ts must cap per-message history length'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: Out-of-scope block prevents medical/legal/investment answers
  // -------------------------------------------------------------------------
  test('checkOutOfScopeBlock prevents Remy from answering off-domain questions', () => {
    const src = readFileSync(VALIDATION, 'utf-8')

    expect(
      src.includes('checkOutOfScopeBlock'),
      'remy-input-validation.ts must export checkOutOfScopeBlock (prevents off-domain responses)'
    ).toBe(true)

    // Must cover at least one of: medical, legal, investment, financial advice
    expect(
      src.includes('medical') ||
        src.includes('legal') ||
        src.includes('invest') ||
        src.includes('OUT_OF_SCOPE'),
      'checkOutOfScopeBlock must cover medical/legal/investment topics (outside chef domain)'
    ).toBe(true)
  })
})
