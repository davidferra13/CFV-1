import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildClientCallMemorySnapshot, type ClientCallMemoryCall } from '../../lib/clients/client-call-memory'

const NOW = new Date('2026-04-29T16:00:00.000Z')

describe('client call memory', () => {
  it('summarizes call history, unresolved promises, and outcome quality', () => {
    const snapshot = buildClientCallMemorySnapshot(
      [
        call({
          id: 'call-1',
          scheduled_at: '2026-04-28T16:00:00.000Z',
          status: 'completed',
          outcome_summary: 'Client approved the revised proposal and confirmed deposit timing.',
          call_notes:
            'They want the family-style starter and asked us to keep the shellfish allergy separate.',
          next_action: 'Send final menu and deposit reminder',
          next_action_due_at: '2026-04-30T16:00:00.000Z',
          actual_duration_minutes: 18,
        }),
        call({
          id: 'call-2',
          scheduled_at: '2026-04-20T16:00:00.000Z',
          status: 'completed',
          outcome_summary: 'Talked to client.',
        }),
        call({
          id: 'call-3',
          scheduled_at: '2026-05-01T16:00:00.000Z',
          status: 'scheduled',
          title: 'Pre-service logistics',
        }),
      ],
      NOW
    )

    assert.equal(snapshot.totalCalls, 3)
    assert.equal(snapshot.completedCalls, 2)
    assert.equal(snapshot.upcomingCalls, 1)
    assert.equal(snapshot.weakOutcomes, 1)
    assert.equal(snapshot.unresolvedPromises.length, 1)
    assert.equal(snapshot.nextCall?.id, 'call-3')
    assert.equal(snapshot.relationshipTemperature, 'warm')
  })

  it('marks missing outcomes or missed calls as needing attention', () => {
    const snapshot = buildClientCallMemorySnapshot(
      [
        call({
          id: 'call-missed',
          scheduled_at: '2026-04-24T16:00:00.000Z',
          status: 'no_show',
        }),
        call({
          id: 'call-empty',
          scheduled_at: '2026-04-25T16:00:00.000Z',
          status: 'completed',
        }),
      ],
      NOW
    )

    assert.equal(snapshot.relationshipTemperature, 'needs_attention')
    assert.equal(snapshot.missingOutcomes, 1)
    assert.equal(snapshot.missedCalls, 1)
  })

  it('returns new relationship state when no calls exist', () => {
    const snapshot = buildClientCallMemorySnapshot([], NOW)

    assert.equal(snapshot.relationshipTemperature, 'new')
    assert.equal(snapshot.totalCalls, 0)
    assert.equal(snapshot.lastCall, null)
    assert.equal(snapshot.averageOutcomeQuality, null)
  })
})

function call(overrides: Partial<ClientCallMemoryCall>): ClientCallMemoryCall {
  return {
    id: 'call',
    call_type: 'follow_up',
    scheduled_at: '2026-04-29T16:00:00.000Z',
    duration_minutes: 15,
    status: 'scheduled',
    title: null,
    outcome_summary: null,
    call_notes: null,
    next_action: null,
    next_action_due_at: null,
    actual_duration_minutes: null,
    ...overrides,
  }
}
