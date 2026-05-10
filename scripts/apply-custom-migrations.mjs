// Run all pending database/migrations/*.sql files
// Tracks applied migrations in a simple table
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = postgres(DB_URL);
const MIGRATIONS_DIR = resolve('database/migrations');

// Create tracking table if needed
await sql`
  CREATE TABLE IF NOT EXISTS public.custom_migrations (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now()
  )
`;

// Get already-applied migrations
const applied = await sql`SELECT filename FROM public.custom_migrations`;
const appliedSet = new Set(applied.map(r => r.filename));

// Get all .sql files sorted
const files = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

let count = 0;
for (const file of files) {
  if (appliedSet.has(file)) continue;
  const filePath = join(MIGRATIONS_DIR, file);
  const content = readFileSync(filePath, 'utf8');
  console.log(`Applying: ${file}`);
  try {
    await sql.unsafe(content);
    await sql`INSERT INTO public.custom_migrations (filename) VALUES (${file})`;
    count++;
  } catch (err) {
    // Some errors are ignorable (already exists, etc.)
    const code = err.code;
    if (['42P07', '42710', '42P06', '42701', '42P01', '42703'].includes(code)) {
      console.warn(`  Warning (${code}): ${err.message} - recording as applied`);
      await sql`INSERT INTO public.custom_migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
    } else {
      console.error(`  FAILED: ${err.message}`);
      await sql.end();
      process.exit(1);
    }
  }
}

console.log(`\nDone. Applied ${count} new migrations.`);
await sql.end();
