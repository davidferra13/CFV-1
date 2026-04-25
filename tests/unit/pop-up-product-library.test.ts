import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildHistoricalSellThrough,
  buildManualOrderNotes,
  buildPopUpTicketTypeDraft,
  calculatePopUpTicketCapacity,
  mapPopUpOrderSourceToTicketSource,
  normalizeProductLibraryItem,
  normalizeTextArray,
} from '../../lib/popups/product-library'

test('product library adapter normalizes dish_index_summary rows', () => {
  const item = normalizeProductLibraryItem({
    row: {
      id: 'dish-1',
      tenant_id: 'chef-1',
      name: 'Pistachio Cruffin',
      course: 'pastry',
      description: 'Laminated pastry with pistachio cream',
      dietary_tags: '{vegetarian,contains nuts}',
      allergen_flags: ['tree nuts', 'gluten'],
      times_served: 5,
      is_signature: true,
      rotation_status: 'active',
      linked_recipe_id: 'recipe-1',
      prep_complexity: 'intensive',
      tags: 'laminated,brunch',
      season_affinity: ['spring', 'winter'],
      archived: false,
      recipe_name: 'Pistachio Cruffin Batch',
      recipe_cost_cents: 4800,
      per_portion_cost_cents: 320,
      avg_rating: '4.7',
      feedback_count: 6,
    },
    detail: {
      special_equipment: ['sheeter', 'speed rack'],
      dna: {},
    },
    history: buildHistoricalSellThrough([
      { name: 'Pistachio Cruffin', capacity: 40, sold_count: 36 },
      { name: 'Pistachio Cruffin', capacity: 50, sold_count: 44 },
    ]),
  })

  assert.equal(item.name, 'Pistachio Cruffin')
  assert.deepEqual(item.dietaryTags, ['vegetarian', 'contains nuts'])
  assert.deepEqual(item.allergenFlags, ['tree nuts', 'gluten'])
  assert.deepEqual(item.seasonTags, ['spring', 'winter'])
  assert.deepEqual(item.specialEquipment, ['sheeter', 'speed rack'])
  assert.equal(item.recipeCostPerPortionCents, 320)
  assert.equal(item.avgRating, 4.7)
  assert.equal(item.historicalSellThrough.medianSoldUnits, 40)
  assert.equal(item.historicalSellThrough.sellThroughPercent, 89)
})

test('ticket type draft carries library item into a sellable pop-up plan', () => {
  const product = normalizeProductLibraryItem({
    row: {
      id: 'dish-2',
      tenant_id: 'chef-1',
      name: 'Yuzu Tart',
      course: 'dessert',
      description: null,
      dietary_tags: [],
      allergen_flags: [],
      times_served: 0,
      is_signature: false,
      rotation_status: 'testing',
      linked_recipe_id: null,
      prep_complexity: 'moderate',
      tags: [],
      season_affinity: [],
      archived: false,
      recipe_name: null,
      recipe_cost_cents: null,
      per_portion_cost_cents: null,
      avg_rating: null,
      feedback_count: 0,
    },
  })

  const draft = buildPopUpTicketTypeDraft({
    product,
    plannedUnits: 30,
    priceCents: 900,
    sortOrder: 2,
  })

  assert.equal(draft.name, 'Yuzu Tart')
  assert.equal(draft.capacity, 30)
  assert.equal(draft.priceCents, 900)
  assert.equal(draft.menuItem.dishIndexId, 'dish-2')
  assert.equal(draft.menuItem.plannedUnits, 30)
  assert.equal(draft.menuItem.productionStatus, 'not_started')
  assert.deepEqual(draft.menuItem.constraints, ['Missing recipe cost'])
})

test('manual pop-up order helpers map sources onto existing ticket sources', () => {
  assert.equal(mapPopUpOrderSourceToTicketSource('online'), 'chefflow')
  assert.equal(mapPopUpOrderSourceToTicketSource('dm'), 'walkin')
  assert.equal(mapPopUpOrderSourceToTicketSource('comment'), 'walkin')
  assert.equal(mapPopUpOrderSourceToTicketSource('word_of_mouth'), 'walkin')
  assert.equal(mapPopUpOrderSourceToTicketSource('form'), 'walkin')
  assert.equal(mapPopUpOrderSourceToTicketSource('walkup'), 'walkin')
  assert.equal(mapPopUpOrderSourceToTicketSource('comp'), 'comp')
  assert.equal(
    buildManualOrderNotes({ source: 'dm', notes: 'Paid by Venmo' }),
    'Pop-up source: dm\nPaid by Venmo'
  )
})

test('oversell guard reports remaining units for finite ticket inventory', () => {
  assert.deepEqual(
    calculatePopUpTicketCapacity({ capacity: 24, soldCount: 20, quantity: 4, label: 'Tart' }),
    { ok: true, remaining: 4 }
  )

  assert.deepEqual(
    calculatePopUpTicketCapacity({ capacity: 24, soldCount: 20, quantity: 5, label: 'Tart' }),
    { ok: false, remaining: 4, error: 'Only 4 unit(s) remaining for Tart' }
  )

  assert.deepEqual(calculatePopUpTicketCapacity({ capacity: null, soldCount: 200, quantity: 10 }), {
    ok: true,
    remaining: null,
  })
})

test('postgres text array normalization handles common shapes', () => {
  assert.deepEqual(normalizeTextArray('{spring,winter}'), ['spring', 'winter'])
  assert.deepEqual(normalizeTextArray('["a","b"]'), ['a', 'b'])
  assert.deepEqual(normalizeTextArray('a, b'), ['a', 'b'])
})
