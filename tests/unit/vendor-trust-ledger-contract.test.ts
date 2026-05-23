import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPieVendorReliabilitySignal,
  buildVendorSafeFollowupExport,
  deriveMostRestrictiveVendorTrustBucket,
  deriveVendorSourcingRiskAssessment,
  requiresChefOnlyVendorTrustVisibility,
  type SourcingRiskContext,
  type VendorPerformanceEventContract,
  type VendorProfileTrustSnapshot,
  type VendorTrustScoreContract,
} from '../../lib/vendors/vendor-trust-ledger-contract.ts'

const sourceRef = {
  source: 'vendor_event_assignment' as const,
  table: 'vendor_event_assignments' as const,
  rowId: 'assignment-1',
}

function profile(overrides: Partial<VendorProfileTrustSnapshot> = {}): VendorProfileTrustSnapshot {
  return {
    id: 'snapshot-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    vendorId: 'vendor-1',
    vendorName: 'North Coast Fish',
    vendorType: 'fishmonger',
    status: 'active',
    isPreferred: true,
    deliveryZones: ['Boston'],
    productCategories: ['seafood'],
    contactMethods: ['phone', 'email'],
    leadTimeHours: 24,
    minimumOrderCents: 15000,
    privateRelationshipNotes: 'Chef-only relationship context.',
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function context(overrides: Partial<SourcingRiskContext> = {}): SourcingRiskContext {
  return {
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    vendorId: 'vendor-1',
    eventId: 'event-1',
    productCategory: 'seafood',
    productName: 'halibut',
    routeLabel: 'Boston metro',
    eventType: 'tasting-menu',
    season: 'spring',
    clientImportance: 'high_touch',
    neededAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  }
}

function score(overrides: Partial<VendorTrustScoreContract> = {}): VendorTrustScoreContract {
  return {
    id: 'score-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    vendorId: 'vendor-1',
    productCategory: 'seafood',
    productName: null,
    routeLabel: null,
    eventType: null,
    season: null,
    clientImportance: null,
    reliabilityScore: 92,
    trustBucket: 'reliable',
    confidence: 'high',
    evidenceCount: 8,
    negativeEventCount: 0,
    unresolvedIncidentCount: 0,
    unknowns: [],
    riskFlags: [],
    lastEvidenceAt: '2026-05-20T10:00:00.000Z',
    sourceRefs: [sourceRef],
    visibility: 'pie_reliability_signal',
    ...overrides,
  }
}

function event(
  overrides: Partial<VendorPerformanceEventContract> = {}
): VendorPerformanceEventContract {
  return {
    id: 'event-memory-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    vendorId: 'vendor-1',
    eventId: 'event-1',
    vendorOrderId: 'order-1',
    deliveryId: 'delivery-1',
    kind: 'late_delivery',
    signal: 'negative',
    state: 'observed',
    severity: 'medium',
    occurredAt: '2026-05-20T10:00:00.000Z',
    productCategory: 'seafood',
    productName: 'halibut',
    routeLabel: 'Boston metro',
    eventType: 'tasting-menu',
    season: 'spring',
    summary: 'Delivery arrived after prep window.',
    requestedResolution: 'Confirm earlier cutoff for future orders.',
    riskFlags: [],
    privateNotes: 'Chef-only context about client stress.',
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

describe('Vendor Trust Ledger contract', () => {
  it('treats private vendor trust visibility as chef-only', () => {
    assert.equal(requiresChefOnlyVendorTrustVisibility('private_chef_only'), true)
    assert.equal(requiresChefOnlyVendorTrustVisibility('chef_internal'), true)
    assert.equal(requiresChefOnlyVendorTrustVisibility('vendor_safe_followup'), false)
  })

  it('keeps unknown reliability explicit for PIE instead of inventing confidence', () => {
    const assessment = deriveVendorSourcingRiskAssessment({
      profile: profile(),
      context: context({ clientImportance: 'allergy_sensitive' }),
      trustScores: [],
      recentEvents: [],
    })

    assert.equal(assessment.riskState, 'unknown')
    assert.equal(assessment.trustBucket, 'unknown')
    assert.equal(assessment.riskFlags.includes('unknown_reliability'), true)
    assert.equal(assessment.riskFlags.includes('allergen_handling_unknown'), true)

    const pieSignal = buildPieVendorReliabilitySignal(assessment)
    assert.equal(pieSignal.finalState, 'review_required')
    assert.equal(pieSignal.visibleLabel, 'Vendor reliability unknown')
    assert.equal(pieSignal.visibility, 'pie_reliability_signal')
  })

  it('blocks sourcing when recent unresolved high-severity vendor incidents exist', () => {
    const assessment = deriveVendorSourcingRiskAssessment({
      profile: profile(),
      context: context(),
      trustScores: [score()],
      recentEvents: [
        event({
          kind: 'missing_item',
          severity: 'high',
          summary: 'Missing fish order forced same-day replacement.',
        }),
      ],
    })

    assert.equal(assessment.riskState, 'blocked')
    assert.equal(assessment.riskFlags.includes('substitution_risk'), true)
    assert.equal(assessment.riskFlags.includes('unresolved_incident'), true)
    assert.match(assessment.blockingReasons.join(' '), /missing item/)
  })

  it('derives the most restrictive trust bucket across category and route evidence', () => {
    assert.equal(
      deriveMostRestrictiveVendorTrustBucket(['preferred', 'reliable', 'watch']),
      'watch'
    )
    assert.equal(deriveMostRestrictiveVendorTrustBucket(['reliable', 'blocked']), 'blocked')
    assert.equal(deriveMostRestrictiveVendorTrustBucket([]), 'unknown')
  })

  it('exports only vendor-safe follow-up data and redacts private notes', () => {
    const exported = buildVendorSafeFollowupExport({
      tenantId: 'tenant-1',
      chefId: 'chef-1',
      vendorId: 'vendor-1',
      events: [
        event({
          id: 'safe-followup',
          visibility: 'vendor_safe_followup',
          privateNotes: 'Do not expose this.',
          sourceRefs: [sourceRef, { source: 'remy_summary', table: 'derived', rowId: 'summary-1' }],
        }),
        event({
          id: 'private-event',
          visibility: 'private_chef_only',
          privateNotes: 'Chef-only reliability issue.',
        }),
      ],
    })

    assert.deepEqual(
      exported.events.map((safeEvent) => safeEvent.id),
      ['safe-followup']
    )
    assert.equal('privateNotes' in exported.events[0], false)
    assert.equal(exported.events[0]?.visibility, 'vendor_safe_followup')
    assert.equal(
      exported.events[0]?.sourceRefs.some((ref) => ref.source === 'remy_summary'),
      false
    )
    assert.equal(exported.redactedEventCount, 1)
  })
})
