#!/usr/bin/env node
/**
 * USDA SR Legacy Import Script
 *
 * Imports ~6,000+ canonical ingredients from USDA SR Legacy CSV into system_ingredients.
 * Idempotent: safe to re-run. Uses ON CONFLICT on slug and usda_fdc_id.
 *
 * Usage: node scripts/import-usda-sr-legacy.mjs [--dry-run] [--verbose]
 *
 * Requires: migration 20260401000137 applied first (usda columns on system_ingredients).
 * Connects directly via postgres.js using DATABASE_URL or hardcoded local connection.
 */

import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import postgres from 'postgres'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')

const CONNECTION = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const DATA_DIR = new URL('./data/usda-sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04/', import.meta.url)
  .pathname.replace(/^\/([A-Z]:)/, '$1')

// ---------------------------------------------------------------------------
// Load mapping config
// ---------------------------------------------------------------------------
const categoryMapping = JSON.parse(readFileSync(new URL('./data/usda-category-mapping.json', import.meta.url), 'utf8'))
const excludedGroups = JSON.parse(readFileSync(new URL('./data/usda-excluded-groups.json', import.meta.url), 'utf8'))
const EXCLUDED_IDS = new Set(excludedGroups.excluded_ids)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200)
}

function log(msg) {
  if (VERBOSE) console.log(`  [v] ${msg}`)
}

function resolveCategory(foodCategoryId, description) {
  const groupDef = categoryMapping.group_defaults[foodCategoryId]
  if (!groupDef) return null // unknown group

  let category = groupDef.category
  const descLower = description.toLowerCase()

  // Apply keyword overrides
  for (const override of categoryMapping.keyword_overrides) {
    if (!override.groups.includes(foodCategoryId)) continue
    const regex = new RegExp(override.pattern, 'i')
    if (regex.test(descLower)) {
      category = override.category
      break
    }
  }

  return category
}

// ---------------------------------------------------------------------------
// Parse USDA CSV files
// ---------------------------------------------------------------------------
console.log('USDA SR Legacy Import')
console.log('=====================')
if (DRY_RUN) console.log('*** DRY RUN - no database writes ***\n')

console.log('Loading CSV files...')
const foodCsv = readFileSync(DATA_DIR + 'food.csv', 'utf8')
const foods = parse(foodCsv, { columns: true, skip_empty_lines: true })

const ndbCsv = readFileSync(DATA_DIR + 'sr_legacy_food.csv', 'utf8')
const ndbRows = parse(ndbCsv, { columns: true, skip_empty_lines: true })
const ndbMap = Object.fromEntries(ndbRows.map(r => [r.fdc_id, r.NDB_number]))

const catCsv = readFileSync(DATA_DIR + 'food_category.csv', 'utf8')
const cats = parse(catCsv, { columns: true, skip_empty_lines: true })
const catMap = Object.fromEntries(cats.map(c => [c.id, c.description]))

const portionCsv = readFileSync(DATA_DIR + 'food_portion.csv', 'utf8')
const portions = parse(portionCsv, { columns: true, skip_empty_lines: true })

// Index portions by fdc_id
const portionsByFdc = {}
for (const p of portions) {
  if (!portionsByFdc[p.fdc_id]) portionsByFdc[p.fdc_id] = []
  portionsByFdc[p.fdc_id].push(p)
}

console.log(`  Loaded ${foods.length} foods, ${portions.length} portions`)

// ---------------------------------------------------------------------------
// Step 1: Filter excluded groups
// ---------------------------------------------------------------------------
const included = foods.filter(f => !EXCLUDED_IDS.has(f.food_category_id))
const excluded = foods.length - included.length
console.log(`  Excluded ${excluded} items from ${EXCLUDED_IDS.size} groups`)
console.log(`  Remaining: ${included.length}`)

// ---------------------------------------------------------------------------
// Step 2: Parse descriptions into components + generate canonical keys
// ---------------------------------------------------------------------------

// Protein groups that need aggressive variant collapse
const PROTEIN_GROUPS = new Set(['5', '7', '10', '13', '15', '17'])

// Technical modifiers to strip from canonical names
const STRIP_PATTERNS = [
  /,?\s*separable lean and fat/i,
  /,?\s*separable lean only/i,
  /,?\s*separable fat/i,
  /,?\s*meat only/i,
  /,?\s*meat and skin/i,
  /,?\s*skin only/i,
  /,?\s*trimmed to \d[/"]*\s*fat/i,
  /,?\s*trimmed to \d[/"]*\s*"/i,
  /,?\s*all grades/i,
  /,?\s*select/i,
  /,?\s*choice/i,
  /,?\s*prime/i,
  /,?\s*cooked,?\s*(braised|roasted|broiled|grilled|baked|fried|simmered|stewed|pan-fried|microwaved)/i,
  /,?\s*raw$/i,
  /,?\s*dried$/i,
  /,?\s*cured$/i,
  /,?\s*smoked$/i,
]

function parseDescription(desc, foodCategoryId) {
  const parts = desc.split(',').map(s => s.trim())

  if (PROTEIN_GROUPS.has(foodCategoryId) && parts.length >= 2) {
    // For proteins: "Animal, cut/part, modifiers..."
    // Canonical key = first 2-3 meaningful parts
    const base = parts[0]
    const cut = parts.length > 1 ? parts[1] : ''
    // Include the subcut if it looks like a real cut (not a modifier)
    const subcut = parts.length > 2 && !/separable|trimmed|all grades|select|choice|prime|cooked|raw|dried|cured|smoked/i.test(parts[2])
      ? parts[2] : ''

    const canonicalParts = [base, cut, subcut].filter(Boolean)
    return {
      canonicalName: canonicalParts.join(', '),
      canonicalKey: slugify(canonicalParts.join(' ')),
      isRaw: /\braw\b/i.test(desc),
      isGeneric: /all grades/i.test(desc),
      originalDesc: desc
    }
  }

  // For non-proteins: clean the description but keep it mostly intact
  let cleaned = desc
  for (const pat of STRIP_PATTERNS) {
    cleaned = cleaned.replace(pat, '')
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return {
    canonicalName: cleaned,
    canonicalKey: slugify(cleaned),
    isRaw: /\braw\b/i.test(desc),
    isGeneric: true,
    originalDesc: desc
  }
}

// ---------------------------------------------------------------------------
// Step 3: Group by canonical key, pick best representative
// ---------------------------------------------------------------------------
const groups = {}

for (const food of included) {
  const parsed = parseDescription(food.description, food.food_category_id)
  const key = parsed.canonicalKey

  if (!groups[key]) groups[key] = []
  groups[key].push({
    ...parsed,
    fdcId: parseInt(food.fdc_id),
    ndbNumber: ndbMap[food.fdc_id] ? parseInt(ndbMap[food.fdc_id]) : null,
    foodCategoryId: food.food_category_id,
    category: resolveCategory(food.food_category_id, food.description),
    foodGroup: catMap[food.food_category_id] || 'Unknown'
  })
}

console.log(`  Canonical groups: ${Object.keys(groups).length}`)

// Pick best representative per group
// Priority: raw > no cooking state > cooked; generic > specific grade
const canonicalItems = []

for (const [key, variants] of Object.entries(groups)) {
  // Sort: raw+generic first, then raw, then generic, then anything
  variants.sort((a, b) => {
    const scoreA = (a.isRaw ? 2 : 0) + (a.isGeneric ? 1 : 0)
    const scoreB = (b.isRaw ? 2 : 0) + (b.isGeneric ? 1 : 0)
    return scoreB - scoreA
  })

  const best = variants[0]

  // Generate aliases from all variants
  const aliases = new Set()
  for (const v of variants) {
    // Original USDA description
    aliases.add(v.originalDesc)
    // Reverse comma format: "Cheese, cheddar" -> "cheddar cheese"
    const commaParts = v.originalDesc.split(',').map(s => s.trim())
    if (commaParts.length >= 2) {
      aliases.add(commaParts.slice(1).join(' ') + ' ' + commaParts[0])
    }
  }
  // Remove the canonical name itself from aliases
  aliases.delete(best.canonicalName)

  // Clean up the canonical name
  let name = best.canonicalName
  // Replace em dashes with hyphens
  name = name.replace(/\u2014/g, '-').replace(/\u2013/g, '-')
  // Strip trailing "raw" if it snuck through
  name = name.replace(/,?\s*raw$/i, '').trim()
  // Capitalize first letter of each major word
  name = name.replace(/(^|,\s*)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
  // Truncate to 200 chars
  if (name.length > 200) {
    const full = name
    name = name.slice(0, 200)
    aliases.add(full)
  }

  canonicalItems.push({
    name,
    slug: key,
    category: best.category,
    fdcId: best.fdcId,
    ndbNumber: best.ndbNumber,
    foodGroup: best.foodGroup,
    aliases: [...aliases].filter(a => a && a !== name).slice(0, 20), // cap at 20 aliases
    variantCount: variants.length
  })
}

console.log(`  Canonical items after collapse: ${canonicalItems.length}`)

// Stats
const collapseStats = {}
for (const item of canonicalItems) {
  if (item.variantCount > 1) {
    collapseStats[item.category] = (collapseStats[item.category] || 0) + 1
  }
}
if (VERBOSE) {
  console.log('  Collapsed groups by category:')
  for (const [cat, count] of Object.entries(collapseStats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count} groups had multiple variants`)
  }
}

// ---------------------------------------------------------------------------
// Step 4: Parse portion data for count-to-weight mapping
// ---------------------------------------------------------------------------
const COUNT_UNIT_PATTERNS = [
  { pattern: /\b(medium)\b/i, unit: 'medium' },
  { pattern: /\b(large)\b/i, unit: 'large' },
  { pattern: /\b(small)\b/i, unit: 'small' },
  { pattern: /\b(slice)\b/i, unit: 'slice' },
  { pattern: /\b(piece)\b/i, unit: 'piece' },
  { pattern: /\b(each)\b/i, unit: 'each' },
  { pattern: /\b(whole)\b/i, unit: 'whole' },
  { pattern: /\b(ear)\b/i, unit: 'ear' },
  { pattern: /\b(stalk)\b/i, unit: 'stalk' },
  { pattern: /\b(clove)\b/i, unit: 'clove' },
  { pattern: /\b(head)\b/i, unit: 'head' },
  { pattern: /\b(leaf|leaves)\b/i, unit: 'leaf' },
  { pattern: /\b(sprig)\b/i, unit: 'sprig' },
  { pattern: /\b(fillet)\b/i, unit: 'fillet' },
  { pattern: /\b(breast)\b/i, unit: 'breast' },
  { pattern: /\b(thigh)\b/i, unit: 'thigh' },
  { pattern: /\b(drumstick)\b/i, unit: 'drumstick' },
  { pattern: /\b(wing)\b/i, unit: 'wing' },
  { pattern: /\b(link)\b/i, unit: 'link' },
  { pattern: /\b(patty|pattie)\b/i, unit: 'patty' },
  { pattern: /\b(strip)\b/i, unit: 'strip' },
]

function parsePortionUnit(modifier) {
  if (!modifier) return null
  for (const { pattern, unit } of COUNT_UNIT_PATTERNS) {
    if (pattern.test(modifier)) return unit
  }
  return null
}

// Build portion lookup: fdcId -> { unit, gramWeight }
const portionLookup = {}
let portionsParsed = 0

for (const item of canonicalItems) {
  const itemPortions = portionsByFdc[String(item.fdcId)]
  if (!itemPortions) continue

  for (const p of itemPortions) {
    const unit = parsePortionUnit(p.modifier)
    if (!unit) continue

    const gramWeight = parseFloat(p.gram_weight)
    const amount = parseFloat(p.amount) || 1
    if (isNaN(gramWeight) || gramWeight <= 0) continue

    const perUnit = gramWeight / amount

    // Keep the first valid one per item (prefer medium/each/whole)
    if (!portionLookup[item.fdcId] ||
        ['medium', 'each', 'whole'].includes(unit) && !['medium', 'each', 'whole'].includes(portionLookup[item.fdcId].unit)) {
      portionLookup[item.fdcId] = { unit, gramWeight: perUnit, notes: p.modifier }
      portionsParsed++
    }
  }
}

console.log(`  Portion data matched: ${portionsParsed} items`)

// ---------------------------------------------------------------------------
// Step 5: Load supplemental ingredients
// ---------------------------------------------------------------------------
let supplementalItems = []
try {
  const suppData = JSON.parse(readFileSync(new URL('./data/supplemental-ingredients.json', import.meta.url), 'utf8'))
  supplementalItems = suppData
  console.log(`  Supplemental ingredients loaded: ${supplementalItems.length}`)
} catch {
  console.log('  No supplemental-ingredients.json found (skipping)')
}

// ---------------------------------------------------------------------------
// Step 6: Database upsert
// ---------------------------------------------------------------------------
if (DRY_RUN) {
  console.log('\n--- DRY RUN SUMMARY ---')
  console.log(`Would process ${canonicalItems.length} USDA items + ${supplementalItems.length} supplemental`)

  // Show category distribution
  const catCounts = {}
  for (const item of canonicalItems) {
    catCounts[item.category] = (catCounts[item.category] || 0) + 1
  }
  console.log('\nCategory distribution:')
  for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }

  // Show sample items
  console.log('\nSample items (first 20):')
  for (const item of canonicalItems.slice(0, 20)) {
    console.log(`  [${item.category}] ${item.name} (${item.variantCount} variants, ${item.aliases.length} aliases)`)
  }

  process.exit(0)
}

const sql = postgres(CONNECTION, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
})

try {
  // Verify migration has been applied
  const colCheck = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'system_ingredients' AND column_name = 'slug'
  `
  if (colCheck.length === 0) {
    console.error('\nERROR: Migration 20260401000137 has not been applied.')
    console.error('Run the migration first, then re-run this script.')
    process.exit(1)
  }

  // First, backfill slugs on existing rows that don't have them
  const existingRows = await sql`
    SELECT id, name, slug FROM system_ingredients WHERE slug IS NULL
  `
  if (existingRows.length > 0) {
    console.log(`\nBackfilling slugs on ${existingRows.length} existing rows...`)
    for (const row of existingRows) {
      const newSlug = slugify(row.name)
      await sql`UPDATE system_ingredients SET slug = ${newSlug} WHERE id = ${row.id}`
    }
    console.log('  Done.')
  }

  // Load existing slugs and names for dedup
  const existingItems = await sql`
    SELECT id, name, slug, usda_fdc_id FROM system_ingredients WHERE is_active = true
  `
  const existingSlugs = new Map(existingItems.map(r => [r.slug, r]))
  const existingNames = new Map(existingItems.map(r => [r.name.toLowerCase(), r]))

  console.log(`\nExisting system_ingredients: ${existingItems.length}`)

  let merged = 0
  let inserted = 0
  let skipped = 0
  let portionsApplied = 0
  let aliasesGenerated = 0

  // Process in batches
  const BATCH_SIZE = 50
  console.log(`\nUpserting ${canonicalItems.length} USDA items...`)

  for (let i = 0; i < canonicalItems.length; i += BATCH_SIZE) {
    const batch = canonicalItems.slice(i, i + BATCH_SIZE)

    for (const item of batch) {
      if (!item.category) {
        log(`Skipping ${item.name} - no category mapping`)
        skipped++
        continue
      }

      // Check for existing match by slug
      const existingBySlug = existingSlugs.get(item.slug)
      // Check for existing match by name (case-insensitive)
      const existingByName = existingNames.get(item.name.toLowerCase())
      const existing = existingBySlug || existingByName

      const aliasArray = item.aliases.filter(Boolean)
      aliasesGenerated += aliasArray.length

      // Portion data
      const portion = portionLookup[item.fdcId]

      if (existing) {
        // UPDATE existing row - add USDA data, NEVER overwrite enrichment data
        await sql`
          UPDATE system_ingredients SET
            usda_fdc_id = COALESCE(usda_fdc_id, ${item.fdcId}),
            usda_ndb_number = COALESCE(usda_ndb_number, ${item.ndbNumber}),
            usda_food_group = COALESCE(usda_food_group, ${item.foodGroup}),
            slug = COALESCE(slug, ${item.slug}),
            aliases = (
              SELECT array_agg(DISTINCT elem)
              FROM unnest(COALESCE(aliases, '{}') || ${sql.array(aliasArray)}::text[]) AS elem
            ),
            updated_at = now()
          WHERE id = ${existing.id}
        `

        // Apply portion data only if missing
        if (portion) {
          await sql`
            UPDATE system_ingredients SET
              count_unit = COALESCE(count_unit, ${portion.unit}),
              count_weight_grams = COALESCE(count_weight_grams, ${portion.gramWeight}),
              count_notes = COALESCE(count_notes, ${portion.notes})
            WHERE id = ${existing.id}
              AND count_unit IS NULL
          `
          portionsApplied++
        }

        merged++
        log(`Merged: ${item.name} -> existing ${existing.name}`)
      } else {
        // INSERT new row
        try {
          await sql`
            INSERT INTO system_ingredients (
              name, category, slug,
              usda_fdc_id, usda_ndb_number, usda_food_group,
              aliases,
              unit_type, standard_unit,
              count_unit, count_weight_grams, count_notes,
              is_active
            ) VALUES (
              ${item.name}, ${item.category}::ingredient_category, ${item.slug},
              ${item.fdcId}, ${item.ndbNumber}, ${item.foodGroup},
              ${sql.array(aliasArray)}::text[],
              'weight', 'g',
              ${portion?.unit || null}, ${portion?.gramWeight || null}, ${portion?.notes || null},
              true
            )
            ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
              usda_fdc_id = COALESCE(system_ingredients.usda_fdc_id, EXCLUDED.usda_fdc_id),
              usda_ndb_number = COALESCE(system_ingredients.usda_ndb_number, EXCLUDED.usda_ndb_number),
              usda_food_group = COALESCE(system_ingredients.usda_food_group, EXCLUDED.usda_food_group),
              aliases = (
                SELECT array_agg(DISTINCT elem)
                FROM unnest(COALESCE(system_ingredients.aliases, '{}') || EXCLUDED.aliases) AS elem
              ),
              updated_at = now()
          `
          inserted++
          if (portion) portionsApplied++

          // Track for dedup in this run
          existingSlugs.set(item.slug, { id: null, name: item.name, slug: item.slug })
          existingNames.set(item.name.toLowerCase(), { id: null, name: item.name, slug: item.slug })
        } catch (err) {
          if (err.code === '23505') {
            // Unique violation - slug collision with numeric suffix needed
            const altSlug = item.slug + '-' + item.fdcId
            try {
              await sql`
                INSERT INTO system_ingredients (
                  name, category, slug,
                  usda_fdc_id, usda_ndb_number, usda_food_group,
                  aliases,
                  unit_type, standard_unit,
                  count_unit, count_weight_grams, count_notes,
                  is_active
                ) VALUES (
                  ${item.name}, ${item.category}::ingredient_category, ${altSlug},
                  ${item.fdcId}, ${item.ndbNumber}, ${item.foodGroup},
                  ${sql.array(aliasArray)}::text[],
                  'weight', 'g',
                  ${portion?.unit || null}, ${portion?.gramWeight || null}, ${portion?.notes || null},
                  true
                )
              `
              inserted++
              if (portion) portionsApplied++
              log(`Inserted with alt slug: ${item.name} -> ${altSlug}`)
            } catch (err2) {
              console.error(`  ERROR inserting ${item.name}: ${err2.message}`)
              skipped++
            }
          } else {
            console.error(`  ERROR inserting ${item.name}: ${err.message}`)
            skipped++
          }
        }
      }
    }

    // Progress
    const pct = Math.round((i + batch.length) / canonicalItems.length * 100)
    process.stdout.write(`\r  Progress: ${pct}% (${i + batch.length}/${canonicalItems.length})`)
  }
  console.log() // newline after progress

  // ---------------------------------------------------------------------------
  // Step 7: Supplemental ingredients
  // ---------------------------------------------------------------------------
  let suppInserted = 0
  let suppMerged = 0

  if (supplementalItems.length > 0) {
    console.log(`\nUpserting ${supplementalItems.length} supplemental ingredients...`)

    for (const item of supplementalItems) {
      const slug = slugify(item.name)
      const aliasArray = (item.aliases || []).filter(Boolean)

      const existing = existingSlugs.get(slug) || existingNames.get(item.name.toLowerCase())

      if (existing) {
        // Merge aliases only
        if (aliasArray.length > 0) {
          await sql`
            UPDATE system_ingredients SET
              aliases = (
                SELECT array_agg(DISTINCT elem)
                FROM unnest(COALESCE(aliases, '{}') || ${sql.array(aliasArray)}::text[]) AS elem
              ),
              updated_at = now()
            WHERE id = ${existing.id}
          `
        }
        suppMerged++
      } else {
        try {
          await sql`
            INSERT INTO system_ingredients (
              name, category, subcategory, slug,
              aliases,
              unit_type, standard_unit,
              is_active
            ) VALUES (
              ${item.name}, ${item.category}::ingredient_category, ${item.subcategory || ''},
              ${slug},
              ${sql.array(aliasArray)}::text[],
              ${item.unit_type || 'weight'}, ${item.standard_unit || 'g'},
              true
            )
            ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING
          `
          suppInserted++
          existingSlugs.set(slug, { id: null, name: item.name, slug })
        } catch (err) {
          console.error(`  ERROR inserting supplemental ${item.name}: ${err.message}`)
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Step 8: Final counts
  // ---------------------------------------------------------------------------
  const finalCount = await sql`SELECT COUNT(*) AS c FROM system_ingredients WHERE is_active = true`
  const usdaCount = await sql`SELECT COUNT(*) AS c FROM system_ingredients WHERE usda_fdc_id IS NOT NULL`
  const slugCount = await sql`SELECT COUNT(*) AS c FROM system_ingredients WHERE slug IS NOT NULL`
  const aliasCount = await sql`
    SELECT COUNT(*) AS c FROM system_ingredients
    WHERE aliases IS NOT NULL AND array_length(aliases, 1) > 0
  `

  console.log('\n=============================')
  console.log('USDA SR Legacy Import Summary')
  console.log('=============================')
  console.log(`Total SR Legacy items:     ${foods.length.toLocaleString()}`)
  console.log(`Excluded (filtered):       ${excluded.toLocaleString()}`)
  console.log(`Pre-collapse:              ${included.length.toLocaleString()}`)
  console.log(`Post-collapse (canonical): ${canonicalItems.length.toLocaleString()}`)
  console.log(`Merged with existing:      ${merged.toLocaleString()}`)
  console.log(`New items inserted:        ${inserted.toLocaleString()}`)
  console.log(`Skipped (no category):     ${skipped.toLocaleString()}`)
  console.log(`Supplemental inserted:     ${suppInserted.toLocaleString()}`)
  console.log(`Supplemental merged:       ${suppMerged.toLocaleString()}`)
  console.log(`Portion data applied:      ${portionsApplied.toLocaleString()}`)
  console.log(`Aliases generated:         ${aliasesGenerated.toLocaleString()}`)
  console.log('-----------------------------')
  console.log(`Final active ingredients:  ${parseInt(finalCount[0].c).toLocaleString()}`)
  console.log(`With USDA FDC ID:         ${parseInt(usdaCount[0].c).toLocaleString()}`)
  console.log(`With slug:                ${parseInt(slugCount[0].c).toLocaleString()}`)
  console.log(`With aliases:             ${parseInt(aliasCount[0].c).toLocaleString()}`)
  console.log('=============================')

} catch (err) {
  console.error('\nFATAL ERROR:', err.message)
  if (VERBOSE) console.error(err.stack)
  process.exit(1)
} finally {
  await sql.end()
}
