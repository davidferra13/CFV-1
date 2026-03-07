// Demo Seed Helpers
// Idempotent ensure* functions for inserting demo data.
// Uses service role client (admin access, bypasses RLS).
//
// Pattern follows tests/helpers/e2e-seed.ts

import type { SupabaseClient } from '@supabase/supabase-js'

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function ensureClient(
  admin: SupabaseClient,
  tenantId: string,
  client: {
    full_name: string
    email: string
    phone?: string
    dietary_restrictions?: string[]
    allergies?: string[]
    status?: string
    referral_source?: string
    vibe_notes?: string
  }
): Promise<string> {
  const { data: existing } = await admin
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', client.email)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('clients')
    .insert({
      tenant_id: tenantId,
      full_name: client.full_name,
      email: client.email,
      phone: client.phone ?? null,
      dietary_restrictions: client.dietary_restrictions ?? [],
      allergies: client.allergies ?? [],
      status: client.status ?? 'active',
      referral_source: client.referral_source ?? 'website',
      vibe_notes: client.vibe_notes ?? null,
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[demo-seed] Failed to insert client ${client.full_name}: ${error?.message}`)
  return inserted.id as string
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function ensureEvent(
  admin: SupabaseClient,
  tenantId: string,
  clientId: string,
  event: {
    occasion: string
    status: string
    daysOut: number
    guest_count: number
    serve_time: string
    location_city: string
    location_state: string
    service_style: string
  },
  inquiryId?: string
): Promise<string> {
  const { data: existing } = await admin
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('occasion', event.occasion)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('events')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      inquiry_id: inquiryId ?? null,
      event_date: daysFromNow(event.daysOut),
      serve_time: event.serve_time,
      guest_count: event.guest_count,
      occasion: event.occasion,
      location_address: '100 Demo Street',
      location_city: event.location_city,
      location_state: event.location_state,
      location_zip: '02101',
      status: event.status,
      service_style: event.service_style,
      dietary_restrictions: [],
      allergies: [],
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[demo-seed] Failed to insert event '${event.occasion}': ${error?.message}`)
  return inserted.id as string
}

// ─── Inquiries ───────────────────────────────────────────────────────────────

export async function ensureInquiry(
  admin: SupabaseClient,
  tenantId: string,
  clientId: string,
  inquiry: {
    channel: string
    status: string
    source_message: string
    confirmed_occasion: string
    confirmed_guest_count: number
    confirmed_budget_cents: number
    next_action_by: string
    daysAgo: number
  }
): Promise<string> {
  const snippet = inquiry.source_message.slice(0, 30)
  const { data: existing } = await admin
    .from('inquiries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .ilike('source_message', `%${snippet}%`)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('inquiries')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      channel: inquiry.channel,
      status: inquiry.status,
      source_message: inquiry.source_message,
      confirmed_occasion: inquiry.confirmed_occasion,
      confirmed_guest_count: inquiry.confirmed_guest_count,
      confirmed_budget_cents: inquiry.confirmed_budget_cents,
      confirmed_location: 'Boston, MA',
      unknown_fields: [],
      next_action_required: 'Review and respond',
      next_action_by: inquiry.next_action_by,
      first_contact_at: daysAgoISO(inquiry.daysAgo),
      last_response_at: daysAgoISO(inquiry.daysAgo),
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[demo-seed] Failed to insert inquiry: ${error?.message}`)
  return inserted.id as string
}

// ─── Menus ───────────────────────────────────────────────────────────────────

export async function ensureMenu(
  admin: SupabaseClient,
  tenantId: string,
  menu: {
    name: string
    description: string
    cuisine_type: string
    target_guest_count: number
    is_template: boolean
    status: string
    dishes: Array<{
      course_number: number
      course_name: string
      dietary_tags: string[]
    }>
  }
): Promise<string> {
  const { data: existing } = await admin
    .from('menus')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', menu.name)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('menus')
    .insert({
      tenant_id: tenantId,
      name: menu.name,
      description: menu.description,
      cuisine_type: menu.cuisine_type,
      target_guest_count: menu.target_guest_count,
      is_template: menu.is_template,
      status: menu.status,
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[demo-seed] Failed to insert menu '${menu.name}': ${error?.message}`)

  // Insert dishes
  for (const dish of menu.dishes) {
    await admin.from('dishes').insert({
      tenant_id: tenantId,
      menu_id: inserted.id,
      course_number: dish.course_number,
      course_name: dish.course_name,
      sort_order: dish.course_number,
      dietary_tags: dish.dietary_tags,
      allergen_flags: [],
    })
  }

  return inserted.id as string
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export async function ensureRecipe(
  admin: SupabaseClient,
  tenantId: string,
  chefAuthId: string,
  recipe: {
    name: string
    category: string
    description: string
    method: string
    yield_quantity: number
    yield_unit: string
    prep_time_minutes: number
    cook_time_minutes: number
    total_time_minutes: number
    dietary_tags: string[]
  }
): Promise<string> {
  const { data: existing } = await admin
    .from('recipes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', recipe.name)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('recipes')
    .insert({
      tenant_id: tenantId,
      name: recipe.name,
      category: recipe.category,
      description: recipe.description,
      method: recipe.method,
      yield_quantity: recipe.yield_quantity,
      yield_unit: recipe.yield_unit,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      total_time_minutes: recipe.total_time_minutes,
      dietary_tags: recipe.dietary_tags,
      created_by: chefAuthId,
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[demo-seed] Failed to insert recipe '${recipe.name}': ${error?.message}`)
  return inserted.id as string
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

export async function ensureQuote(
  admin: SupabaseClient,
  tenantId: string,
  clientId: string,
  eventId: string,
  quote: {
    status: string
    total_cents: number
    valid_days: number
  }
): Promise<string> {
  const { data: existing } = await admin
    .from('quotes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .eq('status', quote.status)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('quotes')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      event_id: eventId,
      quote_name: `Quote — ${quote.status}`,
      pricing_model: 'flat_rate',
      total_quoted_cents: quote.total_cents,
      deposit_required: true,
      deposit_amount_cents: Math.floor(quote.total_cents * 0.25),
      status: quote.status,
      valid_until: daysFromNow(quote.valid_days),
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[demo-seed] Failed to insert quote (${quote.status}): ${error?.message}`)
  return inserted.id as string
}

// ─── Ledger Entries ──────────────────────────────────────────────────────────

export async function ensureLedgerEntry(
  admin: SupabaseClient,
  tenantId: string,
  clientId: string,
  eventId: string,
  entry: {
    entry_type: string
    amount_cents: number
    description: string
    daysAgo: number
    payment_method: string
  }
): Promise<void> {
  const { data: existing } = await admin
    .from('ledger_entries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .eq('entry_type', entry.entry_type)
    .eq('description', entry.description)
    .maybeSingle()

  if (existing?.id) return

  const { error } = await admin.from('ledger_entries').insert({
    tenant_id: tenantId,
    client_id: clientId,
    event_id: eventId,
    entry_type: entry.entry_type,
    amount_cents: entry.amount_cents,
    description: entry.description,
    payment_method: entry.payment_method,
    is_refund: false,
    received_at: daysAgoISO(entry.daysAgo),
  })

  if (error) {
    // Ledger errors non-fatal — table may have trigger protection
    console.warn(
      `[demo-seed] Warning: Could not insert ledger entry (${entry.entry_type}): ${error.message}`
    )
  }
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function ensureExpense(
  admin: SupabaseClient,
  tenantId: string,
  eventId: string | null,
  expense: {
    category: string
    amount_cents: number
    description: string
    daysAgo: number
  }
): Promise<void> {
  const query = admin
    .from('expenses')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('description', expense.description)

  if (eventId) query.eq('event_id', eventId)

  const { data: existing } = await query.maybeSingle()
  if (existing?.id) return

  const { error } = await admin.from('expenses').insert({
    tenant_id: tenantId,
    event_id: eventId,
    expense_date: daysFromNow(-expense.daysAgo),
    category: expense.category,
    amount_cents: expense.amount_cents,
    description: expense.description,
    payment_method: 'card',
    is_business: true,
    is_reimbursable: false,
  })

  if (error)
    throw new Error(
      `[demo-seed] Failed to insert expense (${expense.description}): ${error.message}`
    )
}

// ─── Loyalty Config ─────────────────────────────────────────────────────────

export async function ensureLoyaltyConfig(
  admin: SupabaseClient,
  tenantId: string,
  config: {
    is_active: boolean
    points_per_dollar: number
    points_per_event: number
    points_per_guest: number
    referral_points: number
    welcome_points: number
    earn_mode: string
    program_mode: string
    tier_bronze_min: number
    tier_silver_min: number
    tier_gold_min: number
    tier_platinum_min: number
    bonus_large_party_points?: number | null
    bonus_large_party_threshold?: number | null
  }
): Promise<void> {
  const { error } = await admin
    .from('loyalty_config')
    .upsert({ tenant_id: tenantId, ...config }, { onConflict: 'tenant_id' })
  if (error) console.warn(`[demo-seed] Warning: Could not upsert loyalty config: ${error.message}`)
}

// ─── Loyalty Transactions ───────────────────────────────────────────────────

export async function ensureLoyaltyTransaction(
  admin: SupabaseClient,
  tenantId: string,
  clientId: string,
  tx: {
    type: string
    points: number
    description: string
    eventId?: string | null
    daysAgo: number
  }
): Promise<void> {
  const { data: existing } = await admin
    .from('loyalty_transactions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('description', tx.description)
    .maybeSingle()

  if (existing?.id) return

  const { error } = await admin.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: clientId,
    event_id: tx.eventId ?? null,
    type: tx.type,
    points: tx.points,
    description: tx.description,
    created_at: daysAgoISO(tx.daysAgo),
  })

  if (error)
    console.warn(`[demo-seed] Warning: Could not insert loyalty transaction: ${error.message}`)
}

// ─── Client Loyalty State ───────────────────────────────────────────────────

export async function updateClientLoyalty(
  admin: SupabaseClient,
  clientId: string,
  loyalty: { loyalty_points: number; loyalty_tier: string }
): Promise<void> {
  const { error } = await admin
    .from('clients')
    .update({
      loyalty_points: loyalty.loyalty_points,
      loyalty_tier: loyalty.loyalty_tier,
    })
    .eq('id', clientId)

  if (error) console.warn(`[demo-seed] Warning: Could not update client loyalty: ${error.message}`)
}

// ─── Staff Assignments ──────────────────────────────────────────────────────

export async function ensureStaffAssignment(
  admin: SupabaseClient,
  chefId: string,
  staffMemberId: string,
  eventId: string,
  assignment: {
    role_override?: string | null
    status: string
    scheduled_hours?: number | null
    actual_hours?: number | null
    notes?: string | null
  }
): Promise<void> {
  const { data: existing } = await admin
    .from('event_staff_assignments')
    .select('id')
    .eq('chef_id', chefId)
    .eq('staff_member_id', staffMemberId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing?.id) return

  const { error } = await admin.from('event_staff_assignments').insert({
    chef_id: chefId,
    staff_member_id: staffMemberId,
    event_id: eventId,
    role_override: assignment.role_override ?? null,
    status: assignment.status,
    scheduled_hours: assignment.scheduled_hours ?? null,
    actual_hours: assignment.actual_hours ?? null,
    notes: assignment.notes ?? null,
  })

  if (error)
    console.warn(`[demo-seed] Warning: Could not insert staff assignment: ${error.message}`)
}

// ─── Calendar Entries ────────────────────────────────────────────────────────

export async function ensureCalendarEntry(
  admin: SupabaseClient,
  chefId: string,
  entry: {
    daysOut: number
    public_note: string
    type: string
  }
): Promise<void> {
  const startDate = daysFromNow(entry.daysOut)
  const { data: existing } = await admin
    .from('chef_calendar_entries')
    .select('id')
    .eq('chef_id', chefId)
    .eq('start_date', startDate)
    .maybeSingle()

  if (existing?.id) return

  const { error } = await admin.from('chef_calendar_entries').insert({
    chef_id: chefId,
    start_date: startDate,
    end_date: startDate,
    entry_type: entry.type,
    title: 'Available for booking',
    public_note: entry.public_note,
    is_public: true,
    all_day: true,
    blocks_bookings: false,
  })

  if (error) {
    console.warn(`[demo-seed] Warning: Could not insert calendar entry: ${error.message}`)
  }
}
