import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  PRICE_LIFECYCLE_STATES,
  appendPriceLifecycleTransition,
  buildWeeklyAccuracyLifecycleLedgers,
  createPriceLifecycleLedger,
  type PriceLifecycleActor,
  type PriceLifecycleContext,
  type PriceLifecycleSource,
  type PriceLifecycleTransitionInput,
} from '@/lib/pricing/price-lifecycle-ledger'
import {
  runWeeklyAccuracyValidation,
  type WeeklyAccuracyConfiguredSample,
  type WeeklyAccuracyGroundTruthSample,
  type WeeklyAccuracyServedPriceSample,
} from '@/lib/pricing/weekly-accuracy-validation'

const actor: PriceLifecycleActor = {
  type: 'system',
  id: 'fixture-runner',
}

const source: PriceLifecycleSource = {
  system: 'pie',
  producer: 'unit-test',
  runId: 'RUN-PIE-W8-LEDGER-TEST',
}

const context: PriceLifecycleContext = {
  confidenceLabel: 'high',
  confidenceScore: 0.91,
  trustLevel: 'confirmed_local_buyable',
  freshnessLabel: 'fresh',
  freshnessDays: 2,
  observedAt: '2026-05-15T20:00:00.000Z',
}

describe('PIE price lifecycle ledger', () => {
  it('supports every accepted lifecycle state through append-only transitions', () => {
    const ledger = PRICE_LIFECYCLE_STATES.reduce(
      (current, state) =>
        appendPriceLifecycleTransition(current, transitionFor(state, current.transitions.length)),
      createPriceLifecycleLedger({
        kind: 'price',
        id: 'apple:northeast',
        ingredientId: 'apple',
        region: 'northeast',
      })
    )

    assert.deepEqual(
      ledger.transitions.map((transition) => transition.state),
      [
        'observed',
        'resolved',
        'stale',
        'fallback-served',
        'disputed',
        'reviewed',
        'reconciled',
        'archived',
      ]
    )
    assert.deepEqual(
      ledger.transitions.map((transition) => transition.sequence),
      [1, 2, 3, 4, 5, 6, 7, 8]
    )
  })

  it('returns frozen copies and exposes no update or delete API', async () => {
    const module = await import('@/lib/pricing/price-lifecycle-ledger')
    const original = createPriceLifecycleLedger({
      kind: 'price',
      id: 'apple:northeast',
    })
    const next = appendPriceLifecycleTransition(original, transitionFor('observed', 0))

    assert.equal(Object.isFrozen(original), true)
    assert.equal(Object.isFrozen(original.transitions), true)
    assert.equal(Object.isFrozen(next.transitions[0]), true)
    assert.equal(original.transitions.length, 0)
    assert.equal(next.transitions.length, 1)
    assert.equal('updatePriceLifecycleTransition' in module, false)
    assert.equal('deletePriceLifecycleTransition' in module, false)
    assert.equal('removePriceLifecycleTransition' in module, false)
  })

  it('requires actor, source, reason, evidence label, confidence/freshness context, and waiting next action', () => {
    assert.throws(
      () =>
        appendPriceLifecycleTransition(createPriceLifecycleLedger({ kind: 'price', id: 'apple' }), {
          ...transitionFor('observed', 0),
          actor: { type: 'system', id: '' },
        }),
      /requires an actor/
    )

    assert.throws(
      () =>
        appendPriceLifecycleTransition(createPriceLifecycleLedger({ kind: 'price', id: 'apple' }), {
          ...transitionFor('observed', 0),
          source: { system: 'pie', producer: '' },
        }),
      /requires a source/
    )

    assert.throws(
      () =>
        appendPriceLifecycleTransition(createPriceLifecycleLedger({ kind: 'price', id: 'apple' }), {
          ...transitionFor('observed', 0),
          evidence: { label: '' },
        }),
      /requires an evidence label/
    )

    assert.throws(
      () =>
        appendPriceLifecycleTransition(createPriceLifecycleLedger({ kind: 'price', id: 'apple' }), {
          ...transitionFor('observed', 0),
          context: undefined as unknown as PriceLifecycleContext,
        }),
      /requires confidence\/freshness context/
    )

    assert.throws(() => {
      const observed = appendPriceLifecycleTransition(
        createPriceLifecycleLedger({ kind: 'price', id: 'apple' }),
        transitionFor('observed', 0)
      )

      appendPriceLifecycleTransition(observed, {
        ...transitionFor('stale', 1),
        nextAction: null,
      })
    }, /stale requires a next action/)
  })

  it('rejects invalid transition order and terminal archived transitions', () => {
    assert.throws(
      () =>
        appendPriceLifecycleTransition(
          createPriceLifecycleLedger({ kind: 'price', id: 'apple' }),
          transitionFor('resolved', 0)
        ),
      /initial -> resolved/
    )

    const archived = appendPriceLifecycleTransition(
      appendPriceLifecycleTransition(
        createPriceLifecycleLedger({ kind: 'price', id: 'apple' }),
        transitionFor('observed', 0)
      ),
      transitionFor('archived', 1)
    )

    assert.throws(
      () => appendPriceLifecycleTransition(archived, transitionFor('observed', 2)),
      /archived -> observed/
    )
  })

  it('builds append-only lifecycle ledgers from weekly accuracy validation output', () => {
    const report = runWeeklyAccuracyValidation({
      configuredSamples,
      servedPrices,
      groundTruthPrices,
      generatedAt: '2026-05-15T20:00:00.000Z',
    })

    const ledgers = buildWeeklyAccuracyLifecycleLedgers(report, {
      runId: 'RUN-PIE-W8-LEDGER-20260515T200000Z',
    })

    assert.equal(ledgers.length, 3)

    const resolved = ledgers.find((ledger) => ledger.subject.ingredientId === 'apple')
    assert.deepEqual(
      resolved?.transitions.map((transition) => transition.state),
      ['observed', 'resolved']
    )
    assert.equal(resolved?.transitions[0]?.evidence.label, 'weekly_accuracy_validation.comparison')
    assert.equal(resolved?.transitions[1]?.context.confidenceLabel, 'high')

    const disputed = ledgers.find((ledger) => ledger.subject.ingredientId === 'whole-milk')
    assert.deepEqual(
      disputed?.transitions.map((transition) => transition.state),
      ['observed', 'disputed']
    )
    assert.match(disputed?.transitions[1]?.nextAction?.label ?? '', /Review source quality/)

    const stale = ledgers.find((ledger) => ledger.subject.ingredientId === 'cilantro')
    assert.deepEqual(
      stale?.transitions.map((transition) => transition.state),
      ['observed', 'stale']
    )
    assert.match(stale?.transitions[1]?.nextAction?.label ?? '', /Collect served/)
  })
})

function transitionFor(
  state: (typeof PRICE_LIFECYCLE_STATES)[number],
  index: number
): PriceLifecycleTransitionInput {
  return {
    state,
    actor,
    source,
    reason: `Fixture reason ${state}`,
    evidence: {
      label: `fixture.${state}`,
    },
    context,
    nextAction: ['stale', 'fallback-served', 'disputed', 'reviewed'].includes(state)
      ? {
          label: `Review ${state}`,
          owner: actor,
        }
      : null,
    occurredAt: `2026-05-15T20:0${index}:00.000Z`,
  }
}

const configuredSamples: WeeklyAccuracyConfiguredSample[] = [
  { ingredientId: 'apple', ingredientName: 'Apple', category: 'produce', region: 'northeast' },
  {
    ingredientId: 'whole-milk',
    ingredientName: 'Whole milk',
    category: 'dairy',
    region: 'midwest',
  },
  { ingredientId: 'cilantro', ingredientName: 'Cilantro', category: 'produce', region: 'pacific' },
]

const servedPrices: WeeklyAccuracyServedPriceSample[] = [
  {
    ingredientId: 'apple',
    region: 'northeast',
    servedPriceCents: 210,
    source: 'chef_receipt',
    confidenceTier: 'high',
    confidenceScore: 0.91,
  },
  {
    ingredientId: 'whole-milk',
    region: 'midwest',
    servedPriceCents: 520,
    source: 'national_median',
    confidenceTier: 'medium',
    confidenceScore: 0.68,
  },
]

const groundTruthPrices: WeeklyAccuracyGroundTruthSample[] = [
  {
    ingredientId: 'apple',
    region: 'northeast',
    groundTruthPriceCents: 200,
    source: 'receipt_ground_truth',
    observedAt: '2026-05-15T20:00:00.000Z',
  },
  {
    ingredientId: 'whole-milk',
    region: 'midwest',
    groundTruthPriceCents: 400,
    source: 'vendor_invoice_ground_truth',
    observedAt: '2026-05-15T20:00:00.000Z',
  },
  {
    ingredientId: 'cilantro',
    region: 'pacific',
    groundTruthPriceCents: 100,
    source: 'receipt_ground_truth',
    observedAt: '2026-05-15T20:00:00.000Z',
  },
]
