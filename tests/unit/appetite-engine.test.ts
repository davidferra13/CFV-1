import { describe, expect, it } from 'vitest'
import {
  APPETITE_DOMAINS,
  aggregateAppetiteDemand,
  buildAppetiteState,
  measureAppetiteMarketGaps,
  rankAppetiteSupply,
  resolveGroupAppetite,
  projectAppetiteStateToDiscovery,
  spinAppetite,
  type AppetiteEvidence,
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

  it('keeps the current explicit signal when learned history contains the same tag', () => {
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
        tagId: 'food-thai',
        polarity: 'want',
        strength: 1,
        confidence: 1,
        hardness: 'soft',
        scope: 'learned',
        source: 'behavior',
      },
    ])

    expect(state.signals).toContainEqual(
      expect.objectContaining({
        tagId: 'food-thai',
        scope: 'session',
        source: 'explicit',
      })
    )
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

  it('ranks supply by appetite fit and rejects hard conflicts', () => {
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
        tagId: 'need-gluten-free',
        polarity: 'want',
        strength: 1,
        confidence: 1,
        hardness: 'hard',
        scope: 'person',
        source: 'explicit',
      },
      {
        tagId: 'taste-spicy',
        polarity: 'want',
        strength: 0.7,
        confidence: 0.8,
        hardness: 'soft',
        scope: 'session',
        source: 'explicit',
      },
    ])

    const ranked = rankAppetiteSupply(state, [
      {
        id: 'thai-gf',
        tagIds: ['food-thai', 'need-gluten-free', 'taste-spicy'],
        availabilityWeight: 1,
      },
      {
        id: 'thai-unknown-gf',
        tagIds: ['food-thai', 'taste-spicy'],
        availabilityWeight: 1,
      },
      {
        id: 'pizza-gf',
        tagIds: ['food-pizza', 'need-gluten-free'],
        availabilityWeight: 1,
      },
    ])

    expect(ranked[0]).toEqual(expect.objectContaining({ id: 'thai-gf', eligible: true }))
    expect(ranked.find((item) => item.id === 'thai-unknown-gf')).toEqual(
      expect.objectContaining({ eligible: false })
    )
  })

  it('resolves group appetite with hard constraints as vetoes and soft preferences as shared evidence', () => {
    const group = resolveGroupAppetite([
      {
        participantId: 'a',
        state: buildAppetiteState([
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
            tagId: 'food-thai',
            polarity: 'want',
            strength: 0.8,
            confidence: 1,
            hardness: 'soft',
            scope: 'session',
            source: 'explicit',
          },
        ]),
      },
      {
        participantId: 'b',
        state: buildAppetiteState([
          {
            tagId: 'food-thai',
            polarity: 'want',
            strength: 0.7,
            confidence: 1,
            hardness: 'soft',
            scope: 'session',
            source: 'explicit',
          },
          {
            tagId: 'taste-spicy',
            polarity: 'avoid',
            strength: 0.9,
            confidence: 1,
            hardness: 'soft',
            scope: 'session',
            source: 'explicit',
          },
        ]),
      },
    ])

    expect(group.state.signals).toContainEqual(
      expect.objectContaining({
        tagId: 'need-vegan',
        polarity: 'want',
        hardness: 'hard',
      })
    )
    expect(group.sharedWants[0]).toEqual(
      expect.objectContaining({ tagId: 'food-thai', participantCount: 2 })
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

  it('ignores malformed evidence instead of corrupting the demand vector', () => {
    const demand = aggregateAppetiteDemand([
      {
        tagId: 'food-thai',
        action: 'not-a-real-action',
        occurredAt: '2026-09-18T12:00:00Z',
      } as unknown as AppetiteEvidence,
      { tagId: 'food-thai', action: 'lock', occurredAt: '2026-09-18T12:01:00Z' },
    ])

    expect(demand).toEqual([
      expect.objectContaining({
        tagId: 'food-thai',
        score: 1.2,
        evidenceCount: 1,
      }),
    ])
  })
})
