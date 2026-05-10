import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

const file = 'database/migrations/20260508000002_local_ai_connectors.sql';

console.log(`\nApplying: ${file}`);
const content = readFileSync(resolve(file), 'utf8');

try {
  await sql.unsafe(content);
  console.log('  OK');
} catch (err) {
  const code = err.code;
  if (['42P07', '42710', '42P06', '42701'].includes(code)) {
    console.warn(`  Skipped (already exists) (${code}): ${err.message}`);
  } else {
    console.error(`  ERROR (${code}): ${err.message}`);
    process.exit(1);
  }
}

// Verify
const table = await sql`SELECT to_regclass('public.local_ai_connectors')`;
console.log('\nVerification:');
console.log('  local_ai_connectors table:', table[0].to_regclass ? 'EXISTS' : 'MISSING');

const cols = await sql`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'local_ai_connectors'
  ORDER BY ordinal_position
`;
console.log('  columns:', cols.map(c => c.column_name).join(', '));

const policies = await sql`
  SELECT policyname 
  FROM pg_policies 
  WHERE tablename = 'local_ai_connectors'
`;
console.log('  RLS policies:', policies.map(p => p.policyname).join(', '));

await sql.end();
