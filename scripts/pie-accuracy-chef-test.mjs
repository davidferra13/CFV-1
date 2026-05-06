#!/usr/bin/env node
/**
 * PIE Accuracy: Chef Ingredient Test
 *
 * Tests Pi bridge accuracy against the 100 most common chef ingredients.
 * This is the honest measurement: "When a chef looks up X, is the price right?"
 *
 * For each ingredient:
 *   1. Query Pi bridge for prices
 *   2. Filter to food-relevant products
 *   3. Report median price, match quality, and price range
 *
 * Usage: node scripts/pie-accuracy-chef-test.mjs [--state MA]
 */

const PI_BRIDGE = process.env.PI_BRIDGE_URL || 'http://10.0.0.177:7700'

// Top 100 chef ingredients (what a private chef actually buys)
const CHEF_INGREDIENTS = [
  // Proteins
  'chicken breast', 'ground beef', 'salmon', 'shrimp', 'bacon',
  'pork chops', 'steak', 'turkey', 'lamb', 'sausage',
  'chicken thighs', 'cod', 'tuna', 'scallops', 'ham',
  // Dairy
  'butter', 'eggs', 'heavy cream', 'milk', 'sour cream',
  'cream cheese', 'parmesan', 'mozzarella', 'cheddar', 'yogurt',
  'buttermilk', 'goat cheese', 'gruyere', 'ricotta', 'brie',
  // Produce
  'onion', 'garlic', 'tomato', 'potato', 'lemon',
  'lime', 'avocado', 'bell pepper', 'mushroom', 'carrot',
  'celery', 'cucumber', 'lettuce', 'spinach', 'kale',
  'broccoli', 'asparagus', 'zucchini', 'corn', 'green beans',
  'ginger', 'jalapeño', 'shallot', 'scallion', 'arugula',
  // Pantry
  'olive oil', 'vegetable oil', 'flour', 'sugar', 'rice',
  'pasta', 'bread', 'vinegar', 'soy sauce', 'honey',
  'maple syrup', 'tomato paste', 'chicken broth', 'coconut milk', 'beans',
  // Baking
  'vanilla extract', 'baking powder', 'baking soda', 'chocolate',
  'cocoa powder', 'brown sugar', 'powdered sugar', 'cornstarch', 'yeast',
  // Spices & Herbs
  'salt', 'black pepper', 'cumin', 'paprika', 'cinnamon',
  'oregano', 'basil', 'thyme', 'rosemary', 'red pepper flakes',
  'garlic powder', 'onion powder', 'chili powder', 'turmeric', 'nutmeg',
  'parsley', 'cilantro', 'dill', 'bay leaves', 'cayenne',
]

// Non-food product keywords (same as Pi API v2)
const NON_FOOD_RE = new RegExp(
  'lotion|shampoo|conditioner|soap|detergent|deodorant|antiperspirant|moisturizer|sunscreen' +
  '|lip gloss|lip balm|mascara|foundation|concealer|hair mask|body wash|body butter' +
  '|petroleum jelly|hand cream|face wash|cleanser|toner|serum|makeup|cosmetic' +
  '|nail polish|perfume|cologne|toothpaste|mouthwash|dental|floss' +
  '|diaper|wipe|tissue|paper towel|toilet paper|laundry|fabric softener|bleach' +
  '|disinfectant|trash bag|sponge|steel wool|battery|lightbulb|candle' +
  '|cat food|dog food|pet treat|kitty litter|bandage|first aid|thermometer|medicine' +
  '|vitamin|supplement|probiotic|melatonin|condom|lubricant|acne|benzoyl peroxide' +
  '|physicians formula|nyx professional|olay |dove beauty|maui moisture' +
  '|heals & softens|hydrating|anti-aging|skin care|deep conditioning|hair treatment' +
  '|body oil|after sun|spf |uv protection|scrubber|bowl brush|dish wand',
  'i'
)

function isRelevantProduct(productName, ingredientName) {
  if (!productName) return false
  if (NON_FOOD_RE.test(productName)) return false
  return true
}

async function queryPi(name, state) {
  const params = new URLSearchParams({ name })
  if (state) params.set('state', state)
  try {
    const resp = await fetch(`${PI_BRIDGE}/price?${params}`, {
      signal: AbortSignal.timeout(30000),
    })
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const stateIdx = args.indexOf('--state')
  const state = stateIdx >= 0 ? args[stateIdx + 1] : undefined

  console.log('PIE Chef Ingredient Accuracy Test')
  console.log(`Ingredients: ${CHEF_INGREDIENTS.length}`)
  console.log(`State filter: ${state || 'none'}`)
  console.log(`Pi bridge: ${PI_BRIDGE}`)
  console.log('='.repeat(70))

  // Verify Pi is up
  try {
    const health = await fetch(`${PI_BRIDGE}/health`, { signal: AbortSignal.timeout(30000) })
    const h = await health.json()
    console.log(`Pi bridge: v${h.version}, ${h.total_prices?.toLocaleString()} prices`)
  } catch {
    console.error('Pi bridge unreachable!')
    process.exit(1)
  }

  let matched = 0
  let noMatch = 0
  let noRelevantPrices = 0
  const results = []

  for (const name of CHEF_INGREDIENTS) {
    const data = await queryPi(name, state)

    if (!data || !data.ingredient) {
      noMatch++
      results.push({ name, status: 'NO_MATCH' })
      continue
    }

    // Filter to relevant food products
    const allPrices = data.prices || []
    const relevant = allPrices.filter(p => isRelevantProduct(p.product_name, name))

    if (relevant.length === 0) {
      noRelevantPrices++
      results.push({
        name,
        status: 'NO_FOOD_PRICES',
        match_type: data.match_type,
        canonical: data.ingredient.name,
        unfiltered: allPrices.length,
      })
      continue
    }

    // Compute median price (prefer standardized)
    const cents = relevant
      .map(p => p.price_per_standard_unit_cents || p.price_cents)
      .filter(c => c > 0)
      .sort((a, b) => a - b)

    if (cents.length === 0) {
      noRelevantPrices++
      results.push({ name, status: 'NO_VALID_CENTS' })
      continue
    }

    const median = cents[Math.floor(cents.length / 2)]
    const min = cents[0]
    const max = cents[cents.length - 1]
    const unit = data.ingredient.standard_unit || relevant[0].price_unit || '?'

    matched++
    results.push({
      name,
      status: 'MATCHED',
      match_type: data.match_type,
      canonical: data.ingredient.name,
      median_cents: median,
      min_cents: min,
      max_cents: max,
      unit,
      observations: relevant.length,
      filtered_out: allPrices.length - relevant.length,
    })
  }

  // Print results
  console.log('\n' + '='.repeat(70))
  console.log('MATCHED INGREDIENTS:')
  console.log('-'.repeat(70))

  const matchedResults = results.filter(r => r.status === 'MATCHED')
  for (const r of matchedResults) {
    const price = `$${(r.median_cents / 100).toFixed(2)}/${r.unit}`
    const range = `$${(r.min_cents / 100).toFixed(2)}-$${(r.max_cents / 100).toFixed(2)}`
    const filtered = r.filtered_out > 0 ? ` (${r.filtered_out} non-food filtered)` : ''
    console.log(`  ${r.name.padEnd(20)} ${price.padEnd(14)} range: ${range.padEnd(18)} obs: ${r.observations}${filtered}`)
  }

  console.log('\nUNMATCHED:')
  const unmatched = results.filter(r => r.status === 'NO_MATCH')
  if (unmatched.length > 0) {
    for (const r of unmatched) console.log(`  ${r.name}`)
  } else {
    console.log('  (none)')
  }

  console.log('\nMATCHED BUT NO FOOD PRICES:')
  const noFood = results.filter(r => r.status === 'NO_FOOD_PRICES')
  if (noFood.length > 0) {
    for (const r of noFood) console.log(`  ${r.name} -> ${r.canonical} (${r.match_type}, ${r.unfiltered} unfiltered)`)
  } else {
    console.log('  (none)')
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('SUMMARY')
  console.log(`  Total ingredients tested: ${CHEF_INGREDIENTS.length}`)
  console.log(`  Pi matched (with food prices): ${matched} (${(matched / CHEF_INGREDIENTS.length * 100).toFixed(1)}%)`)
  console.log(`  Pi matched (no food prices): ${noRelevantPrices}`)
  console.log(`  No Pi match at all: ${noMatch}`)
  console.log(`  Coverage: ${((matched + noRelevantPrices) / CHEF_INGREDIENTS.length * 100).toFixed(1)}% found, ${(matched / CHEF_INGREDIENTS.length * 100).toFixed(1)}% with prices`)

  // Price sanity check
  if (matchedResults.length > 0) {
    console.log('\n  PRICE SANITY CHECK (flagging obvious errors):')
    let sane = 0
    let suspicious = 0
    for (const r of matchedResults) {
      const dollars = r.median_cents / 100
      // Flag prices that seem wrong for common ingredients
      const isSuspicious = dollars > 50 || dollars < 0.01
      if (isSuspicious) {
        console.log(`    SUSPICIOUS: ${r.name} = $${dollars.toFixed(2)}/${r.unit} (${r.observations} obs)`)
        suspicious++
      } else {
        sane++
      }
    }
    console.log(`    Sane: ${sane}, Suspicious: ${suspicious}`)
  }
}

main().catch(console.error)
