import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEventDefaultLayer } from '@/lib/events/default-behaviors'

test('event default layer surfaces quiet role prompts and micro confirmations', () => {
  const result = buildEventDefaultLayer({
    eventId: 'event-1',
    eventName: 'Farm Table Dinner',
    status: 'confirmed',
    eventDate: '2026-05-03',
    launchedAt: '2026-04-24T12:00:00Z',
    guestCount: 24,
    ticketsSold: 12,
    totalCapacity: 24,
    publicPhotosCount: 2,
    publicStory:
      'A seasonal dinner with a full public story, host context, menu context, and arrival details.',
    shareUrl: 'https://chef.test/e/share-token',
    locationText: 'Red Barn Farm',
    chefName: 'Chef Mina',
    collaborators: [{ businessName: 'Red Barn Farm', role: 'host' }],
    supplierIngredientLines: ['tomatoes - 5 lb', 'berries - 2 pints'],
    layoutZoneKinds: ['kitchen', 'guest', 'path'],
    now: new Date('2026-04-30T12:00:00Z'),
  })

  assert.equal(result.statusMessage, 'Filling up')
  assert.ok(result.rolePrompts.some((prompt) => prompt.id === 'supplier_availability_window'))
  assert.ok(result.rolePrompts.some((prompt) => prompt.id === 'host_service_timing'))
  assert.ok(result.rolePrompts.some((prompt) => prompt.id === 'confirm_cooking_location'))
  assert.ok(result.expectations.some((detail) => detail.id === 'environment'))
  assert.ok(result.expectations.some((detail) => detail.id === 'mobility'))
  assert.match(result.shareSnippets.text, /Farm Table Dinner/)
})

test('event default layer flags supply, momentum, quality, and accessibility gaps', () => {
  const result = buildEventDefaultLayer({
    eventId: 'event-2',
    eventName: 'Winter Supper',
    status: 'confirmed',
    eventDate: '2026-12-10',
    launchedAt: '2026-12-01T10:00:00Z',
    guestCount: 40,
    ticketsSold: 0,
    totalCapacity: 40,
    publicPhotosCount: 0,
    publicStory: 'Dinner.',
    shareUrl: 'https://chef.test/e/winter',
    supplierIngredientLines: ['tomatoes - 3 lb'],
    now: new Date('2026-12-03T12:00:00Z'),
  })

  assert.ok(result.nudges.some((nudge) => nudge.id === 'supply_quantity_risk'))
  assert.ok(result.nudges.some((nudge) => nudge.id === 'seasonal_supply_risk'))
  assert.ok(result.nudges.some((nudge) => nudge.id === 'momentum_no_first_sale'))
  assert.ok(result.nudges.some((nudge) => nudge.id === 'quality_missing_photos'))
  assert.ok(result.nudges.some((nudge) => nudge.id === 'quality_thin_description'))
  assert.ok(result.nudges.some((nudge) => nudge.id === 'accessibility_basics_missing'))
})

test('event default layer creates post-event cleanup and snapshot guidance', () => {
  const result = buildEventDefaultLayer({
    eventId: 'event-3',
    eventName: 'Completed Dinner',
    status: 'completed',
    guestCount: 20,
    totalCapacity: 24,
    actualAttendance: 19,
    projectedRevenueCents: 240000,
    actualRevenueCents: 228000,
  })

  assert.equal(result.statusMessage, 'Event complete')
  assert.equal(result.autoCleanup.shouldArchive, true)
  assert.ok(result.rolePrompts.some((prompt) => prompt.id === 'post_event_incident_note'))
  assert.equal(result.postEventSnapshot.plannedCapacity, 24)
  assert.equal(result.postEventSnapshot.actualAttendance, 19)
  assert.equal(result.postEventSnapshot.message, 'Post-event snapshot is ready.')
})
