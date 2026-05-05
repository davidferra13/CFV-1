#!/usr/bin/env node
import { parseArgs, runChainScraper } from './lib/openclaw-price-scraper.mjs'

const TIER_1 = [
  'publix',
  'heb',
  'meijer',
  'food-lion',
  'giant-eagle',
  'giant-food',
  'stop-and-shop',
  'hannaford',
  'trader-joes',
  'sprouts',
  'winco',
  'hy-vee',
  'harris-teeter',
  'safeway',
  'albertsons',
]

const TIER_2 = [
  'piggly-wiggly',
  'winn-dixie',
  'grocery-outlet',
  'save-a-lot',
  'aldi-sud',
  'dollar-general',
  'dollar-tree',
  'bjs',
  'sams-club',
]

const baseArgs = parseArgs()
const requestedChains = baseArgs.chain
  ? baseArgs.chain.split(',').map((chain) => chain.trim()).filter(Boolean)
  : [...TIER_1, ...TIER_2]

const summary = []

for (const chain of requestedChains) {
  console.log(`\n##### ${chain} #####`)
  try {
    const result = await runChainScraper({ ...baseArgs, chain })
    summary.push({ chain, status: result.skipped ? 'skipped' : 'ok', ...result })
  } catch (error) {
    console.log(`FAILED chain=${chain} error=${error.message}`)
    summary.push({ chain, status: 'failed', error: error.message })
  }
}

console.log('\n=== Tier 1/Tier 2 summary ===')
for (const row of summary) {
  console.log(
    [
      `chain=${row.chain}`,
      `status=${row.status}`,
      `states=${row.stateCount ?? 0}`,
      `stores_scraped=${row.storesScraped ?? 0}`,
      `products_found=${row.productsFound ?? 0}`,
      `prices_inserted=${row.pricesInserted ?? 0}`,
      row.reason ? `reason=${row.reason}` : null,
      row.error ? `error=${row.error}` : null,
    ]
      .filter(Boolean)
      .join(' ')
  )
}

const failed = summary.filter((row) => row.status === 'failed')
if (failed.length > 0) process.exitCode = 1
