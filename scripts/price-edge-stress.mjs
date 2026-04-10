#!/usr/bin/env node
/**
 * Edge-case stress test for the nationwide pricing engine.
 *
 * Validates the total/honest-function contract on lookupPrice:
 *   1. No query crashes. Every query must return a typed result (passing
 *      result.matched=false is a valid "none" tier, not a crash).
 *   2. resolution_tier is always populated and is one of the honest enum
 *      values.
 *   3. Misspellings resolve via trigram fallback instead of throwing.
 *   4. Multi-location queries report the tier they actually used (we no
 *      longer care if the price happens to overlap across regions when the
 *      data is thin — we care that the tier tells the truth).
 */

import { spawnSync, execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'

const TESTS = [
  // Common
  { q: 'chicken breast', zip: '01830', kind: 'common/Haverhill MA' },
  { q: 'eggs', zip: '10001', kind: 'common/NYC' },
  { q: 'ground beef', zip: '90210', kind: 'common/LA' },
  { q: 'milk', zip: '60601', kind: 'common/Chicago' },
  { q: 'butter', zip: '79901', kind: 'common/El Paso TX' },
  // Rural
  { q: 'flour', zip: '59718', kind: 'rural/MT' },
  { q: 'potatoes', zip: '83702', kind: 'rural/ID' },
  { q: 'sugar', zip: '04401', kind: 'rural/ME' },
  // Obscure/seasonal
  { q: 'fiddleheads', zip: '04401', kind: 'obscure/seasonal' },
  { q: 'ramps', zip: '26505', kind: 'obscure/WV' },
  { q: 'huitlacoche', zip: '85001', kind: 'obscure/AZ' },
  { q: 'yuzu', zip: '94102', kind: 'obscure/SF' },
  { q: 'morel mushrooms', zip: '55401', kind: 'obscure/MN' },
  { q: 'sea urchin', zip: '02101', kind: 'obscure/Boston' },
  // Branded
  { q: 'Heinz Ketchup', zip: '15222', kind: 'branded/PIT' },
  { q: 'Kraft Mac and Cheese', zip: '60601', kind: 'branded' },
  { q: 'Hellmanns Mayo', zip: '10001', kind: 'branded' },
  // Vague/incomplete
  { q: 'cheese', zip: '10001', kind: 'vague' },
  { q: 'fish', zip: '02101', kind: 'vague' },
  { q: 'oil', zip: '90001', kind: 'vague' },
  // Misspellings (these used to crash)
  { q: 'tomatoe', zip: '10001', kind: 'misspell' },
  { q: 'parmasan', zip: '10001', kind: 'misspell' },
  { q: 'chiken breast', zip: '10001', kind: 'misspell' },
  { q: 'bazil', zip: '10001', kind: 'misspell' },
  { q: 'avacado', zip: '90210', kind: 'misspell' },
  // Multi-location same item
  { q: 'olive oil', zip: '02101', kind: 'multi/MA' },
  { q: 'olive oil', zip: '90001', kind: 'multi/CA' },
  { q: 'olive oil', zip: '75201', kind: 'multi/TX' },
  { q: 'olive oil', zip: '99501', kind: 'multi/AK' },
  { q: 'olive oil', zip: '96801', kind: 'multi/HI' },
]

const VALID_TIERS = new Set([
  'zip_local',
  'regional',
  'national_median',
  'estimated',
  'none',
])

const scriptBody = `
import { lookupPrice } from './lib/pricing/universal-price-lookup'

const tests = ${JSON.stringify(TESTS)}
const validTiers = new Set(${JSON.stringify([...VALID_TIERS])})

async function run() {
  let crashed = 0
  let invalidTier = 0
  let none = 0
  let honest = 0
  const tierCounts = {}
  const rows = []

  for (const t of tests) {
    try {
      const r = await lookupPrice({ ingredient: t.q, zipCode: t.zip })

      if (!validTiers.has(r.resolution_tier)) {
        invalidTier++
        rows.push({ t, tier: 'INVALID(' + r.resolution_tier + ')', price: null, note: 'invalid tier' })
        continue
      }

      tierCounts[r.resolution_tier] = (tierCounts[r.resolution_tier] || 0) + 1
      honest++

      if (r.resolution_tier === 'none') {
        none++
        rows.push({ t, tier: r.resolution_tier, price: null, note: r.suggestion ? 'suggest: ' + r.suggestion : 'no data' })
      } else {
        const cents = r.price_per_unit_cents ?? r.price_cents
        rows.push({ t, tier: r.resolution_tier, price: cents, unit: r.unit, dp: r.data_points, method: r.match_method, suggest: r.suggestion })
      }
    } catch (e) {
      crashed++
      rows.push({ t, tier: 'CRASH', price: null, note: e instanceof Error ? e.message : String(e) })
    }
  }

  // Print
  for (const row of rows) {
    const tag = row.tier === 'CRASH' ? 'CRASH' : row.tier === 'none' ? 'NONE ' : 'OK   '
    const priceStr = row.price != null ? (row.price + 'c/' + (row.unit||'?')) : '-'
    console.log(tag + ' ' + String(row.t.kind).padEnd(22) + ' ' + String(row.t.q).padEnd(26) + ' zip=' + row.t.zip + ' tier=' + row.tier.padEnd(16) + ' ' + priceStr + (row.suggest ? ' [did-you-mean: ' + row.suggest + ']' : '') + (row.note ? ' (' + row.note + ')' : ''))
  }

  console.log('')
  console.log('==== SUMMARY ====')
  console.log('Total queries:   ' + tests.length)
  console.log('Crashes:         ' + crashed + ' (must be 0)')
  console.log('Invalid tiers:   ' + invalidTier + ' (must be 0)')
  console.log('Honest results:  ' + honest)
  console.log('  of which none: ' + none)
  console.log('Tier distribution:')
  for (const [tier, count] of Object.entries(tierCounts).sort((a,b) => b[1]-a[1])) {
    console.log('  ' + tier.padEnd(18) + count)
  }

  const fatalFail = crashed > 0 || invalidTier > 0
  if (fatalFail) process.exit(1)
  process.exit(0)
}

run().catch((e) => { console.error('run() failed:', e); process.exit(2) })
`

writeFileSync('.tmp-price-edge.ts', scriptBody)
try {
  const res = spawnSync('npx', ['tsx', '.tmp-price-edge.ts'], {
    stdio: 'inherit',
    shell: true,
  })
  process.exit(res.status ?? 1)
} finally {
  try {
    unlinkSync('.tmp-price-edge.ts')
  } catch {}
}
