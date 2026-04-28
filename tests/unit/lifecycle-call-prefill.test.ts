import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildLifecycleCallHref,
  normalizeLifecycleCallDuration,
  normalizeLifecycleCallType,
} from '@/lib/calls/lifecycle-prefill'

describe('lifecycle call prefill helpers', () => {
  it('normalizes invalid call types and durations to safe defaults', () => {
    assert.equal(normalizeLifecycleCallType('proposal_walkthrough'), 'proposal_walkthrough')
    assert.equal(normalizeLifecycleCallType('not-real'), 'general')
    assert.equal(normalizeLifecycleCallDuration('20'), 20)
    assert.equal(normalizeLifecycleCallDuration('3'), undefined)
    assert.equal(normalizeLifecycleCallDuration('900'), undefined)
  })

  it('builds a schedule-call URL with encoded lifecycle context', () => {
    const href = buildLifecycleCallHref({
      callType: 'discovery',
      clientId: 'client-1',
      clientName: 'Joy Kaplan',
      contactPhone: '+1 555 123 0000',
      inquiryId: 'inquiry-1',
      title: 'Discovery call with Joy Kaplan',
      prepNotes: 'Confirm budget, date, scope, and deposit timing.',
      durationMinutes: 30,
      notifyClient: true,
    })

    const url = new URL(href, 'https://cheflowhq.com')
    assert.equal(url.pathname, '/calls/new')
    assert.equal(url.searchParams.get('call_type'), 'discovery')
    assert.equal(url.searchParams.get('client_id'), 'client-1')
    assert.equal(url.searchParams.get('client_name'), 'Joy Kaplan')
    assert.equal(url.searchParams.get('contact_phone'), '+1 555 123 0000')
    assert.equal(url.searchParams.get('inquiry_id'), 'inquiry-1')
    assert.equal(url.searchParams.get('duration_minutes'), '30')
    assert.equal(url.searchParams.get('notify_client'), 'true')
  })
})
