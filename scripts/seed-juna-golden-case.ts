import { existsSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const require = createRequire(import.meta.url)
const adminDbModule = require('../lib/db/admin')
const { createAdminClient } = adminDbModule.default ?? adminDbModule

const FIXTURE_PATH = 'data/golden-cases/juna-13-bachelorette-dinner.json'
const PRIMARY_CHEF_STATE_PATH = '.auth/chef-bob.json'
const FALLBACK_CHEF_STATE_PATH = '.auth/demo-chef.json'
const CLIENT_EMAIL = 'becca.juna13.goldencase@example.test'
const CLIENT_NAME = 'Becca (Juna 13 Golden Case)'
const EVENT_OCCASION = 'Juna 13 Bachelorette Dinner (Golden Case)'

type GoldenCaseFixture = {
  id: string
  summary: {
    client_contact_name: string
    referral_source: string
    guest_count: number
    cuisine_direction: string
    occasion: string
    location_area: string
    event_date_iso?: string | null
    event_date_text?: string | null
  }
  event_seed: {
    service_notes?: {
      pre_event_day_flow?: string[]
      space?: string[]
    }
  }
  menu_proposal: {
    title: string
    selection_rules?: {
      hors_doeuvres?: string
      entrees?: string
      dessert?: string
    }
    hors_doeuvres: string[]
    entrees: string[]
    desserts: string[]
  }
}

type ChefState = {
  tenantId: string
  chefId: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return dateOnly(date)
}

function assertString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function chooseChefStatePath(): string {
  if (existsSync(PRIMARY_CHEF_STATE_PATH)) return PRIMARY_CHEF_STATE_PATH
  if (existsSync(FALLBACK_CHEF_STATE_PATH)) return FALLBACK_CHEF_STATE_PATH
  throw new Error(
    `Missing chef auth state. Run npm run demo:setup to create ${PRIMARY_CHEF_STATE_PATH}.`
  )
}

function inferFutureSaturdayJune13(reference = new Date()): string {
  const today = new Date(reference)
  today.setHours(0, 0, 0, 0)

  for (let year = today.getFullYear(); year <= today.getFullYear() + 10; year += 1) {
    const candidate = new Date(Date.UTC(year, 5, 13))
    const isSaturday = candidate.getUTCDay() === 6
    const isFutureEnough = candidate.getTime() >= today.getTime()
    if (isSaturday && isFutureEnough) {
      return dateOnly(candidate)
    }
  }

  return `${today.getFullYear()}-06-13`
}

function resolveEventDate(fixture: GoldenCaseFixture): string {
  const override = process.env.GOLDEN_CASE_EVENT_DATE
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override

  if (
    fixture.summary.event_date_iso &&
    /^\d{4}-\d{2}-\d{2}$/.test(fixture.summary.event_date_iso)
  ) {
    return fixture.summary.event_date_iso
  }

  return inferFutureSaturdayJune13()
}

async function ensureClient(
  admin: any,
  tenantId: string,
  fixture: GoldenCaseFixture
): Promise<string> {
  const clientFields = {
    tenant_id: tenantId,
    full_name: CLIENT_NAME,
    email: CLIENT_EMAIL,
    phone: null,
    dietary_restrictions: [],
    allergies: [],
    status: 'active',
    referral_source: 'referral',
    referral_source_detail: assertString(fixture.summary.referral_source, 'Anthony'),
    vibe_notes: [
      `Golden case based on the ${fixture.id} SMS thread.`,
      `Real planner contact: ${fixture.summary.client_contact_name}.`,
      `Referral source: ${fixture.summary.referral_source}.`,
      `Cuisine direction: ${fixture.summary.cuisine_direction}.`,
      'Use only for internal workflow rehearsal and regression testing.',
    ].join(' '),
    is_demo: true,
  }

  const { data: existing, error: existingError } = await admin
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', CLIENT_EMAIL)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to look up golden-case client: ${existingError.message}`)
  }

  if (existing?.id) {
    const { error } = await admin.from('clients').update(clientFields).eq('id', existing.id)
    if (error) throw new Error(`Failed to update golden-case client: ${error.message}`)
    return existing.id as string
  }

  const { data, error } = await admin.from('clients').insert(clientFields).select('id').single()
  if (error || !data) {
    throw new Error(`Failed to insert golden-case client: ${error?.message || 'unknown error'}`)
  }

  return data.id as string
}

async function ensureEvent(
  admin: any,
  tenantId: string,
  clientId: string,
  fixture: GoldenCaseFixture,
  eventDate: string
): Promise<string> {
  const preEventPlan = fixture.event_seed.service_notes?.pre_event_day_flow ?? []
  const spaceNotes = fixture.event_seed.service_notes?.space ?? []

  const eventFields = {
    tenant_id: tenantId,
    client_id: clientId,
    event_date: eventDate,
    serve_time: '19:00:00',
    arrival_time: '16:30:00',
    guest_count: fixture.summary.guest_count,
    guest_count_confirmed: true,
    occasion: EVENT_OCCASION,
    service_style: 'family_style',
    location_address: 'Private house address pending confirmation',
    location_city: assertString(fixture.summary.location_area, 'Kennebunkport'),
    location_state: 'ME',
    location_zip: '00000',
    access_instructions: [
      'Exact house address still missing from the source thread.',
      'Seeded placeholder so travel and packing surfaces can render.',
      ...spaceNotes,
    ].join(' '),
    dietary_restrictions: [],
    allergies: [],
    special_requests: [
      fixture.summary.cuisine_direction,
      'Initial format: hors d oeuvres + main + dessert.',
      'Client responded very positively to the proposal; final selections still pending.',
      ...preEventPlan,
    ].join(' '),
    kitchen_notes: 'Open kitchen / living room area; long-table shared setup is possible.',
    site_notes: 'Pool-day bachelorette dinner at a house after coffee and sandwiches.',
    status: 'proposed',
    payment_status: 'unpaid',
    menu_approval_status: 'sent',
    menu_sent_at: nowIso(),
    menu_last_client_feedback_at: nowIso(),
    menu_revision_notes:
      'Client loved the proposal and planned to review final picks with her sister. Final selections are still unknown in the source thread.',
    inquiry_received_at: nowIso(),
    booking_source: 'inquiry',
    event_timezone: 'America/New_York',
    is_demo: true,
  }

  const { data: existing, error: existingError } = await admin
    .from('events')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('occasion', EVENT_OCCASION)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to look up golden-case event: ${existingError.message}`)
  }

  if (existing?.id) {
    const { error } = await admin.from('events').update(eventFields).eq('id', existing.id)
    if (error) throw new Error(`Failed to update golden-case event: ${error.message}`)
    return existing.id as string
  }

  const { data, error } = await admin.from('events').insert(eventFields).select('id').single()
  if (error || !data) {
    throw new Error(`Failed to insert golden-case event: ${error?.message || 'unknown error'}`)
  }

  return data.id as string
}

async function ensureMenu(
  admin: any,
  tenantId: string,
  eventId: string,
  fixture: GoldenCaseFixture
): Promise<string> {
  const menuName = `${fixture.menu_proposal.title} (Golden Case)`
  const menuFields = {
    tenant_id: tenantId,
    event_id: eventId,
    name: menuName,
    description:
      'Shared proposal seeded from a real SMS thread. Final selections are still pending client review.',
    is_template: false,
    status: 'shared',
    cuisine_type: fixture.summary.cuisine_direction,
    service_style: 'family_style',
    target_guest_count: fixture.summary.guest_count,
    notes:
      'Golden case seed for service rehearsal and workflow testing. Course shells remain selection-based because the final menu choices are unknown.',
    simple_mode: false,
  }

  const { data: existing, error: existingError } = await admin
    .from('menus')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .eq('name', menuName)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to look up golden-case menu: ${existingError.message}`)
  }

  if (existing?.id) {
    const { error } = await admin.from('menus').update(menuFields).eq('id', existing.id)
    if (error) throw new Error(`Failed to update golden-case menu: ${error.message}`)
    await admin
      .from('events')
      .update({ menu_id: existing.id, updated_at: nowIso() })
      .eq('id', eventId)
    return existing.id as string
  }

  const { data, error } = await admin.from('menus').insert(menuFields).select('id').single()
  if (error || !data) {
    throw new Error(`Failed to insert golden-case menu: ${error?.message || 'unknown error'}`)
  }

  await admin.from('events').update({ menu_id: data.id, updated_at: nowIso() }).eq('id', eventId)
  return data.id as string
}

async function ensureDish(
  admin: any,
  tenantId: string,
  menuId: string,
  input: {
    courseNumber: number
    courseName: string
    description: string
    sortOrder: number
  }
): Promise<string> {
  const { data: existing, error: existingError } = await admin
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('course_number', input.courseNumber)
    .maybeSingle()

  if (existingError) {
    throw new Error(
      `Failed to look up golden-case dish ${input.courseName}: ${existingError.message}`
    )
  }

  const dishFields = {
    tenant_id: tenantId,
    menu_id: menuId,
    course_number: input.courseNumber,
    course_name: input.courseName,
    name: input.courseName,
    description: input.description,
    sort_order: input.sortOrder,
    dietary_tags: [],
    allergen_flags: [],
  }

  if (existing?.id) {
    const { error } = await admin.from('dishes').update(dishFields).eq('id', existing.id)
    if (error)
      throw new Error(`Failed to update golden-case dish ${input.courseName}: ${error.message}`)
    return existing.id as string
  }

  const { data, error } = await admin.from('dishes').insert(dishFields).select('id').single()
  if (error || !data) {
    throw new Error(`Failed to insert golden-case dish ${input.courseName}: ${error?.message}`)
  }

  return data.id as string
}

async function ensureComponent(
  admin: any,
  tenantId: string,
  dishId: string,
  input: {
    name: string
    category: 'garnish' | 'protein' | 'dessert' | 'other'
    description: string
    sortOrder: number
    makeAheadWindowHours: number
    storageNotes: string
    executionNotes: string
  }
): Promise<void> {
  const { data: existing, error: existingError } = await admin
    .from('components')
    .select('id')
    .eq('dish_id', dishId)
    .eq('name', input.name)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to look up component ${input.name}: ${existingError.message}`)
  }

  const componentFields = {
    tenant_id: tenantId,
    dish_id: dishId,
    name: input.name,
    category: input.category,
    description: input.description,
    sort_order: input.sortOrder,
    is_make_ahead: true,
    make_ahead_window_hours: input.makeAheadWindowHours,
    storage_notes: input.storageNotes,
    execution_notes: input.executionNotes,
    transport_category: 'cold',
    prep_day_offset: -1,
    prep_time_of_day: 'afternoon',
  }

  if (existing?.id) {
    const { error } = await admin.from('components').update(componentFields).eq('id', existing.id)
    if (error) throw new Error(`Failed to update component ${input.name}: ${error.message}`)
    return
  }

  const { error } = await admin.from('components').insert(componentFields)
  if (error) {
    throw new Error(`Failed to insert component ${input.name}: ${error.message}`)
  }
}

async function ensureMenuStructure(
  admin: any,
  tenantId: string,
  menuId: string,
  fixture: GoldenCaseFixture
): Promise<void> {
  const horsRule = fixture.menu_proposal.selection_rules?.hors_doeuvres ?? 'Select 3-4'
  const entreeRule = fixture.menu_proposal.selection_rules?.entrees ?? 'Select 1-2'
  const dessertRule = fixture.menu_proposal.selection_rules?.dessert ?? 'Select 1'

  const horsDishId = await ensureDish(admin, tenantId, menuId, {
    courseNumber: 1,
    courseName: "Hors d'Oeuvres Selection",
    description: `${horsRule}: ${fixture.menu_proposal.hors_doeuvres.join('; ')}`,
    sortOrder: 1,
  })
  const entreeDishId = await ensureDish(admin, tenantId, menuId, {
    courseNumber: 2,
    courseName: 'Entree Selection',
    description: `${entreeRule}: ${fixture.menu_proposal.entrees.join('; ')}`,
    sortOrder: 2,
  })
  const dessertDishId = await ensureDish(admin, tenantId, menuId, {
    courseNumber: 3,
    courseName: 'Dessert Selection',
    description: `${dessertRule}: ${fixture.menu_proposal.desserts.join('; ')}`,
    sortOrder: 3,
  })

  await ensureComponent(admin, tenantId, horsDishId, {
    name: 'Proposed bite shortlist',
    category: 'garnish',
    description:
      'Placeholder structural component so service, grocery, and prep workflows can reason about the hors d oeuvres course before the final choices are locked.',
    sortOrder: 1,
    makeAheadWindowHours: 24,
    storageNotes: 'Keep chilled until final shortlist is confirmed.',
    executionNotes: 'Finalize passed or station format once Becca confirms the selected bites.',
  })
  await ensureComponent(admin, tenantId, entreeDishId, {
    name: 'Tentative main setup',
    category: 'protein',
    description:
      'Placeholder structural component for the entree round while the final taco / chalupa / enchilada choice remains unknown.',
    sortOrder: 1,
    makeAheadWindowHours: 24,
    storageNotes: 'Hold make-ahead proteins and sauces separately for final selection.',
    executionNotes: 'Confirm final entree count before scaling proteins, tortillas, and sides.',
  })
  await ensureComponent(admin, tenantId, dessertDishId, {
    name: 'Dessert shortlist prep',
    category: 'dessert',
    description:
      'Placeholder dessert component so prep planning and execution docs have a concrete final course hook.',
    sortOrder: 1,
    makeAheadWindowHours: 48,
    storageNotes: 'Treat as a placeholder until the dessert pick is confirmed.',
    executionNotes: 'Finalize plating and frozen element needs once the dessert choice is locked.',
  })
}

async function ensurePrepBlock(
  admin: any,
  chefId: string,
  eventId: string,
  input: {
    title: string
    blockDate: string
    startTime: string
    endTime: string
    blockType:
      | 'grocery_run'
      | 'specialty_sourcing'
      | 'prep_session'
      | 'packing'
      | 'equipment_prep'
      | 'custom'
  }
): Promise<void> {
  const { data: existing, error: existingError } = await admin
    .from('event_prep_blocks')
    .select('id')
    .eq('chef_id', chefId)
    .eq('event_id', eventId)
    .eq('title', input.title)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to look up prep block ${input.title}: ${existingError.message}`)
  }

  const fields = {
    chef_id: chefId,
    event_id: eventId,
    block_date: input.blockDate,
    start_time: input.startTime,
    end_time: input.endTime,
    block_type: input.blockType,
    title: input.title,
    estimated_duration_minutes: 90,
    is_completed: false,
    is_system_generated: false,
  }

  if (existing?.id) {
    const { error } = await admin.from('event_prep_blocks').update(fields).eq('id', existing.id)
    if (error) throw new Error(`Failed to update prep block ${input.title}: ${error.message}`)
    return
  }

  const { error } = await admin.from('event_prep_blocks').insert(fields)
  if (error) throw new Error(`Failed to insert prep block ${input.title}: ${error.message}`)
}

async function ensurePrepBlocks(
  admin: any,
  chefId: string,
  eventId: string,
  eventDate: string
): Promise<void> {
  await ensurePrepBlock(admin, chefId, eventId, {
    title: 'Juna grocery run',
    blockDate: addDays(eventDate, -2),
    startTime: '10:00:00',
    endTime: '11:30:00',
    blockType: 'grocery_run',
  })
  await ensurePrepBlock(admin, chefId, eventId, {
    title: 'Juna prep session',
    blockDate: addDays(eventDate, -1),
    startTime: '13:00:00',
    endTime: '16:00:00',
    blockType: 'prep_session',
  })
  await ensurePrepBlock(admin, chefId, eventId, {
    title: 'Juna equipment and pack check',
    blockDate: eventDate,
    startTime: '13:30:00',
    endTime: '14:30:00',
    blockType: 'equipment_prep',
  })
}

async function ensureTravelLeg(
  admin: any,
  tenantId: string,
  chefId: string,
  eventId: string,
  eventDate: string
): Promise<void> {
  const { data: existing, error: existingError } = await admin
    .from('event_travel_legs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('primary_event_id', eventId)
    .eq('leg_type', 'service_travel')
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to look up service travel leg: ${existingError.message}`)
  }

  const fields = {
    tenant_id: tenantId,
    chef_id: chefId,
    primary_event_id: eventId,
    leg_type: 'service_travel',
    leg_date: eventDate,
    departure_time: '15:30:00',
    estimated_return_time: '23:00:00',
    origin_type: 'home',
    origin_address: 'Chef Bob home base',
    origin_label: 'Home Base',
    destination_type: 'venue',
    destination_address: 'Private house, Kennebunkport, ME',
    destination_label: 'Juna Dinner House',
    total_drive_minutes: 40,
    total_stop_minutes: 0,
    total_estimated_minutes: 40,
    purpose_notes:
      'Golden-case service travel leg seeded so the real Travel Plan and service simulation can reason about arrival.',
    status: 'planned',
  }

  if (existing?.id) {
    const { error } = await admin.from('event_travel_legs').update(fields).eq('id', existing.id)
    if (error) throw new Error(`Failed to update service travel leg: ${error.message}`)
    return
  }

  const { error } = await admin.from('event_travel_legs').insert(fields)
  if (error) throw new Error(`Failed to insert service travel leg: ${error.message}`)
}

async function ensureEventShare(
  admin: any,
  tenantId: string,
  eventId: string,
  clientId: string,
  guestCount: number
): Promise<string> {
  const { data: existing, error: existingError } = await admin
    .from('event_shares')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to look up event share: ${existingError.message}`)
  }

  const fields = {
    tenant_id: tenantId,
    event_id: eventId,
    created_by_client_id: clientId,
    token: `juna13-golden-case-${eventId.replace(/-/g, '').slice(0, 12)}`,
    is_active: true,
    visibility_settings: {
      show_menu: true,
      show_location: true,
      show_occasion: true,
      show_chef_name: true,
      show_date_time: true,
      show_guest_list: false,
      show_dietary_info: false,
      show_special_requests: false,
    },
    require_join_approval: false,
    reminders_enabled: false,
    enforce_capacity: true,
    waitlist_enabled: false,
    max_capacity: guestCount,
    pre_event_content: {
      note: 'Golden-case placeholder guest roster created because the thread only provided an aggregate guest count.',
    },
    day_of_reminders_enabled: false,
  }

  if (existing?.id) {
    const { error } = await admin.from('event_shares').update(fields).eq('id', existing.id)
    if (error) throw new Error(`Failed to update event share: ${error.message}`)
    return existing.id as string
  }

  const { data, error } = await admin.from('event_shares').insert(fields).select('id').single()
  if (error || !data) {
    throw new Error(`Failed to insert event share: ${error?.message || 'unknown error'}`)
  }

  return data.id as string
}

async function ensurePlaceholderGuests(
  admin: any,
  tenantId: string,
  eventId: string,
  eventShareId: string,
  guestCount: number
): Promise<void> {
  const { data: existingRows, error: existingError } = await admin
    .from('event_guests')
    .select('id, guest_token')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)

  if (existingError) {
    throw new Error(`Failed to look up placeholder guests: ${existingError.message}`)
  }

  const existingByToken = new Map(
    ((existingRows ?? []) as Array<{ id: string; guest_token: string }>).map((row) => [
      row.guest_token,
      row.id,
    ])
  )

  for (let index = 1; index <= guestCount; index += 1) {
    const token = `juna13-guest-${String(index).padStart(2, '0')}`
    const fields = {
      tenant_id: tenantId,
      event_id: eventId,
      event_share_id: eventShareId,
      guest_token: token,
      full_name: `Guest ${String(index).padStart(2, '0')} Placeholder`,
      email: null,
      phone: null,
      rsvp_status: 'attending',
      dietary_restrictions: [],
      allergies: [],
      notes:
        'Placeholder guest record seeded because the source thread only provided an aggregate count, not named guests.',
      plus_one: false,
      data_processing_consent: true,
      data_processing_consent_at: nowIso(),
      marketing_opt_in: false,
      attendance_queue_status: 'none',
    }

    const existingId = existingByToken.get(token)
    if (existingId) {
      const { error } = await admin.from('event_guests').update(fields).eq('id', existingId)
      if (error) throw new Error(`Failed to update placeholder guest ${token}: ${error.message}`)
      continue
    }

    const { error } = await admin.from('event_guests').insert(fields)
    if (error) throw new Error(`Failed to insert placeholder guest ${token}: ${error.message}`)
  }
}

async function maybeTriggerScheduledRefresh(eventDate: string): Promise<void> {
  const baseUrl = process.env.CHEFFLOW_BASE_URL || 'http://127.0.0.1:3100'
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.log('CRON_SECRET is not set; skipping scheduled readiness refresh.')
    return
  }

  const today = dateOnly(new Date())
  const daysUntilEvent =
    (new Date(`${eventDate}T00:00:00.000Z`).getTime() -
      new Date(`${today}T00:00:00.000Z`).getTime()) /
    (24 * 60 * 60 * 1000)

  if (daysUntilEvent > 7) {
    console.log(
      `Event date ${eventDate} is outside the 7-day scheduled readiness window; use the UI run button on the ops tab.`
    )
    return
  }

  try {
    const response = await fetch(`${baseUrl}/api/scheduled/service-readiness`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    })

    const body = await response.text()
    console.log('')
    console.log('=== SERVICE READINESS CRON ===')
    console.log(`Route: ${baseUrl}/api/scheduled/service-readiness`)
    console.log(`HTTP ${response.status}`)
    console.log(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log('')
    console.log('=== SERVICE READINESS CRON SKIPPED ===')
    console.log(`Could not reach ${baseUrl}/api/scheduled/service-readiness`)
    console.log(message)
  }
}

async function main() {
  const chefStatePath = chooseChefStatePath()
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as GoldenCaseFixture
  const chefState = JSON.parse(readFileSync(chefStatePath, 'utf-8')) as ChefState
  const admin: any = createAdminClient()
  const tenantId = chefState.tenantId
  const chefId = chefState.chefId
  const eventDate = resolveEventDate(fixture)

  console.log(`[golden-case] Seeding fixture: ${fixture.id}`)
  console.log(`[golden-case] Chef state: ${chefStatePath}`)
  console.log(`[golden-case] Tenant: ${tenantId}`)
  console.log(`[golden-case] Event date: ${eventDate}`)

  const clientId = await ensureClient(admin, tenantId, fixture)
  console.log(`[golden-case] Client ready: ${clientId}`)

  const eventId = await ensureEvent(admin, tenantId, clientId, fixture, eventDate)
  console.log(`[golden-case] Event ready: ${eventId}`)

  const menuId = await ensureMenu(admin, tenantId, eventId, fixture)
  console.log(`[golden-case] Menu ready: ${menuId}`)

  await ensureMenuStructure(admin, tenantId, menuId, fixture)
  console.log('[golden-case] Menu structure ready')

  await ensurePrepBlocks(admin, chefId, eventId, eventDate)
  console.log('[golden-case] Prep blocks ready')

  await ensureTravelLeg(admin, tenantId, chefId, eventId, eventDate)
  console.log('[golden-case] Travel leg ready')

  const eventShareId = await ensureEventShare(
    admin,
    tenantId,
    eventId,
    clientId,
    fixture.summary.guest_count
  )
  console.log(`[golden-case] Event share ready: ${eventShareId}`)

  await ensurePlaceholderGuests(admin, tenantId, eventId, eventShareId, fixture.summary.guest_count)
  console.log('[golden-case] Placeholder guest roster ready')

  console.log('')
  console.log('=== SEEDED EVENT ===')
  console.log(`Event:         /events/${eventId}`)
  console.log(`Ops:           /events/${eventId}?tab=ops#service-simulation`)
  console.log(`Menu approval: /events/${eventId}/menu-approval`)
  console.log(`Documents:     /events/${eventId}/documents`)
  console.log(`Prep plan:     /events/${eventId}/prep-plan`)
  console.log(`Pack:          /events/${eventId}/pack`)
  console.log(`Travel:        /events/${eventId}/travel`)
  console.log(`Execution:     /events/${eventId}/execution`)

  await maybeTriggerScheduledRefresh(eventDate)
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[golden-case] FAILED: ${message}`)
  process.exit(1)
})
