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

function activity(input: {
  id: string
  summary: string
  createdAt: string
  domain?: ChefActivityEntry['domain']
  entityType?: string
  entityId?: string | null
}): ChefActivityEntry {
  return {
    id: input.id,
    tenant_id: 'tenant-1',
    actor_id: 'chef-1',
    action: 'event_updated',
    domain: input.domain ?? 'event',
    entity_type: input.entityType ?? 'event',
    entity_id: input.entityId === undefined ? 'event-1' : input.entityId,
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
  assert.equal(digest.lastSession?.sessionId, 'previous')
  assert.equal(digest.lastPath, '/events')
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
  assert.equal(digest.loadState, 'available')
  assert.deepEqual(digest.failedSources, [])
})

test('continuity digest prompt detection targets catch-up requests', () => {
  assert.equal(isContinuityDigestPrompt('what changed while I was away?'), true)
  assert.equal(isContinuityDigestPrompt('catch me up'), true)
  assert.equal(isContinuityDigestPrompt('how many recipes do I have?'), false)
})

test('continuity digest summarizes and caps changed entity context deterministically', () => {
  const digest = buildContinuityDigest({
    now: new Date('2026-04-29T16:00:00.000Z'),
    fallbackHours: 24,
    activityLimit: 3,
    entityLimit: 2,
    entityLinkLimit: 2,
    breadcrumbs: [],
    activities: [
      activity({
        id: 'event-old',
        summary: 'Event time changed',
        createdAt: '2026-04-29T10:00:00.000Z',
        entityId: 'event-1',
      }),
      activity({
        id: 'event-new',
        summary: 'Event guest count changed',
        createdAt: '2026-04-29T12:00:00.000Z',
        entityId: 'event-1',
      }),
      activity({
        id: 'client',
        summary: 'Client preference changed',
        createdAt: '2026-04-29T13:00:00.000Z',
        domain: 'client',
        entityType: 'client',
        entityId: 'client-1',
      }),
      activity({
        id: 'quote',
        summary: 'Quote sent',
        createdAt: '2026-04-29T14:00:00.000Z',
        domain: 'quote',
        entityType: 'quote',
        entityId: 'quote-1',
      }),
      activity({
        id: 'generic',
        summary: 'General setting changed',
        createdAt: '2026-04-29T15:00:00.000Z',
        domain: 'settings',
        entityType: 'settings',
        entityId: null,
      }),
    ],
  })

  assert.equal(digest.activityCount, 5)
  assert.equal(digest.activities.length, 3)
  assert.deepEqual(
    digest.topChangedEntities.map((entity) => ({
      entityType: entity.entityType,
      entityId: entity.entityId,
      changeCount: entity.changeCount,
      href: entity.href,
    })),
    [
      {
        entityType: 'event',
        entityId: 'event-1',
        changeCount: 2,
        href: '/events/event-1',
      },
      {
        entityType: 'quote',
        entityId: 'quote-1',
        changeCount: 1,
        href: '/quotes/quote-1',
      },
    ]
  )
  assert.deepEqual(
    digest.changedEntityLinks.map((link) => link.href),
    ['/events/event-1', '/quotes/quote-1']
  )
})

test('continuity digest can represent a degraded load without hiding the failure', () => {
  const digest = buildContinuityDigest({
    now: new Date('2026-04-29T16:00:00.000Z'),
    breadcrumbs: [],
    activities: [],
    loadState: 'degraded',
    failedSources: ['breadcrumbs'],
  })

  assert.equal(digest.loadState, 'degraded')
  assert.deepEqual(digest.failedSources, ['breadcrumbs'])
  assert.equal(digest.activityCount, 0)
  assert.equal(digest.lastSession, null)
  assert.equal(digest.lastPath, null)
})

test('continuity digest can represent an unavailable load without fake activity', () => {
  const digest = buildContinuityDigest({
    now: new Date('2026-04-29T16:00:00.000Z'),
    breadcrumbs: [],
    activities: [],
    loadState: 'unavailable',
    failedSources: ['activity', 'breadcrumbs'],
  })

  assert.equal(digest.loadState, 'unavailable')
  assert.deepEqual(digest.failedSources, ['activity', 'breadcrumbs'])
  assert.equal(digest.activityCount, 0)
  assert.deepEqual(digest.activities, [])
  assert.deepEqual(digest.changedEntityLinks, [])
  assert.deepEqual(digest.topChangedEntities, [])
})
