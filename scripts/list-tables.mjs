import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
console.log('Tables in public schema:', tables.length);
tables.forEach(t => console.log(' ', t.tablename));
await sql.end();
