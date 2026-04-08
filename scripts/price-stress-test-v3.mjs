#!/usr/bin/env node
/**
 * Price Stress Test v3 - Comprehensive Real-World Validation
 *
 * 30 real recipes spanning global cuisines, complexity levels, and
 * ingredient types. Tests whether a private chef can price ANY menu
 * instantly, anywhere in America.
 */

const TENANT_ID = '44f7d10c-a683-4a26-94c4-def97758a502';

const RECIPES = [
  // === FRENCH CLASSICAL ===
  { name: 'Coq au Vin', ingredients: ['Chicken Thighs', 'Red Wine', 'Bacon', 'Pearl Onions', 'Mushrooms', 'Carrots', 'Garlic', 'Tomato Paste', 'Fresh Thyme', 'Bay Leaves', 'Butter', 'All-Purpose Flour'] },
  { name: 'Bouillabaisse', ingredients: ['Sea Bass', 'Shrimp', 'Mussels', 'Yellow Onion', 'Fennel', 'Garlic', 'Tomatoes', 'Saffron', 'Orange Zest', 'Olive Oil', 'White Wine', 'Fish Stock'] },
  { name: 'Duck Confit', ingredients: ['Duck Legs', 'Kosher Salt', 'Black Pepper', 'Fresh Thyme', 'Garlic', 'Bay Leaves', 'Duck Fat'] },
  { name: 'Creme Brulee', ingredients: ['Heavy Cream', 'Egg Yolks', 'Sugar', 'Vanilla Bean', 'Salt'] },

  // === ITALIAN ===
  { name: 'Osso Buco', ingredients: ['Veal Shanks', 'Yellow Onion', 'Carrots', 'Celery', 'Garlic', 'White Wine', 'Tomatoes', 'Beef Stock', 'Olive Oil', 'Fresh Parsley', 'Lemon Zest', 'All-Purpose Flour'] },
  { name: 'Pesto Genovese', ingredients: ['Fresh Basil', 'Pine Nuts', 'Parmesan Cheese', 'Garlic', 'Olive Oil', 'Salt'] },
  { name: 'Tiramisu', ingredients: ['Mascarpone Cheese', 'Eggs', 'Sugar', 'Espresso', 'Ladyfingers', 'Cocoa Powder', 'Vanilla Extract'] },
  { name: 'Carbonara', ingredients: ['Spaghetti', 'Guanciale', 'Eggs', 'Pecorino Romano', 'Black Pepper'] },

  // === ASIAN ===
  { name: 'Pad Thai', ingredients: ['Rice Noodles', 'Shrimp', 'Eggs', 'Bean Sprouts', 'Green Onions', 'Garlic', 'Fish Sauce', 'Tamarind Paste', 'Sugar', 'Lime', 'Peanuts', 'Cilantro'] },
  { name: 'Chicken Tikka Masala', ingredients: ['Chicken Thighs', 'Yogurt', 'Garlic', 'Ginger', 'Garam Masala', 'Cumin', 'Turmeric', 'Paprika', 'Tomatoes', 'Heavy Cream', 'Butter', 'Cilantro', 'Basmati Rice'] },
  { name: 'Miso Ramen', ingredients: ['Pork Belly', 'Miso Paste', 'Chicken Stock', 'Soy Sauce', 'Sesame Oil', 'Garlic', 'Ginger', 'Ramen Noodles', 'Soft Boiled Eggs', 'Green Onions', 'Corn', 'Nori'] },
  { name: 'Sushi Rice Bowl', ingredients: ['Short Grain Rice', 'Rice Vinegar', 'Sugar', 'Salt', 'Salmon Fillet', 'Avocado', 'Cucumber', 'Soy Sauce', 'Sesame Seeds', 'Nori'] },

  // === MEXICAN / LATIN ===
  { name: 'Carnitas', ingredients: ['Pork Shoulder', 'Orange Juice', 'Lime', 'Garlic', 'Cumin', 'Oregano', 'Bay Leaves', 'Salt', 'Black Pepper', 'Lard'] },
  { name: 'Mole Poblano', ingredients: ['Dried Ancho Chiles', 'Dried Pasilla Chiles', 'Tomatoes', 'Yellow Onion', 'Garlic', 'Almonds', 'Sesame Seeds', 'Cinnamon', 'Dark Chocolate', 'Chicken Stock', 'Tortillas'] },
  { name: 'Ceviche', ingredients: ['White Fish', 'Lime', 'Red Onion', 'Cilantro', 'Jalapeno', 'Tomatoes', 'Avocado', 'Salt', 'Olive Oil'] },

  // === AMERICAN / COMFORT ===
  { name: 'BBQ Pulled Pork', ingredients: ['Pork Shoulder', 'Brown Sugar', 'Paprika', 'Garlic Powder', 'Onion Powder', 'Cumin', 'Black Pepper', 'Apple Cider Vinegar', 'Ketchup', 'Worcestershire Sauce', 'Yellow Mustard'] },
  { name: 'New England Clam Chowder', ingredients: ['Clams', 'Bacon', 'Yellow Onion', 'Celery', 'Potatoes', 'Heavy Cream', 'Butter', 'All-Purpose Flour', 'Fresh Thyme', 'Bay Leaves', 'Salt', 'Black Pepper'] },
  { name: 'Southern Fried Chicken', ingredients: ['Chicken Pieces', 'Buttermilk', 'All-Purpose Flour', 'Cornstarch', 'Paprika', 'Garlic Powder', 'Onion Powder', 'Cayenne Pepper', 'Salt', 'Black Pepper', 'Vegetable Oil'] },
  { name: 'Lobster Mac and Cheese', ingredients: ['Lobster Tail', 'Elbow Macaroni', 'Sharp Cheddar', 'Gruyere Cheese', 'Heavy Cream', 'Butter', 'All-Purpose Flour', 'Dijon Mustard', 'Panko Breadcrumbs', 'Fresh Chives'] },

  // === MEDITERRANEAN / MIDDLE EASTERN ===
  { name: 'Lamb Tagine', ingredients: ['Lamb Shoulder', 'Yellow Onion', 'Garlic', 'Ginger', 'Cinnamon', 'Cumin', 'Coriander', 'Saffron', 'Dried Apricots', 'Almonds', 'Honey', 'Cilantro', 'Couscous'] },
  { name: 'Shakshuka', ingredients: ['Eggs', 'Tomatoes', 'Yellow Onion', 'Red Bell Pepper', 'Garlic', 'Cumin', 'Paprika', 'Cayenne Pepper', 'Olive Oil', 'Fresh Cilantro', 'Feta Cheese'] },
  { name: 'Hummus', ingredients: ['Chickpeas', 'Tahini', 'Lemon', 'Garlic', 'Olive Oil', 'Cumin', 'Salt'] },

  // === SEAFOOD FOCUSED ===
  { name: 'Lobster Thermidor', ingredients: ['Whole Lobster', 'Butter', 'Shallots', 'White Wine', 'Heavy Cream', 'Dijon Mustard', 'Egg Yolks', 'Gruyere Cheese', 'Fresh Tarragon', 'Cognac', 'Paprika'] },
  { name: 'Grilled Whole Branzino', ingredients: ['Whole Branzino', 'Olive Oil', 'Lemon', 'Fresh Oregano', 'Garlic', 'Cherry Tomatoes', 'Kalamata Olives', 'Capers', 'Salt', 'Black Pepper'] },
  { name: 'Cioppino', ingredients: ['Dungeness Crab', 'Shrimp', 'Mussels', 'Clams', 'White Fish', 'Tomatoes', 'Yellow Onion', 'Garlic', 'White Wine', 'Fish Stock', 'Fresh Basil', 'Red Pepper Flakes', 'Olive Oil'] },

  // === BAKING / PASTRY ===
  { name: 'Croissants', ingredients: ['All-Purpose Flour', 'Sugar', 'Salt', 'Active Dry Yeast', 'Whole Milk', 'Butter', 'Eggs'] },
  { name: 'Tarte Tatin', ingredients: ['Apples', 'Butter', 'Sugar', 'Puff Pastry', 'Vanilla Extract', 'Lemon', 'Salt', 'Cinnamon'] },
  { name: 'Lemon Tart', ingredients: ['Lemons', 'Eggs', 'Sugar', 'Butter', 'Heavy Cream', 'All-Purpose Flour', 'Salt', 'Vanilla Extract'] },

  // === PLANT-BASED / MODERN ===
  { name: 'Cauliflower Steak', ingredients: ['Cauliflower', 'Olive Oil', 'Tahini', 'Lemon', 'Garlic', 'Cumin', 'Smoked Paprika', 'Pine Nuts', 'Fresh Parsley', 'Pomegranate Seeds', 'Salt'] },
  { name: 'Wild Mushroom Risotto', ingredients: ['Arborio Rice', 'Porcini Mushrooms', 'Shiitake Mushrooms', 'Yellow Onion', 'Garlic', 'White Wine', 'Parmesan Cheese', 'Butter', 'Olive Oil', 'Fresh Thyme', 'Vegetable Stock'] },
];

async function main() {
  const { default: postgres } = await import('postgres');
  const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

  // Build ingredient lookup preferring ones with prices
  const allIngredients = await sql`
    SELECT i.id, LOWER(i.name) as name, i.system_ingredient_id,
      (SELECT COUNT(*) FROM ingredient_price_history iph WHERE iph.ingredient_id = i.id AND iph.tenant_id = ${TENANT_ID}) as price_count
    FROM ingredients i
    WHERE i.tenant_id = ${TENANT_ID}
  `;

  const ingredientMap = new Map();
  for (const ing of allIngredients) {
    const existing = ingredientMap.get(ing.name);
    if (!existing || ing.price_count > existing.price_count) {
      ingredientMap.set(ing.name, ing);
    }
  }

  // Collect all unique ingredient names
  const uniqueIngs = new Set();
  for (const r of RECIPES) for (const i of r.ingredients) uniqueIngs.add(i);

  // Resolve each unique ingredient
  const priceCache = new Map();
  let resolvedCount = 0;
  let failedCount = 0;

  for (const ingName of uniqueIngs) {
    let matched = ingredientMap.get(ingName.toLowerCase());
    if (!matched) {
      // Fuzzy: try substring match, prefer ones with prices
      let best = null;
      for (const [key, val] of ingredientMap) {
        if (key.includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(key)) {
          if (!best || val.price_count > best.price_count) best = val;
        }
      }
      matched = best;
    }

    if (!matched) {
      priceCache.set(ingName, { status: 'not_in_system' });
      failedCount++;
      continue;
    }

    // Tier 1-5: ingredient_price_history
    let resolved = null;
    const iph = await sql`
      SELECT price_per_unit_cents, unit, store_name, source
      FROM ingredient_price_history
      WHERE ingredient_id = ${matched.id} AND tenant_id = ${TENANT_ID}
        AND price_per_unit_cents > 0
      ORDER BY CASE source
        WHEN 'manual' THEN 1 WHEN 'openclaw_scrape' THEN 3
        WHEN 'openclaw_flyer' THEN 4 WHEN 'openclaw_instacart' THEN 5
        ELSE 6 END, purchase_date DESC
      LIMIT 1
    `;
    if (iph.length > 0) {
      const src = { openclaw_scrape: 'scrape', openclaw_flyer: 'flyer', openclaw_instacart: 'instacart', openclaw_government: 'gov' };
      resolved = { price: iph[0].price_per_unit_cents, unit: iph[0].unit || 'each', source: src[iph[0].source] || iph[0].source, store: iph[0].store_name };
    }

    // Tier 6: regional average
    if (!resolved) {
      const rpa = await sql`SELECT avg_price_per_unit_cents, most_common_unit, store_count FROM regional_price_averages WHERE ingredient_id = ${matched.id} LIMIT 1`;
      if (rpa.length > 0 && rpa[0].avg_price_per_unit_cents) {
        resolved = { price: parseInt(rpa[0].avg_price_per_unit_cents), unit: rpa[0].most_common_unit || 'each', source: 'regional', store: `${rpa[0].store_count} stores` };
      }
    }

    // Tier 6.5: market aggregate
    if (!resolved) {
      const mkt = await sql`
        SELECT sip.median_price_cents, sip.avg_price_cents, sip.price_unit, sip.store_count, sip.states
        FROM ingredient_aliases ia
        JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
        WHERE ia.ingredient_id = ${matched.id} AND ia.tenant_id = ${TENANT_ID}
        LIMIT 1
      `;
      if (mkt.length > 0 && (mkt[0].median_price_cents || mkt[0].avg_price_cents)) {
        resolved = { price: mkt[0].median_price_cents || mkt[0].avg_price_cents, unit: mkt[0].price_unit || 'each', source: 'market', store: `${mkt[0].store_count} stores` };
      }
    }

    if (resolved) {
      priceCache.set(ingName, { status: 'priced', ...resolved });
      resolvedCount++;
    } else {
      priceCache.set(ingName, { status: 'no_price' });
      failedCount++;
    }
  }

  // === OUTPUT ===
  const totalUnique = uniqueIngs.size;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`STRESS TEST v3: ${RECIPES.length} RECIPES, ${totalUnique} UNIQUE INGREDIENTS`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Resolved: ${resolvedCount}/${totalUnique} (${(resolvedCount/totalUnique*100).toFixed(1)}%)`);
  console.log(`Failed: ${failedCount}/${totalUnique}`);

  // Recipe results
  console.log(`\n${'='.repeat(70)}`);
  console.log('RECIPE RESULTS');
  console.log(`${'='.repeat(70)}`);

  let passed = 0;
  let partialFails = [];

  for (const recipe of RECIPES) {
    const total = recipe.ingredients.length;
    const priced = recipe.ingredients.filter(i => priceCache.get(i)?.status === 'priced').length;
    const pct = (priced / total * 100).toFixed(0);
    const status = priced === total ? 'PASS' : 'FAIL';
    console.log(`  ${status}  ${recipe.name.padEnd(35)} ${priced}/${total} (${pct}%)`);
    if (priced === total) passed++;
    else {
      const missing = recipe.ingredients.filter(i => priceCache.get(i)?.status !== 'priced');
      partialFails.push({ recipe: recipe.name, missing });
    }
  }

  console.log(`\nPASSED: ${passed}/${RECIPES.length}`);

  // Failures detail
  if (partialFails.length > 0) {
    console.log(`\n${'='.repeat(70)}`);
    console.log('FAILURE ANALYSIS');
    console.log(`${'='.repeat(70)}`);
    for (const f of partialFails) {
      console.log(`\n  ${f.recipe}:`);
      for (const ing of f.missing) {
        const result = priceCache.get(ing);
        const layer = result.status === 'not_in_system' ? 'CATALOG GAP (not in 20K system_ingredients)'
          : 'NORMALIZATION GAP (in system, no FTS match to products)';
        console.log(`    ${ing.padEnd(30)} ${layer}`);
      }
    }
  }

  // All failures consolidated
  const allFailed = [...priceCache.entries()].filter(([,v]) => v.status !== 'priced');
  if (allFailed.length > 0) {
    console.log(`\n${'='.repeat(70)}`);
    console.log('ALL UNRESOLVED INGREDIENTS');
    console.log(`${'='.repeat(70)}`);
    for (const [name, result] of allFailed.sort((a,b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${name.padEnd(30)} ${result.status === 'not_in_system' ? 'NOT IN CATALOG' : 'NO PRICE DATA'}`);
    }
  }

  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
