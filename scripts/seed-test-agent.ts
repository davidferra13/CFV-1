// Seed a test agent account for QA/automated testing
// Usage: npx tsx scripts/seed-test-agent.ts
// Matches the real signUpChef() flow: Drizzle + bcrypt, no Supabase

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const TEST_AGENT = {
  email: 'agent@chefflow.test',
  password: 'Agent.Test.2026!',
  businessName: 'Test Agent Kitchen',
  displayName: 'Agent Tester',
  phone: '617-555-9999',
}

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL not set')

  const sql = postgres(dbUrl, { max: 1 })

  try {
    const existing = await sql`
      SELECT id FROM auth.users WHERE email = ${TEST_AGENT.email}
    `
    if (existing.length > 0) {
      console.log(`Account already exists: ${TEST_AGENT.email}`)
      console.log(`Password: ${TEST_AGENT.password}`)

      const chef = await sql`
        SELECT c.id, c.business_name FROM chefs c
        WHERE c.auth_user_id = ${existing[0].id}
      `
      if (chef.length > 0) {
        console.log(`Chef ID: ${chef[0].id}`)
        console.log(`Business: ${chef[0].business_name}`)
      } else {
        console.log('WARNING: auth user exists but no chef record. Recreating...')
        await createChefRecords(sql, existing[0].id)
      }
      await sql.end()
      return
    }

    const authUserId = crypto.randomUUID()
    const hashedPassword = await bcrypt.hash(TEST_AGENT.password, 10)

    await sql`
      INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        aud, role, created_at, updated_at,
        instance_id, is_sso_user, is_anonymous
      ) VALUES (
        ${authUserId}, ${TEST_AGENT.email}, ${hashedPassword}, NOW(),
        'authenticated', 'authenticated', NOW(), NOW(),
        '00000000-0000-0000-0000-000000000000', false, false
      )
    `
    console.log(`Auth user created: ${authUserId}`)

    await createChefRecords(sql, authUserId)

    console.log('\n--- Test Agent Account ---')
    console.log(`Email:    ${TEST_AGENT.email}`)
    console.log(`Password: ${TEST_AGENT.password}`)
    console.log('Sign in at: /auth/signin')
  } finally {
    await sql.end()
  }
}

async function createChefRecords(sql: postgres.Sql, authUserId: string) {
  const [chef] = await sql`
    INSERT INTO chefs (auth_user_id, business_name, display_name, email, phone)
    VALUES (
      ${authUserId}, ${TEST_AGENT.businessName}, ${TEST_AGENT.displayName},
      ${TEST_AGENT.email}, ${TEST_AGENT.phone}
    )
    RETURNING id
  `
  console.log(`Chef created: ${chef.id}`)

  await sql`
    INSERT INTO user_roles (auth_user_id, role, entity_id)
    VALUES (${authUserId}, 'chef', ${chef.id})
  `
  console.log('User role assigned: chef')

  await sql`
    INSERT INTO chef_preferences (chef_id, tenant_id)
    VALUES (${chef.id}, ${chef.id})
  `
  console.log('Chef preferences initialized')
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
