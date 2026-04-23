import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPublicSeasonalMarketPulseSearchParamsFromContext,
  getPublicSeasonalMarketPulse,
  mergePublicOpenBookingPrefill,
  readPublicOpenBookingPrefillFromSearchParams,
  readPublicSeasonalMarketPulseContext,
} from '@/lib/public/public-seasonal-market-pulse'
import type { PublicIngredientSpotlight } from '@/lib/openclaw/public-ingredient-queries'
import { resolvePublicMarketScope } from '@/lib/public/public-market-scope'

function makeSpotlight(name: string): PublicIngredientSpotlight {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    category: 'produce',
    ingredientHref: `/ingredient/${encodeURIComponent(name.toLowerCase())}`,
    storeCount: 9,
    inStockCount: 7,
    cheapestCents: 399,
    cheapestStore: 'Union Market',
    cheapestUnit: 'lb',
    avgCents: 512,
    lastConfirmedAt: '2026-04-21T10:00:00.000Z',
  }
}

test('builds a market-backed pulse with canonical provenance and booking handoff', async () => {
  let requestedNames: string[] = []
  const scope = resolvePublicMarketScope({
    explicitLabel: 'Boston, MA',
    source: 'query',
  })

  const pulse = await getPublicSeasonalMarketPulse({
    date: new Date('2026-04-21T12:00:00.000Z'),
    scope,
    ingredientSpotlightLoader: async (names) => {
      requestedNames = names
      return [makeSpotlight('Asparagus')]
    },
  })

  assert.equal(pulse.season.name, 'Spring')
  assert.deepEqual(
    pulse.peakNow.map((item) => item.name),
    ['Asparagus', 'Sugar Snap Peas', 'Morels']
  )
  assert.equal(pulse.endingSoon?.name, 'Rhubarb')
  assert.equal(pulse.comingNext?.name, 'Strawberries')
  assert.equal(pulse.source.mode, 'market-backed')
  assert.equal(pulse.provenance.contractVersion, 'public-market-note.v1')
  assert.equal(pulse.provenance.scope.label, 'Boston, MA')
  assert.equal(pulse.provenance.scope.mode, 'explicit')
  assert.equal(pulse.provenance.freshness.marketStatus, 'fresh')
  assert.equal(pulse.provenance.fallback.reason, 'none')
  assert.deepEqual(requestedNames, [
    'Asparagus',
    'Sugar Snap Peas',
    'Morels',
    'Rhubarb',
    'Strawberries',
  ])
  assert.equal(
    pulse.copy.headline,
    'Asparagus, Sugar Snap Peas, and Morels are strongest right now.'
  )
  assert.equal(pulse.copy.urgencyNote, 'Rhubarb is nearly out, and Strawberries is next up.')
  assert.equal(
    pulse.copy.evidenceLine,
    'Asparagus currently shows public grocery snapshots across 9 stores.'
  )
  assert.match(
    pulse.copy.freshnessLine ?? '',
    /^Freshness: public ingredient snapshots were last confirmed .+\.$/
  )
  assert.equal(pulse.copy.scopeLine, 'Scope: Boston, MA.')
  assert.equal(pulse.analytics.market_scope, 'Boston, MA')
  assert.equal(pulse.analytics.market_scope_mode, 'explicit')
  assert.equal(pulse.analytics.lead_ingredients, 'Asparagus | Sugar Snap Peas | Morels')
  assert.equal(pulse.booking.searchParams.market_context, 'seasonal_market_pulse')
  assert.equal(pulse.booking.searchParams.market_scope, 'Boston, MA')
  assert.equal(pulse.booking.searchParams.market_scope_mode, 'explicit')
  assert.equal(pulse.ingredients.searchParams.market_scope, 'Boston, MA')
  assert.equal(pulse.booking.intent.scope.label, 'Boston, MA')
  assert.match(
    pulse.booking.prefill.additional_notes,
    /Would like the menu to lean spring and ingredient-led/
  )
})

test('withholds stale market evidence behind the canonical fallback contract', async () => {
  const pulse = await getPublicSeasonalMarketPulse({
    date: new Date('2026-12-20T12:00:00.000Z'),
    ingredientSpotlightLoader: async () => [
      {
        ...makeSpotlight('Blood Oranges'),
        lastConfirmedAt: '2026-12-10T10:00:00.000Z',
      },
    ],
  })

  assert.equal(pulse.season.name, 'Winter')
  assert.equal(pulse.source.mode, 'seasonal-fallback')
  assert.equal(pulse.marketSpotlights.length, 0)
  assert.equal(pulse.provenance.freshness.marketStatus, 'stale')
  assert.equal(pulse.provenance.fallback.reason, 'stale_market_evidence')
  assert.equal(
    pulse.copy.evidenceLine,
    'Public ingredient snapshots are older than the freshness window, so this note is calendar-based today.'
  )
  assert.equal(
    pulse.copy.freshnessLine,
    'Freshness: available public ingredient snapshots are older than 72 hours.'
  )
  assert.equal(
    pulse.source.note,
    'Seasonal calendar only today; public ingredient snapshots are older than the freshness window and are withheld from this note.'
  )
})

test('falls back honestly when ingredient spotlights are unavailable', async () => {
  const pulse = await getPublicSeasonalMarketPulse({
    date: new Date('2026-12-20T12:00:00.000Z'),
    ingredientSpotlightLoader: async () => {
      throw new Error('public ingredient data unavailable')
    },
  })

  assert.equal(pulse.season.name, 'Winter')
  assert.equal(pulse.source.mode, 'seasonal-fallback')
  assert.equal(pulse.marketSpotlights.length, 0)
  assert.equal(pulse.provenance.scope.label, 'United States')
  assert.equal(pulse.provenance.scope.isFallback, true)
  assert.equal(pulse.provenance.freshness.marketStatus, 'point-in-time')
  assert.equal(
    pulse.copy.evidenceLine,
    'Public ingredient snapshots are unavailable, so this note is calendar-based today.'
  )
  assert.equal(
    pulse.copy.freshnessLine,
    'Freshness: no public ingredient snapshots were available for this note.'
  )
  assert.equal(
    pulse.source.note,
    'Seasonal calendar only today; public ingredient snapshots are unavailable or withheld.'
  )
})

test('parses and merges booking handoff params without losing explicit overrides', () => {
  const params = new URLSearchParams({
    occasion: 'Dinner featuring asparagus',
    service_type: 'dinner_party',
    additional_notes: 'Need gluten-free options too.',
    booking_context: 'seasonal_market_pulse',
    pulse_id: 'public-seasonal-market-pulse-spring-20260421',
    pulse_season: 'Spring',
    pulse_peak: 'Asparagus, Sugar Snap Peas, Morels',
    pulse_ending: 'Rhubarb',
    pulse_coming: 'Strawberries',
    pulse_mode: 'market-backed',
    pulse_generated_at: '2026-04-21T12:00:00.000Z',
    pulse_market_as_of: '2026-04-21T10:00:00.000Z',
    pulse_market_status: 'fresh',
    pulse_fallback_reason: 'none',
    market_scope: 'Boston, MA',
    market_scope_mode: 'explicit',
  })

  const genericPrefill = readPublicOpenBookingPrefillFromSearchParams(params)
  const seasonalContext = readPublicSeasonalMarketPulseContext(params)
  const merged = mergePublicOpenBookingPrefill(seasonalContext?.prefill, genericPrefill)

  assert.equal(genericPrefill.occasion, 'Dinner featuring asparagus')
  assert.ok(seasonalContext)
  assert.equal(seasonalContext?.season, 'Spring')
  assert.deepEqual(seasonalContext?.peakNow, ['Asparagus', 'Sugar Snap Peas', 'Morels'])
  assert.equal(seasonalContext?.sourceMode, 'market-backed')
  assert.equal(seasonalContext?.scope.label, 'Boston, MA')
  assert.equal(seasonalContext?.scope.mode, 'explicit')
  assert.equal(seasonalContext?.intent.provenance.marketStatus, 'fresh')
  assert.equal(seasonalContext?.summary.eyebrow, 'Current market note')
  assert.equal(
    seasonalContext?.summary.body,
    'Rhubarb is nearly out, and Strawberries is next up. This note will be carried into the request details chefs see.'
  )
  assert.equal(seasonalContext?.summary.scopeNote, 'Scope: Boston, MA.')
  assert.equal(seasonalContext?.prefill.occasion, 'Dinner featuring asparagus')
  assert.equal(seasonalContext?.prefill.additional_notes, 'Need gluten-free options too.')
  assert.equal(merged.occasion, 'Dinner featuring asparagus')
  assert.equal(merged.additional_notes, 'Need gluten-free options too.')

  const roundTripParams = seasonalContext
    ? buildPublicSeasonalMarketPulseSearchParamsFromContext(seasonalContext)
    : null

  assert.equal(roundTripParams?.get('market_context'), 'seasonal_market_pulse')
  assert.equal(roundTripParams?.get('market_scope'), 'Boston, MA')
  assert.equal(roundTripParams?.get('market_scope_mode'), 'explicit')
})
