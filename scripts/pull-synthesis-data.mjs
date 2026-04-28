#!/usr/bin/env node
/**
 * Pull Synthesis Data from Pi
 * Fetches synthesized intelligence from Pi and upserts into ChefFlow's
 * openclaw schema tables.
 *
 * Usage:
 *   node scripts/pull-synthesis-data.mjs [table]
 *   node scripts/pull-synthesis-data.mjs all
 *
 * Schedule: Nightly at 11:30pm (after Pi's existing sync at 11pm)
 */

import { execSync } from 'child_process';
import postgres from 'postgres';

const PI_HOST = '10.0.0.177';
const PI_USER = 'davidferra';
const PI_SCRIPT = '~/openclaw-prices/synthesizers/sync-synthesis-to-chefflow.mjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/chefflow';

async function fetchFromPi(table = 'all') {
  console.log(`\n--- Fetching synthesis data from Pi (${table}) ---`);

  try {
    const cmd = `ssh ${PI_USER}@${PI_HOST} "cd ~/openclaw-prices && node synthesizers/sync-synthesis-to-chefflow.mjs ${table}"`;
    const output = execSync(cmd, {
      timeout: 120000, // 2 min
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });

    return JSON.parse(output);
  } catch (err) {
    console.error(`  Failed to fetch from Pi: ${err.message}`);
    return null;
  }
}

async function upsertAnomalyAlerts(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} anomaly alerts...`);

  // Clear expired
  await sql`DELETE FROM openclaw.anomaly_alerts WHERE expires_at < NOW()`;

  let count = 0;
  for (const row of data) {
    await sql`
      INSERT INTO openclaw.anomaly_alerts
        (ingredient_name, category, severity, direction, magnitude_pct, affected_stores, message, expires_at)
      VALUES
        (${row.ingredient_name}, ${row.category}, ${row.severity}, ${row.direction},
         ${row.magnitude_pct}, ${row.affected_stores || '[]'}, ${row.message},
         ${row.expires_at || null})
      ON CONFLICT DO NOTHING
    `;
    count++;
  }
  return count;
}

async function upsertSeasonalScores(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} seasonal scores...`);

  let count = 0;
  for (const row of data) {
    await sql`
      INSERT INTO openclaw.seasonal_scores
        (ingredient_name, month, availability_score, price_percentile, value_score, status, region)
      VALUES
        (${row.ingredient_name}, ${row.month}, ${row.availability_score},
         ${row.price_percentile}, ${row.value_score}, ${row.status}, ${row.region || 'northeast'})
      ON CONFLICT (ingredient_name, month, region) DO UPDATE SET
        availability_score = EXCLUDED.availability_score,
        price_percentile = EXCLUDED.price_percentile,
        value_score = EXCLUDED.value_score,
        status = EXCLUDED.status,
        updated_at = NOW()
    `;
    count++;
  }
  return count;
}

async function upsertStoreRankings(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} store rankings...`);

  // Full refresh
  await sql`TRUNCATE openclaw.store_rankings`;

  // Batch insert
  const batchSize = 500;
  let count = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    for (const row of batch) {
      await sql`
        INSERT INTO openclaw.store_rankings
          (ingredient_name, store_name, chain_slug, avg_price_cents, vs_market_pct, rank, sample_size, category)
        VALUES
          (${row.ingredient_name}, ${row.store_name}, ${row.chain_slug || null},
           ${row.avg_price_cents}, ${row.vs_market_pct}, ${row.rank},
           ${row.sample_size || 0}, ${row.category || null})
      `;
      count++;
    }
  }
  return count;
}

async function upsertPriceVelocity(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} price velocity records...`);

  for (const row of data) {
    await sql`
      INSERT INTO openclaw.price_velocity
        (ingredient_name, stability_score, status, trend_direction, volatility_30d,
         change_count_7d, change_count_30d, trend_acceleration)
      VALUES
        (${row.ingredient_name}, ${row.stability_score}, ${row.status},
         ${row.trend_direction}, ${row.volatility_30d},
         ${row.change_count_7d || 0}, ${row.change_count_30d || 0},
         ${row.trend_acceleration || 0})
      ON CONFLICT (ingredient_name) DO UPDATE SET
        stability_score = EXCLUDED.stability_score,
        status = EXCLUDED.status,
        trend_direction = EXCLUDED.trend_direction,
        volatility_30d = EXCLUDED.volatility_30d,
        change_count_7d = EXCLUDED.change_count_7d,
        change_count_30d = EXCLUDED.change_count_30d,
        trend_acceleration = EXCLUDED.trend_acceleration,
        updated_at = NOW()
    `;
  }
  return data.length;
}

async function upsertRecallAlerts(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} recall alerts...`);

  for (const row of data) {
    await sql`
      INSERT INTO openclaw.recall_alerts
        (ingredient_name, brand, severity, recall_class, reason, affected_products, expires_at)
      VALUES
        (${row.ingredient_name}, ${row.brand || null}, ${row.severity},
         ${row.recall_class || null}, ${row.reason},
         ${row.affected_products || '{}'}, ${row.expires_at || null})
    `;
  }
  return data.length;
}

async function upsertCategoryBenchmarks(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} category benchmarks...`);

  for (const row of data) {
    await sql`
      INSERT INTO openclaw.category_benchmarks
        (category, median_price_cents, p25_price_cents, p75_price_cents,
         trend_direction, trend_pct, vs_30d_pct, sample_size, dinner_index_cents)
      VALUES
        (${row.category}, ${row.median_price_cents}, ${row.p25_price_cents},
         ${row.p75_price_cents}, ${row.trend_direction}, ${row.trend_pct},
         ${row.vs_30d_pct}, ${row.sample_size || 0}, ${row.dinner_index_cents || null})
      ON CONFLICT (category) DO UPDATE SET
        median_price_cents = EXCLUDED.median_price_cents,
        p25_price_cents = EXCLUDED.p25_price_cents,
        p75_price_cents = EXCLUDED.p75_price_cents,
        trend_direction = EXCLUDED.trend_direction,
        trend_pct = EXCLUDED.trend_pct,
        vs_30d_pct = EXCLUDED.vs_30d_pct,
        sample_size = EXCLUDED.sample_size,
        dinner_index_cents = EXCLUDED.dinner_index_cents,
        updated_at = NOW()
    `;
  }
  return data.length;
}

async function upsertSubstitutions(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} substitutions...`);

  // Full refresh
  await sql`TRUNCATE openclaw.substitutions`;

  for (const row of data) {
    await sql`
      INSERT INTO openclaw.substitutions
        (ingredient_name, substitute_name, category, price_delta_pct,
         seasonal_match, confidence, reason)
      VALUES
        (${row.ingredient_name}, ${row.substitute_name}, ${row.category},
         ${row.price_delta_pct}, ${row.seasonal_match === 1}, ${row.confidence},
         ${row.reason || null})
    `;
  }
  return data.length;
}

async function upsertLocalMarkets(sql, data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  console.log(`  Upserting ${data.length} local markets...`);

  // Full refresh
  await sql`TRUNCATE openclaw.local_markets`;

  for (const row of data) {
    await sql`
      INSERT INTO openclaw.local_markets
        (market_name, lat, lng, open_season, open_days, product_count, is_open_this_week)
      VALUES
        (${row.market_name}, ${row.lat || null}, ${row.lng || null},
         ${row.open_season || null}, ${row.open_days || null},
         ${row.product_count || 0}, ${row.is_open_this_week === 1})
    `;
  }
  return data.length;
}

const HANDLERS = {
  anomaly_alerts: upsertAnomalyAlerts,
  seasonal_scores: upsertSeasonalScores,
  store_rankings: upsertStoreRankings,
  price_velocity: upsertPriceVelocity,
  recall_alerts: upsertRecallAlerts,
  category_benchmarks: upsertCategoryBenchmarks,
  substitutions: upsertSubstitutions,
  local_markets: upsertLocalMarkets,
};

async function main() {
  const table = process.argv[2] || 'all';

  console.log('\n=== Pull Synthesis Data from Pi ===');
  console.log(`  Table: ${table}`);
  console.log(`  DB: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);

  const piData = await fetchFromPi(table);
  if (!piData) {
    console.error('  No data received from Pi. Exiting.');
    process.exit(1);
  }

  if (piData._meta) {
    console.log(`  Pi export time: ${piData._meta.exported_at}`);
    console.log(`  Pi counts:`, piData._meta.counts);
  }

  const sql = postgres(DATABASE_URL);

  try {
    let totalUpserted = 0;

    for (const [name, handler] of Object.entries(HANDLERS)) {
      if (table !== 'all' && table !== name) continue;
      if (!piData[name] || piData[name].error) {
        console.log(`  Skipping ${name}: ${piData[name]?.error || 'no data'}`);
        continue;
      }

      const count = await handler(sql, piData[name]);
      totalUpserted += count;
      console.log(`  ${name}: ${count} rows`);
    }

    console.log(`\n  Total upserted: ${totalUpserted}`);
  } finally {
    await sql.end();
  }

  console.log('=== Synthesis Pull Complete ===\n');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
