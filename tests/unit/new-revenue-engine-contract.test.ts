import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildClientSafeOfferSummary,
  buildPublicOfferPromotionReadModel,
  canPublishOfferPromotion,
  deriveOfferLaunchReadiness,
  deriveMostRestrictiveLaunchState,
  getRequiredOfferSourceSystems,
  isPrivateOfferVisibility,
  type NewRevenueOfferContract,
  type OfferAudienceFitContract,
  type OfferEconomicsContract,
  type OfferPromotionApprovalContract,
  type OfferSourceRef,
} from '../../lib/commerce/new-revenue-engine-contract.js'

const sourceRef: OfferSourceRef = {
  source: 'manual_chef_input',
  table: 'derived',
  rowId: null,
}

function economics(overrides: Partial<OfferEconomicsContract> = {}): OfferEconomicsContract {
  return {
    tenantId: 'tenant-1',
    offerId: 'offer-1',
    priceCents: 15000,
    knownCostCents: 6000,
    estimatedMarginCents: 9000,
    estimatedMarginPercent: 60,
    capacityImpact: 'medium',
    fulfillmentComplexity: 'moderate',
    missingInputs: [],
    confidence: 'high',
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function audience(overrides: Partial<OfferAudienceFitContract> = {}): OfferAudienceFitContract {
  return {
    tenantId: 'tenant-1',
    offerId: 'offer-1',
    audience: 'public',
    fitState: 'strong_fit',
    reasons: ['Clear seasonal demand'],
    permissionState: 'allowed',
    visibility: 'public_safe_summary',
    sourceRefs: [sourceRef],
    ...overrides,
  }
}

function offer(overrides: Partial<NewRevenueOfferContract> = {}): NewRevenueOfferContract {
  return {
    id: 'offer-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    kind: 'class',
    title: 'Summer Pasta Workshop',
    state: 'live',
    strategy: 'test_demand',
    economics: economics(),
    audienceFits: [audience()],
    sourceRefs: [sourceRef],
    visibility: 'public_safe_summary',
    publicPromotion: promotion(),
    createdByUserId: 'user-1',
    updatedAt: '2026-05-21T00:00:00.000Z',
    ...overrides,
  }
}

function promotion(
  overrides: Partial<OfferPromotionApprovalContract> = {}
): OfferPromotionApprovalContract {
  return {
    tenantId: 'tenant-1',
    offerId: 'offer-1',
    state: 'approved',
    publicCopy: 'Join a hands-on seasonal pasta workshop.',
    approvedByUserId: 'user-1',
    approvedAt: '2026-05-21T00:00:00.000Z',
    expiresAt: null,
    visibility: 'public_safe_summary',
    sourceRefs: [sourceRef],
    ...overrides,
  }
}

describe('New Revenue Engine contract', () => {
  it('defines launch-state severity and visibility guards', () => {
    assert.equal(deriveMostRestrictiveLaunchState(['idea', 'draft', 'live']), 'idea')
    assert.equal(deriveMostRestrictiveLaunchState(['live', 'paused']), 'paused')
    assert.equal(deriveMostRestrictiveLaunchState([]), 'unknown')

    assert.equal(isPrivateOfferVisibility('private_only'), true)
    assert.equal(isPrivateOfferVisibility('chef_internal'), true)
    assert.equal(isPrivateOfferVisibility('public_safe_summary'), false)
  })

  it('requires explicit public promotion approval before public read models can render', () => {
    assert.equal(canPublishOfferPromotion(offer()), true)
    assert.equal(
      canPublishOfferPromotion(offer({ publicPromotion: promotion({ state: 'needs_review' }) })),
      false
    )
    assert.equal(
      canPublishOfferPromotion(offer({ publicPromotion: promotion({ publicCopy: '   ' }) })),
      false
    )
    assert.equal(
      canPublishOfferPromotion(
        offer({ publicPromotion: promotion({ visibility: 'private_only' }) })
      ),
      false
    )
    assert.equal(canPublishOfferPromotion(offer({ state: 'draft' })), false)
    assert.equal(
      canPublishOfferPromotion(offer({ economics: economics({ missingInputs: ['cost'] }) })),
      false
    )
  })

  it('builds public offer cards by dropping private, unapproved, and economically incomplete offers', () => {
    const output = buildPublicOfferPromotionReadModel([
      offer({ id: 'public-class', title: 'Summer Pasta Workshop' }),
      offer({
        id: 'private-retainer',
        kind: 'retainer',
        title: 'Monthly household retainer',
        visibility: 'private_only',
      }),
      offer({
        id: 'unapproved-product',
        kind: 'product',
        title: 'Holiday cookie box',
        publicPromotion: promotion({ state: 'draft' }),
      }),
      offer({
        id: 'missing-costs',
        kind: 'meal_prep',
        title: 'Weekly meal prep trial',
        economics: economics({ missingInputs: ['capacity', 'cost'] }),
      }),
    ])

    assert.deepEqual(
      output.offers.map((item) => item.id),
      ['public-class']
    )
    assert.equal(output.redactedOfferCount, 3)
    assert.equal(output.visibility, 'public_safe_summary')
  })

  it('redacts private launch reasons from client-safe outreach summaries', () => {
    const summary = buildClientSafeOfferSummary(
      offer({
        audienceFits: [
          audience({ reasons: ['Local public demand'], visibility: 'client_safe_summary' }),
          audience({
            audience: 'existing_clients',
            reasons: ['Private revenue gap from January cancellations'],
            visibility: 'chef_internal',
          }),
        ],
      })
    )

    assert.deepEqual(summary.allowedReasons, ['Local public demand'])
    assert.equal(summary.blockedPrivateReasonCount, 1)
    assert.equal(summary.visibility, 'client_safe_summary')
  })

  it('maps offer kinds to existing source systems instead of creating duplicate systems', () => {
    assert.deepEqual(getRequiredOfferSourceSystems('retainer'), ['retainers'])
    assert.deepEqual(getRequiredOfferSourceSystems('gift_card'), [
      'client_incentives',
      'gift_cards',
      'gift_certificates',
    ])
    assert.deepEqual(getRequiredOfferSourceSystems('membership'), [
      'loyalty',
      'client_incentives',
      'billing_feature_gates',
    ])
  })

  it('derives launch readiness from existing systems, economics, permissions, and promotion approval', () => {
    const ready = deriveOfferLaunchReadiness(
      offer({
        sourceRefs: [{ source: 'menu_offering', table: 'menu_offerings', rowId: 'menu-1' }],
        economics: economics({
          sourceRefs: [
            { source: 'commerce_promotion', table: 'commerce_promotions', rowId: 'promo-1' },
          ],
        }),
      })
    )

    assert.equal(ready.state, 'ready')
    assert.equal(ready.canPublishPublicPromotion, true)
    assert.ok(ready.presentSourceSystems.includes('menu_offerings'))
    assert.ok(ready.presentSourceSystems.includes('commerce_promotions'))

    const blocked = deriveOfferLaunchReadiness(
      offer({
        kind: 'membership',
        state: 'paused',
        visibility: 'chef_internal',
        publicPromotion: promotion({ state: 'needs_review' }),
        economics: economics({
          capacityImpact: 'unknown',
          fulfillmentComplexity: 'unknown',
          missingInputs: ['cost'],
          sourceRefs: [sourceRef],
        }),
        audienceFits: [
          audience({
            fitState: 'blocked',
            permissionState: 'blocked',
            visibility: 'chef_internal',
            sourceRefs: [sourceRef],
          }),
        ],
        sourceRefs: [sourceRef],
      })
    )

    assert.equal(blocked.state, 'blocked')
    assert.ok(blocked.blockers.includes('missing_source_evidence'))
    assert.ok(blocked.blockers.includes('missing_economics'))
    assert.ok(blocked.blockers.includes('audience_permission_required'))
    assert.ok(blocked.blockers.includes('visibility_review_required'))
    assert.ok(blocked.blockers.includes('public_approval_required'))
    assert.ok(blocked.blockers.includes('offer_not_launchable'))
  })
})
