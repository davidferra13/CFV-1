import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  buildOpenClawQuarantineRawData,
  hasOpenClawQuarantineWritebackContext,
  readOpenClawQuarantineReviewContext,
  scaleNormalizedPricePerUnitCents,
} from '@/lib/openclaw/quarantine-review'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('builds writeback-ready quarantine raw data for admin review', () => {
  const rawData = buildOpenClawQuarantineRawData({
    rawPrice: {
      cents: 499,
      normalized_cents: 250,
      normalized_unit: 'lb',
      original_unit: 'each',
      store: 'Trader Joe\'s',
      tier: 'direct_scrape',
    },
    reviewContext: {
      ingredientId: 'ingredient-1',
      tenantId: 'tenant-1',
      ingredientName: 'Lemons',
      priceCents: 499,
      normalizedPricePerUnitCents: 250,
      normalizedUnit: 'lb',
      originalUnit: 'each',
      purchaseDate: '2026-04-22',
      confirmedAt: '2026-04-22T12:00:00.000Z',
      storeName: 'Trader Joe\'s',
      storeState: 'MA',
      tier: 'direct_scrape',
      granularSource: 'openclaw_scrape',
    },
  })

  const reviewContext = readOpenClawQuarantineReviewContext(rawData)

  assert.equal(hasOpenClawQuarantineWritebackContext(rawData), true)
  assert.ok(reviewContext)
  assert.equal(reviewContext?.ingredientId, 'ingredient-1')
  assert.equal(reviewContext?.tenantId, 'tenant-1')
  assert.equal(reviewContext?.granularSource, 'openclaw_scrape')
  assert.equal(reviewContext?.normalizedPricePerUnitCents, 250)
})

test('treats legacy quarantine raw data as not writeback-ready', () => {
  const rawData = {
    cents: 499,
    normalized_cents: 250,
    normalized_unit: 'lb',
    original_unit: 'each',
    store: 'Trader Joe\'s',
    tier: 'direct_scrape',
  }

  assert.equal(readOpenClawQuarantineReviewContext(rawData), null)
  assert.equal(hasOpenClawQuarantineWritebackContext(rawData), false)
})

test('scales normalized unit price when an admin corrects a quarantined price', () => {
  const correctedNormalized = scaleNormalizedPricePerUnitCents({
    originalPriceCents: 499,
    originalNormalizedPricePerUnitCents: 250,
    reviewedPriceCents: 599,
  })

  assert.equal(correctedNormalized, 300)
})

test('review flow is wired through the shared contract and internal refresh path', () => {
  const syncSource = read('lib/openclaw/sync.ts')
  const healthActions = read('lib/admin/openclaw-health-actions.ts')
  const costRefresh = read('lib/pricing/cost-refresh-actions.ts')
  const healthClient = read('app/(admin)/admin/openclaw/health/health-client.tsx')

  assert.match(syncSource, /buildOpenClawQuarantineRawData/)
  assert.match(syncSource, /refreshIngredientCostsForTenant/)

  assert.match(healthActions, /readOpenClawQuarantineReviewContext/)
  assert.match(healthActions, /scaleNormalizedPricePerUnitCents/)
  assert.match(healthActions, /refreshIngredientCostsForTenant/)
  assert.match(healthActions, /nonBlocking\(/)

  assert.match(costRefresh, /export async function refreshIngredientCostsForTenant/)
  assert.match(costRefresh, /propagatePriceChange\(updatedIds, \{ admin: options\?\.admin \}\)/)

  assert.match(healthClient, /writeback_ready/)
  assert.match(healthClient, /Legacy row: reject only/)
  assert.match(healthClient, /action: 'corrected'/)
})
