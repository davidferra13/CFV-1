#!/usr/bin/env node
/**
 * OpenClaw Wiki Enrichment - Full Drain Runner
 *
 * Phase 1: Processes all unenriched targetable ingredients (--resume batches)
 * Phase 2: Upgrades v1 records missing image_url or culinary_section (--upgrade batches)
 *
 * Safe to interrupt and resume - both phases are idempotent.
 *
 * Usage:
 *   node scripts/openclaw-wiki-drain.mjs              # 500/batch, auto phases
 *   node scripts/openclaw-wiki-drain.mjs --batch 200  # smaller batches
 *   node scripts/openclaw-wiki-drain.mjs --pause 5    # 5s between batches
 *   node scripts/openclaw-wiki-drain.mjs --upgrade-only # skip phase 1, run upgrade only
 */

import { execSync } from 'child_process'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir  = dirname(fileURLToPath(import.meta.url))
const PROJECT = join(__dir, '..')

try {
  const env = readFileSync(join(PROJECT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const DATABASE_URL  = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const args          = process.argv.slice(2)
const BATCH         = parseInt(args[args.indexOf('--batch') + 1]) || 500
const PAUSE_S       = parseInt(args[args.indexOf('--pause') + 1]) || 5
const UPGRADE_ONLY  = args.includes('--upgrade-only')

const delay = ms => new Promise(r => setTimeout(r, ms))

async function getStats(sql) {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*) FROM system_ingredients
       WHERE is_active = true
         AND name NOT LIKE '%''%'
         AND name NOT LIKE '"%'
         AND (
           (usda_food_group IS NOT NULL
            AND usda_food_group NOT IN ('Restaurant Foods', 'Fast Foods', 'Branded Food Products Database'))
           OR
           (usda_food_group IS NULL
            AND LENGTH(name) <= 50
            AND name NOT LIKE '%®%'
            AND name NOT LIKE '%™%'
            AND name NOT SIMILAR TO '%(Inc\.|LLC|Corp\.|Brand|Mix|Kit|Bundle|Set|Pack|Box|Can|Jar|Combo)%')
         )) AS targetable,
      (SELECT COUNT(*) FROM ingredient_knowledge
       WHERE wiki_summary IS NOT NULL AND needs_review = false) AS enriched,
      (SELECT COUNT(*) FROM ingredient_knowledge k
       JOIN system_ingredients si ON si.id = k.system_ingredient_id
       WHERE k.wiki_summary IS NOT NULL AND k.needs_review = false
         AND (
           k.image_url IS NULL
           OR k.culinary_section IS NULL
           OR (k.nutrition_json IS NULL AND si.usda_fdc_id IS NOT NULL)
         )) AS needs_upgrade,
      (SELECT COUNT(*) FROM ingredient_knowledge WHERE image_url IS NOT NULL) AS with_image,
      (SELECT COUNT(*) FROM ingredient_knowledge WHERE culinary_section IS NOT NULL) AS with_section,
      (SELECT COUNT(*) FROM ingredient_knowledge WHERE nutrition_json IS NOT NULL) AS with_nutrition
  `
  return {
    targetable:    Number(rows[0].targetable),
    enriched:      Number(rows[0].enriched),
    needsUpgrade:  Number(rows[0].needs_upgrade),
    withImage:     Number(rows[0].with_image),
    withSection:   Number(rows[0].with_section),
    withNutrition: Number(rows[0].with_nutrition),
  }
}

function run(cmd) {
  execSync(cmd, { cwd: PROJECT, stdio: 'inherit', timeout: 600000 })
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 2 })

  console.log('=== OpenClaw Wiki Drain ===')
  console.log(`Batch: ${BATCH} | Pause: ${PAUSE_S}s`)
  console.log()

  // -------------------------------------------------------------------------
  // Phase 1: Enrich all unenriched targetable ingredients
  // -------------------------------------------------------------------------

  if (!UPGRADE_ONLY) {
    console.log('--- Phase 1: New ingredients ---')
    let round = 1

    while (true) {
      const { targetable, enriched } = await getStats(sql)
      const remaining = targetable - enriched
      const pct = ((enriched / targetable) * 100).toFixed(1)

      console.log(`[P1 Round ${round}] ${enriched}/${targetable} (${pct}%) | ${remaining} remaining`)

      if (remaining <= 0) {
        console.log('Phase 1 complete - all ingredients enriched.')
        break
      }

      try {
        run(`node scripts/openclaw-wiki-enrichment.mjs --limit ${Math.min(BATCH, remaining)} --resume`)
      } catch (err) {
        console.error(`P1 batch error: ${err.message}. Retrying after 30s...`)
        await delay(30000)
      }

      round++
      const { targetable: t2, enriched: e2 } = await getStats(sql)
      if (t2 - e2 > 0) {
        console.log(`Pausing ${PAUSE_S}s...`)
        await delay(PAUSE_S * 1000)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Phase 2: Upgrade v1 records missing image or culinary section
  // -------------------------------------------------------------------------

  console.log()
  console.log('--- Phase 2: Upgrading v1 records ---')
  let upgradeRound = 1

  while (true) {
    const stats = await getStats(sql)
    console.log(`[P2 Round ${upgradeRound}] ${stats.needsUpgrade} records need upgrade | images=${stats.withImage} sections=${stats.withSection} nutrition=${stats.withNutrition}`)

    if (stats.needsUpgrade <= 0) {
      console.log('Phase 2 complete - all records upgraded.')
      break
    }

    try {
      run(`node scripts/openclaw-wiki-enrichment.mjs --upgrade --limit ${Math.min(BATCH, stats.needsUpgrade)}`)
    } catch (err) {
      console.error(`P2 batch error: ${err.message}. Retrying after 30s...`)
      await delay(30000)
    }

    upgradeRound++
    const { needsUpgrade } = await getStats(sql)
    if (needsUpgrade > 0) {
      console.log(`Pausing ${PAUSE_S}s...`)
      await delay(PAUSE_S * 1000)
    }
  }

  // -------------------------------------------------------------------------
  // Final report
  // -------------------------------------------------------------------------

  const final = await getStats(sql)
  console.log()
  console.log('=== Drain Complete ===')
  console.log(`Enriched:   ${final.enriched}/${final.targetable}`)
  console.log(`With image: ${final.withImage}`)
  console.log(`With section: ${final.withSection}`)
  console.log(`With nutrition: ${final.withNutrition}`)

  await sql.end()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
