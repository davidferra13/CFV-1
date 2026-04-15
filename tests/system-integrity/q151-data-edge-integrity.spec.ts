/**
 * Q151-Q160: Data Integrity at the Edges
 *
 * Verifies guest count validation, quote expiry server time, quote deletion
 * guards, email circuit breaker, Stripe signature verification, follow-up
 * dedup, geocoding timeout, and recipe schema validation.
 *
 * All questions passed structural review. Geocodio silent catches fixed.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q151: CreateEventSchema validates guest_count as positive integer
test('Q151: event guest_count validated as positive integer', () => {
  const src = readFile('lib/events/actions.ts')
  expect(src).toContain('guest_count: z.number().int().positive()')
})

// Q152: Quote expiry uses server-side new Date(), not client time
test('Q152: quote expiry comparison uses server time', () => {
  const src = readFile('lib/quotes/client-actions.ts')
  expect(src).toContain('new Date(preCheck.valid_until) < new Date()')
})

// Q153: deleteQuote rejects non-draft quotes
test('Q153: deleteQuote only allows draft status deletion', () => {
  const src = readFile('lib/quotes/actions.ts')
  const fn = src.slice(src.indexOf('export async function deleteQuote'))
  expect(fn).toContain("quote.status !== 'draft'")
  expect(fn).toContain('Can only delete quotes in draft status')
  // Soft delete, not hard delete
  expect(fn).toContain('deleted_at')
})

// Q155: Email send uses circuit breaker on Resend
test('Q155: email send wraps Resend in circuit breaker', () => {
  const src = readFile('lib/email/send.ts')
  expect(src).toContain('breakers.resend.execute')
  expect(src).toContain('getResendClient')
})

// Q156: Stripe webhook verifies signature before processing
test('Q156: Stripe webhook validates signature with constructEvent', () => {
  const src = readFile('app/api/webhooks/stripe/route.ts')
  expect(src).toContain('stripe-signature')
  expect(src).toContain('stripe.webhooks.constructEvent')
  expect(src).toContain('webhookSecret')
})

// Q158: Recipe parser validates AI output with Zod schema
test('Q158: recipe parser uses ParsedRecipeSchema for AI output validation', () => {
  const src = readFile('lib/ai/parse-recipe.ts')
  expect(src).toContain('ParsedRecipeSchema')
  expect(src).toContain('parseWithOllama')
})

// Q159: Follow-up sequence prevents duplicate scheduling
test('Q159: schedulePostEventFollowUp checks for existing sends before creating', () => {
  const src = readFile('lib/follow-up/sequence-engine.ts')
  expect(src).toContain('Check if sends already exist')
  expect(src).toContain("count: 'exact'")
  expect(src).toContain('Follow-up already scheduled')
})

// Q160: Geocoding has timeout and returns null on failure
test('Q160: geocodeAddress has 5s timeout and graceful failure', () => {
  const src = readFile('lib/geo/geocodio.ts')
  // Forward geocode timeout
  expect(src).toContain('AbortSignal.timeout(5_000)')
  // Batch geocode longer timeout
  expect(src).toContain('AbortSignal.timeout(30_000)')
  // Returns null on failure, not throws
  expect(src).toContain('return null')
})
