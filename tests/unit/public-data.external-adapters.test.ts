import test from 'node:test'
import assert from 'node:assert/strict'
import { geocodeUsAddress } from '@/lib/public-data/census-geocoder'
import { enrichIngredientWithPublicData } from '@/lib/public-data/ingredient-enrichment'

const originalFetch = global.fetch
const originalFdcKey = process.env.USDA_FOODDATA_CENTRAL_API_KEY

test.after(() => {
  global.fetch = originalFetch
  if (originalFdcKey === undefined) delete process.env.USDA_FOODDATA_CENTRAL_API_KEY
  else process.env.USDA_FOODDATA_CENTRAL_API_KEY = originalFdcKey
})

test('geocodeUsAddress parses census matches into normalized coordinates', async () => {
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        result: {
          addressMatches: [
            {
              matchedAddress: '123 MAIN ST, PORTLAND, ME, 04101',
              coordinates: { x: -70.2553, y: 43.6615 },
              addressComponents: {
                city: 'PORTLAND',
                state: 'ME',
                zip: '04101',
              },
              geographies: {
                Counties: [{ NAME: 'Cumberland County' }],
              },
            },
          ],
        },
      }),
      { status: 200 }
    )

  const result = await geocodeUsAddress({
    address: '123 Main St',
    city: 'Portland',
    state: 'Maine',
    zip: '04101',
  })

  assert.deepEqual(result, {
    lat: 43.6615,
    lng: -70.2553,
    matchedAddress: '123 MAIN ST, PORTLAND, ME, 04101',
    city: 'Portland',
    state: 'ME',
    zip: '04101',
    county: 'Cumberland County',
    source: 'census',
  })
})

test('enrichIngredientWithPublicData merges allergens and USDA nutrition', async () => {
  process.env.USDA_FOODDATA_CENTRAL_API_KEY = 'test-key'

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        foods: [
          {
            fdcId: 123,
            description: 'Tomatoes, raw',
            dataType: 'Foundation',
            foodNutrients: [
              { nutrientNumber: '208', nutrientName: 'Energy', value: 18 },
              { nutrientNumber: '203', nutrientName: 'Protein', value: 0.9 },
              { nutrientNumber: '205', nutrientName: 'Carbohydrate, by difference', value: 3.9 },
              { nutrientNumber: '204', nutrientName: 'Total lipid (fat)', value: 0.2 },
              { nutrientNumber: '291', nutrientName: 'Fiber, total dietary', value: 1.2 },
              { nutrientNumber: '307', nutrientName: 'Sodium, Na', value: 5 },
            ],
          },
        ],
      }),
      { status: 200 }
    )

  const result = await enrichIngredientWithPublicData({
    name: 'Tomatoes',
    description: 'Fresh tomatoes finished with sesame oil',
    allergenFlags: ['soy'],
  })

  assert.deepEqual(result.allergenFlags, ['Sesame', 'Soybeans'])
  assert.deepEqual(result.nutrition, {
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    fiberPer100g: 1.2,
    sodiumMgPer100g: 5,
  })
  assert.equal(result.matchedFood?.fdcId, 123)
  assert.match(result.nutritionSource ?? '', /USDA FoodData Central/)
})
