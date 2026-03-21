import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { deriveConfirmedFacts } from '../../lib/workflow/confirmed-facts.js'
import { getEventWorkSurface } from '../../lib/workflow/preparable-actions.js'
import type { EventContext } from '../../lib/workflow/types.js'

function daysFromNow(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildContext(): EventContext {
  return {
    event: {
      id: 'event-1',
      occasion: 'Chef Tasting',
      event_date: daysFromNow(2),
      guest_count: 10,
      location_address: '123 Market Street',
      special_requests: null,
      quoted_price_cents: 250000,
      deposit_amount_cents: 50000,
      serve_time: '18:00:00',
      status: 'confirmed',
      client: {
        id: 'client-1',
        full_name: 'Alex Chen',
        email: 'alex@example.com',
      },
    },
    menus: [
      {
        id: 'menu-1',
        name: 'Dinner Menu',
        status: 'draft',
        dishCount: 4,
      },
    ],
    financial: {
      totalPaidCents: 50000,
      outstandingBalanceCents: 200000,
      paymentStatus: 'paid',
    },
  }
}

describe('deriveConfirmedFacts', () => {
  it('derives deposit and payment facts from financial payment status', () => {
    const ctx = buildContext()
    const facts = deriveConfirmedFacts(ctx)

    assert.equal(facts.depositReceived, true)
    assert.equal(facts.fullyPaid, true)
    assert.equal(facts.isLegallyActionable, true)
  })

  it('treats unpaid status as no deposit received', () => {
    const ctx = buildContext()
    ctx.financial = {
      totalPaidCents: 0,
      outstandingBalanceCents: 250000,
      paymentStatus: 'unpaid',
    }

    const facts = deriveConfirmedFacts(ctx)

    assert.equal(facts.depositReceived, false)
    assert.equal(facts.fullyPaid, false)
  })

  it('derives menu and stage facts from event context', () => {
    const ctx = buildContext()
    const facts = deriveConfirmedFacts(ctx)

    assert.equal(facts.hasMenuAttached, true)
    assert.equal(facts.hasMenuWithDishes, true)
    assert.equal(facts.eventConfirmed, true)
    assert.equal(facts.guestCountStable, true)
  })
})

describe('getEventWorkSurface', () => {
  it('returns prep items as preparable when event is legally actionable', () => {
    const ctx = buildContext()
    ctx.event.event_date = daysFromNow(5)

    const surface = getEventWorkSurface(ctx)
    const prepItem = surface.items.find((item) => item.stage === 'prep_list')

    assert.ok(prepItem)
    assert.equal(prepItem?.category, 'preparable')
    assert.equal(prepItem?.title, 'Begin early prep items')
  })

  it('surfaces travel confirmation for confirmed events within 3 days', () => {
    const ctx = buildContext()
    ctx.event.event_date = daysFromNow(2)

    const surface = getEventWorkSurface(ctx)
    const travelItem = surface.items.find((item) => item.stage === 'travel_arrival')

    assert.ok(travelItem)
    assert.equal(travelItem?.title, 'Confirm travel plan')
  })

  it('surfaces grocery phase C for confirmed events within 7 days', () => {
    const ctx = buildContext()
    ctx.event.event_date = daysFromNow(2)

    const surface = getEventWorkSurface(ctx)
    const groceryItem = surface.items.find((item) => item.stage === 'grocery_list')

    assert.ok(groceryItem)
    assert.equal(groceryItem?.title, 'Finalize grocery list (Phase C)')
  })

  it('produces no work items for cancelled events', () => {
    const ctx = buildContext()
    ctx.event.status = 'cancelled'

    const surface = getEventWorkSurface(ctx)

    assert.equal(surface.items.length, 0)
  })
})
