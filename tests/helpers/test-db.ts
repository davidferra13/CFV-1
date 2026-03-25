/**
 * Test Database Helpers — P0 Test Infrastructure
 *
 * Utilities for integration tests that need a real database connection.
 * Handles setup, teardown, and isolation between test runs.
 *
 * Usage:
 *   import { testDb } from '../helpers/test-db.js'
 *
 *   before(async () => { await testDb.connect() })
 *   after(async () => { await testDb.cleanup() })
 */

import { createAdminClient } from '@/lib/db/admin'

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION
// ─────────────────────────────────────────────────────────────────────────────

let _client: any = null
const _createdIds: { table: string; id: string }[] = []

/**
 * Check if database credentials are available.
 * If not, integration tests should skip gracefully.
 */
export function hasDbCredentials(): boolean {
  // The admin client reads credentials internally; check env vars for skip logic
  return !!(process.env.NEXT_PUBLIC_DB_URL && process.env.DB_SERVICE_ROLE_KEY)
}

/**
 * Get or create the admin database client.
 */
export function getClient(): any {
  if (!_client) {
    _client = createAdminClient()
  }
  return _client
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST DATA CREATION (tracked for cleanup)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert a row into a table and track it for automatic cleanup.
 * Returns the inserted row.
 */
export async function insertTracked<T extends Record<string, unknown>>(
  table: string,
  data: T
): Promise<T & { id: string }> {
  const client = getClient()
  const { data: row, error } = await client.from(table).insert(data).select().single()

  if (error) {
    throw new Error(`Failed to insert test data into ${table}: ${error.message}`)
  }

  _createdIds.push({ table, id: (row as any).id })
  return row as T & { id: string }
}

/**
 * Create a complete test chef with tenant.
 * Returns { chef, tenantId } ready for use.
 */
export async function createTestChef(overrides: Record<string, unknown> = {}) {
  const client = getClient()

  // Create chef record (chef.id = tenant_id)
  const { data: chef, error } = await client
    .from('chefs')
    .insert({
      email: `test-chef-${Date.now()}@chefflow.test`,
      business_name: `Test Kitchen ${Date.now()}`,
      first_name: 'Test',
      last_name: 'Chef',
      ...overrides,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create test chef: ${error.message}`)
  _createdIds.push({ table: 'chefs', id: chef.id })

  return { chef, tenantId: chef.id }
}

/**
 * Create a test client under a tenant.
 */
export async function createTestClient(tenantId: string, overrides: Record<string, unknown> = {}) {
  return insertTracked('clients', {
    tenant_id: tenantId,
    first_name: 'Test',
    last_name: `Client${Date.now()}`,
    email: `test-client-${Date.now()}@chefflow.test`,
    ...overrides,
  })
}

/**
 * Create a test event under a tenant.
 */
export async function createTestEvent(
  tenantId: string,
  clientId: string,
  overrides: Record<string, unknown> = {}
) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30)

  return insertTracked('events', {
    tenant_id: tenantId,
    client_id: clientId,
    occasion: 'Test Dinner',
    event_date: futureDate.toISOString().slice(0, 10),
    guest_count: 8,
    status: 'draft',
    ...overrides,
  })
}

/**
 * Create a test ledger entry.
 */
export async function createTestLedgerEntry(
  tenantId: string,
  clientId: string,
  overrides: Record<string, unknown> = {}
) {
  return insertTracked('ledger_entries', {
    tenant_id: tenantId,
    client_id: clientId,
    entry_type: 'payment',
    amount_cents: 10000,
    payment_method: 'card',
    description: 'Test payment',
    transaction_reference: `test-txn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete all test data created during this test run.
 * Deletes in reverse order to respect foreign key constraints.
 */
export async function cleanup() {
  if (!_client || _createdIds.length === 0) return

  // Delete in reverse order (children before parents)
  const toDelete = [..._createdIds].reverse()

  for (const { table, id } of toDelete) {
    try {
      await _client.from(table).delete().eq('id', id)
    } catch {
      // Best-effort cleanup — some rows may have cascade-deleted already
    }
  }

  _createdIds.length = 0
}

/**
 * Skip the test file gracefully if database is not configured.
 * Call at the top of integration test files.
 */
export function skipIfNoDatabase() {
  if (!hasDbCredentials()) {
    console.warn('[SKIP] Integration test: database credentials not set')
    process.exit(0)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const testDb = {
  hasCredentials: hasDbCredentials,
  getClient,
  insertTracked,
  createTestChef,
  createTestClient,
  createTestEvent,
  createTestLedgerEntry,
  cleanup,
  skipIfNoDatabase,
}
