import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFeaturedMenuContextLine,
  formatFeaturedMenuPriceLabel,
  formatFeaturedMenuUsageLabel,
  formatServiceStyleLabel,
  normalizeBookingServiceModeForMenu,
  resolveRequestedFeaturedMenuId,
} from '@/lib/booking/featured-menu-shared'

describe('featured booking menu helpers', () => {
  it('only accepts the configured featured menu id', () => {
    assert.equal(resolveRequestedFeaturedMenuId('menu-1', 'menu-1'), 'menu-1')
    assert.equal(resolveRequestedFeaturedMenuId('menu-1', 'menu-2'), null)
    assert.equal(resolveRequestedFeaturedMenuId(null, 'menu-1'), null)
    assert.equal(resolveRequestedFeaturedMenuId('menu-1', undefined), null)
  })

  it('forces featured-menu bookings into one-off mode', () => {
    assert.equal(normalizeBookingServiceModeForMenu('one_off', true), 'one_off')
    assert.equal(normalizeBookingServiceModeForMenu('recurring', true), 'one_off')
    assert.equal(normalizeBookingServiceModeForMenu('multi_day', true), 'one_off')
    assert.equal(normalizeBookingServiceModeForMenu('recurring', false), 'recurring')
  })

  it('formats menu context and service style labels for UI and booking notes', () => {
    assert.equal(
      buildFeaturedMenuContextLine('Spring Tasting'),
      'Featured Menu Selected: Spring Tasting'
    )
    assert.equal(formatServiceStyleLabel('family_style'), 'Family Style')
    assert.equal(formatServiceStyleLabel('tasting_menu'), 'Tasting Menu')
    assert.equal(formatServiceStyleLabel(null), null)
  })

  it('formats menu purchase signals for public showcase cards', () => {
    assert.equal(formatFeaturedMenuPriceLabel(12500), 'From $125 per guest')
    assert.equal(formatFeaturedMenuPriceLabel(null), null)
    assert.equal(formatFeaturedMenuUsageLabel(1), 'Booked once before')
    assert.equal(formatFeaturedMenuUsageLabel(4), 'Booked 4 times')
    assert.equal(formatFeaturedMenuUsageLabel(0), null)
  })
})
