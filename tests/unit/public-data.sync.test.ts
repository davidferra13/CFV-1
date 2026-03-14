import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductPublicDataUpdates,
  collectProductPublicDataSyncCandidates,
  isProductPublicDataSyncCandidate,
} from '@/lib/public-data/sync'
import type { ProductPublicDataEnrichment } from '@/lib/public-data/product-enrichment'

function buildEnrichment(
  overrides: Partial<ProductPublicDataEnrichment> = {}
): ProductPublicDataEnrichment {
  return {
    barcode: '1234567890123',
    name: 'Organic Coconut Milk',
    brand: 'ChefFlow Pantry',
    categories: ['Pantry'],
    ingredients: 'Coconut extract, water',
    allergenFlags: ['Coconut'],
    dietaryTags: ['vegan', 'organic'],
    nutriScore: 'b',
    novaGroup: 2,
    imageUrl: 'https://images.example.com/coconut-milk.jpg',
    quantity: '400 ml',
    servingSize: '100 ml',
    nutrition: {
      caloriesPer100g: 180,
      proteinPer100g: 2,
      fatPer100g: 18,
      saturatedFatPer100g: 16,
      carbsPer100g: 3,
      sugarPer100g: 2,
      fiberPer100g: 1,
      sodiumMgPer100g: 15,
    },
    packaging: {
      summary: '400 ml can',
      details: ['Can | Aluminum'],
    },
    sourceName: 'Open Food Facts',
    sourceRecordId: '1234567890123',
    sourceUrl: 'https://world.openfoodfacts.org/product/1234567890123',
    dataLicense: 'ODbL',
    dataLicenseUrl: 'https://opendatacommons.org/licenses/odbl/',
    imageLicense: null,
    imageLicenseUrl: null,
    attributionText: 'Data from Open Food Facts',
    usageNotes: ['Verify product image rights before public marketing reuse.'],
    updatedAt: '2026-03-10T12:00:00.000Z',
    ...overrides,
  }
}

test('buildProductPublicDataUpdates fills category and taxonomy gaps without promoting public images', () => {
  const updates = buildProductPublicDataUpdates(
    {
      category: null,
      image_url: null,
      allergen_flags: [],
      dietary_tags: [],
    },
    buildEnrichment()
  )

  assert.deepEqual(updates, {
    category: 'Pantry',
    allergen_flags: ['Coconut'],
    dietary_tags: ['vegan', 'organic'],
  })
})

test('buildProductPublicDataUpdates can opt in to image promotion explicitly', () => {
  const updates = buildProductPublicDataUpdates(
    {
      category: 'Pantry',
      image_url: null,
      allergen_flags: ['Coconut'],
      dietary_tags: ['vegan'],
    },
    buildEnrichment(),
    {
      allowImagePromotion: true,
    }
  )

  assert.deepEqual(updates, {
    image_url: 'https://images.example.com/coconut-milk.jpg',
  })
})

test('isProductPublicDataSyncCandidate includes category gaps but ignores image-only gaps', () => {
  assert.equal(
    isProductPublicDataSyncCandidate({
      barcode: '1234567890123',
      category: null,
      image_url: 'https://images.example.com/existing.jpg',
      allergen_flags: ['Coconut'],
      dietary_tags: ['vegan'],
    }),
    true
  )

  assert.equal(
    isProductPublicDataSyncCandidate({
      barcode: '1234567890123',
      category: 'Pantry',
      image_url: null,
      allergen_flags: ['Coconut'],
      dietary_tags: ['vegan'],
    }),
    false
  )
})

test('collectProductPublicDataSyncCandidates keeps scanning until it finds eligible older rows', async () => {
  const pages = [
    [
      {
        id: 'recent-complete',
        barcode: '11111111',
        category: 'Pantry',
        image_url: null,
        allergen_flags: ['Coconut'],
        dietary_tags: ['vegan'],
      },
    ],
    [
      {
        id: 'older-incomplete',
        barcode: '22222222',
        category: null,
        image_url: 'https://images.example.com/existing.jpg',
        allergen_flags: ['Sesame'],
        dietary_tags: ['vegetarian'],
      },
    ],
  ]

  const pageCalls: Array<[number, number]> = []
  const result = await collectProductPublicDataSyncCandidates(
    async (pageStart, pageEnd) => {
      pageCalls.push([pageStart, pageEnd])
      const pageIndex = pageCalls.length - 1
      return pages[pageIndex] ?? []
    },
    1,
    1
  )

  assert.deepEqual(pageCalls, [
    [0, 0],
    [1, 1],
  ])
  assert.equal(result.scannedCount, 2)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0]?.id, 'older-incomplete')
})
