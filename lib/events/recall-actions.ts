'use server'

// Event Total Recall - Server Actions
// Complete event archive retrieval for instant chef recall.
// Auth-gated via requireChef(), tenant-scoped on every query.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  EventRecall,
  RecallMenuCourse,
  RecallFinancial,
  RecallContract,
  RecallGuest,
  RecallPhoto,
  RecallWeather,
  RecallDebrief,
  RecallVenue,
  RecallServiceDetails,
  ClientHistory,
  ClientEventSummary,
  SeasonalContext,
  SeasonalShift,
  SearchPastEventsParams,
  PastEventSearchResult,
  PastEventSearchResponse,
} from './recall-types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSeason(dateStr: string): string {
  const month = new Date(dateStr).getMonth() // 0-indexed
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}

function getMonthName(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'long' })
}

function computeDurationMinutes(event: Record<string, any>): number | null {
  const serviceMin = event.time_service_minutes as number | null
  const prepMin = event.time_prep_minutes as number | null
  const travelMin = event.time_travel_minutes as number | null
  const resetMin = event.time_reset_minutes as number | null
  const shoppingMin = event.time_shopping_minutes as number | null

  const parts = [serviceMin, prepMin, travelMin, resetMin, shoppingMin].filter(
    (v): v is number => v != null
  )
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null
}

// ─── getEventRecall ─────────────────────────────────────────────────────────

/**
 * Assembles the complete event record for total recall.
 * One call returns everything: menu, financial, contract, guests, venue,
 * weather, photos, and debrief data.
 */
export async function getEventRecall(eventId: string): Promise<EventRecall | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // 1. Core event + client in one query
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, status, created_at, event_date, serve_time, arrival_time, departure_time,
      guest_count, guest_count_confirmed, occasion, service_style,
      location_address, location_city, location_state, location_zip,
      location_notes, access_instructions, special_requests,
      kitchen_notes, site_notes, cannabis_preference, booking_source,
      quoted_price_cents, pricing_model, deposit_amount_cents,
      payment_status, tip_amount_cents,
      time_shopping_minutes, time_prep_minutes, time_travel_minutes,
      time_service_minutes, time_reset_minutes,
      debrief_completed_at, chef_outcome_notes, chef_outcome_rating,
      client:clients(
        id, full_name, preferred_name, email, phone,
        dietary_restrictions, allergies, vibe_notes
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null

  const clientData = event.client as Record<string, any> | null

  // 2. Parallel fetches for all supplementary data
  const [
    menuResult,
    ledgerResult,
    contractResult,
    guestResult,
    photoResult,
    weatherResult,
    aarResult,
    venueResult,
  ] = await Promise.all([
    // Menu chain: menus -> dishes -> components (with recipe names)
    db
      .from('menus')
      .select(
        `
        id, name,
        dishes(
          course_number, course_name, name, description,
          dietary_tags, allergen_flags, chef_notes,
          beverage_pairing,
          components(name, category, recipe:recipes(name))
        )
      `
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .then((r: any) => r.data ?? []),

    // Ledger entries (payments, deposits, tips)
    db
      .from('ledger_entries')
      .select('entry_type, amount_cents, payment_method, description, created_at')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .then((r: any) => r.data ?? []),

    // Contract
    db
      .from('event_contracts')
      .select('id, status, body_snapshot, sent_at, signed_at, voided_at, void_reason')
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then((r: any) => r.data?.[0] ?? null),

    // Guest list
    db
      .from('event_guests')
      .select(
        `
        id, full_name, email, rsvp_status,
        dietary_restrictions, allergies, notes,
        plus_one, plus_one_name, actual_attended
      `
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true })
      .then((r: any) => r.data ?? []),

    // Photos (metadata only, no signed URLs here)
    db
      .from('event_photos')
      .select('id, caption, photo_type, display_order, created_at')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .then((r: any) => r.data ?? []),

    // Weather
    db
      .from('event_weather_snapshots')
      .select(
        'forecast_high_f, forecast_low_f, condition, precip_probability, wind_speed_mph, actual_notes, captured_at'
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then((r: any) => r.data ?? null),

    // After-action review
    db
      .from('after_action_reviews')
      .select(
        `
        calm_rating, preparation_rating, execution_rating,
        what_went_well, what_went_wrong, would_do_differently,
        menu_performance_notes, client_behavior_notes,
        site_notes, general_notes, forgotten_items
      `
      )
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then((r: any) => r.data ?? null),

    // Venue details
    db
      .from('event_venue_details')
      .select(
        `
        parking_instructions, access_instructions, directions_from_road,
        property_rules, kitchen_zone, dining_zone,
        power_access_notes, water_access_notes, restroom_info,
        rain_backup_plan, farm_name
      `
      )
      .eq('event_id', eventId)
      .maybeSingle()
      .then((r: any) => r.data ?? null),
  ])

  // 3. Assemble service details
  const service: RecallServiceDetails = {
    eventDate: event.event_date,
    serveTime: event.serve_time,
    arrivalTime: event.arrival_time,
    departureTime: event.departure_time,
    durationMinutes: computeDurationMinutes(event),
    locationAddress: event.location_address,
    locationCity: event.location_city,
    locationState: event.location_state,
    locationZip: event.location_zip,
    locationNotes: event.location_notes,
    guestCountPlanned: event.guest_count,
    guestCountConfirmed: event.guest_count_confirmed ?? false,
    occasion: event.occasion,
    serviceStyle: event.service_style,
    specialRequests: event.special_requests,
    kitchenNotes: event.kitchen_notes,
    siteNotes: event.site_notes,
    accessInstructions: event.access_instructions,
    cannabisPreference: event.cannabis_preference,
    bookingSource: event.booking_source,
  }

  // 4. Flatten menu courses from all menus
  const menu: RecallMenuCourse[] = []
  for (const m of menuResult) {
    const dishes = (m.dishes as any[]) ?? []
    for (const d of dishes) {
      const comps = (d.components as any[]) ?? []
      menu.push({
        courseNumber: d.course_number,
        courseName: d.course_name,
        dishName: d.name,
        dishDescription: d.description,
        dietaryTags: (d.dietary_tags ?? []).filter((t: string) => t),
        allergenFlags: (d.allergen_flags ?? []).filter((t: string) => t),
        chefNotes: d.chef_notes,
        beveragePairing: d.beverage_pairing,
        components: comps.map((c: any) => ({
          name: c.name,
          category: c.category,
          recipeName: (c.recipe as any)?.name ?? null,
        })),
      })
    }
  }
  menu.sort((a, b) => a.courseNumber - b.courseNumber)

  // 5. Financial summary
  const totalPaidCents = (ledgerResult as any[]).reduce(
    (sum: number, e: any) => sum + (e.is_refund ? -e.amount_cents : e.amount_cents),
    0
  )
  const financial: RecallFinancial = {
    quotedPriceCents: event.quoted_price_cents,
    pricingModel: event.pricing_model,
    depositAmountCents: event.deposit_amount_cents,
    paymentStatus: event.payment_status,
    tipAmountCents: event.tip_amount_cents ?? 0,
    totalPaidCents,
    perHeadCostCents:
      event.quoted_price_cents && event.guest_count > 0
        ? Math.round(event.quoted_price_cents / event.guest_count)
        : null,
    payments: (ledgerResult as any[]).map((e: any) => ({
      entryType: e.entry_type,
      amountCents: e.amount_cents,
      paymentMethod: e.payment_method,
      description: e.description,
      createdAt: e.created_at,
    })),
  }

  // 6. Contract
  const contract: RecallContract | null = contractResult
    ? {
        id: contractResult.id,
        status: contractResult.status,
        bodySnapshot: contractResult.body_snapshot,
        sentAt: contractResult.sent_at,
        signedAt: contractResult.signed_at,
        voidedAt: contractResult.voided_at,
        voidReason: contractResult.void_reason,
      }
    : null

  // 7. Guests
  const guests: RecallGuest[] = (guestResult as any[]).map((g: any) => ({
    id: g.id,
    fullName: g.full_name,
    email: g.email,
    rsvpStatus: g.rsvp_status,
    dietaryRestrictions: (g.dietary_restrictions ?? []).filter((v: string) => v),
    allergies: (g.allergies ?? []).filter((v: string) => v),
    notes: g.notes,
    plusOne: g.plus_one,
    plusOneName: g.plus_one_name,
    actualAttended: g.actual_attended,
  }))

  // 8. Photos
  const photos: RecallPhoto[] = (photoResult as any[]).map((p: any) => ({
    id: p.id,
    caption: p.caption,
    photoType: p.photo_type,
    displayOrder: p.display_order,
    createdAt: p.created_at,
  }))

  // 9. Weather
  const weather: RecallWeather | null = weatherResult
    ? {
        forecastHighF: weatherResult.forecast_high_f,
        forecastLowF: weatherResult.forecast_low_f,
        condition: weatherResult.condition,
        precipProbability: weatherResult.precip_probability,
        windSpeedMph: weatherResult.wind_speed_mph,
        actualNotes: weatherResult.actual_notes,
        capturedAt: weatherResult.captured_at,
      }
    : null

  // 10. Debrief + AAR
  const debrief: RecallDebrief = {
    chefOutcomeNotes: event.chef_outcome_notes,
    chefOutcomeRating: event.chef_outcome_rating,
    debriefCompletedAt: event.debrief_completed_at,
    aar: aarResult
      ? {
          calmRating: aarResult.calm_rating,
          preparationRating: aarResult.preparation_rating,
          executionRating: aarResult.execution_rating,
          whatWentWell: aarResult.what_went_well,
          whatWentWrong: aarResult.what_went_wrong,
          wouldDoDifferently: aarResult.would_do_differently,
          menuPerformanceNotes: aarResult.menu_performance_notes,
          clientBehaviorNotes: aarResult.client_behavior_notes,
          siteNotes: aarResult.site_notes,
          generalNotes: aarResult.general_notes,
          forgottenItems: (aarResult.forgotten_items ?? []).filter((v: string) => v),
        }
      : null,
  }

  // 11. Venue
  const venue: RecallVenue | null = venueResult
    ? {
        parkingInstructions: venueResult.parking_instructions,
        accessInstructions: venueResult.access_instructions,
        directionsFromRoad: venueResult.directions_from_road,
        propertyRules: venueResult.property_rules ?? [],
        kitchenZone: venueResult.kitchen_zone,
        diningZone: venueResult.dining_zone,
        powerAccessNotes: venueResult.power_access_notes,
        waterAccessNotes: venueResult.water_access_notes,
        restroomInfo: venueResult.restroom_info,
        rainBackupPlan: venueResult.rain_backup_plan,
        farmName: venueResult.farm_name,
      }
    : null

  return {
    event: {
      id: event.id,
      status: event.status,
      createdAt: event.created_at,
    },
    client: {
      id: clientData?.id ?? '',
      fullName: clientData?.full_name ?? 'Unknown',
      preferredName: clientData?.preferred_name ?? null,
      email: clientData?.email ?? '',
      phone: clientData?.phone ?? null,
      dietaryRestrictions: clientData?.dietary_restrictions ?? null,
      allergies: clientData?.allergies ?? null,
      vibeNotes: clientData?.vibe_notes ?? null,
    },
    service,
    menu,
    financial,
    contract,
    guests,
    photos,
    weather,
    debrief,
    venue,
  }
}

// ─── getClientEventHistory ──────────────────────────────────────────────────

/**
 * All past events for a client, with summary cards.
 * Ordered by event_date descending (most recent first).
 */
export async function getClientEventHistory(clientId: string): Promise<ClientHistory | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Client profile
  const { data: client } = await db
    .from('clients')
    .select(
      `
      id, full_name, preferred_name, email, phone,
      total_events_count, lifetime_value_cents,
      first_event_date, last_event_date, loyalty_tier
    `
    )
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) return null

  // All events for this client (non-deleted)
  const { data: eventRows } = await db
    .from('events')
    .select(
      `
      id, event_date, occasion, guest_count, service_style, status,
      location_city, location_state,
      quoted_price_cents, tip_amount_cents,
      chef_outcome_rating,
      menus(name, dishes(course_name, name))
    `
    )
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('event_date', { ascending: false })

  if (!eventRows) return { client: buildClientSummary(client), events: [] }

  // Photo counts per event (batch)
  const eventIds = eventRows.map((e: any) => e.id)
  let photoCounts: Record<string, number> = {}
  if (eventIds.length > 0) {
    try {
      const { data: photoRows } = await db
        .from('event_photos')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (photoRows) {
        for (const row of photoRows as any[]) {
          photoCounts[row.event_id] = (photoCounts[row.event_id] ?? 0) + 1
        }
      }
    } catch {
      // Non-blocking; photo counts just show 0
    }
  }

  const events: ClientEventSummary[] = eventRows.map((e: any) => {
    const menus = (e.menus as any[]) ?? []
    const firstMenu = menus[0] ?? null
    const dishes = (firstMenu?.dishes as any[]) ?? []

    // Extract up to 3 course highlights
    const courseHighlights = dishes
      .slice(0, 3)
      .map((d: any) => (d.name ? `${d.course_name}: ${d.name}` : d.course_name))

    return {
      id: e.id,
      eventDate: e.event_date,
      occasion: e.occasion,
      guestCount: e.guest_count,
      serviceStyle: e.service_style,
      status: e.status,
      locationCity: e.location_city,
      locationState: e.location_state,
      quotedPriceCents: e.quoted_price_cents,
      tipAmountCents: e.tip_amount_cents ?? 0,
      chefOutcomeRating: e.chef_outcome_rating,
      menuName: firstMenu?.name ?? null,
      courseHighlights,
      photoCount: photoCounts[e.id] ?? 0,
    }
  })

  return {
    client: buildClientSummary(client),
    events,
  }
}

function buildClientSummary(client: Record<string, any>) {
  return {
    id: client.id,
    fullName: client.full_name,
    preferredName: client.preferred_name ?? null,
    email: client.email,
    phone: client.phone ?? null,
    totalEventsCount: client.total_events_count ?? 0,
    lifetimeValueCents: client.lifetime_value_cents ?? 0,
    firstEventDate: client.first_event_date ?? null,
    lastEventDate: client.last_event_date ?? null,
    loyaltyTier: client.loyalty_tier ?? 'bronze',
  }
}

// ─── searchPastEvents ──────────────────────────────────────────────────────

/**
 * Search past events by keyword, client, date range, occasion, location, or dish.
 * Keyword search matches across client name, dish names, menu names, occasion,
 * and location fields. Returns paginated results with match metadata.
 */
export async function searchPastEvents(
  params: SearchPastEventsParams
): Promise<PastEventSearchResponse> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const limit = Math.min(params.limit ?? 20, 100)
  const offset = params.offset ?? 0

  // Build the base query
  let q = db
    .from('events')
    .select(
      `
      id, event_date, occasion, guest_count, service_style, status,
      location_city, location_state, location_address,
      quoted_price_cents, chef_outcome_rating,
      client_id,
      client:clients(id, full_name),
      menus(name, dishes(course_name, name))
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  // Apply filters
  if (params.clientId) {
    q = q.eq('client_id', params.clientId)
  }
  if (params.dateFrom) {
    q = q.gte('event_date', params.dateFrom)
  }
  if (params.dateTo) {
    q = q.lte('event_date', params.dateTo)
  }
  if (params.occasion) {
    q = q.ilike('occasion', `%${params.occasion}%`)
  }
  if (params.status) {
    q = q.eq('status', params.status)
  }
  if (params.location) {
    q = q.or(
      `location_city.ilike.%${params.location}%,location_state.ilike.%${params.location}%,location_address.ilike.%${params.location}%`
    )
  }

  // Order by most recent first, with pagination
  q = q.order('event_date', { ascending: false }).range(offset, offset + limit - 1)

  const { data: eventRows, count } = await q

  if (!eventRows || eventRows.length === 0) {
    return { results: [], totalCount: count ?? 0, hasMore: false }
  }

  const keyword = params.query?.toLowerCase().trim() ?? ''

  // Map rows to search results, applying keyword filter in-memory
  // (keyword matches across client name, dishes, menu name, occasion, location)
  const mapped: PastEventSearchResult[] = []

  for (const e of eventRows as any[]) {
    const clientData = e.client as Record<string, any> | null
    const clientName = clientData?.full_name ?? 'Unknown'
    const menus = (e.menus as any[]) ?? []
    const firstMenu = menus[0] ?? null
    const dishes = (firstMenu?.dishes as any[]) ?? []

    const courseHighlights = dishes
      .slice(0, 3)
      .map((d: any) => (d.name ? `${d.course_name}: ${d.name}` : d.course_name))

    // Keyword matching
    const matchedOn: string[] = []
    if (keyword) {
      const clientMatch = clientName.toLowerCase().includes(keyword)
      const occasionMatch = (e.occasion ?? '').toLowerCase().includes(keyword)
      const locationMatch =
        (e.location_city ?? '').toLowerCase().includes(keyword) ||
        (e.location_state ?? '').toLowerCase().includes(keyword) ||
        (e.location_address ?? '').toLowerCase().includes(keyword)
      const menuMatch = menus.some((m: any) => (m.name ?? '').toLowerCase().includes(keyword))
      const dishMatch = dishes.some((d: any) => (d.name ?? '').toLowerCase().includes(keyword))

      if (clientMatch) matchedOn.push('client')
      if (occasionMatch) matchedOn.push('occasion')
      if (locationMatch) matchedOn.push('location')
      if (menuMatch) matchedOn.push('menu')
      if (dishMatch) matchedOn.push('dish')

      // Skip if keyword was provided but nothing matched
      if (matchedOn.length === 0) continue
    }

    mapped.push({
      id: e.id,
      eventDate: e.event_date,
      occasion: e.occasion,
      status: e.status,
      clientName,
      clientId: clientData?.id ?? e.client_id,
      guestCount: e.guest_count,
      serviceStyle: e.service_style,
      locationCity: e.location_city,
      locationState: e.location_state,
      quotedPriceCents: e.quoted_price_cents,
      menuName: firstMenu?.name ?? null,
      courseHighlights,
      chefOutcomeRating: e.chef_outcome_rating,
      matchedOn,
    })
  }

  const totalCount = count ?? 0
  return {
    results: mapped,
    totalCount,
    hasMore: offset + limit < totalCount,
  }
}

// ─── getSeasonalContext ─────────────────────────────────────────────────────

/**
 * Seasonal context for an event: what was happening around this date
 * in prior years, and nearby events in the same timeframe.
 * Helps the chef understand seasonal shifts when a returning client rebooks.
 */
export async function getSeasonalContext(eventId: string): Promise<SeasonalContext | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Get the target event
  const { data: event } = await db
    .from('events')
    .select('id, event_date, occasion, client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null

  const eventDate = new Date(event.event_date)
  const eventMonth = eventDate.getMonth() // 0-indexed
  const eventYear = eventDate.getFullYear()

  // Compute seasonal shift if there's a prior event for this client
  let seasonalShift: SeasonalShift | null = null
  if (event.client_id) {
    const { data: lastEvent } = await db
      .from('events')
      .select('event_date')
      .eq('client_id', event.client_id)
      .eq('tenant_id', tenantId)
      .neq('id', eventId)
      .is('deleted_at', null)
      .lt('event_date', event.event_date)
      .order('event_date', { ascending: false })
      .limit(1)
      .then((r: any) => ({ data: r.data?.[0] ?? null }))

    if (lastEvent) {
      const prevSeason = getSeason(lastEvent.event_date)
      const currSeason = getSeason(event.event_date)
      if (prevSeason !== currSeason) {
        seasonalShift = {
          previousSeason: prevSeason,
          currentSeason: currSeason,
          previousMonth: getMonthName(lastEvent.event_date),
          currentMonth: getMonthName(event.event_date),
          shiftDescription: `${prevSeason} to ${currSeason}`,
        }
      }
    }
  }

  // Same month in prior years (all clients, same tenant)
  // Build date ranges for same month in up to 3 prior years
  const sameMonthPriorYears: SeasonalContext['sameMonthPriorYears'] = []
  try {
    const priorYearFilters: string[] = []
    for (let y = 1; y <= 3; y++) {
      const priorYear = eventYear - y
      const monthStart = `${priorYear}-${String(eventMonth + 1).padStart(2, '0')}-01`
      const nextMonth = eventMonth === 11 ? 0 : eventMonth + 1
      const nextYear = eventMonth === 11 ? priorYear + 1 : priorYear
      const monthEnd = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`
      priorYearFilters.push(monthStart)
      priorYearFilters.push(monthEnd)
    }

    // Query events in the same month across prior years
    for (let y = 1; y <= 3; y++) {
      const startIdx = (y - 1) * 2
      const { data: priorEvents } = await db
        .from('events')
        .select('id, event_date, occasion, client:clients(full_name), menus(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('event_date', priorYearFilters[startIdx])
        .lt('event_date', priorYearFilters[startIdx + 1])
        .order('event_date', { ascending: true })
        .limit(5)

      if (priorEvents) {
        for (const pe of priorEvents as any[]) {
          sameMonthPriorYears.push({
            id: pe.id,
            eventDate: pe.event_date,
            occasion: pe.occasion,
            clientName: (pe.client as any)?.full_name ?? 'Unknown',
            menuName: (pe.menus as any[])?.[0]?.name ?? null,
          })
        }
      }
    }
  } catch {
    // Non-blocking enrichment
  }

  // Nearby date events (within 14 days, same year, excluding self)
  const nearbyDateEvents: SeasonalContext['nearbyDateEvents'] = []
  try {
    const windowStart = new Date(eventDate)
    windowStart.setDate(windowStart.getDate() - 14)
    const windowEnd = new Date(eventDate)
    windowEnd.setDate(windowEnd.getDate() + 14)

    const { data: nearbyEvents } = await db
      .from('events')
      .select('id, event_date, occasion, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .neq('id', eventId)
      .gte('event_date', windowStart.toISOString().split('T')[0])
      .lte('event_date', windowEnd.toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(10)

    if (nearbyEvents) {
      for (const ne of nearbyEvents as any[]) {
        const neDate = new Date(ne.event_date)
        const daysDelta = Math.round(
          (neDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        nearbyDateEvents.push({
          id: ne.id,
          eventDate: ne.event_date,
          occasion: ne.occasion,
          clientName: (ne.client as any)?.full_name ?? 'Unknown',
          daysDelta,
        })
      }
    }
  } catch {
    // Non-blocking enrichment
  }

  return {
    event: {
      id: event.id,
      eventDate: event.event_date,
      occasion: event.occasion,
    },
    seasonalShift,
    sameMonthPriorYears,
    nearbyDateEvents,
  }
}
