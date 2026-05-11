'use server'

/**
 * Pre-Event Auto-Resolution Engine
 *
 * Scans upcoming events (default 48 hours ahead), identifies ingredients
 * that have not been resolved through passive data channels, and queues
 * outbound calls for the remainder.
 *
 * Two code paths:
 *   - Authed (scanUpcomingEvents, autoResolveEvent): uses resolveIngredientAvailability()
 *     which requires chef auth for tenant-scoped vendor queries.
 *   - Cron (autoResolveAll): uses lightweight DB-level checks (OpenClaw price data +
 *     vendor_price_points + ai_calls) without auth dependency.
 *
 * Flow:
 *   1. Query confirmed/in_progress events with event_date in next N hours
 *   2. Walk each event's menu chain: menu -> dishes -> components -> recipes -> recipe_ingredients
 *   3. Check each ingredient for existing data signals
 *   4. Tier 1/2 = resolved (no call needed), Tier 3 = queued for calling
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { resolveIngredientAvailability } from '@/lib/calling/ingredient-resolution'
import { pgClient } from '@/lib/db'
import { broadcast } from '@/lib/realtime/broadcast'

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface AutoResolveTarget {
  eventId: string
  eventDate: string
  eventTitle: string
  clientName: string | null
  guestCount: number
  unresolvedIngredients: string[]
  totalIngredients: number
  resolvedCount: number
}

export interface AutoResolveEventResult {
  resolved: string[]
  queued: string[]
  failed: string[]
}

export interface AutoResolveAllResult {
  eventsProcessed: number
  ingredientsResolved: number
  callsQueued: number
}

// Freshness thresholds (aligned with ingredient-resolution.ts)
const OPENCLAW_RECENT_DAYS = 7
const VENDOR_PRICE_POINT_DAYS = 90
const AI_CALL_FEEDBACK_DAYS = 14

// -------------------------------------------------------------------------
// Scan upcoming events for unresolved ingredients (authed)
// -------------------------------------------------------------------------

/**
 * Scan events in the next N hours and identify unresolved ingredients.
 * Requires chef auth (used from server actions in the UI).
 */
export async function scanUpcomingEvents(hoursAhead: number = 48): Promise<AutoResolveTarget[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  return scanUpcomingEventsAuthed(db, user.tenantId!, hoursAhead)
}

/**
 * Authed scanner: uses the full resolveIngredientAvailability() engine
 * which provides Tier 1/2/3 classification with vendor call queue.
 */
async function scanUpcomingEventsAuthed(
  db: any,
  tenantId: string,
  hoursAhead: number
): Promise<AutoResolveTarget[]> {
  const now = new Date()
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)

  const { data: events, error } = await db
    .from('events')
    .select('id, event_date, occasion, guest_count, menu_id, status, client:clients(id, full_name)')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'in_progress'])
    .gte('event_date', now.toISOString())
    .lte('event_date', cutoff.toISOString())
    .order('event_date', { ascending: true })

  if (error || !events || events.length === 0) {
    if (error) console.error('[auto-resolve] Failed to query upcoming events:', error)
    return []
  }

  const targets: AutoResolveTarget[] = []

  for (const event of events) {
    try {
      const ingredients = await getEventIngredientNames(db, event)
      if (ingredients.length === 0) continue

      const unresolved: string[] = []
      let resolvedCount = 0

      // Process in batches of 5 to avoid overwhelming the resolution engine
      for (let i = 0; i < ingredients.length; i += 5) {
        const batch = ingredients.slice(i, i + 5)
        const results = await Promise.all(
          batch.map(async (name) => {
            try {
              return await resolveIngredientAvailability(name)
            } catch (err) {
              console.error(`[auto-resolve] Resolution failed for "${name}":`, err)
              return null
            }
          })
        )

        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          if (!result) {
            unresolved.push(batch[j])
            continue
          }
          if (
            result.unresolvedCount > 0 &&
            result.resolvedCount === 0 &&
            result.partialCount === 0
          ) {
            unresolved.push(batch[j])
          } else {
            resolvedCount++
          }
        }
      }

      const client = Array.isArray(event.client) ? event.client[0] : event.client

      targets.push({
        eventId: event.id,
        eventDate: event.event_date,
        eventTitle: event.occasion || 'Untitled Event',
        clientName: client?.full_name || null,
        guestCount: event.guest_count ?? 0,
        unresolvedIngredients: unresolved,
        totalIngredients: ingredients.length,
        resolvedCount,
      })
    } catch (err) {
      console.error(`[auto-resolve] Error scanning event ${event.id}:`, err)
    }
  }

  return targets
}

// -------------------------------------------------------------------------
// Auto-resolve a single event (authed)
// -------------------------------------------------------------------------

/**
 * Run auto-resolution for a specific event.
 * Exhausts passive data first, then queues calls for unresolved ingredients.
 * Requires chef auth.
 */
export async function autoResolveEvent(eventId: string): Promise<AutoResolveEventResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  return autoResolveEventAuthed(db, eventId, user.tenantId!)
}

async function autoResolveEventAuthed(
  db: any,
  eventId: string,
  tenantId: string
): Promise<AutoResolveEventResult> {
  const resolved: string[] = []
  const queued: string[] = []
  const failed: string[] = []

  const { data: event, error } = await db
    .from('events')
    .select('id, event_date, occasion, guest_count, menu_id, status, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !event) {
    console.error('[auto-resolve] Event not found:', eventId, error)
    return { resolved, queued, failed }
  }

  const ingredients = await getEventIngredientNames(db, event)
  if (ingredients.length === 0) {
    return { resolved, queued, failed }
  }

  for (let i = 0; i < ingredients.length; i += 5) {
    const batch = ingredients.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(async (name) => {
        try {
          return { name, result: await resolveIngredientAvailability(name) }
        } catch (err) {
          console.error(`[auto-resolve] Resolution failed for "${name}":`, err)
          return { name, result: null }
        }
      })
    )

    for (const { name, result } of results) {
      if (!result) {
        failed.push(name)
        continue
      }

      if (result.resolvedCount > 0 || result.partialCount > 0) {
        resolved.push(name)
        continue
      }

      if (result.unresolvedCount > 0) {
        try {
          await db.from('auto_resolve_queue').insert({
            tenant_id: tenantId,
            event_id: eventId,
            ingredient_name: name,
            status: 'pending',
            vendor_count: result.unresolvedCount,
          })
          queued.push(name)
        } catch (insertErr: any) {
          // Table may not exist yet; track as queued regardless
          console.warn('[auto-resolve] Queue insert failed (non-blocking):', insertErr?.message)
          queued.push(name)
        }
        continue
      }

      failed.push(name)
    }
  }

  try {
    await broadcast(`chef-${tenantId}`, 'auto_resolve_complete', {
      eventId,
      resolved: resolved.length,
      queued: queued.length,
      failed: failed.length,
    })
  } catch {
    // Non-blocking
  }

  return { resolved, queued, failed }
}

// -------------------------------------------------------------------------
// Auto-resolve all upcoming events (cron, no auth)
// -------------------------------------------------------------------------

/**
 * Run auto-resolution for all upcoming events across all tenants.
 * Called from the cron endpoint. No auth session required.
 *
 * Uses lightweight DB-level checks instead of resolveIngredientAvailability()
 * (which requires chef auth). Checks three data sources:
 *   1. OpenClaw store_products (price within 7 days = Tier 1)
 *   2. vendor_price_points (within 90 days = Tier 2)
 *   3. ai_calls with result='yes' (within 14 days = Tier 2)
 * If none of those have a signal, the ingredient is unresolved (Tier 3).
 */
export async function autoResolveAll(hoursAhead: number = 48): Promise<AutoResolveAllResult> {
  const db: any = createAdminClient()

  const now = new Date()
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)

  const { data: events, error } = await db
    .from('events')
    .select('id, event_date, occasion, guest_count, menu_id, status, tenant_id')
    .in('status', ['confirmed', 'in_progress'])
    .gte('event_date', now.toISOString())
    .lte('event_date', cutoff.toISOString())
    .order('event_date', { ascending: true })
    .limit(100)

  if (error || !events || events.length === 0) {
    if (error) console.error('[auto-resolve] Failed to query events for cron:', error)
    return { eventsProcessed: 0, ingredientsResolved: 0, callsQueued: 0 }
  }

  let eventsProcessed = 0
  let ingredientsResolved = 0
  let callsQueued = 0

  for (const event of events) {
    try {
      const result = await autoResolveEventCron(db, event)
      eventsProcessed++
      ingredientsResolved += result.resolved.length
      callsQueued += result.queued.length
    } catch (err) {
      console.error(`[auto-resolve] Cron: failed to process event ${event.id}:`, err)
    }
  }

  return { eventsProcessed, ingredientsResolved, callsQueued }
}

/**
 * Cron-safe event resolution. Uses direct DB queries for ingredient
 * availability signals instead of the auth-gated resolution engine.
 */
async function autoResolveEventCron(db: any, event: any): Promise<AutoResolveEventResult> {
  const resolved: string[] = []
  const queued: string[] = []
  const failed: string[] = []

  const ingredients = await getEventIngredientNames(db, event)
  if (ingredients.length === 0) {
    return { resolved, queued, failed }
  }

  // Get the chef's state for OpenClaw geographic scoping
  let chefState = 'MA'
  try {
    const { data: chef } = await db
      .from('chefs')
      .select('home_state')
      .eq('id', event.tenant_id)
      .single()
    chefState = (chef?.home_state || 'MA').toUpperCase()
  } catch {
    // Default to MA
  }

  for (const ingredientName of ingredients) {
    try {
      const hasSignal = await checkIngredientSignal(db, ingredientName, event.tenant_id, chefState)

      if (hasSignal) {
        resolved.push(ingredientName)
      } else {
        // Queue for calling
        try {
          await db.from('auto_resolve_queue').insert({
            tenant_id: event.tenant_id,
            event_id: event.id,
            ingredient_name: ingredientName,
            status: 'pending',
            vendor_count: 0,
          })
          queued.push(ingredientName)
        } catch (insertErr: any) {
          console.warn('[auto-resolve] Queue insert failed (non-blocking):', insertErr?.message)
          queued.push(ingredientName)
        }
      }
    } catch (err) {
      console.error(`[auto-resolve] Cron: check failed for "${ingredientName}":`, err)
      failed.push(ingredientName)
    }
  }

  // Broadcast per-tenant
  try {
    await broadcast(`chef-${event.tenant_id}`, 'auto_resolve_complete', {
      eventId: event.id,
      resolved: resolved.length,
      queued: queued.length,
      failed: failed.length,
    })
  } catch {
    // Non-blocking
  }

  return { resolved, queued, failed }
}

/**
 * Lightweight ingredient signal check for the cron path.
 * Returns true if any data source has a recent signal for this ingredient.
 * Does not require auth.
 */
async function checkIngredientSignal(
  db: any,
  ingredientName: string,
  tenantId: string,
  chefState: string
): Promise<boolean> {
  const normalized = ingredientName.trim().toLowerCase()
  const searchPattern = `%${normalized}%`

  // Check all three sources in parallel
  const [openclawSignal, vendorSignal, callSignal] = await Promise.all([
    // Source 1: OpenClaw store_products with price within OPENCLAW_RECENT_DAYS
    checkOpenClawSignal(normalized, searchPattern, chefState),
    // Source 2: vendor_price_points within VENDOR_PRICE_POINT_DAYS
    checkVendorPriceSignal(db, searchPattern, tenantId),
    // Source 3: ai_calls result='yes' within AI_CALL_FEEDBACK_DAYS
    checkAiCallSignal(db, searchPattern, tenantId),
  ])

  return openclawSignal || vendorSignal || callSignal
}

async function checkOpenClawSignal(
  normalized: string,
  searchPattern: string,
  state: string
): Promise<boolean> {
  try {
    const cutoffDate = new Date(Date.now() - OPENCLAW_RECENT_DAYS * 86_400_000).toISOString()
    const rows = await pgClient`
      SELECT 1
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id
      JOIN openclaw.stores s ON s.id = sp.store_id
      WHERE s.state = ${state}
        AND s.is_active = true
        AND p.is_food = true
        AND lower(p.name) LIKE ${searchPattern}
        AND sp.last_seen_at > ${cutoffDate}::timestamptz
        AND sp.price_cents > 0
        AND sp.in_stock IS DISTINCT FROM false
      LIMIT 1
    `
    return rows.length > 0
  } catch {
    return false
  }
}

async function checkVendorPriceSignal(
  db: any,
  searchPattern: string,
  tenantId: string
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - VENDOR_PRICE_POINT_DAYS * 86_400_000)
      .toISOString()
      .split('T')[0]

    const { data } = await db
      .from('vendor_price_points')
      .select('id')
      .eq('chef_id', tenantId)
      .ilike('item_name', searchPattern)
      .gte('recorded_at', cutoff)
      .limit(1)
      .maybeSingle()

    return !!data
  } catch {
    return false
  }
}

async function checkAiCallSignal(
  db: any,
  searchPattern: string,
  tenantId: string
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - AI_CALL_FEEDBACK_DAYS * 86_400_000).toISOString()

    const { data } = await db
      .from('ai_calls')
      .select('id')
      .eq('chef_id', tenantId)
      .eq('result', 'yes')
      .ilike('subject', searchPattern)
      .gte('created_at', cutoff)
      .limit(1)
      .maybeSingle()

    return !!data
  } catch {
    return false
  }
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Walk the menu chain for an event and return deduplicated ingredient names.
 * Chain: event -> menu -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
 */
async function getEventIngredientNames(db: any, event: any): Promise<string[]> {
  if (!event.menu_id) return []

  try {
    const { data: components } = await db
      .from('components')
      .select(
        `
        id,
        recipe_id,
        dishes!inner(menu_id),
        recipes(
          id,
          recipe_ingredients(
            ingredient_id,
            ingredients(id, name)
          )
        )
      `
      )
      .eq('dishes.menu_id', event.menu_id)

    if (!components || components.length === 0) return []

    const ingredientNames = new Set<string>()

    for (const comp of components) {
      const recipe = Array.isArray(comp.recipes) ? comp.recipes[0] : comp.recipes
      if (!recipe) continue

      const recipeIngredients = Array.isArray(recipe.recipe_ingredients)
        ? recipe.recipe_ingredients
        : []

      for (const ri of recipeIngredients) {
        const ingredient = Array.isArray(ri.ingredients) ? ri.ingredients[0] : ri.ingredients
        if (ingredient?.name) {
          ingredientNames.add(ingredient.name)
        }
      }
    }

    return Array.from(ingredientNames)
  } catch (err) {
    console.error(`[auto-resolve] Failed to get ingredients for event ${event.id}:`, err)
    return []
  }
}
