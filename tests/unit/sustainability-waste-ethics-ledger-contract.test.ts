import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPublicSustainabilityClaimOutput,
  canPublishSustainabilityClaim,
  canUseLeftoverPath,
  deriveMostRestrictiveWasteRecommendationState,
  isPrivateSustainabilityVisibility,
  type SourcingClaimContract,
  type SustainabilitySourceRef,
} from '../../lib/sustainability/sustainability-waste-ethics-ledger-contract.js'
import { buildSustainabilityWasteEthicsLedgerReadModel } from '../../lib/sustainability/sustainability-waste-ethics-ledger.js'

const sourceRef: SustainabilitySourceRef = {
  source: 'sourcing_entry',
  table: 'sourcing_entries',
  rowId: 'source-1',
}

function claim(overrides: Partial<SourcingClaimContract> = {}): SourcingClaimContract {
  return {
    id: 'claim-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    kind: 'local',
    subjectKind: 'ingredient',
    subjectId: 'ingredient-1',
    claimText: 'Local summer produce sourced from a nearby farm.',
    state: 'approved',
    evidenceRefs: [sourceRef],
    approvedByUserId: 'user-1',
    approvedAt: '2026-05-21T00:00:00.000Z',
    expiresAt: null,
    visibility: 'public_profile',
    ...overrides,
  }
}

describe('Sustainability Waste and Ethics Ledger contract', () => {
  it('defines recommendation severity and private visibility guards', () => {
    assert.equal(
      deriveMostRestrictiveWasteRecommendationState(['candidate', 'blocked_for_safety']),
      'blocked_for_safety'
    )
    assert.equal(deriveMostRestrictiveWasteRecommendationState([]), 'unknown')

    assert.equal(isPrivateSustainabilityVisibility('private_only'), true)
    assert.equal(isPrivateSustainabilityVisibility('never_publish'), true)
    assert.equal(isPrivateSustainabilityVisibility('public_profile'), false)
  })

  it('blocks unsafe leftover and donation paths', () => {
    assert.equal(canUseLeftoverPath({ disposalPath: 'donation', safetyState: 'safe' }), true)
    assert.equal(
      canUseLeftoverPath({ disposalPath: 'donation', safetyState: 'time_temperature_unknown' }),
      false
    )
    assert.equal(
      canUseLeftoverPath({ disposalPath: 'client_keeps', safetyState: 'allergen_unknown' }),
      false
    )
    assert.equal(canUseLeftoverPath({ disposalPath: 'compost', safetyState: 'unknown' }), true)
    assert.equal(canUseLeftoverPath({ disposalPath: 'safety_blocked', safetyState: 'safe' }), false)
  })

  it('requires evidence, approval, public visibility, and copy before publication', () => {
    assert.equal(canPublishSustainabilityClaim(claim()), true)
    assert.equal(canPublishSustainabilityClaim(claim({ visibility: 'public_candidate' })), false)
    assert.equal(canPublishSustainabilityClaim(claim({ state: 'needs_evidence' })), false)
    assert.equal(canPublishSustainabilityClaim(claim({ evidenceRefs: [] })), false)
    assert.equal(canPublishSustainabilityClaim(claim({ claimText: '   ' })), false)
  })

  it('builds public output by redacting private and unproven claims', () => {
    const output = buildPublicSustainabilityClaimOutput({
      tenantId: 'tenant-1',
      chefId: 'chef-1',
      claims: [
        claim({ id: 'public-claim' }),
        claim({ id: 'private-claim', visibility: 'private_only' }),
        claim({ id: 'missing-evidence', evidenceRefs: [] }),
        claim({ id: 'not-approved', state: 'ready_for_review' }),
      ],
    })

    assert.deepEqual(
      output.approvedClaims.map((item) => item.id),
      ['public-claim']
    )
    assert.equal(output.redactedClaimCount, 3)
    assert.equal(output.visibility, 'public_profile')
  })

  it('builds a chef-only read model from waste, leftovers, preferences, and sourcing evidence', () => {
    const output = buildSustainabilityWasteEthicsLedgerReadModel({
      tenantId: 'tenant-1',
      chefId: 'chef-1',
      wasteLogs: [
        {
          id: 'waste-1',
          event_id: 'event-1',
          item_name: 'Salmon portions',
          category: 'protein',
          quantity_description: '4 portions',
          estimated_cost_cents: 4800,
          reason: 'overproduction',
          notes: null,
          logged_at: '2026-05-21T00:00:00.000Z',
        },
      ],
      leftovers: [
        {
          id: 'leftover-1',
          event_id: 'event-1',
          item_description: 'Spring salad',
          quantity: '2 quarts',
          packaging_type: 'container',
          labeled: false,
          label_text: null,
          given_to: 'client',
          storage_instructions: null,
          created_at: '2026-05-21T01:00:00.000Z',
        },
      ],
      sourcingEntries: [
        {
          id: 'source-1',
          event_id: 'event-1',
          entry_date: '2026-05-21',
          ingredient_name: 'Asparagus',
          source_type: 'local_farm',
          source_name: 'River Farm',
          distance_miles: 18,
          cost_cents: 2200,
          weight_lbs: 6,
          is_organic: false,
          is_local: true,
          notes: null,
          created_at: '2026-05-21T00:00:00.000Z',
        },
      ],
      events: [
        {
          id: 'event-1',
          client_id: 'client-1',
          event_date: '2026-05-21',
          occasion: 'Dinner',
          status: 'completed',
          guest_count: 12,
          allergies: [],
          dietary_restrictions: [],
        },
      ],
      clients: [
        {
          id: 'client-1',
          full_name: 'Joy Sample',
          leftovers_preference: 'Package leftovers in reusable glass containers.',
          cleanup_expectations: 'Compost when safe.',
        },
      ],
    })

    assert.equal(output.ledger.visibility, 'private_only')
    assert.equal(output.metrics.wasteEventCount, 1)
    assert.equal(output.metrics.leftoverPlanCount, 1)
    assert.equal(output.metrics.clientPreferenceCount, 1)
    assert.equal(output.metrics.sourcingClaimCount, 1)
    assert.equal(output.metrics.estimatedWasteCostCents, 4800)
    assert.equal(output.metrics.publicClaimCount, 0)
    assert.equal(output.metrics.redactedClaimCount, 1)
    assert.equal(output.metrics.unsafeLeftoverPlanCount, 1)
    assert.equal(
      output.ledger.recommendations.some((item) => item.state === 'blocked_for_safety'),
      true
    )
    assert.equal(
      output.decisionPrompts.some((prompt) => prompt.id === 'leftover-safety-block'),
      true
    )
  })
})
