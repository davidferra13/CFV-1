/**
 * Generate a ChefFlow API key for the MCP server.
 *
 * Usage:
 *   node scripts/generate-mcp-api-key.mjs
 *
 * Inserts a key into chef_api_keys for the developer's tenant,
 * prints the raw key (store it in .env.local), and the key hash.
 */

import { createHash, randomBytes } from 'crypto';
import postgres from 'postgres';

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function generateApiKey() {
  const hex = randomBytes(32).toString('hex');
  return `cf_live_${hex}`;
}

function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

async function main() {
  const sql = postgres(DB_URL);

  // Find the developer's chef record (davidferra13@gmail.com)
  const chefs = await sql`
    SELECT id, email FROM chefs WHERE email = 'davidferra13@gmail.com' LIMIT 1
  `;

  if (chefs.length === 0) {
    console.error('No chef found for davidferra13@gmail.com');
    await sql.end();
    process.exit(1);
  }

  const chefId = chefs[0].id;
  console.log(`Chef: ${chefs[0].email} (${chefId})`);

  // Check for existing MCP key
  const existing = await sql`
    SELECT id, key_prefix FROM chef_api_keys WHERE tenant_id = ${chefId} AND name = 'Claude Code MCP' AND is_active = true LIMIT 1
  `;

  if (existing.length > 0) {
    console.log(`\nActive MCP key already exists: ${existing[0].key_prefix}...`);
    console.log('To regenerate, revoke the existing key first via the Settings UI.');
    await sql.end();
    return;
  }

  // Generate and insert
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16);

  // Full scope access for the MCP server
  const scopes = [
    'events:read', 'events:write',
    'clients:read', 'clients:write',
    'menus:read', 'menus:write',
    'recipes:read', 'recipes:write',
    'quotes:read', 'quotes:write',
    'finance:read', 'finance:write',
    'inventory:read', 'inventory:write',
    'staff:read', 'staff:write',
    'inquiries:read', 'inquiries:write',
    'vendors:read', 'vendors:write',
    'marketing:read',
    'search:read',
    'settings:read',
    'remy:read',
  ];

  await sql`
    INSERT INTO chef_api_keys (tenant_id, name, key_hash, key_prefix, scopes, is_active)
    VALUES (${chefId}, 'Claude Code MCP', ${keyHash}, ${keyPrefix}, ${scopes}, true)
  `;

  console.log('\n--- API Key Generated ---');
  console.log(`Key: ${rawKey}`);
  console.log(`Prefix: ${keyPrefix}...`);
  console.log(`Scopes: ${scopes.length} granted`);
  console.log('\nAdd to .env.local:');
  console.log(`CHEFFLOW_MCP_API_KEY=${rawKey}`);
  console.log('\nThis key is shown ONCE. Store it now.');

  await sql.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
