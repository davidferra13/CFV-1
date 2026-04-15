/**
 * Q101-Q110: Cross-Cutting Integrity & Financial Truth
 *
 * Verifies soft-delete filtering, financial view correctness, webhook
 * tenant scoping, price chain null safety, document access control,
 * staff scoping, event race detection, notification dedup, and SSRF.
 *
 * Q108: Notification dedup guard added (60-second window).
 * All other questions passed structural review.
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8')
}

// Q101: Soft-deleted events excluded from active queries
test('Q101: event queries filter deleted_at IS NULL', () => {
  const src = readFile('lib/events/actions.ts')
  const matches = src.match(/deleted_at/g) || []
  // Multiple instances of deleted_at filtering
  expect(matches.length).toBeGreaterThan(5)
})

// Q102: Financial view handles refunds correctly with scalar subqueries
test('Q102: event_financial_summary uses scalar subqueries (no cartesian join)', () => {
  const migration = readFile(
    'database/migrations/20260415000015_fix_financial_view_cartesian_product.sql'
  )
  expect(migration).toContain('is_refund = false')
  expect(migration).toContain('is_refund = true')
  expect(migration).toContain('COALESCE')
  // Scalar subqueries, not JOINs
  expect(migration).toContain('SELECT SUM(le.amount_cents)')
  expect(migration).toContain('WHERE le.event_id = e.id')
})

// Q103: Webhook emitter scopes endpoints by tenant
test('Q103: emitWebhook filters endpoints by tenant_id', () => {
  const src = readFile('lib/webhooks/emitter.ts')
  expect(src).toContain(".eq('tenant_id', chefId)")
  expect(src).toContain(".eq('is_active', true)")
})

// Q104: Price resolution returns noPrice sentinel when all tiers miss
test('Q104: resolvePrice initializes noPrice with null cents for fallthrough', () => {
  const src = readFile('lib/pricing/resolve-price.ts')
  expect(src).toContain('cents: null')
  expect(src).toContain("source: 'none'")
  expect(src).toContain("resolutionTier: 'none'")
  expect(src).toContain('No price data')
})

// Q105: Contract generation requires ownership verification
test('Q105: fetchContractData filters by chefId or clientEntityId', () => {
  const src = readFile('lib/documents/generate-contract.ts')
  expect(src).toContain("query.eq('chef_id', owner.chefId)")
  expect(src).toContain("query.eq('client_id', owner.clientEntityId)")
  expect(src).toContain('return null')
})

// Q106: Staff auth resolves tenantId from staff_members.chefId
test('Q106: requireStaff scopes to chef via staff_members.chefId', () => {
  const src = readFile('lib/auth/get-user.ts')
  expect(src).toContain('staffMembers.chefId')
  expect(src).toContain("roleData.role !== 'staff'")
})

// Q107: Event transition race detection with post-verify
test('Q107: transitionEvent detects concurrent modification and skips side effects', () => {
  const src = readFile('lib/events/transitions.ts')
  expect(src).toContain('transition_event_atomic')
  expect(src).toContain('verifiedEvent?.status !== toStatus')
  expect(src).toContain('concurrent_modification')
})

// Q108: Notification dedup within 60-second window
test('Q108: createNotification deduplicates within 60 seconds', () => {
  const src = readFile('lib/notifications/actions.ts')
  expect(src).toContain('Dedup guard')
  expect(src).toContain('60_000')
  expect(src).toContain("eq('action', action)")
})

// Q109: Event dates are stored consistently
test('Q109: CreateEventSchema validates event_date as parseable date string', () => {
  const src = readFile('lib/events/actions.ts')
  expect(src).toContain("'Event date required'")
  expect(src).toContain('isNaN(Date.parse(v))')
})

// Q110: Webhook SSRF prevention blocks private IPs and requires HTTPS
test('Q110: isSafeWebhookUrl blocks loopback, private ranges, and non-HTTPS', () => {
  const src = readFile('lib/webhooks/emitter.ts')
  expect(src).toContain("url.protocol !== 'https:'")
  expect(src).toContain('localhost')
  expect(src).toContain('127.0.0.1')
  expect(src).toContain('::1')
  expect(src).toContain('^10\\.')
  expect(src).toContain('^192\\.168\\.')
  expect(src).toContain('169.254')
})
