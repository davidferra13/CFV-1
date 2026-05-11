'use server'

/**
 * Post-Call Automation Engine
 *
 * After a batch of vendor calls completes for an event, this module:
 * 1. Updates shopping lists with confirmed availability and prices
 * 2. Flags at-risk events where key ingredients are unavailable
 * 3. Suggests alternatives for unavailable ingredients
 * 4. Generates price alerts when quoted prices deviate from market averages
 * 5. Produces a human-readable digest of the call batch results
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { pgClient } from '@/lib/db'
import { broadcast } from '@/lib/realtime/broadcast'

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface PostCallReport {
  shoppingListUpdated: boolean
  atRiskIngredients: string[]
  alternativeSuggestions: Array<{
    unavailable: string
    alternative: string
    reason: string
  }>
  priceAlerts: Array<{
    ingredient: string
    quotedPrice: number
    marketAverage: number
    delta: number
  }>
  summary: string
}

export interface IngredientCallResult {
  ingredient: string
  available: boolean
  vendorName: string
  price?: number
  unit?: string
}

export interface ConfirmedItem {
  ingredient: string
  vendor: string
  quantity: number
  unit: string
}

// -------------------------------------------------------------------------
// Category-based substitution tables
// -------------------------------------------------------------------------

const FISH_SUBSTITUTIONS: Record<string, string[]> = {
  cod: ['haddock', 'pollock', 'halibut'],
  haddock: ['cod', 'pollock', 'halibut'],
  pollock: ['cod', 'haddock'],
  halibut: ['cod', 'striped bass'],
  salmon: ['trout', 'arctic char', 'steelhead'],
  trout: ['salmon', 'arctic char'],
  'arctic char': ['salmon', 'trout'],
  steelhead: ['salmon', 'trout'],
  swordfish: ['mahi mahi', 'tuna steak'],
  tuna: ['swordfish', 'mahi mahi'],
  'mahi mahi': ['swordfish', 'tuna steak'],
  shrimp: ['langoustine', 'prawns'],
  prawns: ['shrimp', 'langoustine'],
  scallops: ['large shrimp', 'lobster tail'],
  lobster: ['crab', 'langoustine'],
  crab: ['lobster', 'shrimp'],
}

const PROTEIN_SUBSTITUTIONS: Record<string, string[]> = {
  'chicken breast': ['turkey breast', 'chicken thigh'],
  'chicken thigh': ['chicken breast', 'duck leg'],
  'pork tenderloin': ['pork loin', 'chicken breast'],
  'pork loin': ['pork tenderloin', 'pork chop'],
  'pork chop': ['pork loin', 'bone-in chicken thigh'],
  'beef tenderloin': ['strip steak', 'ribeye'],
  ribeye: ['strip steak', 'beef tenderloin'],
  'strip steak': ['ribeye', 'sirloin'],
  sirloin: ['strip steak', 'flank steak'],
  'flank steak': ['skirt steak', 'sirloin'],
  'skirt steak': ['flank steak', 'hanger steak'],
  'lamb rack': ['lamb loin chops', 'lamb shoulder'],
  'lamb chops': ['lamb rack', 'lamb shoulder'],
  duck: ['chicken thigh', 'quail'],
  'ground beef': ['ground turkey', 'ground pork'],
  'ground turkey': ['ground chicken', 'ground beef'],
  'ground pork': ['ground beef', 'ground turkey'],
}

const PRODUCE_SUBSTITUTIONS: Record<string, string[]> = {
  asparagus: ['broccolini', 'green beans'],
  broccolini: ['asparagus', 'broccoli rabe'],
  'green beans': ['haricots verts', 'sugar snap peas'],
  kale: ['swiss chard', 'collard greens'],
  'swiss chard': ['kale', 'spinach'],
  spinach: ['arugula', 'swiss chard'],
  arugula: ['spinach', 'watercress'],
  zucchini: ['yellow squash', 'pattypan squash'],
  'butternut squash': ['acorn squash', 'delicata squash'],
  'sweet potato': ['butternut squash', 'yam'],
  radicchio: ['endive', 'escarole'],
  endive: ['radicchio', 'frisee'],
  'cherry tomatoes': ['grape tomatoes', 'campari tomatoes'],
  fennel: ['celery', 'anise'],
  leeks: ['shallots', 'green onions'],
  shallots: ['red onion', 'leeks'],
}

const DAIRY_SUBSTITUTIONS: Record<string, string[]> = {
  'heavy cream': ['creme fraiche', 'coconut cream'],
  'creme fraiche': ['sour cream', 'heavy cream'],
  'sour cream': ['creme fraiche', 'greek yogurt'],
  gruyere: ['comte', 'emmental'],
  parmesan: ['pecorino romano', 'grana padano'],
  'pecorino romano': ['parmesan', 'aged asiago'],
  mascarpone: ['ricotta', 'cream cheese'],
  ricotta: ['mascarpone', 'cottage cheese'],
  burrata: ['fresh mozzarella', 'stracciatella'],
  'fresh mozzarella': ['burrata', 'bocconcini'],
  'goat cheese': ['feta', 'ricotta salata'],
  feta: ['goat cheese', 'queso fresco'],
}

// -------------------------------------------------------------------------
// Main: run post-call actions
// -------------------------------------------------------------------------

/**
 * Run after a batch of calls completes for an event.
 * Analyzes results, updates shopping data, flags risks, suggests alternatives.
 */
export async function runPostCallActions(params: {
  eventId?: string
  ingredientResults: IngredientCallResult[]
}): Promise<PostCallReport> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { eventId, ingredientResults } = params

  const atRiskIngredients: string[] = []
  const alternativeSuggestions: PostCallReport['alternativeSuggestions'] = []
  const priceAlerts: PostCallReport['priceAlerts'] = []
  let shoppingListUpdated = false

  // Separate available and unavailable
  const available = ingredientResults.filter((r) => r.available)
  const unavailable = ingredientResults.filter((r) => !r.available)

  // 1. Record vendor price points for available ingredients
  for (const item of available) {
    if (item.price && item.price > 0) {
      try {
        // Find vendor by name
        const { data: vendor } = await db
          .from('vendors')
          .select('id')
          .eq('chef_id', tenantId)
          .ilike('name', item.vendorName)
          .maybeSingle()

        if (vendor) {
          await db.from('vendor_price_points').insert({
            chef_id: tenantId,
            vendor_id: vendor.id,
            item_name: item.ingredient,
            price_cents: Math.round(item.price * 100),
            unit: item.unit || 'each',
            recorded_at: new Date().toISOString(),
          })
          shoppingListUpdated = true
        }
      } catch (err) {
        console.error(`[post-call] Failed to record price point for ${item.ingredient}:`, err)
      }
    }
  }

  // 2. Flag at-risk ingredients (unavailable from all called vendors)
  // Group unavailable by ingredient name
  const unavailableByIngredient = new Map<string, string[]>()
  for (const item of unavailable) {
    if (!unavailableByIngredient.has(item.ingredient)) {
      unavailableByIngredient.set(item.ingredient, [])
    }
    unavailableByIngredient.get(item.ingredient)!.push(item.vendorName)
  }

  // Check if the ingredient was confirmed available by any vendor
  const availableIngredients = new Set(available.map((a) => a.ingredient.toLowerCase()))

  for (const [ingredient, vendors] of unavailableByIngredient) {
    if (availableIngredients.has(ingredient.toLowerCase())) continue

    atRiskIngredients.push(ingredient)

    // Generate alternatives
    const alternatives = await suggestAlternatives(ingredient)
    for (const alt of alternatives.slice(0, 2)) {
      alternativeSuggestions.push({
        unavailable: ingredient,
        alternative: alt.name,
        reason: alt.reason,
      })
    }
  }

  // 3. Price alerts: compare quoted prices against market averages
  for (const item of available) {
    if (!item.price || item.price <= 0) continue

    try {
      const marketAvg = await getMarketAveragePrice(item.ingredient)
      if (marketAvg && marketAvg > 0) {
        const delta = ((item.price - marketAvg) / marketAvg) * 100
        // Alert if price deviates more than 25% from market average
        if (Math.abs(delta) > 25) {
          priceAlerts.push({
            ingredient: item.ingredient,
            quotedPrice: item.price,
            marketAverage: marketAvg,
            delta: Math.round(delta * 10) / 10,
          })
        }
      }
    } catch {
      // Non-blocking: market data might not be available
    }
  }

  // 4. Flag at-risk event if critical ingredients are missing
  if (eventId && atRiskIngredients.length > 0) {
    await flagAtRiskEvent(eventId, atRiskIngredients)
  }

  // 5. Build summary
  const summaryParts: string[] = []
  if (available.length > 0) {
    summaryParts.push(
      `${available.length} ingredient${available.length !== 1 ? 's' : ''} confirmed available`
    )
  }
  if (atRiskIngredients.length > 0) {
    summaryParts.push(`${atRiskIngredients.length} at risk: ${atRiskIngredients.join(', ')}`)
  }
  if (priceAlerts.length > 0) {
    summaryParts.push(`${priceAlerts.length} price alert${priceAlerts.length !== 1 ? 's' : ''}`)
  }
  if (alternativeSuggestions.length > 0) {
    summaryParts.push(
      `${alternativeSuggestions.length} alternative${alternativeSuggestions.length !== 1 ? 's' : ''} suggested`
    )
  }

  const summary =
    summaryParts.length > 0
      ? summaryParts.join('. ') + '.'
      : 'No actionable results from this call batch.'

  // Broadcast results
  try {
    await broadcast(`chef-${tenantId}`, 'post_call_report', {
      eventId,
      atRisk: atRiskIngredients.length,
      resolved: available.length,
      summary,
    })
  } catch {
    // Non-blocking
  }

  return {
    shoppingListUpdated,
    atRiskIngredients,
    alternativeSuggestions,
    priceAlerts,
    summary,
  }
}

// -------------------------------------------------------------------------
// Update shopping data from confirmed calls
// -------------------------------------------------------------------------

/**
 * Auto-update vendor price points based on confirmed availability from calls.
 * This creates a record in vendor_price_points so the resolution engine
 * can skip these ingredients on future scans.
 */
export async function updateShoppingFromCalls(
  eventId: string,
  confirmedItems: ConfirmedItem[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  for (const item of confirmedItems) {
    try {
      // Find vendor
      const { data: vendor } = await db
        .from('vendors')
        .select('id')
        .eq('chef_id', tenantId)
        .ilike('name', item.vendor)
        .maybeSingle()

      if (!vendor) continue

      // Upsert vendor price point (sentinel record for availability confirmation)
      await db.from('vendor_price_points').insert({
        chef_id: tenantId,
        vendor_id: vendor.id,
        item_name: item.ingredient,
        price_cents: 1, // sentinel
        unit: 'confirmed',
        recorded_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error(`[post-call] Failed to update shopping for ${item.ingredient}:`, err)
    }
  }
}

// -------------------------------------------------------------------------
// Flag at-risk events
// -------------------------------------------------------------------------

/**
 * Flag an event as at-risk due to missing key ingredients.
 * Creates a notification and records the risk in the event notes.
 */
export async function flagAtRiskEvent(
  eventId: string,
  missingIngredients: string[]
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  if (missingIngredients.length === 0) return

  try {
    // Create a notification for the chef
    await db.from('notifications').insert({
      user_id: user.userId,
      tenant_id: tenantId,
      type: 'ingredient_risk',
      title: 'Ingredient availability risk',
      body: `${missingIngredients.length} ingredient${missingIngredients.length !== 1 ? 's' : ''} may be unavailable: ${missingIngredients.slice(0, 5).join(', ')}${missingIngredients.length > 5 ? ` and ${missingIngredients.length - 5} more` : ''}`,
      entity_type: 'event',
      entity_id: eventId,
      read: false,
    })
  } catch (err) {
    console.error('[post-call] Failed to create risk notification:', err)
  }

  // Broadcast the risk flag
  try {
    await broadcast(`chef-${tenantId}`, 'event_risk_flagged', {
      eventId,
      missingIngredients,
    })
  } catch {
    // Non-blocking
  }
}

// -------------------------------------------------------------------------
// Suggest alternatives for unavailable ingredients
// -------------------------------------------------------------------------

/**
 * Suggest alternatives for an unavailable ingredient using category-based
 * substitution logic. Returns 2-3 suggestions max.
 */
export async function suggestAlternatives(
  ingredientName: string
): Promise<Array<{ name: string; reason: string; estimatedPrice?: number }>> {
  const normalized = ingredientName.trim().toLowerCase()

  const suggestions: Array<{ name: string; reason: string; estimatedPrice?: number }> = []

  // Check each substitution category
  const allSubstitutions: Array<{
    table: Record<string, string[]>
    category: string
  }> = [
    { table: FISH_SUBSTITUTIONS, category: 'seafood' },
    { table: PROTEIN_SUBSTITUTIONS, category: 'protein' },
    { table: PRODUCE_SUBSTITUTIONS, category: 'produce' },
    { table: DAIRY_SUBSTITUTIONS, category: 'dairy' },
  ]

  for (const { table, category } of allSubstitutions) {
    // Direct match
    if (table[normalized]) {
      const alts = table[normalized]
      for (const alt of alts.slice(0, 3)) {
        const price = await getMarketAveragePrice(alt)
        suggestions.push({
          name: alt,
          reason: `Similar ${category}, commonly used as a substitute for ${ingredientName}`,
          estimatedPrice: price ?? undefined,
        })
      }
      break
    }

    // Partial match (e.g., "fresh cod fillet" matches "cod")
    for (const [key, alts] of Object.entries(table)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        for (const alt of alts.slice(0, 3)) {
          const price = await getMarketAveragePrice(alt)
          suggestions.push({
            name: alt,
            reason: `Similar ${category} to ${key}, may work as a substitute`,
            estimatedPrice: price ?? undefined,
          })
        }
        break
      }
    }

    if (suggestions.length > 0) break
  }

  return suggestions.slice(0, 3)
}

// -------------------------------------------------------------------------
// Market price lookup (from OpenClaw data)
// -------------------------------------------------------------------------

/**
 * Get the market average price for an ingredient from OpenClaw data.
 * Returns price in dollars, or null if no data.
 */
async function getMarketAveragePrice(ingredientName: string): Promise<number | null> {
  try {
    const normalized = ingredientName.trim().toLowerCase()
    const searchPattern = `%${normalized}%`

    const rows = await pgClient`
      SELECT AVG(sp.price_cents) as avg_price_cents
      FROM openclaw.products p
      JOIN openclaw.store_products sp ON sp.product_id = p.id
      WHERE lower(p.name) LIKE ${searchPattern}
        AND sp.last_seen_at > NOW() - INTERVAL '30 days'
        AND sp.price_cents > 0
        AND p.is_food = true
    `

    const avgCents = rows?.[0]?.avg_price_cents
    if (!avgCents || avgCents <= 0) return null

    return Math.round(avgCents) / 100
  } catch {
    return null
  }
}

// -------------------------------------------------------------------------
// Add confirmed ingredients to prep/shopping list via purchase order
// -------------------------------------------------------------------------

/**
 * Add best-price ingredients from call results to the event's purchase order.
 * Creates a PO per vendor grouping, or a single catch-all PO if vendors
 * are mixed.
 */
export async function addCallResultsToPrepList(params: {
  eventId: string
  bestPrices: Array<{
    ingredient: string
    vendor: string
    price: number
    unit: string
  }>
}): Promise<{ success: boolean; poCount: number }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { eventId, bestPrices } = params
  if (!bestPrices.length) {
    throw new Error('No ingredients to add to prep list')
  }

  // Group items by vendor
  const byVendor = new Map<string, typeof bestPrices>()
  for (const item of bestPrices) {
    const key = item.vendor || 'Unassigned'
    if (!byVendor.has(key)) byVendor.set(key, [])
    byVendor.get(key)!.push(item)
  }

  let poCount = 0

  for (const [vendorName, items] of byVendor) {
    // Resolve vendor ID
    let vendorId: string | undefined
    if (vendorName !== 'Unassigned') {
      const { data: vendor } = await db
        .from('vendors')
        .select('id')
        .eq('chef_id', tenantId)
        .ilike('name', vendorName)
        .maybeSingle()
      vendorId = vendor?.id
    }

    // Create purchase order
    const { data: po } = await db
      .from('purchase_orders')
      .insert({
        chef_id: tenantId,
        vendor_id: vendorId || null,
        event_id: eventId,
        status: 'draft',
        notes: `From vendor call results (${new Date().toLocaleDateString()})`,
      })
      .select('id')
      .single()

    if (!po) continue

    // Add line items
    for (const item of items) {
      await db.from('purchase_order_items').insert({
        purchase_order_id: po.id,
        ingredient_name: item.ingredient,
        ordered_qty: 1,
        unit: item.unit,
        estimated_unit_price_cents: Math.round(item.price * 100),
      })
    }

    poCount++
  }

  return { success: true, poCount }
}

// -------------------------------------------------------------------------
// Lock vendors for confirmed ingredients
// -------------------------------------------------------------------------

/**
 * Mark the best-price vendor as "locked" for each ingredient by recording
 * a confirmed vendor price point with unit='locked'. This signals to the
 * sourcing engine that no further calls are needed for these items.
 */
export async function lockVendorsFromCallResults(params: {
  bestPrices: Array<{
    ingredient: string
    vendor: string
    price: number
    unit: string
  }>
}): Promise<{ success: boolean; lockedCount: number }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { bestPrices } = params
  if (!bestPrices.length) {
    throw new Error('No vendor selections to lock')
  }

  let lockedCount = 0

  for (const item of bestPrices) {
    try {
      // Find vendor
      const { data: vendor } = await db
        .from('vendors')
        .select('id')
        .eq('chef_id', tenantId)
        .ilike('name', item.vendor)
        .maybeSingle()

      if (!vendor) continue

      // Upsert a "locked" price point so the sourcing engine skips this item
      await db.from('vendor_price_points').insert({
        chef_id: tenantId,
        vendor_id: vendor.id,
        item_name: item.ingredient,
        price_cents: Math.round(item.price * 100),
        unit: 'locked',
        recorded_at: new Date().toISOString(),
      })

      lockedCount++
    } catch (err) {
      console.error(`[post-call] Failed to lock vendor for ${item.ingredient}:`, err)
    }
  }

  return { success: true, lockedCount }
}

// -------------------------------------------------------------------------
// Share call summary with client
// -------------------------------------------------------------------------

/**
 * Create a client-facing notification summarizing the sourcing results
 * for the event. The client sees this in their portal notifications.
 */
export async function shareCallSummaryWithClient(params: {
  eventId: string
  eventTitle: string
  summary: string
  ingredientsConfirmed: number
  ingredientsUnavailable: number
}): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { eventId, eventTitle, summary, ingredientsConfirmed, ingredientsUnavailable } = params

  // Find the client for this event
  const { data: event } = await db
    .from('events')
    .select('client_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event?.client_id) {
    throw new Error('No client associated with this event')
  }

  // Find the client's auth user ID for recipient_id
  const { data: client } = await db
    .from('clients')
    .select('id, auth_user_id, full_name')
    .eq('id', event.client_id)
    .maybeSingle()

  if (!client) {
    throw new Error('Client not found')
  }

  const recipientId = client.auth_user_id || client.id

  // Build a concise body
  const bodyParts: string[] = []
  if (ingredientsConfirmed > 0) {
    bodyParts.push(
      `${ingredientsConfirmed} ingredient${ingredientsConfirmed !== 1 ? 's' : ''} confirmed`
    )
  }
  if (ingredientsUnavailable > 0) {
    bodyParts.push(`${ingredientsUnavailable} still being sourced`)
  }
  if (summary) {
    bodyParts.push(summary)
  }

  await db.from('notifications').insert({
    tenant_id: tenantId,
    recipient_id: recipientId,
    recipient_role: 'client',
    category: 'sourcing',
    action: 'view_event',
    title: `Sourcing update for ${eventTitle}`,
    body: bodyParts.join('. ') + '.',
    event_id: eventId,
    client_id: client.id,
    action_url: `/my-events/${eventId}`,
  })

  // Broadcast so client portal updates in real time
  try {
    await broadcast(`chef-${tenantId}`, 'client_sourcing_shared', {
      eventId,
      clientId: client.id,
    })
  } catch {
    // Non-blocking
  }

  return { success: true }
}
