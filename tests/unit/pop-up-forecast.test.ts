import test from 'node:test'
import assert from 'node:assert/strict'
import { forecastPopUpMenuItem } from '@/lib/popups/forecast'
import type { PopUpMenuItemPlan } from '@/lib/popups/types'

const baseItem: PopUpMenuItemPlan = {
  name: 'Yuzu tart',
  plannedUnits: 24,
  productionStatus: 'not_started',
}

test('pop-up forecast uses deterministic median historical demand', () => {
  const forecast = forecastPopUpMenuItem({
    item: baseItem,
    dropType: 'cafe_collab',
    historicalSoldUnits: [18, 30, 24],
    currentSoldUnits: 0,
    now: new Date('2026-04-24T12:00:00Z'),
  })

  assert.equal(forecast.suggestedUnits, 27)
  assert.match(forecast.reason, /median historical demand of 24 units/)
  assert.match(forecast.reason, /10% cafe collab buffer/)
})

test('pop-up forecast applies buffer by drop type', () => {
  const weekend = forecastPopUpMenuItem({
    item: baseItem,
    dropType: 'weekend_drop',
    now: new Date('2026-04-24T12:00:00Z'),
  })
  const privateEvent = forecastPopUpMenuItem({
    item: baseItem,
    dropType: 'private_dessert_event',
    now: new Date('2026-04-24T12:00:00Z'),
  })

  assert.equal(weekend.suggestedUnits, 28)
  assert.equal(privateEvent.suggestedUnits, 26)
})

test('pop-up forecast adjusts upward for preorder velocity', () => {
  const forecast = forecastPopUpMenuItem({
    item: { ...baseItem, plannedUnits: 24 },
    dropType: 'cafe_collab',
    preorderOpensAt: '2026-04-20T12:00:00Z',
    preorderClosesAt: '2026-04-28T12:00:00Z',
    currentSoldUnits: 30,
    now: new Date('2026-04-24T12:00:00Z'),
  })

  assert.equal(forecast.suggestedUnits, 66)
  assert.match(forecast.reason, /current preorder velocity projects 60 units/)
})

test('pop-up forecast falls back for missing history', () => {
  const servedBefore = forecastPopUpMenuItem({
    item: { ...baseItem, plannedUnits: 0 },
    dropType: 'cafe_collab',
    eventGuestCount: 36,
    dishTimesServed: 3,
    now: new Date('2026-04-24T12:00:00Z'),
  })
  const newItem = forecastPopUpMenuItem({
    item: { ...baseItem, plannedUnits: 0 },
    dropType: 'cafe_collab',
    now: new Date('2026-04-24T12:00:00Z'),
  })

  assert.equal(servedBefore.suggestedUnits, 40)
  assert.match(servedBefore.reason, /event guest count fallback of 36 units/)
  assert.equal(newItem.suggestedUnits, 27)
  assert.match(newItem.reason, /new item with conservative fallback of 24 units/)
})
