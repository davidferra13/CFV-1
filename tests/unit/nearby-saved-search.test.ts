import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildNearbySavedSearchSummary,
  normalizeNearbySavedSearch,
} from '@/lib/discover/nearby-saved-search'

describe('normalizeNearbySavedSearch', () => {
  it('normalizes saved-search filters and preserves text-location radius state', () => {
    const search = normalizeNearbySavedSearch({
      query: '  sushi omakase  ',
      businessType: 'private_chef',
      cuisine: 'japanese',
      state: 'massachusetts',
      city: ' Boston ',
      locationQuery: ' 02116 ',
      locationLabel: '02116 - Boston, MA',
      radiusMiles: 25,
      currentMatchCount: 3,
    })

    assert.equal(search.query, 'sushi omakase')
    assert.equal(search.state, 'MA')
    assert.equal(search.city, 'Boston')
    assert.equal(search.radiusMiles, 25)
    assert.equal(search.baselineMatchCount, 3)
    assert.match(search.searchKey, /"location":"02116"/)
  })

  it('uses coordinates in the saved-search key for near-me alerts', () => {
    const search = normalizeNearbySavedSearch({
      locationLabel: 'your current location',
      radiusMiles: 10,
      userLat: 42.361145,
      userLon: -71.057083,
    })

    assert.equal(search.radiusMiles, 10)
    assert.equal(search.userLat, 42.361)
    assert.equal(search.userLon, -71.057)
    assert.match(search.searchKey, /42\.361/)
    assert.match(search.searchKey, /-71\.057/)
  })
})

describe('buildNearbySavedSearchSummary', () => {
  it('returns readable chips for the current nearby filter state', () => {
    const summary = buildNearbySavedSearchSummary({
      query: 'tasting menu',
      businessType: 'private_chef',
      cuisine: 'french',
      city: 'Boston',
      state: 'MA',
      radiusMiles: 15,
      locationLabel: 'Boston, MA',
    })

    assert.deepEqual(summary.chips, [
      'Private Chef',
      'French',
      'Boston, MA',
      'Within 15 miles of Boston, MA',
      '"tasting menu"',
    ])
    assert.match(summary.summaryLabel, /Private Chef \| French/)
  })
})
