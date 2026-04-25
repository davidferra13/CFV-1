import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDinnerCircleConfig } from '@/lib/dinner-circles/event-circle'
import { buildPopUpOperatingSnapshot } from '@/lib/popups/snapshot'

test('pop-up snapshot computes sold and remaining from ticket inventory', () => {
  const snapshot = buildPopUpOperatingSnapshot({
    now: new Date('2026-04-24T12:00:00Z'),
    event: {
      id: 'event-1',
      title: 'Noah weekend drop',
      event_date: '2026-05-01',
      status: 'confirmed',
      location: 'Cafe Juniper',
      guest_count: 50,
    },
    config: normalizeDinnerCircleConfig({
      popUp: {
        stage: 'orders_open',
        dropType: 'cafe_collab',
        preorderOpensAt: '2026-04-20T12:00:00Z',
        preorderClosesAt: '2026-04-28T12:00:00Z',
        pickupWindows: ['10-12'],
        locationProfile: {
          locationKind: 'cafe_collab',
          equipmentAvailable: ['cold case'],
          coldStorage: 'limited undercounter cold storage',
        },
        menuItems: [
          {
            ticketTypeId: 'type-1',
            dishIndexId: 'dish-1',
            recipeId: 'recipe-1',
            name: 'Yuzu tart',
            plannedUnits: 50,
            priceCents: 800,
            batchSize: 12,
            equipmentNeeded: ['cold case'],
            constraints: ['cold hold'],
          },
          {
            ticketTypeId: 'type-2',
            dishIndexId: 'dish-2',
            name: 'Miso cookie',
            plannedUnits: 30,
            priceCents: 500,
            equipmentNeeded: ['deck oven'],
          },
        ],
        closeout: {
          itemResults: [
            {
              name: 'Yuzu tart',
              plannedUnits: 50,
              producedUnits: 50,
              soldUnits: 45,
              wastedUnits: 5,
              revenueCents: 36000,
              estimatedCostCents: 1250,
            },
            {
              name: 'Miso cookie',
              plannedUnits: 30,
              producedUnits: 30,
              soldUnits: 10,
              wastedUnits: 20,
              revenueCents: 5000,
              estimatedCostCents: 0,
            },
          ],
        },
      },
      supplier: { rawInput: 'citrus\nmiso' },
    }).popUp!,
    ticketTypes: [
      {
        id: 'type-1',
        name: 'Yuzu tart',
        price_cents: 800,
        capacity: 50,
        sold_count: 12,
        is_active: true,
      },
      {
        id: 'type-2',
        name: 'Miso cookie',
        price_cents: 500,
        capacity: 30,
        sold_count: 4,
        is_active: true,
      },
    ],
    tickets: [
      {
        id: 'ticket-1',
        ticket_type_id: 'type-1',
        quantity: 10,
        total_cents: 8000,
        payment_status: 'paid',
        source: 'chefflow',
        notes: '[pickup:10-12]',
      },
      {
        id: 'ticket-2',
        ticket_type_id: 'type-1',
        quantity: 2,
        total_cents: 1600,
        payment_status: 'paid',
        source: 'walkin',
        notes: '[popup_source:dm]\n[pickup:10-12]',
      },
      {
        id: 'ticket-3',
        ticket_type_id: 'type-2',
        quantity: 4,
        total_cents: 2000,
        payment_status: 'paid',
        source: 'comp',
        notes: null,
      },
    ],
    dishSummaries: [
      {
        id: 'dish-1',
        linked_recipe_id: 'recipe-1',
        times_served: 5,
        per_portion_cost_cents: 250,
      },
      {
        id: 'dish-2',
        linked_recipe_id: null,
        times_served: 0,
        per_portion_cost_cents: null,
      },
    ],
    historicalDemand: [{ dishIndexId: 'dish-1', soldUnits: 40 }],
  })

  assert.equal(snapshot.menuItems[0].soldUnits, 12)
  assert.equal(snapshot.menuItems[0].remainingUnits, 38)
  assert.equal(snapshot.menuItems[0].unitCostCents, 250)
  assert.equal(snapshot.menuItems[0].marginPercent, 69)
  assert.equal(snapshot.menuItems[0].suggestedUnits, 44)
  assert.match(snapshot.menuItems[0].forecastReason, /median historical demand of 40 units/)
  assert.equal(snapshot.orders.totalOrders, 3)
  assert.equal(snapshot.orders.totalUnits, 16)
  assert.equal(snapshot.orders.revenueCents, 11600)
  assert.deepEqual(snapshot.orders.bySource, { online: 10, dm: 2, comp: 4 })
  assert.deepEqual(snapshot.orders.pickupWindows, [
    { label: '10-12', orderCount: 2, unitCount: 12 },
  ])
})

test('pop-up snapshot computes production margin and warning surfaces', () => {
  const config = normalizeDinnerCircleConfig({
    money: { platformFeePercent: 4 },
    popUp: {
      stage: 'orders_open',
      dropType: 'cafe_collab',
      locationProfile: {
        locationKind: 'cafe_collab',
        equipmentAvailable: ['cold case'],
        coldStorage: 'limited shelf',
      },
      menuItems: [
        {
          ticketTypeId: 'type-1',
          dishIndexId: 'dish-1',
          recipeId: 'recipe-1',
          name: 'Yuzu tart',
          plannedUnits: 50,
          priceCents: 800,
          batchSize: 12,
          unitCostCents: 250,
          equipmentNeeded: ['cold case'],
          constraints: ['cold hold'],
        },
        {
          ticketTypeId: 'type-2',
          dishIndexId: 'dish-2',
          name: 'Miso cookie',
          plannedUnits: 30,
          priceCents: 500,
          equipmentNeeded: ['deck oven'],
        },
      ],
      closeout: {
        itemResults: [
          {
            name: 'Yuzu tart',
            plannedUnits: 50,
            producedUnits: 50,
            soldUnits: 45,
            wastedUnits: 5,
            revenueCents: 36000,
            estimatedCostCents: 1250,
          },
          {
            name: 'Miso cookie',
            plannedUnits: 30,
            producedUnits: 30,
            soldUnits: 10,
            wastedUnits: 20,
            revenueCents: 5000,
            estimatedCostCents: 0,
          },
        ],
      },
    },
  })

  const snapshot = buildPopUpOperatingSnapshot({
    event: { id: 'event-1', status: 'completed', guest_count: 50 },
    config: config.popUp!,
    ticketTypes: [
      { id: 'type-1', name: 'Yuzu tart', price_cents: 800, capacity: 50, sold_count: 12 },
      { id: 'type-2', name: 'Miso cookie', price_cents: 500, capacity: 30, sold_count: 4 },
    ],
    tickets: [],
  })

  assert.equal(config.money?.platformFeePercent, 4)
  assert.equal(config.popUp?.stage, 'orders_open')
  assert.equal(snapshot.production.totalPlannedUnits, 80)
  assert.equal(snapshot.production.totalSoldUnits, 16)
  assert.equal(snapshot.production.totalRemainingUnits, 64)
  assert.equal(snapshot.production.estimatedIngredientCostCents, 12500)
  assert.equal(snapshot.production.estimatedMarginCents, 42500)
  assert.ok(
    snapshot.production.batchWarnings.some((warning) =>
      warning.includes('Yuzu tart does not divide cleanly')
    )
  )
  assert.ok(
    snapshot.production.batchWarnings.some((warning) =>
      warning.includes('Miso cookie is missing unit cost')
    )
  )
  assert.ok(
    snapshot.production.batchWarnings.some((warning) =>
      warning.includes('Miso cookie is missing a linked recipe')
    )
  )
  assert.ok(
    snapshot.production.locationWarnings.some((warning) =>
      warning.includes('Miso cookie needs deck oven')
    )
  )
  assert.ok(
    snapshot.production.locationWarnings.some((warning) =>
      warning.includes('Limited cold storage flagged with 50 planned cold-hold units')
    )
  )
  assert.equal(snapshot.closeout?.sellThroughPercent, 69)
  assert.equal(snapshot.closeout?.wasteUnits, 25)
  assert.equal(snapshot.closeout?.wasteCostCents, 125)
  assert.equal(snapshot.closeout?.topItem, 'Yuzu tart')
  assert.deepEqual(snapshot.closeout?.underperformers, ['Miso cookie'])
})
