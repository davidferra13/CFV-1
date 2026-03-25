#!/usr/bin/env node

/**
 * ChefFlow V1 - RLS Verification Harness
 *
 * Tests multi-tenant isolation using REAL database clients (not SQL simulation)
 *
 * Requirements:
 * - NEXT_PUBLIC_DB_URL
 * - NEXT_PUBLIC_DB_ANON_KEY
 * - DB_SERVICE_ROLE_KEY
 *
 * Exit codes:
 * - 0: All tests PASS
 * - 1: Any test FAIL
 */

import { createAdminClient } from '@/lib/db/admin'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

// NOTE: The compat layer bypasses RLS (direct DB). Both clients are admin-level.
// RLS-specific tests that rely on anon vs service_role distinction will need
// the original SDK if RLS enforcement testing is required.
const anonClient = createAdminClient()
const serviceClient = createAdminClient()

// Test data IDs (deterministic UUIDs)
const TENANT_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_A_AUTH = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'
const TENANT_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const TENANT_B_AUTH = 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'
const CLIENT_A1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000011'
const CLIENT_A1_AUTH = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'
const EVENT_A1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-111111111111'
const EVENT_B1_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111'
const LEDGER_A1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-222222222222'
const MENU_A1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-333333333333'

let testsFailed = 0

/**
 * Clean up existing test data
 */
async function cleanup() {
  console.log('🧹 Cleaning up existing test data...')

  await serviceClient.from('event_menus').delete().like('event_id', 'aaaaaaaa%')
  await serviceClient.from('event_menus').delete().like('event_id', 'bbbbbbbb%')
  await serviceClient.from('event_transitions').delete().like('tenant_id', 'aaaaaaaa%')
  await serviceClient.from('event_transitions').delete().like('tenant_id', 'bbbbbbbb%')
  await serviceClient.from('ledger_entries').delete().like('tenant_id', 'aaaaaaaa%')
  await serviceClient.from('ledger_entries').delete().like('tenant_id', 'bbbbbbbb%')
  await serviceClient.from('events').delete().like('tenant_id', 'aaaaaaaa%')
  await serviceClient.from('events').delete().like('tenant_id', 'bbbbbbbb%')
  await serviceClient.from('menus').delete().like('tenant_id', 'aaaaaaaa%')
  await serviceClient.from('menus').delete().like('tenant_id', 'bbbbbbbb%')
  await serviceClient.from('clients').delete().like('tenant_id', 'aaaaaaaa%')
  await serviceClient.from('clients').delete().like('tenant_id', 'bbbbbbbb%')
  await serviceClient.from('user_roles').delete().like('entity_id', 'aaaaaaaa%')
  await serviceClient.from('user_roles').delete().like('entity_id', 'bbbbbbbb%')
  await serviceClient.from('chefs').delete().eq('id', TENANT_A_ID)
  await serviceClient.from('chefs').delete().eq('id', TENANT_B_ID)

  console.log('✓ Cleanup complete\n')
}

/**
 * Seed test data using service role
 */
async function seedTestData() {
  console.log('🌱 Seeding test data (service role)...')

  // Create tenants
  const { error: chefError } = await serviceClient.from('chefs').insert([
    {
      id: TENANT_A_ID,
      auth_user_id: TENANT_A_AUTH,
      business_name: 'RLS_TEST: Tenant A',
      email: 'rls_test_tenant_a@example.com',
    },
    {
      id: TENANT_B_ID,
      auth_user_id: TENANT_B_AUTH,
      business_name: 'RLS_TEST: Tenant B',
      email: 'rls_test_tenant_b@example.com',
    },
  ])

  if (chefError) {
    console.error('❌ FAIL: Could not seed chefs:', chefError.message)
    process.exit(1)
  }

  // Create client
  const { error: clientError } = await serviceClient.from('clients').insert({
    id: CLIENT_A1_ID,
    auth_user_id: CLIENT_A1_AUTH,
    tenant_id: TENANT_A_ID,
    full_name: 'RLS_TEST: Client A1',
    email: 'rls_test_client_a1@example.com',
  })

  if (clientError) {
    console.error('❌ FAIL: Could not seed clients:', clientError.message)
    process.exit(1)
  }

  // Create events
  const { error: eventError } = await serviceClient.from('events').insert([
    {
      id: EVENT_A1_ID,
      tenant_id: TENANT_A_ID,
      client_id: CLIENT_A1_ID,
      title: 'RLS_TEST: Event A1',
      event_date: '2026-03-01T18:00:00Z',
      guest_count: 10,
      location: 'Location A1',
      total_amount_cents: 100000,
      deposit_amount_cents: 50000,
      status: 'draft',
      created_by: TENANT_A_AUTH,
    },
    {
      id: EVENT_B1_ID,
      tenant_id: TENANT_B_ID,
      client_id: CLIENT_A1_ID, // Will fail FK constraint, but that's OK
      title: 'RLS_TEST: Event B1',
      event_date: '2026-03-02T18:00:00Z',
      guest_count: 12,
      location: 'Location B1',
      total_amount_cents: 120000,
      deposit_amount_cents: 60000,
      status: 'draft',
      created_by: TENANT_B_AUTH,
    },
  ])

  // Event B1 will fail FK constraint, so create minimal version
  if (eventError) {
    // Try without client reference for tenant B
    await serviceClient.from('clients').insert({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000011',
      auth_user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
      tenant_id: TENANT_B_ID,
      full_name: 'RLS_TEST: Client B1',
      email: 'rls_test_client_b1@example.com',
    })

    await serviceClient.from('events').insert({
      id: EVENT_B1_ID,
      tenant_id: TENANT_B_ID,
      client_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000011',
      title: 'RLS_TEST: Event B1',
      event_date: '2026-03-02T18:00:00Z',
      guest_count: 12,
      location: 'Location B1',
      total_amount_cents: 120000,
      deposit_amount_cents: 60000,
      status: 'draft',
      created_by: TENANT_B_AUTH,
    })
  }

  // Create menus
  await serviceClient.from('menus').insert([
    {
      id: MENU_A1_ID,
      tenant_id: TENANT_A_ID,
      name: 'RLS_TEST: Menu A1',
      description: 'Test menu for tenant A',
      price_per_person_cents: 10000,
      is_active: true,
    },
    {
      tenant_id: TENANT_B_ID,
      name: 'RLS_TEST: Menu B1',
      description: 'Test menu for tenant B',
      price_per_person_cents: 12000,
      is_active: true,
    },
  ])

  // Create ledger entries
  await serviceClient.from('ledger_entries').insert([
    {
      id: LEDGER_A1_ID,
      tenant_id: TENANT_A_ID,
      event_id: EVENT_A1_ID,
      client_id: CLIENT_A1_ID,
      entry_type: 'charge_succeeded',
      amount_cents: 50000,
      description: 'RLS_TEST: Ledger entry A1',
    },
    {
      tenant_id: TENANT_B_ID,
      event_id: EVENT_B1_ID,
      entry_type: 'charge_succeeded',
      amount_cents: 60000,
      description: 'RLS_TEST: Ledger entry B1',
    },
  ])

  console.log('✓ Test data seeded\n')
}

/**
 * Run RLS tests
 */
async function runTests() {
  console.log('🧪 Running RLS verification tests...\n')

  // TEST 1: Anon client cannot read events (deny-by-default)
  console.log('TEST 1: Anon client access to events (should be denied)')
  const { data: anonEvents, error: anonEventError } = await anonClient
    .from('events')
    .select('*')
    .like('title', 'RLS_TEST:%')

  if (anonEventError) {
    console.log('  ❌ FAIL: Anon client got error:', anonEventError.message)
    testsFailed++
  } else if (anonEvents && anonEvents.length === 0) {
    console.log('  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)')
  } else {
    console.log(
      `  ❌ FAIL: Anon client got ${anonEvents?.length || 0} rows (RLS BROKEN - should be 0)`
    )
    testsFailed++
  }

  // TEST 2: Anon client cannot read ledger entries
  console.log('\nTEST 2: Anon client access to ledger_entries (should be denied)')
  const { data: anonLedger, error: anonLedgerError } = await anonClient
    .from('ledger_entries')
    .select('*')
    .like('description', 'RLS_TEST:%')

  if (anonLedgerError) {
    console.log('  ❌ FAIL: Anon client got error:', anonLedgerError.message)
    testsFailed++
  } else if (anonLedger && anonLedger.length === 0) {
    console.log('  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)')
  } else {
    console.log(
      `  ❌ FAIL: Anon client got ${anonLedger?.length || 0} rows (RLS BROKEN - should be 0)`
    )
    testsFailed++
  }

  // TEST 3: Anon client cannot read menus
  console.log('\nTEST 3: Anon client access to menus (should be denied)')
  const { data: anonMenus, error: anonMenuError } = await anonClient
    .from('menus')
    .select('*')
    .like('name', 'RLS_TEST:%')

  if (anonMenuError) {
    console.log('  ❌ FAIL: Anon client got error:', anonMenuError.message)
    testsFailed++
  } else if (anonMenus && anonMenus.length === 0) {
    console.log('  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)')
  } else {
    console.log(
      `  ❌ FAIL: Anon client got ${anonMenus?.length || 0} rows (RLS BROKEN - should be 0)`
    )
    testsFailed++
  }

  // TEST 4: Anon client cannot read clients
  console.log('\nTEST 4: Anon client access to clients (should be denied)')
  const { data: anonClients, error: anonClientError } = await anonClient
    .from('clients')
    .select('*')
    .like('email', 'rls_test_%@example.com')

  if (anonClientError) {
    console.log('  ❌ FAIL: Anon client got error:', anonClientError.message)
    testsFailed++
  } else if (anonClients && anonClients.length === 0) {
    console.log('  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)')
  } else {
    console.log(
      `  ❌ FAIL: Anon client got ${anonClients?.length || 0} rows (RLS BROKEN - should be 0)`
    )
    testsFailed++
  }

  // TEST 5: Service role can read events (for webhooks)
  console.log('\nTEST 5: Service role access to events (should succeed)')
  const { data: serviceEvents, error: serviceEventError } = await serviceClient
    .from('events')
    .select('*')
    .like('title', 'RLS_TEST:%')

  if (serviceEventError) {
    console.log('  ❌ FAIL: Service role got error:', serviceEventError.message)
    testsFailed++
  } else if (serviceEvents && serviceEvents.length >= 2) {
    console.log(`  ✅ PASS: Service role got ${serviceEvents.length} rows (can bypass RLS)`)
  } else {
    console.log(`  ❌ FAIL: Service role got ${serviceEvents?.length || 0} rows (expected >= 2)`)
    testsFailed++
  }

  // TEST 6: Service role can read ledger (for webhooks)
  console.log('\nTEST 6: Service role access to ledger_entries (should succeed)')
  const { data: serviceLedger, error: serviceLedgerError } = await serviceClient
    .from('ledger_entries')
    .select('*')
    .like('description', 'RLS_TEST:%')

  if (serviceLedgerError) {
    console.log('  ❌ FAIL: Service role got error:', serviceLedgerError.message)
    testsFailed++
  } else if (serviceLedger && serviceLedger.length >= 2) {
    console.log(`  ✅ PASS: Service role got ${serviceLedger.length} rows (can bypass RLS)`)
  } else {
    console.log(`  ❌ FAIL: Service role got ${serviceLedger?.length || 0} rows (expected >= 2)`)
    testsFailed++
  }

  // TEST 7: Service role can insert ledger entries (for webhooks)
  console.log('\nTEST 7: Service role can INSERT ledger entries (for webhooks)')
  const { error: insertError } = await serviceClient.from('ledger_entries').insert({
    tenant_id: TENANT_A_ID,
    event_id: EVENT_A1_ID,
    entry_type: 'adjustment',
    amount_cents: 1000,
    description: 'RLS_TEST: Service role insert test',
  })

  if (insertError) {
    console.log('  ❌ FAIL: Service role cannot insert:', insertError.message)
    testsFailed++
  } else {
    console.log('  ✅ PASS: Service role can insert ledger entries')
  }
}

/**
 * Print summary and exit
 */
function printSummary() {
  console.log('\n' + '='.repeat(50))
  console.log('RLS VERIFICATION SUMMARY')
  console.log('='.repeat(50))

  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED')
    console.log('   - RLS is enabled and enforcing deny-by-default')
    console.log('   - Anon key cannot access data')
    console.log('   - Service role can bypass RLS for webhooks')
    console.log('\n✅ READY FOR PHASE 2')
    process.exit(0)
  } else {
    console.log(`❌ TESTS FAILED: ${testsFailed} failure(s)`)
    console.log('   - RLS is NOT properly enforced')
    console.log('   - DO NOT PROCEED to Phase 2')
    console.log('\n❌ CRITICAL SECURITY ISSUE')
    process.exit(1)
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('ChefFlow V1 - RLS Verification Harness')
  console.log('='.repeat(50) + '\n')

  await cleanup()
  await seedTestData()
  await runTests()
  printSummary()
}

main().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error.message)
  process.exit(1)
})
