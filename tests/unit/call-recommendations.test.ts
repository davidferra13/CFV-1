import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { recommendCallForEvent, recommendCallForInquiry } from '@/lib/calls/recommendations'

describe('call recommendations', () => {
  it('recommends a discovery call for a high-intent inquiry', () => {
    const recommendation = recommendCallForInquiry({
      id: 'inq-1',
      status: 'new',
      clientName: 'Joy',
      hasPhone: true,
      confirmedDate: '2026-05-10',
      confirmedGuestCount: 10,
      confirmedLocation: 'Boston',
      confirmedBudgetCents: 500000,
    })

    assert.equal(recommendation?.kind, 'call_now')
    assert.equal(recommendation?.callType, 'discovery')
  })

  it('prioritizes proposal calls when a quote is active', () => {
    const recommendation = recommendCallForInquiry({
      id: 'inq-2',
      status: 'quoted',
      clientName: 'Joy',
      quotes: [{ status: 'sent' }],
      messages: [
        {
          direction: 'inbound',
          body: 'Can we talk through the deposit?',
          created_at: new Date().toISOString(),
        },
      ],
    })

    assert.equal(recommendation?.callType, 'proposal_walkthrough')
    assert.equal(recommendation?.urgency, 'now')
  })

  it('recommends a logistics call for a confirmed event inside three days', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 2)

    const recommendation = recommendCallForEvent({
      id: 'event-1',
      status: 'confirmed',
      eventDate: soon.toISOString(),
      occasion: 'Birthday dinner',
    })

    assert.equal(recommendation?.kind, 'schedule_logistics')
    assert.equal(recommendation?.callType, 'pre_event_logistics')
  })

  it('recommends a day-after follow-up after completed service', () => {
    const completed = new Date()
    completed.setDate(completed.getDate() - 1)

    const recommendation = recommendCallForEvent({
      id: 'event-2',
      status: 'completed',
      occasion: 'Anniversary dinner',
      followUpSent: false,
      serviceCompletedAt: completed.toISOString(),
    })

    assert.equal(recommendation?.kind, 'schedule_day_after_followup')
    assert.equal(recommendation?.callType, 'follow_up')
  })
})
