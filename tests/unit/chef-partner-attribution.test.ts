import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateChefNetworkCommission,
  decideBookingAttribution,
} from '../../lib/chef-network/attribution'

test('ChefFlow-originated booking processed through ChefFlow is commissionable', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'chefflow',
    bookingRoute: 'chefflow',
    relationship: 'new',
    agreementAccepted: true,
  })

  assert.equal(decision.commissionable, true)
  assert.equal(decision.status, 'commissionable')
  assert.equal(decision.reason, 'chefflow_originated_and_processed')
})

test('chef-owned demand is protected from commission', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'chef',
    bookingRoute: 'chefflow',
    relationship: 'new',
    agreementAccepted: true,
  })

  assert.equal(decision.commissionable, false)
  assert.equal(decision.reason, 'chef_owned_client')
})

test('documented prior chef relationship overrides a ChefFlow source claim', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'chefflow',
    bookingRoute: 'chefflow',
    relationship: 'repeat',
    agreementAccepted: true,
    chefPriorRelationship: true,
  })

  assert.equal(decision.commissionable, false)
  assert.equal(decision.reason, 'chef_prior_relationship')
})

test('earlier chef first-touch evidence protects the chef client relationship', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'chefflow',
    bookingRoute: 'chefflow',
    relationship: 'new',
    agreementAccepted: true,
    chefFirstTouchAt: '2026-09-01T12:00:00Z',
    chefflowFirstTouchAt: '2026-09-03T12:00:00Z',
  })

  assert.equal(decision.commissionable, false)
  assert.equal(decision.reason, 'chef_prior_relationship')
})

test('direct rebook outside ChefFlow has no perpetual commission tail', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'chefflow',
    bookingRoute: 'direct',
    relationship: 'repeat',
    agreementAccepted: true,
  })

  assert.equal(decision.commissionable, false)
  assert.equal(decision.reason, 'direct_booking_outside_chefflow')
})

test('unknown source freezes commission for review', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'unknown',
    bookingRoute: 'chefflow',
    relationship: 'new',
    agreementAccepted: true,
  })

  assert.equal(decision.commissionable, false)
  assert.equal(decision.status, 'needs_review')
  assert.equal(decision.reason, 'source_unknown')
})

test('an open attribution dispute cannot auto-charge commission', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'chefflow',
    bookingRoute: 'chefflow',
    relationship: 'new',
    agreementAccepted: true,
    disputed: true,
  })

  assert.equal(decision.commissionable, false)
  assert.equal(decision.status, 'needs_review')
  assert.equal(decision.reason, 'attribution_disputed')
})

test('no commission exists before the chef has accepted an agreement', () => {
  const decision = decideBookingAttribution({
    sourceOwner: 'chefflow',
    bookingRoute: 'chefflow',
    relationship: 'new',
    agreementAccepted: false,
  })

  assert.equal(decision.commissionable, false)
  assert.equal(decision.reason, 'no_accepted_partner_agreement')
})

test('commission uses service subtotal and subtracts refunded service revenue', () => {
  const result = calculateChefNetworkCommission({
    serviceSubtotalCents: 200000,
    refundedServiceCents: 50000,
    commissionRateBps: 1500,
  })

  assert.equal(result.basisCents, 150000)
  assert.equal(result.commissionAmountCents, 22500)
  assert.equal(result.chefServiceRevenueAfterCommissionCents, 127500)
})

test('commission math rounds to the nearest cent', () => {
  const result = calculateChefNetworkCommission({
    serviceSubtotalCents: 9999,
    commissionRateBps: 1500,
  })

  assert.equal(result.commissionAmountCents, 1500)
})

test('invalid commission rates are rejected', () => {
  assert.throws(
    () =>
      calculateChefNetworkCommission({
        serviceSubtotalCents: 100000,
        commissionRateBps: 10001,
      }),
    /commissionRateBps/
  )
})
