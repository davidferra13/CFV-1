import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { summarizeApprovedWork } from '@/lib/work-ledger/summary'

describe('work ledger summaries', () => {
  it('keeps actor clocks separate and excludes unapproved sessions', () => {
    const summary = summarizeApprovedWork([
      { actorType: 'david_active', status: 'approved', durationMinutes: 60 },
      { actorType: 'david_supervisory', status: 'approved', durationMinutes: 20 },
      { actorType: 'ai_agent_runtime', status: 'approved', durationMinutes: 300 },
      { actorType: 'staff', status: 'approved', durationMinutes: 45 },
      { actorType: 'david_active', status: 'proposed', durationMinutes: 120 },
      { actorType: 'david_active', status: 'approved', durationMinutes: null },
    ])

    assert.deepEqual(summary, {
      david_active: 60,
      david_supervisory: 20,
      ai_agent_runtime: 300,
      staff: 45,
      system: 0,
    })
  })
})
