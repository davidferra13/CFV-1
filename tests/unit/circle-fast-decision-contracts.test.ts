import test from 'node:test'
import assert from 'node:assert/strict'

import { rankCircleFastDecisionCandidates } from '@/lib/hub/circle-fast-decision-contracts'
import {
  buildCircleTasteMemorySummary,
  type CircleMemoryEvent,
} from '@/lib/hub/circle-memory-contracts'

const memoryEvents: CircleMemoryEvent[] = [
  {
    id: 'a-like-thai',
    circleId: 'circle-1',
    memberId: 'a',
    targetType: 'restaurant',
    targetId: 'thai-1',
    label: 'Thai',
    kind: 'liked',
    occurredAt: '2026-05-01T00:00:00.000Z',
    visibility: 'circle_shared',
  },
  {
    id: 'b-like-thai',
    circleId: 'circle-1',
    memberId: 'b',
    targetType: 'restaurant',
    targetId: 'thai-1',
    label: 'Thai',
    kind: 'liked',
    occurredAt: '2026-05-01T00:00:00.000Z',
    visibility: 'circle_shared',
  },
  {
    id: 'usual-thai',
    circleId: 'circle-1',
    memberId: 'a',
    targetType: 'restaurant',
    targetId: 'thai-1',
    label: 'Thai',
    kind: 'usual_rotation',
    occurredAt: '2026-05-03T00:00:00.000Z',
    visibility: 'circle_shared',
  },
  {
    id: 'recent-thai',
    circleId: 'circle-1',
    memberId: 'a',
    targetType: 'restaurant',
    targetId: 'thai-1',
    label: 'Thai',
    kind: 'final_pick',
    occurredAt: '2026-05-12T00:00:00.000Z',
    visibility: 'circle_shared',
  },
  {
    id: 'never-sushi',
    circleId: 'circle-1',
    memberId: 'b',
    targetType: 'restaurant',
    targetId: 'sushi-1',
    label: 'Sushi',
    kind: 'never_again',
    occurredAt: '2026-05-10T00:00:00.000Z',
    visibility: 'circle_shared',
  },
]

const memory = buildCircleTasteMemorySummary({
  circleId: 'circle-1',
  memberIds: ['a', 'b'],
  events: memoryEvents,
  now: '2026-05-13T00:00:00.000Z',
})

test('safe pick can keep a usual rotation while suppressing never-again choices', () => {
  const result = rankCircleFastDecisionCandidates({
    mode: 'safe_pick',
    memory,
    candidates: [
      {
        id: 'thai-1',
        label: 'Thai',
        targetType: 'restaurant',
        openNow: true,
        reactionScore: 0.4,
        distanceMinutes: 12,
      },
      {
        id: 'sushi-1',
        label: 'Sushi',
        targetType: 'restaurant',
        openNow: true,
        reactionScore: 1,
      },
    ],
  })

  assert.deepEqual(result.candidateIds, ['thai-1'])
  assert.match(result.reasonsByCandidateId['thai-1'].join(' '), /liked this before/)
})

test('something-new mode ranks fresh candidates over recent repeats', () => {
  const result = rankCircleFastDecisionCandidates({
    mode: 'something_new',
    memory,
    candidates: [
      {
        id: 'thai-1',
        label: 'Thai',
        targetType: 'restaurant',
        openNow: true,
        noveltyScore: 0.1,
        reactionScore: 0.8,
      },
      {
        id: 'ethiopian-1',
        label: 'Ethiopian',
        targetType: 'restaurant',
        openNow: true,
        noveltyScore: 0.95,
        reactionScore: 0.2,
      },
    ],
  })

  assert.equal(result.candidateIds[0], 'ethiopian-1')
  assert.match(result.reasonsByCandidateId['ethiopian-1'].join(' '), /New for this circle/)
})

test('fast decision modes return useful empty states when options are unavailable', () => {
  const result = rankCircleFastDecisionCandidates({
    mode: 'fastest_option',
    candidates: [
      {
        id: 'closed-1',
        label: 'Closed',
        targetType: 'restaurant',
        openNow: false,
        distanceMinutes: 4,
      },
    ],
  })

  assert.deepEqual(result.candidateIds, [])
  assert.match(result.emptyState ?? '', /No circle-ready options/)
})
