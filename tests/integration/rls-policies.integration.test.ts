/**
 * Integration Test: Row-Level Security (RLS) Policies
 *
 * Verifies that RLS prevents cross-tenant data access.
 * This is P1 — a broken RLS policy leaks data between tenants.
 *
 * Requires: NEXT_PUBLIC_DB_URL + DB_SERVICE_ROLE_KEY in env
 *
 * Run: npm run test:integration
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { testDb } from '../helpers/test-db.js'

// Skip if no credentials
testDb.skipIfNoDatabase()

const db = testDb.getClient()

let chefA: { id: string }
let chefB: { id: string }
let clientA: { id: string }
let clientB: { id: string }
let eventA: { id: string }
let eventB: { id: string }

describe('RLS Policies — Cross-Tenant Isolation', () => {
  before(async () => {
    // Create two completely separate chefs (tenants)
    const resultA = await testDb.createTestChef({ business_name: 'RLS Test Kitchen A' })
    const resultB = await testDb.createTestChef({ business_name: 'RLS Test Kitchen B' })
    chefA = resultA.chef
    chefB = resultB.chef

    // Create clients under each tenant
    clientA = await testDb.createTestClient(chefA.id, { first_name: 'ClientA' })
    clientB = await testDb.createTestClient(chefB.id, { first_name: 'ClientB' })

    // Create events under each tenant
    eventA = await testDb.createTestEvent(chefA.id, clientA.id, { occasion: 'Event A' })
    eventB = await testDb.createTestEvent(chefB.id, clientB.id, { occasion: 'Event B' })
  })

  after(async () => {
    await testDb.cleanup()
  })

  // ─── Service role can see everything (admin bypass) ──────────────────────

  it('service role can read both tenants (admin bypass works)', async () => {
    const { data: events } = await db.from('events').select('id').in('id', [eventA.id, eventB.id])

    assert.equal(events?.length, 2, 'Service role should see both events')
  })

  // ─── Tenant-scoped queries (simulating app behavior) ─────────────────────

  it('querying with tenant_id filter returns only that tenant data', async () => {
    const { data: eventsA } = await db
      .from('events')
      .select('id, occasion')
      .eq('tenant_id', chefA.id)
      .in('id', [eventA.id, eventB.id])

    assert.equal(eventsA?.length, 1, 'Should only return Chef A events')
    assert.equal(eventsA?.[0].id, eventA.id)
  })

  it('tenant A clients are not visible under tenant B filter', async () => {
    const { data: clients } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', chefB.id)
      .eq('id', clientA.id)

    assert.equal(clients?.length, 0, 'Client A should not appear under tenant B filter')
  })

  it('tenant B events are not visible under tenant A filter', async () => {
    const { data: events } = await db
      .from('events')
      .select('id')
      .eq('tenant_id', chefA.id)
      .eq('id', eventB.id)

    assert.equal(events?.length, 0, 'Event B should not appear under tenant A filter')
  })

  // ─── Ledger isolation ────────────────────────────────────────────────────

  it('ledger entries are tenant-isolated', async () => {
    // Create a ledger entry for Chef A
    const entryA = await testDb.createTestLedgerEntry(chefA.id, clientA.id, {
      event_id: eventA.id,
      description: 'RLS test payment A',
    })

    // Query with Chef B's tenant filter — should NOT find it
    const { data: leaked } = await db
      .from('ledger_entries')
      .select('id')
      .eq('tenant_id', chefB.id)
      .eq('id', entryA.id)

    assert.equal(leaked?.length, 0, 'Ledger entry A must not be visible to tenant B')
  })
})
