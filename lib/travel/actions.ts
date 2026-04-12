'use server'

// Travel Route Planning - Server Actions
// CRUD for event_travel_legs and travel_leg_ingredients.
// All mutations are tenant-scoped and chef-authenticated.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'
import type {
  TravelLeg,
  TravelLegType,
  TravelLegWithIngredients,
  TravelPlan,
  NearbyEvent,
  CreateTravelLegInput,
  UpdateTravelLegInput,
  UpsertTravelLegIngredientInput,
  TravelLegIngredient,
  TravelIngredientStatus,
} from './types'

function createClient() {
  return createServerClient()
}

// ============================================================
// READ
// ============================================================

/** Fetch all travel legs for an event (primary + consolidated that link this event) */
export async function getTravelPlan(eventId: string): Promise<TravelPlan> {
  const user = await requireChef()
  const db = createClient()

  // Fetch legs where this event is primary OR in linked_event_ids
  const { data: legs, error } = await db
    .from('event_travel_legs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .or(`primary_event_id.eq.${eventId},linked_event_ids.cs.{"${eventId}"}`)
    .order('leg_date', { ascending: true })
    .order('departure_time', { ascending: true })

  if (error) throw new Error(`Failed to fetch travel legs: ${error.message}`)

  // Fetch ingredients for all legs
  const legIds = (legs ?? []).map((l: any) => l.id)
  let ingredients: TravelLegIngredient[] = []

  if (legIds.length > 0) {
    const { data: rawIngredients } = await db
      .from('travel_leg_ingredients')
      .select(
        `
        *,
        ingredients (name)
      `
      )
      .in('leg_id', legIds)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ingredients = (rawIngredients ?? []).map((row: Record<string, any>) => ({
      id: row.id as string,
      leg_id: row.leg_id as string,
      ingredient_id: row.ingredient_id as string,
      ingredient_name: (row.ingredients as { name: string } | null)?.name ?? undefined,
      event_id: row.event_id as string | null,
      quantity: row.quantity as number | null,
      unit: row.unit as string | null,
      store_name: row.store_name as string | null,
      notes: row.notes as string | null,
      status: row.status as TravelIngredientStatus,
      sourced_at: row.sourced_at as string | null,
      created_at: row.created_at as string,
    }))
  }

  // Fetch nearby events (same chef, within ±7 days of the primary event)
  const { data: primaryEvent } = await db
    .from('events')
    .select('event_date')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  let nearbyEvents: NearbyEvent[] = []
  if (primaryEvent?.event_date) {
    const [_evy, _evm, _evd] = dateToDateString(primaryEvent.event_date as Date | string)
      .split('-')
      .map(Number)
    const eventDate = new Date(_evy, _evm - 1, _evd)
    const lower = new Date(_evy, _evm - 1, _evd - 7)
    const upper = new Date(_evy, _evm - 1, _evd + 7)
    const _liso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const { data: nearby } = await db
      .from('events')
      .select(
        `
        id, occasion, event_date,
        clients (full_name)
      `
      )
      .eq('tenant_id', user.tenantId!)
      .neq('id', eventId)
      .not('status', 'in', '("cancelled","completed")')
      .gte('event_date', _liso(lower))
      .lte('event_date', _liso(upper))
      .order('event_date', { ascending: true })

    nearbyEvents = (nearby ?? []).map((e: any) => {
      const eDays = Math.round(
        (new Date(e.event_date).getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: e.id,
        occasion: e.occasion,
        event_date: e.event_date,
        client_name: (e.clients as { full_name: string } | null)?.full_name ?? null,
        days_away: eDays,
      }
    })
  }

  // Merge ingredients into legs
  const ingredientsByLeg = new Map<string, TravelLegIngredient[]>()
  for (const ing of ingredients) {
    const arr = ingredientsByLeg.get(ing.leg_id) ?? []
    arr.push(ing)
    ingredientsByLeg.set(ing.leg_id, arr)
  }

  const legsWithIngredients: TravelLegWithIngredients[] = (legs ?? []).map(
    (leg: any) =>
      ({
        ...leg,
        leg_type: leg.leg_type as TravelLegType,
        stops: (leg.stops as unknown as TravelLeg['stops']) ?? [],
        linked_event_ids: leg.linked_event_ids ?? [],
        ingredients: ingredientsByLeg.get(leg.id) ?? [],
      }) as TravelLegWithIngredients
  )

  return {
    eventId,
    legs: legsWithIngredients,
    nearbyEvents,
  }
}

/** Fetch all travel legs for the chef across all events (global week view) */
export async function getAllTravelLegs(options?: {
  fromDate?: string
  toDate?: string
  status?: string
}): Promise<TravelLegWithIngredients[]> {
  const user = await requireChef()
  const db = createClient()

  let query = db.from('event_travel_legs').select('*').eq('tenant_id', user.tenantId!)

  if (options?.fromDate) {
    query = query.gte('leg_date', options.fromDate)
  }
  if (options?.toDate) {
    query = query.lte('leg_date', options.toDate)
  }
  if (options?.status) {
    query = query.eq('status', options.status)
  }

  query = query.order('leg_date', { ascending: true }).order('departure_time', { ascending: true })

  const { data: legs, error } = await query
  if (error) throw new Error(`Failed to fetch travel legs: ${error.message}`)

  return (legs ?? []).map(
    (leg: any) =>
      ({
        ...leg,
        leg_type: leg.leg_type as TravelLegType,
        stops: (leg.stops as unknown as TravelLeg['stops']) ?? [],
        linked_event_ids: leg.linked_event_ids ?? [],
        ingredients: [],
      }) as TravelLegWithIngredients
  )
}

// ============================================================
// CREATE
// ============================================================

export async function createTravelLeg(input: CreateTravelLegInput): Promise<TravelLeg> {
  const user = await requireChef()
  const db = createClient()

  // Compute totals if stops provided
  const stops = input.stops ?? []
  const totalStopMinutes = stops.reduce((s, st) => s + (st.estimated_minutes ?? 0), 0)
  const totalDriveMinutes = input.total_drive_minutes ?? null
  const totalEstimatedMinutes =
    totalDriveMinutes !== null ? totalDriveMinutes + totalStopMinutes : null

  const { data, error } = await db
    .from('event_travel_legs')
    .insert({
      chef_id: user.tenantId!,
      tenant_id: user.tenantId!,
      primary_event_id: input.primary_event_id ?? null,
      linked_event_ids: input.linked_event_ids ?? [],
      leg_type: input.leg_type,
      leg_date: input.leg_date,
      departure_time: input.departure_time ?? null,
      estimated_return_time: input.estimated_return_time ?? null,
      origin_type: input.origin_type ?? 'home',
      origin_address: input.origin_address ?? null,
      origin_label: input.origin_label ?? null,
      destination_type: input.destination_type ?? null,
      destination_address: input.destination_address ?? null,
      destination_label: input.destination_label ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stops: stops as any,
      total_drive_minutes: totalDriveMinutes,
      total_stop_minutes: totalStopMinutes || null,
      total_estimated_minutes: totalEstimatedMinutes,
      purpose_notes: input.purpose_notes ?? null,
      status: 'planned',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create travel leg: ${error.message}`)

  return {
    ...data!,
    leg_type: data!.leg_type as TravelLegType,
    stops: (data!.stops as unknown as TravelLeg['stops']) ?? [],
    linked_event_ids: data!.linked_event_ids ?? [],
  } as TravelLeg
}

// ============================================================
// UPDATE
// ============================================================

export async function updateTravelLeg(input: UpdateTravelLegInput): Promise<TravelLeg> {
  const user = await requireChef()
  const db = createClient()

  const { id, ...rest } = input

  // Recompute totals if stops are being updated
  const updates: Record<string, unknown> = { ...rest }
  if (rest.stops !== undefined) {
    const stops = rest.stops ?? []
    const totalStopMinutes = stops.reduce((s, st) => s + (st.estimated_minutes ?? 0), 0)
    updates.total_stop_minutes = totalStopMinutes || null
    if (rest.total_drive_minutes !== undefined) {
      updates.total_estimated_minutes =
        rest.total_drive_minutes !== null ? rest.total_drive_minutes + totalStopMinutes : null
    }
  }

  const { data, error } = await db
    .from('event_travel_legs')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update travel leg: ${error.message}`)

  return {
    ...data!,
    leg_type: data!.leg_type as TravelLegType,
    stops: (data!.stops as unknown as TravelLeg['stops']) ?? [],
    linked_event_ids: data!.linked_event_ids ?? [],
  } as TravelLeg
}

// ============================================================
// STATUS TRANSITIONS
// ============================================================

export async function markLegComplete(legId: string): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  const { error } = await db
    .from('event_travel_legs')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', legId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to mark leg complete: ${error.message}`)
}

export async function markLegInProgress(legId: string): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  const { error } = await db
    .from('event_travel_legs')
    .update({ status: 'in_progress' })
    .eq('id', legId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to start leg: ${error.message}`)
}

export async function cancelTravelLeg(legId: string): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  const { error } = await db
    .from('event_travel_legs')
    .update({ status: 'cancelled' })
    .eq('id', legId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to cancel leg: ${error.message}`)
}

// ============================================================
// DELETE
// ============================================================

export async function deleteTravelLeg(legId: string): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  const { error } = await db
    .from('event_travel_legs')
    .delete()
    .eq('id', legId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete travel leg: ${error.message}`)
}

// ============================================================
// INGREDIENT SOURCING
// ============================================================

export async function upsertLegIngredient(
  input: UpsertTravelLegIngredientInput
): Promise<TravelLegIngredient> {
  const user = await requireChef()
  const db = createClient()

  // Verify leg ownership
  const { data: leg } = await db
    .from('event_travel_legs')
    .select('id')
    .eq('id', input.leg_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!leg) throw new Error('Travel leg not found or unauthorized')

  const { data, error } = await db
    .from('travel_leg_ingredients')
    .upsert(
      {
        leg_id: input.leg_id,
        ingredient_id: input.ingredient_id,
        event_id: input.event_id ?? null,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        store_name: input.store_name ?? null,
        notes: input.notes ?? null,
        status: input.status ?? 'to_source',
      },
      { onConflict: 'leg_id,ingredient_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert leg ingredient: ${error.message}`)

  return {
    id: data!.id,
    leg_id: data!.leg_id,
    ingredient_id: data!.ingredient_id,
    event_id: data!.event_id,
    quantity: data!.quantity,
    unit: data!.unit,
    store_name: data!.store_name,
    notes: data!.notes,
    status: data!.status as TravelIngredientStatus,
    sourced_at: data!.sourced_at,
    created_at: data!.created_at,
  }
}

export async function markIngredientSourced(ingredientRowId: string): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  // Verify ownership through leg
  const { data: row } = await db
    .from('travel_leg_ingredients')
    .select('leg_id')
    .eq('id', ingredientRowId)
    .single()

  if (!row) throw new Error('Ingredient not found')

  const { data: leg } = await db
    .from('event_travel_legs')
    .select('id')
    .eq('id', row.leg_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!leg) throw new Error('Unauthorized')

  const { error } = await db
    .from('travel_leg_ingredients')
    .update({ status: 'sourced', sourced_at: new Date().toISOString() })
    .eq('id', ingredientRowId)

  if (error) throw new Error(`Failed to mark ingredient sourced: ${error.message}`)
}

export async function updateIngredientStatus(
  ingredientRowId: string,
  status: TravelIngredientStatus
): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  // Verify ownership through leg
  const { data: row }: any = await db
    .from('travel_leg_ingredients')
    .select('leg_id')
    .eq('id', ingredientRowId)
    .single()

  if (!row) throw new Error('Ingredient not found')

  const { data: leg }: any = await db
    .from('event_travel_legs')
    .select('id')
    .eq('id', row.leg_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!leg) throw new Error('Unauthorized')

  const { error } = await db
    .from('travel_leg_ingredients')
    .update({
      status,
      sourced_at: status === 'sourced' ? new Date().toISOString() : null,
    })
    .eq('id', ingredientRowId)

  if (error) throw new Error(`Failed to update ingredient status: ${error.message}`)
}

export async function deleteLegIngredient(ingredientRowId: string): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  // Verify ownership through leg
  const { data: row }: any = await db
    .from('travel_leg_ingredients')
    .select('leg_id')
    .eq('id', ingredientRowId)
    .single()

  if (!row) throw new Error('Ingredient not found')

  const { data: leg }: any = await db
    .from('event_travel_legs')
    .select('id')
    .eq('id', row.leg_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!leg) throw new Error('Unauthorized')

  const { error } = await db.from('travel_leg_ingredients').delete().eq('id', ingredientRowId)

  if (error) throw new Error(`Failed to delete leg ingredient: ${error.message}`)
}

// ============================================================
// INGREDIENT SEARCH (for the ingredient picker in the leg form)
// ============================================================

export async function searchIngredientsForEvent(
  eventId: string,
  query: string
): Promise<{ id: string; name: string; category: string }[]> {
  const user = await requireChef()
  const db = createClient()

  // Scope to ingredients used in this event's recipe graph
  // events → menus → dishes → components → recipes → recipe_ingredients → ingredients
  const { data } = await db
    .from('recipe_ingredients')
    .select(
      `
      ingredients!inner (id, name, category)
    `
    )
    .ilike('ingredients.name', `%${query}%`)
    .in(
      'recipe_id',
      (
        await db
          .from('components')
          .select('recipe_id')
          .in(
            'dish_id',
            (
              await db
                .from('dishes')
                .select('id')
                .in(
                  'menu_id',
                  (
                    await db
                      .from('menus')
                      .select('id')
                      .eq('event_id', eventId)
                      .eq('tenant_id', user.tenantId!)
                  ).data?.map((m: any) => m.id) ?? []
                )
                .eq('tenant_id', user.tenantId!)
            ).data?.map((d: any) => d.id) ?? []
          )
          .not('recipe_id', 'is', null)
          .eq('tenant_id', user.tenantId!)
      ).data
        ?.map((c: any) => c.recipe_id)
        .filter((id: any): id is string => id !== null) ?? []
    )
    .limit(20)

  const seen = new Set<string>()
  const results: { id: string; name: string; category: string }[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data as Record<string, any>[]) ?? []) {
    const ing = row.ingredients as { id: string; name: string; category: string } | null
    if (!ing || seen.has(ing.id)) continue
    seen.add(ing.id)
    results.push({ id: ing.id, name: ing.name, category: ing.category ?? '' })
  }

  return results
}

// ============================================================
// AUTO-CREATE SERVICE + RETURN LEGS (called on confirmed status)
// ============================================================

/** Create draft service_travel and return_home legs when event is confirmed.
 *  Safe to call repeatedly - skips if legs already exist. */
export async function autoCreateServiceLegs(eventId: string): Promise<void> {
  const user = await requireChef()
  const db = createClient()

  // Check if service legs already exist
  const { data: existing } = await db
    .from('event_travel_legs')
    .select('leg_type')
    .eq('primary_event_id', eventId)
    .in('leg_type', ['service_travel', 'return_home'])

  const hasServiceTravel = (existing ?? []).some((l: any) => l.leg_type === 'service_travel')
  const hasReturnHome = (existing ?? []).some((l: any) => l.leg_type === 'return_home')

  if (hasServiceTravel && hasReturnHome) return

  // Fetch event and chef prefs to pre-populate addresses
  const [{ data: event }, { data: prefs }]: any[] = await Promise.all([
    db
      .from('events')
      .select(
        'event_date, location_address, location_city, location_state, arrival_time, travel_time_minutes, clients (full_name)'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    db
      .from('chef_preferences')
      .select('home_address, home_city, home_state')
      .eq('chef_id', user.tenantId!)
      .single(),
  ])

  if (!event) return

  const homeAddr = prefs
    ? [prefs.home_address, prefs.home_city, prefs.home_state].filter(Boolean).join(', ')
    : null

  const venueAddr = [event.location_address, event.location_city, event.location_state]
    .filter(Boolean)
    .join(', ')

  const clientName = (event.clients as { full_name: string } | null)?.full_name

  if (!hasServiceTravel) {
    await db.from('event_travel_legs').insert({
      chef_id: user.tenantId!,
      tenant_id: user.tenantId!,
      primary_event_id: eventId,
      linked_event_ids: [],
      leg_type: 'service_travel',
      leg_date: event.event_date,
      departure_time: null, // chef fills in
      estimated_return_time: null,
      origin_type: 'home',
      origin_address: homeAddr,
      origin_label: 'Home',
      destination_type: 'venue',
      destination_address: venueAddr || null,
      destination_label: clientName ? `${clientName}'s venue` : 'Service venue',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stops: [] as any,
      total_drive_minutes: event.travel_time_minutes ?? null,
      total_stop_minutes: null,
      total_estimated_minutes: event.travel_time_minutes
        ? event.travel_time_minutes + 15 // always-on buffer
        : null,
      purpose_notes: null,
      status: 'planned',
    })
  }

  if (!hasReturnHome) {
    await db.from('event_travel_legs').insert({
      chef_id: user.tenantId!,
      tenant_id: user.tenantId!,
      primary_event_id: eventId,
      linked_event_ids: [],
      leg_type: 'return_home',
      leg_date: event.event_date,
      departure_time: null,
      estimated_return_time: null,
      origin_type: 'venue',
      origin_address: venueAddr || null,
      origin_label: clientName ? `${clientName}'s venue` : 'Service venue',
      destination_type: 'home',
      destination_address: homeAddr,
      destination_label: 'Home',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stops: [] as any,
      total_drive_minutes: event.travel_time_minutes ?? null,
      total_stop_minutes: null,
      total_estimated_minutes: event.travel_time_minutes ?? null,
      purpose_notes: null,
      status: 'planned',
    })
  }
}
