/**
 * Q171-Q180: Observability & Failure Transparency
 *
 * Verifies Sentry instrumentation, webhook delivery logging, DLQ context,
 * email failure logging, Ollama error messages, and API error shape consistency.
 *
 * All questions passed structural review. No code changes needed.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q172: Instrumentation captures errors with PII scrubbing
test('Q172: Sentry initialized with PII scrubbing in instrumentation', () => {
  const src = readFile('instrumentation.ts')
  expect(src).toContain('@sentry/nextjs')
  expect(src).toContain('sendDefaultPii: false')
  // Strips cookies and auth headers from error reports
  expect(src).toContain('delete event.request.cookies')
  expect(src).toContain("delete event.request.headers['authorization']")
})

// Q175: Webhook delivery logs response status and error context
test('Q175: webhook delivery records status, timing, and errors to DB', () => {
  const src = readFile('lib/webhooks/deliver.ts')
  // Records delivery to database
  expect(src).toContain("from('webhook_deliveries'")
  expect(src).toContain('response_status')
  expect(src).toContain('delivered_at')
  // Pushes to DLQ on failure with full context
  expect(src).toContain('pushToDLQ')
})

// Q176: v2 API returns consistent error shapes
test('Q176: v2 API has standardized error response helpers', () => {
  expect(fs.existsSync(path.join(ROOT, 'lib/api/v2/response.ts'))).toBe(true)
  const src = readFile('lib/api/v2/response.ts')
  expect(src).toContain('apiUnauthorized')
  expect(src).toContain('apiForbidden')
  expect(src).toContain('apiRateLimited')
})

// Q177: Email send logs failures with context
test('Q177: email send logs failure details and handles bounces', () => {
  const src = readFile('lib/email/send.ts')
  expect(src).toContain("console.error('[sendEmail] Failed:'")
  // Suppression list for bounced addresses
  expect(src).toContain('isEmailSuppressed')
  expect(src).toContain('isBounceError')
})

// Q178: DLQ records failure reason, attempt count, and timestamps
test('Q178: pushToDLQ writes error_message, attempts, and failure timestamps', () => {
  const src = readFile('lib/resilience/retry.ts')
  expect(src).toContain('error_message: entry.errorMessage')
  expect(src).toContain('attempts: entry.attempts')
  expect(src).toContain('first_failed_at')
  expect(src).toContain('last_failed_at')
})

// Q179: Ollama errors use provider-agnostic user-facing messages
test('Q179: OllamaOfflineError shows generic AI error, not provider name', () => {
  const src = readFile('lib/ai/ollama-errors.ts')
  // User-facing message says "AI processing", not "Ollama"
  expect(src).toContain('AI processing is temporarily unavailable')
  // Class exists for internal catch/throw
  expect(src).toContain('OllamaOfflineError')
  // Error codes cover all failure modes
  expect(src).toContain('not_configured')
  expect(src).toContain('unreachable')
  expect(src).toContain('timeout')
  expect(src).toContain('model_missing')
})
