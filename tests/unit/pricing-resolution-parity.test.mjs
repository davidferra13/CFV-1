import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const source = readFileSync(resolve(process.cwd(), 'lib/pricing/resolve-price.ts'), 'utf8')

function functionBody(name) {
  const start = source.indexOf(`export async function ${name}(`)
  assert.notEqual(start, -1, `${name} must exist`)
  const nextExport = source.indexOf('\nexport ', start + 1)
  return source.slice(start, nextExport === -1 ? source.length : nextExport)
}

test('single-item PIE resolver preserves canonical trust order', () => {
  const match = source.match(/const tierResolvers: TierResolver\[] = \[([\s\S]*?)\n\]/)
  assert.ok(match, 'tierResolvers must be extractable')
  const actual = [...match[1].matchAll(/^\s*([A-Za-z]+Resolver),/gm)].map((entry) => entry[1])
  assert.deepEqual(actual, [
    'chefOverrideResolver',
    'pinnedPriceResolver',
    'receiptPriceResolver',
    'apiQuoteResolver',
    'wholesaleResolver',
    'ingredientDenormalizedResolver',
    'directScrapeResolver',
    'flyerPriceResolver',
    'instacartProxyResolver',
    'regionalAverageResolver',
    'resolvedNationalResolver',
    'marketAggregateResolver',
    'governmentResolver',
    'historicalResolver',
    'categoryBaselineResolver',
    'syntheticDbResolver',
    'syntheticInlineResolver',
  ])
})

test('batch PIE resolver preserves executable trust order', () => {
  const batch = functionBody('resolvePricesBatch')
  const stages = [
    'const override = overrideByIngredient.get(id)',
    'const pinned = pinnedPriceByIngredient.get(id)',
    'const recentReceipt = receipts.find(',
    'if (quote && quote.best_cents !== null && quote.best_cents > 0)',
    "const wholesaleRow = findBestRow(openclaw, 'openclaw_wholesale', 30)",
    'const denorm = denormPriceById.get(id)',
    'const scrapeRow = findBestRow(',
    'const flyerRow = findBestRow(',
    'const instacartRow = findBestRow(',
    'const regional = regionalAverages.get(id)',
    'const resolvedNational = resolvedNationalByIngredient.get(id)',
    'const marketAggregate = marketAggregateByIngredient.get(id)',
    "const govRow = findBestRow(openclaw, 'openclaw_government', null)",
    'const allReceiptPrices = receipts',
    'const category = categoryById.get(id)',
    'const synRow = slug ? syntheticBySlug.get(slug) : undefined',
    'const { cents: synCents, reason: synReason } = generateInlineSynthetic(',
  ]

  let previous = -1
  for (const stage of stages) {
    const index = batch.indexOf(stage)
    assert.ok(index > previous, `${stage} must execute after the previous batch stage`)
    previous = index
  }
})

test('batch row selection mirrors tier-specific store and state preferences', () => {
  const batch = functionBody('resolvePricesBatch')
  assert.match(batch, /preference\?\.preferStore && preferredStore/)
  assert.match(batch, /preference\?\.preferState && preferredState/)

  for (const variable of ['scrapeRow', 'flyerRow', 'instacartRow']) {
    const start = batch.indexOf(`const ${variable} = findBestRow`)
    assert.notEqual(start, -1)
    const call = batch.slice(start, start + 220)
    assert.match(call, /preferStore: true/)
    assert.match(call, /preferState: true/)
  }

  for (const variable of ['wholesaleRow', 'govRow']) {
    const start = batch.indexOf(`const ${variable} = findBestRow`)
    assert.notEqual(start, -1)
    const call = batch.slice(start, start + 140)
    assert.doesNotMatch(call, /preferStore: true/)
    assert.doesNotMatch(call, /preferState: true/)
  }
})

test('batch PIE includes batched market aggregate resolution', () => {
  const batch = functionBody('resolvePricesBatch')
  assert.match(batch, /marketAggregateByIngredient/)
  assert.match(batch, /openclaw\.system_ingredient_prices/)
  assert.match(batch, /source: 'market_aggregate'/)
  assert.match(batch, /sourceTier: 'system_ingredient_market'/)
})

test('PIE terminal fallback remains synthetic and never null', () => {
  const batch = functionBody('resolvePricesBatch')
  assert.match(batch, /generateInlineSynthetic/)
  assert.doesNotMatch(batch, /cents:\s*null/)
  assert.doesNotMatch(batch, /source:\s*'none'/)
})
