/**
 * Integration Test: Inquiry/Quote status sync
 *
 * Verifies DB-level guarantees for the linked inquiry workflow:
 * 1) Accepting a quote linked to a pre-quote inquiry promotes the inquiry
 *    through quoted -> confirmed.
 * 2) The inquiry transition validator accepts new -> quoted and still rejects
 *    illegal shortcuts like new -> confirmed.
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
let inquiryId: string
let quoteId: string

describe('Inquiry/Quote Status Sync', () => {
  before(async () => {
    const now = Date.now()

    const { data: actorUser, error: actorError } = await supabase.auth.admin.createUser({
      email: `inq-quote-actor-${now}@chefflow.test`,
      password: `Tmp-${now}-Pass!`,
      email_confirm: true,
    })

    if (actorError || !actorUser.user) {
      throw new Error(`Failed to create actor auth user: ${actorError?.message ?? 'Unknown error'}`)
    }
    actorUserId = actorUser.user.id

    const { data: chefAuthUser, error: chefAuthError } = await supabase.auth.admin.createUser({
      email: `inq-quote-chef-auth-${now}@chefflow.test`,
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
      business_name: 'Inquiry Quote Sync Chef',
      email: `inq-quote-chef-${now}@chefflow.test`,
    })
    chefId = chef.id

    const client = await testDb.insertTracked('clients', {
      tenant_id: chefId,
      full_name: 'Inquiry Quote Sync Client',
      email: `inq-quote-client-${now}@chefflow.test`,
    })
    clientId = client.id

    const future = new Date()
    future.setDate(future.getDate() + 14)
    const eventDate = future.toISOString().slice(0, 10)

    const inquiry = await testDb.insertTracked('inquiries', {
      tenant_id: chefId,
      client_id: clientId,
      channel: 'website',
      status: 'new',
      first_contact_at: new Date().toISOString(),
      confirmed_date: eventDate,
      confirmed_guest_count: 6,
      confirmed_occasion: 'Status Sync Dinner',
    })
    inquiryId = inquiry.id

    const quote = await testDb.insertTracked('quotes', {
      tenant_id: chefId,
      client_id: clientId,
      inquiry_id: inquiryId,
      quote_name: 'Status Sync Quote',
      pricing_model: 'flat_rate',
      total_quoted_cents: 96000,
      deposit_required: true,
      deposit_amount_cents: 24000,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    quoteId = quote.id
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

  it('accepting a quote linked to a new inquiry records quoted -> confirmed sync', async () => {
    const { error: acceptError } = await supabase.rpc('respond_to_quote_atomic', {
      p_quote_id: quoteId,
      p_client_id: clientId,
      p_new_status: 'accepted',
      p_actor_id: actorUserId,
      p_rejected_reason: null,
    })

    assert.equal(acceptError, null, acceptError?.message)

    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .select('status')
      .eq('id', inquiryId)
      .single()

    assert.equal(inquiryError, null, inquiryError?.message)
    assert.equal(inquiry?.status, 'confirmed')

    const { data: transitions, error: transitionError } = await supabase
      .from('inquiry_state_transitions')
      .select('from_status, to_status, reason')
      .eq('inquiry_id', inquiryId)
      .order('transitioned_at', { ascending: true })

    assert.equal(transitionError, null, transitionError?.message)
    assert.ok(
      (transitions ?? []).some((row) => row.from_status === 'new' && row.to_status === 'quoted'),
      'Expected a new -> quoted transition'
    )
    assert.ok(
      (transitions ?? []).some(
        (row) => row.from_status === 'quoted' && row.to_status === 'confirmed'
      ),
      'Expected a quoted -> confirmed transition'
    )
  })

  it('transition validator allows new -> quoted but rejects new -> confirmed', async () => {
    const now = Date.now()
    const extraInquiry = await testDb.insertTracked('inquiries', {
      tenant_id: chefId,
      client_id: clientId,
      channel: 'website',
      status: 'new',
      first_contact_at: new Date().toISOString(),
      confirmed_date: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      confirmed_guest_count: 4,
      confirmed_occasion: 'Validator Dinner',
    })

    const { error: legalError } = await supabase.from('inquiry_state_transitions').insert({
      tenant_id: chefId,
      inquiry_id: extraInquiry.id,
      from_status: 'new',
      to_status: 'quoted',
      transitioned_by: actorUserId,
      reason: 'validator_test_legal',
    })

    assert.equal(legalError, null, legalError?.message)

    const { error: illegalError } = await supabase.from('inquiry_state_transitions').insert({
      tenant_id: chefId,
      inquiry_id: extraInquiry.id,
      from_status: 'new',
      to_status: 'confirmed',
      transitioned_by: actorUserId,
      reason: 'validator_test_illegal',
    })

    assert.ok(illegalError, 'new -> confirmed should be rejected by the DB validator')
  })
})
