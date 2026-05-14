import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCircleReadinessSummary,
  buildCircleTransparencyStream,
  resolveVisibleMemberSignal,
  type CircleActivityEvent,
  type CircleMemberRef,
} from '@/lib/hub/circle-transparency-events'

const members: CircleMemberRef[] = [
  { memberId: 'a', role: 'host' },
  { memberId: 'b', role: 'member' },
]

test('circle transparency redacts private browsing and share-saves-only browsing', () => {
  const events: CircleActivityEvent[] = [
    {
      id: 'private-view',
      circleId: 'circle-1',
      memberId: 'a',
      kind: 'open_restaurant',
      sharingMode: 'private_browsing',
      restaurantId: 'rest-private',
      occurredAt: '2026-05-13T01:00:00.000Z',
    },
    {
      id: 'implicit-view',
      circleId: 'circle-1',
      memberId: 'a',
      kind: 'open_restaurant',
      sharingMode: 'share_saves_only',
      restaurantId: 'rest-hidden',
      occurredAt: '2026-05-13T01:01:00.000Z',
    },
    {
      id: 'save',
      circleId: 'circle-1',
      memberId: 'a',
      kind: 'save',
      sharingMode: 'share_saves_only',
      restaurantId: 'rest-shared',
      note: "I'd get this",
      occurredAt: '2026-05-13T01:02:00.000Z',
    },
  ]

  const stream = buildCircleTransparencyStream({
    circleId: 'circle-1',
    viewerId: 'b',
    members,
    events,
  })

  assert.equal(stream.viewerCanRead, true)
  assert.equal(stream.visibleEvents.length, 1)
  assert.equal(stream.visibleEvents[0].restaurantId, 'rest-shared')
  assert.equal(stream.visibleEvents[0].note, "I'd get this")
  assert.equal(stream.redactedEventCount, 2)
})

test('non-members cannot read circle activity', () => {
  const signal = resolveVisibleMemberSignal({
    viewerId: 'x',
    members,
    event: {
      id: 'share',
      circleId: 'circle-1',
      memberId: 'a',
      kind: 'send_item',
      sharingMode: 'sharing_live',
      restaurantId: 'rest-1',
      occurredAt: '2026-05-13T01:00:00.000Z',
    },
  })

  assert.equal(signal.visible, false)
  assert.equal(signal.reason, 'viewer_not_member')
})

test('readiness summary exposes notification and Remy mechanic for missing votes', () => {
  const summary = buildCircleReadinessSummary({
    memberIds: ['a', 'b', 'c'],
    respondedMemberIds: ['a'],
    candidateCount: 4,
    actorRole: 'host',
  })

  assert.equal(summary.ready, false)
  assert.deepEqual(summary.missingMemberIds, ['b', 'c'])
  assert.equal(summary.suggestedMechanic.mechanic, 'missing_vote_reminder')
  assert.equal(summary.notification.level, 'nudge')
})

test('disconnected streams keep latest shared activity with a fallback label', () => {
  const stream = buildCircleTransparencyStream({
    circleId: 'circle-1',
    viewerId: 'b',
    members,
    realtimeConnected: false,
    events: [
      {
        id: 'share',
        circleId: 'circle-1',
        memberId: 'a',
        kind: 'send_item',
        sharingMode: 'sharing_live',
        restaurantId: 'rest-1',
        occurredAt: '2026-05-13T01:00:00.000Z',
      },
    ],
  })

  assert.equal(stream.disconnected, true)
  assert.match(stream.fallbackLabel ?? '', /Live updates paused/)
  assert.equal(stream.visibleEvents.length, 1)
})
