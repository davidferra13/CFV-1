import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

// Check events columns
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='events' AND table_schema='public' ORDER BY ordinal_position`;
console.log('events columns:', cols.map(c => c.column_name).join(', '));

await sql.end();
