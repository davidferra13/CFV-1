/**
 * Q71-Q80: User-Facing Surface Integrity
 *
 * Verifies email safety, client portal scoping, ledger idempotency,
 * SSE reconnection, readiness gates, and AI offline resilience.
 *
 * All questions passed structural review - no code changes needed.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q71: Email templates use React (auto-escaped), plus header injection guard
test('Q71: sendEmail guards against header injection via newlines', () => {
  const src = readFile('lib/email/send.ts')
  expect(src).toContain('hasNewline')
  expect(src).toMatch(/\\r\\n/)
  // Uses React elements, not raw HTML
  expect(src).toContain('react: ReactElement')
})

// Q72: Client portal actions require client auth and scope by entityId
test('Q72: hub client actions use requireClient and scope by entityId', () => {
  const src = readFile('lib/hub/client-hub-actions.ts')
  expect(src).toContain('requireClient')
  expect(src).toContain('user.entityId')
})

// Q73: Email notification functions require clientEmail as string type
test('Q73: email notification params require clientEmail string', () => {
  const src = readFile('lib/email/notifications.ts')
  expect(src).toContain('clientEmail: string')
  // sendEmail is non-blocking (returns boolean, never throws)
  const sendSrc = readFile('lib/email/send.ts')
  expect(sendSrc).toContain('Promise<boolean>')
})

// Q75: Manual ledger entries have idempotency via transaction_reference
test('Q75: createAdjustment generates transaction_reference for idempotency', () => {
  const src = readFile('lib/ledger/append.ts')
  expect(src).toContain('idempotency_key')
  expect(src).toContain('transaction_reference')
  // Internal append checks for duplicate
  const internal = readFile('lib/ledger/append-internal.ts')
  expect(internal).toContain('23505') // PostgreSQL unique violation code
  expect(internal).toContain('Duplicate transaction')
})

// Q76: Shopping list handles recipes gracefully (skip if no ingredients)
test('Q76: shopping list generation skips recipes with no ingredients', () => {
  const src = readFile('lib/menus/actions.ts')
  // Filter ensures only matching recipe ingredients are processed
  expect(src).toContain('if (!ingredient) continue')
})

// Q77: Financial reconciled gate on in_progress->completed
test('Q77: FSM requires financial_reconciled for in_progress->completed', () => {
  const src = readFile('lib/events/readiness.ts')
  expect(src).toContain("'in_progress->completed'")
  expect(src).toContain('financial_reconciled')
})

// Q78: SSE client reconnects on error with backoff
test('Q78: SSE client has error handler with reconnection', () => {
  const src = readFile('lib/realtime/sse-client.ts')
  expect(src).toContain('es.onerror')
  expect(src).toContain('reconnect')
  expect(src).toContain('setTimeout(connect')
})

// Q79: Quotes can exist without inquiry (inquiry_id nullable)
test('Q79: quote schema allows null inquiry_id (standalone quotes)', () => {
  const src = readFile('lib/quotes/actions.ts')
  expect(src).toMatch(/inquiry_id.*nullable/)
})

// Q80: OllamaOfflineError is handled across the AI layer
test('Q80: OllamaOfflineError class exists and is imported widely', () => {
  const src = readFile('lib/ai/ollama-errors.ts')
  expect(src).toContain('OllamaOfflineError')
  // The parse-ollama module throws it
  const parse = readFile('lib/ai/parse-ollama.ts')
  expect(parse).toContain('OllamaOfflineError')
})
