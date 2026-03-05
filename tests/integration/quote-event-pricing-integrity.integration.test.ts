/**
 * Integration Test: Quote/Event Pricing Integrity
 *
 * Verifies database-level guarantees for quote acceptance + event pricing:
 * 1) Accepting a sent quote syncs event pricing + converting_quote_id.
 * 2) A second quote in the same workflow cannot be accepted.
 * 3) Event pricing cannot drift away from the accepted quote.
 * 4) Drift guard still works when converting_quote_id is temporarily null.
 */

import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { testDb } from '../helpers/test-db.js'

testDb.skipIfNoSupabase()

const supabase = testDb.getClient()

let actorUserId: string
let chefAuthUserId: string
let chefId: string
let clientId: string
let eventId: string
let primaryQuoteId: string
let secondaryQuoteId: string

describe('Quote/Event Pricing Integrity', () => {
  before(async () => {
    const now = Date.now()
    const actorEmail = `quote-integrity-actor-${now}@chefflow.test`
    const { data: actorUser, error: actorError } = await supabase.auth.admin.createUser({
      email: actorEmail,
      password: `Tmp-${now}-Pass!`,
      email_confirm: true,
    })

    if (actorError || !actorUser.user) {
      throw new Error(`Failed to create actor auth user: ${actorError?.message ?? 'Unknown error'}`)
    }
    actorUserId = actorUser.user.id

    const chefAuthEmail = `quote-integrity-chef-auth-${now}@chefflow.test`
    const { data: chefAuthUser, error: chefAuthError } = await supabase.auth.admin.createUser({
      email: chefAuthEmail,
      password: `Tmp-${now}-ChefPass!`,
      email_confirm: true,
    })

    if (chefAuthError || !chefAuthUser.user) {
      throw new Error(
        `Failed to create chef auth user: ${chefAuthError?.message ?? 'Unknown error'}`
      )
    }
    chefAuthUserId = chefAuthUser.user.id

    const chef = await testDb.insertTracked('chefs', {
      auth_user_id: chefAuthUserId,
      business_name: 'Quote Integrity Chef',
      email: `quote-integrity-chef-${now}@chefflow.test`,
    })
    chefId = chef.id

    const client = await testDb.insertTracked('clients', {
      tenant_id: chefId,
      full_name: 'Quote Integrity',
      email: `quote-integrity-client-${now}@chefflow.test`,
    })
    clientId = client.id

    const future = new Date()
    future.setDate(future.getDate() + 21)
    const eventDate = future.toISOString().slice(0, 10)

    const event = await testDb.insertTracked('events', {
      tenant_id: chefId,
      client_id: clientId,
      event_date: eventDate,
      serve_time: '18:30',
      guest_count: 8,
      location_address: '123 Integrity Lane',
      location_city: 'New York',
      location_state: 'NY',
      location_zip: '10001',
      occasion: 'Pricing Integrity Dinner',
      status: 'proposed',
      pricing_model: 'flat_rate',
      quoted_price_cents: 100000,
      deposit_amount_cents: 30000,
    })
    eventId = event.id

    const quoteA = await testDb.insertTracked('quotes', {
      tenant_id: chefId,
      event_id: eventId,
      client_id: clientId,
      quote_name: 'Primary Integrity Quote',
      pricing_model: 'flat_rate',
      total_quoted_cents: 125000,
      deposit_required: true,
      deposit_amount_cents: 40000,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    primaryQuoteId = quoteA.id

    const quoteB = await testDb.insertTracked('quotes', {
      tenant_id: chefId,
      event_id: eventId,
      client_id: clientId,
      quote_name: 'Secondary Integrity Quote',
      pricing_model: 'flat_rate',
      total_quoted_cents: 132000,
      deposit_required: true,
      deposit_amount_cents: 42000,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    secondaryQuoteId = quoteB.id
  })

  after(async () => {
    await testDb.cleanup()
    if (chefAuthUserId) {
      await supabase.auth.admin.deleteUser(chefAuthUserId)
    }
    if (actorUserId) {
      await supabase.auth.admin.deleteUser(actorUserId)
    }
  })

  it('accepting a quote syncs event pricing and converting_quote_id', async () => {
    const { error: acceptError } = await supabase.rpc('respond_to_quote_atomic', {
      p_quote_id: primaryQuoteId,
      p_client_id: clientId,
      p_new_status: 'accepted',
      p_actor_id: actorUserId,
      p_rejected_reason: null,
    })

    assert.equal(acceptError, null, acceptError?.message)

    const { data: acceptedQuote, error: quoteFetchError } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', primaryQuoteId)
      .single()
    assert.equal(quoteFetchError, null, quoteFetchError?.message)
    assert.equal(acceptedQuote?.status, 'accepted')

    const { data: event, error: eventFetchError } = await supabase
      .from('events')
      .select('quoted_price_cents, deposit_amount_cents, pricing_model, converting_quote_id')
      .eq('id', eventId)
      .single()
    assert.equal(eventFetchError, null, eventFetchError?.message)

    assert.equal(event?.quoted_price_cents, 125000)
    assert.equal(event?.deposit_amount_cents, 40000)
    assert.equal(event?.pricing_model, 'flat_rate')
    assert.equal(event?.converting_quote_id, primaryQuoteId)
  })

  it('rejects accepting a second quote in the same event workflow', async () => {
    const { error } = await supabase.rpc('respond_to_quote_atomic', {
      p_quote_id: secondaryQuoteId,
      p_client_id: clientId,
      p_new_status: 'accepted',
      p_actor_id: actorUserId,
      p_rejected_reason: null,
    })

    assert.ok(error, 'Second acceptance should fail')
    assert.match(error.message.toLowerCase(), /already accepted|cannot accept/i)
  })

  it('blocks event pricing drift from the accepted quote', async () => {
    const { error } = await supabase
      .from('events')
      .update({ quoted_price_cents: 126000 })
      .eq('id', eventId)

    assert.ok(error, 'Pricing drift should be blocked')
    assert.match(error.message.toLowerCase(), /accepted quote|immutable|cannot be changed|locked/i)
  })

  it('still blocks pricing drift when converting_quote_id is null (fallback by event_id)', async () => {
    const { error: clearError } = await supabase
      .from('events')
      .update({ converting_quote_id: null })
      .eq('id', eventId)
    assert.equal(clearError, null, clearError?.message)

    const { error: driftError } = await supabase
      .from('events')
      .update({ deposit_amount_cents: 39000 })
      .eq('id', eventId)

    assert.ok(driftError, 'Pricing drift should still be blocked without converting_quote_id')
    assert.match(
      driftError.message.toLowerCase(),
      /accepted quote|immutable|cannot be changed|locked/i
    )
  })
})
