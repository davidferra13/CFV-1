import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');

try {
  await sql.unsafe(`INSERT INTO chef_preferences (chef_id, tenant_id, archetype) VALUES ('c0000000-0000-0000-0000-000000000099', 'c0000000-0000-0000-0000-000000000099', 'private-chef') ON CONFLICT (chef_id) DO UPDATE SET archetype = 'private-chef'`);
  console.log('Archetype set');

  await sql.unsafe(`INSERT INTO platform_admins (auth_user_id, email) VALUES ('a0000000-0000-0000-0000-000000000099', 'agent@local.chefflow') ON CONFLICT DO NOTHING`);
  console.log('Admin access set');

  console.log('Done');
} catch (err) {
  console.error('Error:', err.message);
}

await sql.end();
