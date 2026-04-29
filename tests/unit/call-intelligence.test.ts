import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildCallIntelligenceSnapshot,
  type CallIntelligenceAiCall,
  type CallIntelligenceHumanCall,
  type CallIntelligenceSupplierCall,
} from '@/lib/calls/intelligence'

const NOW = new Date('2026-04-28T16:00:00.000Z')

describe('call intelligence snapshot', () => {
  it('prioritizes overdue human calls and missing outcomes', () => {
    const snapshot = buildCallIntelligenceSnapshot({
      now: NOW,
      humanCalls: [
        humanCall({
          id: 'call-overdue',
          status: 'scheduled',
          scheduled_at: '2026-04-28T14:00:00.000Z',
          contact_name: 'Dana Client',
        }),
        humanCall({
          id: 'call-complete',
          status: 'completed',
          scheduled_at: '2026-04-27T14:00:00.000Z',
          completed_at: '2026-04-27T14:30:00.000Z',
        }),
      ],
      aiCalls: [],
      supplierCalls: [],
    })

    assert.equal(snapshot.stats.humanScheduled, 2)
    assert.equal(snapshot.stats.humanOverdue, 1)
    assert.equal(snapshot.stats.outcomesLogged, 0)
    assert.equal(snapshot.automationCoverage.humanCallsMissingOutcomes, 1)
    assert.equal(snapshot.humanInterventions[0].id, 'scheduled-overdue-call-overdue')
    assert.equal(snapshot.humanInterventions[0].urgency, 'critical')
    assert.ok(
      snapshot.humanInterventions.some((item) => item.id === 'scheduled-missing-outcome-call-complete')
    )
  })

  it('connects inbound AI calls, supplier failures, recordings, and transcripts', () => {
    const snapshot = buildCallIntelligenceSnapshot({
      now: NOW,
      humanCalls: [],
      aiCalls: [
        aiCall({
          id: 'ai-inbound',
          direction: 'inbound',
          role: 'inbound_voicemail',
          contact_name: 'Vendor Desk',
          full_transcript: 'Please call us back about the produce order.',
          recording_url: 'https://example.test/recording.mp3',
          duration_seconds: 80,
        }),
      ],
      supplierCalls: [
        supplierCall({
          id: 'supplier-no',
          vendor_name: 'Market A',
          ingredient_name: 'meyer lemons',
          result: 'no',
          status: 'completed',
          duration_seconds: 40,
          speech_transcript: 'No lemons available today.',
        }),
      ],
    })

    assert.equal(snapshot.stats.aiCalls, 1)
    assert.equal(snapshot.stats.supplierCalls, 1)
    assert.equal(snapshot.stats.totalVoiceRecords, 2)
    assert.equal(snapshot.stats.recordings, 1)
    assert.equal(snapshot.stats.transcripts, 2)
    assert.equal(snapshot.stats.averageVoiceDurationSeconds, 60)
    assert.ok(snapshot.humanInterventions.some((item) => item.id === 'ai-inbound-ai-inbound'))
    assert.ok(snapshot.humanInterventions.some((item) => item.id === 'supplier-no-supplier-no'))
  })

  it('marks failed sources as unavailable instead of zero', () => {
    const snapshot = buildCallIntelligenceSnapshot({
      now: NOW,
      humanCalls: [],
      aiCalls: [],
      supplierCalls: [],
      sourceErrors: [{ source: 'ai_calls', error: 'network failure' }],
    })

    assert.equal(snapshot.stats.humanScheduled, 0)
    assert.equal(snapshot.stats.aiCalls, null)
    assert.equal(snapshot.stats.totalVoiceRecords, null)
    assert.equal(snapshot.automationCoverage.voiceRecordsWithTranscripts, null)
    assert.ok(snapshot.engineGaps.includes('One or more call data sources could not be read for this snapshot.'))
  })
})

function humanCall(overrides: Partial<CallIntelligenceHumanCall>): CallIntelligenceHumanCall {
  return {
    id: 'call-1',
    client_id: null,
    contact_name: 'Client',
    contact_phone: null,
    contact_company: null,
    call_type: 'discovery',
    scheduled_at: '2026-04-28T17:00:00.000Z',
    duration_minutes: 30,
    status: 'scheduled',
    outcome_summary: null,
    call_notes: null,
    next_action: null,
    next_action_due_at: null,
    actual_duration_minutes: null,
    completed_at: null,
    created_at: '2026-04-28T12:00:00.000Z',
    ...overrides,
  }
}

function aiCall(overrides: Partial<CallIntelligenceAiCall>): CallIntelligenceAiCall {
  return {
    id: 'ai-1',
    direction: 'outbound',
    role: 'vendor_availability',
    contact_phone: null,
    contact_name: null,
    subject: null,
    status: 'completed',
    result: null,
    full_transcript: null,
    extracted_data: null,
    action_log: null,
    recording_url: null,
    duration_seconds: null,
    created_at: '2026-04-28T12:00:00.000Z',
    ...overrides,
  }
}

function supplierCall(
  overrides: Partial<CallIntelligenceSupplierCall>
): CallIntelligenceSupplierCall {
  return {
    id: 'supplier-1',
    vendor_name: null,
    vendor_phone: null,
    ingredient_name: null,
    status: 'completed',
    result: null,
    duration_seconds: null,
    recording_url: null,
    speech_transcript: null,
    created_at: '2026-04-28T12:00:00.000Z',
    ...overrides,
  }
}
