import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
const schema = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='drizzle' AND table_name='__drizzle_migrations' ORDER BY ordinal_position`;
console.log('Migrations table columns:', schema.map(x => x.column_name).join(', '));
const all = await sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at`;
console.log('Total migrations applied:', all.length);
all.forEach(x => console.log(JSON.stringify(x)));
await sql.end();
