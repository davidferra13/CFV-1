/**
 * Verify Drizzle ORM connection to local PostgreSQL.
 * Run: npx tsx scripts/verify-drizzle.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres'

async function main() {
  console.log('Connecting to:', connectionString.replace(/:[^@]+@/, ':***@'))

  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  // Test 1: Raw SQL query
  console.log('\n--- Test 1: Raw SQL ---')
  const result = await db.execute(sql`SELECT current_database(), current_user, version()`)
  console.log('Database:', result[0].current_database)
  console.log('User:', result[0].current_user)

  // Test 2: Count tables in public schema
  console.log('\n--- Test 2: Table count ---')
  const tableCount = await db.execute(sql`
    SELECT count(*) as cnt FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `)
  console.log('Public tables:', tableCount[0].cnt)

  // Test 3: Query chefs table directly
  console.log('\n--- Test 3: Chefs table ---')
  const chefs = await db.execute(sql`SELECT id, email, business_name FROM chefs LIMIT 3`)
  console.log('Chefs found:', chefs.length)
  for (const chef of chefs) {
    console.log(`  - ${chef.business_name} (${chef.email})`)
  }

  // Test 4: Query auth.users table
  console.log('\n--- Test 4: Auth users ---')
  const users = await db.execute(sql`SELECT id, email FROM auth.users LIMIT 3`)
  console.log('Auth users found:', users.length)
  for (const user of users) {
    console.log(`  - ${user.email} (${user.id})`)
  }

  // Test 5: Query a view
  console.log('\n--- Test 5: Views ---')
  const views = await db.execute(sql`
    SELECT table_name FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  console.log('Public views:', views.length)
  for (const v of views) {
    console.log(`  - ${v.table_name}`)
  }

  console.log('\n✅ All Drizzle connection tests passed!')

  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Drizzle verification failed:', err.message)
  process.exit(1)
})
