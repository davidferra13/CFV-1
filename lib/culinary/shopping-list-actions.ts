'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { createPurchaseOrder, addPOItem } from '@/lib/inventory/purchase-order-actions'
import { normalizeUnit, canConvert, addQuantities } from '@/lib/grocery/unit-conversion'
import { lookupDensity } from '@/lib/units/conversion-engine'
import { ingredientMatchesAllergen } from '@/lib/menus/allergen-check'
import { PORTIONS_BY_SERVICE_STYLE } from '@/lib/finance/industry-benchmarks'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'

const ShoppingListInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventIds: z.array(z.string().uuid()).optional(),
})

export type EventBreakdownEntry = {
  eventId: string
  eventDate: string
  eventLabel: string
  quantityForEvent: number
}

export type IncompleteRecipeWarning = {
  recipeId: string
  recipeName: string
  ingredientName: string
  reason: 'missing_quantity' | 'missing_unit' | 'missing_ingredient_record'
}

export type ShoppingListItem = {
  ingredientId: string
  ingredientName: string
  category: string
  supplier: string
  unit: string
  recipeQty: number
  yieldPct: number
  totalRequired: number // yield-adjusted buy quantity
  onHand: number
  toBuy: number
  estimatedCostCents: number
  priceStore: string | null
  priceSource: string | null
  eventCount: number
  allergenFlags: string[] // EC-G8: allergen flags from ingredient for safety cross-reference
  dietaryWarnings: { clientName: string; allergen: string; severity: string; eventLabel?: string }[] // Q11: cross-ref with client allergies
  eventBreakdown: EventBreakdownEntry[]
}

export type ShoppingListResult = {
  startDate: string
  endDate: string
  items: ShoppingListItem[]
  totalEstimatedCostCents: number
  shortageCount: number
  incompleteRecipes: IncompleteRecipeWarning[]
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

async function getRecipeMultipliersForEvents(
  db: any,
  tenantId: string,
  eventIds: string[],
  eventGuestCounts: Map<string, number>,
  eventServiceStyles: Map<string, string> = new Map()
): Promise<Map<string, number>> {
  // Fetch menus with event_id so we can trace guest count
  const { data: menus } = await db
    .from('menus')
    .select('id, event_id')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (!menus?.length) return new Map()

  const menuEventMap = new Map<string, string>()
  for (const m of menus as any[]) {
    menuEventMap.set(m.id, m.event_id)
  }

  const { data: dishes } = await db
    .from('dishes')
    .select('id, menu_id')
    .eq('tenant_id', tenantId)
    .in(
      'menu_id',
      menus.map((menu: any) => menu.id)
    )

  if (!dishes?.length) return new Map()

  const dishMenuMap = new Map<string, string>()
  for (const d of dishes as any[]) {
    dishMenuMap.set(d.id, d.menu_id)
  }

  const { data: components } = await db
    .from('components')
    .select('recipe_id, scale_factor, dish_id')
    .eq('tenant_id', tenantId)
    .in(
      'dish_id',
      dishes.map((dish: any) => dish.id)
    )
    .not('recipe_id', 'is', null)

  if (!components?.length) return new Map()

  // Also fetch recipe servings for guest-count scaling
  const recipeIds = [...new Set((components as any[]).map((c: any) => c.recipe_id))]
  const { data: recipeRows } = await db.from('recipes').select('id, servings').in('id', recipeIds)

  const recipeServingsMap = new Map<string, number>()
  for (const r of (recipeRows ?? []) as any[]) {
    recipeServingsMap.set(r.id, Number(r.servings) || 4)
  }

  // Compute: (guestCount / recipeServings) * scale_factor * serviceStyleMultiplier per component
  const multipliers = new Map<string, number>()
  for (const component of components as any[]) {
    const recipeId = component.recipe_id as string
    const scaleFactor = Number(component.scale_factor) || 1
    const menuId = dishMenuMap.get(component.dish_id) ?? ''
    const eventId = menuEventMap.get(menuId) ?? ''
    const guestCount = eventGuestCounts.get(eventId) ?? 10
    const recipeServings = recipeServingsMap.get(recipeId) ?? 4
    const serviceStyle = eventServiceStyles.get(eventId) ?? 'plated'
    const styleMultiplier = PORTIONS_BY_SERVICE_STYLE[serviceStyle]?.multiplier ?? 1.0
    const effectiveMultiplier = (guestCount / recipeServings) * scaleFactor * styleMultiplier

    multipliers.set(recipeId, (multipliers.get(recipeId) ?? 0) + effectiveMultiplier)
  }

  // include sub-recipes recursively
  const visited = new Set<string>()
  const queue = [...multipliers.keys()]

  while (queue.length > 0) {
    const batch = queue.filter((id) => !visited.has(id))
    if (batch.length === 0) break
    batch.forEach((id) => visited.add(id))

    const { data: subRecipes } = await db
      .from('recipe_sub_recipes')
      .select('parent_recipe_id, child_recipe_id, quantity')
      .in('parent_recipe_id', batch)

    for (const row of subRecipes ?? []) {
      const parentMultiplier = multipliers.get(row.parent_recipe_id) ?? 1
      const childMultiplier = parentMultiplier * (Number(row.quantity) || 1)
      multipliers.set(
        row.child_recipe_id,
        (multipliers.get(row.child_recipe_id) ?? 0) + childMultiplier
      )
      queue.push(row.child_recipe_id)
    }
  }

  return multipliers
}

export async function generateShoppingList(input: {
  startDate: string
  endDate: string
  eventIds?: string[]
}): Promise<ShoppingListResult> {
  const user = await requireChef()
  const parsed = ShoppingListInputSchema.parse(input)
  const db: any = createServerClient()

  let eventsQuery = db
    .from('events')
    .select('id, event_date, guest_count, service_style, client_id')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', parsed.startDate)
    .lte('event_date', parsed.endDate)
    .in('status', ['confirmed', 'accepted', 'paid'])

  if (parsed.eventIds?.length) {
    eventsQuery = eventsQuery.in('id', parsed.eventIds)
  }

  const { data: events, error: eventsError } = await eventsQuery

  if (eventsError) throw new Error(`Failed to load events: ${eventsError.message}`)
  if (!events?.length) {
    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      items: [],
      totalEstimatedCostCents: 0,
      shortageCount: 0,
      incompleteRecipes: [],
    }
  }

  const eventIds = events.map((event: any) => event.id)
  const eventGuestCounts = new Map<string, number>(
    (events as any[]).map((e: any) => [e.id, Number(e.guest_count) || 10])
  )
  const eventServiceStyles = new Map<string, string>(
    (events as any[]).map((e: any) => [e.id, e.service_style ?? 'plated'])
  )
  const recipeMultipliers = await getRecipeMultipliersForEvents(
    db,
    user.tenantId!,
    eventIds,
    eventGuestCounts,
    eventServiceStyles
  )

  if (recipeMultipliers.size === 0) {
    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      items: [],
      totalEstimatedCostCents: 0,
      shortageCount: 0,
      incompleteRecipes: [],
    }
  }

  // Build event info map for breakdown attribution
  const eventInfoMap = new Map<string, { date: string; label: string }>(
    (events as any[]).map((e: any) => [
      e.id,
      {
        date: e.event_date ?? '',
        label: `${e.occasion || 'Event'} ${e.event_date ?? ''}`.trim(),
      },
    ])
  )

  const { data: recipeIngredients, error: recipeIngredientsError } = await db
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_id, quantity, unit, yield_pct')
    .in('recipe_id', Array.from(recipeMultipliers.keys()))

  if (recipeIngredientsError) {
    throw new Error(`Failed to load recipe ingredients: ${recipeIngredientsError.message}`)
  }

  const ingredientIds = Array.from(
    new Set((recipeIngredients ?? []).map((item: any) => item.ingredient_id).filter(Boolean))
  ) as string[]

  if (ingredientIds.length === 0) {
    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      items: [],
      totalEstimatedCostCents: 0,
      shortageCount: 0,
      incompleteRecipes: [],
    }
  }

  const [ingredientRows, stockRows, vendorItemsRows, vendorRows] = await Promise.all([
    db
      .from('ingredients')
      .select(
        'id, name, category, last_price_cents, last_price_store, last_price_source, preferred_vendor, default_yield_pct, allergen_flags'
      )
      .eq('tenant_id', user.tenantId!)
      .in('id', ingredientIds),
    db
      .from('inventory_transactions')
      .select('ingredient_id, quantity')
      .eq('chef_id', user.tenantId!)
      .in('ingredient_id', ingredientIds),
    db
      .from('vendor_items')
      .select('ingredient_id, vendor_id, unit_price_cents')
      .eq('chef_id', user.tenantId!)
      .in('ingredient_id', ingredientIds),
    db.from('vendors').select('id, name').eq('chef_id', user.tenantId!),
  ])

  if (ingredientRows.error)
    throw new Error(`Failed to load ingredients: ${ingredientRows.error.message}`)
  if (stockRows.error) throw new Error(`Failed to load inventory: ${stockRows.error.message}`)
  if (vendorItemsRows.error) {
    throw new Error(`Failed to load vendor mappings: ${vendorItemsRows.error.message}`)
  }
  if (vendorRows.error) throw new Error(`Failed to load suppliers: ${vendorRows.error.message}`)

  const ingredientMap = new Map<string, any>(
    (ingredientRows.data ?? []).map((row: any) => [row.id, row])
  )
  const vendorNameMap = new Map<string, string>(
    (vendorRows.data ?? []).map((row: any) => [row.id, row.name])
  )

  const preferredVendorByIngredient = new Map<string, string>()
  const vendorItemsByIngredient = new Map<string, Array<{ vendorId: string; price: number }>>()

  for (const row of vendorItemsRows.data ?? []) {
    const list = vendorItemsByIngredient.get(row.ingredient_id ?? '') ?? []
    list.push({ vendorId: row.vendor_id, price: row.unit_price_cents ?? 0 })
    vendorItemsByIngredient.set(row.ingredient_id ?? '', list)
  }

  for (const [ingredientId, rows] of vendorItemsByIngredient.entries()) {
    if (!rows.length) continue
    rows.sort((a, b) => a.price - b.price)
    preferredVendorByIngredient.set(
      ingredientId,
      vendorNameMap.get(rows[0].vendorId) ?? 'Unassigned'
    )
  }

  const onHandByIngredient = new Map<string, number>()
  for (const row of stockRows.data ?? []) {
    if (!row.ingredient_id) continue
    onHandByIngredient.set(
      row.ingredient_id,
      (onHandByIngredient.get(row.ingredient_id) ?? 0) + (Number(row.quantity) || 0)
    )
  }

  // Q11: Fetch client allergy records for all events in this shopping window
  const clientIds = [
    ...new Set((events as any[]).map((e: any) => e.client_id).filter(Boolean)),
  ] as string[]
  // Map client_id -> event label (date + occasion) for per-event attribution
  const clientEventLabelMap = new Map<string, string>()
  for (const ev of events as any[]) {
    if (ev.client_id) {
      const label = `${ev.event_date ?? 'TBD'}${ev.occasion ? ` (${ev.occasion})` : ''}`
      const existing = clientEventLabelMap.get(ev.client_id)
      if (existing) {
        clientEventLabelMap.set(ev.client_id, `${existing}, ${label}`)
      } else {
        clientEventLabelMap.set(ev.client_id, label)
      }
    }
  }
  const clientAllergyMap = new Map<
    string,
    Array<{ clientName: string; allergen: string; severity: string; eventLabel?: string }>
  >()
  if (clientIds.length > 0) {
    const [clientNamesResult, allergyRecordsResult] = await Promise.all([
      db.from('clients').select('id, full_name').in('id', clientIds),
      db
        .from('client_allergy_records')
        .select('client_id, allergen, severity')
        .in('client_id', clientIds),
    ])
    const nameMap = new Map<string, string>(
      ((clientNamesResult.data ?? []) as any[]).map((c: any) => [c.id, c.full_name ?? 'Client'])
    )
    for (const r of (allergyRecordsResult.data ?? []) as any[]) {
      const list = clientAllergyMap.get(r.client_id) ?? []
      list.push({
        clientName: nameMap.get(r.client_id) ?? 'Client',
        allergen: r.allergen,
        severity: r.severity,
        eventLabel: clientEventLabelMap.get(r.client_id),
      })
      clientAllergyMap.set(r.client_id, list)
    }
  }
  // Flatten all allergen records for cross-referencing against ingredients
  const allAllergyRecords = [...clientAllergyMap.values()].flat()

  // Aggregate by ingredient ID, consolidating compatible units
  const aggregated = new Map<
    string,
    ShoppingListItem & {
      _recipeAccum: { qty: number; unit: string }[]
      _buyAccum: { qty: number; unit: string }[]
    }
  >()
  for (const row of recipeIngredients ?? []) {
    const ingredient = ingredientMap.get(row.ingredient_id)
    if (!ingredient) continue

    const multiplier = recipeMultipliers.get(row.recipe_id) ?? 1
    const recipeQty = (Number(row.quantity) || 0) * multiplier
    const yieldPct = Math.max(
      Number(row.yield_pct) || Number(ingredient.default_yield_pct) || 100,
      1
    )
    const buyQty = (recipeQty * 100) / yieldPct
    const normUnit = normalizeUnit(row.unit)

    const existing = aggregated.get(row.ingredient_id)
    if (existing) {
      existing._recipeAccum.push({ qty: recipeQty, unit: normUnit })
      existing._buyAccum.push({ qty: buyQty, unit: normUnit })
      existing.yieldPct = Math.min(existing.yieldPct, yieldPct)
    } else {
      aggregated.set(row.ingredient_id, {
        ingredientId: row.ingredient_id,
        ingredientName: ingredient.name,
        category: ingredient.category,
        supplier:
          ingredient.preferred_vendor ||
          preferredVendorByIngredient.get(row.ingredient_id) ||
          'Unassigned',
        unit: normUnit,
        recipeQty: 0,
        yieldPct,
        totalRequired: 0,
        onHand: 0,
        toBuy: 0,
        estimatedCostCents: 0,
        priceStore: ingredient.last_price_store || null,
        priceSource: ingredient.last_price_source || null,
        eventCount: events.length,
        allergenFlags: (ingredient.allergen_flags as string[]) ?? [],
        dietaryWarnings: [] as {
          clientName: string
          allergen: string
          severity: string
          eventLabel?: string
        }[],
        eventBreakdown: [] as EventBreakdownEntry[],
        _recipeAccum: [{ qty: recipeQty, unit: normUnit }],
        _buyAccum: [{ qty: buyQty, unit: normUnit }],
      })
    }
  }

  // Consolidate accumulated quantities with unit conversion
  for (const [, item] of aggregated) {
    const density = lookupDensity(item.ingredientName)
    // Consolidate recipe quantities
    let rResult = {
      quantity: item._recipeAccum[0]?.qty ?? 0,
      unit: item._recipeAccum[0]?.unit ?? item.unit,
    }
    for (let i = 1; i < item._recipeAccum.length; i++) {
      const next = item._recipeAccum[i]
      if (canConvert(rResult.unit, next.unit, density)) {
        rResult = addQuantities(rResult.quantity, rResult.unit, next.qty, next.unit, density)
      } else {
        rResult.quantity += next.qty
      }
    }
    item.recipeQty = rResult.quantity

    // Consolidate buy quantities
    let bResult = {
      quantity: item._buyAccum[0]?.qty ?? 0,
      unit: item._buyAccum[0]?.unit ?? item.unit,
    }
    for (let i = 1; i < item._buyAccum.length; i++) {
      const next = item._buyAccum[i]
      if (canConvert(bResult.unit, next.unit, density)) {
        bResult = addQuantities(bResult.quantity, bResult.unit, next.qty, next.unit, density)
      } else {
        bResult.quantity += next.qty
      }
    }
    item.totalRequired = bResult.quantity
    item.unit = bResult.unit
  }

  // Q11: Cross-reference each ingredient against client allergy records
  for (const [, item] of aggregated) {
    for (const record of allAllergyRecords) {
      if (ingredientMatchesAllergen(item.ingredientName, record.allergen)) {
        // Avoid duplicates (same client + allergen)
        const isDupe = item.dietaryWarnings.some(
          (w) => w.clientName === record.clientName && w.allergen === record.allergen
        )
        if (!isDupe) {
          item.dietaryWarnings.push(record)
        }
      }
    }
  }

  // Batch-resolve live PIE prices for all ingredients in the list
  const allIngredientIds = Array.from(aggregated.keys())
  const resolvedPrices = await resolvePricesBatch(allIngredientIds, user.tenantId!)

  // Compute waste buffer rate: use max waste% across all events' service styles
  const serviceStyles = [...eventServiceStyles.values()]
  const wasteBufferPct = serviceStyles.reduce((max, style) => {
    const rate = PORTIONS_BY_SERVICE_STYLE[style]?.wasteExpected ?? 3
    return Math.max(max, rate)
  }, 3)

  const items = Array.from(aggregated.values()).map(({ _recipeAccum, _buyAccum, ...item }) => {
    const onHand = onHandByIngredient.get(item.ingredientId) ?? 0
    // Apply waste buffer to totalRequired before subtracting on-hand
    const buffered = item.totalRequired * (1 + wasteBufferPct / 100)
    const toBuy = Math.max(0, buffered - onHand)
    const ingredient = ingredientMap.get(item.ingredientId)
    const resolved = resolvedPrices.get(item.ingredientId)
    const estimatedUnitCost = resolved?.cents ?? ingredient?.last_price_cents ?? 0

    return {
      ...item,
      totalRequired: round2(buffered),
      onHand: round2(onHand),
      toBuy: round2(toBuy),
      estimatedCostCents: Math.round(toBuy * estimatedUnitCost),
      priceStore: resolved?.store ?? item.priceStore,
      priceSource: resolved?.source ?? item.priceSource,
    }
  })

  items.sort((a, b) => b.toBuy - a.toBuy)

  // Flag incomplete recipes (missing quantity, unit, or ingredient record)
  const incompleteRecipes: IncompleteRecipeWarning[] = []
  const recipeNameCache = new Map<string, string>()
  for (const ri of recipeIngredients ?? []) {
    if (!ri.ingredient_id) {
      if (!recipeNameCache.has(ri.recipe_id)) recipeNameCache.set(ri.recipe_id, ri.recipe_id)
      incompleteRecipes.push({
        recipeId: ri.recipe_id,
        recipeName: recipeNameCache.get(ri.recipe_id) ?? ri.recipe_id,
        ingredientName: 'Unknown ingredient',
        reason: 'missing_ingredient_record',
      })
      continue
    }
    const ing = ingredientMap.get(ri.ingredient_id)
    const ingName = ing?.name ?? 'Unknown'
    if (!ri.quantity || Number(ri.quantity) === 0) {
      if (!recipeNameCache.has(ri.recipe_id)) recipeNameCache.set(ri.recipe_id, ri.recipe_id)
      incompleteRecipes.push({
        recipeId: ri.recipe_id,
        recipeName: recipeNameCache.get(ri.recipe_id) ?? ri.recipe_id,
        ingredientName: ingName,
        reason: 'missing_quantity',
      })
    } else if (!ri.unit) {
      if (!recipeNameCache.has(ri.recipe_id)) recipeNameCache.set(ri.recipe_id, ri.recipe_id)
      incompleteRecipes.push({
        recipeId: ri.recipe_id,
        recipeName: recipeNameCache.get(ri.recipe_id) ?? ri.recipe_id,
        ingredientName: ingName,
        reason: 'missing_unit',
      })
    }
  }
  // Resolve recipe names for warnings
  if (incompleteRecipes.length > 0) {
    const warnRecipeIds = [...new Set(incompleteRecipes.map((w) => w.recipeId))]
    const missingNames = warnRecipeIds.filter(
      (id) => !recipeNameCache.has(id) || recipeNameCache.get(id) === id
    )
    if (missingNames.length > 0) {
      const { data: nameRows } = await db.from('recipes').select('id, name').in('id', missingNames)
      for (const r of (nameRows ?? []) as any[]) {
        recipeNameCache.set(r.id, r.name)
      }
      for (const w of incompleteRecipes) {
        w.recipeName = recipeNameCache.get(w.recipeId) ?? w.recipeId
      }
    }
  }

  return {
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    totalEstimatedCostCents: items.reduce((sum, item) => sum + item.estimatedCostCents, 0),
    shortageCount: items.filter((item) => item.toBuy > 0).length,
    items,
    incompleteRecipes,
  }
}

export async function createPurchaseOrderFromShoppingList(input: {
  supplier?: string
  eventId?: string
  items: Array<{
    ingredientId: string
    ingredientName: string
    toBuy: number
    unit: string
    estimatedCostCents: number
  }>
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  const filteredItems = input.items.filter((item) => item.toBuy > 0)
  if (!filteredItems.length)
    throw new Error('No shortage items selected for purchase order creation')

  let vendorId: string | undefined
  if (input.supplier && input.supplier !== 'Unassigned') {
    const { data: vendor } = await db
      .from('vendors')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .eq('name', input.supplier)
      .maybeSingle()
    vendorId = vendor?.id
  }

  const po = await createPurchaseOrder({
    vendorId,
    eventId: input.eventId,
    notes: `Auto-generated from shopping list shortages (${new Date().toISOString()})`,
  })

  for (const item of filteredItems) {
    const estimatedUnitPriceCents =
      item.toBuy > 0 ? Math.round(item.estimatedCostCents / item.toBuy) : undefined

    await addPOItem(po.id, {
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      orderedQty: item.toBuy,
      unit: item.unit,
      estimatedUnitPriceCents,
    })
  }

  return po
}

// ── Upcoming Events for Shopping Event Picker ──────────────────────────────

export type ShoppingEventOption = {
  id: string
  occasion: string | null
  eventDate: string
  guestCount: number
  clientName: string | null
  status: string
}

export async function getUpcomingEventsForShopping(input: {
  startDate: string
  endDate: string
}): Promise<ShoppingEventOption[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select('id, occasion, event_date, guest_count, status, client:clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', input.startDate)
    .lte('event_date', input.endDate)
    .in('status', ['confirmed', 'accepted', 'paid'])
    .order('event_date', { ascending: true })

  if (error) throw new Error(`Failed to load events: ${error.message}`)

  return (events ?? []).map((e: any) => ({
    id: e.id,
    occasion: e.occasion,
    eventDate: e.event_date,
    guestCount: Number(e.guest_count) || 0,
    clientName: Array.isArray(e.client)
      ? (e.client[0]?.full_name ?? null)
      : (e.client?.full_name ?? null),
    status: e.status,
  }))
}

// ── Single-Event Shortcut ────────────────────────────────────────────────

export async function generateEventShoppingList(eventId: string): Promise<ShoppingListResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event, error } = await db
    .from('events')
    .select('event_date')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !event) throw new Error('Event not found')

  return generateShoppingList({
    startDate: event.event_date,
    endDate: event.event_date,
    eventIds: [eventId],
  })
}

// ── Week-View Shortcut ───────────────────────────────────────────────────

export async function generateWeekShoppingList(): Promise<ShoppingListResult> {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  function toIso(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return generateShoppingList({
    startDate: toIso(monday),
    endDate: toIso(sunday),
  })
}

// ── Category Grouping ────────────────────────────────────────────────────

const CATEGORY_SORT_ORDER: string[] = [
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'bakery',
  'deli',
  'frozen',
  'pantry_dry',
  'canned',
  'condiments_sauces',
  'spices',
  'baking',
  'beverages',
  'bulk',
  'international',
  'household',
  'other',
]

export function groupByCategory(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  const map = new Map<string, ShoppingListItem[]>()
  for (const item of items) {
    const cat = item.category || 'other'
    const list = map.get(cat) ?? []
    list.push(item)
    map.set(cat, list)
  }
  // Sort categories by grocery-store walk order
  const sorted = new Map<string, ShoppingListItem[]>()
  for (const cat of CATEGORY_SORT_ORDER) {
    const items = map.get(cat)
    if (items) {
      items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
      sorted.set(cat, items)
    }
  }
  // Any categories not in the predefined order
  for (const [cat, items] of map) {
    if (!sorted.has(cat)) {
      items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
      sorted.set(cat, items)
    }
  }
  return sorted
}

// ── Vendor Sublist Splitter ──────────────────────────────────────────────

export function splitByVendor(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  const map = new Map<string, ShoppingListItem[]>()
  for (const item of items) {
    const vendor = item.supplier || 'Unassigned'
    const list = map.get(vendor) ?? []
    list.push(item)
    map.set(vendor, list)
  }
  // Sort: alphabetical vendors, Unassigned last
  const sorted = new Map<string, ShoppingListItem[]>()
  const keys = [...map.keys()].sort((a, b) => {
    if (a === 'Unassigned') return 1
    if (b === 'Unassigned') return -1
    return a.localeCompare(b)
  })
  for (const key of keys) {
    sorted.set(key, map.get(key)!)
  }
  return sorted
}

// ── Vendor Assignment (persist to vendor_preferred_ingredients) ──────────

export async function assignVendorToIngredient(
  ingredientId: string,
  vendorId: string
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Upsert preferred vendor on the ingredient record
  const { data: vendor } = await db
    .from('vendors')
    .select('name')
    .eq('id', vendorId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!vendor) throw new Error('Vendor not found')

  await db
    .from('ingredients')
    .update({ preferred_vendor: vendor.name })
    .eq('id', ingredientId)
    .eq('tenant_id', user.tenantId!)

  // Also upsert into vendor_preferred_ingredients
  const { data: existing } = await db
    .from('vendor_preferred_ingredients')
    .select('id')
    .eq('ingredient_id', ingredientId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (!existing) {
    await db.from('vendor_preferred_ingredients').insert({
      ingredient_id: ingredientId,
      vendor_id: vendorId,
      is_preferred: true,
    })
  } else {
    await db
      .from('vendor_preferred_ingredients')
      .update({ is_preferred: true })
      .eq('id', existing.id)
  }

  // Un-prefer other vendors for this ingredient
  await db
    .from('vendor_preferred_ingredients')
    .update({ is_preferred: false })
    .eq('ingredient_id', ingredientId)
    .neq('vendor_id', vendorId)
}

// ── Get Chef's Vendors ───────────────────────────────────────────────────

export async function getChefVendors(): Promise<{ id: string; name: string }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('vendors')
    .select('id, name')
    .eq('chef_id', user.tenantId!)
    .order('name')

  if (error) throw new Error(`Failed to load vendors: ${error.message}`)
  return (data ?? []) as { id: string; name: string }[]
}
