/**
 * Integration Test: Ledger Idempotency
 *
 * Verifies that the UNIQUE constraint on ledger_entries.transaction_reference
 * prevents duplicate entries (critical for Stripe webhook safety).
 *
 * Requires: NEXT_PUBLIC_DB_URL + DB_SERVICE_ROLE_KEY in env
 *
 * Run: npm run test:integration
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createAdminClient } from '@/lib/db/admin'

const db = createAdminClient()

// Test data — use a unique reference per test run to avoid conflicts
const TEST_REF = `test-idem-${Date.now()}`
let testChefId: string
let testClientId: string

describe('Ledger Idempotency', () => {
  before(async () => {
    // Find an existing chef+client to attach test ledger entries to
    const { data: chef } = await db.from('chefs').select('id').limit(1).single()

    if (!chef) throw new Error('No chef found for integration test — run npm run seed:e2e first')
    testChefId = chef.id

    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', testChefId)
      .limit(1)
      .single()

    if (!client) throw new Error('No client found for integration test')
    testClientId = client.id
  })

  after(async () => {
    // Clean up test ledger entry
    await db.from('ledger_entries').delete().eq('transaction_reference', TEST_REF)
  })

  it('first insert with a transaction_reference succeeds', async () => {
    const { error } = await db.from('ledger_entries').insert({
      tenant_id: testChefId,
      client_id: testClientId,
      entry_type: 'payment',
      amount_cents: 10000,
      direction: 'credit',
      description: 'Integration test payment',
      transaction_reference: TEST_REF,
    })

    assert.equal(error, null, `Expected no error, got: ${error?.message}`)
  })

  it('second insert with the SAME transaction_reference fails with unique violation', async () => {
    const { error } = await db.from('ledger_entries').insert({
      tenant_id: testChefId,
      client_id: testClientId,
      entry_type: 'payment',
      amount_cents: 10000,
      direction: 'credit',
      description: 'Duplicate payment — should be rejected',
      transaction_reference: TEST_REF, // Same reference!
    })

    assert.notEqual(error, null, 'Expected a unique violation error but got none')
    // PostgreSQL error code 23505 = unique_violation
    assert.equal(
      error?.code,
      '23505',
      `Expected error code 23505 (unique_violation), got: ${error?.code}`
    )
  })

  it('insert with a DIFFERENT transaction_reference succeeds', async () => {
    const { error } = await db.from('ledger_entries').insert({
      tenant_id: testChefId,
      client_id: testClientId,
      entry_type: 'payment',
      amount_cents: 5000,
      direction: 'credit',
      description: 'Different reference — should succeed',
      transaction_reference: `${TEST_REF}-2`,
    })

    assert.equal(error, null, `Expected no error, got: ${error?.message}`)

    // Clean up the second entry
    await db.from('ledger_entries').delete().eq('transaction_reference', `${TEST_REF}-2`)
  })
})
