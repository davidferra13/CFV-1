import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('chef_tips','location_alerts','events') ORDER BY tablename`;
console.log('Tables found:', tables.map(x => x.tablename).join(', '));
const col = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='events' AND column_name='prep_sheet_generated_at'`;
console.log('prep_sheet_generated_at exists:', col.length > 0);
const migrations = await sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5`;
console.log('Last 5 migration hashes:', migrations.map(x => x.hash).join(', '));
await sql.end();
