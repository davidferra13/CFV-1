import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildCompliancePacket,
  buildQuoteComplianceGate,
  filterPublicCredentialChips,
  isPrivateComplianceVisibility,
  type ComplianceCredentialProof,
  type ComplianceEventRiskInput,
} from '@/lib/compliance/compliance-concierge'

const activeFoodHandler: ComplianceCredentialProof = {
  id: 'food-handler-1',
  label: 'Food handler card',
  category: 'food_safety',
  visibility: 'private_only',
  status: 'active',
  evidenceUrl: 'https://example.test/private.pdf',
}

const publicInsurance: ComplianceCredentialProof = {
  id: 'insurance-1',
  label: 'General liability insurance',
  category: 'insurance',
  visibility: 'public_profile',
  status: 'active',
  evidenceUrl: 'https://example.test/policy.pdf',
  publicLabel: 'General liability insured',
}

const expiredAlcohol: ComplianceCredentialProof = {
  id: 'alcohol-1',
  label: 'Alcohol service permit',
  category: 'alcohol',
  visibility: 'chef_internal',
  status: 'expired',
}

const highRiskEvent: ComplianceEventRiskInput = {
  eventId: 'event-1',
  eventType: 'private dinner',
  locationState: null,
  locationCity: 'Chicago',
  venueType: 'rented_venue',
  isPublicEvent: false,
  guestCount: 80,
  serviceStyle: 'plated',
  allergenSeverity: 'severe',
  hasAlcohol: true,
  hasCannabis: true,
  staffOrVendorInvolved: true,
  transportRequired: true,
  rentedKitchen: true,
  reheatingRequired: true,
  leftoversPlanned: true,
  vulnerableDiners: true,
}

describe('compliance concierge contract', () => {
  it('keeps private credential evidence out of public chips', () => {
    const chips = filterPublicCredentialChips([
      activeFoodHandler,
      publicInsurance,
      { ...publicInsurance, id: 'expired-public', status: 'expired' },
      { ...publicInsurance, id: 'no-label', publicLabel: undefined },
    ])

    assert.deepEqual(chips, [
      {
        id: 'insurance-1',
        label: 'General liability insured',
        category: 'insurance',
        status: 'active',
      },
    ])
    assert.equal(isPrivateComplianceVisibility('private_only'), true)
    assert.equal(isPrivateComplianceVisibility('public_profile'), false)
  })

  it('labels unknown jurisdiction and high-risk missing proof without giving legal advice', () => {
    const packet = buildCompliancePacket({
      event: highRiskEvent,
      credentials: [activeFoodHandler, expiredAlcohol],
    })

    assert.equal(packet.readinessState, 'blocked')
    assert.ok(packet.factors.some((factor) => factor.state === 'unknown-jurisdiction'))
    assert.ok(packet.factors.some((factor) => factor.state === 'expired-proof'))
    assert.ok(packet.escalations.some((item) => item.kind === 'consult-professional'))
    assert.match(packet.disclaimer, /not legal advice/i)
  })

  it('blocks quote send when linked event has high-risk missing compliance data', () => {
    const gate = buildQuoteComplianceGate({
      quoteId: 'quote-1',
      event: highRiskEvent,
      credentials: [activeFoodHandler],
    })

    assert.equal(gate.canSend, false)
    assert.equal(gate.readinessState, 'blocked')
    assert.ok(gate.message.includes('Compliance review required'))
  })
})
