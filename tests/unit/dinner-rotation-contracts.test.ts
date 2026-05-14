import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRebookingIntelligence,
  rankDinnerRotationCandidates,
} from '@/lib/dinner-circles/rotation-memory-contract'

test('rotation memory penalizes recent dinner repeats while keeping fresh options first', () => {
  const ranked = rankDinnerRotationCandidates(
    [
      {
        id: 'same-pasta',
        mode: 'eat_in',
        cuisine: 'Italian',
        conceptKey: 'cozy-pasta',
        menuId: 'menu-1',
        baseScore: 0.9,
      },
      {
        id: 'nordic-market',
        mode: 'eat_in',
        cuisine: 'Nordic',
        conceptKey: 'market-vegetables',
        menuId: 'menu-2',
        baseScore: 0.82,
      },
    ],
    [
      {
        id: 'last-night',
        mode: 'eat_in',
        cuisine: 'Italian',
        conceptKey: 'cozy-pasta',
        menuId: 'menu-1',
        occurredAt: '2026-05-10T20:00:00.000Z',
        enjoyed: true,
      },
    ],
    { now: '2026-05-13T12:00:00.000Z', cooldownDays: 14 }
  )

  assert.equal(ranked[0]?.id, 'nordic-market')
  assert.ok(ranked[1]?.reasonCodes.includes('recent_concept_repeat'))
  assert.ok((ranked[1]?.repeatPenalty ?? 0) > 0.4)
})

test('rotation memory lets favorites soften but not erase cooldown penalties', () => {
  const [ranked] = rankDinnerRotationCandidates(
    [
      {
        id: 'favorite-tacos',
        mode: 'eat_out',
        cuisine: 'Mexican',
        conceptKey: 'tacos',
        operatorId: 'op-1',
        baseScore: 0.9,
      },
    ],
    [
      {
        id: 'recent',
        mode: 'eat_out',
        cuisine: 'Mexican',
        conceptKey: 'tacos',
        operatorId: 'op-1',
        occurredAt: '2026-05-12T20:00:00.000Z',
        enjoyed: true,
      },
    ],
    { now: '2026-05-13T12:00:00.000Z', favoriteCandidateIds: ['favorite-tacos'] }
  )

  assert.ok(ranked.reasonCodes.includes('favorite_softens_cooldown'))
  assert.ok(ranked.repeatPenalty > 0)
  assert.ok(ranked.freshnessScore < 0.9)
})

test('rebooking intelligence brings back positive experiences in useful variants', () => {
  const intelligence = buildRebookingIntelligence({
    targetGroupSize: 10,
    previous: {
      id: 'past-event',
      mode: 'eat_out',
      cuisine: 'Thai',
      conceptKey: 'northern-thai-family-style',
      chefId: 'chef-1',
      menuId: 'menu-1',
      occurredAt: '2026-03-01T19:00:00.000Z',
      enjoyed: true,
    },
  })

  assert.equal(intelligence.status, 'ready')
  assert.equal(intelligence.blockers.length, 0)
  assert.ok(
    intelligence.options.some((option) => option.intent === 'same_chef' && option.available)
  )
  assert.ok(
    intelligence.options.some(
      (option) => option.intent === 'larger_group_version' && option.available
    )
  )
})

test('rebooking intelligence blocks repeat prompts after a negative experience', () => {
  const intelligence = buildRebookingIntelligence({
    previous: {
      id: 'bad-fit',
      mode: 'eat_out',
      cuisine: 'French',
      conceptKey: 'bistro-night',
      occurredAt: '2026-04-01T19:00:00.000Z',
      enjoyed: false,
    },
  })

  assert.equal(intelligence.status, 'blocked')
  assert.deepEqual(intelligence.blockers, ['previous_experience_not_positive'])
})
