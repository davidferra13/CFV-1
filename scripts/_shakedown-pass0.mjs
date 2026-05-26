import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const client = postgres(connectionString, { max: 1 });

try {
  const [r] = await client`SELECT current_database() as name`;
  console.log('DB connected:', r.name);

  const [t] = await client`SELECT count(*)::int as c FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Public tables:', t.c);

  const [tenants] = await client`SELECT count(*)::int as c FROM tenants`;
  console.log('Tenants:', tenants.c);

  const [users] = await client`SELECT count(*)::int as c FROM users`;
  console.log('Users:', users.c);

  const [events] = await client`SELECT count(*)::int as c FROM events`;
  console.log('Events:', events.c);

  const [recipes] = await client`SELECT count(*)::int as c FROM recipes`;
  console.log('Recipes:', recipes.c);

  const [menus] = await client`SELECT count(*)::int as c FROM menus`;
  console.log('Menus:', menus.c);

  console.log('\nPASS 0 - DB: GREEN');
} catch (e) {
  console.error('PASS 0 - DB: RED -', e.message);
}
await client.end();
process.exit(0);
