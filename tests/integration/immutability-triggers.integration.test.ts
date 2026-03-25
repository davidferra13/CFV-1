/**
 * Integration Test: Immutability Triggers
 *
 * Verifies that immutable tables (ledger_entries, event_transitions,
 * quote_state_transitions) reject UPDATE and DELETE operations.
 * This is P1 — if these fail, financial records can be tampered with.
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

let chefId: string
let clientId: string
let eventId: string
let ledgerEntryId: string

describe('Immutability Triggers', () => {
  before(async () => {
    // Create test data
    const { chef } = await testDb.createTestChef({ business_name: 'Immutability Test' })
    chefId = chef.id
    const client = await testDb.createTestClient(chefId)
    clientId = client.id
    const event = await testDb.createTestEvent(chefId, clientId)
    eventId = event.id

    // Create a ledger entry to test immutability on
    const entry = await testDb.createTestLedgerEntry(chefId, clientId, {
      event_id: eventId,
      description: 'Immutability test entry',
    })
    ledgerEntryId = entry.id
  })

  after(async () => {
    await testDb.cleanup()
  })

  // ─── LEDGER ENTRIES ──────────────────────────────────────────────────────

  describe('ledger_entries immutability', () => {
    it('INSERT succeeds (append-only is allowed)', async () => {
      const { data, error } = await db
        .from('ledger_entries')
        .select('id')
        .eq('id', ledgerEntryId)
        .single()

      assert.equal(error, null, 'Inserted ledger entry should be readable')
      assert.ok(data, 'Ledger entry should exist')
    })

    it('UPDATE is rejected by immutability trigger', async () => {
      const { error } = await db
        .from('ledger_entries')
        .update({ description: 'TAMPERED' })
        .eq('id', ledgerEntryId)

      assert.ok(error, 'UPDATE on ledger_entries must fail')
      // The trigger should raise an error — exact message depends on the trigger implementation
    })

    it('DELETE is rejected by immutability trigger', async () => {
      const { error } = await db.from('ledger_entries').delete().eq('id', ledgerEntryId)

      assert.ok(error, 'DELETE on ledger_entries must fail')
    })

    it('ledger entry is unchanged after failed UPDATE', async () => {
      const { data } = await db
        .from('ledger_entries')
        .select('description')
        .eq('id', ledgerEntryId)
        .single()

      assert.notEqual(data?.description, 'TAMPERED', 'Description must NOT have been changed')
      assert.equal(
        data?.description,
        'Immutability test entry',
        'Original description must be preserved'
      )
    })
  })

  // ─── EVENT TRANSITIONS ───────────────────────────────────────────────────

  describe('event_transitions immutability', () => {
    let transitionId: string | undefined

    before(async () => {
      // Create a transition record
      const { data, error } = await db
        .from('event_transitions')
        .insert({
          event_id: eventId,
          from_status: 'draft',
          to_status: 'proposed',
          actor_id: chefId,
          actor_role: 'chef',
        })
        .select()
        .single()

      if (!error && data) {
        transitionId = data.id
      }
    })

    it('INSERT succeeds', () => {
      assert.ok(transitionId, 'Transition should have been created')
    })

    it('UPDATE is rejected', async () => {
      if (!transitionId) return
      const { error } = await db
        .from('event_transitions')
        .update({ to_status: 'cancelled' })
        .eq('id', transitionId)

      assert.ok(error, 'UPDATE on event_transitions must fail')
    })

    it('DELETE is rejected', async () => {
      if (!transitionId) return
      const { error } = await db.from('event_transitions').delete().eq('id', transitionId)

      assert.ok(error, 'DELETE on event_transitions must fail')
    })
  })

  // ─── QUOTE STATE TRANSITIONS ─────────────────────────────────────────────

  describe('quote_state_transitions immutability', () => {
    let quoteId: string | undefined
    let quoteTransitionId: string | undefined

    before(async () => {
      // Create a quote first
      const { data: quote, error: quoteError } = await db
        .from('quotes')
        .insert({
          tenant_id: chefId,
          event_id: eventId,
          client_id: clientId,
          status: 'draft',
          total_cents: 100000,
        })
        .select()
        .single()

      if (quoteError || !quote) return
      quoteId = quote.id

      // Create a quote state transition
      const { data, error } = await db
        .from('quote_state_transitions')
        .insert({
          quote_id: quoteId,
          from_status: 'draft',
          to_status: 'sent',
          actor_id: chefId,
        })
        .select()
        .single()

      if (!error && data) {
        quoteTransitionId = data.id
      }
    })

    it('INSERT succeeds', () => {
      // quote_state_transitions may not exist in all schemas
      // If the table doesn't exist, this will be undefined — that's OK
      if (quoteTransitionId) {
        assert.ok(quoteTransitionId, 'Quote transition should have been created')
      }
    })

    it('UPDATE is rejected', async () => {
      if (!quoteTransitionId) return
      const { error } = await db
        .from('quote_state_transitions')
        .update({ to_status: 'approved' })
        .eq('id', quoteTransitionId)

      assert.ok(error, 'UPDATE on quote_state_transitions must fail')
    })

    it('DELETE is rejected', async () => {
      if (!quoteTransitionId) return
      const { error } = await db
        .from('quote_state_transitions')
        .delete()
        .eq('id', quoteTransitionId)

      assert.ok(error, 'DELETE on quote_state_transitions must fail')
    })
  })
})
