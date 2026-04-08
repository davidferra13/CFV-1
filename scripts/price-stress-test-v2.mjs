#!/usr/bin/env node
/**
 * Price Resolution Stress Test v2 - National Coverage
 *
 * Tests 10 canonical recipes across 20 US regions.
 * Since price resolution is currently national (not geo-filtered),
 * this tests whether every ingredient resolves regardless of location.
 *
 * The geographic dimension tests whether the SYSTEM has data from
 * stores in those regions, even if the resolution chain doesn't
 * currently filter by region.
 */

const TENANT_ID = '44f7d10c-a683-4a26-94c4-def97758a502';

const RECIPES = [
  { name: 'Roast Chicken (Thomas Keller)', ingredients: ['Whole Chicken', 'Kosher Salt', 'Black Pepper', 'Fresh Thyme', 'Butter', 'Lemon'] },
  { name: 'Sauce Beurre Blanc', ingredients: ['Shallots', 'White Wine', 'Heavy Cream', 'Butter', 'White Wine Vinegar', 'Salt'] },
  { name: 'Risotto Milanese', ingredients: ['Arborio Rice', 'Yellow Onion', 'Chicken Stock', 'Saffron', 'Parmesan Cheese', 'Butter', 'White Wine', 'Olive Oil'] },
  { name: 'Caesar Salad', ingredients: ['Romaine Lettuce', 'Parmesan Cheese', 'Garlic', 'Lemon', 'Eggs', 'Olive Oil', 'Anchovies', 'Dijon Mustard', 'Black Pepper'] },
  { name: 'Beef Bourguignon', ingredients: ['Beef Chuck', 'Bacon', 'Carrots', 'Yellow Onion', 'Garlic', 'Red Wine', 'Tomato Paste', 'Beef Stock', 'Fresh Thyme', 'Bay Leaves', 'Mushrooms', 'Pearl Onions'] },
  { name: 'Pan-Seared Salmon', ingredients: ['Salmon Fillet', 'Olive Oil', 'Salt', 'Black Pepper', 'Lemon', 'Butter', 'Fresh Dill'] },
  { name: 'Pasta Aglio e Olio', ingredients: ['Spaghetti', 'Garlic', 'Olive Oil', 'Red Pepper Flakes', 'Parsley', 'Parmesan Cheese', 'Salt'] },
  { name: 'French Onion Soup', ingredients: ['Yellow Onion', 'Butter', 'Beef Stock', 'White Wine', 'Fresh Thyme', 'Bay Leaves', 'Gruyere Cheese', 'Baguette'] },
  { name: 'Chocolate Mousse', ingredients: ['Dark Chocolate', 'Eggs', 'Heavy Cream', 'Sugar', 'Vanilla Extract', 'Salt'] },
  { name: 'Shrimp Scampi', ingredients: ['Shrimp', 'Garlic', 'Butter', 'White Wine', 'Lemon', 'Red Pepper Flakes', 'Parsley', 'Linguine', 'Olive Oil'] },
];

const REGIONS = [
  'Rural Western Kansas', 'Northern Maine', 'Miami, Florida', 'Anchorage, Alaska',
  'Boise, Idaho', 'Santa Fe, New Mexico', 'Birmingham, Alabama', 'Fargo, North Dakota',
  'Napa Valley, California', 'Detroit, Michigan', 'Missoula, Montana',
  'Charleston, South Carolina', 'Tulsa, Oklahoma', 'Portland, Oregon',
  'Las Vegas, Nevada', 'Jackson Hole, Wyoming', 'San Antonio, Texas',
  'Burlington, Vermont', 'Phoenix, Arizona', 'Milwaukee, Wisconsin',
];

async function main() {
  const { default: postgres } = await import('postgres');
  const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

  // Build ingredient lookup: prefer ingredients with prices (original 75 had price_history)
  const allIngredients = await sql`
    SELECT i.id, i.name, i.system_ingredient_id,
      (SELECT COUNT(*) FROM ingredient_price_history iph WHERE iph.ingredient_id = i.id AND iph.tenant_id = ${TENANT_ID}) as price_count,
      CASE WHEN EXISTS (
        SELECT 1 FROM ingredient_aliases ia
        JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
        WHERE ia.ingredient_id = i.id AND ia.tenant_id = ${TENANT_ID}
      ) THEN 1 ELSE 0 END as has_market_price
    FROM ingredients i
    WHERE i.tenant_id = ${TENANT_ID}
    ORDER BY i.name
  `;

  // Build name->ingredient map, preferring ones with prices
  const ingredientMap = new Map();
  for (const ing of allIngredients) {
    const key = ing.name.toLowerCase();
    const existing = ingredientMap.get(key);
    if (!existing || (ing.price_count > 0 && existing.price_count === 0) ||
        (ing.has_market_price > 0 && existing.has_market_price === 0)) {
      ingredientMap.set(key, ing);
    }
  }

  console.log(`Chef has ${allIngredients.length} ingredients (${ingredientMap.size} unique names)`);

  // Resolve each unique ingredient once (prices are national, not regional)
  const uniqueIngNames = new Set();
  for (const recipe of RECIPES) {
    for (const ing of recipe.ingredients) uniqueIngNames.add(ing);
  }

  const priceCache = new Map();

  for (const ingName of uniqueIngNames) {
    // Match ingredient
    let matched = ingredientMap.get(ingName.toLowerCase());
    if (!matched) {
      for (const [key, val] of ingredientMap) {
        if (key.includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(key)) {
          if (!matched || val.price_count > matched.price_count || val.has_market_price > matched.has_market_price) {
            matched = val;
          }
        }
      }
    }

    if (!matched) {
      priceCache.set(ingName, { status: 'not_in_system' });
      continue;
    }

    // Try tier 1-5: ingredient_price_history
    let resolved = null;
    const iph = await sql`
      SELECT price_per_unit_cents, unit, store_name, source
      FROM ingredient_price_history
      WHERE ingredient_id = ${matched.id} AND tenant_id = ${TENANT_ID}
      ORDER BY CASE source
        WHEN 'manual' THEN 1 WHEN 'openclaw_scrape' THEN 3
        WHEN 'openclaw_flyer' THEN 4 WHEN 'openclaw_instacart' THEN 5
        WHEN 'openclaw_government' THEN 7 ELSE 6 END,
        purchase_date DESC
      LIMIT 1
    `;
    if (iph.length > 0 && iph[0].price_per_unit_cents) {
      const src = { openclaw_scrape: 'scrape', openclaw_flyer: 'flyer', openclaw_instacart: 'instacart', openclaw_government: 'gov' };
      resolved = { price: iph[0].price_per_unit_cents, unit: iph[0].unit || 'each', source: src[iph[0].source] || iph[0].source, store: iph[0].store_name };
    }

    // Try tier 6: regional_price_averages
    if (!resolved) {
      const rpa = await sql`SELECT avg_price_per_unit_cents, most_common_unit, store_count FROM regional_price_averages WHERE ingredient_id = ${matched.id} LIMIT 1`;
      if (rpa.length > 0 && rpa[0].avg_price_per_unit_cents) {
        resolved = { price: parseInt(rpa[0].avg_price_per_unit_cents), unit: rpa[0].most_common_unit || 'each', source: 'regional', store: `${rpa[0].store_count} stores` };
      }
    }

    // Try tier 6.5: market_aggregate (system_ingredient_prices via alias)
    if (!resolved) {
      const mkt = await sql`
        SELECT sip.median_price_cents, sip.avg_price_cents, sip.price_unit, sip.store_count, sip.states
        FROM ingredient_aliases ia
        JOIN openclaw.system_ingredient_prices sip ON sip.system_ingredient_id = ia.system_ingredient_id
        WHERE ia.ingredient_id = ${matched.id} AND ia.tenant_id = ${TENANT_ID}
        LIMIT 1
      `;
      if (mkt.length > 0 && (mkt[0].median_price_cents || mkt[0].avg_price_cents)) {
        resolved = {
          price: mkt[0].median_price_cents || mkt[0].avg_price_cents,
          unit: mkt[0].price_unit || 'each',
          source: 'market',
          store: `${mkt[0].store_count} stores (${(mkt[0].states || []).join(',')})`,
        };
      }
    }

    if (resolved) {
      priceCache.set(ingName, { status: 'priced', ...resolved });
    } else {
      priceCache.set(ingName, { status: 'no_price' });
    }
  }

  // Report: ingredient resolution (same for all regions)
  console.log('\n' + '='.repeat(70));
  console.log('INGREDIENT PRICE RESOLUTION (national)');
  console.log('='.repeat(70));

  let priced = 0, noPriced = 0, notInSystem = 0;
  for (const [name, result] of priceCache) {
    if (result.status === 'priced') {
      priced++;
      console.log(`  OK  ${name.padEnd(25)} $${(result.price / 100).toFixed(2)}/${result.unit}  [${result.source}] ${result.store}`);
    } else if (result.status === 'no_price') {
      noPriced++;
      console.log(`  --  ${name.padEnd(25)} NO PRICE`);
    } else {
      notInSystem++;
      console.log(`  !!  ${name.padEnd(25)} NOT IN SYSTEM`);
    }
  }

  console.log(`\nResolved: ${priced}/${priced + noPriced + notInSystem} (${(priced / (priced + noPriced + notInSystem) * 100).toFixed(1)}%)`);
  console.log(`No price: ${noPriced} | Not in system: ${notInSystem}`);

  // Report: recipe completeness
  console.log('\n' + '='.repeat(70));
  console.log('RECIPE COMPLETENESS');
  console.log('='.repeat(70));

  let fullyPriced = 0;
  for (const recipe of RECIPES) {
    const total = recipe.ingredients.length;
    const resolved = recipe.ingredients.filter(i => priceCache.get(i)?.status === 'priced').length;
    const pct = (resolved / total * 100).toFixed(0);
    const status = resolved === total ? 'PASS' : 'FAIL';
    console.log(`  ${status}  ${recipe.name.padEnd(35)} ${resolved}/${total} (${pct}%)`);
    if (resolved === total) fullyPriced++;
  }
  console.log(`\nFully priced: ${fullyPriced}/${RECIPES.length}`);

  // Report: geographic reality
  console.log('\n' + '='.repeat(70));
  console.log('GEOGRAPHIC ANALYSIS');
  console.log('='.repeat(70));
  console.log('\nCRITICAL FINDING: Price resolution is currently NATIONAL, not REGIONAL.');
  console.log('A chef in Anchorage, Alaska gets the same price as a chef in Miami, Florida.');
  console.log('The 10-tier fallback chain has no geographic parameter.\n');

  // Check what geographic data actually exists
  const storesByState = await sql`
    SELECT store_name, COUNT(*) as c FROM ingredient_price_history
    WHERE tenant_id = ${TENANT_ID}
    GROUP BY store_name ORDER BY c DESC LIMIT 30
  `;
  console.log('Price data comes from these stores:');
  storesByState.forEach(r => console.log(`  ${r.store_name}: ${r.c} prices`));

  // Check system_ingredient_prices geographic spread
  const sipStates = await sql`SELECT DISTINCT unnest(states) as state FROM openclaw.system_ingredient_prices ORDER BY state`;
  console.log(`\nSystem-level prices cover states: ${sipStates.map(r => r.state).join(', ')}`);
  console.log(`(Market aggregate tier covers ${sipStates.length} states)`);

  // The 20 regions mapped to whether we have store data there
  const regionStates = {
    'Rural Western Kansas': 'KS', 'Northern Maine': 'ME', 'Miami, Florida': 'FL',
    'Anchorage, Alaska': 'AK', 'Boise, Idaho': 'ID', 'Santa Fe, New Mexico': 'NM',
    'Birmingham, Alabama': 'AL', 'Fargo, North Dakota': 'ND',
    'Napa Valley, California': 'CA', 'Detroit, Michigan': 'MI',
    'Missoula, Montana': 'MT', 'Charleston, South Carolina': 'SC',
    'Tulsa, Oklahoma': 'OK', 'Portland, Oregon': 'OR',
    'Las Vegas, Nevada': 'NV', 'Jackson Hole, Wyoming': 'WY',
    'San Antonio, Texas': 'TX', 'Burlington, Vermont': 'VT',
    'Phoenix, Arizona': 'AZ', 'Milwaukee, Wisconsin': 'WI',
  };

  const stateSet = new Set(sipStates.map(r => r.state));
  console.log('\nRegion coverage (system_ingredient_prices):');
  for (const [region, state] of Object.entries(regionStates)) {
    const has = stateSet.has(state);
    console.log(`  ${has ? 'YES' : ' NO'}  ${region.padEnd(35)} (${state})`);
  }

  await sql.end();
}

main().catch(err => { console.error(err); process.exit(1); });
