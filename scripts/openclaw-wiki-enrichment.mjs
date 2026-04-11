#!/usr/bin/env node
/**
 * OpenClaw Ingredient Knowledge Enrichment v2
 *
 * 5 improvements over v1:
 *   1. Name cleaning  - strips USDA qualifiers before searching Wikipedia
 *                       ("Artichoke, (globe or french), raw" -> "artichoke")
 *   2. Section extraction - pulls "Culinary use", "Flavor", "History" sections
 *                       directly instead of keyword-scanning the full extract
 *   3. USDA nutrition - fetches macros + vitamins from FoodData Central API
 *                       using the existing usda_fdc_id on each ingredient
 *   4. Deeper Wikidata - checks P495 (origin), P225 (taxon), P18 (image),
 *                       P279/P31 (dietary), P171 (botanical family)
 *   5. Image storage  - stores Wikipedia thumbnail URL from summary response
 *
 * Pipeline per ingredient:
 *   clean name -> Wikipedia search -> Wikipedia summary (QID + image)
 *   -> Wikipedia sections (culinary/flavor/history text)
 *   -> Wikidata entity (origin, taxon, dietary)
 *   -> USDA FDC nutrition (if usda_fdc_id available)
 *   -> upsert ingredient_knowledge
 *
 * Usage:
 *   node scripts/openclaw-wiki-enrichment.mjs              # full run
 *   node scripts/openclaw-wiki-enrichment.mjs --limit 50   # test batch
 *   node scripts/openclaw-wiki-enrichment.mjs --resume     # skip already enriched
 *   node scripts/openclaw-wiki-enrichment.mjs --name "basil" --rerun  # single, force refresh
 */

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const __dir = dirname(fileURLToPath(import.meta.url))

try {
  const env = readFileSync(join(__dir, '../.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const DATABASE_URL  = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const USDA_API_KEY  = process.env.USDA_FDC_API_KEY || 'DEMO_KEY'
const WIKI_MS       = 250   // ms between Wikipedia calls
const WDATA_MS      = 150   // ms between Wikidata calls
const USDA_MS       = 200   // ms between USDA calls
const LOG_EVERY    = 10
const USER_AGENT   = 'ChefFlow/1.0 (https://cheflowhq.com; ingredient-knowledge-enrichment)'

const args    = process.argv.slice(2)
const LIMIT   = parseInt(args[args.indexOf('--limit') + 1])  || null
const RESUME  = args.includes('--resume')
const RERUN   = args.includes('--rerun')
const UPGRADE = args.includes('--upgrade')   // backfill v1 records missing image/section
const SINGLE  = args.includes('--name') ? args[args.indexOf('--name') + 1] : null
const DRY     = args.includes('--dry-run')

const sql = postgres(DATABASE_URL, { max: 5 })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = ms => new Promise(r => setTimeout(r, ms))

async function fetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...opts.headers } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Improvement 1: Name cleaning
// Strips USDA-style qualifiers so Wikipedia search works on the core term
// ---------------------------------------------------------------------------

function cleanName(raw) {
  return raw
    .replace(/\(.*?\)/g, '')            // remove (globe or french), (raw), etc.
    .replace(/,\s*(raw|cooked|dried|fresh|canned|frozen|boiled|roasted|smoked|salted|pickled|ground|whole|sliced|diced|chopped|minced|uncooked|prepared|dehydrated|reconstituted|NS as to form|NS as to type|all varieties|all types|generic|unspecified|not specified|from concentrate|with added|without added|fat free|low fat|reduced fat|low sodium|no salt added|extra lean|lean|regular|extra firm|firm|soft|silken)\s*$/gi, '')
    .replace(/,.*$/, '')                // take only first segment before any comma
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase()
}

// ---------------------------------------------------------------------------
// Improvement 2a: Wikipedia search
// ---------------------------------------------------------------------------

async function searchWikipedia(cleanedName) {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('list', 'search')
  url.searchParams.set('srsearch', cleanedName)
  url.searchParams.set('srlimit', '5')
  url.searchParams.set('srnamespace', '0')
  url.searchParams.set('format', 'json')

  const data = await fetchJson(url.toString())
  const results = data?.query?.search ?? []
  if (!results.length) return null

  // Prefer exact title match, then closest by edit distance
  const exact = results.find(r => r.title.toLowerCase() === cleanedName)
  if (exact) return exact.title

  // Prefer result whose title starts with the cleaned name
  const startsWith = results.find(r => r.title.toLowerCase().startsWith(cleanedName))
  if (startsWith) return startsWith.title

  return results[0].title
}

// ---------------------------------------------------------------------------
// Improvement 2b: Wikipedia summary (extract + Wikidata QID + thumbnail)
// ---------------------------------------------------------------------------

async function getWikipediaSummary(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'))
  const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`)
  if (!data || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null

  return {
    title:       data.title,
    description: data.description ?? null,
    extract:     data.extract     ?? null,
    wikidataQid: data.wikibase_item ?? null,
    url:         data.content_urls?.page?.desktop ?? null,
    imageUrl:    data.thumbnail?.source ?? null,   // improvement 5: image
  }
}

// ---------------------------------------------------------------------------
// Improvement 2c: Wikipedia section extraction
// Pulls "Culinary use", "Flavor", "History", "Nutrition" section text
// ---------------------------------------------------------------------------

const CULINARY_SECTIONS = ['culinary use', 'culinary uses', 'in cooking', 'uses', 'preparation', 'cooking']
const FLAVOR_SECTIONS   = ['flavor', 'flavour', 'taste', 'aroma', 'sensory']
const HISTORY_SECTIONS  = ['history', 'origin', 'origins', 'background']

async function getWikipediaSections(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'))

  // Step 1: get section index
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', encoded)
  url.searchParams.set('prop', 'sections')
  url.searchParams.set('format', 'json')

  const data = await fetchJson(url.toString())
  const sections = data?.parse?.sections ?? []

  const result = { culinary: null, flavor: null, history: null }

  for (const section of sections) {
    const label = (section.line ?? '').toLowerCase().replace(/<[^>]+>/g, '').trim()
    const idx   = section.index

    if (!result.culinary && CULINARY_SECTIONS.some(s => label.includes(s))) {
      result.culinary = await getSectionText(encoded, idx)
      await delay(WIKI_MS)
    } else if (!result.flavor && FLAVOR_SECTIONS.some(s => label.includes(s))) {
      result.flavor = await getSectionText(encoded, idx)
      await delay(WIKI_MS)
    } else if (!result.history && HISTORY_SECTIONS.some(s => label.includes(s))) {
      result.history = await getSectionText(encoded, idx)
      await delay(WIKI_MS)
    }

    if (result.culinary && result.flavor && result.history) break
  }

  return result
}

async function getSectionText(encodedTitle, sectionIndex) {
  // action=parse with section=N returns the specific section HTML
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'parse')
  url.searchParams.set('page', encodedTitle)
  url.searchParams.set('section', String(sectionIndex))
  url.searchParams.set('prop', 'wikitext')
  url.searchParams.set('format', 'json')

  const data = await fetchJson(url.toString())
  const wikitext = data?.parse?.wikitext?.['*'] ?? null
  if (!wikitext) return null

  // Strip wiki markup: templates, links, refs, headers, bold/italic
  const plain = wikitext
    .replace(/\{\{[^}]*\}\}/gs, '')        // {{templates}}
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')  // [[link|text]] -> text
    .replace(/<ref[^>]*>.*?<\/ref>/gis, '') // <ref>...</ref>
    .replace(/<[^>]+>/g, '')               // remaining HTML tags
    .replace(/'''?/g, '')                  // bold/italic markers
    .replace(/==+[^=]+=+/g, '')            // section headers
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return plain.slice(0, 2000) || null
}

// ---------------------------------------------------------------------------
// Improvement 4: Wikidata - deeper property extraction
// ---------------------------------------------------------------------------

async function getWikidataProperties(qid) {
  if (!qid) return {}

  const data = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)
  const entity = data?.entities?.[qid]
  if (!entity) return {}

  const claims = entity.claims ?? {}

  function qids(prop) {
    return (claims[prop] ?? [])
      .map(c => c?.mainsnak?.datavalue?.value?.id)
      .filter(Boolean)
  }

  function strVal(prop) {
    try { return claims[prop]?.[0]?.mainsnak?.datavalue?.value ?? null } catch { return null }
  }

  // P495 = country of origin, P17 = country (fallback)
  const originQids = [...new Set([...qids('P495'), ...qids('P17')])].slice(0, 5)

  // P225 = taxon name (scientific name)
  const taxonName = strVal('P225')

  // P171 = parent taxon (for botanical family)
  const parentTaxonQids = qids('P171').slice(0, 3)

  // Dietary classification from P31 (instance of) + P279 (subclass of)
  const allClasses = [...qids('P31'), ...qids('P279')]

  const DIET_MAP = {
    'Q181138': 'vegan',
    'Q386724': 'vegetarian',
    'Q182375': 'halal',
    'Q877179': 'kosher',
    'Q178220': 'gluten-free',
    'Q736053': 'dairy-free',
  }
  const dietaryFlags = [...new Set(
    allClasses.map(q => DIET_MAP[q]).filter(Boolean)
  )]

  return { originQids, taxonName, parentTaxonQids, dietaryFlags }
}

async function resolveQidLabels(qids) {
  if (!qids.length) return []
  const data = await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=labels&languages=en&format=json`
  )
  return qids
    .map(q => data?.entities?.[q]?.labels?.en?.value)
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Improvement 3: USDA FoodData Central nutrition
// ---------------------------------------------------------------------------

async function getUsdaNutrition(fdcId) {
  if (!fdcId) return null

  const data = await fetchJson(
    `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?format=abridged&api_key=${USDA_API_KEY}`
  )
  if (!data?.foodNutrients) return null

  // Nutrient IDs we care about (USDA standard)
  const NUTRIENT_MAP = {
    1008: 'calories_kcal',
    1003: 'protein_g',
    1004: 'fat_g',
    1005: 'carbs_g',
    1079: 'fiber_g',
    2000: 'sugar_g',
    1087: 'calcium_mg',
    1089: 'iron_mg',
    1092: 'potassium_mg',
    1093: 'sodium_mg',
    1106: 'vitamin_a_ug',
    1162: 'vitamin_c_mg',
    1114: 'vitamin_d_ug',
    1109: 'vitamin_e_mg',
    1185: 'vitamin_k_ug',
    1166: 'vitamin_b6_mg',
    1175: 'folate_ug',
    1178: 'vitamin_b12_ug',
  }

  const nutrition = { per_100g: {} }
  for (const n of data.foodNutrients) {
    const key = NUTRIENT_MAP[n.nutrientId]
    if (key && n.value != null) {
      nutrition.per_100g[key] = Math.round(n.value * 100) / 100
    }
  }

  if (!Object.keys(nutrition.per_100g).length) return null
  nutrition.source = 'usda_fdc'
  nutrition.fdc_id = fdcId
  return nutrition
}

// ---------------------------------------------------------------------------
// Culinary context extraction from section text (improvement 2c output)
// ---------------------------------------------------------------------------

function parseCulinaryContext(sections, fallbackExtract) {
  const text = sections.culinary ?? sections.flavor ?? fallbackExtract ?? ''
  const lower = text.toLowerCase()

  // Flavor words - scoped to flavor section or first 500 chars of culinary section
  const FLAVOR_SCOPE = (sections.flavor ?? sections.culinary ?? fallbackExtract ?? '').toLowerCase().slice(0, 600)
  const flavorWords = [
    'bitter', 'sweet', 'sour', 'salty', 'umami', 'savory', 'savoury',
    'earthy', 'nutty', 'pungent', 'spicy', 'hot', 'mild', 'rich', 'tangy',
    'astringent', 'aromatic', 'floral', 'herbal', 'smoky', 'sharp', 'tart',
    'delicate', 'robust', 'complex', 'subtle', 'acidic', 'sweet-tart',
    'buttery', 'creamy', 'starchy', 'grassy', 'fruity', 'musky', 'briny',
  ]
  const foundFlavors = flavorWords.filter(w => FLAVOR_SCOPE.includes(w))
  const flavorProfile = foundFlavors.length ? foundFlavors.slice(0, 6).join(', ') : null

  // Culinary uses - scoped to culinary section text
  const CULINARY_SCOPE = (sections.culinary ?? fallbackExtract ?? '').toLowerCase()
  const useWords = [
    'roast', 'roasted', 'bake', 'baked', 'grill', 'grilled', 'sauté', 'sauteed',
    'steam', 'steamed', 'fry', 'fried', 'deep-fry', 'raw', 'braise', 'braised',
    'boil', 'boiled', 'simmer', 'dried', 'fresh', 'salad', 'soup', 'stew',
    'sauce', 'garnish', 'juice', 'pickle', 'pickled', 'ferment', 'fermented',
    'marinate', 'marinated', 'puree', 'infuse', 'brew', 'cure', 'smoke', 'smoked',
    'poach', 'blanch', 'caramelize', 'reduce', 'glaze',
  ]
  const foundUses = useWords.filter(w => CULINARY_SCOPE.includes(w))
  const culinaryUses = foundUses.length ? foundUses.slice(0, 8).join(', ') : null

  // Pairings from culinary section (improved patterns)
  const pairingPatterns = [
    /pairs? (?:well )?with ([^.;]{3,60})/gi,
    /goes? well with ([^.;]{3,60})/gi,
    /combined? with ([^.;]{3,60})/gi,
    /complement[s]? ([^.;]{3,60})/gi,
    /(?:served|used) (?:with|alongside) ([^.;]{3,60})/gi,
    /common(?:ly)? (?:paired|used) with ([^.;]{3,60})/gi,
  ]
  const pairings = new Set()
  const pairingSource = sections.culinary ?? fallbackExtract ?? ''
  for (const pattern of pairingPatterns) {
    for (const match of pairingSource.matchAll(pattern)) {
      const words = match[1].split(/[\s,;]+/).slice(0, 3).join(' ').trim()
      if (words.length > 2 && words.length < 40) pairings.add(words.toLowerCase())
      if (pairings.size >= 6) break
    }
  }

  return { flavorProfile, culinaryUses, typicalPairings: [...pairings].slice(0, 6) }
}

// ---------------------------------------------------------------------------
// Confidence scorer (updated)
// ---------------------------------------------------------------------------

function computeConfidence({ nameMatch, hasQid, hasExtract, hasCulinarySection, hasOrigin, hasTaxon, hasNutrition, hasImage }) {
  let score = 0
  if (nameMatch)          score += 0.25
  if (hasQid)             score += 0.20
  if (hasCulinarySection) score += 0.20  // strongest signal - section extraction worked
  if (hasExtract)         score += 0.10
  if (hasOrigin)          score += 0.10
  if (hasTaxon)           score += 0.08
  if (hasNutrition)       score += 0.05
  if (hasImage)           score += 0.02
  return Math.min(Math.round(score * 100) / 100, 1.0)
}

// ---------------------------------------------------------------------------
// URL-safe slug
// ---------------------------------------------------------------------------

function toSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .trim().slice(0, 80)
}

// ---------------------------------------------------------------------------
// Core: enrich a single ingredient
// ---------------------------------------------------------------------------

async function enrichIngredient(ingredient) {
  const { id, name, usda_fdc_id } = ingredient

  if (DRY) {
    console.log(`  [dry] ${name}`)
    return { success: true, skipped: false }
  }

  // 1. Clean name for better Wikipedia matching
  const searchName = cleanName(name)

  // 2. Search Wikipedia
  const wikiTitle = await searchWikipedia(searchName)
  await delay(WIKI_MS)

  if (!wikiTitle) {
    await sql`
      INSERT INTO ingredient_knowledge (system_ingredient_id, enrichment_source, enrichment_confidence, needs_review, enriched_at)
      VALUES (${id}, 'partial', 0.05, true, NOW())
      ON CONFLICT (system_ingredient_id) DO UPDATE SET needs_review = true, enriched_at = NOW()
    `
    return { success: false, reason: 'no Wikipedia article' }
  }

  // 3. Wikipedia summary (QID + image)
  const summary = await getWikipediaSummary(wikiTitle)
  await delay(WIKI_MS)

  if (!summary) return { success: false, reason: 'summary fetch failed' }

  // 4. Wikipedia section extraction (culinary/flavor/history)
  const sections = await getWikipediaSections(wikiTitle)
  await delay(WIKI_MS)

  // 5. Wikidata structured properties
  let wdProps = {}
  if (summary.wikidataQid) {
    wdProps = await getWikidataProperties(summary.wikidataQid)
    await delay(WDATA_MS)
  }

  // 6. Resolve origin country labels
  let originCountries = []
  if (wdProps.originQids?.length) {
    originCountries = await resolveQidLabels(wdProps.originQids)
    await delay(WDATA_MS)
  }

  // 7. USDA nutrition (if FDC ID available)
  let nutrition = null
  if (usda_fdc_id) {
    nutrition = await getUsdaNutrition(usda_fdc_id)
    await delay(USDA_MS)
  }

  // 8. Parse culinary context from section text
  const culinary = parseCulinaryContext(sections, summary.extract)

  // 9. Compute confidence
  const confidence = computeConfidence({
    nameMatch:          wikiTitle.toLowerCase().startsWith(searchName.split(' ')[0]),
    hasQid:             !!summary.wikidataQid,
    hasExtract:         !!summary.extract,
    hasCulinarySection: !!sections.culinary,
    hasOrigin:          originCountries.length > 0,
    hasTaxon:           !!wdProps.taxonName,
    hasNutrition:       !!nutrition,
    hasImage:           !!summary.imageUrl,
  })

  // 10. Upsert
  const slug = toSlug(name)

  await sql`
    INSERT INTO ingredient_knowledge (
      system_ingredient_id, wikidata_qid, wikipedia_slug, wikipedia_url,
      wiki_summary, wiki_extract, origin_countries, flavor_profile,
      culinary_uses, typical_pairings, taxon_name, dietary_flags,
      culinary_section, history_section, image_url, nutrition_json,
      enrichment_source, enrichment_confidence, enriched_at, needs_review
    ) VALUES (
      ${id}, ${summary.wikidataQid ?? null}, ${wikiTitle}, ${summary.url ?? null},
      ${summary.description ?? summary.extract?.slice(0, 300) ?? null},
      ${summary.extract ?? null},
      ${originCountries}, ${culinary.flavorProfile}, ${culinary.culinaryUses},
      ${culinary.typicalPairings}, ${wdProps.taxonName ?? null},
      ${wdProps.dietaryFlags ?? []},
      ${sections.culinary ?? null}, ${sections.history ?? null},
      ${summary.imageUrl ?? null},
      ${nutrition ? JSON.stringify(nutrition) : null},
      ${summary.wikidataQid ? 'wikidata' : 'wikipedia'},
      ${confidence}, NOW(), ${confidence < 0.35}
    )
    ON CONFLICT (system_ingredient_id) DO UPDATE SET
      wikidata_qid = EXCLUDED.wikidata_qid, wikipedia_slug = EXCLUDED.wikipedia_slug,
      wikipedia_url = EXCLUDED.wikipedia_url, wiki_summary = EXCLUDED.wiki_summary,
      wiki_extract = EXCLUDED.wiki_extract, origin_countries = EXCLUDED.origin_countries,
      flavor_profile = EXCLUDED.flavor_profile, culinary_uses = EXCLUDED.culinary_uses,
      typical_pairings = EXCLUDED.typical_pairings, taxon_name = EXCLUDED.taxon_name,
      dietary_flags = EXCLUDED.dietary_flags, culinary_section = EXCLUDED.culinary_section,
      history_section = EXCLUDED.history_section, image_url = EXCLUDED.image_url,
      nutrition_json = EXCLUDED.nutrition_json, enrichment_source = EXCLUDED.enrichment_source,
      enrichment_confidence = EXCLUDED.enrichment_confidence,
      enriched_at = NOW(), needs_review = EXCLUDED.needs_review
  `

  await sql`
    UPDATE system_ingredients SET
      wikidata_qid = ${summary.wikidataQid ?? null},
      wikipedia_slug = ${wikiTitle}, knowledge_enriched_at = NOW()
    WHERE id = ${id}
  `

  await sql`
    INSERT INTO ingredient_knowledge_slugs (slug, system_ingredient_id, is_canonical)
    VALUES (${slug}, ${id}, true)
    ON CONFLICT (slug) DO NOTHING
  `

  return { success: true, wikiTitle, confidence, hasSection: !!sections.culinary, hasImage: !!summary.imageUrl, hasNutrition: !!nutrition }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const modeLabel = SINGLE ? `single(${SINGLE})` : UPGRADE ? 'upgrade(v1 backfill)' : RESUME ? 'resume' : 'full'
  console.log('=== OpenClaw Ingredient Knowledge Enrichment v2 ===')
  console.log(`Mode: ${modeLabel} | Limit: ${LIMIT ?? 'all'} | Dry: ${DRY}`)
  console.log()

  let ingredients

  if (SINGLE) {
    ingredients = await sql`
      SELECT id, name, category, usda_food_group, usda_fdc_id
      FROM system_ingredients
      WHERE is_active = true AND LOWER(name) = LOWER(${SINGLE})
      LIMIT 1
    `
    if (!ingredients.length) {
      ingredients = await sql`
        SELECT id, name, category, usda_food_group, usda_fdc_id
        FROM system_ingredients
        WHERE is_active = true AND name ILIKE ${'%' + SINGLE + '%'}
        ORDER BY LENGTH(name) ASC LIMIT 1
      `
    }
  } else if (UPGRADE) {
    // Target records missing image_url, culinary_section, or nutrition_json
    // nutrition_json is only populated when usda_fdc_id is available on the ingredient
    ingredients = await sql`
      SELECT si.id, si.name, si.category, si.usda_food_group, si.usda_fdc_id
      FROM system_ingredients si
      JOIN ingredient_knowledge k ON k.system_ingredient_id = si.id
      WHERE si.is_active = true
        AND k.needs_review = false
        AND k.wiki_summary IS NOT NULL
        AND (
          k.image_url IS NULL
          OR k.culinary_section IS NULL
          OR (k.nutrition_json IS NULL AND si.usda_fdc_id IS NOT NULL)
        )
      ORDER BY si.name ASC
      ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
    `
  } else {
    const resumeClause = RESUME ? sql`AND k.system_ingredient_id IS NULL` : sql``
    ingredients = await sql`
      SELECT si.id, si.name, si.category, si.usda_food_group, si.usda_fdc_id
      FROM system_ingredients si
      LEFT JOIN ingredient_knowledge k ON k.system_ingredient_id = si.id
      WHERE si.is_active = true
        AND si.usda_food_group IS NOT NULL
        AND si.usda_food_group NOT IN ('Restaurant Foods', 'Fast Foods', 'Branded Food Products Database')
        AND si.name NOT LIKE '%''%'
        AND si.name NOT LIKE '"%'
        ${resumeClause}
      ORDER BY si.name ASC
      ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
    `
  }

  if (!ingredients.length) {
    console.log('Nothing to process.')
    await sql.end()
    return
  }

  console.log(`Processing ${ingredients.length} ingredients...`)
  console.log()

  let enriched = 0, failed = 0, withSection = 0, withImage = 0, withNutrition = 0

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i]

    if (i > 0 && i % LOG_EVERY === 0) {
      console.log(`  [${i}/${ingredients.length}] ok=${enriched} fail=${failed} sections=${withSection} images=${withImage} nutrition=${withNutrition}`)
    }

    try {
      const r = await enrichIngredient(ing)
      if (r.success) {
        enriched++
        if (r.hasSection)   withSection++
        if (r.hasImage)     withImage++
        if (r.hasNutrition) withNutrition++
        if (SINGLE || ingredients.length <= 20) {
          console.log(`  [OK] ${ing.name} -> "${r.wikiTitle}" conf=${r.confidence?.toFixed(2)} section=${r.hasSection} img=${r.hasImage} nutrition=${r.hasNutrition}`)
        }
      } else {
        failed++
        if (SINGLE || ingredients.length <= 20) console.log(`  [--] ${ing.name}: ${r.reason}`)
      }
    } catch (err) {
      failed++
      console.error(`  [ERR] ${ing.name}: ${err.message}`)
    }
  }

  console.log()
  console.log(`=== Done: ${enriched} enriched | ${failed} failed | ${withSection} with sections | ${withImage} with images | ${withNutrition} with nutrition ===`)
  await sql.end()
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
