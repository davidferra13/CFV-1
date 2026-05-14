import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDinnerEventShape,
  evaluateDiscoveryBookingReadiness,
  selectDinnerFulfillmentMode,
} from '@/lib/dinner-circles/fulfillment-mode-contract'

test('dinner fulfillment contract respects explicit eat-in mode', () => {
  const selection = selectDinnerFulfillmentMode({
    explicitMode: 'eat_in',
    mealText: 'Maybe a nearby restaurant',
  })

  assert.equal(selection.mode, 'eat_in')
  assert.equal(selection.eatInEnabled, true)
  assert.equal(selection.eatOutEnabled, false)
  assert.ok(selection.reasonCodes.includes('explicit_eat_in'))
})

test('dinner fulfillment contract infers either when home and restaurant signals compete', () => {
  const selection = selectDinnerFulfillmentMode({
    mealText: 'cozy pasta night but maybe a reservation',
    participantCount: 6,
    signals: ['peak_ingredients', 'booking_ready'],
  })

  assert.equal(selection.mode, 'either')
  assert.equal(selection.eatInEnabled, true)
  assert.equal(selection.eatOutEnabled, true)
  assert.ok(selection.reasonCodes.includes('group_size_requires_both_paths'))
})

test('booking readiness blocks unsafe or incomplete discovery handoff', () => {
  const readiness = evaluateDiscoveryBookingReadiness({
    id: 'chef-1',
    itemType: 'featured_chef',
    href: '/chef/marisol',
    hasEnoughInfo: true,
    availability: 'known',
    price: 'unknown',
    dietaryFit: 'unsafe',
    groupFit: 'known',
  })

  assert.equal(readiness.status, 'blocked')
  assert.equal(readiness.nextAction, 'repair_discovery_option')
  assert.ok(readiness.blockers.includes('dietary_fit'))
  assert.ok(readiness.missingFields.includes('price'))
})

test('event shape builder turns discovery direction into a booking-aware event concept', () => {
  const shape = buildDinnerEventShape({
    fulfillmentMode: 'eat_out',
    mealDirection: 'seasonal birthday tasting',
    occasion: 'birthday',
    groupSize: 6,
    discoveryItemType: 'featured_chef',
    discoveryHref: '/chef/marisol',
  })

  assert.equal(shape.kind, 'birthday_meal')
  assert.equal(shape.bookingHandoff.ready, true)
  assert.ok(shape.planningFields.includes('dietary'))
  assert.equal(shape.title, 'Birthday meal: seasonal birthday tasting')
})
