import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContinuityDigest, isContinuityDigestPrompt } from '@/lib/activity/continuity-digest'
import type { BreadcrumbEntry } from '@/lib/activity/breadcrumb-types'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'

function breadcrumb(input: {
  id: string
  sessionId: string
  path: string
  createdAt: string
}): BreadcrumbEntry {
  return {
    id: input.id,
    tenant_id: 'tenant-1',
    actor_id: 'chef-1',
    breadcrumb_type: 'page_view',
    path: input.path,
    label: null,
    referrer_path: null,
    metadata: {},
    session_id: input.sessionId,
    created_at: input.createdAt,
  }
}

function activity(input: { id: string; summary: string; createdAt: string }): ChefActivityEntry {
  return {
    id: input.id,
    tenant_id: 'tenant-1',
    actor_id: 'chef-1',
    action: 'event_updated',
    domain: 'event',
    entity_type: 'event',
    entity_id: 'event-1',
    summary: input.summary,
    context: {},
    client_id: null,
    created_at: input.createdAt,
  }
}

test('continuity digest uses the previous session end as the absence cutoff', () => {
  const digest = buildContinuityDigest({
    now: new Date('2026-04-29T16:00:00.000Z'),
    breadcrumbs: [
      breadcrumb({
        id: 'old',
        sessionId: 'previous',
        path: '/events',
        createdAt: '2026-04-29T10:00:00.000Z',
      }),
      breadcrumb({
        id: 'current',
        sessionId: 'current',
        path: '/activity',
        createdAt: '2026-04-29T15:50:00.000Z',
      }),
    ],
    activities: [
      activity({
        id: 'before',
        summary: 'Old update',
        createdAt: '2026-04-29T09:59:00.000Z',
      }),
      activity({
        id: 'after',
        summary: 'Event facts changed',
        createdAt: '2026-04-29T11:00:00.000Z',
      }),
    ],
  })

  assert.equal(digest.cutoff, '2026-04-29T10:00:00.000Z')
  assert.equal(digest.cutoffSource, 'previous_session')
  assert.equal(digest.activityCount, 1)
  assert.equal(digest.activities[0].summary, 'Event facts changed')
})

test('continuity digest falls back to a time window without session history', () => {
  const digest = buildContinuityDigest({
    now: new Date('2026-04-29T16:00:00.000Z'),
    fallbackHours: 24,
    breadcrumbs: [],
    activities: [
      activity({
        id: 'after',
        summary: 'Quote sent',
        createdAt: '2026-04-29T15:00:00.000Z',
      }),
    ],
  })

  assert.equal(digest.cutoff, '2026-04-28T16:00:00.000Z')
  assert.equal(digest.cutoffSource, 'fallback_window')
  assert.equal(digest.activityCount, 1)
})

test('continuity digest prompt detection targets catch-up requests', () => {
  assert.equal(isContinuityDigestPrompt('what changed while I was away?'), true)
  assert.equal(isContinuityDigestPrompt('catch me up'), true)
  assert.equal(isContinuityDigestPrompt('how many recipes do I have?'), false)
})
