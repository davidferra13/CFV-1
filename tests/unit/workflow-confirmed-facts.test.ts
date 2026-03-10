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
    ops: {
      groceryListReady: false,
      prepListReady: false,
      equipmentListReady: false,
      packingListReady: false,
      timelineReady: false,
      executionSheetReady: false,
      nonNegotiablesChecked: false,
      shoppingCompletedAt: null,
      prepCompletedAt: null,
      carPacked: false,
      carPackedAt: null,
    },
    menus: [
      {
        id: 'menu-1',
        name: 'Dinner Menu',
        status: 'draft',
        dishCount: 4,
      },
    ],
    shopping: {
      activeListId: null,
      hasActiveList: false,
      completedListCount: 0,
      lastCompletedAt: null,
    },
    packing: {
      confirmedItemCount: 0,
    },
    travel: {
      hasServiceTravelRoute: false,
    },
    financial: {
      totalPaidCents: 50000,
      outstandingBalanceCents: 200000,
      paymentStatus: 'paid',
    },
  }
}

describe('deriveConfirmedFacts', () => {
  it('uses linked shopping lists to infer grocery readiness even when the event flag is stale', () => {
    const ctx = buildContext()
    ctx.shopping.activeListId = 'shopping-1'
    ctx.shopping.hasActiveList = true

    const facts = deriveConfirmedFacts(ctx)

    assert.equal(facts.groceryListReady, true)
    assert.equal(facts.shoppingComplete, false)
    assert.equal(facts.hasActiveShoppingList, true)
  })

  it('treats a completed shopping list as shopping complete when no active list remains', () => {
    const ctx = buildContext()
    ctx.shopping.completedListCount = 1
    ctx.shopping.lastCompletedAt = new Date().toISOString()

    const facts = deriveConfirmedFacts(ctx)

    assert.equal(facts.shoppingComplete, true)
    assert.equal(facts.groceryListReady, true)
  })
})

describe('getEventWorkSurface', () => {
  it('blocks prep when the prep list exists but shopping is not done yet', () => {
    const ctx = buildContext()
    ctx.ops.prepListReady = true
    ctx.shopping.activeListId = 'shopping-1'
    ctx.shopping.hasActiveList = true

    const surface = getEventWorkSurface(ctx)
    const prepItem = surface.items.find((item) => item.stage === 'prep_list')

    assert.ok(prepItem)
    assert.equal(prepItem?.category, 'blocked')
    assert.equal(prepItem?.title, 'Prep is blocked by shopping')
    assert.equal(prepItem?.actionUrl, '/events/event-1/prep')
  })

  it('advances prep to actionable work once shopping is complete', () => {
    const ctx = buildContext()
    ctx.event.event_date = daysFromNow(5)
    ctx.ops.prepListReady = true
    ctx.ops.shoppingCompletedAt = new Date().toISOString()

    const surface = getEventWorkSurface(ctx)
    const prepItem = surface.items.find((item) => item.stage === 'prep_list')

    assert.ok(prepItem)
    assert.equal(prepItem?.category, 'preparable')
    assert.equal(prepItem?.title, 'Begin early prep items')
  })

  it('requires the execution sheet before showing the start-event action on event day', () => {
    const ctx = buildContext()
    ctx.event.event_date = daysFromNow(0)
    ctx.ops.executionSheetReady = false

    const surface = getEventWorkSurface(ctx)
    const executionItem = surface.items.find((item) => item.stage === 'execution')

    assert.ok(executionItem)
    assert.equal(executionItem?.title, 'Finalize execution sheet')
    assert.equal(executionItem?.actionUrl, '/events/event-1')
  })

  it('sends shopping-stage work to the active shopping list', () => {
    const ctx = buildContext()
    ctx.shopping.activeListId = 'shopping-1'
    ctx.shopping.hasActiveList = true

    const surface = getEventWorkSurface(ctx)
    const groceryItem = surface.items.find((item) => item.stage === 'grocery_list')

    assert.ok(groceryItem)
    assert.equal(groceryItem?.title, 'Complete shopping run')
    assert.equal(groceryItem?.actionUrl, '/shopping/shopping-1')
  })
})
