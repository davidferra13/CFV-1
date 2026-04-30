import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BreadcrumbSession } from '@/lib/activity/breadcrumb-types'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'
import type { ActivityEvent } from '@/lib/activity/types'
import { buildChefFlowReplay } from '@/lib/activity/replay-model'

const now = new Date('2026-04-29T18:00:00-04:00')

test('buildChefFlowReplay groups loaded activity into replay periods', () => {
  const replay = buildChefFlowReplay({
    now,
    resumeItems: [],
    breadcrumbSessions: [],
    chefActivity: [
      chefEntry('chef-today', 'event', 'Updated Smith dinner', '2026-04-29T14:00:00-04:00'),
      chefEntry('chef-yesterday', 'client', 'Added client note', '2026-04-28T14:00:00-04:00'),
      chefEntry('chef-week', 'quote', 'Sent quote', '2026-04-26T14:00:00-04:00'),
      chefEntry('chef-old', 'quote', 'Old quote', '2026-04-12T14:00:00-04:00'),
    ],
    clientActivity: [
      clientEvent('client-today', 'proposal_viewed', '2026-04-29T15:00:00-04:00'),
      clientEvent('client-week', 'payment_page_visited', '2026-04-25T15:00:00-04:00'),
    ],
  })

  assert.equal(replay.periods[0].id, 'today')
  assert.equal(replay.periods[0].chefActionCount, 1)
  assert.equal(replay.periods[0].clientSignalCount, 1)
  assert.equal(replay.periods[1].id, 'yesterday')
  assert.equal(replay.periods[1].chefActionCount, 1)
  assert.equal(replay.periods[2].id, 'earlier-week')
  assert.equal(replay.periods[2].chefActionCount, 1)
  assert.equal(replay.periods[2].clientSignalCount, 1)
})

test('buildChefFlowReplay exposes resume and retrace counts without inventing rows', () => {
  const replay = buildChefFlowReplay({
    now,
    chefActivity: [],
    clientActivity: [],
    resumeItems: [
      {
        id: 'event-1',
        type: 'event',
        title: 'Smith dinner',
        subtitle: 'May 1',
        status: 'confirmed',
        statusColor: 'green',
        href: '/events/event-1',
        context: {},
      },
    ],
    breadcrumbSessions: [breadcrumbSession('session-1')],
  })

  assert.equal(replay.resumeCount, 1)
  assert.equal(replay.retraceSessionCount, 1)
  assert.equal(
    replay.periods.every((period) => period.items.length === 0),
    true
  )
})

test('buildChefFlowReplay creates entity links from real entity ids only', () => {
  const replay = buildChefFlowReplay({
    now,
    resumeItems: [],
    breadcrumbSessions: [],
    clientActivity: [clientEvent('client-1', 'quote_viewed', '2026-04-29T15:00:00-04:00')],
    chefActivity: [
      chefEntry('chef-1', 'event', 'Updated event', '2026-04-29T14:00:00-04:00', 'event-1'),
      chefEntry('chef-2', 'event', 'Unlinked update', '2026-04-29T13:00:00-04:00', null),
    ],
  })

  const hrefs = replay.periods[0].items.map((item) => item.href)
  assert.ok(hrefs.includes('/events/event-1'))
  assert.ok(hrefs.includes(null))
})

test('buildChefFlowReplay builds action inbox, client scores, drafts, rules, and audit trail', () => {
  const replay = buildChefFlowReplay({
    now,
    resumeItems: [
      {
        id: 'quote-1',
        type: 'quote',
        title: 'Taylor proposal',
        subtitle: 'Wedding dinner',
        status: 'draft',
        statusColor: 'purple',
        href: '/quotes/quote-1',
        context: {},
      },
    ],
    breadcrumbSessions: [breadcrumbSession('session-1')],
    chefActivity: [
      chefEntry('chef-1', 'event', 'Updated guest count', '2026-04-29T14:00:00-04:00', 'event-1'),
      chefEntry('chef-2', 'event', 'Updated menu status', '2026-04-29T15:00:00-04:00', 'event-1'),
      chefEntry(
        'chef-3',
        'scheduling',
        'Updated prep block',
        '2026-04-29T16:00:00-04:00',
        'event-1'
      ),
    ],
    clientActivity: [
      clientEvent('client-1', 'payment_page_visited', '2026-04-29T15:00:00-04:00'),
      clientEvent('client-2', 'proposal_viewed', '2026-04-29T15:30:00-04:00'),
    ],
  })

  assert.ok(replay.actionDigest.some((action) => action.category === 'money'))
  assert.equal(replay.clientSignalScores[0]?.score, 68)
  assert.equal(replay.followUpDrafts.length > 0, true)
  assert.ok(replay.rules.some((rule) => rule.id === 'rule-money' && rule.matchCount === 1))
  assert.equal(replay.auditTrail[0]?.actionLabel, 'Catch Up generated')
  assert.ok(replay.catchUpDigest.body.includes('Priority actions'))
  assert.ok(replay.handoff.body.includes('Team handoff'))
})

test('buildChefFlowReplay detects readiness impacts and repeated entity change cards', () => {
  const replay = buildChefFlowReplay({
    now,
    resumeItems: [
      {
        id: 'event-1',
        type: 'event',
        title: 'Smith dinner',
        subtitle: 'May 1',
        status: 'confirmed',
        statusColor: 'green',
        href: '/events/event-1',
        context: {},
      },
    ],
    breadcrumbSessions: [],
    clientActivity: [],
    chefActivity: [
      chefEntry('chef-1', 'event', 'Updated timeline', '2026-04-29T12:00:00-04:00', 'event-1'),
      chefEntry('chef-2', 'event', 'Updated guest count', '2026-04-29T13:00:00-04:00', 'event-1'),
      chefEntry(
        'chef-3',
        'operational',
        'Packing status updated',
        '2026-04-29T14:00:00-04:00',
        'event-1'
      ),
    ],
  })

  assert.ok(replay.readinessImpacts.some((impact) => impact.id === 'readiness-active-events'))
  assert.equal(replay.changeDiffCards.length, 1)
  assert.equal(replay.changeDiffCards[0]?.beforeLabel, 'Updated timeline')
  assert.equal(replay.changeDiffCards[0]?.afterLabel, 'Packing status updated')
})

function chefEntry(
  id: string,
  domain: ChefActivityEntry['domain'],
  summary: string,
  createdAt: string,
  entityId: string | null = id
): ChefActivityEntry {
  return {
    id,
    tenant_id: 'tenant-1',
    actor_id: 'chef-1',
    action: 'event_updated',
    domain,
    entity_type: domain === 'client' ? 'client' : domain === 'quote' ? 'quote' : 'event',
    entity_id: entityId,
    summary,
    context: {},
    client_id: null,
    created_at: createdAt,
  }
}

function clientEvent(
  id: string,
  eventType: ActivityEvent['event_type'],
  createdAt: string
): ActivityEvent {
  return {
    id,
    tenant_id: 'tenant-1',
    actor_type: 'client',
    actor_id: 'client-1',
    client_id: 'client-1',
    event_type: eventType,
    entity_type: 'event',
    entity_id: 'event-1',
    metadata: { client_name: 'Taylor Client' },
    ip_hash: null,
    user_agent: null,
    created_at: createdAt,
  } as ActivityEvent
}

function breadcrumbSession(id: string): BreadcrumbSession {
  return {
    session_id: id,
    started_at: '2026-04-29T14:00:00-04:00',
    ended_at: '2026-04-29T14:05:00-04:00',
    duration_minutes: 5,
    breadcrumbs: [],
    page_count: 2,
    summary: 'Dashboard > Events',
  }
}
