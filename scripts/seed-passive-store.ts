#!/usr/bin/env npx tsx

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { syncPassiveProductsForAllChefs } from '@/lib/passive-store/store'

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null

  console.log('=== Passive Store Seed ===')
  const results = await syncPassiveProductsForAllChefs(
    typeof limit === 'number' && Number.isFinite(limit) ? limit : null
  )

  for (const result of results) {
    console.log(`${result.chefId}: ${result.productCount} products`)
  }

  console.log(`Seeded ${results.length} chefs`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
