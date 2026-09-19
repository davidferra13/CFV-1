/**
 * Q61: PIE price-resolution parity and terminal completeness
 *
 * Guards the contract that single-item and batch pricing follow the same
 * trust order and that PIE Law 9 always returns a numeric synthetic fallback.
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()
const RESOLVE_PRICE = resolve(ROOT, 'lib/pricing/resolve-price.ts')
const RESOLVE_HELPERS = resolve(ROOT, 'lib/pricing/resolve-price-helpers.ts')

function extractFunctionLines(src: string, funcName: string): string | null {
  const lines = src.split('\n')
  const pattern = new RegExp(`export\\s+async\\s+function\\s+${funcName}\\s*\\(`)
  const startLine = lines.findIndex((line) => pattern.test(line))
  if (startLine === -1) return null

  let endLine = lines.length
  for (let i = startLine + 1; i < lines.length; i++) {
    if (/^export\s/.test(lines[i])) {
      endLine = i
      break
    }
  }
  return lines.slice(startLine, endLine).join('\n')
}
test.describe('Q61: PIE price resolution completeness', () => {
  let src: string
  let helpers: string

  test.beforeAll(() => {
    expect(existsSync(RESOLVE_PRICE), 'resolve-price.ts must exist').toBe(true)
    expect(existsSync(RESOLVE_HELPERS), 'resolve-price-helpers.ts must exist').toBe(true)
    src = readFileSync(RESOLVE_PRICE, 'utf8')
    helpers = readFileSync(RESOLVE_HELPERS, 'utf8')
  })

  test('single and batch resolvers are exported', () => {
    expect(/export\s+async\s+function\s+resolvePrice\s*\(/.test(src)).toBe(true)
    expect(/export\s+async\s+function\s+resolvePricesBatch\s*\(/.test(src)).toBe(true)
    expect(src.includes('Promise<ResolvedPrice>')).toBe(true)
    expect(src.includes('Map<string, ResolvedPrice>')).toBe(true)
  })

  test('ResolvedPrice cents are always numeric under PIE Law 9', () => {
    const interfaceStart = helpers.indexOf('export interface ResolvedPrice')
    const interfaceEnd = helpers.indexOf('\n}', interfaceStart)
    const contract = helpers.slice(interfaceStart, interfaceEnd)
    expect(contract).toContain('cents: number')
    expect(contract).not.toContain('cents: number | null')
  })
  test('single-item resolver keeps the canonical 17-step order', () => {
    const match = src.match(/const tierResolvers: TierResolver\[] = \[([\s\S]*?)\n\]/)
    expect(match, 'tierResolvers must be extractable').toBeTruthy()
    const actual = [...match![1].matchAll(/^\s*([A-Za-z]+Resolver),/gm)].map((entry) => entry[1])

    expect(actual).toEqual([
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
  test('batch resolver preserves executable trust order', () => {
    const batch = extractFunctionLines(src, 'resolvePricesBatch')
    expect(batch).toBeTruthy()

    const stages = [
      'const override = overrideByIngredient.get(id)',
      'const pinned = pinnedPriceByIngredient.get(id)',
      'const recentReceipt = receipts.find(',
      'if (quote && quote.best_cents !== null && quote.best_cents > 0)',
      "const wholesaleRow = findBestRow(openclaw, 'openclaw_wholesale', 30)",
      'const denorm = denormPriceById.get(id)',
      "const scrapeRow = findBestRow(openclaw, 'openclaw_scrape', 14)",
      "const flyerRow = findBestRow(openclaw, 'openclaw_flyer', 14)",
      "const instacartRow = findBestRow(openclaw, 'openclaw_instacart', 30)",
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
      const index = batch!.indexOf(stage)
      expect(index, `${stage} must execute after the previous batch stage`).toBeGreaterThan(previous)
      previous = index
    }
  })

  test('batch market aggregate is batched and tenant-scoped', () => {
    const batch = extractFunctionLines(src, 'resolvePricesBatch')!
    expect(batch).toContain('marketAggregateByIngredient')
    expect(batch).toContain('openclaw.system_ingredient_prices')
    expect(batch).toContain('ANY(${ingredientIds})')
    expect(batch).toContain('ia.tenant_id = ${tenantId}')
    expect(batch).toContain("source: 'market_aggregate'")
    expect(batch).toContain("sourceTier: 'system_ingredient_market'")
  })

  test('both paths terminate with synthetic pricing rather than null', () => {
    const batch = extractFunctionLines(src, 'resolvePricesBatch')!
    expect(src).toContain('syntheticInlineResolver, // 10')
    expect(batch).toContain('generateInlineSynthetic')
    expect(batch).not.toContain('cents: null')
    expect(batch).not.toContain("source: 'none'")
  })
})
