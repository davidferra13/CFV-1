import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { deriveResumeTrails } from '@/lib/operating-loop/resume-trails'
import type { OperatingLoopItem } from '@/lib/operating-loop/types'

function item(overrides: Partial<OperatingLoopItem>): OperatingLoopItem {
  return {
    id: 'current:menu-1',
    sourceId: 'menu-1',
    sourceKind: 'menu',
    loopState: 'active',
    evidenceLabel: 'computed',
    confidence: 0.8,
    title: 'Spring tasting menu',
    description: 'Menu draft needs finishing.',
    nextAction: 'Finish dessert course',
    waitingOn: null,
    resumeContext: {
      lastAction: 'Updated entree pricing',
      timestamp: '2026-05-15T16:15:00.000Z',
      sourceRoute: '/menus/menu-1',
      nextStep: 'Finish dessert course',
    },
    proofHref: '/menus/menu-1',
    sourceRoute: '/menus/menu-1',
    createdAt: '2026-05-15T16:15:00.000Z',
    dueAt: null,
    ...overrides,
  }
}

describe('operating loop resume trails', () => {
  it('returns actionable resume trails with last action, next action, route, and evidence', () => {
    const collection = deriveResumeTrails([item({})])

    assert.equal(collection.state, 'ready')
    assert.equal(collection.emptyState, null)
    assert.equal(collection.trails.length, 1)
    assert.deepEqual(collection.trails[0], {
      id: 'resume:menu:menu-1',
      sourceId: 'menu-1',
      sourceKind: 'menu',
      sourceItemId: 'current:menu-1',
      title: 'Spring tasting menu',
      description: 'Menu draft needs finishing.',
      lastAction: 'Updated entree pricing',
      lastActionAt: '2026-05-15T16:15:00.000Z',
      nextAction: 'Finish dessert course',
      route: '/menus/menu-1',
      evidence: {
        label: 'computed',
        sourceKind: 'menu',
        sourceId: 'menu-1',
        sourceItemId: 'current:menu-1',
        confidence: 0.8,
        proofHref: '/menus/menu-1',
        weak: false,
        reason: 'computed_from_operating_loop',
      },
    })
  })

  it('dedupes by canonical route and keeps the strongest actionable trail', () => {
    const weak = item({
      id: 'current:menu-1',
      evidenceLabel: 'inferred',
      confidence: 0.6,
      resumeContext: {
        lastAction: null,
        timestamp: '2026-05-15T17:00:00.000Z',
        sourceRoute: '/menus/menu-1',
        nextStep: 'Open menu draft',
      },
    })
    const strong = item({
      id: 'task:menu-1',
      sourceKind: 'task',
      evidenceLabel: 'user_entered',
      confidence: 0.85,
      nextAction: 'Confirm final portions',
      resumeContext: {
        lastAction: 'Chef wrote clean-stop note',
        timestamp: '2026-05-15T16:00:00.000Z',
        sourceRoute: '/menus/menu-1',
        nextStep: 'Confirm final portions',
      },
    })

    const collection = deriveResumeTrails([weak, strong])

    assert.equal(collection.trails.length, 1)
    assert.equal(collection.trails[0]?.sourceItemId, 'task:menu-1')
    assert.equal(collection.trails[0]?.lastAction, 'Chef wrote clean-stop note')
    assert.equal(collection.trails[0]?.nextAction, 'Confirm final portions')
    assert.equal(collection.trails[0]?.evidence.label, 'user_entered')
  })

  it('uses a truthful weak last-saved trail only when a timestamp exists', () => {
    const withTimestamp = item({
      sourceKind: 'recipe',
      sourceId: 'recipe-1',
      id: 'current:recipe-1',
      title: 'Lemon tart',
      resumeContext: {
        lastAction: null,
        timestamp: '2026-05-15T14:00:00.000Z',
        sourceRoute: '/recipes/recipe-1',
        nextStep: 'Add garnish notes',
      },
    })
    const withoutTimestamp = item({
      sourceKind: 'quote',
      sourceId: 'quote-1',
      id: 'current:quote-1',
      title: 'Graduation quote',
      createdAt: null,
      resumeContext: {
        lastAction: null,
        timestamp: null,
        sourceRoute: '/quotes/quote-1',
        nextStep: 'Review quote',
      },
    })

    const collection = deriveResumeTrails([withTimestamp, withoutTimestamp])

    assert.equal(collection.trails.length, 1)
    assert.equal(collection.trails[0]?.sourceId, 'recipe-1')
    assert.equal(collection.trails[0]?.lastAction, 'Last saved')
    assert.equal(collection.trails[0]?.evidence.weak, true)
    assert.equal(collection.trails[0]?.evidence.reason, 'timestamp_without_explicit_last_action')
  })

  it('suppresses closed, unroutable, and next-action-free work', () => {
    const collection = deriveResumeTrails([
      item({ id: 'done', loopState: 'done' }),
      item({ id: 'dismissed', loopState: 'dismissed' }),
      item({ id: 'no-route', sourceRoute: null, proofHref: null, resumeContext: null }),
      item({
        id: 'no-action',
        nextAction: null,
        resumeContext: {
          lastAction: 'Saved draft',
          timestamp: '2026-05-15T14:00:00.000Z',
          sourceRoute: '/menus/menu-2',
          nextStep: null,
        },
      }),
    ])

    assert.equal(collection.state, 'empty')
    assert.deepEqual(collection.trails, [])
    assert.equal(collection.emptyState?.reason, 'no_resumable_sources')
  })

  it('distinguishes no input from sources that lack resume evidence', () => {
    assert.equal(deriveResumeTrails([]).emptyState?.reason, 'no_sources')
    assert.equal(
      deriveResumeTrails([item({ loopState: 'done' })]).emptyState?.reason,
      'no_resumable_sources'
    )
  })

  it('honors a caller limit after ranking and dedupe', () => {
    const collection = deriveResumeTrails(
      [
        item({
          sourceId: 'menu-1',
          sourceKind: 'menu',
          id: 'current:menu-1',
          resumeContext: {
            lastAction: 'Saved menu',
            timestamp: '2026-05-15T13:00:00.000Z',
            sourceRoute: '/menus/menu-1',
            nextStep: 'Review menu',
          },
        }),
        item({
          sourceId: 'client-1',
          sourceKind: 'client_profile',
          id: 'client-profile:client-1',
          title: 'Maya profile memory',
          evidenceLabel: 'confirmed',
          resumeContext: {
            lastAction: 'Added allergies',
            timestamp: '2026-05-15T15:00:00.000Z',
            sourceRoute: '/clients/client-1',
            nextStep: 'Add service notes',
          },
        }),
      ],
      { limit: 1 }
    )

    assert.equal(collection.trails.length, 1)
    assert.equal(collection.trails[0]?.sourceId, 'client-1')
  })
})
