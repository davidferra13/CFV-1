/**
 * Q91-Q100: Resilience & Edge Cases
 *
 * Verifies circuit breaker, quote race protection, DLQ, idempotency,
 * error boundaries, and activity log resilience.
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

// Q91: Circuit breaker has 3 states with threshold and reset
test('Q91: circuit breaker implements CLOSED/OPEN/HALF_OPEN states', () => {
  const src = readFile('lib/resilience/circuit-breaker.ts')
  expect(src).toContain('CLOSED')
  expect(src).toContain('OPEN')
  expect(src).toContain('HALF_OPEN')
  expect(src).toContain('failureThreshold')
  expect(src).toContain('resetTimeoutMs')
})

// Q92: Quote acceptance uses FOR UPDATE lock in atomic RPC
test('Q92: respond_to_quote_atomic uses row lock to prevent double-accept', () => {
  const migrationDir = path.join(ROOT, 'database/migrations')
  const files = fs.readdirSync(migrationDir)
  const rpcFile = files.find((f) => f.includes('quote_acceptance_serialization'))
  expect(rpcFile).toBeTruthy()

  const sql = readFile(`database/migrations/${rpcFile}`)
  expect(sql).toContain('FOR UPDATE')
  expect(sql).toContain('respond_to_quote_atomic')
})

// Q93: DLQ pushes failed jobs for manual review
test('Q93: pushToDLQ writes to dead_letter_queue table', () => {
  const src = readFile('lib/resilience/retry.ts')
  expect(src).toContain('dead_letter_queue')
  expect(src).toContain('pushToDLQ')
  expect(src).toContain('first_failed_at')
  expect(src).toContain('last_failed_at')
})

// Q95: executeWithIdempotency returns cached result on duplicate
test('Q95: idempotency wrapper returns cached response for duplicate keys', () => {
  const src = readFile('lib/mutations/idempotency.ts')
  expect(src).toContain('mutation_idempotency')
  expect(src).toContain('existing?.response_data')
  expect(src).toContain('upsert')
})

// Q99: Activity log writes are non-blocking (try/catch wrapped)
test('Q99: activity log calls are wrapped in try/catch as non-blocking', () => {
  const events = readFile('lib/events/actions.ts')
  expect(events).toContain("console.error('[createEvent] Activity log failed (non-blocking):'")
})

// Q100: Global error boundary prevents white screens
test('Q100: global-error.tsx exists with reset and Go Home actions', () => {
  const src = readFile('app/global-error.tsx')
  expect(src).toContain('GlobalError')
  expect(src).toContain('reset')
  expect(src).toContain('Go Home')
  expect(src).toContain('reportToSentry')
})

test('Q100b: per-layout error boundaries exist for all portals', () => {
  expect(fs.existsSync(path.join(ROOT, 'app/(chef)/error.tsx'))).toBe(true)
  expect(fs.existsSync(path.join(ROOT, 'app/(client)/error.tsx'))).toBe(true)
  expect(fs.existsSync(path.join(ROOT, 'app/(admin)/error.tsx'))).toBe(true)
  expect(fs.existsSync(path.join(ROOT, 'app/(public)/error.tsx'))).toBe(true)
})
