import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStructuredDietaryItems,
  evaluateCapacityDecision,
  getReminderOffsetKeys,
  isCriticalRsvpChange,
  resolveRsvpWriteState,
} from '../../lib/sharing/policy.js'

describe('sharing/policy - buildStructuredDietaryItems', () => {
  it('normalizes and deduplicates items while preserving highest severity', () => {
    const items = buildStructuredDietaryItems({
      dietaryRestrictions: ['No dairy (preference)'],
      allergies: ['Peanut (anaphylaxis)', 'peanut'],
      plusOneAllergies: ['shellfish intolerance'],
    })

    const peanut = items.find((item) => item.label.toLowerCase() === 'peanut')
    assert.ok(peanut)
    assert.equal(peanut?.severity, 'anaphylaxis')

    const shellfish = items.find((item) => item.label.toLowerCase() === 'shellfish')
    assert.equal(shellfish?.severity, 'intolerance')

    assert.ok(items.some((item) => item.item_type === 'dietary'))
  })
})

describe('sharing/policy - evaluateCapacityDecision', () => {
  it('waitlists when at capacity and waitlist enabled', () => {
    const result = evaluateCapacityDecision({
      currentAttending: 10,
      capacityLimit: 10,
      enforceCapacity: true,
      waitlistEnabled: true,
      requestedAttending: true,
    })
    assert.equal(result.allowAttending, false)
    assert.equal(result.shouldWaitlist, true)
    assert.equal(result.rejectReason, null)
  })

  it('rejects when at capacity and waitlist disabled', () => {
    const result = evaluateCapacityDecision({
      currentAttending: 10,
      capacityLimit: 10,
      enforceCapacity: true,
      waitlistEnabled: false,
      requestedAttending: true,
    })
    assert.equal(result.allowAttending, false)
    assert.equal(result.shouldWaitlist, false)
    assert.match(result.rejectReason || '', /capacity/i)
  })
})

describe('sharing/policy - isCriticalRsvpChange', () => {
  it('flags status transitions as critical', () => {
    const result = isCriticalRsvpChange(
      { rsvp_status: 'attending', allergies: [] },
      { rsvp_status: 'declined', allergies: [] },
      []
    )
    assert.equal(result.critical, true)
  })

  it('flags anaphylaxis entries as critical', () => {
    const result = isCriticalRsvpChange(
      { rsvp_status: 'pending', allergies: [] },
      { rsvp_status: 'pending', allergies: [] },
      [
        {
          subject: 'guest',
          item_type: 'allergy',
          label: 'peanut',
          severity: 'anaphylaxis',
        },
      ]
    )
    assert.equal(result.critical, true)
  })
})

describe('sharing/policy - getReminderOffsetKeys', () => {
  it('filters unknown reminder keys', () => {
    const keys = getReminderOffsetKeys(['7d', 'bad-key', '24h'])
    assert.deepEqual(keys, ['7d', '24h'])
  })

  it('uses fallback schedule when empty', () => {
    const keys = getReminderOffsetKeys([])
    assert.deepEqual(keys, ['7d', '3d', '24h'])
  })
})

describe('sharing/policy - resolveRsvpWriteState', () => {
  it('marks attending as waitlisted when capacity gate says waitlist', () => {
    const state = resolveRsvpWriteState({
      requestedStatus: 'attending',
      shouldWaitlist: true,
      previousQueueStatus: 'none',
    })

    assert.deepEqual(state, {
      rsvp_status: 'pending',
      attendance_queue_status: 'waitlisted',
      waitlisted: true,
      promoted: false,
    })
  })

  it('promotes previously waitlisted guest when attending is allowed', () => {
    const state = resolveRsvpWriteState({
      requestedStatus: 'attending',
      shouldWaitlist: false,
      previousQueueStatus: 'waitlisted',
    })

    assert.deepEqual(state, {
      rsvp_status: 'attending',
      attendance_queue_status: 'promoted',
      waitlisted: false,
      promoted: true,
    })
  })

  it('clears queue state for non-attending responses', () => {
    const state = resolveRsvpWriteState({
      requestedStatus: 'declined',
      shouldWaitlist: false,
      previousQueueStatus: 'waitlisted',
    })

    assert.deepEqual(state, {
      rsvp_status: 'declined',
      attendance_queue_status: 'none',
      waitlisted: false,
      promoted: false,
    })
  })
})
