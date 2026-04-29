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
    assert.equal(recommendation?.interventionAction, 'call_now')
    assert.ok((recommendation?.interventionScore ?? 0) >= 70)
    assert.ok(
      recommendation?.reasonTrace.some((item) => item.signal === 'qualified_inquiry_facts')
    )
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
    assert.equal(recommendation?.interventionAction, 'call_now')
    assert.ok(recommendation?.noCallRisk.includes('price'))
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
    assert.ok(
      recommendation?.reasonTrace.some((item) => item.signal === 'service_window_close')
    )
  })

  it('recommends a human call when an event thread is confused or urgent', () => {
    const farFuture = new Date()
    farFuture.setDate(farFuture.getDate() + 21)

    const recommendation = recommendCallForEvent({
      id: 'event-urgent-thread',
      status: 'confirmed',
      eventDate: farFuture.toISOString(),
      occasion: 'Garden dinner',
      messages: [
        {
          direction: 'inbound',
          body: 'I am confused about the setup and worried we missed something. Can we talk?',
          created_at: new Date().toISOString(),
        },
      ],
    })

    assert.equal(recommendation?.kind, 'call_now')
    assert.equal(recommendation?.callType, 'follow_up')
    assert.equal(recommendation?.urgency, 'now')
    assert.equal(recommendation?.interventionAction, 'call_now')
    assert.ok(
      recommendation?.reasonTrace.some((item) => item.signal === 'human_touch_language')
    )
  })

  it('recommends a human call when an inquiry thread directly asks to talk', () => {
    const recommendation = recommendCallForInquiry({
      id: 'inq-human-touch',
      status: 'awaiting_chef',
      clientName: 'Mara',
      messages: [
        {
          direction: 'inbound',
          body: 'This is getting complicated. Can we hop on the phone?',
          created_at: new Date().toISOString(),
        },
      ],
    })

    assert.equal(recommendation?.kind, 'call_now')
    assert.equal(recommendation?.callType, 'follow_up')
    assert.ok((recommendation?.interventionScore ?? 0) >= 75)
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
    assert.ok(recommendation?.idealOutcome.includes('Feedback'))
  })
})
