'use server'

// Travel Leg Ingredients Surfacing
// Cross-references travel legs with event menu ingredients to show
// what needs to be picked up at each stop along the travel route.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { TravelLegType, TravelLegStatus, TravelIngredientStatus } from '@/lib/travel/types'

// ── Types ──────────────────────────────────────────────────────────────────

export type TravelIngredientItem = {
  ingredientId: string
  ingredientName: string
  quantity: number | null
  unit: string | null
  storeName: string | null
  notes: string | null
  status: TravelIngredientStatus
  sourcedAt: string | null
}

export type TravelLegWithSourcedIngredients = {
  legId: string
  legType: TravelLegType
  legDate: string
  departureTime: string | null
  status: TravelLegStatus
  originLabel: string | null
  destinationLabel: string | null
  purposeNotes: string | null
  stops: {
    order: number
    name: string
    address: string
    purpose: string
    ingredients: TravelIngredientItem[]
  }[]
  unassignedIngredients: TravelIngredientItem[]
}

export type TravelIngredientsResult = {
  eventId: string
  legs: TravelLegWithSourcedIngredients[]
  totalIngredients: number
  sourcedCount: number
  toSourceCount: number
}

// ── Server Action ──────────────────────────────────────────────────────────

export async function getTravelLegIngredients(eventId: string): Promise<TravelIngredientsResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch travel legs for this event
  const { data: legs, error: legsError } = await db
    .from('event_travel_legs')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`primary_event_id.eq.${eventId},linked_event_ids.cs.{"${eventId}"}`)
    .order('leg_date', { ascending: true })
    .order('departure_time', { ascending: true })

  if (legsError) {
    throw new Error(`Failed to fetch travel legs: ${legsError.message}`)
  }

  if (!legs || legs.length === 0) {
    return {
      eventId,
      legs: [],
      totalIngredients: 0,
      sourcedCount: 0,
      toSourceCount: 0,
    }
  }

  const legIds = legs.map((l: any) => l.id)

  // Fetch ingredients for all legs, joining ingredient names
  const { data: rawIngredients, error: ingError } = await db
    .from('travel_leg_ingredients')
    .select(
      `
      *,
      ingredients (name)
    `
    )
    .in('leg_id', legIds)

  if (ingError) {
    throw new Error(`Failed to fetch travel ingredients: ${ingError.message}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allIngredients = (rawIngredients ?? []).map((row: Record<string, any>) => ({
    id: row.id as string,
    legId: row.leg_id as string,
    ingredientId: row.ingredient_id as string,
    ingredientName: (row.ingredients as { name: string } | null)?.name ?? 'Unknown ingredient',
    quantity: row.quantity as number | null,
    unit: row.unit as string | null,
    storeName: row.store_name as string | null,
    notes: row.notes as string | null,
    status: row.status as TravelIngredientStatus,
    sourcedAt: row.sourced_at as string | null,
  }))

  // Build result grouped by leg and stop
  let totalIngredients = 0
  let sourcedCount = 0
  let toSourceCount = 0

  const resultLegs: TravelLegWithSourcedIngredients[] = legs.map((leg: any) => {
    const legIngredients = allIngredients.filter((i: any) => i.legId === leg.id)
    const stops =
      (leg.stops as Array<{ order: number; name: string; address: string; purpose: string }>) ?? []

    // Group ingredients by store name matching stop names
    const stopResults = stops.map((stop) => {
      const stopIngredients = legIngredients.filter(
        (i: any) => i.storeName && i.storeName.toLowerCase() === stop.name.toLowerCase()
      )
      return {
        order: stop.order,
        name: stop.name,
        address: stop.address,
        purpose: stop.purpose,
        ingredients: stopIngredients.map((i: any) => ({
          ingredientId: i.ingredientId,
          ingredientName: i.ingredientName,
          quantity: i.quantity,
          unit: i.unit,
          storeName: i.storeName,
          notes: i.notes,
          status: i.status,
          sourcedAt: i.sourcedAt,
        })),
      }
    })

    // Ingredients not matched to any stop
    const assignedIds = new Set(
      stopResults.flatMap((s) => s.ingredients.map((i: any) => i.ingredientId))
    )
    const unassigned = legIngredients
      .filter((i: any) => !assignedIds.has(i.ingredientId))
      .map((i: any) => ({
        ingredientId: i.ingredientId,
        ingredientName: i.ingredientName,
        quantity: i.quantity,
        unit: i.unit,
        storeName: i.storeName,
        notes: i.notes,
        status: i.status,
        sourcedAt: i.sourcedAt,
      }))

    // Tally
    totalIngredients += legIngredients.length
    sourcedCount += legIngredients.filter((i: any) => i.status === 'sourced').length
    toSourceCount += legIngredients.filter((i: any) => i.status === 'to_source').length

    return {
      legId: leg.id,
      legType: leg.leg_type as TravelLegType,
      legDate: leg.leg_date,
      departureTime: leg.departure_time,
      status: leg.status as TravelLegStatus,
      originLabel: leg.origin_label,
      destinationLabel: leg.destination_label,
      purposeNotes: leg.purpose_notes,
      stops: stopResults,
      unassignedIngredients: unassigned,
    }
  })

  return {
    eventId,
    legs: resultLegs,
    totalIngredients,
    sourcedCount,
    toSourceCount,
  }
}
