import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildClientSafeCrisisSummary,
  buildCrisisDashboardPriorityCards,
  canSendCrisisCommunicationDraft,
  deriveHighestCrisisSeverity,
  deriveIncidentSeverityFromRiskProfile,
  isSensitiveCrisisVisibility,
  type CrisisCommunicationDraftContract,
  type CrisisIncidentContract,
  type CrisisRecoveryActionContract,
  type CrisisRecurrenceGuardContract,
  type CrisisRiskProfile,
} from '../../lib/intelligence/crisis-and-recovery-studio-contract.js'

const riskProfile: CrisisRiskProfile = {
  safetyRisk: 'medium',
  financialRisk: 'low',
  privacyRisk: 'high',
  relationshipRisk: 'medium',
  publicReputationRisk: 'low',
  legalOrInsuranceReviewNeeded: true,
  professionalReviewLanguageRequired: true,
}

function incident(overrides: Partial<CrisisIncidentContract> = {}): CrisisIncidentContract {
  return {
    id: 'incident-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    type: 'privacy_incident',
    title: 'Wrong attachment sent to client',
    occurredAt: '2026-05-21T12:00:00.000Z',
    detectedAt: '2026-05-21T12:10:00.000Z',
    state: 'active',
    severity: 'high',
    affectedEventId: 'event-1',
    affectedClientId: 'client-1',
    affectedVendorId: null,
    affectedStaffMemberId: null,
    ownerUserId: 'user-1',
    riskProfile,
    privateSummary: 'Private incident details stay chef-only.',
    chefOnlyNotes: 'Include exact exposure notes here.',
    evidenceItemIds: ['evidence-1'],
    recoveryActionIds: ['action-1', 'action-2'],
    communicationDraftIds: ['draft-1'],
    recurrenceGuardIds: ['guard-1'],
    sourceRefs: [
      {
        source: 'chef_incident',
        table: 'chef_incidents',
        rowId: 'incident-1',
      },
    ],
    visibility: 'private_incident',
    ...overrides,
  }
}

function recoveryAction(
  overrides: Partial<CrisisRecoveryActionContract> = {}
): CrisisRecoveryActionContract {
  return {
    id: 'action-1',
    tenantId: 'tenant-1',
    incidentId: 'incident-1',
    kind: 'client_follow_up',
    label: 'Send corrected packet and follow up tomorrow',
    ownerUserId: 'user-1',
    dueAt: '2026-05-20T12:00:00.000Z',
    completedAt: null,
    state: 'approved',
    promisedToClient: true,
    externalPartyId: 'client-1',
    linkedEvidenceItemIds: ['evidence-1'],
    visibility: 'client_safe_summary',
    ...overrides,
  }
}

function recurrenceGuard(
  overrides: Partial<CrisisRecurrenceGuardContract> = {}
): CrisisRecurrenceGuardContract {
  return {
    id: 'guard-1',
    tenantId: 'tenant-1',
    incidentId: 'incident-1',
    kind: 'privacy_check',
    triggerContext: 'event_planning',
    label: 'Confirm packet recipients before sending',
    state: 'active',
    severity: 'medium',
    triggerBeforeHours: 48,
    sourceIncidentId: 'incident-1',
    visibility: 'chef_internal',
    ...overrides,
  }
}

function draft(
  overrides: Partial<CrisisCommunicationDraftContract> = {}
): CrisisCommunicationDraftContract {
  return {
    id: 'draft-1',
    tenantId: 'tenant-1',
    incidentId: 'incident-1',
    audience: 'client',
    channel: 'email',
    purpose: 'follow_up',
    body: 'We have corrected the packet and will confirm next steps tomorrow.',
    state: 'approved',
    approvedByUserId: 'user-1',
    approvedAt: '2026-05-21T13:00:00.000Z',
    blockedSensitiveFactors: [],
    visibility: 'client_safe_summary',
    ...overrides,
  }
}

describe('Crisis and Recovery Studio contract', () => {
  it('defines severity derivation and sensitive visibility guards', () => {
    assert.equal(deriveHighestCrisisSeverity(['low', 'high', 'medium']), 'high')
    assert.equal(deriveHighestCrisisSeverity([]), 'unknown')
    assert.equal(deriveIncidentSeverityFromRiskProfile(riskProfile), 'high')

    assert.equal(isSensitiveCrisisVisibility('private_incident'), true)
    assert.equal(isSensitiveCrisisVisibility('privileged_review'), true)
    assert.equal(isSensitiveCrisisVisibility('client_safe_summary'), false)
  })

  it('blocks communication until approval, safe visibility, and redaction are complete', () => {
    assert.equal(canSendCrisisCommunicationDraft(draft()), true)
    assert.equal(canSendCrisisCommunicationDraft(draft({ state: 'needs_review' })), false)
    assert.equal(canSendCrisisCommunicationDraft(draft({ approvedAt: null })), false)
    assert.equal(
      canSendCrisisCommunicationDraft(draft({ blockedSensitiveFactors: ['private evidence'] })),
      false
    )
    assert.equal(canSendCrisisCommunicationDraft(draft({ visibility: 'private_incident' })), false)
  })

  it('builds chef dashboard priority without leaking private data to client-safe summary', () => {
    const incidents = [
      incident(),
      incident({
        id: 'resolved',
        title: 'Resolved refund',
        state: 'resolved',
        severity: 'critical',
      }),
    ]
    const actions = [
      recoveryAction(),
      recoveryAction({
        id: 'action-private',
        promisedToClient: false,
        visibility: 'private_incident',
      }),
    ]
    const guards = [recurrenceGuard()]

    const cards = buildCrisisDashboardPriorityCards({
      incidents,
      recoveryActions: actions,
      recurrenceGuards: guards,
      now: new Date('2026-05-21T12:00:00.000Z'),
    })

    assert.deepEqual(
      cards.map((card) => card.incidentId),
      ['incident-1']
    )
    assert.equal(cards[0].visibility, 'chef_internal')
    assert.equal(cards[0].nextActionLabels[0], 'Send corrected packet and follow up tomorrow')
    assert.equal(cards[0].recurrenceGuardLabels[0], 'Confirm packet recipients before sending')

    const summary = buildClientSafeCrisisSummary({
      incident: incidents[0],
      recoveryActions: actions,
    })

    assert.deepEqual(summary.recoveryCommitments, ['Send corrected packet and follow up tomorrow'])
    assert.equal(summary.blockedPrivateFactorCount, 2)
    assert.equal(summary.visibility, 'client_safe_summary')
  })
})
