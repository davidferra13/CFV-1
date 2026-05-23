import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildStaffTrustDelegationReadModel,
  buildStaffTrustDecisionForEvent,
  type StaffTrustDelegationSourceRows,
} from '../../lib/intelligence/staff-trust-delegation.js'

const sourceRows: StaffTrustDelegationSourceRows = {
  tenantId: 'tenant-1',
  generatedAt: '2026-05-21T12:00:00.000Z',
  staffMembers: [
    {
      id: 'staff-1',
      name: 'Maya Line Cook',
      role: 'kitchen_assistant',
      status: 'active',
    },
    {
      id: 'staff-2',
      name: 'Leo Server',
      role: 'server',
      status: 'active',
    },
  ],
  assignments: [
    {
      id: 'assignment-1',
      event_id: 'event-1',
      staff_member_id: 'staff-1',
      role_override: 'kitchen_assistant',
      status: 'scheduled',
      scheduled_hours: 5,
      actual_hours: null,
      pay_amount_cents: 12000,
      rating: 5,
      notes: 'Private client access code is handled by chef only.',
      events: {
        id: 'event-1',
        occasion: 'Vance Dinner',
        event_date: '2026-05-25',
        status: 'confirmed',
        guest_count: 18,
      },
    },
    {
      id: 'assignment-2',
      event_id: 'event-1',
      staff_member_id: 'staff-2',
      role_override: 'server',
      status: 'scheduled',
      scheduled_hours: 4,
      actual_hours: null,
      pay_amount_cents: null,
      rating: null,
      notes: 'Do not share staff incident note.',
      events: {
        id: 'event-1',
        occasion: 'Vance Dinner',
        event_date: '2026-05-25',
        status: 'confirmed',
        guest_count: 18,
      },
    },
  ],
  onboardingItems: [
    {
      id: 'onboarding-1',
      staff_member_id: 'staff-1',
      item_key: 'food_handler',
      status: 'complete',
      completed_at: '2026-05-20T10:00:00.000Z',
    },
    {
      id: 'onboarding-2',
      staff_member_id: 'staff-2',
      item_key: 'service_standards',
      status: 'pending',
      completed_at: null,
    },
  ],
  performanceScores: [
    {
      staff_member_id: 'staff-1',
      on_time_rate: 98,
      cancellation_count: 0,
      avg_rating: 4.8,
      total_events: 12,
    },
    {
      staff_member_id: 'staff-2',
      on_time_rate: 70,
      cancellation_count: 2,
      avg_rating: 3.1,
      total_events: 4,
    },
  ],
  tasks: [
    {
      id: 'task-1',
      event_id: 'event-1',
      assigned_to: 'staff-1',
      assignee_id: null,
      status: 'open',
      title: 'Pack garnish kit',
      priority: 'high',
    },
  ],
  events: [
    {
      id: 'event-1',
      occasion: 'Vance Dinner',
      event_date: '2026-05-25',
      status: 'confirmed',
      guest_count: 18,
      serve_time: '7:00 PM',
    },
  ],
}

describe('Staff Trust and Delegation read model', () => {
  it('summarizes collaborator trust without leaking private assignment facts', () => {
    const model = buildStaffTrustDelegationReadModel(sourceRows)
    const maya = model.collaborators.find((collaborator) => collaborator.id === 'staff-1')
    const leo = model.collaborators.find((collaborator) => collaborator.id === 'staff-2')

    assert.equal(model.summary.totalCollaborators, 2)
    assert.equal(model.summary.needsTrainingCount, 1)
    assert.equal(maya?.name, 'Maya Line Cook')
    assert.equal(maya?.accessState, 'trusted')
    assert.equal(leo?.accessState, 'needs_training')

    const serialized = JSON.stringify(model)
    assert.equal(serialized.includes('Private client access code'), false)
    assert.equal(serialized.includes('incident note'), false)
    assert.equal(serialized.includes('pay_amount_cents'), false)
    assert.equal(serialized.includes('12000'), false)
  })

  it('turns staffing gaps and trust unknowns into decision prompts for events', () => {
    const model = buildStaffTrustDelegationReadModel({
      ...sourceRows,
      assignments: sourceRows.assignments.slice(0, 1),
    })
    const decision = buildStaffTrustDecisionForEvent(model, 'event-1')

    assert.equal(decision?.eventId, 'event-1')
    assert.equal(decision?.level, 'warning')
    assert.match(decision?.headline ?? '', /staffing/i)
    assert.ok(decision?.nextActionHref.endsWith('/staff'))
  })
})
