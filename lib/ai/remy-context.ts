'use server'

// Remy — Context Loader
// PRIVACY: Loads chef business context for Remy's system prompt.
// Contains client names, event details, and financial data — must stay local.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { RemyContext, PageEntityContext } from '@/lib/ai/remy-types'
import { getDailyPlanStats } from '@/lib/daily-ops/actions'

// ─── In-Memory Cache (per-tenant, 5-min TTL) ────────────────────────────────

interface CachedContext {
  data: Omit<
    RemyContext,
    | 'clientCount'
    | 'upcomingEventCount'
    | 'openInquiryCount'
    | 'currentPage'
    | 'chefName'
    | 'businessName'
    | 'tagline'
  >
  expiresAt: number
}

const contextCache = new Map<string, CachedContext>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Public Loader ──────────────────────────────────────────────────────────

export async function loadRemyContext(currentPage?: string): Promise<RemyContext> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Tier 1: Always fresh (cheap count queries + chef profile + daily plan)
  const [chefProfile, counts, dailyPlan] = await Promise.all([
    loadChefProfile(supabase, tenantId),
    loadQuickCounts(supabase, tenantId),
    getDailyPlanStats().catch(() => null),
  ])

  // Tier 2: Cached for 5 minutes
  const cached = contextCache.get(tenantId)
  let detailed: CachedContext['data']

  if (cached && cached.expiresAt > Date.now()) {
    detailed = cached.data
  } else {
    detailed = await loadDetailedContext(supabase, tenantId)
    contextCache.set(tenantId, {
      data: detailed,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
  }

  // Tier 3: Page-specific entity context (non-blocking)
  const pageEntity = await loadPageEntityContext(supabase, tenantId, currentPage).catch((err) => {
    console.error('[non-blocking] Page entity context failed:', err)
    return undefined
  })

  return {
    chefName: chefProfile.businessName,
    businessName: chefProfile.businessName,
    tagline: chefProfile.tagline,
    clientCount: counts.clients,
    upcomingEventCount: counts.upcomingEvents,
    openInquiryCount: counts.openInquiries,
    upcomingEvents: detailed.upcomingEvents,
    recentClients: detailed.recentClients,
    monthRevenueCents: detailed.monthRevenueCents,
    pendingQuoteCount: detailed.pendingQuoteCount,
    currentPage,
    pageEntity,
    dailyPlan: dailyPlan ?? undefined,
  }
}

// ─── Tier 1: Chef Profile ───────────────────────────────────────────────────

async function loadChefProfile(supabase: ReturnType<typeof createServerClient>, tenantId: string) {
  const { data } = await supabase
    .from('chefs')
    .select('business_name, tagline')
    .eq('id', tenantId)
    .single()

  return {
    businessName: data?.business_name ?? null,
    tagline: data?.tagline ?? null,
  }
}

// ─── Tier 1: Quick Counts ───────────────────────────────────────────────────

async function loadQuickCounts(supabase: ReturnType<typeof createServerClient>, tenantId: string) {
  const [clientsResult, eventsResult, inquiriesResult] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', new Date().toISOString().split('T')[0]),
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_chef', 'awaiting_client']),
  ])

  return {
    clients: clientsResult.count ?? 0,
    upcomingEvents: eventsResult.count ?? 0,
    openInquiries: inquiriesResult.count ?? 0,
  }
}

// ─── Tier 2: Detailed Context (cached 5 min) ────────────────────────────────

async function loadDetailedContext(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string
) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [eventsResult, clientsResult, revenueResult, quotesResult] = await Promise.all([
    // Upcoming events (next 7 days, limit 10)
    supabase
      .from('events')
      .select('id, occasion, event_date, status, guest_count, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', now.toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(10),

    // Recent clients (limit 5)
    supabase
      .from('clients')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Month revenue from ledger
    supabase
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('entry_type', 'payment')
      .gte('created_at', monthStart),

    // Pending quotes
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'sent']),
  ])

  const monthRevenueCents = (revenueResult.data ?? []).reduce(
    (sum, entry) => sum + ((entry as { amount_cents: number }).amount_cents ?? 0),
    0
  )

  return {
    upcomingEvents: (eventsResult.data ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      occasion: e.occasion as string | null,
      date: e.event_date as string | null,
      status: e.status as string,
      clientName: ((e.client as Record<string, unknown> | null)?.full_name as string) ?? 'Unknown',
      guestCount: e.guest_count as number | null,
    })),
    recentClients: (clientsResult.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: (c.full_name as string) ?? 'Unknown',
    })),
    monthRevenueCents,
    pendingQuoteCount: quotesResult.count ?? 0,
  }
}

// ─── Tier 3: Page Entity Context ────────────────────────────────────────────
// Detects entity IDs from the current URL and fetches rich detail so Remy
// understands exactly what the chef is looking at.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

async function loadPageEntityContext(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  currentPage?: string
): Promise<PageEntityContext | undefined> {
  if (!currentPage) return undefined

  const idMatch = currentPage.match(UUID_RE)
  if (!idMatch) return undefined
  const entityId = idMatch[0]

  if (currentPage.startsWith('/events/')) {
    return loadEventEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/clients/')) {
    return loadClientEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/recipes/')) {
    return loadRecipeEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/inquiries/')) {
    return loadInquiryEntity(supabase, tenantId, entityId)
  }
  if (currentPage.startsWith('/menus/')) {
    return loadMenuEntity(supabase, tenantId, entityId)
  }

  return undefined
}

async function loadEventEntity(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  eventId: string
): Promise<PageEntityContext | undefined> {
  const { data } = await supabase
    .from('events')
    .select(
      `id, occasion, event_date, serve_time, guest_count, status, service_style,
       location_address, location_city, location_state,
       dietary_restrictions, allergies, special_requests,
       quoted_price_cents, payment_status, kitchen_notes,
       prep_list_ready, grocery_list_ready, timeline_ready,
       client:clients(full_name, email, phone, dietary_restrictions, allergies, vibe_notes)`
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) return undefined

  const client = data.client as Record<string, unknown> | null
  const lines: string[] = []
  lines.push(`EVENT: ${data.occasion ?? 'Untitled event'}`)
  lines.push(`Status: ${data.status}`)
  lines.push(`Date: ${data.event_date ?? 'TBD'}${data.serve_time ? ` at ${data.serve_time}` : ''}`)
  lines.push(`Guests: ${data.guest_count ?? 'TBD'}`)
  if (data.service_style) lines.push(`Style: ${data.service_style.replace(/_/g, ' ')}`)
  if (data.location_address) {
    lines.push(
      `Location: ${data.location_address}, ${data.location_city ?? ''} ${data.location_state ?? ''}`.trim()
    )
  }
  if (data.quoted_price_cents) lines.push(`Quoted: $${(data.quoted_price_cents / 100).toFixed(2)}`)
  if (data.payment_status) lines.push(`Payment: ${data.payment_status.replace(/_/g, ' ')}`)
  if (data.dietary_restrictions?.length)
    lines.push(`Dietary: ${data.dietary_restrictions.join(', ')}`)
  if (data.allergies?.length) lines.push(`Allergies: ${data.allergies.join(', ')}`)
  if (data.special_requests) lines.push(`Special requests: ${data.special_requests}`)
  if (data.kitchen_notes) lines.push(`Kitchen notes: ${data.kitchen_notes}`)

  const readiness: string[] = []
  if (data.prep_list_ready) readiness.push('prep')
  if (data.grocery_list_ready) readiness.push('grocery')
  if (data.timeline_ready) readiness.push('timeline')
  if (readiness.length > 0) lines.push(`Ready: ${readiness.join(', ')}`)
  const notReady: string[] = []
  if (!data.prep_list_ready) notReady.push('prep')
  if (!data.grocery_list_ready) notReady.push('grocery')
  if (!data.timeline_ready) notReady.push('timeline')
  if (notReady.length > 0) lines.push(`Not ready: ${notReady.join(', ')}`)

  if (client) {
    lines.push(`\nCLIENT: ${client.full_name ?? 'Unknown'}`)
    if (client.email) lines.push(`Email: ${client.email}`)
    if (client.phone) lines.push(`Phone: ${client.phone}`)
    if ((client.dietary_restrictions as string[] | null)?.length)
      lines.push(`Client dietary: ${(client.dietary_restrictions as string[]).join(', ')}`)
    if ((client.allergies as string[] | null)?.length)
      lines.push(`Client allergies: ${(client.allergies as string[]).join(', ')}`)
    if (client.vibe_notes) lines.push(`Vibe: ${client.vibe_notes}`)
  }

  return { type: 'event', summary: lines.join('\n') }
}

async function loadClientEntity(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  clientId: string
): Promise<PageEntityContext | undefined> {
  const { data } = await supabase
    .from('clients')
    .select(
      `id, full_name, email, phone, preferred_contact_method, referral_source,
       partner_name, dietary_restrictions, allergies, dislikes, spice_tolerance,
       favorite_cuisines, favorite_dishes, vibe_notes, payment_behavior,
       tipping_pattern, what_they_care_about, kitchen_size, kitchen_constraints,
       lifetime_value_cents, total_events_count, average_spend_cents, status`
    )
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) return undefined

  const lines: string[] = []
  lines.push(`CLIENT: ${data.full_name ?? 'Unknown'}`)
  lines.push(`Status: ${data.status ?? 'active'}`)
  if (data.email) lines.push(`Email: ${data.email}`)
  if (data.phone) lines.push(`Phone: ${data.phone}`)
  if (data.preferred_contact_method) lines.push(`Prefers: ${data.preferred_contact_method}`)
  if (data.referral_source) lines.push(`Source: ${data.referral_source.replace(/_/g, ' ')}`)
  if (data.partner_name) lines.push(`Partner: ${data.partner_name}`)
  if (data.dietary_restrictions?.length)
    lines.push(`Dietary: ${data.dietary_restrictions.join(', ')}`)
  if (data.allergies?.length) lines.push(`Allergies: ${data.allergies.join(', ')}`)
  if (data.dislikes?.length) lines.push(`Dislikes: ${data.dislikes.join(', ')}`)
  if (data.spice_tolerance) lines.push(`Spice tolerance: ${data.spice_tolerance}`)
  if (data.favorite_cuisines?.length)
    lines.push(`Favorite cuisines: ${data.favorite_cuisines.join(', ')}`)
  if (data.favorite_dishes?.length)
    lines.push(`Favorite dishes: ${data.favorite_dishes.join(', ')}`)
  if (data.vibe_notes) lines.push(`Vibe: ${data.vibe_notes}`)
  if (data.what_they_care_about) lines.push(`Cares about: ${data.what_they_care_about}`)
  if (data.payment_behavior) lines.push(`Payment behavior: ${data.payment_behavior}`)
  if (data.tipping_pattern) lines.push(`Tipping: ${data.tipping_pattern}`)
  if (data.kitchen_size) lines.push(`Kitchen: ${data.kitchen_size}`)
  if (data.kitchen_constraints) lines.push(`Kitchen constraints: ${data.kitchen_constraints}`)
  if (data.total_events_count) lines.push(`Total events: ${data.total_events_count}`)
  if (data.lifetime_value_cents)
    lines.push(`Lifetime value: $${(data.lifetime_value_cents / 100).toFixed(2)}`)
  if (data.average_spend_cents)
    lines.push(`Avg spend: $${(data.average_spend_cents / 100).toFixed(2)}`)

  return { type: 'client', summary: lines.join('\n') }
}

async function loadRecipeEntity(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  recipeId: string
): Promise<PageEntityContext | undefined> {
  const [recipeResult, ingredientsResult] = await Promise.all([
    supabase
      .from('recipes')
      .select(
        `id, name, category, description, method, yield_description,
         prep_time_minutes, cook_time_minutes, total_time_minutes,
         dietary_tags, notes, adaptations, times_cooked, last_cooked_at`
      )
      .eq('id', recipeId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('recipe_ingredients')
      .select('quantity, unit, preparation_notes, ingredient:ingredients(name, allergen_flags)')
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: true })
      .limit(30),
  ])

  const data = recipeResult.data
  if (!data) return undefined

  const lines: string[] = []
  lines.push(`RECIPE: ${data.name}`)
  if (data.category) lines.push(`Category: ${data.category}`)
  if (data.description) lines.push(`Description: ${data.description}`)
  if (data.yield_description) lines.push(`Yield: ${data.yield_description}`)
  const times: string[] = []
  if (data.prep_time_minutes) times.push(`prep ${data.prep_time_minutes}m`)
  if (data.cook_time_minutes) times.push(`cook ${data.cook_time_minutes}m`)
  if (data.total_time_minutes) times.push(`total ${data.total_time_minutes}m`)
  if (times.length) lines.push(`Time: ${times.join(', ')}`)
  if (data.dietary_tags?.length) lines.push(`Dietary: ${data.dietary_tags.join(', ')}`)
  if (data.times_cooked) lines.push(`Cooked ${data.times_cooked} times`)
  if (data.notes) lines.push(`Notes: ${data.notes}`)
  if (data.adaptations) lines.push(`Adaptations: ${data.adaptations}`)

  const ingredients = ingredientsResult.data ?? []
  if (ingredients.length > 0) {
    lines.push(`\nINGREDIENTS (${ingredients.length}):`)
    for (const ing of ingredients) {
      const ingData = ing.ingredient as Record<string, unknown> | null
      const name = (ingData?.name as string) ?? 'Unknown'
      const qty = ing.quantity ? `${ing.quantity}` : ''
      const unit = ing.unit ?? ''
      const prep = ing.preparation_notes ? ` (${ing.preparation_notes})` : ''
      lines.push(`- ${qty} ${unit} ${name}${prep}`.trim())
    }
  }

  return { type: 'recipe', summary: lines.join('\n') }
}

async function loadInquiryEntity(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  inquiryId: string
): Promise<PageEntityContext | undefined> {
  const { data } = await supabase
    .from('inquiries')
    .select(
      `id, channel, status, source_message,
       confirmed_date, confirmed_guest_count, confirmed_location,
       confirmed_occasion, confirmed_budget_cents, confirmed_dietary_restrictions,
       unknown_fields, next_action_required, next_action_by,
       follow_up_due_at, first_contact_at,
       client:clients(full_name, email, phone)`
    )
    .eq('id', inquiryId)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) return undefined

  const client = data.client as Record<string, unknown> | null
  const lines: string[] = []
  lines.push(`INQUIRY: ${data.confirmed_occasion ?? 'New inquiry'}`)
  lines.push(`Status: ${data.status}`)
  if (data.channel) lines.push(`Channel: ${data.channel}`)
  if (client?.full_name) lines.push(`Client: ${client.full_name}`)
  if (client?.email) lines.push(`Email: ${client.email}`)
  if (client?.phone) lines.push(`Phone: ${client.phone}`)
  if (data.confirmed_date) lines.push(`Date: ${data.confirmed_date}`)
  if (data.confirmed_guest_count) lines.push(`Guests: ${data.confirmed_guest_count}`)
  if (data.confirmed_location) lines.push(`Location: ${data.confirmed_location}`)
  if (data.confirmed_budget_cents)
    lines.push(`Budget: $${(data.confirmed_budget_cents / 100).toFixed(2)}`)
  if (data.confirmed_dietary_restrictions?.length)
    lines.push(`Dietary: ${data.confirmed_dietary_restrictions.join(', ')}`)
  if (data.source_message) {
    const msg =
      data.source_message.length > 300
        ? data.source_message.slice(0, 300) + '...'
        : data.source_message
    lines.push(`Original message: ${msg}`)
  }
  if (data.unknown_fields && Array.isArray(data.unknown_fields) && data.unknown_fields.length > 0)
    lines.push(`Unanswered questions: ${(data.unknown_fields as string[]).join('; ')}`)
  if (data.next_action_required)
    lines.push(`Next action: ${data.next_action_required} (by ${data.next_action_by ?? '?'})`)
  if (data.follow_up_due_at) lines.push(`Follow-up due: ${data.follow_up_due_at}`)

  return { type: 'inquiry', summary: lines.join('\n') }
}

async function loadMenuEntity(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  menuId: string
): Promise<PageEntityContext | undefined> {
  const [menuResult, dishesResult] = await Promise.all([
    supabase
      .from('menus')
      .select(
        `id, name, description, status, cuisine_type, service_style,
         target_guest_count, is_template, notes`
      )
      .eq('id', menuId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('dishes')
      .select(
        `id, course_number, course_name, description, dietary_tags, allergen_flags, chef_notes,
         components(name, category, recipe:recipes(name))`
      )
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: true })
      .limit(20),
  ])

  const data = menuResult.data
  if (!data) return undefined

  const lines: string[] = []
  lines.push(`MENU: ${data.name}`)
  lines.push(`Status: ${data.status}`)
  if (data.cuisine_type) lines.push(`Cuisine: ${data.cuisine_type}`)
  if (data.service_style) lines.push(`Style: ${data.service_style.replace(/_/g, ' ')}`)
  if (data.target_guest_count) lines.push(`Target guests: ${data.target_guest_count}`)
  if (data.is_template) lines.push(`(Template — reusable)`)
  if (data.description) lines.push(`Description: ${data.description}`)
  if (data.notes) lines.push(`Notes: ${data.notes}`)

  const dishes = (dishesResult.data ?? []) as Array<Record<string, unknown>>
  if (dishes.length > 0) {
    lines.push(`\nCOURSES (${dishes.length}):`)
    for (const dish of dishes) {
      const courseName = (dish.course_name as string) ?? `Course ${dish.course_number}`
      const desc = dish.description ? `: ${dish.description}` : ''
      lines.push(`\n${courseName}${desc}`)
      if ((dish.dietary_tags as string[] | null)?.length)
        lines.push(`  Dietary: ${(dish.dietary_tags as string[]).join(', ')}`)
      if ((dish.allergen_flags as string[] | null)?.length)
        lines.push(`  Allergens: ${(dish.allergen_flags as string[]).join(', ')}`)
      const components = (dish.components ?? []) as Array<Record<string, unknown>>
      for (const comp of components) {
        const recipe = comp.recipe as Record<string, unknown> | null
        const recipeName = recipe?.name ? ` (recipe: ${recipe.name})` : ''
        lines.push(`  - ${comp.name}${recipeName}`)
      }
    }
  }

  return { type: 'menu', summary: lines.join('\n') }
}

// ─── Tier 4: Message-Aware Entity Resolution ────────────────────────────────
// Scans the user's message for client names, event occasions, and recipe names.
// If a match is found in the DB, loads the full entity so Remy can answer
// questions about any entity mentioned by name — regardless of what page
// the chef is on.

export async function resolveMessageEntities(message: string): Promise<PageEntityContext[]> {
  if (!message || message.length < 3) return []

  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Normalize message for matching
  const msgLower = message.toLowerCase()

  // Run all searches in parallel — each is cheap (indexed ilike, limit 3)
  const [clientHits, eventHits, recipeHits] = await Promise.all([
    findMentionedClients(supabase, tenantId, msgLower),
    findMentionedEvents(supabase, tenantId, msgLower),
    findMentionedRecipes(supabase, tenantId, msgLower),
  ])

  const results: PageEntityContext[] = []

  // Load full details for matched entities (limit to 3 total to keep prompt lean)
  for (const client of clientHits.slice(0, 2)) {
    const ctx = await loadClientEntity(supabase, tenantId, client.id)
    if (ctx) results.push(ctx)
  }
  for (const event of eventHits.slice(0, 2)) {
    const ctx = await loadEventEntity(supabase, tenantId, event.id)
    if (ctx) results.push(ctx)
  }
  for (const recipe of recipeHits.slice(0, 1)) {
    const ctx = await loadRecipeEntity(supabase, tenantId, recipe.id)
    if (ctx) results.push(ctx)
  }

  return results.slice(0, 3) // Hard cap: 3 entities max
}

async function findMentionedClients(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string; full_name: string }>> {
  // Get all client names for this tenant (cached in Tier 2, so this is usually fast)
  const { data } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('tenant_id', tenantId)
    .limit(200)

  if (!data) return []

  // Match: check if any client's first name, last name, or full name appears in the message
  return data.filter((c) => {
    if (!c.full_name) return false
    const fullLower = c.full_name.toLowerCase()
    // Full name match
    if (msgLower.includes(fullLower)) return true
    // Last name match (more unique, less likely to false-positive)
    const parts = fullLower.split(/\s+/)
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1]
      // Only match last names 3+ chars to avoid matching "Mr" or "Li" etc.
      if (lastName.length >= 3 && msgLower.includes(lastName)) return true
    }
    return false
  })
}

async function findMentionedEvents(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  // Get recent events with their occasion and client name
  const { data } = await supabase
    .from('events')
    .select('id, occasion, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: false })
    .limit(50)

  if (!data) return []

  return data.filter((e) => {
    // Match by occasion name
    if (e.occasion && msgLower.includes(e.occasion.toLowerCase())) return true
    // Match by client name + event-related keywords
    const client = e.client as Record<string, unknown> | null
    if (client?.full_name) {
      const clientLower = (client.full_name as string).toLowerCase()
      const eventKeywords = ['event', 'dinner', 'party', 'booking', 'gig', 'service', 'cook']
      if (msgLower.includes(clientLower) && eventKeywords.some((k) => msgLower.includes(k))) {
        return true
      }
    }
    return false
  })
}

async function findMentionedRecipes(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  msgLower: string
): Promise<Array<{ id: string }>> {
  const { data } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .limit(200)

  if (!data) return []

  return data.filter((r) => {
    if (!r.name) return false
    return msgLower.includes(r.name.toLowerCase())
  })
}
