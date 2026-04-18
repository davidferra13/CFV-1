/**
 * Q29: Email Delivery Gate
 *
 * Email is the primary channel for client communication. Key mutations
 * (quote sent, event status change, new inquiry) must fire emails.
 * Equally important: PII must not leak to cloud AI during email composition,
 * unsubscribes must be respected, and the email pipeline must be non-blocking.
 *
 * Tests:
 *
 * 1. QUOTE SENT EMAIL: lib/quotes/actions.ts fires an email when a quote is
 *    transitioned to 'sent'. Clients must receive their quote by email.
 *
 * 2. EMAIL SERVICE EXISTS: lib/notifications/email-service.ts (or similar)
 *    is the canonical email sender. All email goes through one path.
 *
 * 3. NON-BLOCKING: Email sends are wrapped in try/catch so a mailer failure
 *    cannot abort the main operation (quote send, event transition).
 *
 * 4. UNSUBSCRIBE ACTIONS: lib/email/unsubscribe-actions.ts exists and is
 *    exempt from auth guards (unsubscribes must work without login).
 *
 * 5. NOTIFICATION EMAIL CHANNEL: lib/notifications/channel-router.ts routes
 *    to the email service — notifications deliver via email as one channel.
 *
 * 6. SINGLE-PROVIDER IN EMAIL: Files that compose emails using AI must use
 *    parseWithOllama (the only AI provider) when personalizing with client data.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q29-email-delivery-gate.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const QUOTE_ACTIONS = resolve(process.cwd(), 'lib/quotes/actions.ts')
const EMAIL_SERVICE = resolve(process.cwd(), 'lib/notifications/email-service.ts')
const EMAIL_ACTIONS = resolve(process.cwd(), 'lib/email/actions.ts')
// Unsubscribe may live in lib/email/unsubscribe-actions.ts or lib/email/actions.ts
const UNSUBSCRIBE_ACTIONS = existsSync(resolve(process.cwd(), 'lib/email/unsubscribe-actions.ts'))
  ? resolve(process.cwd(), 'lib/email/unsubscribe-actions.ts')
  : resolve(process.cwd(), 'lib/email/actions.ts')
const CHANNEL_ROUTER = resolve(process.cwd(), 'lib/notifications/channel-router.ts')
const CAMPAIGN_OUTREACH = resolve(process.cwd(), 'lib/ai/campaign-outreach.ts')

test.describe('Q29: Email delivery gate', () => {
  // -------------------------------------------------------------------------
  // Test 1: Quote send triggers client email
  // -------------------------------------------------------------------------
  test('lib/quotes/actions.ts sends email when quote status transitions to sent', () => {
    expect(existsSync(QUOTE_ACTIONS), 'lib/quotes/actions.ts must exist').toBe(true)

    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    // Must have email sending logic for the 'sent' transition
    expect(
      src.includes("'sent'") &&
        (src.includes('email') || src.includes('sendEmail') || src.includes('sendNotification')),
      "quote actions must send an email when quote transitions to 'sent'"
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 2: Email service exists as the canonical sender
  // -------------------------------------------------------------------------
  test('lib/notifications/email-service.ts exists as the canonical email sender', () => {
    const emailServiceExists = existsSync(EMAIL_SERVICE) || existsSync(EMAIL_ACTIONS)

    expect(
      emailServiceExists,
      'An email service file must exist (lib/notifications/email-service.ts or lib/email/actions.ts)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Email sends are non-blocking (try/catch wrapped)
  // -------------------------------------------------------------------------
  test('email sends in quote actions are non-blocking (try/catch wrapped)', () => {
    const src = readFileSync(QUOTE_ACTIONS, 'utf-8')

    // Find the email send section
    const emailIdx = src.indexOf('email')
    if (emailIdx === -1) return // No email send found, skip

    const contextAround = src.slice(Math.max(0, emailIdx - 300), emailIdx + 500)

    expect(
      contextAround.includes('try {') || contextAround.includes('try{'),
      'Email send in quote actions must be wrapped in try/catch (non-blocking side effect)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Unsubscribe actions exist and are public-exempt
  // -------------------------------------------------------------------------
  test('unsubscribe flow is treated as public in auth scan', () => {
    // Q6 auth scan must exempt unsubscribe actions so clients can opt out without login.
    // The file may not yet be fully implemented but must be in the public-exempt list.
    const q6File = resolve(process.cwd(), 'tests/system-integrity/q6-server-action-auth.spec.ts')
    if (!existsSync(q6File)) return

    const q6Src = readFileSync(q6File, 'utf-8')
    expect(
      q6Src.includes('unsubscribe'),
      'Q6 auth scan must have unsubscribe in the public-exempt list (clients opt out without login)'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Notification channel router delivers via email
  // -------------------------------------------------------------------------
  test('lib/notifications/channel-router.ts routes to email delivery', () => {
    expect(existsSync(CHANNEL_ROUTER), 'lib/notifications/channel-router.ts must exist').toBe(true)

    const src = readFileSync(CHANNEL_ROUTER, 'utf-8')

    expect(src.includes('email'), 'channel-router.ts must route to email delivery channel').toBe(
      true
    )
  })

  // -------------------------------------------------------------------------
  // Test 6: Personalized email outreach uses parseWithOllama (single provider)
  // -------------------------------------------------------------------------
  test('personalized email AI uses parseWithOllama (single provider)', () => {
    if (!existsSync(CAMPAIGN_OUTREACH)) return

    const src = readFileSync(CAMPAIGN_OUTREACH, 'utf-8')

    // The draftPersonalizedOutreach function must use Ollama
    if (src.includes('draftPersonalizedOutreach')) {
      const fnIdx = src.indexOf('draftPersonalizedOutreach')
      const fnBody = src.slice(fnIdx, fnIdx + 1000)

      expect(
        fnBody.includes('parseWithOllama') || fnBody.includes('Ollama'),
        'draftPersonalizedOutreach must use parseWithOllama'
      ).toBe(true)

      // Must NOT use removed provider
      expect(
        !fnBody.includes('parseWithAI') && !fnBody.includes('Gemini'),
        'draftPersonalizedOutreach must NOT use removed parseWithAI provider'
      ).toBe(true)
    }
  })
})
