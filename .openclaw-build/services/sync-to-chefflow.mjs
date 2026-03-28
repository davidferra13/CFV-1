/**
 * OpenClaw - ChefFlow Price Sync Trigger
 * Calls the ChefFlow cron endpoint to pull prices from this Pi into ChefFlow's DB.
 * Run nightly after all scrapers have finished (11 PM).
 *
 * Requires CHEFFLOW_URL and CRON_SECRET in config/.env
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', 'config', '.env');

// Load env
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [key, ...rest] = trimmed.split('=');
  env[key.trim()] = rest.join('=').trim();
}

const CHEFFLOW_URL = env.CHEFFLOW_URL || 'http://10.0.0.100:3100';
const CRON_SECRET = env.CRON_SECRET;

async function main() {
  console.log('=== OpenClaw -> ChefFlow Price Sync ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Target: ${CHEFFLOW_URL}/api/cron/price-sync`);

  if (!CRON_SECRET) {
    console.error('ERROR: CRON_SECRET not set in config/.env');
    process.exit(1);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const res = await fetch(`${CHEFFLOW_URL}/api/cron/price-sync`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      console.error(`HTTP ${res.status}: ${text}`);
      process.exit(1);
    }

    const result = await res.json();
    console.log('Sync result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log(`Matched: ${result.matched}, Updated: ${result.updated}, Skipped: ${result.skipped}, Not found: ${result.notFound}`);
    } else {
      console.error('Sync failed:', result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error('FATAL:', err.message);
    process.exit(1);
  }

  console.log('=== Done ===');
}

main();
