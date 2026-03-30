// Seed a test inquiry for the agent account so we can verify critical path + snapshot
// Run: node tests/seed-test-inquiry.mjs

import pg from 'pg'
const { Client } = pg

const DB_URL = 'postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres'
const AGENT_TENANT_ID = 'c0000000-0000-0000-0000-000000000099'
const AGENT_AUTH_USER_ID = 'a0000000-0000-0000-0000-000000000099'

async function run() {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  // Check if agent already has inquiries
  const existing = await client.query(
    'SELECT id FROM inquiries WHERE tenant_id = $1 LIMIT 1',
    [AGENT_TENANT_ID]
  )

  if (existing.rows.length > 0) {
    console.log('Agent already has an inquiry:', existing.rows[0].id)
    await client.end()
    return
  }

  // Create a test client first
  const clientResult = await client.query(`
    INSERT INTO clients (id, tenant_id, full_name, email, phone, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      $1,
      'Gunjan Gupta',
      'gunjan@test.local',
      '555-0101',
      NOW(),
      NOW()
    )
    RETURNING id
  `, [AGENT_TENANT_ID])
  const clientId = clientResult.rows[0].id
  console.log('Created test client:', clientId)

  // Create inquiry with rich data for snapshot testing
  const inquiryResult = await client.query(`
    INSERT INTO inquiries (
      id, tenant_id, client_id, status, channel,
      contact_name, contact_email, contact_phone,
      confirmed_date, confirmed_guest_count, confirmed_location,
      confirmed_occasion, confirmed_dietary_restrictions,
      discussed_dishes, selected_tier,
      source_message,
      created_at, updated_at, created_by
    ) VALUES (
      gen_random_uuid(), $1, $2, 'awaiting_chef', 'email',
      'Gunjan Gupta', 'gunjan@test.local', '555-0101',
      '2026-05-15T18:00:00Z', 6, 'Haverhill, MA',
      '15th Anniversary', ARRAY['vegetarian', 'no peanuts'],
      '["Malai Soya Chaap", "Paneer Tikka", "Gulab Jamun", "Dal Makhani"]'::jsonb,
      '4-course',
      'Hi! We are looking for a private chef for our 15th anniversary dinner. We are 6 people, all vegetarian. We love North Indian food.',
      NOW(), NOW(), $3
    )
    RETURNING id
  `, [AGENT_TENANT_ID, clientId, AGENT_AUTH_USER_ID])
  const inquiryId = inquiryResult.rows[0].id
  console.log('Created test inquiry:', inquiryId)

  // Create a hub group (dinner circle) for this inquiry
  const groupResult = await client.query(`
    INSERT INTO hub_groups (
      id, tenant_id, inquiry_id, name, group_token, is_active,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2,
      'Gunjan Anniversary Dinner',
      'test-' || substr(md5(random()::text), 1, 12),
      true,
      NOW(), NOW()
    )
    RETURNING id, group_token
  `, [AGENT_TENANT_ID, inquiryId])
  console.log('Created dinner circle:', groupResult.rows[0].id, 'token:', groupResult.rows[0].group_token)

  console.log('\nDone! Inquiry ID:', inquiryId)
  console.log('You can now run: node tests/verify-critical-path.mjs')

  await client.end()
}

run().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
