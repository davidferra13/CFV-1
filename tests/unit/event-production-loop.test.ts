import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductionStages,
  computeScaledProductionRecipes,
  type ProductionLoopSignals,
} from '@/lib/events/production-loop'
import { buildChefEventOperatingSpine } from '@/lib/events/operating-spine'

function signals(overrides: Partial<ProductionLoopSignals> = {}): ProductionLoopSignals {
  return {
    eventStatus: 'confirmed',
    hasMenu: true,
    recipeCount: 4,
    incompleteRecipeCount: 0,
    shoppingEligible: true,
    shortageCount: 0,
    projectedPurchaseCents: 0,
    vendorCount: 0,
    prepBlockCount: 2,
    purchaseOrderCount: 0,
    openPurchaseOrderCount: 0,
    actualFoodCostCents: 0,
    unmatchedReceiptItems: 0,
    revenueCents: 0,
    totalCostCents: 0,
    ...overrides,
  }
}
test('scales a four-serving recipe to exactly three batches for twelve guests', () => {
  const recipes = computeScaledProductionRecipes({
    guestCount: 12,
    recipes: [{ id: 'recipe-1', name: 'Braised beef', servings: 4 }],
    components: [{ recipeId: 'recipe-1', scaleFactor: 1 }],
  })
  assert.deepEqual(recipes[0], {
    recipeId: 'recipe-1',
    name: 'Braised beef',
    baseServings: 4,
    batches: 3,
    targetServings: 12,
  })
})

test('adds repeated component demand instead of silently overwriting it', () => {
  const recipes = computeScaledProductionRecipes({
    guestCount: 8,
    recipes: [{ id: 'recipe-1', name: 'Sauce', servings: 4 }],
    components: [
      { recipeId: 'recipe-1', scaleFactor: 1 },
      { recipeId: 'recipe-1', scaleFactor: 0.5 },
    ],
  })
  assert.equal(recipes[0].batches, 3)
  assert.equal(recipes[0].targetServings, 12)
})

test('blocks scaling and purchasing when the menu is not production-ready', () => {
  const stages = buildProductionStages(signals({ hasMenu: false, recipeCount: 0 }))
  assert.equal(stages.find((stage) => stage.key === 'scale')?.state, 'blocked')
  assert.equal(stages.find((stage) => stage.key === 'buy')?.state, 'blocked')
})

test('keeps purchasing waiting until the booking is accepted or confirmed', () => {
  const stages = buildProductionStages(signals({ eventStatus: 'proposed', shoppingEligible: false }))
  const buy = stages.find((stage) => stage.key === 'buy')
  assert.equal(buy?.state, 'waiting')
  assert.equal(buy?.status, 'Waiting on booking')
})

test('surfaces shortages and missing prep blocks as concrete work', () => {
  const stages = buildProductionStages(
    signals({ shortageCount: 7, vendorCount: 3, prepBlockCount: 0 })
  )
  assert.equal(stages.find((stage) => stage.key === 'buy')?.status, '7 shortages')
  assert.equal(stages.find((stage) => stage.key === 'prep')?.state, 'attention')
})
test('requires receipt matching before a completed event is fully reconciled', () => {
  const stages = buildProductionStages(
    signals({ eventStatus: 'completed', actualFoodCostCents: 32500, unmatchedReceiptItems: 2 })
  )
  const reconcile = stages.find((stage) => stage.key === 'reconcile')
  assert.equal(reconcile?.state, 'attention')
  assert.equal(reconcile?.status, '2 unmatched')
})

test('marks completed events done when actual food cost is captured and matched', () => {
  const stages = buildProductionStages(
    signals({ eventStatus: 'completed', actualFoodCostCents: 32500, unmatchedReceiptItems: 0 })
  )
  assert.equal(stages.find((stage) => stage.key === 'reconcile')?.state, 'done')
})


test('event spine sends confirmed prep work into the production workspace', () => {
  const spine = buildChefEventOperatingSpine({
    event: {
      id: 'event-1',
      status: 'confirmed',
      event_date: '2026-10-01',
      serve_time: '18:00',
      guest_count: 12,
      client_id: 'client-1',
      location_address: '1 Main St',
      quoted_price_cents: 200000,
      dietary_restrictions: ['none'],
    },
    eventMenus: ['menu-1'],
    financialAvailable: true,
    totalPaidCents: 200000,
    outstandingBalanceCents: 0,
    prepTimelineReady: false,
  })

  assert.equal(spine.nextAction.label, 'Open production loop')
  assert.equal(spine.nextAction.href, '/events/event-1/production')
  assert.equal(spine.lanes.find((lane) => lane.key === 'prep')?.href, '/events/event-1/production')
})
