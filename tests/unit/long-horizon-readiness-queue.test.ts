import test from 'node:test'
import assert from 'node:assert/strict'

import { convertWorkItemsToQueueItems } from '@/lib/queue/providers/event'
import type { EventWorkSurface } from '@/lib/workflow/types'

function futureDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().slice(0, 10)
}

const completeFacts: EventWorkSurface['facts'] = {
  hasClient: true,
  hasOccasion: true,
  hasDate: true,
  hasLocation: true,
  hasGuestCount: true,
  hasServeTimeWindow: true,
  hasMenuDirection: true,
  hasMenuAttached: true,
  hasMenuWithDishes: true,
  menuGravityStable: true,
  hasPricing: true,
  hasDepositDefined: true,
  depositReceived: true,
  fullyPaid: false,
  isLegallyActionable: true,
  guestCountStable: true,
  eventConfirmed: true,
  dateWithin7Days: false,
  dateWithin3Days: false,
  dateWithin24Hours: false,
  dateIsToday: false,
  dateInPast: false,
  isCancelled: false,
  isCompleted: false,
  isTerminal: false,
}

function eventSurface(overrides: Partial<EventWorkSurface> = {}): EventWorkSurface {
  return {
    eventId: 'event-long-1',
    eventOccasion: 'June Dinner',
    eventDate: futureDate(100),
    clientName: 'Maya Chen',
    status: 'confirmed',
    facts: completeFacts,
    items: [],
    ...overrides,
  }
}

test('long-horizon confirmed dinners with missing source-backed facts enter the priority queue', () => {
  const items = convertWorkItemsToQueueItems(
    [],
    [
      eventSurface({
        facts: {
          ...completeFacts,
          hasLocation: false,
          hasServeTimeWindow: false,
          menuGravityStable: false,
        },
      }),
    ]
  )

  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'event:long_horizon_readiness:event-long-1')
  assert.equal(items[0].domain, 'event')
  assert.match(items[0].description, /address, access, or venue details/)
  assert.match(items[0].blocks ?? '', /Quiet runway/)
  assert.match(items[0].contextLine ?? '', /events.location_address/)
  assert.match(items[0].contextLine ?? '', /snooze/)
  assert.match(items[0].contextLine ?? '', /escalate/)
})

test('all-clear long-horizon dinners do not flood the queue', () => {
  const items = convertWorkItemsToQueueItems([], [eventSurface()])

  assert.equal(items.length, 0)
})

test('near-term or far-future events are left to existing event readiness flows', () => {
  const missingFacts = {
    ...completeFacts,
    hasLocation: false,
  }

  const items = convertWorkItemsToQueueItems(
    [],
    [
      eventSurface({ eventId: 'near-term', eventDate: futureDate(20), facts: missingFacts }),
      eventSurface({ eventId: 'far-future', eventDate: futureDate(220), facts: missingFacts }),
    ]
  )

  assert.equal(items.length, 0)
})
