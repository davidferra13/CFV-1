/**
 * Pull USDA/BLS Average Price data into openclaw.usda_price_baselines.
 *
 * Source: Bureau of Labor Statistics Average Price (AP) series
 * API: https://api.bls.gov/publicAPI/v2/timeseries/data/
 * Docs: https://www.bls.gov/cpi/average-prices.htm
 *
 * Series ID format: APU{area}{item}
 *   area: 0000 = US city average, 0100 = Northeast, 0200 = Midwest,
 *         0300 = South, 0400 = West
 *   item: 6-digit food item code
 *
 * BLS API limit: 50 series per request, 500 requests/day (no key),
 *                25 requests/second. We batch smartly.
 *
 * Usage: node scripts/pull-usda-baselines.mjs
 */

import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');

const BLS_API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const CURRENT_YEAR = new Date().getFullYear();

// ── BLS FOOD ITEM CODES ──
// These are the AP (Average Price) series item codes for food.
// Source: https://www.bls.gov/cpi/tables/supplemental-files/home.htm

const FOOD_ITEMS = [
  // ── Proteins ──
  { code: '706111', name: 'Chicken breast, boneless', unit: 'lb', category: 'poultry' },
  { code: '706212', name: 'Chicken legs, bone-in', unit: 'lb', category: 'poultry' },
  { code: '706311', name: 'Chicken, whole', unit: 'lb', category: 'poultry' },
  { code: '703111', name: 'Ground beef, 100% beef', unit: 'lb', category: 'beef' },
  { code: '703112', name: 'Ground beef, lean and extra lean', unit: 'lb', category: 'beef' },
  { code: '703211', name: 'Chuck roast, USDA Choice, boneless', unit: 'lb', category: 'beef' },
  { code: '703311', name: 'Round roast, USDA Choice, boneless', unit: 'lb', category: 'beef' },
  { code: '703411', name: 'Steak, round, USDA Choice, boneless', unit: 'lb', category: 'beef' },
  { code: '703421', name: 'Steak, sirloin, USDA Choice, boneless', unit: 'lb', category: 'beef' },
  { code: '703511', name: 'Beef for stew, boneless', unit: 'lb', category: 'beef' },
  { code: '704111', name: 'Bacon, sliced', unit: 'lb', category: 'pork' },
  { code: '704211', name: 'Chops, center cut, bone-in', unit: 'lb', category: 'pork' },
  { code: '704311', name: 'Ham, boneless, excluding canned', unit: 'lb', category: 'pork' },
  { code: '704411', name: 'Pork, sausage, fresh, loose', unit: 'lb', category: 'pork' },
  { code: '707111', name: 'Tuna, canned, light chunk', unit: 'oz', category: 'seafood' },
  { code: '707211', name: 'Salmon, canned, pink', unit: 'oz', category: 'seafood' },
  { code: '707311', name: 'Shrimp, frozen', unit: 'lb', category: 'seafood' },

  // ── Dairy & Eggs ──
  { code: '702111', name: 'Eggs, grade A, large', unit: 'dozen', category: 'dairy' },
  { code: '709111', name: 'Milk, fresh, whole, fortified', unit: 'gallon', category: 'dairy' },
  { code: '709211', name: 'Milk, fresh, low fat (2%)', unit: 'gallon', category: 'dairy' },
  { code: '710111', name: 'Butter, salted, grade AA', unit: 'lb', category: 'dairy' },
  { code: '710211', name: 'Cheese, natural cheddar, mild', unit: 'lb', category: 'dairy' },
  { code: '710212', name: 'Cheese, Kraft singles, American', unit: 'lb', category: 'dairy' },
  { code: '710311', name: 'Ice cream, prepackaged, bulk, regular', unit: 'half gallon', category: 'dairy' },

  // ── Produce ──
  { code: '711111', name: 'Apples, Red Delicious', unit: 'lb', category: 'produce' },
  { code: '711211', name: 'Bananas', unit: 'lb', category: 'produce' },
  { code: '711311', name: 'Oranges, navel', unit: 'lb', category: 'produce' },
  { code: '711411', name: 'Grapefruit', unit: 'lb', category: 'produce' },
  { code: '711412', name: 'Lemons', unit: 'lb', category: 'produce' },
  { code: '711413', name: 'Pears, Anjou', unit: 'lb', category: 'produce' },
  { code: '711414', name: 'Peaches', unit: 'lb', category: 'produce' },
  { code: '711415', name: 'Strawberries, dry pint', unit: 'pint', category: 'produce' },
  { code: '711416', name: 'Grapes, Thompson seedless', unit: 'lb', category: 'produce' },
  { code: '712111', name: 'Potatoes, white', unit: 'lb', category: 'produce' },
  { code: '712211', name: 'Lettuce, iceberg', unit: 'head', category: 'produce' },
  { code: '712311', name: 'Tomatoes, field grown', unit: 'lb', category: 'produce' },
  { code: '712411', name: 'Broccoli', unit: 'lb', category: 'produce' },
  { code: '712412', name: 'Celery', unit: 'lb', category: 'produce' },
  { code: '712413', name: 'Corn on the cob, sweet', unit: 'lb', category: 'produce' },
  { code: '712414', name: 'Onions, yellow', unit: 'lb', category: 'produce' },
  { code: '712415', name: 'Green peppers, sweet', unit: 'lb', category: 'produce' },
  { code: '712416', name: 'Carrots, short trimmed and peeled', unit: 'lb', category: 'produce' },
  { code: '712417', name: 'Mushrooms', unit: 'lb', category: 'produce' },
  { code: '712418', name: 'Cucumbers', unit: 'lb', category: 'produce' },
  { code: '712419', name: 'Cabbage', unit: 'lb', category: 'produce' },

  // ── Bread & Cereals ──
  { code: '701111', name: 'White bread', unit: 'lb', category: 'bakery' },
  { code: '701211', name: 'Whole wheat bread', unit: 'lb', category: 'bakery' },
  { code: '701312', name: 'Rice, white, long grain, uncooked', unit: 'lb', category: 'grains' },
  { code: '701321', name: 'Spaghetti and macaroni', unit: 'lb', category: 'grains' },
  { code: '701322', name: 'Flour, white, all purpose', unit: 'lb', category: 'baking' },

  // ── Fats & Oils ──
  { code: '708111', name: 'Margarine, stick', unit: 'lb', category: 'fats' },
  { code: '708112', name: 'Shortening and cooking oil', unit: 'lb', category: 'fats' },
  { code: '708311', name: 'Peanut butter, creamy', unit: 'lb', category: 'pantry' },

  // ── Beverages ──
  { code: '713111', name: 'Coffee, 100%, ground roast', unit: 'lb', category: 'beverages' },
  { code: '713311', name: 'Cola, nondiet', unit: '2 liters', category: 'beverages' },
  { code: '714111', name: 'Orange juice, frozen concentrate', unit: '12 oz', category: 'beverages' },

  // ── Other ──
  { code: '715111', name: 'Sugar, white, granulated', unit: 'lb', category: 'baking' },
  { code: '715211', name: 'Chocolate chip cookies', unit: 'lb', category: 'bakery' },
  { code: '716111', name: 'Potato chips', unit: 'oz', category: 'snacks' },
];

// BLS region area codes
const REGIONS = [
  { area: '0000', name: 'us_average' },
  { area: '0100', name: 'northeast' },
  { area: '0200', name: 'midwest' },
  { area: '0300', name: 'south' },
  { area: '0400', name: 'west' },
];

// Build series IDs
function buildSeriesIds() {
  const series = [];
  for (const item of FOOD_ITEMS) {
    for (const region of REGIONS) {
      series.push({
        seriesId: `APU${region.area}${item.code}`,
        itemName: item.name,
        unit: item.unit,
        category: item.category,
        region: region.name,
      });
    }
  }
  return series;
}

// Fetch from BLS API (batch of up to 50 series)
async function fetchBatch(seriesIds) {
  const body = JSON.stringify({
    seriesid: seriesIds,
    startyear: String(CURRENT_YEAR - 1),
    endyear: String(CURRENT_YEAR),
  });

  const res = await fetch(BLS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) throw new Error(`BLS API error: ${res.status}`);
  const data = await res.json();

  if (data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS API failed: ${JSON.stringify(data.message)}`);
  }

  return data.Results.series;
}

// Get the most recent valid data point from a series
function getLatestPrice(seriesData) {
  if (!seriesData || !seriesData.data) return null;

  for (const point of seriesData.data) {
    if (point.value && point.value !== '-' && parseFloat(point.value) > 0) {
      return {
        value: parseFloat(point.value),
        year: parseInt(point.year),
        month: parseInt(point.period.replace('M', '')),
        periodName: point.periodName,
      };
    }
  }
  return null;
}

async function main() {
  console.log('=== USDA/BLS Average Price Baseline Pull ===');
  console.log(`Time: ${new Date().toISOString()}`);

  const allSeries = buildSeriesIds();
  console.log(`Total series: ${allSeries.length} (${FOOD_ITEMS.length} items x ${REGIONS.length} regions)`);

  // Create lookup map
  const seriesMap = new Map();
  for (const s of allSeries) {
    seriesMap.set(s.seriesId, s);
  }

  // Batch into groups of 50 (BLS limit)
  const seriesIds = allSeries.map(s => s.seriesId);
  const BATCH_SIZE = 50;
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < seriesIds.length; i += BATCH_SIZE) {
    const batch = seriesIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(seriesIds.length / BATCH_SIZE);

    process.stdout.write(`[${batchNum}/${totalBatches}] Fetching ${batch.length} series...`);

    try {
      const results = await fetchBatch(batch);

      for (const series of results) {
        const meta = seriesMap.get(series.seriesID);
        if (!meta) continue;

        const latest = getLatestPrice(series);
        if (!latest) {
          totalSkipped++;
          continue;
        }

        // BLS prices are in dollars, we store cents
        const priceCents = Math.round(latest.value * 100);
        const observationDate = `${latest.year}-${String(latest.month).padStart(2, '0')}-01`;

        try {
          await sql`
            INSERT INTO openclaw.usda_price_baselines
              (item_name, bls_series_base, price_cents, unit, region, observation_date, category)
            VALUES
              (${meta.itemName}, ${series.seriesID}, ${priceCents}, ${meta.unit}, ${meta.region}, ${observationDate}, ${meta.category})
            ON CONFLICT (item_name, region) DO UPDATE SET
              price_cents = EXCLUDED.price_cents,
              observation_date = EXCLUDED.observation_date,
              bls_series_base = EXCLUDED.bls_series_base
          `;
          totalInserted++;
        } catch (err) {
          totalErrors++;
          if (totalErrors <= 5) console.error(`\n  DB error: ${err.message}`);
        }
      }

      console.log(` done (${totalInserted} inserted so far)`);
    } catch (err) {
      console.error(` ERROR: ${err.message}`);
      totalErrors++;
    }

    // Rate limit: BLS allows 25 req/sec, we go slower
    if (i + BATCH_SIZE < seriesIds.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Verify
  const count = await sql`SELECT count(*)::int as cnt FROM openclaw.usda_price_baselines`;
  const regions = await sql`SELECT region, count(*)::int as cnt FROM openclaw.usda_price_baselines GROUP BY region ORDER BY region`;

  console.log('\n=== Complete ===');
  console.log(`Inserted/updated: ${totalInserted}`);
  console.log(`Skipped (no data): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  console.log(`Total baselines in DB: ${count[0].cnt}`);
  console.log('\nBy region:');
  for (const r of regions) {
    console.log(`  ${r.region}: ${r.cnt} items`);
  }

  await sql.end();
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
