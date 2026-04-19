// Grocery List Generator (Printed Sheet - Shopping)
// Aggregates every ingredient needed across all courses for an event.
// Organized by store section (Proteins, Produce, Dairy, Pantry) and by stop
// (grocery store vs liquor store). One page, checkboxes.
// MUST fit on ONE page - no exceptions

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { convertQuantity } from '@/lib/units/conversion-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

type GroceryItem = {
  ingredientName: string
  quantity: number
  unit: string
  courseNumbers: number[]
  courseLabel: string // e.g. "Course 2" or "Courses 2 + 3"
  lastPriceCents: number | null
  isOptional: boolean
  onHandQty: number | null // current inventory, null if not tracked
  needToBuyQty: number // max(0, quantity - onHandQty)
  // Pre-shopping substitution suggestions from historical data
  substitutions: { ingredient: string; count: number }[] | null
}

type StoreSection = {
  sectionName: string
  items: GroceryItem[]
}

type UnrecipedComponent = {
  componentName: string
  courseNumber: number
  courseName: string
}

type PresourcedItem = {
  ingredientName: string
  quantity: number | null
  unit: string | null
  sourcedAt: string | null
  storeName: string | null
  notes: string | null
}

export type GroceryListData = {
  event: {
    occasion: string | null
    event_date: string
    serve_time: string
    guest_count: number
    location_city: string
  }
  clientName: string
  groceryStoreName: string
  liquorStoreName: string
  stop1Sections: StoreSection[] // grocery store, organized by category
  stop2Items: GroceryItem[] // liquor store items (alcohol category)
  presourcedItems: PresourcedItem[] // already sourced via specialty runs
  unrecipedComponents: UnrecipedComponent[]
  budget: {
    ceilingCents: number | null
    projectedCents: number | null
    overBudget: boolean
  }
  totalBuyItems: number
  hasStop2: boolean
  // Allergy alert - safety-critical
  allergies: string[]
}

// ─── Category → Section Mapping ───────────────────────────────────────────────

const SECTION_ORDER = ['PROTEINS', 'PRODUCE', 'DAIRY / FATS', 'PANTRY', 'SPECIALTY']

const CATEGORY_TO_SECTION: Record<string, string> = {
  protein: 'PROTEINS',
  produce: 'PRODUCE',
  fresh_herb: 'PRODUCE',
  dry_herb: 'PRODUCE',
  dairy: 'DAIRY / FATS',
  pantry: 'PANTRY',
  baking: 'PANTRY',
  canned: 'PANTRY',
  condiment: 'PANTRY',
  spice: 'PANTRY',
  oil: 'PANTRY',
  frozen: 'SPECIALTY',
  specialty: 'SPECIALTY',
  beverage: 'SPECIALTY',
  other: 'SPECIALTY',
}

// alcohol and beverage categories go to Stop 2
const STOP_2_CATEGORIES = new Set(['alcohol'])

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchGroceryListData(eventId: string): Promise<GroceryListData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Event + client
  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, serve_time, guest_count,
      location_city, quoted_price_cents, allergies,
      client:clients(full_name, allergies)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  // Chef preferences for store names + margin target
  const { data: prefs } = await db
    .from('chef_preferences')
    .select('default_grocery_store, default_liquor_store, target_margin_percent')
    .eq('tenant_id', user.tenantId!)
    .single()

  const groceryStoreName = prefs?.default_grocery_store || 'GROCERY STORE'
  const liquorStoreName = prefs?.default_liquor_store || 'LIQUOR STORE'

  // Pre-sourced ingredients (from specialty sourcing travel legs)
  // These are removed from the regular shopping list and shown separately.
  let presourcedIngredientIds = new Set<string>()
  let presourcedItems: PresourcedItem[] = []

  try {
    const dbForLegs = createServerClient()
    const { data: sourcedRows } = await (dbForLegs as any)
      .from('travel_leg_ingredients')
      .select(
        `
        ingredient_id, quantity, unit, store_name, notes, sourced_at,
        ingredients (name),
        event_travel_legs!inner (leg_type, status)
      `
      )
      .eq('event_id', eventId)
      .eq('status', 'sourced')
      .eq('event_travel_legs.leg_type', 'specialty_sourcing')

    for (const row of (sourcedRows ?? []) as any[]) {
      const ingId = row.ingredient_id as string
      presourcedIngredientIds.add(ingId)
      presourcedItems.push({
        ingredientName: (row.ingredients as { name: string } | null)?.name ?? ingId,
        quantity: row.quantity ?? null,
        unit: row.unit ?? null,
        sourcedAt: row.sourced_at ?? null,
        storeName: row.store_name ?? null,
        notes: row.notes ?? null,
      })
    }
  } catch {
    // Table may not yet exist (migration pending) - degrade gracefully
  }

  // Menu
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null
  const menuId = menus[0].id

  // Dishes
  const { data: dishes } = await db
    .from('dishes')
    .select('id, course_number, course_name')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) return null

  // Components (with recipe_id and scale_factor)
  const dishIds = dishes.map((d: any) => d.id)
  const { data: components } = await db
    .from('components')
    .select('id, dish_id, name, recipe_id, scale_factor')
    .in('dish_id', dishIds)
    .eq('tenant_id', user.tenantId!)

  if (!components) return null

  // Build dish lookup for course info
  const dishById = new Map<string, any>(dishes.map((d: any) => [d.id, d]))

  // Separate components: with recipe vs without
  const withRecipe = components.filter((c: any) => c.recipe_id)
  const withoutRecipe = components.filter((c: any) => !c.recipe_id)

  // Warning placeholders for components without recipes
  const unrecipedComponents: UnrecipedComponent[] = withoutRecipe.map((c: any) => {
    const dish = dishById.get(c.dish_id)
    return {
      componentName: c.name,
      courseNumber: dish?.course_number ?? 0,
      courseName: dish?.course_name ?? 'Unknown',
    }
  })

  // Build recipe_id → list of {scale_factor, course_number, course_name}
  const recipeToComponents = new Map<
    string,
    Array<{
      scaleFactor: number
      courseNumber: number
      courseName: string
    }>
  >()
  for (const comp of withRecipe) {
    const dish = dishById.get(comp.dish_id)
    if (!dish) continue
    const entry = {
      scaleFactor: Number(comp.scale_factor),
      courseNumber: dish.course_number,
      courseName: dish.course_name,
    }
    const existing = recipeToComponents.get(comp.recipe_id!) || []
    existing.push(entry)
    recipeToComponents.set(comp.recipe_id!, existing)
  }

  const recipeIds = [...recipeToComponents.keys()]
  if (recipeIds.length === 0) {
    // No recipes linked - return with empty sections and all components as warnings
    const allAsWarnings: UnrecipedComponent[] = components.map((c: any) => {
      const dish = dishById.get(c.dish_id)
      return {
        componentName: c.name,
        courseNumber: dish?.course_number ?? 0,
        courseName: dish?.course_name ?? 'Unknown',
      }
    })
    return {
      event: {
        occasion: event.occasion,
        event_date: event.event_date,
        serve_time: event.serve_time,
        guest_count: event.guest_count,
        location_city: event.location_city,
      },
      clientName: (event.client as unknown as { full_name: string } | null)?.full_name ?? 'Unknown',
      groceryStoreName,
      liquorStoreName,
      stop1Sections: [],
      stop2Items: [],
      presourcedItems,
      unrecipedComponents: allAsWarnings,
      budget: { ceilingCents: null, projectedCents: null, overBudget: false },
      totalBuyItems: 0,
      hasStop2: false,
      allergies: event.allergies ?? [],
    }
  }

  // Fetch recipe_ingredients with ingredient details
  // Note: recipe_ingredients RLS is scoped via recipe_id FK to recipes (tenant-scoped)
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select(
      `
      recipe_id, ingredient_id, quantity, unit, is_optional,
      ingredient:ingredients(id, name, category, is_staple)
    `
    )
    .in('recipe_id', recipeIds)

  if (!recipeIngredients) {
    return null
  }

  // Resolve prices via unified 10-tier chain (batch: 3 queries, not N+1)
  // Look up chef's default store for price resolution context
  const allIngredientIds: string[] = [
    ...new Set(recipeIngredients.map((ri: any) => (ri.ingredient as any)?.id).filter(Boolean)),
  ] as string[]
  let resolvedPriceMap = new Map<string, number | null>()
  if (allIngredientIds.length > 0) {
    const { resolvePricesBatch } = await import('@/lib/pricing/resolve-price')
    let preferredStore: string | undefined
    try {
      const { data: defaultStore } = await db
        .from('chef_preferred_stores')
        .select('store_name')
        .eq('chef_id', user.entityId)
        .eq('is_default', true)
        .limit(1)
        .single()
      if (defaultStore?.store_name) preferredStore = defaultStore.store_name
    } catch {
      // No default store configured; resolve-price will use best available
    }
    const resolved = await resolvePricesBatch(allIngredientIds, user.tenantId!, { preferredStore })
    for (const [id, price] of resolved) {
      resolvedPriceMap.set(id, price.cents)
    }
  }

  // ── Aggregate ingredients ──────────────────────────────────────────────────
  // Key: ingredient_id + "::" + unit (same ingredient in same unit → sum quantities)
  type AggEntry = Omit<GroceryItem, 'onHandQty' | 'needToBuyQty' | 'substitutions'> & {
    ingredientId: string
    category: string
  }
  const aggregated = new Map<string, AggEntry>()

  let projectedCents = 0
  let priceCount = 0
  let totalIngredientCount = 0

  for (const ri of recipeIngredients) {
    const ingredient = ri.ingredient as unknown as {
      id: string
      name: string
      category: string
      is_staple: boolean
    } | null

    if (!ingredient) continue
    if (ingredient.is_staple) continue // Skip staples - assumed always on hand
    if (presourcedIngredientIds.has(ingredient.id)) continue // Already sourced via specialty run

    const compList = recipeToComponents.get(ri.recipe_id) || []
    for (const comp of compList) {
      const scaledQty = Number(ri.quantity) * comp.scaleFactor
      const key = `${ingredient.id}::${ri.unit}`

      const existing = aggregated.get(key)
      if (existing) {
        existing.quantity += scaledQty
        if (!existing.courseNumbers.includes(comp.courseNumber)) {
          existing.courseNumbers.push(comp.courseNumber)
          existing.courseNumbers.sort((a, b) => a - b)
        }
        existing.courseLabel = formatCourseLabel(existing.courseNumbers)
      } else {
        totalIngredientCount++
        aggregated.set(key, {
          ingredientId: ingredient.id,
          category: ingredient.category,
          ingredientName: ingredient.name,
          quantity: scaledQty,
          unit: ri.unit,
          courseNumbers: [comp.courseNumber],
          courseLabel: `Course ${comp.courseNumber}`,
          lastPriceCents: resolvedPriceMap.get(ingredient.id) ?? null,
          isOptional: ri.is_optional,
        })
      }
    }
  }

  // ── Query current inventory to subtract on-hand quantities ────────────────
  const ingredientIds = [...new Set(Array.from(aggregated.values()).map((e) => e.ingredientId))]
  const onHandMap = new Map<string, { qty: number; unit: string }>()

  if (ingredientIds.length > 0) {
    try {
      const { data: stockData } = await db
        .from('inventory_current_stock')
        .select('ingredient_id, current_qty, unit')
        .eq('chef_id', user.tenantId!)
        .in('ingredient_id', ingredientIds)

      for (const row of (stockData ?? []) as any[]) {
        if (row.ingredient_id && Number(row.current_qty) > 0) {
          onHandMap.set(row.ingredient_id, {
            qty: Number(row.current_qty),
            unit: row.unit ?? 'each',
          })
        }
      }
    } catch {
      // Inventory query failure is non-blocking; proceed without on-hand data
    }
  }

  // ── Query substitution history for pre-shopping suggestions ──────────────
  // "Last 3 times mint was unavailable, you used basil" - surfaced on the grocery list
  const substitutionMap = new Map<string, { ingredient: string; count: number }[]>()

  try {
    const ingredientNames = [
      ...new Set(Array.from(aggregated.values()).map((e) => e.ingredientName)),
    ]
    if (ingredientNames.length > 0) {
      const { data: subRows } = await db
        .from('shopping_substitutions')
        .select('planned_ingredient, actual_ingredient')
        .eq('tenant_id', user.tenantId!)

      if (subRows && subRows.length > 0) {
        // Build planned -> actual counts
        const pairCounts = new Map<string, Map<string, number>>()
        for (const row of subRows as any[]) {
          const planned = (row.planned_ingredient || '').toLowerCase().trim()
          const actual = row.actual_ingredient || ''
          if (!planned || !actual) continue
          if (!pairCounts.has(planned)) pairCounts.set(planned, new Map())
          const counts = pairCounts.get(planned)!
          counts.set(actual, (counts.get(actual) || 0) + 1)
        }

        // Match against grocery list ingredients
        for (const entry of aggregated.values()) {
          const key = entry.ingredientName.toLowerCase().trim()
          const counts = pairCounts.get(key)
          if (counts && counts.size > 0) {
            const subs = Array.from(counts.entries())
              .map(([ingredient, count]) => ({ ingredient, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 2) // Top 2 substitutes
            substitutionMap.set(entry.ingredientId, subs)
          }
        }
      }
    }
  } catch {
    // Substitution query is non-blocking
  }

  // ── Sort and bin into stops/sections ──────────────────────────────────────
  const stop1Map = new Map<string, GroceryItem[]>() // sectionName → items
  const stop2Items: GroceryItem[] = []

  for (const entry of aggregated.values()) {
    const category = entry.category

    // Calculate on-hand and need-to-buy quantities
    let onHandQty: number | null = null
    let needToBuyQty = entry.quantity
    const stock = onHandMap.get(entry.ingredientId)
    if (stock && stock.qty > 0) {
      // Try to convert stock unit to recipe unit for accurate subtraction
      let stockInRecipeUnit = stock.qty
      if (stock.unit !== entry.unit) {
        const converted = convertQuantity(stock.qty, stock.unit, entry.unit)
        if (converted !== null) {
          stockInRecipeUnit = converted
        }
        // If conversion fails, skip subtraction (units incompatible without density)
        else {
          stockInRecipeUnit = 0
        }
      }
      onHandQty = stockInRecipeUnit > 0 ? stockInRecipeUnit : null
      needToBuyQty = Math.max(0, entry.quantity - stockInRecipeUnit)
    }

    // Skip items fully covered by inventory (unless optional - always show those)
    if (needToBuyQty <= 0 && !entry.isOptional) continue

    const item: GroceryItem = {
      ingredientName: entry.ingredientName,
      quantity: entry.quantity,
      unit: entry.unit,
      courseNumbers: entry.courseNumbers,
      courseLabel: entry.courseLabel,
      lastPriceCents: entry.lastPriceCents,
      isOptional: entry.isOptional,
      onHandQty,
      needToBuyQty: needToBuyQty > 0 ? needToBuyQty : entry.quantity,
      substitutions: substitutionMap.get(entry.ingredientId) ?? null,
    }

    // Accumulate projected cost (only for what we need to buy, not what's on hand)
    if (entry.lastPriceCents != null) {
      projectedCents += item.needToBuyQty * entry.lastPriceCents
      priceCount++
    }

    if (STOP_2_CATEGORIES.has(category)) {
      stop2Items.push(item)
    } else {
      const section = CATEGORY_TO_SECTION[category] || 'SPECIALTY'
      const existing = stop1Map.get(section) || []
      existing.push(item)
      stop1Map.set(section, existing)
    }
  }

  // Build stop1Sections in defined order, skipping empty sections
  const stop1Sections: StoreSection[] = SECTION_ORDER.filter(
    (sectionName) => (stop1Map.get(sectionName) || []).length > 0
  ).map((sectionName) => ({
    sectionName,
    items: (stop1Map.get(sectionName) || []).sort((a, b) =>
      a.ingredientName.localeCompare(b.ingredientName)
    ),
  }))

  // Sort stop2 items alphabetically
  stop2Items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))

  // ── Budget guardrail ───────────────────────────────────────────────────────
  const quotedCents = event.quoted_price_cents
  const targetMargin = prefs?.target_margin_percent ?? null

  let ceilingCents: number | null = null
  if (quotedCents && targetMargin != null) {
    // Food cost budget = quoted × (1 - margin%)
    ceilingCents = Math.round(quotedCents * (1 - Number(targetMargin) / 100))
  }

  // Only show projected if we have prices for at least half the ingredients
  const showProjected = totalIngredientCount > 0 && priceCount >= totalIngredientCount * 0.5
  const finalProjected = showProjected ? Math.round(projectedCents) : null

  const totalBuyItems = [...aggregated.values()].length
  const clientData = event.client as unknown as {
    full_name: string
    allergies: string[] | null
  } | null

  // Merge event + client allergies
  const allAllergies = new Set<string>()
  for (const a of event.allergies ?? []) allAllergies.add(a.trim())
  for (const a of clientData?.allergies ?? []) allAllergies.add(a.trim())

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      guest_count: event.guest_count,
      location_city: event.location_city,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    groceryStoreName: groceryStoreName.toUpperCase(),
    liquorStoreName: liquorStoreName.toUpperCase(),
    stop1Sections,
    stop2Items,
    presourcedItems,
    unrecipedComponents,
    budget: {
      ceilingCents,
      projectedCents: finalProjected,
      overBudget:
        ceilingCents != null && finalProjected != null ? finalProjected > ceilingCents : false,
    },
    totalBuyItems,
    hasStop2: stop2Items.length > 0,
    allergies: Array.from(allAllergies),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCourseLabel(courseNumbers: number[]): string {
  if (courseNumbers.length === 1) return `Course ${courseNumbers[0]}`
  return `Courses ${courseNumbers.join(' + ')}`
}

function formatQuantity(qty: number, unit: string): string {
  // Round to a reasonable precision
  const rounded = qty === Math.floor(qty) ? qty : parseFloat(qty.toFixed(2))
  return `${rounded} ${unit}`
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderGroceryList(pdf: PDFLayout, data: GroceryListData) {
  const {
    event,
    clientName,
    groceryStoreName,
    liquorStoreName,
    stop1Sections,
    stop2Items,
    presourcedItems,
    unrecipedComponents,
    budget,
    totalBuyItems,
    hasStop2,
  } = data

  // Estimate density to set font scale
  // totalBuyItems already includes stop2 items - don't add them again
  const totalItems = totalBuyItems + unrecipedComponents.length
  if (totalItems > 40) pdf.setFontScale(0.75)
  else if (totalItems > 25) pdf.setFontScale(0.85)

  // ── Title ──────────────────────────────────────────────────────────────────
  pdf.title('GROCERY LIST', 13)

  // ── Event header bars ─────────────────────────────────────────────────────
  const dateStr = format(
    parseISO(dateToDateString(event.event_date as Date | string)),
    'EEE, MMM d, yyyy'
  )
  pdf.headerBar([
    ['Client', clientName],
    ['Guests', String(event.guest_count)],
    ['Date', dateStr],
  ])

  // Budget line
  const budgetParts: string[] = []
  if (budget.ceilingCents != null) budgetParts.push(`Budget: ${formatCents(budget.ceilingCents)}`)
  if (budget.projectedCents != null)
    budgetParts.push(`Projected: ~${formatCents(budget.projectedCents)}`)
  if (budgetParts.length > 0) {
    pdf.text(budgetParts.join('  |  '), 8, 'normal', 0)
    pdf.space(1)
  }

  // ── Allergy Alert ────────────────────────────────────────────────────────
  if (data.allergies.length > 0) {
    pdf.warningBox(`* ALLERGY ALERT: ${data.allergies.map((a) => a.toUpperCase()).join(', ')}`)
    pdf.space(1)
  }

  // ── Stop 1: Grocery Store ─────────────────────────────────────────────────
  if (stop1Sections.length > 0) {
    pdf.sectionHeader(`STOP 1: ${groceryStoreName}`, 10, true)

    for (const section of stop1Sections) {
      pdf.courseHeader(section.sectionName, 9)
      for (const item of section.items) {
        const buyQty = item.needToBuyQty
        const qtyStr = formatQuantity(buyQty, item.unit)
        const optSuffix = item.isOptional ? ' (optional)' : ''
        const onHandNote =
          item.onHandQty != null
            ? ` (have ${formatQuantity(item.onHandQty, item.unit)} on hand)`
            : ''
        // Substitution hint from shopping history
        const subNote =
          item.substitutions && item.substitutions.length > 0
            ? ` | or: ${item.substitutions.map((s) => `${s.ingredient} (${s.count}x)`).join(', ')}`
            : ''
        const label = `${item.ingredientName} - ${qtyStr}${onHandNote}${optSuffix}${subNote}`
        pdf.checkbox(label, 8, item.courseLabel)
      }
      pdf.space(1)
    }
  } else {
    pdf.sectionHeader(`STOP 1: ${groceryStoreName}`, 10, true)
    pdf.text('No ingredients with recorded recipes - see warnings below.', 8, 'italic')
    pdf.space(1)
  }

  // ── Stop 2: Liquor Store ──────────────────────────────────────────────────
  if (hasStop2) {
    pdf.sectionHeader(`STOP 2: ${liquorStoreName}`, 10, true)
    for (const item of stop2Items) {
      const buyQty = item.needToBuyQty
      const qtyStr = formatQuantity(buyQty, item.unit)
      const onHandNote =
        item.onHandQty != null ? ` (have ${formatQuantity(item.onHandQty, item.unit)} on hand)` : ''
      const label = `${item.ingredientName} - ${qtyStr}${onHandNote}`
      pdf.checkbox(label, 8, item.courseLabel)
    }
    pdf.space(1)
  }

  // ── Pre-sourced ingredients (specialty runs) ──────────────────────────────
  if (presourcedItems && presourcedItems.length > 0) {
    pdf.sectionHeader('\u2713  PRE-SOURCED (specialty run)', 9, true)
    for (const item of presourcedItems) {
      const qtyStr = item.quantity != null ? `${item.quantity} ${item.unit ?? ''}`.trim() : ''
      const storeStr = item.storeName ? ` @ ${item.storeName}` : ''
      const label = `${item.ingredientName}${qtyStr ? ` - ${qtyStr}` : ''}${storeStr}`
      pdf.checkbox(label, 8, undefined, true) // pre-checked: already sourced
    }
    pdf.space(1)
  }

  // ── Components without recipes ────────────────────────────────────────────
  if (unrecipedComponents.length > 0) {
    pdf.sectionHeader('\u26A0  VERIFY MANUALLY (no recipe linked)', 9, true)
    for (const comp of unrecipedComponents) {
      pdf.bullet(`${comp.componentName} - Course ${comp.courseNumber} (${comp.courseName})`, 8, 4)
    }
    pdf.space(1)
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const stops = hasStop2 ? 2 : 1
  const footerParts = [`${totalBuyItems} items`, `${stops} stop${stops > 1 ? 's' : ''}`]
  if (budget.ceilingCents != null) footerParts.push(`Budget: ${formatCents(budget.ceilingCents)}`)
  footerParts.push(
    'Quantities based on recorded recipes \u00D7 scale factor - verify for your guest count'
  )
  pdf.footer(footerParts.join('  \u00B7  '))
}

// ─── Generate ─────────────────────────────────────────────────────────────────

/** Generate a standalone grocery list PDF */
export async function generateGroceryList(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchGroceryListData(eventId)
  if (!data) throw new Error('Cannot generate grocery list: missing event or menu data')

  const pdf = new PDFLayout()
  renderGroceryList(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Grocery List')
  return pdf.toBuffer()
}
