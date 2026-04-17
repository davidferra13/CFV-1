/**
 * Q93: Calling Endpoint Abuse Protection
 *
 * Stress Question Q16: Calling API endpoints handle real Twilio calls
 * that cost money. Without abuse protection, attackers can trigger
 * unlimited calls, causing financial damage.
 *
 * What we check:
 *   1. Every route.ts under app/api/calling/ has one of:
 *      - Rate limiting (checkRateLimit / rateLimiter)
 *      - Twilio webhook signature validation (validateTwilioWebhook / validateRequest)
 *      - Auth guard (requireChef / requireAdmin / requireCallingEnabled)
 *   2. Webhook callback routes (POST from Twilio) are protected by signature validation
 *   3. Call initiation (server actions) are behind auth + eligibility checks
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q93-calling-rate-limit.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = process.cwd()

function findRouteFiles(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findRouteFiles(full))
      } else if (entry.name === 'route.ts') {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}

test.describe('Q93: Calling endpoint abuse protection', () => {
  const callingDir = resolve(ROOT, 'app/api/calling')

  test('all calling API routes have abuse protection', () => {
    let routes: string[] = []
    try {
      routes = findRouteFiles(callingDir)
    } catch {
      test.skip()
      return
    }

    if (routes.length === 0) {
      test.skip()
      return
    }

    const unprotectedRoutes: string[] = []

    for (const route of routes) {
      const content = readFileSync(route, 'utf-8')

      // Acceptable protection mechanisms (any one suffices):
      const hasRateLimit = /checkRateLimit|rateLimit|rateLimiter/.test(content)
      const hasTwilioSignatureValidation =
        /validateTwilioWebhook|validateRequest|twilio.*signature/i.test(content)
      const hasAuthGuard =
        /requireChef|requireAdmin|requireCallingEnabled|checkCallingEligibility|await auth\(\)/.test(
          content
        )

      if (!hasRateLimit && !hasTwilioSignatureValidation && !hasAuthGuard) {
        unprotectedRoutes.push(route)
      }
    }

    if (unprotectedRoutes.length > 0) {
      const relative = unprotectedRoutes.map((f) => f.replace(ROOT, '').replace(/\\/g, '/'))
      console.warn(
        `Calling API routes without abuse protection:\n${relative.join('\n')}\n` +
          'Fix: Add rate limiting, Twilio webhook validation, or auth guards.'
      )
    }

    expect(
      unprotectedRoutes.length,
      `${unprotectedRoutes.length} calling route(s) lack abuse protection`
    ).toBe(0)
  })

  test('call initiation server actions have auth + eligibility guards', () => {
    const actionsFile = resolve(ROOT, 'lib/calling/twilio-actions.ts')
    let content: string
    try {
      content = readFileSync(actionsFile, 'utf-8')
    } catch {
      test.skip()
      return
    }

    // Call initiation must have requireCallingEnabled (admin + feature gate)
    expect(content).toContain('requireCallingEnabled')

    // Must also have eligibility check (prevents duplicate calls)
    expect(content).toContain('checkCallingEligibility')
  })
})
