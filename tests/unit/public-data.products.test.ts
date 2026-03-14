import test from 'node:test'
import assert from 'node:assert/strict'
import {
  enrichProductWithPublicData,
  searchProductsWithPublicData,
} from '@/lib/public-data/product-enrichment'

const originalFetch = global.fetch

test.after(() => {
  global.fetch = originalFetch
})

test('enrichProductWithPublicData normalizes Open Food Facts product data', async () => {
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        status: 1,
        product: {
          code: '3017620422003',
          product_name: 'Nutella',
          brands: 'Ferrero',
          categories_tags: ['en:spreads', 'en:chocolate-spreads'],
          allergens_tags: ['en:milk', 'en:nuts'],
          labels_tags: ['en:vegetarian'],
          ingredients_text: 'Sugar, palm oil, hazelnuts, skim milk, cocoa',
          image_front_url: 'https://images.example.com/nutella.jpg',
          nutriscore_grade: 'e',
          nova_group: 4,
          quantity: '400 g',
          serving_size: '15 g',
          nutriments: {
            'energy-kcal_100g': 539,
            proteins_100g: 6.3,
            fat_100g: 30.9,
            'saturated-fat_100g': 10.6,
            carbohydrates_100g: 57.5,
            sugars_100g: 56.3,
            fiber_100g: 3.4,
            sodium_100g: 0.042,
          },
          packagings: [{ shape: 'Jar', material: 'Glass' }],
        },
      }),
      { status: 200 }
    )

  const result = await enrichProductWithPublicData({
    barcode: '3017620422003',
  })

  assert.ok(result)
  assert.equal(result?.barcode, '3017620422003')
  assert.equal(result?.brand, 'Ferrero')
  assert.deepEqual(result?.categories, ['Spreads', 'Chocolate Spreads'])
  assert.deepEqual(result?.allergenFlags, ['Milk', 'Tree nuts'])
  assert.deepEqual(result?.dietaryTags, ['vegetarian'])
  assert.equal(result?.nutrition.caloriesPer100g, 539)
  assert.equal(result?.nutrition.sodiumMgPer100g, 42)
  assert.equal(result?.packaging.summary, '400 g')
  assert.equal(result?.packaging.details[0], 'Jar | Glass')
})

test('searchProductsWithPublicData returns mapped search results', async () => {
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        products: [
          {
            code: '1234567890123',
            product_name: 'Organic Coconut Milk',
            brands: 'ChefFlow Pantry',
            categories_tags: ['en:coconut-milks', 'en:vegetarian-foods'],
            labels_tags: ['en:vegan', 'en:organic'],
            allergens_tags: [],
            ingredients_text: 'Coconut extract, water',
            nutriments: {
              'energy-kcal_100g': 180,
              fat_100g: 18,
              carbohydrates_100g: 3,
              proteins_100g: 2,
            },
          },
        ],
      }),
      { status: 200 }
    )

  const results = await searchProductsWithPublicData('coconut milk', 5)

  assert.equal(results.length, 1)
  assert.equal(results[0]?.name, 'Organic Coconut Milk')
  assert.deepEqual(results[0]?.dietaryTags, ['organic', 'vegan', 'vegetarian'])
})
