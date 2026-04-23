import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPassiveProducts } from '@/lib/passive-store/core'
import type { PassiveStoreSourceBundle } from '@/lib/passive-store/types'

function createBundle(overrides?: Partial<PassiveStoreSourceBundle>): PassiveStoreSourceBundle {
  return {
    chef: {
      chefId: 'chef-1',
      chefName: 'Chef Rowan',
      profileImageUrl: 'https://example.com/chef.jpg',
      bookingBasePriceCents: 28000,
      bookingPricingType: 'flat_rate',
      bookingDepositType: 'percent',
      bookingDepositPercent: 30,
      bookingDepositFixedCents: null,
    },
    menus: [
      {
        id: 'menu-1',
        name: 'Spring Tasting',
        description: 'A bright multi-course dinner.',
        cuisine_type: 'Seasonal American',
        service_style: 'Plated dinner',
        target_guest_count: 8,
        price_per_person_cents: 14500,
        times_used: 6,
        is_showcase: true,
        dishes: [
          {
            id: 'dish-1',
            name: 'Asparagus tart',
            course_name: 'Starter',
            course_number: 1,
            description: 'Flaky pastry and spring vegetables.',
          },
          {
            id: 'dish-2',
            name: 'Lamb loin',
            course_name: 'Main',
            course_number: 2,
            description: 'With peas and jus.',
          },
        ],
      },
    ],
    recipes: [
      {
        id: 'recipe-1',
        name: 'Brown butter carrots',
        category: 'Side',
        description: 'Glazed carrots.',
        photo_url: 'https://example.com/r1.jpg',
        times_cooked: 12,
        cuisine: 'Seasonal American',
        meal_type: 'Dinner',
        occasion_tags: ['spring'],
        total_cost_cents: 1800,
        cost_per_serving_cents: 450,
      },
      {
        id: 'recipe-2',
        name: 'Roasted halibut',
        category: 'Entree',
        description: 'Fish entree.',
        photo_url: 'https://example.com/r2.jpg',
        times_cooked: 9,
        cuisine: 'Seasonal American',
        meal_type: 'Dinner',
        occasion_tags: ['date-night'],
        total_cost_cents: 4200,
        cost_per_serving_cents: 1050,
      },
    ],
    events: [
      {
        id: 'event-1',
        event_date: '2026-03-11',
        occasion: 'Anniversary Dinner',
        service_style: 'Plated dinner',
        guest_count: 6,
        quoted_price_cents: 36000,
        deposit_amount_cents: 12000,
        menu: { name: 'Spring Tasting' },
      },
    ],
    ...overrides,
  }
}

test('buildPassiveProducts derives products from menus, recipes, events, and gift cards', () => {
  const products = buildPassiveProducts(createBundle())

  assert.ok(products.some((product) => product.source_type === 'menu'))
  assert.ok(products.some((product) => product.source_type === 'recipe'))
  assert.ok(products.some((product) => product.source_type === 'event'))
  assert.ok(products.some((product) => product.source_type === 'generic'))
  assert.ok(products.every((product) => product.price > 0))
})

test('recipe collections fall back to a signature collection when labels are sparse', () => {
  const products = buildPassiveProducts(
    createBundle({
      recipes: [
        {
          id: 'recipe-9',
          name: 'Signature broth',
          category: null,
          description: 'Layered stock.',
          photo_url: null,
          times_cooked: 5,
          cuisine: null,
          meal_type: null,
          occasion_tags: null,
          total_cost_cents: 2200,
          cost_per_serving_cents: 550,
        },
      ],
    })
  )

  const signatureCollection = products.find((product) => product.product_key === 'recipe:signature')
  assert.ok(signatureCollection)
  assert.equal(signatureCollection?.source_type, 'recipe')
})
