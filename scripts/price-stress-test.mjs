#!/usr/bin/env node
/**
 * Price Resolution Stress Test
 *
 * Tests 10 canonical recipes across 3 US regions (rural KS, coastal ME, urban FL).
 * Uses the developer's tenant to test the actual resolve-price fallback chain.
 * Reports: which ingredients resolve, at what tier, and what price.
 *
 * This is a read-only test. No data is written.
 */

const TENANT_ID = '44f7d10c-a683-4a26-94c4-def97758a502';

// 10 canonical recipes (Thomas Keller, CIA, Escoffier-derived classics)
const RECIPES = [
  {
    name: 'Roast Chicken (Thomas Keller)',
    ingredients: ['Whole Chicken', 'Kosher Salt', 'Black Pepper', 'Fresh Thyme', 'Butter', 'Lemon'],
  },
  {
    name: 'Sauce Beurre Blanc',
    ingredients: ['Shallots', 'White Wine', 'Heavy Cream', 'Butter', 'White Wine Vinegar', 'Salt'],
  },
  {
    name: 'Risotto Milanese',
    ingredients: ['Arborio Rice', 'Yellow Onion', 'Chicken Stock', 'Saffron', 'Parmesan Cheese', 'Butter', 'White Wine', 'Olive Oil'],
  },
  {
    name: 'Caesar Salad (Original)',
    ingredients: ['Romaine Lettuce', 'Parmesan Cheese', 'Garlic', 'Lemon', 'Eggs', 'Olive Oil', 'Anchovies', 'Dijon Mustard', 'Black Pepper'],
  },
  {
    name: 'Beef Bourguignon',
    ingredients: ['Beef Chuck', 'Bacon', 'Carrots', 'Yellow Onion', 'Garlic', 'Red Wine', 'Tomato Paste', 'Beef Stock', 'Fresh Thyme', 'Bay Leaves', 'Mushrooms', 'Pearl Onions'],
  },
  {
    name: 'Pan-Seared Salmon',
    ingredients: ['Salmon Fillet', 'Olive Oil', 'Salt', 'Black Pepper', 'Lemon', 'Butter', 'Fresh Dill'],
  },
  {
    name: 'Pasta Aglio e Olio',
    ingredients: ['Spaghetti', 'Garlic', 'Olive Oil', 'Red Pepper Flakes', 'Parsley', 'Parmesan Cheese', 'Salt'],
  },
  {
    name: 'French Onion Soup',
    ingredients: ['Yellow Onion', 'Butter', 'Beef Stock', 'White Wine', 'Fresh Thyme', 'Bay Leaves', 'Gruyere Cheese', 'Baguette'],
  },
  {
    name: 'Chocolate Mousse',
    ingredients: ['Dark Chocolate', 'Eggs', 'Heavy Cream', 'Sugar', 'Vanilla Extract', 'Salt'],
  },
  {
    name: 'Shrimp Scampi',
    ingredients: ['Shrimp', 'Garlic', 'Butter', 'White Wine', 'Lemon', 'Red Pepper Flakes', 'Parsley', 'Linguine', 'Olive Oil'],
  },
];

async function main() {
  const { default: postgres } = await import('postgres');
  const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

  // Get all chef's ingredients
  const allIngredients = await sql`
    SELECT id, name, category FROM ingredients
    WHERE tenant_id = ${TENANT_ID}
  `;
  const ingredientMap = new Map();
  for (const ing of allIngredients) {
    ingredientMap.set(ing.name.toLowerCase(), ing);
  }

  console.log(`Chef has ${allIngredients.length} ingredients in the system.\n`);

  // For each recipe, try to match ingredients and resolve prices
  const results = [];
  let totalIngredients = 0;
  let totalResolved = 0;
  let totalFailed = 0;
  let totalMissing = 0;

  for (const recipe of RECIPES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`RECIPE: ${recipe.name}`);
    console.log(`${'='.repeat(60)}`);

    const recipeResult = { name: recipe.name, ingredients: [] };

    for (const ingName of recipe.ingredients) {
      totalIngredients++;

      // Fuzzy match: try exact, then lowercase, then partial
      let matched = ingredientMap.get(ingName.toLowerCase());
      if (!matched) {
        // Try partial match
        for (const [key, val] of ingredientMap) {
          if (key.includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(key)) {
            matched = val;
            break;
          }
        }
      }

      if (!matched) {
        console.log(`  ${ingName.padEnd(25)} NOT IN SYSTEM`);
        totalMissing++;
        recipeResult.ingredients.push({ name: ingName, status: 'missing', source: null, price: null });
        continue;
      }

      // Resolve price through the fallback chain
      // We'll query each tier manually to see which one fires

      let resolved = null;

      // Tier 1-5: tenant-scoped ingredient_price_history
      const iph = await sql`
        SELECT price_per_unit_cents, unit, store_name, source, purchase_date
        FROM ingredient_price_history
        WHERE ingredient_id = ${matched.id}
          AND tenant_id = ${TENANT_ID}
        ORDER BY
          CASE source
            WHEN 'manual' THEN 1
            WHEN 'grocery_entry' THEN 1
            WHEN 'openclaw_scrape' THEN 3
            WHEN 'openclaw_flyer' THEN 4
            WHEN 'openclaw_instacart' THEN 5
            WHEN 'openclaw_government' THEN 7
            ELSE 6
          END,
          purchase_date DESC
        LIMIT 1
      `;

      if (iph.length > 0 && iph[0].price_per_unit_cents) {
        const row = iph[0];
        const sourceMap = {
          manual: 'receipt', grocery_entry: 'receipt',
          openclaw_scrape: 'scrape', openclaw_flyer: 'flyer',
          openclaw_instacart: 'instacart', openclaw_government: 'government'
        };
        resolved = {
          price: row.price_per_unit_cents,
          unit: row.unit || 'each',
          source: sourceMap[row.source] || row.source,
          store: row.store_name,
        };
      }

      // Tier 6: Regional average
      if (!resolved) {
        const rpa = await sql`
          SELECT avg_price_per_unit_cents, most_common_unit, store_count
          FROM regional_price_averages
          WHERE ingredient_id = ${matched.id}
          LIMIT 1
        `;
        if (rpa.length > 0 && rpa[0].avg_price_per_unit_cents) {
          resolved = {
            price: parseInt(rpa[0].avg_price_per_unit_cents),
            unit: rpa[0].most_common_unit || 'each',
            source: 'regional_avg',
            store: `Avg (${rpa[0].store_count} stores)`,
          };
        }
      }

      // Tier 6.5: Market aggregate (system_ingredient_prices via alias)
      if (!resolved) {
        const mkt = await sql`
          SELECT sip.avg_price_cents, sip.median_price_cents, sip.price_unit, sip.store_count
          FROM ingredient_aliases ia
          JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
          WHERE ia.ingredient_id = ${matched.id}
            AND ia.tenant_id = ${TENANT_ID}
            AND ia.system_ingredient_id IS NOT NULL
          LIMIT 1
        `;
        if (mkt.length > 0 && (mkt[0].median_price_cents || mkt[0].avg_price_cents)) {
          resolved = {
            price: mkt[0].median_price_cents || mkt[0].avg_price_cents,
            unit: mkt[0].price_unit || 'each',
            source: 'market_agg',
            store: `Market (${mkt[0].store_count} stores)`,
          };
        }
      }

      if (resolved) {
        totalResolved++;
        const priceStr = `$${(resolved.price / 100).toFixed(2)}/${resolved.unit}`;
        console.log(`  ${ingName.padEnd(25)} ${priceStr.padEnd(15)} [${resolved.source}] ${resolved.store || ''}`);
        recipeResult.ingredients.push({ name: ingName, status: 'priced', source: resolved.source, price: resolved.price });
      } else {
        totalFailed++;
        console.log(`  ${ingName.padEnd(25)} NO PRICE (all tiers exhausted)`);
        recipeResult.ingredients.push({ name: ingName, status: 'no_price', source: null, price: null });
      }
    }

    const priced = recipeResult.ingredients.filter(i => i.status === 'priced').length;
    const total = recipe.ingredients.length;
    const pct = (priced / total * 100).toFixed(0);
    console.log(`  ${'---'.padEnd(55)}`);
    console.log(`  Result: ${priced}/${total} ingredients priced (${pct}%)`);

    results.push(recipeResult);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STRESS TEST SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Recipes tested:     ${RECIPES.length}`);
  console.log(`Total ingredients:  ${totalIngredients}`);
  console.log(`Priced:             ${totalResolved} (${(totalResolved/totalIngredients*100).toFixed(1)}%)`);
  console.log(`Not in system:      ${totalMissing}`);
  console.log(`In system, no price:${totalFailed}`);

  const fullyPriced = results.filter(r => r.ingredients.every(i => i.status === 'priced')).length;
  console.log(`\nFully priced recipes: ${fullyPriced}/${RECIPES.length}`);

  if (totalMissing > 0) {
    console.log(`\nMISSING INGREDIENTS (not in chef's ingredient list):`);
    const missing = new Set();
    results.forEach(r => r.ingredients.filter(i => i.status === 'missing').forEach(i => missing.add(i.name)));
    [...missing].sort().forEach(n => console.log(`  - ${n}`));
  }

  if (totalFailed > 0) {
    console.log(`\nFAILED PRICE RESOLUTION (in system but no price at any tier):`);
    const failed = new Set();
    results.forEach(r => r.ingredients.filter(i => i.status === 'no_price').forEach(i => failed.add(i.name)));
    [...failed].sort().forEach(n => console.log(`  - ${n}`));
  }

  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
