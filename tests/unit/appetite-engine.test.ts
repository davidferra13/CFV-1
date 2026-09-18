import { describe, expect, it } from 'vitest'
import {
  APPETITE_DOMAINS,
  aggregateAppetiteDemand,
  buildAppetiteState,
  measureAppetiteMarketGaps,
  projectAppetiteStateToDiscovery,
  spinAppetite,
  type AppetiteSignal,
} from '@/lib/discovery/appetite-engine'

function sequence(values: number[]) {
  let index = 0
  return () => values[index++ % values.length] ?? 0
}

describe('appetite engine', () => {
  it('defines the canonical twelve appetite domains', () => {
    expect(APPETITE_DOMAINS).toHaveLength(12)
    expect(APPETITE_DOMAINS).toEqual([
      'food',
      'taste',
      'feel',
      'preparation',
      'needs',
      'body',
      'emotion',
      'moment',
      'people',
      'logistics',
      'economics',
      'memory',
    ])
  })

  it('keeps hard constraints when Fresh ignores learned taste history', () => {
    const signals: AppetiteSignal[] = [
      {
        tagId: 'need-gluten-free',
        polarity: 'want',
        strength: 1,
        confidence: 1,
        hardness: 'hard',
        scope: 'person',
        source: 'explicit',
      },
      {
        tagId: 'food-sushi',
        polarity: 'want',
        strength: 0.9,
        confidence: 0.9,
        hardness: 'soft',
        scope: 'learned',
        source: 'behavior',
      },
    ]

    const spun = spinAppetite(buildAppetiteState(signals), {
      mode: 'fresh',
      rng: sequence([0.2, 0.5, 0.8]),
    })

    expect(spun.signals.some((signal) => signal.tagId === 'need-gluten-free')).toBe(true)
    expect(
      spun.signals.some(
        (signal) => signal.tagId === 'food-sushi' && signal.scope === 'learned'
      )
    ).toBe(false)
  })

  it('preserves locked signals across a spin', () => {
    const state = buildAppetiteState([
      {
        tagId: 'feel-crispy',
        polarity: 'want',
        strength: 0.8,
        confidence: 1,
        hardness: 'soft',
        scope: 'session',
        source: 'explicit',
        locked: true,
      },
    ])

    const spun = spinAppetite(state, {
      mode: 'chaos',
      rng: sequence([0.9, 0.7, 0.4]),
    })

    expect(spun.signals).toContainEqual(
      expect.objectContaining({ tagId: 'feel-crispy', locked: true })
    )
  })

  it('projects appetite state into existing discovery filters without inventing a second search system', () => {
    const state = buildAppetiteState([
      {
        tagId: 'food-thai',
        polarity: 'want',
        strength: 0.9,
        confidence: 1,
        hardness: 'soft',
        scope: 'session',
        source: 'explicit',
      },
      {
        tagId: 'need-vegan',
        polarity: 'want',
        strength: 1,
        confidence: 1,
        hardness: 'hard',
        scope: 'person',
        source: 'explicit',
      },
      {
        tagId: 'economics-budget',
        polarity: 'want',
        strength: 0.7,
        confidence: 0.8,
        hardness: 'soft',
        scope: 'session',
        source: 'explicit',
      },
    ])

    expect(projectAppetiteStateToDiscovery(state)).toEqual(
      expect.objectContaining({
        craving: 'Thai',
        dietary: 'Vegan',
        budget: 'Under $30/person',
      })
    )
  })

  it('ranks unmet appetite demand above well-supplied demand', () => {
    const gaps = measureAppetiteMarketGaps(
      [
        { tagId: 'food-thai', score: 6, evidenceCount: 4 },
        { tagId: 'food-pizza', score: 6, evidenceCount: 4 },
      ],
      [
        { tagIds: ['food-pizza'], availabilityWeight: 3 },
        { tagIds: ['food-pizza'], availabilityWeight: 2 },
        { tagIds: ['food-thai'], availabilityWeight: 0.25 },
      ]
    )

    expect(gaps[0]).toEqual(
      expect.objectContaining({
        tagId: 'food-thai',
        demandScore: 6,
      })
    )
    expect(gaps[0].gapScore).toBeGreaterThan(gaps[1].gapScore)
  })

  it('turns evidence into a demand vector instead of treating every interaction equally', () => {
    const demand = aggregateAppetiteDemand([
      { tagId: 'food-thai', action: 'lock', occurredAt: '2026-09-18T12:00:00Z' },
      { tagId: 'food-thai', action: 'result_open', occurredAt: '2026-09-18T12:01:00Z' },
      { tagId: 'food-pizza', action: 'spin_seen', occurredAt: '2026-09-18T12:02:00Z' },
      { tagId: 'food-pizza', action: 'reject', occurredAt: '2026-09-18T12:03:00Z' },
    ])

    expect(demand[0]).toEqual(expect.objectContaining({ tagId: 'food-thai' }))
    expect(demand.find((entry) => entry.tagId === 'food-thai')!.score).toBeGreaterThan(1)
    expect(demand.find((entry) => entry.tagId === 'food-pizza')!.score).toBeLessThan(0)
  })
})
