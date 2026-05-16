import test from 'node:test'
import assert from 'node:assert/strict'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import {
  assembleGodModeRail,
  extractStrip,
  applyEscalation,
  dedupeOperatingLoopItems,
  getOperatingLoopScore,
} from '@/lib/discovery/god-mode-assembly'

const now = new Date('2026-05-14T12:00:00.000Z')

const items: GodModeResolvedItem[] = [
  {
    definitionId: 'chef.inquiry_new',
    tier: 'p0',
    label: 'Sarah inquiry',
    context: 'Birthday',
    destination: '/chef/inquiries/1',
    score: 90,
  },
  {
    definitionId: 'chef.event_this_week',
    tier: 'p2',
    label: 'Henderson Sat',
    context: '8 guests',
    destination: '/chef/events/1',
    score: 70,
  },
  {
    definitionId: 'chef.message_new',
    tier: 'p1',
    label: '2 unread Maria',
    context: 'Allergy',
    destination: '/chef/messages/1',
    score: 80,
  },
  {
    definitionId: 'chef.quote_sent',
    tier: 'p1',
    label: 'Patel quote',
    context: 'Expiring',
    destination: '/chef/quotes/1',
    score: 60,
  },
]

test('assembleGodModeRail groups items by tier', () => {
  const result = assembleGodModeRail(items, new Set(), now)
  assert.equal(result.tiers.p0.length, 1)
  assert.equal(result.tiers.p1.length, 2)
  assert.equal(result.tiers.p2.length, 1)
  assert.equal(result.tiers.p3.length, 0)
  assert.equal(result.tiers.p4.length, 0)
  assert.equal(result.totalItems, 4)
})

test('assembleGodModeRail sorts within tier by score descending', () => {
  const result = assembleGodModeRail(items, new Set(), now)
  assert.equal(result.tiers.p1[0].label, '2 unread Maria') // score 80
  assert.equal(result.tiers.p1[1].label, 'Patel quote') // score 60
})

test('assembleGodModeRail filters dismissed items', () => {
  const dismissed = new Set(['chef.inquiry_new'])
  const result = assembleGodModeRail(items, dismissed, now)
  assert.equal(result.tiers.p0.length, 0)
  assert.equal(result.totalItems, 3)
})

test('applyEscalation bumps tier when escalatesAt is past', () => {
  const item: GodModeResolvedItem = {
    definitionId: 'chef.quote_sent',
    tier: 'p2',
    label: 'Quote',
    context: 'Expiring',
    destination: '/q/1',
    escalatesAt: new Date('2026-05-14T10:00:00.000Z'), // 2h ago
  }
  const escalated = applyEscalation(item, now)
  assert.equal(escalated.tier, 'p1') // Bumped one level
})

test('applyEscalation does not bump P0 (already highest)', () => {
  const item: GodModeResolvedItem = {
    definitionId: 'chef.inquiry_new',
    tier: 'p0',
    label: 'Urgent',
    context: 'Very urgent',
    destination: '/i/1',
    escalatesAt: new Date('2026-05-13T00:00:00.000Z'),
  }
  const escalated = applyEscalation(item, now)
  assert.equal(escalated.tier, 'p0')
})

test('applyEscalation leaves item unchanged when escalatesAt is future', () => {
  const item: GodModeResolvedItem = {
    definitionId: 'chef.event_this_week',
    tier: 'p2',
    label: 'Event',
    context: 'Upcoming',
    destination: '/e/1',
    escalatesAt: new Date('2026-05-16T00:00:00.000Z'), // 2 days from now
  }
  const result = applyEscalation(item, now)
  assert.equal(result.tier, 'p2')
})

test('extractStrip returns max 5 P0/P1 items', () => {
  const manyItems: GodModeResolvedItem[] = Array.from({ length: 10 }, (_, i) => ({
    definitionId: `chef.item_${i}`,
    tier: 'p1' as const,
    label: `Item ${i}`,
    context: 'ctx',
    destination: `/item/${i}`,
    score: 100 - i,
  }))
  const strip = extractStrip(manyItems, now)
  assert.equal(strip.items.length, 5)
  assert.equal(strip.hasP0, false)
})

test('extractStrip sets hasP0 when P0 items exist', () => {
  const strip = extractStrip(items, now)
  assert.equal(strip.hasP0, true)
  assert.equal(strip.totalUrgent, 3) // 1 P0 + 2 P1
})

test('operating-loop score lifts due waiting items with proof and next action', () => {
  const base: GodModeResolvedItem = {
    definitionId: 'chef.task_waiting',
    tier: 'p1',
    label: 'Vendor COI',
    context: 'Waiting on vendor',
    destination: '/vendors/acme',
    loopState: 'waiting',
    sourceKind: 'vendor',
    evidenceLabel: 'computed',
    confidence: 0.8,
    proofHref: '/vendors/acme',
    nextAction: 'Follow up with vendor',
    waitingOn: {
      kind: 'vendor',
      label: 'COI from Acme',
      followUpAt: '2026-05-14T10:00:00.000Z',
    },
  }

  const lower: GodModeResolvedItem = {
    ...base,
    definitionId: 'chef.task_note',
    loopState: 'active',
    evidenceLabel: 'unknown',
    confidence: null,
    proofHref: null,
    nextAction: null,
    waitingOn: null,
  }

  assert.ok(getOperatingLoopScore(base, now) > getOperatingLoopScore(lower, now))
})

test('assembleGodModeRail dedupes overlapping resolver memories and keeps stronger item', () => {
  const result = assembleGodModeRail(
    [
      {
        definitionId: 'chef.waiting_inquiry',
        tier: 'p1',
        label: 'Mina reply waiting',
        context: 'Waiting on client',
        destination: '/inquiries/inq-1',
        sourceKind: 'inquiry',
        loopState: 'waiting',
        evidenceLabel: 'computed',
        score: 40,
        nextAction: 'Follow up',
        waitingOn: {
          kind: 'reply',
          label: 'Client reply',
          followUpAt: '2026-05-14T09:00:00.000Z',
        },
        data: { sourceId: 'inq-1' },
      },
      {
        definitionId: 'chef.inquiry_awaiting_client',
        tier: 'p2',
        label: 'Mina inquiry',
        context: 'Private dinner',
        destination: '/inquiries/inq-1',
        sourceKind: 'inquiry',
        loopState: 'active',
        evidenceLabel: 'confirmed',
        score: 50,
        proofHref: '/inquiries/inq-1',
        data: { sourceId: 'inq-1' },
      },
    ],
    new Set(),
    now
  )

  assert.equal(result.totalItems, 1)
  assert.equal(result.tiers.p1.length, 1)
  assert.equal(result.tiers.p1[0].definitionId, 'chef.waiting_inquiry')
  assert.equal(result.tiers.p1[0].proofHref, '/inquiries/inq-1')
  assert.deepEqual(result.tiers.p1[0].data?.duplicateDefinitionIds, [
    'chef.inquiry_awaiting_client',
  ])
})

test('dedupeOperatingLoopItems preserves distinct source entities on the same route shell', () => {
  const result = dedupeOperatingLoopItems(
    [
      {
        definitionId: 'chef.message_a',
        tier: 'p1',
        label: 'A',
        context: 'A',
        destination: '/messages',
        sourceKind: 'message',
        data: { sourceId: 'thread-a' },
      },
      {
        definitionId: 'chef.message_b',
        tier: 'p1',
        label: 'B',
        context: 'B',
        destination: '/messages',
        sourceKind: 'message',
        data: { sourceId: 'thread-b' },
      },
    ],
    now
  )

  assert.equal(result.length, 2)
})
