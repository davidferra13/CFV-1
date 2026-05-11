'use server'

/**
 * Event-Driven Call Resolution Actions
 *
 * Surfaces upcoming events with per-ingredient resolution status so the chef
 * can see at a glance which events need vendor attention. Traverses the full
 * chain: events -> menus -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
 *
 * Each ingredient gets a lightweight tier classification (resolved / partial / unresolved)
 * using cached data rather than full resolution, keeping the dashboard fast.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { resolveIngredientAvailability } from '@/lib/calling/ingredient-resolution'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IngredientStatus = {
  name: string
  tier: 1 | 2 | 3
  resolved: boolean
  vendor_name?: string
  price?: number
  unit?: string
}

export type UpcomingEventSummary = {
  id: string
  title: string
  event_date: string
  client_name: string | null
  guest_count: number
  ingredients: IngredientStatus[]
}

export type VendorIngredientGroup = {
  vendorName: string
  vendorPhone: string
  vendorId: string
  contactName: string | null
  ingredients: string[]
  source: 'saved' | 'national'
}

// ---------------------------------------------------------------------------
// Get upcoming events with ingredient resolution status
// ---------------------------------------------------------------------------

export async function getUpcomingEventsWithResolution(
  daysAhead = 7
): Promise<UpcomingEventSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead)
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`

  // Step 1: Get upcoming confirmed/in_progress events with client info
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, client:clients(id, full_name)')
    .eq('tenant_id', chefId)
    .gte('event_date', today)
    .lte('event_date', endDate)
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress'])
    .order('event_date', { ascending: true })

  if (eventsError) {
    console.error('[event-resolution] failed to fetch events:', eventsError)
    return []
  }

  if (!events?.length) return []

  const eventIds = events.map((e: any) => e.id)

  // Step 2: Get menus for these events
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', chefId)
    .in('event_id', eventIds)

  if (!menus?.length) {
    return events.map((e: any) => ({
      id: e.id,
      title: e.occasion || 'Untitled Event',
      event_date: e.event_date,
      client_name: e.client?.full_name || null,
      guest_count: e.guest_count || 0,
      ingredients: [],
    }))
  }

  // Step 3: Get dishes -> components -> recipe IDs
  const menuIds = menus.map((m: any) => m.id)
  const { data: dishes } = await db.from('dishes').select('id, menu_id').in('menu_id', menuIds)

  const dishIds = dishes?.length ? dishes.map((d: any) => d.id) : []
  const { data: components } = dishIds.length
    ? await db
        .from('components')
        .select('recipe_id, dish_id')
        .in('dish_id', dishIds)
        .not('recipe_id', 'is', null)
    : { data: [] }

  // Build mappings: dish -> menu -> event
  const dishToMenu = new Map<string, string>()
  for (const d of dishes || []) dishToMenu.set(d.id, d.menu_id)
  const menuToEvent = new Map<string, string>()
  for (const m of menus) menuToEvent.set(m.id, m.event_id)

  const recipeIds = [...new Set((components || []).map((c: any) => c.recipe_id))]

  // Step 4: Get recipe ingredients
  const { data: recipeIngredients } = recipeIds.length
    ? await db
        .from('recipe_ingredients')
        .select('recipe_id, ingredient_id, quantity, unit')
        .in('recipe_id', recipeIds)
    : { data: [] }

  // Step 5: Get ingredient details
  const ingredientIds = [...new Set((recipeIngredients || []).map((ri: any) => ri.ingredient_id))]
  const { data: ingredients } = ingredientIds.length
    ? await db
        .from('ingredients')
        .select('id, name, category, default_unit')
        .in('id', ingredientIds)
    : { data: [] }

  const ingredientMap = new Map<string, any>()
  for (const ing of ingredients || []) ingredientMap.set(ing.id, ing)

  // Step 6: Map ingredients back to events
  const eventIngredientMap = new Map<string, Set<string>>()

  for (const comp of components || []) {
    const menuId = dishToMenu.get(comp.dish_id)
    const eventId = menuId ? menuToEvent.get(menuId) : null
    if (!eventId) continue

    const compRecipeIngs = (recipeIngredients || []).filter(
      (ri: any) => ri.recipe_id === comp.recipe_id
    )
    for (const ri of compRecipeIngs) {
      if (!eventIngredientMap.has(eventId)) eventIngredientMap.set(eventId, new Set())
      eventIngredientMap.get(eventId)!.add(ri.ingredient_id)
    }
  }

  // Step 7: Lightweight tier classification using recent vendor/price data
  // Check vendor_price_points and ai_calls for each ingredient to determine tier
  const allIngNames = [...ingredientMap.values()].map((i: any) => i.name)
  const tierCache = await classifyIngredientTiers(db, chefId, allIngNames)

  // Step 8: Build results
  const results: UpcomingEventSummary[] = events.map((e: any) => {
    const eventIngIds = eventIngredientMap.get(e.id) || new Set()
    const ingredientStatuses: IngredientStatus[] = []

    for (const ingId of eventIngIds) {
      const ing = ingredientMap.get(ingId)
      if (!ing) continue

      const tierInfo = tierCache.get(ing.name.toLowerCase()) || {
        tier: 3 as const,
        resolved: false,
      }
      ingredientStatuses.push({
        name: ing.name,
        tier: tierInfo.tier,
        resolved: tierInfo.resolved,
        vendor_name: tierInfo.vendor_name,
        price: tierInfo.price,
        unit: ing.default_unit,
      })
    }

    // Sort: unresolved first, then partial, then resolved
    ingredientStatuses.sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
      return b.tier - a.tier
    })

    return {
      id: e.id,
      title: e.occasion || 'Untitled Event',
      event_date: e.event_date,
      client_name: e.client?.full_name || null,
      guest_count: e.guest_count || 0,
      ingredients: ingredientStatuses,
    }
  })

  return results
}

// ---------------------------------------------------------------------------
// Lightweight tier classification (batch)
// Uses vendor_price_points + ai_calls to classify without full resolution.
// ---------------------------------------------------------------------------

async function classifyIngredientTiers(
  db: any,
  chefId: string,
  ingredientNames: string[]
): Promise<
  Map<
    string,
    {
      tier: 1 | 2 | 3
      resolved: boolean
      vendor_name?: string
      price?: number
    }
  >
> {
  const result = new Map<
    string,
    { tier: 1 | 2 | 3; resolved: boolean; vendor_name?: string; price?: number }
  >()

  if (!ingredientNames.length) return result

  // Default all to tier 3
  for (const name of ingredientNames) {
    result.set(name.toLowerCase(), { tier: 3, resolved: false })
  }

  // Check vendor_price_points for recent data (within 90 days)
  try {
    const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0]
    const { data: vppData } = await db
      .from('vendor_price_points')
      .select('item_name, price_cents, unit, recorded_at, vendors!inner(name)')
      .eq('chef_id', chefId)
      .gte('recorded_at', cutoff)
      .order('recorded_at', { ascending: false })
      .limit(500)

    for (const row of vppData || []) {
      const key = (row.item_name || '').toLowerCase()
      const existing = result.get(key)
      if (!existing) {
        // Check fuzzy match
        for (const [k, v] of result) {
          if (key.includes(k) || k.includes(key)) {
            if (v.tier === 3) {
              const ageDays = (Date.now() - new Date(row.recorded_at).getTime()) / 86_400_000
              result.set(k, {
                tier: ageDays <= 7 ? 1 : 2,
                resolved: ageDays <= 7,
                vendor_name: row.vendors?.name,
                price: row.price_cents ? row.price_cents / 100 : undefined,
              })
            }
            break
          }
        }
        continue
      }
      if (existing.tier <= 2 && existing.resolved) continue // already resolved

      const ageDays = (Date.now() - new Date(row.recorded_at).getTime()) / 86_400_000
      result.set(key, {
        tier: ageDays <= 7 ? 1 : 2,
        resolved: ageDays <= 7,
        vendor_name: row.vendors?.name,
        price: row.price_cents ? row.price_cents / 100 : undefined,
      })
    }
  } catch (err) {
    console.error('[event-resolution] classifyIngredientTiers vpp query failed:', err)
  }

  // Check recent ai_calls with result='yes'
  try {
    const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString()
    const { data: aiData } = await db
      .from('ai_calls')
      .select('subject, contact_name, extracted_data, created_at')
      .eq('chef_id', chefId)
      .eq('result', 'yes')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(200)

    for (const row of aiData || []) {
      const subject = (row.subject || '').toLowerCase()
      for (const [key, existing] of result) {
        if (existing.tier <= 1) continue
        if (subject.includes(key) || key.includes(subject)) {
          const priceStr = row.extracted_data?.price_quoted
          const price = priceStr ? parseFloat(priceStr.replace(/[^0-9.]/g, '')) : undefined
          result.set(key, {
            tier: 2,
            resolved: false,
            vendor_name: row.contact_name || undefined,
            price: price && !isNaN(price) ? price : undefined,
          })
          break
        }
      }
    }
  } catch (err) {
    console.error('[event-resolution] classifyIngredientTiers ai_calls query failed:', err)
  }

  return result
}

// ---------------------------------------------------------------------------
// Resolve all Tier 3 ingredients for an event
// ---------------------------------------------------------------------------

export async function resolveEventIngredients(
  eventId: string
): Promise<{ resolved: number; queued: number; failed: number }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', chefId)
    .single()

  if (!event) {
    return { resolved: 0, queued: 0, failed: 0 }
  }

  // Get all ingredients for this event
  const eventSummaries = await getUpcomingEventsWithResolution(30)
  const thisEvent = eventSummaries.find((e) => e.id === eventId)

  if (!thisEvent) {
    return { resolved: 0, queued: 0, failed: 0 }
  }

  // Filter to Tier 3 (unresolved) ingredients only
  const tier3Ingredients = thisEvent.ingredients.filter((i) => i.tier === 3)

  if (!tier3Ingredients.length) {
    return { resolved: 0, queued: 0, failed: 0 }
  }

  let resolved = 0
  let queued = 0
  let failed = 0

  // Resolve each ingredient sequentially to avoid overloading
  for (const ing of tier3Ingredients) {
    try {
      const resolution = await resolveIngredientAvailability(ing.name)
      if (resolution.resolvedCount > 0) {
        resolved++
      } else if (resolution.unresolvedCount > 0) {
        queued++
      } else {
        failed++
      }
    } catch (err) {
      console.error(`[event-resolution] failed to resolve "${ing.name}":`, err)
      failed++
    }
  }

  return { resolved, queued, failed }
}

// ---------------------------------------------------------------------------
// Get ingredients grouped by vendor for an event
// ---------------------------------------------------------------------------

export async function getEventIngredientsByVendor(
  eventId: string
): Promise<VendorIngredientGroup[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  // Verify event ownership
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', chefId)
    .single()

  if (!event) return []

  // Get event ingredients
  const eventSummaries = await getUpcomingEventsWithResolution(30)
  const thisEvent = eventSummaries.find((e) => e.id === eventId)

  if (!thisEvent || !thisEvent.ingredients.length) return []

  // Get chef's saved vendors
  const { data: vendors } = await db
    .from('vendors')
    .select('id, name, phone, contact_name, vendor_type')
    .eq('chef_id', chefId)
    .not('phone', 'is', null)
    .order('name', { ascending: true })

  if (!vendors?.length) return []

  // Get vendor_price_points to map ingredients to vendors
  const ingredientNames = thisEvent.ingredients.map((i) => i.name)
  const { data: vppData } = await db
    .from('vendor_price_points')
    .select('item_name, vendor_id')
    .eq('chef_id', chefId)
    .order('recorded_at', { ascending: false })
    .limit(1000)

  // Build vendor -> ingredient mapping
  const vendorIngMap = new Map<string, Set<string>>()
  for (const vpp of vppData || []) {
    const itemLower = (vpp.item_name || '').toLowerCase()
    for (const ingName of ingredientNames) {
      if (itemLower.includes(ingName.toLowerCase()) || ingName.toLowerCase().includes(itemLower)) {
        if (!vendorIngMap.has(vpp.vendor_id)) vendorIngMap.set(vpp.vendor_id, new Set())
        vendorIngMap.get(vpp.vendor_id)!.add(ingName)
        break
      }
    }
  }

  // Build result
  const vendorMap = new Map<string, any>()
  for (const v of vendors) vendorMap.set(v.id, v)

  const groups: VendorIngredientGroup[] = []
  for (const [vendorId, ingSet] of vendorIngMap) {
    const vendor = vendorMap.get(vendorId)
    if (!vendor || !vendor.phone) continue

    groups.push({
      vendorName: vendor.name,
      vendorPhone: vendor.phone,
      vendorId: vendor.id,
      contactName: vendor.contact_name || null,
      ingredients: [...ingSet],
      source: 'saved',
    })
  }

  // Sort by ingredient count (most items first)
  groups.sort((a, b) => b.ingredients.length - a.ingredients.length)

  return groups
}
