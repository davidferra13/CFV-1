import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildAssignmentScopedBriefingExport,
  deriveAssignmentTrustState,
  deriveMostRestrictiveDelegationAccessState,
  getDisallowedAssignmentScopes,
  isAssignmentScopedDelegationVisibility,
  requiresChefOnlyDelegationVisibility,
  type CollaboratorProfileContract,
  type DelegationAssignmentContract,
  type TrainingChecklistItemContract,
  type TrustMemoryContract,
} from '../../lib/intelligence/staff-trust-delegation-contract.js'

const sourceRef = {
  source: 'event_staff_assignment' as const,
  table: 'event_staff_assignments' as const,
  rowId: 'assignment-1',
}

function profile(
  overrides: Partial<CollaboratorProfileContract> = {}
): CollaboratorProfileContract {
  return {
    id: 'profile-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    collaboratorKind: 'staff_member',
    collaboratorId: 'staff-1',
    displayName: 'Maya Line Cook',
    roleLabels: ['kitchen_assistant'],
    skills: ['prep', 'plating'],
    certifications: ['food_handler'],
    restrictions: [],
    trustTagIds: [],
    contactVisibility: 'chef_internal',
    payVisibility: 'private_only',
    emergencyContactVisibility: 'private_only',
    status: 'active',
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function assignment(
  overrides: Partial<DelegationAssignmentContract> = {}
): DelegationAssignmentContract {
  return {
    id: 'assignment-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    eventId: 'event-1',
    collaboratorKind: 'staff_member',
    collaboratorId: 'staff-1',
    assignmentRole: 'prep_assistant',
    status: 'planned',
    checkInState: 'not_checked_in',
    requestedScopes: ['event_overview', 'prep_tasks', 'station_tasks'],
    approvedScopes: ['event_overview', 'prep_tasks', 'station_tasks'],
    taskIds: ['task-1'],
    stationIds: ['station-1'],
    trainingChecklistIds: ['training-food-handler'],
    trustMemoryIds: ['memory-1'],
    overrideReason: null,
    privateNotes: null,
    sourceRefs: [sourceRef],
    visibility: 'assignment_scoped',
    ...overrides,
  }
}

function trustMemory(overrides: Partial<TrustMemoryContract> = {}): TrustMemoryContract {
  return {
    id: 'memory-1',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    collaboratorKind: 'staff_member',
    collaboratorId: 'staff-1',
    dimension: 'reliability',
    signal: 'positive',
    state: 'observed',
    confidence: 'high',
    rating: 5,
    summary: 'Arrived early and finished prep cleanly.',
    incidentSeverity: null,
    clientFitTags: ['quiet-service'],
    eventId: 'event-1',
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

function trainingItem(
  overrides: Partial<TrainingChecklistItemContract> = {}
): TrainingChecklistItemContract {
  return {
    id: 'training-food-handler',
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    collaboratorKind: 'staff_member',
    collaboratorId: 'staff-1',
    key: 'food_handler',
    label: 'Food handler certificate',
    status: 'complete',
    requiredForScopes: ['prep_tasks', 'station_tasks'],
    completedAt: '2026-05-20T10:00:00.000Z',
    expiresAt: null,
    evidenceRef: null,
    sourceRefs: [sourceRef],
    visibility: 'chef_internal',
    ...overrides,
  }
}

describe('Staff Trust and Delegation System contract', () => {
  it('defines assignment-scoped visibility and chef-only private facts', () => {
    assert.equal(isAssignmentScopedDelegationVisibility('assignment_scoped'), true)
    assert.equal(isAssignmentScopedDelegationVisibility('staff_safe_briefing'), true)
    assert.equal(isAssignmentScopedDelegationVisibility('private_only'), false)

    assert.equal(requiresChefOnlyDelegationVisibility('private_only'), true)
    assert.equal(requiresChefOnlyDelegationVisibility('pay_private'), true)
    assert.equal(requiresChefOnlyDelegationVisibility('staff_safe_briefing'), false)
  })

  it('blocks sensitive assignment scopes unless explicitly overridden by the chef', () => {
    assert.deepEqual(
      getDisallowedAssignmentScopes({
        collaboratorKind: 'staff_member',
        requestedScopes: ['event_overview', 'client_household_memory', 'pricing_financials'],
        overrideReason: null,
      }),
      ['client_household_memory', 'pricing_financials']
    )

    assert.deepEqual(
      getDisallowedAssignmentScopes({
        collaboratorKind: 'delegate',
        requestedScopes: ['event_overview', 'guest_list', 'client_household_memory'],
        overrideReason: 'Host authorized PA for home access coordination.',
      }),
      []
    )
  })

  it('derives assignment trust from access scope, training, and trust memory', () => {
    assert.equal(
      deriveAssignmentTrustState({
        profile: profile(),
        assignment: assignment(),
        trustMemories: [trustMemory()],
        trainingItems: [trainingItem()],
      }),
      'trusted'
    )

    assert.equal(
      deriveAssignmentTrustState({
        profile: profile({ restrictions: ['Do not assign to front-of-house client interaction.'] }),
        assignment: assignment({
          requestedScopes: ['event_overview', 'client_household_memory'],
          approvedScopes: ['event_overview', 'client_household_memory'],
        }),
        trustMemories: [
          trustMemory({
            signal: 'negative',
            dimension: 'confidentiality',
            rating: 1,
            incidentSeverity: 'high',
            summary: 'Shared private household detail in the wrong channel.',
          }),
        ],
        trainingItems: [trainingItem({ status: 'pending' })],
      }),
      'blocked'
    )

    assert.equal(
      deriveMostRestrictiveDelegationAccessState(['trusted', 'needs_training', 'at_risk']),
      'at_risk'
    )
  })

  it('exports only assignment-scoped briefing data and redacts private notes', () => {
    const exported = buildAssignmentScopedBriefingExport({
      tenantId: 'tenant-1',
      eventId: 'event-1',
      assignments: [
        assignment({
          id: 'safe-assignment',
          approvedScopes: ['event_overview', 'prep_tasks'],
          privateNotes: 'Client home access code stays chef-only.',
        }),
        assignment({
          id: 'private-assignment',
          visibility: 'private_only',
          approvedScopes: ['client_household_memory'],
          privateNotes: 'Private reliability issue.',
        }),
      ],
    })

    assert.deepEqual(
      exported.assignments.map((safeAssignment) => safeAssignment.id),
      ['safe-assignment']
    )
    assert.equal('privateNotes' in exported.assignments[0], false)
    assert.deepEqual(exported.assignments[0]?.approvedScopes, ['event_overview', 'prep_tasks'])
    assert.equal(exported.blockedPrivateAssignmentCount, 1)
    assert.equal(exported.visibility, 'staff_safe_briefing')
  })
})
