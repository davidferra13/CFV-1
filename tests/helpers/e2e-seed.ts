// @ts-nocheck
// E2E Remote Seed — creates comprehensive test data against remote database
// Called from tests/helpers/global-setup.ts and scripts/seed-e2e-remote.ts (CLI)
// All data namespaced under *@chefflow.test emails to isolate from real chef data

import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/db/admin'
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
  clientActionTestIds: {
    proposedEventId: string
    paidEventId: string
    sentQuoteId: string
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

const CANONICAL_SUFFIX = 'canonical'

const JOY = {
  fullName: 'Joy (Test User)',
  preferredName: 'Joy',
  email: 'emma@northandpine.co',
  password: 'E2eClientTest!2026',
  phone: '617-482-3149',
} as const

const JOY_INQUIRIES = {
  awaitingChef: {
    sourceMessage:
      "Hi Chef Maren, I'm planning a 10-person birthday dinner for June 6 at my place in the South End. I'd love a coastal Mediterranean menu with one vegetarian option, low sesame exposure, and a relaxed plated pace. Budget is around $2,400 before wine.",
    status: 'awaiting_chef',
    nextActionBy: 'chef',
    confirmed_date_offset_days: 45,
    confirmed_guest_count: 10,
    confirmed_location: 'South End, Boston, MA',
    confirmed_occasion: 'Birthday Weekend Dinner',
    confirmed_budget_cents: 240000,
    confirmed_dietary_restrictions: ['pescatarian', 'vegetarian option'],
    confirmed_service_expectations: 'Relaxed plated dinner with a welcome bite and one interactive course',
  },
  awaitingClient: {
    sourceMessage:
      "Thank you for the anniversary menu ideas. My parents love seafood and simple Italian flavors, but I'd like to keep the pacing comfortable for an older crowd. Can you send a revised proposal closer to $1,850 with dessert plated individually?",
    status: 'awaiting_client',
    nextActionBy: 'client',
    confirmed_date_offset_days: 30,
    confirmed_guest_count: 8,
    confirmed_location: 'Back Bay, Boston, MA',
    confirmed_occasion: "Parents' Anniversary Supper",
    confirmed_budget_cents: 185000,
    confirmed_dietary_restrictions: ['light dairy'],
    confirmed_service_expectations: 'Family-style starters, plated entree and dessert',
  },
} as const

const JOY_EVENTS = {
  draft: {
    occasion: 'Birthday Weekend Dinner',
    status: 'draft',
    daysOut: 45,
    serve_time: '19:00:00',
    guest_count: 10,
    service_style: 'plated',
    location_address: '18 Worcester Square',
    location_city: 'Boston',
    location_state: 'MA',
    location_zip: '02118',
    special_requests:
      'Warm, candlelit birthday dinner with a seafood-forward menu, one vegetarian plate, and an easy dessert course for mixed ages.',
    quoted_price_cents: 240000,
    pricing_model: 'flat_rate',
    deposit_amount_cents: 60000,
    pricing_notes: 'Includes plated service, table reset, and printed menu cards.',
    kitchen_notes: 'Single oven runs hot. Keep one burner open for coffee service.',
    site_notes: 'Street parking is easiest on Worcester Square after 6 PM.',
    client_journey_note: 'Joy is comparing two date options and wants a confident menu recommendation.',
    ambiance_notes: 'Low-light dinner, jazz playlist, soft floral styling.',
  },
  proposed: {
    occasion: "Parents' Anniversary Supper",
    status: 'proposed',
    daysOut: 30,
    serve_time: '18:30:00',
    guest_count: 8,
    service_style: 'family_style',
    location_address: '18 Worcester Square',
    location_city: 'Boston',
    location_state: 'MA',
    location_zip: '02118',
    special_requests:
      'Keep the pacing gentle for Joy’s parents, lean into seafood and bright Italian flavors, and plate dessert individually.',
    quoted_price_cents: 185000,
    pricing_model: 'flat_rate',
    deposit_amount_cents: 46250,
    pricing_notes: 'Menu revision requested around dessert pacing and overall spend.',
    kitchen_notes: 'Use the larger platters from the pantry cabinet for the starter spread.',
    site_notes: 'Buzz 2R if the front door is locked.',
    client_journey_note: 'Joy is refining a proposal and deciding between two dessert formats.',
    ambiance_notes: 'A polished family anniversary dinner with minimal interruptions.',
  },
  paid: {
    occasion: 'Design Team Offsite Dinner',
    status: 'paid',
    daysOut: 20,
    serve_time: '18:45:00',
    guest_count: 12,
    service_style: 'family_style',
    location_address: '18 Worcester Square',
    location_city: 'Boston',
    location_state: 'MA',
    location_zip: '02118',
    special_requests:
      'A warm, social dinner for Joy’s design leadership team with shared starters, a pescatarian main path, and thoughtful non-alcoholic pairings.',
    quoted_price_cents: 325000,
    pricing_model: 'flat_rate',
    deposit_amount_cents: 81250,
    payment_status: 'deposit_paid',
    pricing_notes: 'Deposit received. Final payment due three days before service.',
    kitchen_notes: 'Roof deck setup happens first, then service transitions indoors after sunset.',
    site_notes: 'Freight elevator access available after 4 PM through the side alley.',
    client_journey_note: 'Joy paid quickly once the team menu balanced pescatarian and dairy-light options.',
    ambiance_notes: 'Conversational team dinner with light workshop energy, no speeches.',
  },
  confirmed: {
    occasion: 'Rooftop Summer Kickoff',
    status: 'confirmed',
    daysOut: 15,
    serve_time: '19:15:00',
    guest_count: 14,
    service_style: 'tasting_menu',
    location_address: '18 Worcester Square',
    location_city: 'Boston',
    location_state: 'MA',
    location_zip: '02118',
    special_requests:
      'Confirmed rooftop dinner with a welcome spritz, one tableside crudo finish, and a polished but easy pace for a mixed friend group.',
    quoted_price_cents: 348000,
    pricing_model: 'flat_rate',
    deposit_amount_cents: 87000,
    payment_status: 'paid',
    pricing_notes: 'Fully paid and menu pending final approval.',
    kitchen_notes: 'Roof deck power is available, but wind picks up after sunset; keep hot courses plated indoors.',
    site_notes: 'Use the side entrance by the garden gate and bring one portable induction burner.',
    client_journey_note: 'Joy approved the overall shape of the night and is now reviewing final menu details.',
    ambiance_notes: 'Sunset rooftop dinner with bright citrus, Champagne, and a relaxed but elevated progression.',
  },
  completed: {
    occasion: 'March Supper Club',
    status: 'completed',
    daysOut: -30,
    serve_time: '19:00:00',
    guest_count: 9,
    service_style: 'plated',
    location_address: '18 Worcester Square',
    location_city: 'Boston',
    location_state: 'MA',
    location_zip: '02118',
    special_requests:
      'Monthly supper club for close friends with a crisp first course, a comforting main, and labeled leftovers for next-day lunches.',
    quoted_price_cents: 215000,
    pricing_model: 'flat_rate',
    deposit_amount_cents: 53750,
    payment_status: 'paid',
    pricing_notes: 'Closed out cleanly with an additional gratuity after service.',
    kitchen_notes: 'Leave one shelf open in the fridge for labeled leftovers and dessert components.',
    site_notes: 'Kitchen reset should include compost separation and glass storage containers.',
    client_journey_note: 'This dinner cemented Joy as a repeat client with strong referral potential.',
    ambiance_notes: 'Intimate supper club energy with thoughtful plating and a calm finish.',
  },
} as const

const JOY_QUOTES = {
  draft: {
    quote_name: 'Birthday Weekend Dinner Proposal',
    total_quoted_cents: 240000,
    valid_until_days: 14,
    pricing_notes: 'Seafood-forward plated dinner with printed menu cards and kitchen reset.',
    chef_message:
      'I leaned into bright coastal flavors, one vegetarian course, and a low-stress birthday flow that still feels celebratory.',
  },
  sent: {
    quote_name: "Parents' Anniversary Supper Proposal",
    total_quoted_cents: 185000,
    valid_until_days: 7,
    pricing_notes: 'Family-style starters with plated entree and individual dessert service.',
    chef_message:
      'This version trims the price without losing the pacing and hospitality your parents will feel right away.',
  },
  accepted: {
    quote_name: 'Design Team Offsite Dinner Proposal',
    total_quoted_cents: 325000,
    valid_until_days: 60,
    pricing_notes: 'Shared courses, thoughtful NA pairings, and light rooftop setup support.',
    chef_message:
      'Built for a welcoming team dinner that still feels special enough to anchor the offsite.',
  },
} as const

const JOY_CLIENT_TAGS = ['test-account', 'canonical-client', 'client-portal'] as const

const JOY_FUN_QA = {
  time_travel_meal:
    'A long 1970s seaside lunch in southern Italy with my grandmother, anchovies, citrus, bitter greens, and a cold bottle of Verdicchio.',
  last_meal: 'Oysters, lemon pasta, grilled fish, olive oil cake, and a very cold glass of Champagne.',
  trash_food: 'McDonald’s fries eaten in the car before anyone notices.',
  sweet_or_savory: 'Savory wins almost every time, but a warm salted chocolate chip cookie still gets me.',
  prove_yourself: 'A flawless crudo followed by something comforting with browned butter and herbs.',
  food_you_hate: 'Over-truffled anything.',
  midnight_snack: 'Ricotta toast with chili crisp and flaky salt.',
  dinner_vibe: 'Cozy dinner party with a little room for chaos once dessert lands.',
  dream_menu_theme: 'Seafood night with bright citrus, shaved fennel, and a big grilled centerpiece.',
  obsessed_ingredient: 'Preserved lemon.',
  best_meal_ever:
    'A tiny omakase counter in Tokyo where every bite felt deliberate and the room went totally quiet between courses.',
  meal_preference: 'Dinner, always.',
} as const

function assertRemoteTestAllowed(url: string) {
  const isLocalTarget = /127\.0\.0\.1|localhost/.test(url)

  if (isLocalTarget) {
    if (process.env.DATABASE_E2E_ALLOW_LOCAL !== 'true') {
      throw new Error(
        '[e2e-seed] Local E2E seed refused.\n' +
          'Add DATABASE_E2E_ALLOW_LOCAL=true to your environment to proceed.\n' +
          'This guard prevents accidental seeding against the wrong local database.'
      )
    }
    return
  }

  if (process.env.DATABASE_E2E_ALLOW_REMOTE !== 'true') {
    throw new Error(
      '[e2e-seed] Remote E2E seed refused.\n' +
        'Add DATABASE_E2E_ALLOW_REMOTE=true to .env.local to proceed.\n' +
        'This guard prevents accidental seeding against the production database.'
    )
  }
  if (!url.includes('db.co') && !url.includes('db.in')) {
    throw new Error(
      `[e2e-seed] Expected remote database URL (*.db.co), got: ${url}.\n` +
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
  return CANONICAL_SUFFIX
}

function daysFromNow(days: number): string {
  const _d = new Date()
  const date = new Date(_d.getFullYear(), _d.getMonth(), _d.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isoFromNow(days: number, hour = 12, minute = 0): string {
  const _d = new Date()
  const date = new Date(_d.getFullYear(), _d.getMonth(), _d.getDate() + days, hour, minute, 0, 0)
  return date.toISOString()
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableAdminAuthError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('too many clients already') ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('terminating connection') ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('network')
  )
}

async function runAdminAuthOperation(label: string, operation: () => Promise<any>) {
  const maxAttempts = 6

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await operation()
    if (!result?.error) return result
    if (!isRetryableAdminAuthError(result.error) || attempt === maxAttempts) return result

    const delayMs = attempt * 2000
    console.warn(
      `[e2e-seed] ${label} failed (${result.error.message}). Retrying in ${delayMs}ms...`
    )
    await sleep(delayMs)
  }

  return operation()
}

async function findAuthUserByEmail(admin, email: string) {
  const targetEmail = email.toLowerCase()
  const perPage = 200

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await runAdminAuthOperation(`list auth users page ${page}`, () =>
      admin.auth.admin.listUsers({ page, perPage })
    )

    if (error) throw new Error(`[e2e-seed] Failed to list auth users: ${error.message}`)

    const existing = data?.users?.find((user) => user.email?.toLowerCase() === targetEmail)
    if (existing) return existing
    if (!data?.users?.length || data.users.length < perPage) break
  }

  return null
}

// ─── Auth User ────────────────────────────────────────────────────────────────

function getMissingColumnName(error: any): string | null {
  const message = String(error?.message || '')
  const match = message.match(/could not find the '([^']+)' column/i)
  return match?.[1] ?? null
}

async function safeUpdateById(
  admin,
  table: string,
  id: string,
  payload: Record<string, unknown>,
  label: string,
  options: { allowImmutablePricing?: boolean } = {}
) {
  const nextPayload = { ...payload }

  while (true) {
    const { error } = await admin.from(table).update(nextPayload).eq('id', id)

    if (!error) return

    const missingColumn = getMissingColumnName(error)
    if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
      delete nextPayload[missingColumn]
      continue
    }

    if (options.allowImmutablePricing && isImmutableEventPricingError(error)) {
      console.warn(`[e2e-seed] Warning: Skipping immutable pricing update for ${label} (${id}).`)
      return
    }

    throw new Error(`[e2e-seed] Failed to update ${label}: ${error.message}`)
  }
}

async function ensureAuthUser(
  admin,
  input: { email: string; password: string; metadata: Record<string, unknown> }
): Promise<{ id: string; email: string }> {
  const { data: created, error: createError } = await runAdminAuthOperation(
    `create auth user ${input.email}`,
    () =>
      admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: input.metadata,
      })
  )

  if (!createError && created?.user) {
    return { id: created.user.id, email: created.user.email! }
  }

  const createMessage = String(createError?.message || '').toLowerCase()
  const alreadyExists =
    createMessage.includes('already been registered') ||
    createMessage.includes('user already registered') ||
    createMessage.includes('already exists') ||
    (createMessage.includes('duplicate key') && createMessage.includes('users_email_key'))

  if (!alreadyExists) {
    throw new Error(`[e2e-seed] Failed to create ${input.email}: ${createError?.message}`)
  }

  const existing = await findAuthUserByEmail(admin, input.email)

  if (!existing) {
    throw new Error(`[e2e-seed] Could not locate existing auth user for ${input.email}`)
  }

  const { error: updateError } = await runAdminAuthOperation(`update auth user ${input.email}`, () =>
    admin.auth.admin.updateUserById(existing.id, {
      password: input.password,
      email_confirm: true,
      user_metadata: input.metadata,
    })
  )

  if (updateError) {
    throw new Error(`[e2e-seed] Failed to update ${input.email}: ${updateError.message}`)
  }

  return { id: existing.id, email: existing.email! }
}

// ─── Chef ─────────────────────────────────────────────────────────────────────

async function upsertChef(admin, authUserId: string, suffix: string): Promise<string> {
  const slug = `harbor-hearth-${suffix}`
  const fields = {
    business_name: 'Harbor & Hearth',
    display_name: 'Chef Maren Ellis',
    email: `e2e.chef.${suffix}@chefflow.test`,
    phone: '617-555-9001',
    slug,
    tagline: 'Coastal, ingredient-first private dining for intimate gatherings.',
    bio: 'Private chef specializing in seasonal New England menus, polished plated service, and relaxed but precise dinner pacing.',
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
  const legacyPrimaryEmail = `e2e.client.${suffix}@chefflow.test`
  const legacyPrimaryNames = [JOY.fullName, 'TEST - Alice E2E']

  const { data: existingByAuth } = await admin
    .from('clients')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  let continuityClientId = existingByAuth?.id ?? null

  if (!continuityClientId) {
    const { data: canonicalByName } = await admin
      .from('clients')
      .select('id')
      .eq('tenant_id', chefId)
      .in('full_name', legacyPrimaryNames)
      .limit(1)

    continuityClientId = canonicalByName?.[0]?.id ?? null
  }

  if (!continuityClientId) {
    const { data: canonicalByEmail } = await admin
      .from('clients')
      .select('id')
      .eq('tenant_id', chefId)
      .in('email', [JOY.email, legacyPrimaryEmail])
      .limit(1)

    continuityClientId = canonicalByEmail?.[0]?.id ?? null
  }

  const fields = {
    tenant_id: chefId,
    full_name: JOY.fullName,
    preferred_name: JOY.preferredName,
    email: JOY.email,
    phone: JOY.phone,
    preferred_contact_method: 'text',
    status: 'repeat_ready',
    referral_source: 'referral',
    referral_source_detail: 'Referred after a South End supper club',
    partner_name: 'Maya',
    children: ['Noah (6)'],
    dietary_restrictions: ['pescatarian'],
    dietary_protocols: ['low sesame exposure', 'light dairy'],
    allergies: ['sesame'],
    dislikes: ['raw onion', 'heavy truffle oil'],
    spice_tolerance: 'medium',
    favorite_cuisines: ['Mediterranean', 'Japanese', 'New American'],
    favorite_dishes: ['crudo', 'lemon pasta', 'charred broccolini', 'olive oil cake'],
    wine_beverage_preferences:
      'Champagne to start, crisp whites with seafood, and low-ABV cocktails when the guest mix is broad.',
    address: '18 Worcester Square, Boston, MA 02118',
    parking_instructions: 'Street parking is easiest on Worcester Square after 6 PM. Text when you are 10 minutes out.',
    access_instructions: 'Use the side entrance by the garden gate. Buzz 2R if the front door is locked.',
    kitchen_size: 'Medium galley kitchen',
    kitchen_constraints: 'Single oven runs hot by about 15 degrees and counter space is tight near the stove.',
    house_rules:
      'Please leave one burner free for coffee service and keep the terracotta serving bowls on the island.',
    equipment_available: [
      'All-Clad saute pans',
      'Vitamix',
      'Immersion blender',
      '12 dinner plates',
      'Wine glasses',
    ],
    equipment_must_bring: ['fish tweezers', 'ring molds', 'portable induction burner'],
    vibe_notes:
      'Joy hosts intimate, design-forward dinners with calm pacing, one interactive moment, and polished but unfussy service.',
    payment_behavior: 'Usually pays deposits same day once the menu direction is clear.',
    tipping_pattern: 'Typically adds 20-22% after smooth service.',
    farewell_style: 'Likes a quick kitchen recap and a short next-morning text with leftover notes.',
    what_they_care_about:
      'Seasonality, pacing, balanced plating, low-friction hosting, and subtle but memorable details.',
    personal_milestones: [
      { date: '2026-06-06', label: 'Birthday weekend dinner' },
      { date: '2026-09-28', label: 'Anniversary dinner tradition' },
    ],
    lifetime_value_cents: 985000,
    total_events_count: 5,
    average_spend_cents: 197000,
    loyalty_points: 210,
    total_payments_received_cents: 985000,
    first_event_date: daysFromNow(-180),
    last_event_date: daysFromNow(-30),
    total_guests_served: 42,
    total_events_completed: 4,
    loyalty_tier: 'gold',
    family_notes:
      'Maya handles florals and guest flow. Noah likes plain butter noodles and strawberries if a family meal is involved.',
    fun_qa_answers: JOY_FUN_QA,
    availability_signal_notifications: true,
    kitchen_oven_notes: 'Runs a little hot on convection.',
    kitchen_burner_notes: 'Front-right burner is strongest; avoid crowding the back-left simmer burner.',
    kitchen_counter_notes: 'Prep on the island whenever possible.',
    kitchen_refrigeration_notes: 'Leave one shelf open for labeled leftovers.',
    kitchen_plating_notes: 'Best plating space is the dining table console behind the kitchen.',
    kitchen_sink_notes: 'Deep sink on the left side; compost caddy stays underneath.',
    kitchen_profile_updated_at: new Date().toISOString(),
    nda_active: false,
    photo_permission: 'portfolio_only',
    instagram_handle: 'joyathome',
    occupation: 'Product Design Director',
    company_name: 'North & Pine Studio',
    birthday: '1989-09-14',
    anniversary: '2022-09-28',
    pets: [{ name: 'Poppy', type: 'cavapoo' }],
    gate_code: '1820#',
    wifi_password: 'WorcesterGuest',
    security_notes: 'Building door auto-locks after 7 PM; concierge may call up first.',
    preferred_service_style: 'plated with shared starters',
    typical_guest_count: '6-10',
    preferred_event_days: ['Friday', 'Saturday'],
    budget_range_min_cents: 180000,
    budget_range_max_cents: 350000,
    cleanup_expectations: 'Full kitchen reset, compost separated, and leftovers labeled by date.',
    leftovers_preference: 'Portion leftovers into glass containers and leave one host plate for next-day lunch.',
    has_dishwasher: true,
    outdoor_cooking_notes: 'Roof deck has power but no gas line; wind picks up after sunset.',
    nearest_grocery_store: 'Whole Foods on Harrison Ave',
    water_quality_notes: 'Filtered tap water is fine for cooking; sparkling water is stocked in the pantry.',
    available_place_settings: 12,
    formality_level: 'semi_formal',
    communication_style_notes: 'Prefers concise texts during the day and one thorough email for menu revisions.',
    complaint_handling_notes: 'Wants clear options and a recommendation, not a long apology.',
    wow_factors: 'Tableside crudo finish, printed menu cards, citrus-and-herb welcome bite.',
    referral_potential: 'high',
    red_flags: 'Sensitive to arrival windows; confirm timing clearly if there is traffic risk.',
    acquisition_cost_cents: 0,
    referral_code: 'JOYHOSTS',
    important_dates: [
      { date: '2026-06-06', label: 'Birthday dinner' },
      { date: '2026-09-28', label: 'Anniversary' },
    ],
    onboarding_completed_at: new Date().toISOString(),
    communication_preference: {
      daytime: 'text',
      planning: 'email',
      urgent: 'text',
    },
    automated_emails_enabled: true,
  }

  if (continuityClientId) {
    await admin
      .from('clients')
      .update({ auth_user_id: authUserId, ...fields })
      .eq('id', continuityClientId)
    return continuityClientId as string
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
  nextActionBy: string,
  overrides: Record<string, unknown> = {}
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

  const inquiryPayload = {
    tenant_id: chefId,
    client_id: clientId,
    channel: 'website',
    status,
    source_message: sourceMessage,
    confirmed_date: new Date(`${daysFromNow(35)}T00:00:00.000Z`).toISOString(),
    confirmed_guest_count: 6,
    confirmed_location: 'Beacon Hill, Boston, MA',
    confirmed_occasion: 'Private Dinner',
    confirmed_budget_cents: 150000,
    unknown_fields: JSON.stringify([]),
    next_action_required: 'Review and respond',
    next_action_by: nextActionBy,
    first_contact_at: new Date().toISOString(),
    last_response_at: new Date().toISOString(),
    ...overrides,
  }

  const { data: inserted, error } = await admin
    .from('inquiries')
    .insert(inquiryPayload)
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
  inquiryId?: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const quotedPriceCents = 120000
  const depositAmountCents = 30000
  const basePayload: Record<string, unknown> = {
    client_id: clientId,
    inquiry_id: inquiryId ?? null,
    event_date: daysFromNow(daysOut),
    serve_time: '18:30:00',
    guest_count: 6,
    occasion,
    location_address: '100 Test Street',
    location_city: 'Boston',
    location_state: 'MA',
    location_zip: '02101',
    status,
    service_style: 'plated',
    special_requests: 'Please confirm menu timing and arrival window.',
    quoted_price_cents: quotedPriceCents,
    pricing_model: 'flat_rate',
    deposit_amount_cents: depositAmountCents,
    ...overrides,
  }

  const { data: existing } = await admin
    .from('events')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq('occasion', occasion)
    .maybeSingle()

  if (existing?.id) {
    const eventPayload: Record<string, unknown> = {
      ...basePayload,
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
      ...basePayload,
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
  validUntilDays: number,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const lookupField = eventId ? 'event_id' : 'inquiry_id'
  const lookupId = eventId ?? inquiryId
  const quotePayloadBase: Record<string, unknown> = {
    quote_name: `Proposal (${status})`,
    pricing_model: 'flat_rate',
    total_quoted_cents: totalCents,
    deposit_required: true,
    deposit_amount_cents: Math.floor(totalCents * 0.25),
    status,
    valid_until: daysFromNow(validUntilDays),
    inquiry_id: inquiryId,
    event_id: eventId,
    ...overrides,
  }
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
      ...quotePayloadBase,
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
      ...quotePayloadBase,
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

async function upsertClientTag(admin, chefId: string, clientId: string, tag: string) {
  const { error } = await admin.from('client_tags').upsert(
    {
      tenant_id: chefId,
      client_id: clientId,
      tag,
    },
    { onConflict: 'client_id,tag' }
  )

  if (error) throw new Error(`[e2e-seed] Failed to upsert client tag (${tag}): ${error.message}`)
}

async function upsertClientNote(
  admin,
  chefId: string,
  clientId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('client_notes')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq('note_text', payload.note_text)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin.from('client_notes').update(payload).eq('id', existing.id)
    if (error) throw new Error(`[e2e-seed] Failed to refresh client note: ${error.message}`)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('client_notes')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert client note: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertMessage(
  admin,
  chefId: string,
  clientId: string,
  payload: Record<string, unknown>
) {
  let query = admin
    .from('messages')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq('channel', payload.channel)
    .eq('direction', payload.direction)
    .eq('body', payload.body)

  query =
    payload.subject == null ? query.is('subject', null) : query.eq('subject', payload.subject)
  query =
    payload.event_id == null ? query.is('event_id', null) : query.eq('event_id', payload.event_id)
  query =
    payload.inquiry_id == null
      ? query.is('inquiry_id', null)
      : query.eq('inquiry_id', payload.inquiry_id)

  const { data: existing } = await query.maybeSingle()

  if (existing?.id) {
    const { error } = await admin.from('messages').update(payload).eq('id', existing.id)
    if (error) throw new Error(`[e2e-seed] Failed to refresh message: ${error.message}`)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('messages')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert message: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertTasteProfile(
  admin,
  chefId: string,
  clientId: string,
  payload: Record<string, unknown>
) {
  const { error } = await admin.from('client_taste_profiles').upsert(
    {
      tenant_id: chefId,
      client_id: clientId,
      ...payload,
    },
    { onConflict: 'client_id,tenant_id' }
  )

  if (error) throw new Error(`[e2e-seed] Failed to upsert taste profile: ${error.message}`)
}

async function upsertClientMealRequest(
  admin,
  chefId: string,
  clientId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('client_meal_requests')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq('request_type', payload.request_type)
    .eq('dish_name', payload.dish_name)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin.from('client_meal_requests').update(payload).eq('id', existing.id)
    if (error) throw new Error(`[e2e-seed] Failed to refresh meal request: ${error.message}`)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('client_meal_requests')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert meal request: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertRecurringRecommendation(
  admin,
  chefId: string,
  clientId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('recurring_menu_recommendations')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('client_id', clientId)
    .eq('recommendation_text', payload.recommendation_text)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin
      .from('recurring_menu_recommendations')
      .update(payload)
      .eq('id', existing.id)
    if (error) {
      throw new Error(`[e2e-seed] Failed to refresh recurring recommendation: ${error.message}`)
    }
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('recurring_menu_recommendations')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert recurring recommendation: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertRecurringService(
  admin,
  chefId: string,
  clientId: string,
  payload: Record<string, unknown>
) {
  const normalizedPayload = {
    ...payload,
    day_of_week: Array.isArray(payload.day_of_week)
      ? JSON.stringify(payload.day_of_week)
      : payload.day_of_week,
  }

  const { data: existing } = await admin
    .from('recurring_services')
    .select('id')
    .eq('chef_id', chefId)
    .eq('client_id', clientId)
    .eq('service_type', payload.service_type)
    .eq('start_date', payload.start_date)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin
      .from('recurring_services')
      .update(normalizedPayload)
      .eq('id', existing.id)
    if (error) throw new Error(`[e2e-seed] Failed to refresh recurring service: ${error.message}`)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('recurring_services')
    .insert({
      chef_id: chefId,
      client_id: clientId,
      ...normalizedPayload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert recurring service: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertServedDishHistory(
  admin,
  chefId: string,
  clientId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('served_dish_history')
    .select('id')
    .eq('chef_id', chefId)
    .eq('client_id', clientId)
    .eq('dish_name', payload.dish_name)
    .eq('served_date', payload.served_date)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin.from('served_dish_history').update(payload).eq('id', existing.id)
    if (error) throw new Error(`[e2e-seed] Failed to refresh served dish history: ${error.message}`)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('served_dish_history')
    .insert({
      chef_id: chefId,
      client_id: clientId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert served dish history: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertClientReview(
  admin,
  chefId: string,
  clientId: string,
  eventId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('client_reviews')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin.from('client_reviews').update(payload).eq('id', existing.id)
    if (error) throw new Error(`[e2e-seed] Failed to refresh client review: ${error.message}`)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('client_reviews')
    .insert({
      tenant_id: chefId,
      client_id: clientId,
      event_id: eventId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert client review: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertClientSatisfactionSurvey(
  admin,
  chefId: string,
  clientId: string,
  eventId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('client_satisfaction_surveys')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin
      .from('client_satisfaction_surveys')
      .update(payload)
      .eq('id', existing.id)
    if (error) {
      throw new Error(`[e2e-seed] Failed to refresh client satisfaction survey: ${error.message}`)
    }
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('client_satisfaction_surveys')
    .insert({
      chef_id: chefId,
      client_id: clientId,
      event_id: eventId,
      token: randomUUID(),
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(
      `[e2e-seed] Failed to insert client satisfaction survey: ${error?.message}`
    )
  }

  return inserted.id as string
}

async function upsertClientReferral(admin, chefId: string, payload: Record<string, unknown>) {
  const { data: existing } = await admin
    .from('client_referrals')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('referral_code', payload.referral_code)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin.from('client_referrals').update(payload).eq('id', existing.id)
    if (error) throw new Error(`[e2e-seed] Failed to refresh client referral: ${error.message}`)
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('client_referrals')
    .insert({
      tenant_id: chefId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert client referral: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertInquiryTransition(
  admin,
  chefId: string,
  inquiryId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('inquiry_state_transitions')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('inquiry_id', inquiryId)
    .eq('to_status', payload.to_status)
    .eq('reason', payload.reason)
    .maybeSingle()

  if (existing?.id) {
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('inquiry_state_transitions')
    .insert({
      tenant_id: chefId,
      inquiry_id: inquiryId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert inquiry transition: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertEventTransition(
  admin,
  chefId: string,
  eventId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('event_state_transitions')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('event_id', eventId)
    .eq('to_status', payload.to_status)
    .eq('reason', payload.reason)
    .maybeSingle()

  if (existing?.id) {
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('event_state_transitions')
    .insert({
      tenant_id: chefId,
      event_id: eventId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert event transition: ${error?.message}`)
  }

  return inserted.id as string
}

async function upsertQuoteTransition(
  admin,
  chefId: string,
  quoteId: string,
  payload: Record<string, unknown>
) {
  const { data: existing } = await admin
    .from('quote_state_transitions')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('quote_id', quoteId)
    .eq('to_status', payload.to_status)
    .eq('reason', payload.reason)
    .maybeSingle()

  if (existing?.id) {
    return existing.id as string
  }

  const { data: inserted, error } = await admin
    .from('quote_state_transitions')
    .insert({
      tenant_id: chefId,
      quote_id: quoteId,
      ...payload,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`[e2e-seed] Failed to insert quote transition: ${error?.message}`)
  }

  return inserted.id as string
}

async function ensureMenu(admin, chefId: string): Promise<string> {
  const { data: existing } = await admin
    .from('menus')
    .select('id')
    .eq('tenant_id', chefId)
    .eq('name', 'Coastal Spring Tasting Menu')
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('menus')
    .insert({
      tenant_id: chefId,
      name: 'Coastal Spring Tasting Menu',
      description: 'A bright, seafood-forward tasting menu built for Joy’s recurring dinner style.',
      is_template: true,
      status: 'draft',
      cuisine_type: 'Coastal Mediterranean',
      target_guest_count: 10,
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(`[e2e-seed] Failed to insert menu: ${error?.message}`)

  // Add 3 courses (dishes)
  const courses = [
    { course_number: 1, course_name: 'Citrus & Fennel Crudo' },
    { course_number: 2, course_name: 'Brown Butter Halibut' },
    { course_number: 3, course_name: 'Olive Oil Cake' },
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
    .eq('name', 'Lemon Butter Pasta with Herbs')
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: inserted, error } = await admin
    .from('recipes')
    .insert({
      tenant_id: chefId,
      name: 'Lemon Butter Pasta with Herbs',
      category: 'pasta',
      description: 'A weeknight-friendly pasta Joy regularly asks to repeat for smaller dinners.',
      method:
        'Cook pasta until al dente, finish with lemon zest, browned butter, herbs, and pasta water, then serve immediately.',
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
  const dbUrl = requireEnv('NEXT_PUBLIC_DB_URL')
  assertRemoteTestAllowed(dbUrl)

  const admin = createAdminClient()
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
    email: JOY.email,
    password: JOY.password,
    metadata: { role: 'client', e2e: true, suffix, canonical: true, label: 'joy' },
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
  const referredClientId = await upsertExtraClient(
    admin,
    chefId,
    'Julian Mercer',
    'julian@mercerhome.co',
    'active'
  )

  // 4. Menu + recipe assets Joy reuses across recurring work and proposals
  const menuId = await ensureMenu(admin, chefId)
  const recipeId = await ensureRecipe(admin, chefId, chefAuth.id)

  // 5. Inquiries
  const awaitingChefId = await ensureInquiry(
    admin,
    chefId,
    primaryClientId,
    JOY_INQUIRIES.awaitingChef.sourceMessage,
    JOY_INQUIRIES.awaitingChef.status,
    'chef'
  )
  const awaitingClientId = await ensureInquiry(
    admin,
    chefId,
    primaryClientId,
    JOY_INQUIRIES.awaitingClient.sourceMessage,
    JOY_INQUIRIES.awaitingClient.status,
    'client'
  )

  await admin
    .from('inquiries')
    .update({
      client_id: primaryClientId,
      channel: 'referral',
      status: JOY_INQUIRIES.awaitingChef.status,
      source_message: JOY_INQUIRIES.awaitingChef.sourceMessage,
      confirmed_date: isoFromNow(JOY_INQUIRIES.awaitingChef.confirmed_date_offset_days, 19, 0),
      confirmed_guest_count: JOY_INQUIRIES.awaitingChef.confirmed_guest_count,
      confirmed_location: JOY_INQUIRIES.awaitingChef.confirmed_location,
      confirmed_occasion: JOY_INQUIRIES.awaitingChef.confirmed_occasion,
      confirmed_budget_cents: JOY_INQUIRIES.awaitingChef.confirmed_budget_cents,
      confirmed_dietary_restrictions: JOY_INQUIRIES.awaitingChef.confirmed_dietary_restrictions,
      confirmed_service_expectations: JOY_INQUIRIES.awaitingChef.confirmed_service_expectations,
      next_action_required: 'Chef to send a confident menu direction and timing recommendation.',
      next_action_by: JOY_INQUIRIES.awaitingChef.nextActionBy,
      first_contact_at: isoFromNow(-21, 10, 15),
      last_response_at: isoFromNow(-20, 9, 40),
      contact_name: JOY.fullName,
      contact_email: JOY.email,
      contact_phone: JOY.phone,
      referral_source: 'client_referral',
      budget_range: '$2,000-$2,500',
      service_style_pref: 'plated',
      service_mode: 'one_off',
      unknown_fields: [],
    })
    .eq('id', awaitingChefId)

  await admin
    .from('inquiries')
    .update({
      client_id: primaryClientId,
      channel: 'email',
      status: JOY_INQUIRIES.awaitingClient.status,
      source_message: JOY_INQUIRIES.awaitingClient.sourceMessage,
      confirmed_date: isoFromNow(JOY_INQUIRIES.awaitingClient.confirmed_date_offset_days, 18, 30),
      confirmed_guest_count: JOY_INQUIRIES.awaitingClient.confirmed_guest_count,
      confirmed_location: JOY_INQUIRIES.awaitingClient.confirmed_location,
      confirmed_occasion: JOY_INQUIRIES.awaitingClient.confirmed_occasion,
      confirmed_budget_cents: JOY_INQUIRIES.awaitingClient.confirmed_budget_cents,
      confirmed_dietary_restrictions: JOY_INQUIRIES.awaitingClient.confirmed_dietary_restrictions,
      confirmed_service_expectations: JOY_INQUIRIES.awaitingClient.confirmed_service_expectations,
      next_action_required: 'Joy to choose the revised dessert format and approve the proposal.',
      next_action_by: JOY_INQUIRIES.awaitingClient.nextActionBy,
      first_contact_at: isoFromNow(-12, 11, 0),
      last_response_at: isoFromNow(-2, 16, 15),
      contact_name: JOY.fullName,
      contact_email: JOY.email,
      contact_phone: JOY.phone,
      referral_source: 'repeat_client',
      budget_range: '$1,700-$1,900',
      service_style_pref: 'family_style',
      service_mode: 'one_off',
      unknown_fields: [],
    })
    .eq('id', awaitingClientId)

  // 5. Events across FSM states (inserted directly bypassing Stripe for paid/confirmed)
  const draftEventId = await ensureEvent(
    admin,
    chefId,
    primaryClientId,
    JOY_EVENTS.draft.occasion,
    JOY_EVENTS.draft.status,
    JOY_EVENTS.draft.daysOut,
    awaitingChefId,
    {
      serve_time: JOY_EVENTS.draft.serve_time,
      guest_count: JOY_EVENTS.draft.guest_count,
      service_style: JOY_EVENTS.draft.service_style,
      location_address: JOY_EVENTS.draft.location_address,
      location_city: JOY_EVENTS.draft.location_city,
      location_state: JOY_EVENTS.draft.location_state,
      location_zip: JOY_EVENTS.draft.location_zip,
      dietary_restrictions: ['pescatarian', 'vegetarian option'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.draft.special_requests,
      quoted_price_cents: JOY_EVENTS.draft.quoted_price_cents,
      pricing_model: JOY_EVENTS.draft.pricing_model,
      deposit_amount_cents: JOY_EVENTS.draft.deposit_amount_cents,
    }
  )
  const proposedEventId = await ensureEvent(
    admin,
    chefId,
    primaryClientId,
    JOY_EVENTS.proposed.occasion,
    JOY_EVENTS.proposed.status,
    JOY_EVENTS.proposed.daysOut,
    awaitingClientId,
    {
      serve_time: JOY_EVENTS.proposed.serve_time,
      guest_count: JOY_EVENTS.proposed.guest_count,
      service_style: JOY_EVENTS.proposed.service_style,
      location_address: JOY_EVENTS.proposed.location_address,
      location_city: JOY_EVENTS.proposed.location_city,
      location_state: JOY_EVENTS.proposed.location_state,
      location_zip: JOY_EVENTS.proposed.location_zip,
      dietary_restrictions: ['light dairy'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.proposed.special_requests,
      quoted_price_cents: JOY_EVENTS.proposed.quoted_price_cents,
      pricing_model: JOY_EVENTS.proposed.pricing_model,
      deposit_amount_cents: JOY_EVENTS.proposed.deposit_amount_cents,
    }
  )
  const paidEventId = await ensureEvent(
    admin,
    chefId,
    primaryClientId,
    JOY_EVENTS.paid.occasion,
    JOY_EVENTS.paid.status,
    JOY_EVENTS.paid.daysOut,
    undefined,
    {
      serve_time: JOY_EVENTS.paid.serve_time,
      guest_count: JOY_EVENTS.paid.guest_count,
      service_style: JOY_EVENTS.paid.service_style,
      location_address: JOY_EVENTS.paid.location_address,
      location_city: JOY_EVENTS.paid.location_city,
      location_state: JOY_EVENTS.paid.location_state,
      location_zip: JOY_EVENTS.paid.location_zip,
      dietary_restrictions: ['pescatarian', 'light dairy'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.paid.special_requests,
      quoted_price_cents: JOY_EVENTS.paid.quoted_price_cents,
      pricing_model: JOY_EVENTS.paid.pricing_model,
      deposit_amount_cents: JOY_EVENTS.paid.deposit_amount_cents,
      payment_status: JOY_EVENTS.paid.payment_status,
    }
  )
  const confirmedEventId = await ensureEvent(
    admin,
    chefId,
    primaryClientId,
    JOY_EVENTS.confirmed.occasion,
    JOY_EVENTS.confirmed.status,
    JOY_EVENTS.confirmed.daysOut,
    undefined,
    {
      serve_time: JOY_EVENTS.confirmed.serve_time,
      guest_count: JOY_EVENTS.confirmed.guest_count,
      service_style: JOY_EVENTS.confirmed.service_style,
      location_address: JOY_EVENTS.confirmed.location_address,
      location_city: JOY_EVENTS.confirmed.location_city,
      location_state: JOY_EVENTS.confirmed.location_state,
      location_zip: JOY_EVENTS.confirmed.location_zip,
      dietary_restrictions: ['pescatarian', 'light dairy'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.confirmed.special_requests,
      quoted_price_cents: JOY_EVENTS.confirmed.quoted_price_cents,
      pricing_model: JOY_EVENTS.confirmed.pricing_model,
      deposit_amount_cents: JOY_EVENTS.confirmed.deposit_amount_cents,
      payment_status: JOY_EVENTS.confirmed.payment_status,
    }
  )
  const completedEventId = await ensureEvent(
    admin,
    chefId,
    primaryClientId,
    JOY_EVENTS.completed.occasion,
    JOY_EVENTS.completed.status,
    JOY_EVENTS.completed.daysOut,
    undefined,
    {
      serve_time: JOY_EVENTS.completed.serve_time,
      guest_count: JOY_EVENTS.completed.guest_count,
      service_style: JOY_EVENTS.completed.service_style,
      location_address: JOY_EVENTS.completed.location_address,
      location_city: JOY_EVENTS.completed.location_city,
      location_state: JOY_EVENTS.completed.location_state,
      location_zip: JOY_EVENTS.completed.location_zip,
      dietary_restrictions: ['pescatarian'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.completed.special_requests,
      quoted_price_cents: JOY_EVENTS.completed.quoted_price_cents,
      pricing_model: JOY_EVENTS.completed.pricing_model,
      deposit_amount_cents: JOY_EVENTS.completed.deposit_amount_cents,
      payment_status: JOY_EVENTS.completed.payment_status,
    }
  )

  await safeUpdateById(admin, 'events', draftEventId, {
      client_id: primaryClientId,
      inquiry_id: awaitingChefId,
      event_date: daysFromNow(JOY_EVENTS.draft.daysOut),
      serve_time: JOY_EVENTS.draft.serve_time,
      guest_count: JOY_EVENTS.draft.guest_count,
      occasion: JOY_EVENTS.draft.occasion,
      location_address: JOY_EVENTS.draft.location_address,
      location_city: JOY_EVENTS.draft.location_city,
      location_state: JOY_EVENTS.draft.location_state,
      location_zip: JOY_EVENTS.draft.location_zip,
      status: JOY_EVENTS.draft.status,
      service_style: JOY_EVENTS.draft.service_style,
      access_instructions: 'Use the side entrance by the garden gate. Buzz 2R if needed.',
      dietary_restrictions: ['pescatarian', 'vegetarian option'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.draft.special_requests,
      quoted_price_cents: JOY_EVENTS.draft.quoted_price_cents,
      pricing_model: JOY_EVENTS.draft.pricing_model,
      deposit_amount_cents: JOY_EVENTS.draft.deposit_amount_cents,
      pricing_notes: JOY_EVENTS.draft.pricing_notes,
      kitchen_notes: JOY_EVENTS.draft.kitchen_notes,
      site_notes: JOY_EVENTS.draft.site_notes,
      client_journey_note: JOY_EVENTS.draft.client_journey_note,
      payment_status: 'unpaid',
      menu_approval_status: 'not_sent',
      course_count: 4,
      booking_source: 'inquiry',
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
      menu_id: menuId,
      event_timezone: 'America/New_York',
      alcohol_being_served: true,
      inquiry_received_at: isoFromNow(-21, 10, 15),
    }, 'Joy draft event', { allowImmutablePricing: true })

  await safeUpdateById(admin, 'events', proposedEventId, {
      client_id: primaryClientId,
      inquiry_id: awaitingClientId,
      event_date: daysFromNow(JOY_EVENTS.proposed.daysOut),
      serve_time: JOY_EVENTS.proposed.serve_time,
      guest_count: JOY_EVENTS.proposed.guest_count,
      occasion: JOY_EVENTS.proposed.occasion,
      location_address: JOY_EVENTS.proposed.location_address,
      location_city: JOY_EVENTS.proposed.location_city,
      location_state: JOY_EVENTS.proposed.location_state,
      location_zip: JOY_EVENTS.proposed.location_zip,
      status: JOY_EVENTS.proposed.status,
      service_style: JOY_EVENTS.proposed.service_style,
      access_instructions: 'Side entrance preferred. Dessert plates are in the lower dining credenza.',
      dietary_restrictions: ['light dairy'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.proposed.special_requests,
      quoted_price_cents: JOY_EVENTS.proposed.quoted_price_cents,
      pricing_model: JOY_EVENTS.proposed.pricing_model,
      deposit_amount_cents: JOY_EVENTS.proposed.deposit_amount_cents,
      pricing_notes: JOY_EVENTS.proposed.pricing_notes,
      kitchen_notes: JOY_EVENTS.proposed.kitchen_notes,
      site_notes: JOY_EVENTS.proposed.site_notes,
      client_journey_note: JOY_EVENTS.proposed.client_journey_note,
      payment_status: 'unpaid',
      menu_approval_status: 'not_sent',
      menu_revision_notes: 'Waiting on Joy to choose between olive oil cake and semifreddo.',
      course_count: 3,
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
      menu_id: menuId,
      event_timezone: 'America/New_York',
    }, 'Joy proposed event', { allowImmutablePricing: true })

  await safeUpdateById(admin, 'events', paidEventId, {
      client_id: primaryClientId,
      event_date: daysFromNow(JOY_EVENTS.paid.daysOut),
      serve_time: JOY_EVENTS.paid.serve_time,
      guest_count: JOY_EVENTS.paid.guest_count,
      occasion: JOY_EVENTS.paid.occasion,
      location_address: JOY_EVENTS.paid.location_address,
      location_city: JOY_EVENTS.paid.location_city,
      location_state: JOY_EVENTS.paid.location_state,
      location_zip: JOY_EVENTS.paid.location_zip,
      status: JOY_EVENTS.paid.status,
      service_style: JOY_EVENTS.paid.service_style,
      access_instructions: 'Freight elevator access opens at 4 PM through the side alley.',
      dietary_restrictions: ['pescatarian', 'light dairy'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.paid.special_requests,
      quoted_price_cents: JOY_EVENTS.paid.quoted_price_cents,
      pricing_model: JOY_EVENTS.paid.pricing_model,
      deposit_amount_cents: JOY_EVENTS.paid.deposit_amount_cents,
      pricing_notes: JOY_EVENTS.paid.pricing_notes,
      kitchen_notes: JOY_EVENTS.paid.kitchen_notes,
      site_notes: JOY_EVENTS.paid.site_notes,
      client_journey_note: JOY_EVENTS.paid.client_journey_note,
      payment_status: JOY_EVENTS.paid.payment_status,
      menu_approval_status: 'not_sent',
      course_count: 4,
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
      menu_id: menuId,
      event_timezone: 'America/New_York',
      alcohol_being_served: false,
    }, 'Joy paid event', { allowImmutablePricing: true })

  await safeUpdateById(admin, 'events', confirmedEventId, {
      client_id: primaryClientId,
      event_date: daysFromNow(JOY_EVENTS.confirmed.daysOut),
      serve_time: JOY_EVENTS.confirmed.serve_time,
      guest_count: JOY_EVENTS.confirmed.guest_count,
      occasion: JOY_EVENTS.confirmed.occasion,
      location_address: JOY_EVENTS.confirmed.location_address,
      location_city: JOY_EVENTS.confirmed.location_city,
      location_state: JOY_EVENTS.confirmed.location_state,
      location_zip: JOY_EVENTS.confirmed.location_zip,
      status: JOY_EVENTS.confirmed.status,
      service_style: JOY_EVENTS.confirmed.service_style,
      access_instructions: 'Enter through the garden gate and stage hot courses inside before moving upstairs.',
      dietary_restrictions: ['pescatarian', 'light dairy'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.confirmed.special_requests,
      quoted_price_cents: JOY_EVENTS.confirmed.quoted_price_cents,
      pricing_model: JOY_EVENTS.confirmed.pricing_model,
      deposit_amount_cents: JOY_EVENTS.confirmed.deposit_amount_cents,
      pricing_notes: JOY_EVENTS.confirmed.pricing_notes,
      kitchen_notes: JOY_EVENTS.confirmed.kitchen_notes,
      site_notes: JOY_EVENTS.confirmed.site_notes,
      client_journey_note: JOY_EVENTS.confirmed.client_journey_note,
      payment_status: JOY_EVENTS.confirmed.payment_status,
      menu_approval_status: 'sent',
      menu_sent_at: isoFromNow(-2, 8, 45),
      invoice_number: 'JOY-2026-0619',
      invoice_issued_at: isoFromNow(-3, 9, 0),
      client_reminder_14d_sent_at: isoFromNow(-1, 9, 0),
      course_count: 5,
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
      menu_id: menuId,
      event_timezone: 'America/New_York',
      alcohol_being_served: true,
      countdown_enabled: true,
    }, 'Joy confirmed event', { allowImmutablePricing: true })

  await safeUpdateById(admin, 'events', completedEventId, {
      client_id: primaryClientId,
      event_date: daysFromNow(JOY_EVENTS.completed.daysOut),
      serve_time: JOY_EVENTS.completed.serve_time,
      guest_count: JOY_EVENTS.completed.guest_count,
      occasion: JOY_EVENTS.completed.occasion,
      location_address: JOY_EVENTS.completed.location_address,
      location_city: JOY_EVENTS.completed.location_city,
      location_state: JOY_EVENTS.completed.location_state,
      location_zip: JOY_EVENTS.completed.location_zip,
      status: JOY_EVENTS.completed.status,
      service_style: JOY_EVENTS.completed.service_style,
      access_instructions: 'Side entrance remains easiest for service load-in.',
      dietary_restrictions: ['pescatarian'],
      allergies: ['sesame'],
      special_requests: JOY_EVENTS.completed.special_requests,
      quoted_price_cents: JOY_EVENTS.completed.quoted_price_cents,
      pricing_model: JOY_EVENTS.completed.pricing_model,
      deposit_amount_cents: JOY_EVENTS.completed.deposit_amount_cents,
      pricing_notes: JOY_EVENTS.completed.pricing_notes,
      kitchen_notes: JOY_EVENTS.completed.kitchen_notes,
      site_notes: JOY_EVENTS.completed.site_notes,
      client_journey_note: JOY_EVENTS.completed.client_journey_note,
      payment_status: JOY_EVENTS.completed.payment_status,
      menu_approval_status: 'approved',
      menu_sent_at: isoFromNow(-36, 14, 0),
      menu_approved_at: isoFromNow(-35, 9, 30),
      follow_up_sent: true,
      follow_up_sent_at: isoFromNow(-29, 10, 15),
      review_link_sent: true,
      review_request_sent_at: isoFromNow(-29, 10, 20),
      leftover_notes:
        'Left lemon pasta and olive oil cake in labeled glass containers for next-day lunch.',
      financially_closed: true,
      financial_closed: true,
      financial_closed_at: isoFromNow(-28, 12, 0),
      tip_amount_cents: 43000,
      chef_outcome_notes:
        'Joy rebooked within 48 hours and immediately introduced a colleague for a future dinner.',
      chef_outcome_rating: 5,
      invoice_number: 'JOY-2026-0322',
      invoice_issued_at: isoFromNow(-37, 9, 0),
      course_count: 4,
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
      menu_id: menuId,
      event_timezone: 'America/New_York',
      alcohol_being_served: true,
      reset_complete: true,
      aar_filed: true,
      debrief_completed_at: isoFromNow(-28, 13, 0),
    }, 'Joy completed event', { allowImmutablePricing: true })

  // Link inquiry to draft event
  await admin
    .from('inquiries')
    .update({ converted_to_event_id: draftEventId })
    .eq('id', awaitingChefId)
  await admin
    .from('inquiries')
    .update({ converted_to_event_id: proposedEventId })
    .eq('id', awaitingClientId)

  // 6. Quotes
  const draftQuoteId = await ensureQuote(
    admin,
    chefId,
    primaryClientId,
    awaitingChefId,
    draftEventId,
    'draft',
    JOY_QUOTES.draft.total_quoted_cents,
    JOY_QUOTES.draft.valid_until_days
  )
  const sentQuoteId = await ensureQuote(
    admin,
    chefId,
    primaryClientId,
    awaitingClientId,
    proposedEventId,
    'sent',
    JOY_QUOTES.sent.total_quoted_cents,
    JOY_QUOTES.sent.valid_until_days
  )
  const acceptedQuoteId = await ensureQuote(
    admin,
    chefId,
    primaryClientId,
    null,
    paidEventId,
    'accepted',
    JOY_QUOTES.accepted.total_quoted_cents,
    JOY_QUOTES.accepted.valid_until_days
  )

  await admin
    .from('quotes')
    .update({
      client_id: primaryClientId,
      inquiry_id: awaitingChefId,
      event_id: draftEventId,
      quote_name: JOY_QUOTES.draft.quote_name,
      total_quoted_cents: JOY_QUOTES.draft.total_quoted_cents,
      deposit_required: true,
      deposit_amount_cents: Math.floor(JOY_QUOTES.draft.total_quoted_cents * 0.25),
      pricing_model: 'flat_rate',
      pricing_notes: JOY_QUOTES.draft.pricing_notes,
      chef_message: JOY_QUOTES.draft.chef_message,
      status: 'draft',
      valid_until: daysFromNow(JOY_QUOTES.draft.valid_until_days),
      guest_count_estimated: JOY_EVENTS.draft.guest_count,
      show_cost_breakdown: true,
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
    })
    .eq('id', draftQuoteId)

  await admin
    .from('quotes')
    .update({
      client_id: primaryClientId,
      inquiry_id: awaitingClientId,
      event_id: proposedEventId,
      quote_name: JOY_QUOTES.sent.quote_name,
      total_quoted_cents: JOY_QUOTES.sent.total_quoted_cents,
      deposit_required: true,
      deposit_amount_cents: Math.floor(JOY_QUOTES.sent.total_quoted_cents * 0.25),
      pricing_model: 'flat_rate',
      pricing_notes: JOY_QUOTES.sent.pricing_notes,
      chef_message: JOY_QUOTES.sent.chef_message,
      status: 'sent',
      sent_at: isoFromNow(-3, 15, 10),
      valid_until: daysFromNow(JOY_QUOTES.sent.valid_until_days),
      guest_count_estimated: JOY_EVENTS.proposed.guest_count,
      negotiation_occurred: true,
      original_quoted_cents: 198000,
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
    })
    .eq('id', sentQuoteId)

  await admin
    .from('quotes')
    .update({
      client_id: primaryClientId,
      inquiry_id: null,
      event_id: paidEventId,
      quote_name: JOY_QUOTES.accepted.quote_name,
      total_quoted_cents: JOY_QUOTES.accepted.total_quoted_cents,
      deposit_required: true,
      deposit_amount_cents: Math.floor(JOY_QUOTES.accepted.total_quoted_cents * 0.25),
      pricing_model: 'flat_rate',
      pricing_notes: JOY_QUOTES.accepted.pricing_notes,
      chef_message: JOY_QUOTES.accepted.chef_message,
      status: 'accepted',
      sent_at: isoFromNow(-8, 11, 0),
      accepted_at: isoFromNow(-7, 9, 15),
      valid_until: daysFromNow(JOY_QUOTES.accepted.valid_until_days),
      guest_count_estimated: JOY_EVENTS.paid.guest_count,
      negotiation_occurred: true,
      original_quoted_cents: 348000,
      created_by: chefAuth.id,
      updated_by: chefAuth.id,
    })
    .eq('id', acceptedQuoteId)

  const canonicalProposalContractSentAt = isoFromNow(-2, 11, 0)
  const canonicalProposalContractBody = `# Service Agreement

This agreement covers Joy's Parents' Anniversary Supper.

- Event date: ${daysFromNow(JOY_EVENTS.proposed.daysOut)}
- Guest count: ${JOY_EVENTS.proposed.guest_count}
- Total fee: $1,850.00
- Deposit due after signature: $462.50

The client must first accept the proposal pricing and event details before signing this agreement.`

  const { data: existingProposalContracts, error: proposalContractLookupError } = await admin
    .from('event_contracts')
    .select('id')
    .eq('event_id', proposedEventId)
    .neq('status', 'voided')
    .order('created_at', { ascending: false })

  if (proposalContractLookupError) {
    throw new Error(
      `[e2e-seed] Failed to load proposal contracts: ${proposalContractLookupError.message}`
    )
  }

  if (existingProposalContracts?.length) {
    const [activeContract, ...staleContracts] = existingProposalContracts

    const { error: proposalContractUpdateError } = await admin
      .from('event_contracts')
      .update({
        chef_id: chefId,
        client_id: primaryClientId,
        body_snapshot: canonicalProposalContractBody,
        status: 'sent',
        sent_at: canonicalProposalContractSentAt,
        viewed_at: null,
        signed_at: null,
        voided_at: null,
        void_reason: null,
        signature_data_url: null,
        signer_ip_address: null,
        signer_user_agent: null,
        updated_at: canonicalProposalContractSentAt,
      })
      .eq('id', activeContract.id)

    if (proposalContractUpdateError) {
      throw new Error(
        `[e2e-seed] Failed to update proposal contract: ${proposalContractUpdateError.message}`
      )
    }

    if (staleContracts.length > 0) {
      const staleContractIds = staleContracts.map((contract) => contract.id)
      const { error: staleProposalContractsError } = await admin
        .from('event_contracts')
        .update({
          status: 'voided',
          voided_at: canonicalProposalContractSentAt,
          void_reason: 'Superseded by canonical E2E seed',
        })
        .in('id', staleContractIds)

      if (staleProposalContractsError) {
        throw new Error(
          `[e2e-seed] Failed to void stale proposal contracts: ${staleProposalContractsError.message}`
        )
      }
    }
  } else {
    const { error: proposalContractInsertError } = await admin.from('event_contracts').insert({
      event_id: proposedEventId,
      chef_id: chefId,
      client_id: primaryClientId,
      body_snapshot: canonicalProposalContractBody,
      status: 'sent',
      sent_at: canonicalProposalContractSentAt,
      created_at: canonicalProposalContractSentAt,
      updated_at: canonicalProposalContractSentAt,
    })

    if (proposalContractInsertError) {
      throw new Error(
        `[e2e-seed] Failed to seed proposal contract: ${proposalContractInsertError.message}`
      )
    }
  }

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

  await admin
    .from('ledger_entries')
    .update({
      client_id: primaryClientId,
      amount_cents: JOY_EVENTS.paid.deposit_amount_cents,
      description: 'Deposit received for Design Team Offsite Dinner',
      payment_method: 'venmo',
      created_by: chefAuth.id,
      received_at: isoFromNow(-7, 14, 0),
    })
    .eq('event_id', paidEventId)
    .eq('entry_type', 'deposit')

  await ensureLedgerEntry(
    admin,
    chefId,
    primaryClientId,
    confirmedEventId,
    'deposit',
    JOY_EVENTS.confirmed.deposit_amount_cents,
    'Deposit received for Rooftop Summer Kickoff',
    chefAuth.id,
    18
  )
  await ensureLedgerEntry(
    admin,
    chefId,
    primaryClientId,
    confirmedEventId,
    'final_payment',
    JOY_EVENTS.confirmed.quoted_price_cents - JOY_EVENTS.confirmed.deposit_amount_cents,
    'Final payment received for Rooftop Summer Kickoff',
    chefAuth.id,
    2
  )
  await ensureLedgerEntry(
    admin,
    chefId,
    primaryClientId,
    completedEventId,
    'deposit',
    JOY_EVENTS.completed.deposit_amount_cents,
    'Deposit received for March Supper Club',
    chefAuth.id,
    38
  )
  await ensureLedgerEntry(
    admin,
    chefId,
    primaryClientId,
    completedEventId,
    'tip',
    43000,
    'Additional gratuity after March Supper Club',
    chefAuth.id,
    29
  )
  await admin
    .from('ledger_entries')
    .update({
      client_id: primaryClientId,
      amount_cents:
        JOY_EVENTS.completed.quoted_price_cents - JOY_EVENTS.completed.deposit_amount_cents,
      description: 'Final payment received for March Supper Club',
      payment_method: 'venmo',
      created_by: chefAuth.id,
      received_at: isoFromNow(-30, 14, 0),
    })
    .eq('event_id', completedEventId)
    .eq('entry_type', 'final_payment')

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

  await admin
    .from('expenses')
    .update({
      amount_cents: 26800,
      description: 'Whole Foods and Formaggio sourcing',
      category: 'groceries',
    })
    .eq('event_id', completedEventId)
    .eq('description', 'TEST - Whole Foods groceries')
  await admin
    .from('expenses')
    .update({
      amount_cents: 7400,
      description: 'Linen steaming and platter rental',
      category: 'equipment',
    })
    .eq('event_id', completedEventId)
    .eq('description', 'TEST - Linen rental')
  await ensureExpense(
    admin,
    chefId,
    completedEventId,
    'alcohol',
    6400,
    'NA pairing restock and sparkling water'
  )

  // 9. Joy history and behavior scaffolding

  // 11. Chef B — second independent tenant for multi-tenant isolation tests
  for (const tag of JOY_CLIENT_TAGS) {
    await upsertClientTag(admin, chefId, primaryClientId, tag)
  }

  await upsertClientNote(admin, chefId, primaryClientId, {
    note_text:
      'Canonical client account. Keep Joy production-realistic: concise texts, clear recommendations, and no placeholder behavior.',
    category: 'relationship',
    pinned: true,
    source: 'manual',
    created_at: isoFromNow(-90, 9, 0),
    updated_at: isoFromNow(-90, 9, 0),
  })
  await upsertClientNote(admin, chefId, primaryClientId, {
    note_text:
      'Sesame allergy is a hard stop. Dairy should stay light unless the rest of the menu already leans bright and acidic.',
    category: 'dietary',
    pinned: false,
    source: 'manual',
    created_at: isoFromNow(-75, 11, 15),
    updated_at: isoFromNow(-75, 11, 15),
  })
  await upsertClientNote(admin, chefId, primaryClientId, {
    note_text:
      'Prefers concise daytime texts and one polished revision email when she is deciding between two menu directions.',
    category: 'preference',
    pinned: false,
    source: 'manual',
    created_at: isoFromNow(-62, 14, 10),
    updated_at: isoFromNow(-62, 14, 10),
  })
  await upsertClientNote(admin, chefId, primaryClientId, {
    note_text:
      'For rooftop service, plate hot courses indoors and label leftovers in glass containers before the wrap-up text.',
    category: 'logistics',
    pinned: false,
    source: 'manual',
    event_id: confirmedEventId,
    created_at: isoFromNow(-4, 16, 30),
    updated_at: isoFromNow(-4, 16, 30),
  })

  await upsertMessage(admin, chefId, primaryClientId, {
    inquiry_id: awaitingChefId,
    event_id: draftEventId,
    channel: 'email',
    status: 'logged',
    direction: 'inbound',
    from_user_id: clientAuth.id,
    to_user_id: chefAuth.id,
    subject: 'Birthday dinner for June 6',
    body: JOY_INQUIRIES.awaitingChef.sourceMessage,
    sent_at: isoFromNow(-21, 10, 15),
    created_at: isoFromNow(-21, 10, 15),
    updated_at: isoFromNow(-21, 10, 15),
    recipient_email: `e2e.chef.${suffix}@chefflow.test`,
  })
  await upsertMessage(admin, chefId, primaryClientId, {
    inquiry_id: awaitingChefId,
    event_id: draftEventId,
    channel: 'email',
    status: 'sent',
    direction: 'outbound',
    from_user_id: chefAuth.id,
    to_user_id: clientAuth.id,
    subject: 'Menu direction for your birthday dinner',
    body:
      'I recommend a bright coastal menu with one vegetarian plate, a small interactive crudo moment, and a printed menu card at each place setting.',
    sent_at: isoFromNow(-20, 9, 40),
    created_at: isoFromNow(-20, 9, 40),
    updated_at: isoFromNow(-20, 9, 40),
    recipient_email: JOY.email,
  })
  await upsertMessage(admin, chefId, primaryClientId, {
    inquiry_id: awaitingClientId,
    event_id: proposedEventId,
    channel: 'text',
    status: 'logged',
    direction: 'inbound',
    from_user_id: clientAuth.id,
    to_user_id: chefAuth.id,
    subject: null,
    body: JOY_INQUIRIES.awaitingClient.sourceMessage,
    sent_at: isoFromNow(-2, 16, 15),
    created_at: isoFromNow(-2, 16, 15),
    updated_at: isoFromNow(-2, 16, 15),
    recipient_email: null,
  })
  await upsertMessage(admin, chefId, primaryClientId, {
    inquiry_id: awaitingClientId,
    event_id: proposedEventId,
    channel: 'email',
    status: 'sent',
    direction: 'outbound',
    from_user_id: chefAuth.id,
    to_user_id: clientAuth.id,
    subject: 'Revised anniversary proposal',
    body:
      'Attached is the revised proposal at $1,850 with plated dessert service and a lighter seafood main. I included two dessert formats so you can choose the pacing you want.',
    sent_at: isoFromNow(-3, 15, 10),
    created_at: isoFromNow(-3, 15, 10),
    updated_at: isoFromNow(-3, 15, 10),
    recipient_email: JOY.email,
  })
  await upsertMessage(admin, chefId, primaryClientId, {
    event_id: confirmedEventId,
    channel: 'text',
    status: 'sent',
    direction: 'outbound',
    from_user_id: chefAuth.id,
    to_user_id: clientAuth.id,
    subject: null,
    body:
      'Menu preview is live in your portal. The crudo finish and olive oil cake are both in there - let me know if you want the semifreddo swap.',
    sent_at: isoFromNow(-2, 18, 5),
    created_at: isoFromNow(-2, 18, 5),
    updated_at: isoFromNow(-2, 18, 5),
    recipient_email: null,
  })
  await upsertMessage(admin, chefId, primaryClientId, {
    event_id: confirmedEventId,
    channel: 'text',
    status: 'logged',
    direction: 'inbound',
    from_user_id: clientAuth.id,
    to_user_id: chefAuth.id,
    subject: null,
    body:
      'Approved overall. Keep dessert plated individually and please leave one host portion for the next day.',
    sent_at: isoFromNow(-1, 9, 20),
    created_at: isoFromNow(-1, 9, 20),
    updated_at: isoFromNow(-1, 9, 20),
    recipient_email: null,
  })
  await upsertMessage(admin, chefId, primaryClientId, {
    event_id: completedEventId,
    channel: 'text',
    status: 'sent',
    direction: 'outbound',
    from_user_id: chefAuth.id,
    to_user_id: clientAuth.id,
    subject: null,
    body:
      'Everything is reset, leftovers are labeled on the top fridge shelf, and the olive oil cake is boxed separately for tomorrow.',
    sent_at: isoFromNow(-29, 22, 10),
    created_at: isoFromNow(-29, 22, 10),
    updated_at: isoFromNow(-29, 22, 10),
    recipient_email: null,
  })

  await upsertTasteProfile(admin, chefId, primaryClientId, {
    favorite_cuisines: ['Coastal Mediterranean', 'Japanese', 'Italian'],
    disliked_ingredients: ['raw onion', 'heavy truffle oil', 'too much dill'],
    spice_tolerance: 3,
    texture_preferences: ['crisp vegetables', 'brothy sauces', 'not overly creamy'],
    flavor_notes:
      'Joy likes bright acidity, herbs, restrained heat, and one comforting brown-butter element in the middle of the meal.',
    preferred_proteins: ['halibut', 'scallops', 'salmon', 'chicken thighs'],
    avoids: ['sesame', 'heavy cream', 'mushy eggplant'],
    special_occasions_notes:
      'For milestone dinners she wants one tableside or interactive moment and printed menu cards.',
    created_at: isoFromNow(-90, 9, 30),
    updated_at: isoFromNow(-10, 11, 0),
  })

  await upsertClientMealRequest(admin, chefId, primaryClientId, {
    request_type: 'repeat_dish',
    dish_name: 'Lemon Butter Pasta with Herbs',
    notes: 'Please bring this back for the smaller weeknight dinners when Maya is traveling.',
    requested_for_week_start: daysFromNow(-14),
    priority: 'high',
    status: 'fulfilled',
    reviewed_at: isoFromNow(-16, 9, 0),
    reviewed_by: chefAuth.id,
    created_at: isoFromNow(-18, 17, 0),
    updated_at: isoFromNow(-14, 20, 0),
  })
  await upsertClientMealRequest(admin, chefId, primaryClientId, {
    request_type: 'new_idea',
    dish_name: 'Grilled snapper with fennel and preserved lemon',
    notes: 'For the next rooftop dinner; keep it bright and not too heavy.',
    requested_for_week_start: daysFromNow(7),
    priority: 'normal',
    status: 'scheduled',
    reviewed_at: isoFromNow(-3, 10, 30),
    reviewed_by: chefAuth.id,
    created_at: isoFromNow(-5, 8, 45),
    updated_at: isoFromNow(-3, 10, 30),
  })
  await upsertClientMealRequest(admin, chefId, primaryClientId, {
    request_type: 'avoid_dish',
    dish_name: 'Mushroom risotto',
    notes: 'Friends keep requesting it, but the room always gets too heavy once that lands.',
    requested_for_week_start: daysFromNow(0),
    priority: 'normal',
    status: 'reviewed',
    reviewed_at: isoFromNow(-6, 12, 0),
    reviewed_by: chefAuth.id,
    created_at: isoFromNow(-8, 15, 0),
    updated_at: isoFromNow(-6, 12, 0),
  })
  await upsertClientMealRequest(admin, chefId, primaryClientId, {
    request_type: 'new_idea',
    dish_name: 'Mini olive oil cake with macerated strawberries',
    notes: 'Considering this for the next family dinner if it still feels elegant enough.',
    requested_for_week_start: daysFromNow(14),
    priority: 'low',
    status: 'requested',
    created_at: isoFromNow(-1, 8, 30),
    updated_at: isoFromNow(-1, 8, 30),
  })
  await upsertClientMealRequest(admin, chefId, primaryClientId, {
    request_type: 'repeat_dish',
    dish_name: 'Citrus crudo platter',
    notes: 'Withdrawing this for the family supper because Maya wants something cooked instead.',
    requested_for_week_start: daysFromNow(-21),
    priority: 'normal',
    status: 'withdrawn',
    created_at: isoFromNow(-25, 18, 0),
    updated_at: isoFromNow(-24, 9, 0),
  })
  await upsertClientMealRequest(admin, chefId, primaryClientId, {
    request_type: 'new_idea',
    dish_name: 'Sesame-free romesco vegetables',
    notes: 'Love the color, but only if the sauce stays clean and bright.',
    requested_for_week_start: daysFromNow(-7),
    priority: 'normal',
    status: 'declined',
    reviewed_at: isoFromNow(-10, 14, 15),
    reviewed_by: chefAuth.id,
    created_at: isoFromNow(-12, 11, 45),
    updated_at: isoFromNow(-10, 14, 15),
  })

  await upsertRecurringRecommendation(admin, chefId, primaryClientId, {
    week_start: daysFromNow(-7),
    recommendation_text:
      'Week of ' +
      daysFromNow(-7) +
      ': preserved lemon chicken thighs, charred broccolini, chilled cucumber soup, and olive oil cake snack packs.',
    status: 'approved',
    client_response_notes:
      'Love this. Swap asparagus for broccolini and keep dessert light because we have lunch plans that week.',
    sent_at: isoFromNow(-10, 8, 30),
    responded_at: isoFromNow(-9, 9, 5),
    sent_by: chefAuth.id,
    responded_by: clientAuth.id,
    created_at: isoFromNow(-10, 8, 30),
    updated_at: isoFromNow(-9, 9, 5),
  })
  await upsertRecurringRecommendation(admin, chefId, primaryClientId, {
    week_start: daysFromNow(7),
    recommendation_text:
      'Week of ' +
      daysFromNow(7) +
      ': crudo starter, salmon with green olive vinaigrette, farro with herbs, and individual semifreddo jars.',
    status: 'revision_requested',
    client_response_notes:
      'Please make the main lighter, skip hazelnut, and keep dessert plated rather than jarred.',
    sent_at: isoFromNow(-3, 9, 0),
    responded_at: isoFromNow(-2, 16, 40),
    sent_by: chefAuth.id,
    responded_by: clientAuth.id,
    created_at: isoFromNow(-3, 9, 0),
    updated_at: isoFromNow(-2, 16, 40),
  })
  await upsertRecurringRecommendation(admin, chefId, primaryClientId, {
    week_start: daysFromNow(14),
    recommendation_text:
      'Week of ' +
      daysFromNow(14) +
      ': tomato-poached cod, herb rice, blistered green beans, and a citrus yogurt snack for lunches.',
    status: 'sent',
    client_response_notes: null,
    sent_at: isoFromNow(-1, 7, 55),
    sent_by: chefAuth.id,
    created_at: isoFromNow(-1, 7, 55),
    updated_at: isoFromNow(-1, 7, 55),
  })

  await upsertRecurringService(admin, chefId, primaryClientId, {
    service_type: 'weekly_dinners',
    frequency: 'weekly',
    day_of_week: [3],
    typical_guest_count: 4,
    rate_cents: 145000,
    start_date: daysFromNow(-90),
    notes:
      'Wednesday dinners alternate between plated family supper and a more design-forward tasting-style meal when friends join.',
    status: 'active',
    created_at: isoFromNow(-90, 9, 0),
    updated_at: isoFromNow(-8, 12, 0),
  })
  await upsertRecurringService(admin, chefId, primaryClientId, {
    service_type: 'biweekly_prep',
    frequency: 'biweekly',
    day_of_week: [0],
    typical_guest_count: 2,
    rate_cents: 98000,
    start_date: daysFromNow(-210),
    end_date: daysFromNow(-45),
    notes:
      'Ran through the winter for travel-heavy weeks, then ended once Joy shifted back to hosted dinners.',
    status: 'ended',
    created_at: isoFromNow(-210, 9, 0),
    updated_at: isoFromNow(-45, 12, 0),
  })

  await upsertServedDishHistory(admin, chefId, primaryClientId, {
    recipe_id: recipeId,
    dish_name: 'Lemon Butter Pasta with Herbs',
    served_date: daysFromNow(-48),
    client_reaction: 'loved',
    notes: 'Requested again twice afterward for smaller weeknight dinners.',
    client_feedback_at: isoFromNow(-47, 8, 10),
    created_at: isoFromNow(-48, 20, 0),
  })
  await upsertServedDishHistory(admin, chefId, primaryClientId, {
    event_id: completedEventId,
    dish_name: 'Citrus & Fennel Crudo',
    served_date: daysFromNow(-30),
    client_reaction: 'loved',
    notes: 'The tableside finish landed exactly the way Joy likes: quick, polished, and interactive.',
    client_feedback_at: isoFromNow(-29, 9, 0),
    created_at: isoFromNow(-30, 21, 0),
  })
  await upsertServedDishHistory(admin, chefId, primaryClientId, {
    event_id: completedEventId,
    dish_name: 'Brown Butter Halibut',
    served_date: daysFromNow(-30),
    client_reaction: 'liked',
    notes: 'Excellent main course, though Joy asked for slightly more greens next time.',
    client_feedback_at: isoFromNow(-29, 9, 5),
    created_at: isoFromNow(-30, 21, 5),
  })
  await upsertServedDishHistory(admin, chefId, primaryClientId, {
    event_id: completedEventId,
    dish_name: 'Olive Oil Cake',
    served_date: daysFromNow(-30),
    client_reaction: 'loved',
    notes: 'This is now one of Joy s recurring dessert requests.',
    client_feedback_at: isoFromNow(-29, 9, 10),
    created_at: isoFromNow(-30, 21, 10),
  })
  await upsertServedDishHistory(admin, chefId, primaryClientId, {
    dish_name: 'Charred Broccolini with Anchovy Pangrattato',
    served_date: daysFromNow(-75),
    client_reaction: 'liked',
    notes: 'Loved the texture; keep garlic slightly softer next time.',
    client_feedback_at: isoFromNow(-74, 9, 0),
    created_at: isoFromNow(-75, 20, 0),
  })

  await upsertClientReview(admin, chefId, primaryClientId, completedEventId, {
    rating: 5,
    feedback_text:
      'This felt exactly like the kind of dinner I want to host: calm, beautiful, and easy to enjoy as the host.',
    what_they_loved:
      'The pacing, the crudo finish, and the fact that leftovers were labeled before I even asked.',
    what_could_improve: 'Only minor tweak: warm the dessert plates a bit more next time.',
    display_consent: true,
    google_review_clicked: false,
    food_quality_rating: 5,
    presentation_rating: 5,
    communication_rating: 5,
    punctuality_rating: 5,
    cleanup_rating: 5,
    would_book_again: true,
    chef_response:
      'Thank you. I ll keep the plated dessert warmer and we ll carry the same calm pacing into the rooftop dinner.',
    responded_at: isoFromNow(-28, 10, 0),
    created_at: isoFromNow(-28, 9, 45),
    updated_at: isoFromNow(-28, 10, 0),
  })

  await upsertClientSatisfactionSurvey(admin, chefId, primaryClientId, completedEventId, {
    sent_at: isoFromNow(-29, 10, 20),
    responded_at: isoFromNow(-28, 9, 40),
    reminder_sent_at: isoFromNow(-29, 17, 30),
    nps_score: 10,
    overall_rating: 5,
    food_quality_rating: 5,
    service_rating: 5,
    value_rating: 5,
    presentation_rating: 5,
    would_rebook: true,
    highlight_text: 'The room felt calm and luxurious without ever feeling stiff.',
    improvement_text: 'Would love a slightly earlier draft of the printed menu next time.',
    testimonial_text:
      'Chef Maren made hosting feel effortless and deeply personal from planning through cleanup.',
    consent_to_display: true,
    food_rating: 5,
    comments: 'Already planning the rooftop dinner and one smaller family supper.',
    would_recommend: true,
    review_requested: true,
    review_request_sent_at: isoFromNow(-29, 10, 20),
    completed_at: isoFromNow(-28, 9, 40),
    created_at: isoFromNow(-29, 10, 20),
    updated_at: isoFromNow(-28, 9, 40),
  })

  await upsertClientReferral(admin, chefId, {
    referrer_client_id: primaryClientId,
    referred_client_id: referredClientId,
    referral_code: 'JOYHOSTS-REFERRAL',
    reward_points_awarded: 60,
    reward_awarded_at: isoFromNow(-5, 12, 0),
    status: 'booked',
    revenue_generated_cents: 0,
    notes: 'Joy introduced Julian after the March supper club.',
    referral_source: 'dinner_party',
    created_at: isoFromNow(-12, 18, 30),
    updated_at: isoFromNow(-5, 12, 0),
  })

  await upsertInquiryTransition(admin, chefId, awaitingChefId, {
    from_status: null,
    to_status: 'awaiting_chef',
    transitioned_by: clientAuth.id,
    transitioned_at: isoFromNow(-21, 10, 15),
    reason: 'Joy submitted a complete birthday dinner request with budget and dietary notes.',
    metadata: { canonicalClient: true },
  })
  await upsertInquiryTransition(admin, chefId, awaitingClientId, {
    from_status: null,
    to_status: 'awaiting_chef',
    transitioned_by: clientAuth.id,
    transitioned_at: isoFromNow(-12, 11, 0),
    reason: 'Joy reopened anniversary planning with revised pacing requirements.',
    metadata: { canonicalClient: true },
  })
  await upsertInquiryTransition(admin, chefId, awaitingClientId, {
    from_status: 'awaiting_chef',
    to_status: 'awaiting_client',
    transitioned_by: chefAuth.id,
    transitioned_at: isoFromNow(-3, 15, 10),
    reason: 'Chef sent the revised anniversary proposal and is waiting on Joy s decision.',
    metadata: { canonicalClient: true },
  })

  await upsertEventTransition(admin, chefId, draftEventId, {
    from_status: null,
    to_status: 'draft',
    transitioned_by: chefAuth.id,
    transitioned_at: isoFromNow(-20, 9, 45),
    reason: 'Birthday dinner moved from inquiry into active draft planning.',
    metadata: { canonicalClient: true },
  })
  await upsertEventTransition(admin, chefId, proposedEventId, {
    from_status: 'draft',
    to_status: 'proposed',
    transitioned_by: chefAuth.id,
    transitioned_at: isoFromNow(-3, 15, 10),
    reason: 'Revised anniversary proposal sent to Joy for approval.',
    metadata: { canonicalClient: true },
  })
  await upsertEventTransition(admin, chefId, paidEventId, {
    from_status: 'accepted',
    to_status: 'paid',
    transitioned_by: clientAuth.id,
    transitioned_at: isoFromNow(-7, 9, 15),
    reason: 'Joy approved the offsite dinner and paid the deposit the same day.',
    metadata: { canonicalClient: true },
  })
  await upsertEventTransition(admin, chefId, confirmedEventId, {
    from_status: 'paid',
    to_status: 'confirmed',
    transitioned_by: chefAuth.id,
    transitioned_at: isoFromNow(-2, 8, 45),
    reason: 'Final payment cleared and the rooftop dinner moved into execution planning.',
    metadata: { canonicalClient: true },
  })
  await upsertEventTransition(admin, chefId, completedEventId, {
    from_status: 'confirmed',
    to_status: 'completed',
    transitioned_by: chefAuth.id,
    transitioned_at: isoFromNow(-29, 22, 30),
    reason: 'March supper club delivered successfully and closed out cleanly.',
    metadata: { canonicalClient: true },
  })

  await upsertQuoteTransition(admin, chefId, draftQuoteId, {
    from_status: null,
    to_status: 'draft',
    transitioned_by: chefAuth.id,
    transitioned_at: isoFromNow(-20, 9, 50),
    reason: 'Initial birthday quote drafted for Joy s review.',
    metadata: { canonicalClient: true },
  })
  await upsertQuoteTransition(admin, chefId, sentQuoteId, {
    from_status: 'draft',
    to_status: 'sent',
    transitioned_by: chefAuth.id,
    transitioned_at: isoFromNow(-3, 15, 10),
    reason: 'Anniversary quote sent after budget and dessert revisions.',
    metadata: { canonicalClient: true },
  })
  await upsertQuoteTransition(admin, chefId, acceptedQuoteId, {
    from_status: 'sent',
    to_status: 'accepted',
    transitioned_by: clientAuth.id,
    transitioned_at: isoFromNow(-7, 9, 15),
    reason: 'Joy accepted the offsite dinner quote without further changes.',
    metadata: { canonicalClient: true },
  })

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
    clientEmail: JOY.email,
    clientPassword: JOY.password,
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
    clientActionTestIds: {
      proposedEventId,
      paidEventId,
      sentQuoteId,
    },
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
