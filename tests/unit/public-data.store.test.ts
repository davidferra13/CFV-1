import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCoordinateSnapshotKey,
  buildIngredientLookupKey,
  buildLocationLookupKey,
  buildProductLookupKey,
  hydrateIngredientEnrichmentFromReference,
  hydrateLocationReference,
  hydrateProductEnrichmentFromReference,
  hydrateWeatherRiskSnapshot,
  isFreshTimestamp,
} from '@/lib/public-data/store'

test('public data lookup keys normalize case and spacing', () => {
  assert.equal(buildIngredientLookupKey('  Heirloom   Tomatoes  '), 'ingredient:heirloom tomatoes')
  assert.equal(
    buildLocationLookupKey({
      address: ' 123 Main St. ',
      city: 'new   york',
      state: 'ny',
      zip: '10001',
    }),
    'location:123 main st, new york, ny, 10001'
  )
  assert.equal(buildProductLookupKey(' 0123-4567 8901 '), 'product:barcode:012345678901')
  assert.equal(buildCoordinateSnapshotKey(40.712776, -74.005974), 'coords:40.7128,-74.0060')
})

test('isFreshTimestamp prefers explicit expiration and falls back to updated_at TTL', () => {
  const future = new Date(Date.now() + 5 * 60 * 1000).toISOString()
  const recent = new Date(Date.now() - 60 * 1000).toISOString()
  const stale = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  assert.equal(isFreshTimestamp(future, stale, 60 * 1000), true)
  assert.equal(isFreshTimestamp(null, recent, 5 * 60 * 1000), true)
  assert.equal(isFreshTimestamp(null, stale, 5 * 60 * 1000), false)
})

test('hydrateIngredientEnrichmentFromReference reconstructs stored enrichment data', () => {
  const enrichment = hydrateIngredientEnrichmentFromReference({
    lookup_key: 'ingredient:tomato',
    display_name: 'Tomato',
    matched_name: 'Tomatoes, raw',
    source_name: 'USDA FoodData Central',
    source_record_id: '123',
    allergen_flags: ['Sesame', 'Soybeans'],
    nutrition: {
      caloriesPer100g: 18,
      proteinPer100g: 0.9,
      carbsPer100g: 3.9,
      fatPer100g: 0.2,
      fiberPer100g: 1.2,
      sodiumMgPer100g: 5,
    },
    freshness_expires_at: null,
    metadata: {
      nutrition_source: 'USDA FoodData Central (Foundation)',
      nutrition_updated_at: '2026-03-10T12:00:00.000Z',
      matched_food: {
        fdcId: 123,
        description: 'Tomatoes, raw',
        dataType: 'Foundation',
      },
    },
    updated_at: '2026-03-10T12:00:00.000Z',
  })

  assert.deepEqual(enrichment.allergenFlags, ['Sesame', 'Soybeans'])
  assert.equal(enrichment.matchedFood?.fdcId, 123)
  assert.equal(enrichment.matchedFood?.description, 'Tomatoes, raw')
  assert.equal(enrichment.nutritionSource, 'USDA FoodData Central (Foundation)')
  assert.equal(enrichment.nutrition?.caloriesPer100g, 18)
})

test('hydrateProductEnrichmentFromReference reconstructs stored product data', () => {
  const enrichment = hydrateProductEnrichmentFromReference({
    lookup_key: 'product:barcode:3017620422003',
    display_name: 'Nutella',
    brand_name: 'Ferrero',
    source_name: 'Open Food Facts',
    source_record_id: '3017620422003',
    categories: ['Spreads', 'Chocolate spreads'],
    allergen_flags: ['Milk', 'Tree nuts'],
    nutrition: {
      caloriesPer100g: 539,
      proteinPer100g: 6.3,
      fatPer100g: 30.9,
      saturatedFatPer100g: 10.6,
      carbsPer100g: 57.5,
      sugarPer100g: 56.3,
      fiberPer100g: 3.4,
      sodiumMgPer100g: 42,
    },
    packaging: {
      summary: '400 g',
      details: ['Jar | Glass'],
    },
    image_url: 'https://images.example.com/nutella.jpg',
    freshness_expires_at: null,
    metadata: {
      barcode: '3017620422003',
      ingredients: 'Sugar, palm oil, hazelnuts, skim milk',
      dietary_tags: ['vegetarian'],
      nutri_score: 'e',
      nova_group: 4,
      quantity: '400 g',
      serving_size: '15 g',
      source_url: 'https://world.openfoodfacts.org/product/3017620422003',
      data_license: 'ODbL',
      data_license_url: 'https://opendatacommons.org/licenses/odbl/',
      attribution_text: 'Data from Open Food Facts',
      usage_notes: ['Verify product image rights before public marketing reuse.'],
      updated_at: '2026-03-10T12:00:00.000Z',
    },
    updated_at: '2026-03-10T12:00:00.000Z',
  })

  assert.equal(enrichment.barcode, '3017620422003')
  assert.equal(enrichment.brand, 'Ferrero')
  assert.deepEqual(enrichment.allergenFlags, ['Milk', 'Tree nuts'])
  assert.equal(enrichment.nutrition.caloriesPer100g, 539)
  assert.equal(enrichment.packaging.summary, '400 g')
  assert.equal(enrichment.dataLicense, 'ODbL')
})

test('hydrateLocationReference and hydrateWeatherRiskSnapshot rebuild stored snapshot data', () => {
  const location = hydrateLocationReference({
    lookup_key: 'location:123 main st, portland, me, 04101',
    input_address: '123 Main St, Portland, ME, 04101',
    normalized_address: '123 Main St, Portland, ME, 04101',
    matched_address: '123 MAIN ST, PORTLAND, ME, 04101',
    city: 'Portland',
    state: 'ME',
    zip: '04101',
    county: 'Cumberland County',
    lat: 43.6615,
    lng: -70.2553,
    source_name: 'US Census Geocoder',
    source_record_id: null,
    freshness_expires_at: null,
    metadata: null,
    updated_at: '2026-03-10T12:00:00.000Z',
  })

  assert.deepEqual(location, {
    lat: 43.6615,
    lng: -70.2553,
    matchedAddress: '123 MAIN ST, PORTLAND, ME, 04101',
    city: 'Portland',
    state: 'ME',
    zip: '04101',
    county: 'Cumberland County',
    source: 'US Census Geocoder',
  })

  const risk = hydrateWeatherRiskSnapshot({
    snapshot_key: 'coords:43.6615,-70.2553',
    location_label: 'Portland, ME',
    lat: 43.6615,
    lng: -70.2553,
    risk_level: 'high',
    reasons: ['National Weather Service advisory or watch active for this location.'],
    alerts: [
      {
        id: 'alert-1',
        event: 'Wind Advisory',
        headline: 'Wind Advisory remains in effect',
        severity: 'Moderate',
        urgency: 'Expected',
        certainty: 'Likely',
        effective: '2026-03-10T12:00:00.000Z',
        ends: '2026-03-10T18:00:00.000Z',
        areaDesc: 'Cumberland County',
        instruction: null,
      },
    ],
    air_quality: {
      aqi: 55,
      category: 'Moderate',
      parameter: 'PM2.5',
      reportingArea: 'Portland',
      stateCode: 'ME',
      observedAt: '2026-03-10 11:00 EST',
    },
    source_names: ['National Weather Service', 'AirNow'],
    snapshot_at: '2026-03-10T12:00:00.000Z',
    freshness_expires_at: null,
    metadata: null,
    updated_at: '2026-03-10T12:00:00.000Z',
  })

  assert.equal(risk.riskLevel, 'high')
  assert.equal(risk.alerts.length, 1)
  assert.equal(risk.airQuality?.aqi, 55)
  assert.equal(risk.updatedAt, '2026-03-10T12:00:00.000Z')
})
