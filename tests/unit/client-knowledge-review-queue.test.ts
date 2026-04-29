import assert from 'node:assert/strict'
import test from 'node:test'
import type { ClientKnowledgeInspectorRow } from '../../lib/clients/client-knowledge-inspector'
import {
  projectClientKnowledgeReviewQueue,
  type ClientKnowledgeSafetyDecisionMap,
} from '../../lib/clients/client-knowledge-review-queue'

function createRow(
  overrides: Partial<ClientKnowledgeInspectorRow> & Pick<ClientKnowledgeInspectorRow, 'key'>
): ClientKnowledgeInspectorRow {
  return {
    key: overrides.key,
    label: overrides.label ?? 'Client field',
    sourceOfTruth: overrides.sourceOfTruth ?? 'client_profile',
    visibleAudiences: overrides.visibleAudiences ?? [
      'client',
      'chef',
      'remy_client',
      'remy_chef',
      'admin',
    ],
    syncTargets: overrides.syncTargets ?? ['client_profile'],
    valueState: overrides.valueState ?? 'present',
    freshnessStatus: overrides.freshnessStatus ?? null,
    isPii: overrides.isPii ?? false,
    isSafetyCritical: overrides.isSafetyCritical ?? false,
    canClientSee: overrides.canClientSee ?? true,
    canRemyClientSee: overrides.canRemyClientSee ?? true,
    needsReview: overrides.needsReview ?? false,
  }
}

test('projects stale allergies as a high-priority chef review item', () => {
  const queue = projectClientKnowledgeReviewQueue([
    createRow({
      key: 'allergies',
      label: 'Allergies',
      freshnessStatus: 'stale',
      isSafetyCritical: true,
      needsReview: true,
    }),
  ])

  assert.equal(queue.items.length, 1)
  assert.equal(queue.items[0]?.fieldKey, 'allergies')
  assert.equal(queue.items[0]?.audience, 'chef')
  assert.equal(queue.items[0]?.priority, 'high')
  assert.equal(queue.items[0]?.blocking, false)
  assert.ok(queue.items[0]?.reasonCodes.includes('safety_critical_stale'))
})

test('projects missing client profile data as a client prompt', () => {
  const queue = projectClientKnowledgeReviewQueue([
    createRow({
      key: 'favorite_cuisines',
      label: 'Favorite cuisines',
      valueState: 'missing',
      needsReview: true,
    }),
  ])

  assert.equal(queue.items.length, 1)
  assert.equal(queue.items[0]?.fieldKey, 'favorite_cuisines')
  assert.equal(queue.items[0]?.audience, 'client')
  assert.equal(queue.items[0]?.priority, 'low')
  assert.deepEqual(queue.items[0]?.reasonCodes, ['missing_value'])
})

test('never creates a client-facing item for private chef notes', () => {
  const queue = projectClientKnowledgeReviewQueue([
    createRow({
      key: 'private_chef_notes',
      label: 'Private chef notes',
      sourceOfTruth: 'chef_private',
      visibleAudiences: ['chef', 'remy_chef', 'admin'],
      valueState: 'missing',
      isPii: true,
      canClientSee: false,
      canRemyClientSee: false,
      needsReview: true,
    }),
  ])

  assert.equal(
    queue.items.some((item) => item.audience === 'client'),
    false
  )
})

test('marks blocking safety decisions as high-priority chef items', () => {
  const safetyDecisions: ClientKnowledgeSafetyDecisionMap = {
    kitchen_constraints: {
      allowWrite: true,
      requiresChefReview: false,
      blocksEventProgression: true,
      shouldNotifyChef: true,
      reasonCodes: ['stale_safety_fact_near_event'],
      nextStep: 'confirm_before_event_progression',
    },
  }

  const queue = projectClientKnowledgeReviewQueue({
    rows: [
      createRow({
        key: 'kitchen_constraints',
        label: 'Kitchen constraints',
        freshnessStatus: 'stale',
        isSafetyCritical: true,
        needsReview: true,
      }),
    ],
    safetyDecisions,
  })

  assert.equal(queue.items.length, 1)
  assert.equal(queue.items[0]?.audience, 'chef')
  assert.equal(queue.items[0]?.priority, 'high')
  assert.equal(queue.items[0]?.blocking, true)
  assert.ok(queue.items[0]?.reasonCodes.includes('safety_decision_blocks_event'))
  assert.ok(queue.items[0]?.reasonCodes.includes('stale_safety_fact_near_event'))
})

test('summarizes total, blocking, chef, client, and high-priority item counts', () => {
  const queue = projectClientKnowledgeReviewQueue(
    [
      createRow({
        key: 'allergies',
        label: 'Allergies',
        freshnessStatus: 'unconfirmed',
        isSafetyCritical: true,
        needsReview: true,
      }),
      createRow({
        key: 'favorite_dishes',
        label: 'Favorite dishes',
        valueState: 'missing',
        needsReview: true,
      }),
      createRow({
        key: 'kitchen_constraints',
        label: 'Kitchen constraints',
        freshnessStatus: 'stale',
        isSafetyCritical: true,
        needsReview: true,
      }),
    ],
    {
      kitchen_constraints: {
        allowWrite: true,
        requiresChefReview: false,
        blocksEventProgression: true,
        shouldNotifyChef: true,
        reasonCodes: ['stale_safety_fact_near_event'],
        nextStep: 'confirm_before_event_progression',
      },
    }
  )

  assert.deepEqual(queue.summary, {
    totalItems: 3,
    blockingItems: 1,
    chefItems: 2,
    clientItems: 1,
    highPriorityItems: 2,
  })
})
