import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeDecay,
  computeFatigue,
  computePageAffinity,
  computeUniversalRailScore,
  ROLE_WEIGHT_PROFILES,
} from '@/lib/discovery/universal-rail-scoring'
import type { UniversalRailItemDefinition } from '@/lib/discovery/universal-rail-types'

const BASE_DEFINITION: UniversalRailItemDefinition = {
  id: 'test.item',
  role: 'public',
  label: 'Test Item',
  labelTemplate: '{name}',
  category: 'test',
  baseUrgency: 50,
  urgencyDecayFn: 'none',
  relevanceSignals: [],
  freshnessWindow: '24h',
  pageAffinity: '/eat',
  pageAffinityBoost: 15,
  href: '/eat',
  hrefTemplate: '/eat?q={name}',
  dataSources: ['chef_profiles'],
  privacy: 'public',
  dismissable: true,
  expandable: false,
  hoverAction: 'preview',
  clickAction: 'navigate',
  maxImpressions: -1,
  cooldownMinutes: 0,
  renderHints: { presentation: 'pill' },
  scoringNotes: 'test item',
}

describe('computeDecay', () => {
  it('none: returns baseUrgency unchanged', () => {
    assert.equal(computeDecay('none', 80, 1000, 5000), 80)
  })

  it('linear: decreases over time', () => {
    const fresh = computeDecay('linear', 80, 0, 10000)
    const mid = computeDecay('linear', 80, 5000, 10000)
    const old = computeDecay('linear', 80, 10000, 10000)
    assert.ok(fresh > mid, 'fresh should be greater than mid')
    assert.ok(mid > old, 'mid should be greater than old')
    assert.ok(old > 0, 'old should be greater than 0')
  })

  it('deadline: increases as deadline approaches', () => {
    const early = computeDecay('deadline', 80, 0, 10000)
    const late = computeDecay('deadline', 80, 9000, 10000)
    assert.ok(late > early, 'late deadline should have higher urgency')
  })

  it('inverse: increases over time', () => {
    const fresh = computeDecay('inverse', 50, 0, 10000)
    const aged = computeDecay('inverse', 50, 10000, 10000)
    assert.ok(aged > fresh, 'aged inverse should be higher')
  })

  it('step: drops at 50% and 80% thresholds', () => {
    const before50 = computeDecay('step', 100, 4000, 10000)
    const after50 = computeDecay('step', 100, 6000, 10000)
    const after80 = computeDecay('step', 100, 9000, 10000)
    assert.equal(before50, 100)
    assert.equal(after50, 60)
    assert.equal(after80, 30)
  })

  it('handles zero window gracefully', () => {
    assert.equal(computeDecay('linear', 50, 5000, 0), 50)
  })
})

describe('computeFatigue', () => {
  const now = new Date('2026-05-14T12:00:00Z')

  it('returns 0 for unlimited, no-cooldown items', () => {
    assert.equal(computeFatigue(10, -1, 0, null, now), 0)
  })

  it('returns 100 when max impressions reached', () => {
    assert.equal(computeFatigue(10, 10, 0, null, now), 100)
  })

  it('increases fatigue as impressions approach max', () => {
    const low = computeFatigue(2, 10, 0, null, now)
    const high = computeFatigue(8, 10, 0, null, now)
    assert.ok(high > low, 'high impression count should cause more fatigue')
  })

  it('applies cooldown penalty for recently seen items', () => {
    const recentlySeen = new Date('2026-05-14T11:50:00Z')
    const fatigue = computeFatigue(0, -1, 60, recentlySeen, now)
    assert.ok(fatigue > 0, 'recently seen item should have cooldown fatigue')
  })

  it('no cooldown penalty after cooldown expires', () => {
    const longAgo = new Date('2026-05-14T10:00:00Z')
    const fatigue = computeFatigue(0, -1, 60, longAgo, now)
    assert.equal(fatigue, 0)
  })
})

describe('computePageAffinity', () => {
  it('returns full boost on exact match', () => {
    assert.equal(computePageAffinity('/eat', 15, '/eat'), 15)
  })

  it('returns half boost on parent route match', () => {
    assert.equal(computePageAffinity('/eat', 20, '/eat/pizza'), 10)
  })

  it('returns 0 on no match', () => {
    assert.equal(computePageAffinity('/eat', 15, '/chefs'), 0)
  })

  it('returns 0 with no current page', () => {
    assert.equal(computePageAffinity('/eat', 15, null), 0)
  })
})

describe('computeUniversalRailScore', () => {
  const now = new Date('2026-05-14T12:00:00Z')

  it('produces a score between 0 and 100', () => {
    const result = computeUniversalRailScore({
      definition: BASE_DEFINITION,
      weights: ROLE_WEIGHT_PROFILES.public,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 0,
      lastSeenAt: null,
      currentPage: null,
      boostValue: 0,
    })
    assert.ok(result.final >= 0, 'score should be >= 0')
    assert.ok(result.final <= 100, 'score should be <= 100')
  })

  it('higher urgency = higher score', () => {
    const lowUrgency = computeUniversalRailScore({
      definition: { ...BASE_DEFINITION, baseUrgency: 20 },
      weights: ROLE_WEIGHT_PROFILES.chef,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 0,
      lastSeenAt: null,
      currentPage: null,
      boostValue: 0,
    })
    const highUrgency = computeUniversalRailScore({
      definition: { ...BASE_DEFINITION, baseUrgency: 90 },
      weights: ROLE_WEIGHT_PROFILES.chef,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 0,
      lastSeenAt: null,
      currentPage: null,
      boostValue: 0,
    })
    assert.ok(highUrgency.final > lowUrgency.final, 'high urgency should score higher')
  })

  it('fatigue reduces score', () => {
    const noFatigue = computeUniversalRailScore({
      definition: BASE_DEFINITION,
      weights: ROLE_WEIGHT_PROFILES.public,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 0,
      lastSeenAt: null,
      currentPage: null,
      boostValue: 0,
    })
    const withFatigue = computeUniversalRailScore({
      definition: { ...BASE_DEFINITION, maxImpressions: 10 },
      weights: ROLE_WEIGHT_PROFILES.public,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 8,
      lastSeenAt: null,
      currentPage: null,
      boostValue: 0,
    })
    assert.ok(withFatigue.final < noFatigue.final, 'fatigued item should score lower')
  })

  it('page affinity boosts score', () => {
    const offPage = computeUniversalRailScore({
      definition: BASE_DEFINITION,
      weights: ROLE_WEIGHT_PROFILES.public,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 0,
      lastSeenAt: null,
      currentPage: '/chefs',
      boostValue: 0,
    })
    const onPage = computeUniversalRailScore({
      definition: BASE_DEFINITION,
      weights: ROLE_WEIGHT_PROFILES.public,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 0,
      lastSeenAt: null,
      currentPage: '/eat',
      boostValue: 0,
    })
    assert.ok(onPage.final > offPage.final, 'on-page item should score higher')
  })

  it('chef weights emphasize urgency more than public', () => {
    assert.ok(
      ROLE_WEIGHT_PROFILES.chef.urgency > ROLE_WEIGHT_PROFILES.public.urgency,
      'chef urgency weight should exceed public'
    )
  })

  it('admin weights emphasize urgency and freshness', () => {
    const admin = ROLE_WEIGHT_PROFILES.admin
    assert.ok(admin.urgency >= 0.3, 'admin urgency weight should be >= 0.3')
    assert.ok(admin.freshness >= 0.2, 'admin freshness weight should be >= 0.2')
  })

  it('breakdown weights match the profile passed in', () => {
    const result = computeUniversalRailScore({
      definition: BASE_DEFINITION,
      weights: ROLE_WEIGHT_PROFILES.chef,
      now,
      ageMs: 0,
      windowMs: 86_400_000,
      relevanceScore: 50,
      userAffinityScore: 0,
      impressionCount: 0,
      lastSeenAt: null,
      currentPage: null,
      boostValue: 0,
    })
    assert.deepEqual(result.weights, ROLE_WEIGHT_PROFILES.chef)
  })
})
