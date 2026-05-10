import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

const files = [
  'database/migrations/20260425000015_multi_location_operations.sql',
  'database/migrations/20260508000001_fix_missing_columns_and_tables.sql',
];

for (const file of files) {
  console.log(`\nApplying: ${file}`);
  const content = readFileSync(resolve(file), 'utf8');
  // Split on statement boundaries and run each
  try {
    await sql.unsafe(content);
    console.log(`  OK`);
  } catch (err) {
    const code = err.code;
    // Ignorable: already exists
    if (['42P07', '42710', '42P06', '42701'].includes(code)) {
      console.warn(`  Skipped (${code}): ${err.message}`);
    } else {
      console.error(`  ERROR (${code}): ${err.message}`);
    }
  }
}

// Verify the fix
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='events' AND column_name IN ('prep_sheet_generated_at','packing_list_generated_at') ORDER BY column_name`;
console.log('\nVerification:');
console.log('  events.prep_sheet_generated_at:', cols.some(c => c.column_name === 'prep_sheet_generated_at') ? 'EXISTS' : 'MISSING');
console.log('  events.packing_list_generated_at:', cols.some(c => c.column_name === 'packing_list_generated_at') ? 'EXISTS' : 'MISSING');

const tips = await sql`SELECT to_regclass('public.chef_tips')`;
console.log('  chef_tips table:', tips[0].to_regclass ? 'EXISTS' : 'MISSING');

const alerts = await sql`SELECT to_regclass('public.location_alerts')`;
console.log('  location_alerts table:', alerts[0].to_regclass ? 'EXISTS' : 'MISSING');

await sql.end();
