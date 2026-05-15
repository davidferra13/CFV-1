import test from 'node:test'
import assert from 'node:assert/strict'
import type { GodModeResolverContext } from '@/lib/discovery/god-mode-types'

import {
  assignInquiryTier,
  buildInquiryLabel,
  type InquiryRow,
} from '@/lib/discovery/resolvers/chef/inquiry-resolver'

const now = new Date('2026-05-14T12:00:00.000Z')

const baseInquiry: InquiryRow = {
  id: 'inq-1',
  status: 'new',
  created_at: '2026-05-14T10:00:00.000Z',
  last_response_at: null,
  confirmed_guest_count: 12,
  confirmed_occasion: 'Birthday Dinner',
  confirmed_date: '2026-06-14',
  confirmed_location: 'Cape Cod',
  client_name: 'Sarah B.',
  client: { id: 'c-1', full_name: 'Sarah Brown', email: 'sarah@test.com' },
}

test('new inquiry no response > 48h is P0', () => {
  const old = {
    ...baseInquiry,
    created_at: '2026-05-12T10:00:00.000Z',
  }
  assert.equal(assignInquiryTier(old, now), 'p0')
})

test('new inquiry no response > 24h is P1', () => {
  const dayOld = {
    ...baseInquiry,
    created_at: '2026-05-13T10:00:00.000Z',
  }
  assert.equal(assignInquiryTier(dayOld, now), 'p1')
})

test('new inquiry today is P1', () => {
  assert.equal(assignInquiryTier(baseInquiry, now), 'p1')
})

test('awaiting_client is P2', () => {
  const waiting = {
    ...baseInquiry,
    status: 'awaiting_client' as const,
    last_response_at: '2026-05-14T09:00:00.000Z',
  }
  assert.equal(assignInquiryTier(waiting, now), 'p2')
})

test('awaiting_chef no response > 48h is P0', () => {
  const stale = {
    ...baseInquiry,
    status: 'awaiting_chef' as const,
    created_at: '2026-05-11T10:00:00.000Z',
    last_response_at: null,
  }
  assert.equal(assignInquiryTier(stale, now), 'p0')
})

test('confirmed/declined/expired returns null (no emit)', () => {
  for (const status of ['confirmed', 'declined', 'expired'] as const) {
    const closed = { ...baseInquiry, status }
    assert.equal(assignInquiryTier(closed, now), null)
  }
})

test('buildInquiryLabel creates dense God Mode label', () => {
  const label = buildInquiryLabel(baseInquiry, now)
  assert.ok(label.includes('Sarah B.'))
  assert.ok(label.includes('12'))
  assert.ok(label.includes('Jun 14'))
  assert.ok(label.includes('Cape Cod'))
})
