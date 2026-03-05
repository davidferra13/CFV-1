// @ts-nocheck
// E2E Remote Seed — creates comprehensive test data against remote Supabase
// Called from tests/helpers/global-setup.ts and scripts/seed-e2e-remote.ts (CLI)
// All data namespaced under *@chefflow.test emails to isolate from real chef data

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

export type SeedResult = {
  chefId: string
  chefAuthId: string
  chefEmail: string
  chefPassword: string
  chefSlug: string
  clientId: string // primary test client (has auth user)
  clientAuthId: string
  clientEmail: string
  clientPassword: string
  clientIds: {
    primary: string
    secondary: string
    dormant: string
    standard: string
  }
  inquiryIds: {
    awaitingChef: string
    awaitingClient: string
  }
  eventIds: {
    draft: string
    proposed: string
    paid: string
    confirmed: string
    completed: string
  }
  quoteIds: {
    draft: string
    sent: string
    accepted: string
  }
  menuId: string
  recipeId: string
  // Chef B — second independent tenant for multi-tenant isolation tests
  chefBId: string
  chefBEmail: string
  chefBPassword: string
  chefBEventId: string
  chefBClientId: string
  // Staff — test staff member with portal login + kiosk PIN
  staffId: string
  staffAuthId: string
  staffEmail: string
  staffPassword: string
  staffKioskPin: string // raw PIN (e.g. '1234'), hashed in DB
  // Partner — test referral partner with portal login
  partnerId: string
  partnerAuthId: string
  partnerEmail: string
  partnerPassword: string
  partnerLocationId: string
}

function assertRemoteTestAllowed(url: string) {
  if (process.env.SUPABASE_E2E_ALLOW_REMOTE !== 'true') {
    throw new Error(
      '[e2e-seed] Remote E2E seed refused.\n' +
        'Add SUPABASE_E2E_ALLOW_REMOTE=true to .env.local to proceed.\n' +
        'This guard prevents accidental seeding against the production database.'
    )
  }
  if (!url.includes('supabase.co') && !url.includes('supabase.in')) {
    throw new Error(
      `[e2e-seed] Expected remote Supabase URL (*.supabase.co), got: ${url}.\n` +
        'For local Docker testing use scripts/seed-local-demo.ts instead.'
    )
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[e2e-seed] Missing environment variable: ${name}`)
  return value
}

export function getIsolationSuffix(): string {
  if (process.env.E2E_ISOLATION_SUFFIX) return process.env.E2E_ISOLATION_SUFFIX
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function daysFromNow(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function createAdminClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isMissingColumn(error: any, column: string): boolean {
  const message = String(error?.message || '').toLowerCase()
  return message.includes(`could not find the '${column.toLowerCase()}' column`)
}

function isImmutableEventPricingError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('pricing is immutable once accepted') ||
    message.includes('must match accepted quote') ||
    (message.includes('quoted_price_cents') &&
      message.includes('cannot be changed') &&
      message.includes('status is paid'))
  )
}

// ─── Auth User ────────────────────────────────────────────────────────────────

async function ensureAuthUser(
  admin,
  input: { email: string; password: string; metadata: Record<string, unknown> }
): Promise<{ id: string; email: string }> {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) throw new Error(`[e2e-seed] Failed to list auth users: ${listError.message}`)

  const existing = listed.users.find((u) => u.email?.toLowerCase() === input.email.toLowerCase())

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: input.metadata,
    })
    if (error) throw new Error(`[e2e-seed] Failed to update ${input.email}: ${error.message}`)
    return { id: existing.id, email: existing.email! }
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.metadata,
  })
  if (error || !created.user)
    throw new Error(`[e2e-seed] Failed to create ${input.email}: ${error?.message}`)
  return { id: created.user.id, email: created.user.email! }
}

// ─── Chef ─────────────────────────────────────────────────────────────────────

async function upsertChef(admin, authUserId: string, suffix: string): Promise<string> {
  const slug = `e2e-chef-${suffix}`
  const fields = {
    business_name: 'TEST - E2E Kitchen',
    display_name: 'E2E Test Chef',
    email: `e2e.chef.${suffix}@chefflow.test`,
    phone: '617-555-9001',
    slug,
    tagline: 'Automated E2E test account. Not a real chef.',
    bio: 'This chef profile is created by Playwright E2E tests and is safe to ignore.',
    show_website_on_public_profile: false,
    preferred_inquiry_destination: 'both',
    onboarding_completed_at: new Date().toISOString(),
    subscription_status: 'grandfathered',
  }

  const { data: existing } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (existing?.id) {
    await admin.from('chefs').update(fields).eq('id', existing.id)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('chefs')
    .insert({ auth_user_id: authUserId, ...fields })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[e2e-seed] Failed to insert chef: ${error?.message}`)
  return inserted.id as string
}

async function upsertChefB(admin, authUserId: string, suffix: string): Promise<string> {
  const slug = `e2e-chef-b-${suffix}`
  const fields = {
    business_name: 'TEST - E2E Kitchen B',
    display_name: 'E2E Test Chef B',
    email: `e2e.chef-b.${suffix}@chefflow.test`,
    phone: '617-555-9010',
    slug,
    tagline: 'Automated E2E test account B. Used for multi-tenant isolation tests.',
    bio: 'Chef B profile created for isolation testing. Safe to ignore.',
    show_website_on_public_profile: false,
    preferred_inquiry_destination: 'both',
    onboarding_completed_at: new Date().toISOString(),
  }

  const { data: existing } = await admin
    .from('chefs')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (existing?.id) {
    await admin.from('chefs').update(fields).eq('id', existing.id)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('chefs')
    .insert({ auth_user_id: authUserId, ...fields })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[e2e-seed] Failed to insert chef B: ${error?.message}`)
  return inserted.id as string
}

async function ensureChefRole(admin, authUserId: string, chefId: string) {
  const { error } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: authUserId, role: 'chef', entity_id: chefId },
      { onConflict: 'auth_user_id' }
    )
  if (error) throw new Error(`[e2e-seed] Failed to upsert chef role: ${error.message}`)
}

async function ensureChefPreferences(admin, chefId: string) {
  const { error } = await admin.from('chef_preferences').upsert(
    {
      chef_id: chefId,
      tenant_id: chefId,
      home_city: 'Boston',
      home_state: 'MA',
      network_discoverable: false,
      archetype: 'private-chef',
    },
    { onConflict: 'chef_id' }
  )
  if (error) throw new Error(`[e2e-seed] Failed to upsert chef preferences: ${error.message}`)
}

// ─── Clients ──────────────────────────────────────────────────────────────────

async function upsertPrimaryClient(
  admin,
  authUserId: string,
  chefId: string,
  suffix: string
): Promise<string> {
  const { data: existing } = await admin
    .from('clients')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  const fields = {
    tenant_id: chefId,
    full_name: 'TEST - Alice E2E',
    email: `e2e.client.${suffix}@chefflow.test`,
    phone: '617-555-9002',
    status: 'active',
    referral_source: 'website',
  }

  if (existing?.id) {
    await admin.from('clients').update(fields).eq('id', existing.id)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('clients')
    .insert({ auth_user_id: authUserId, ...fields })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[e2e-seed] Failed to insert primary client: ${error?.message}`)
  return inserted.id as string
}

async function ensureClientRole(admin, authUserId: string, clientId: string) {
  const { error } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: authUserId, role: 'client', entity_id: clientId },
      { onConflict: 'auth_user_id' }
    )
  if (error) throw new Error(`[e2e-seed] Failed to upsert client role: ${error.message}`)
}

async function upsertExtraClient(
  admin,
  chefId: string,
  fullName: string,
  email: string,
  status: string
): Promise<string> {
  const { data: existing } = await admin
    .from('clients')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('full_name', fullName)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('clients')
    .insert({
      tenant_id: chefId,
      full_name: fullName,
      email,
      phone: '617-555-9003',
      status,
      referral_source: 'referral',
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[e2e-seed] Failed to insert client ${fullName}: ${error?.message}`)
  return inserted.id as string
}

// ─── Inquiries ────────────────────────────────────────────────────────────────

async function ensureInquiry(
  admin,
  chefId: string,
  clientId: string,
  sourceMessage: string,
  status: string,
  nextActionBy: string
): Promise<string> {
  const snippet = sourceMessage.slice(0, 30)
  const { data: existing } = await admin
    .from('inquiries')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .ilike('source_message', `%${snippet}%`)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('inquiries')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      channel: 'website',
      status,
      source_message: sourceMessage,
      confirmed_date: new Date(`${daysFromNow(35)}T00:00:00.000Z`).toISOString(),
      confirmed_guest_count: 6,
      confirmed_location: 'Beacon Hill, Boston, MA',
      confirmed_occasion: 'TEST Private Dinner',
      confirmed_budget_cents: 150000,
      unknown_fields: [],
      next_action_required: 'Review and respond',
      next_action_by: nextActionBy,
      first_contact_at: new Date().toISOString(),
      last_response_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[e2e-seed] Failed to insert inquiry: ${error?.message}`)
  return inserted.id as string
}

// ─── Events ───────────────────────────────────────────────────────────────────

async function ensureEvent(
  admin,
  chefId: string,
  clientId: string,
  occasion: string,
  status: string,
  daysOut: number,
  inquiryId?: string
): Promise<string> {
  const quotedPriceCents = 120000
  const depositAmountCents = 30000

  const { data: existing } = await admin
    .from('events')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq('occasion', occasion)
    .maybeSingle()

  if (existing?.id) {
    const eventPayload: Record<string, unknown> = {
      client_id: clientId,
      inquiry_id: inquiryId ?? null,
      event_date: daysFromNow(daysOut),
      serve_time: '18:30:00',
      guest_count: 6,
      occasion,
      location_address: '100 E2E Test Street',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02101',
      status,
      service_style: 'plated',
      dietary_restrictions: [],
      allergies: [],
      special_requests: 'TEST - Automated E2E test event. Safe to ignore.',
      quoted_price_cents: quotedPriceCents,
      pricing_model: 'flat_rate',
      deposit_amount_cents: depositAmountCents,
      deleted_at: null,
      deleted_by: null,
    }

    let { error: updateError } = await admin
      .from('events')
      .update(eventPayload)
      .eq('id', existing.id)
    if (isMissingColumn(updateError, 'deleted_at') || isMissingColumn(updateError, 'deleted_by')) {
      delete eventPayload.deleted_at
      delete eventPayload.deleted_by
      ;({ error: updateError } = await admin
        .from('events')
        .update(eventPayload)
        .eq('id', existing.id))
    }

    if (updateError && isImmutableEventPricingError(updateError)) {
      // Some environments enforce immutable pricing once events are payable.
      // Keep the existing seeded row as-is rather than failing global setup.
      console.warn(
        `[e2e-seed] Warning: Skipping immutable pricing update for event '${occasion}' (${existing.id}).`
      )
      return existing.id as string
    }

    if (updateError) {
      throw new Error(`[e2e-seed] Failed to refresh event '${occasion}': ${updateError.message}`)
    }

    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('events')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      inquiry_id: inquiryId ?? null,
      event_date: daysFromNow(daysOut),
      serve_time: '18:30:00',
      guest_count: 6,
      occasion,
      location_address: '100 E2E Test Street',
      location_city: 'Boston',
      location_state: 'MA',
      location_zip: '02101',
      status,
      service_style: 'plated',
      dietary_restrictions: [],
      allergies: [],
      special_requests: 'TEST - Automated E2E test event. Safe to ignore.',
      quoted_price_cents: quotedPriceCents,
      pricing_model: 'flat_rate',
      deposit_amount_cents: depositAmountCents,
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[e2e-seed] Failed to insert event '${occasion}': ${error?.message}`)
  return inserted.id as string
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

async function ensureQuote(
  admin,
  chefId: string,
  clientId: string,
  inquiryId: string | null,
  eventId: string | null,
  status: string,
  totalCents: number,
  validUntilDays: number
): Promise<string> {
  const lookupField = eventId ? 'event_id' : 'inquiry_id'
  const lookupId = eventId ?? inquiryId
  const { data: existing } = await admin
    .from('quotes')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq(lookupField, lookupId)
    .eq('status', status)
    .maybeSingle()

  if (existing?.id) {
    const quotePayload: Record<string, unknown> = {
      quote_name: `TEST Quote (${status})`,
      pricing_model: 'flat_rate',
      total_quoted_cents: totalCents,
      deposit_required: true,
      deposit_amount_cents: Math.floor(totalCents * 0.25),
      status,
      valid_until: daysFromNow(validUntilDays),
      inquiry_id: inquiryId,
      event_id: eventId,
      deleted_at: null,
      deleted_by: null,
    }

    let { error: updateError } = await admin
      .from('quotes')
      .update(quotePayload)
      .eq('id', existing.id)
    if (isMissingColumn(updateError, 'deleted_at') || isMissingColumn(updateError, 'deleted_by')) {
      delete quotePayload.deleted_at
      delete quotePayload.deleted_by
      ;({ error: updateError } = await admin
        .from('quotes')
        .update(quotePayload)
        .eq('id', existing.id))
    }

    if (updateError) {
      throw new Error(`[e2e-seed] Failed to refresh quote (${status}): ${updateError.message}`)
    }

    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('quotes')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      inquiry_id: inquiryId,
      event_id: eventId,
      quote_name: `TEST Quote (${status})`,
      pricing_model: 'flat_rate',
      total_quoted_cents: totalCents,
      deposit_required: true,
      deposit_amount_cents: Math.floor(totalCents * 0.25),
      status,
      valid_until: daysFromNow(validUntilDays),
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[e2e-seed] Failed to insert quote (${status}): ${error?.message}`)
  return inserted.id as string
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

async function ensureLedgerEntry(
  admin,
  chefId: string,
  clientId: string,
  eventId: string,
  entryType: string,
  amountCents: number,
  description: string,
  createdBy: string,
  daysAgo = 0
) {
  const { data: existing } = await admin
    .from('ledger_entries')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('event_id', eventId)
    .eq('entry_type', entryType)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const receivedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('ledger_entries').insert({
    tenant_id: chefId,
    client_id: clientId,
    event_id: eventId,
    entry_type: entryType,
    amount_cents: amountCents,
    description,
    payment_method: 'venmo',
    is_refund: false,
    created_by: createdBy,
    received_at: receivedAt,
  })

  if (error) {
    // Ledger errors are non-fatal for seed — table may have trigger protection
    console.warn(
      `[e2e-seed] Warning: Could not insert ledger entry (${entryType}): ${error.message}`
    )
  }
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

async function ensureExpense(
  admin,
  chefId: string,
  eventId: string,
  category: string,
  amountCents: number,
  description: string
) {
  const { data: existing } = await admin
    .from('expenses')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('event_id', eventId)
    .eq('description', description)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { error } = await admin.from('expenses').insert({
    tenant_id: chefId,
    event_id: eventId,
    expense_date: daysFromNow(-30),
    category,
    amount_cents: amountCents,
    description,
    payment_method: 'card',
    is_business: true,
    is_reimbursable: false,
  })

  if (error)
    throw new Error(`[e2e-seed] Failed to insert expense (${description}): ${error.message}`)
}

// ─── Menu + Dishes ────────────────────────────────────────────────────────────

async function ensureMenu(admin, chefId: string): Promise<string> {
  const { data: existing } = await admin
    .from('menus')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('name', 'TEST - E2E Tasting Menu')
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('menus')
    .insert({
      tenant_id: chefId,
      name: 'TEST - E2E Tasting Menu',
      description: 'Automated test menu created by Playwright E2E seed.',
      is_template: true,
      status: 'draft',
      cuisine_type: 'Modern American',
      target_guest_count: 6,
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[e2e-seed] Failed to insert menu: ${error?.message}`)

  // Add 3 courses (dishes)
  const courses = [
    { course_number: 1, course_name: 'TEST - Amuse-Bouche' },
    { course_number: 2, course_name: 'TEST - Main Course' },
    { course_number: 3, course_name: 'TEST - Dessert' },
  ]
  for (const course of courses) {
    await admin.from('dishes').insert({
      tenant_id: chefId,
      menu_id: inserted.id,
      course_number: course.course_number,
      course_name: course.course_name,
      sort_order: course.course_number,
      dietary_tags: [],
      allergen_flags: [],
    })
  }

  return inserted.id as string
}

// ─── Recipe ───────────────────────────────────────────────────────────────────

async function ensureRecipe(admin, chefId: string, chefAuthId: string): Promise<string> {
  const { data: existing } = await admin
    .from('recipes')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('name', 'TEST - Lemon Butter Pasta')
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('recipes')
    .insert({
      tenant_id: chefId,
      name: 'TEST - Lemon Butter Pasta',
      category: 'pasta',
      description: 'Simple E2E test recipe. Safe to ignore.',
      method:
        'Cook pasta until al dente. Finish with lemon zest, butter, and pasta water. Season and serve immediately.',
      yield_description: '6 portions',
      yield_quantity: 6,
      yield_unit: 'portion',
      prep_time_minutes: 10,
      cook_time_minutes: 15,
      total_time_minutes: 25,
      dietary_tags: [],
      times_cooked: 0,
      archived: false,
      created_by: chefAuthId,
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[e2e-seed] Failed to insert recipe: ${error?.message}`)
  return inserted.id as string
}

// ─── Staff ───────────────────────────────────────────────────────────────────

async function upsertStaffMember(admin, chefId: string, suffix: string): Promise<string> {
  const staffName = 'TEST - E2E Staff Member'
  const { data: existing } = await admin
    .from('staff_members')
    .select('id')
    .eq('chef_id', chefId)
    .eq('name', staffName)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('staff_members')
    .insert({
      chef_id: chefId,
      name: staffName,
      role: 'sous_chef',
      phone: '617-555-9020',
      email: `e2e.staff.${suffix}@chefflow.test`,
      hourly_rate_cents: 2500,
      status: 'active',
      notes: 'Automated E2E test staff member. Safe to ignore.',
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[e2e-seed] Failed to insert staff member: ${error?.message}`)
  return inserted.id as string
}

async function ensureStaffRole(admin, authUserId: string, staffId: string) {
  // user_roles has unique constraint on auth_user_id — use upsert
  const { error } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: authUserId, role: 'staff', entity_id: staffId },
      { onConflict: 'auth_user_id' }
    )
  if (error) throw new Error(`[e2e-seed] Failed to upsert staff role: ${error.message}`)
}

async function setStaffKioskPin(admin, staffId: string, rawPin: string) {
  // Hash the PIN the same way the app does (SHA-256)
  const { createHash } = await import('crypto')
  const pinHash = createHash('sha256').update(rawPin).digest('hex')

  const { error } = await admin
    .from('staff_members')
    .update({ kiosk_pin: pinHash })
    .eq('id', staffId)

  if (error) {
    console.warn(`[e2e-seed] Warning: Could not set staff kiosk PIN: ${error.message}`)
  }
}

// ─── Partner ─────────────────────────────────────────────────────────────────

async function upsertPartner(admin, chefId: string, suffix: string): Promise<string> {
  const partnerName = 'TEST - E2E Airbnb Host'
  const { data: existing } = await admin
    .from('referral_partners')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('name', partnerName)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('referral_partners')
    .insert({
      tenant_id: chefId,
      name: partnerName,
      partner_type: 'airbnb_host',
      status: 'active',
      contact_name: 'E2E Partner Contact',
      email: `e2e.partner.${suffix}@chefflow.test`,
      phone: '617-555-9030',
      description: 'Automated E2E test partner. Safe to ignore.',
      is_showcase_visible: false,
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[e2e-seed] Failed to insert partner: ${error?.message}`)
  return inserted.id as string
}

async function upsertPartnerLocation(admin, chefId: string, partnerId: string): Promise<string> {
  const locationName = 'TEST - E2E Beach House'
  const { data: existing } = await admin
    .from('partner_locations')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('name', locationName)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('partner_locations')
    .insert({
      tenant_id: chefId,
      partner_id: partnerId,
      name: locationName,
      address: '42 Ocean Drive',
      city: 'Cape Cod',
      state: 'MA',
      zip: '02601',
      description: 'Automated E2E test location. Beachfront property.',
      max_guest_count: 12,
      is_active: true,
    })
    .select('id')
    .single()

  if (error || !inserted)
    throw new Error(`[e2e-seed] Failed to insert partner location: ${error?.message}`)
  return inserted.id as string
}

async function ensurePartnerAuth(admin, partnerId: string, authUserId: string) {
  // Link the auth user to the partner record (mimics invite claim flow)
  const { error } = await admin
    .from('referral_partners')
    .update({
      auth_user_id: authUserId,
      claimed_at: new Date().toISOString(),
      invite_token: null,
    })
    .eq('id', partnerId)

  if (error) throw new Error(`[e2e-seed] Failed to link partner auth: ${error.message}`)
}

async function ensurePartnerRole(admin, authUserId: string, partnerId: string) {
  const { error } = await admin
    .from('user_roles')
    .upsert(
      { auth_user_id: authUserId, role: 'partner', entity_id: partnerId },
      { onConflict: 'auth_user_id' }
    )
  if (error) throw new Error(`[e2e-seed] Failed to upsert partner role: ${error.message}`)
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function seedE2EData(): Promise<SeedResult> {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  assertRemoteTestAllowed(supabaseUrl)

  const admin = createAdminClient(supabaseUrl, serviceRoleKey)
  const suffix = getIsolationSuffix()

  console.log(`[e2e-seed] Seeding for suffix: ${suffix}`)

  // 1. Chef
  const chefAuth = await ensureAuthUser(admin, {
    email: `e2e.chef.${suffix}@chefflow.test`,
    password: 'E2eChefTest!2026',
    metadata: { role: 'chef', e2e: true, suffix },
  })
  const chefId = await upsertChef(admin, chefAuth.id, suffix)
  await ensureChefRole(admin, chefAuth.id, chefId)
  await ensureChefPreferences(admin, chefId)

  // 2. Primary client (has auth user for client-portal tests)
  const clientAuth = await ensureAuthUser(admin, {
    email: `e2e.client.${suffix}@chefflow.test`,
    password: 'E2eClientTest!2026',
    metadata: { role: 'client', e2e: true, suffix },
  })
  const primaryClientId = await upsertPrimaryClient(admin, clientAuth.id, chefId, suffix)
  await ensureClientRole(admin, clientAuth.id, primaryClientId)

  // 3. Additional clients (no auth users — chef-created)
  // Valid client_status enum: active, dormant, repeat_ready, vip
  const secondaryClientId = await upsertExtraClient(
    admin,
    chefId,
    'TEST - Bob E2E',
    `e2e.bob.${suffix}@chefflow.test`,
    'vip'
  )
  const dormantClientId = await upsertExtraClient(
    admin,
    chefId,
    'TEST - Carol E2E',
    `e2e.carol.${suffix}@chefflow.test`,
    'dormant'
  )
  const standardClientId = await upsertExtraClient(
    admin,
    chefId,
    'TEST - Dave E2E',
    `e2e.dave.${suffix}@chefflow.test`,
    'active'
  )

  // 4. Inquiries
  const awaitingChefId = await ensureInquiry(
    admin,
    chefId,
    primaryClientId,
    'TEST E2E inquiry awaiting chef response — anniversary dinner request for 6 guests.',
    'awaiting_chef',
    'chef'
  )
  const awaitingClientId = await ensureInquiry(
    admin,
    chefId,
    secondaryClientId,
    'TEST E2E inquiry awaiting client response — proposal has been sent.',
    'awaiting_client',
    'client'
  )

  // 5. Events across FSM states (inserted directly bypassing Stripe for paid/confirmed)
  const draftEventId = await ensureEvent(
    admin,
    chefId,
    primaryClientId,
    'TEST Draft Birthday Dinner',
    'draft',
    45,
    awaitingChefId
  )
  const proposedEventId = await ensureEvent(
    admin,
    chefId,
    secondaryClientId,
    'TEST Proposed Anniversary',
    'proposed',
    30
  )
  const paidEventId = await ensureEvent(
    admin,
    chefId,
    dormantClientId,
    'TEST Paid Tasting',
    'paid',
    20
  )
  const confirmedEventId = await ensureEvent(
    admin,
    chefId,
    standardClientId,
    'TEST Confirmed Wedding Dinner',
    'confirmed',
    15
  )
  const completedEventId = await ensureEvent(
    admin,
    chefId,
    primaryClientId,
    'TEST Completed New Years Dinner',
    'completed',
    -30
  )

  // Link inquiry to draft event
  await admin
    .from('inquiries')
    .update({ converted_to_event_id: draftEventId })
    .eq('id', awaitingChefId)

  // 6. Quotes
  const draftQuoteId = await ensureQuote(
    admin,
    chefId,
    primaryClientId,
    awaitingChefId,
    null,
    'draft',
    74000,
    14
  )
  const sentQuoteId = await ensureQuote(
    admin,
    chefId,
    secondaryClientId,
    awaitingClientId,
    null,
    'sent',
    93000,
    7
  )
  const acceptedQuoteId = await ensureQuote(
    admin,
    chefId,
    dormantClientId,
    null,
    paidEventId,
    'accepted',
    50000,
    60
  )

  // 7. Ledger entries
  await ensureLedgerEntry(
    admin,
    chefId,
    dormantClientId,
    paidEventId,
    'deposit',
    12500,
    'TEST - Deposit received',
    chefAuth.id
  )
  await ensureLedgerEntry(
    admin,
    chefId,
    primaryClientId,
    completedEventId,
    'final_payment',
    120000,
    'TEST - Final payment received',
    chefAuth.id,
    30
  )

  // 8. Expenses on completed event
  await ensureExpense(
    admin,
    chefId,
    completedEventId,
    'groceries',
    18750,
    'TEST - Whole Foods groceries'
  )
  await ensureExpense(admin, chefId, completedEventId, 'equipment', 5000, 'TEST - Linen rental')

  // 9. Menu + dishes
  const menuId = await ensureMenu(admin, chefId)

  // 10. Recipe
  const recipeId = await ensureRecipe(admin, chefId, chefAuth.id)

  // 11. Chef B — second independent tenant for multi-tenant isolation tests
  const chefBAuth = await ensureAuthUser(admin, {
    email: `e2e.chef-b.${suffix}@chefflow.test`,
    password: 'E2eChefTest!2026',
    metadata: { role: 'chef', e2e: true, suffix, label: 'b' },
  })
  const chefBId = await upsertChefB(admin, chefBAuth.id, suffix)
  await ensureChefRole(admin, chefBAuth.id, chefBId)
  await ensureChefPreferences(admin, chefBId)
  const chefBClientId = await upsertExtraClient(
    admin,
    chefBId,
    'TEST - Chef B Client E2E',
    `e2e.chef-b-client.${suffix}@chefflow.test`,
    'active'
  )
  const chefBEventId = await ensureEvent(
    admin,
    chefBId,
    chefBClientId,
    'TEST Chef B Private Dinner',
    'confirmed',
    15
  )

  // 12. Staff — test staff member with portal login + kiosk PIN
  const staffEmail = `e2e.staff.${suffix}@chefflow.test`
  const staffPassword = 'E2eStaffTest!2026'
  const staffKioskPin = '1234'
  const staffAuth = await ensureAuthUser(admin, {
    email: staffEmail,
    password: staffPassword,
    metadata: { role: 'staff', e2e: true, suffix },
  })
  const staffId = await upsertStaffMember(admin, chefId, suffix)
  await ensureStaffRole(admin, staffAuth.id, staffId)
  await setStaffKioskPin(admin, staffId, staffKioskPin)
  // Update the email on the staff_members row to match the auth user
  await admin.from('staff_members').update({ email: staffEmail }).eq('id', staffId)

  // 13. Partner — test referral partner with portal login
  const partnerEmail = `e2e.partner.${suffix}@chefflow.test`
  const partnerPassword = 'E2ePartnerTest!2026'
  const partnerAuth = await ensureAuthUser(admin, {
    email: partnerEmail,
    password: partnerPassword,
    metadata: { role: 'partner', e2e: true, suffix },
  })
  const partnerId = await upsertPartner(admin, chefId, suffix)
  const partnerLocationId = await upsertPartnerLocation(admin, chefId, partnerId)
  await ensurePartnerAuth(admin, partnerId, partnerAuth.id)
  await ensurePartnerRole(admin, partnerAuth.id, partnerId)

  const result: SeedResult = {
    chefId,
    chefAuthId: chefAuth.id,
    chefEmail: `e2e.chef.${suffix}@chefflow.test`,
    chefPassword: 'E2eChefTest!2026',
    chefSlug: `e2e-chef-${suffix}`,
    clientId: primaryClientId,
    clientAuthId: clientAuth.id,
    clientEmail: `e2e.client.${suffix}@chefflow.test`,
    clientPassword: 'E2eClientTest!2026',
    clientIds: {
      primary: primaryClientId,
      secondary: secondaryClientId,
      dormant: dormantClientId,
      standard: standardClientId,
    },
    inquiryIds: { awaitingChef: awaitingChefId, awaitingClient: awaitingClientId },
    eventIds: {
      draft: draftEventId,
      proposed: proposedEventId,
      paid: paidEventId,
      confirmed: confirmedEventId,
      completed: completedEventId,
    },
    quoteIds: { draft: draftQuoteId, sent: sentQuoteId, accepted: acceptedQuoteId },
    menuId,
    recipeId,
    chefBId,
    chefBEmail: `e2e.chef-b.${suffix}@chefflow.test`,
    chefBPassword: 'E2eChefTest!2026',
    chefBEventId,
    chefBClientId,
    staffId,
    staffAuthId: staffAuth.id,
    staffEmail,
    staffPassword,
    staffKioskPin,
    partnerId,
    partnerAuthId: partnerAuth.id,
    partnerEmail,
    partnerPassword,
    partnerLocationId,
  }

  console.log(
    `[e2e-seed] Complete — chef: ${result.chefEmail}, client: ${result.clientEmail}, staff: ${result.staffEmail}, partner: ${result.partnerEmail}`
  )
  return result
}
