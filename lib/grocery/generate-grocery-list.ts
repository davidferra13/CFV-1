'use server'

// Grocery List Generation from Event Menus
// Pure database queries + math. No AI. Formula > AI.
//
// Fetches event -> menu -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
// Consolidates duplicates, converts units, scales by guest count, groups by category.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { normalizeUnit, canConvert, addQuantities, formatQuantity } from './unit-conversion'
import { assignStoreSection } from '@/lib/formulas/grocery-consolidation'
import { PORTIONS_BY_SERVICE_STYLE } from '@/lib/finance/industry-benchmarks'

// ── Types ─────────────────────────────────────────────────────────────

export interface GroceryItem {
  ingredientId: string
  ingredientName: string
  recipeQuantity: number // raw recipe quantity (before yield adjustment)
  totalQuantity: number // yield-adjusted buy quantity
  displayQuantity: string
  unit: string
  yieldPct: number // effective yield percentage used
  category: string // ingredient_category from DB
  storeSection: string // mapped store section for shopping
  recipes: string[] // which recipes need this ingredient
  checked: boolean
  isCustom: false
}

export interface CustomGroceryItem {
  id: string
  name: string
  checked: boolean
  isCustom: true
  storeSection: string
}

export type AnyGroceryItem = GroceryItem | CustomGroceryItem

export interface GroceryCategory {
  name: string
  items: GroceryItem[]
}

export interface GroceryListData {
  categories: GroceryCategory[]
  eventName: string
  eventDate: string | null
  guestCount: number
  totalItems: number
  generatedAt: string
  allergyWarnings?: string[]
  budget: {
    quotedCents: number | null
    projectedCents: number | null
    ceilingCents: number | null
    overBudget: boolean
  }
}

// ── Category Display Names ────────────────────────────────────────────
// Map DB ingredient_category enum values to user-friendly display names

const CATEGORY_DISPLAY: Record<string, string> = {
  protein: 'Proteins',
  produce: 'Produce',
  dairy: 'Dairy',
  pantry: 'Pantry',
  spice: 'Spices',
  oil: 'Oils & Fats',
  alcohol: 'Alcohol',
  baking: 'Baking',
  frozen: 'Frozen',
  canned: 'Canned Goods',
  fresh_herb: 'Fresh Herbs',
  dry_herb: 'Dried Herbs',
  condiment: 'Condiments',
  beverage: 'Beverages',
  specialty: 'Specialty',
  other: 'Other',
}

function getCategoryDisplay(category: string): string {
  return CATEGORY_DISPLAY[category] ?? category
}

// ── Server Action ─────────────────────────────────────────────────────

export async function generateGroceryList(eventId: string): Promise<GroceryListData> {
  const user = await requireChef()
  const db: any = createServerClient()

  // 1. Fetch event details + menu
  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      'id, occasion, guest_count, event_date, menu_id, quoted_price_cents, dietary_restrictions, allergies, client_id, service_style'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or access denied')
  }

  // FC-G6: Collect dietary/allergy warnings from event + client
  const allergyWarnings: string[] = []
  const eventAllergies = (event.allergies as string[] | null) ?? []
  const eventDietary = (event.dietary_restrictions as string[] | null) ?? []
  if (eventAllergies.length > 0) allergyWarnings.push(`Allergies: ${eventAllergies.join(', ')}`)
  if (eventDietary.length > 0) allergyWarnings.push(`Dietary: ${eventDietary.join(', ')}`)
  if (event.client_id) {
    try {
      const { data: clientRow } = await db
        .from('clients')
        .select('allergies, dietary_restrictions')
        .eq('id', event.client_id)
        .single()
      for (const a of (clientRow?.allergies as string[] | null) ?? []) {
        if (!eventAllergies.includes(a)) allergyWarnings.push(`Client allergy: ${a}`)
      }
      for (const d of (clientRow?.dietary_restrictions as string[] | null) ?? []) {
        if (!eventDietary.includes(d)) allergyWarnings.push(`Client dietary: ${d}`)
      }
    } catch {
      /* non-blocking */
    }
  }

  if (!event.menu_id) {
    return {
      categories: [],
      eventName: event.occasion ?? 'Untitled Event',
      eventDate: event.event_date,
      guestCount: event.guest_count ?? 0,
      totalItems: 0,
      generatedAt: new Date().toISOString(),
      allergyWarnings,
      budget: { quotedCents: null, projectedCents: null, ceilingCents: null, overBudget: false },
    }
  }

  // 2. Fetch the full chain: menu -> dishes -> components -> recipes -> recipe_ingredients -> ingredients
  //    Using the real schema: menus -> dishes -> components (with recipe_id) -> recipes -> recipe_ingredients -> ingredients
  const { data: components } = (await (db as any)
    .from('components')
    .select(
      `
      id,
      name,
      dish_id,
      recipe_id,
      scale_factor,
      dishes!inner(menu_id),
      recipes(
        id,
        name,
        servings,
        recipe_ingredients(
          quantity,
          unit,
          yield_pct,
          ingredient_id,
          ingredients(id, name, category, default_yield_pct)
        )
      )
    `
    )
    .eq('dishes.menu_id', event.menu_id)) as { data: ComponentRow[] | null }

  const componentRows = components ?? []
  const guestCount = event.guest_count ?? 10

  // 3. Flatten all ingredients with scaling and deduplication
  //    Key = ingredient_id for exact dedup (same ingredient used across recipes)
  const ingredientMap = new Map<
    string,
    {
      ingredientId: string
      ingredientName: string
      category: string
      recipeQuantities: { qty: number; unit: string }[]
      quantities: { qty: number; unit: string }[]
      yieldPct: number
      recipes: Set<string>
    }
  >()

  // Helper: add ingredient to map with scaling and yield adjustment
  function addIngredient(
    ri: {
      quantity: number
      unit: string
      yield_pct: number | null
      ingredient_id: string
      ingredients: any
    },
    scaleFactor: number,
    recipeName: string
  ) {
    const ingredient = Array.isArray(ri.ingredients) ? ri.ingredients[0] : ri.ingredients
    if (!ingredient) return

    const key = ingredient.id
    if (!ingredientMap.has(key)) {
      ingredientMap.set(key, {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category ?? 'other',
        recipeQuantities: [],
        quantities: [],
        yieldPct: 100,
        recipes: new Set(),
      })
    }

    const entry = ingredientMap.get(key)!
    const scaledQty = (Number(ri.quantity) || 0) * scaleFactor
    const yieldPct = Math.max(
      Number(ri.yield_pct) || Number(ingredient.default_yield_pct) || 100,
      1
    )
    const buyQty = (scaledQty * 100) / yieldPct

    if (scaledQty > 0) {
      entry.recipeQuantities.push({
        qty: scaledQty,
        unit: normalizeUnit(ri.unit ?? ''),
      })
      entry.quantities.push({
        qty: buyQty,
        unit: normalizeUnit(ri.unit ?? ''),
      })
      entry.yieldPct = Math.min(entry.yieldPct, yieldPct)
    }
    entry.recipes.add(recipeName)
  }

  // Build recipe multipliers from components (top-level recipes)
  const recipeMultipliers = new Map<string, { scale: number; name: string }>()

  for (const comp of componentRows) {
    const recipe = Array.isArray(comp.recipes) ? comp.recipes[0] : comp.recipes
    if (!recipe) continue

    const recipeServings = recipe.servings ?? 4
    const componentScale = Number(comp.scale_factor) || 1
    const serviceStyle = event.service_style ?? 'plated'
    const styleMultiplier = PORTIONS_BY_SERVICE_STYLE[serviceStyle]?.multiplier ?? 1.0
    const scaleFactor = (guestCount / recipeServings) * componentScale * styleMultiplier
    const recipeIngredients = Array.isArray(recipe.recipe_ingredients)
      ? recipe.recipe_ingredients
      : []

    recipeMultipliers.set(recipe.id, {
      scale: (recipeMultipliers.get(recipe.id)?.scale ?? 0) + scaleFactor,
      name: recipe.name,
    })

    for (const ri of recipeIngredients) {
      addIngredient(ri, scaleFactor, recipe.name)
    }
  }

  // Recurse into sub-recipes
  const visited = new Set<string>()
  const queue = [...recipeMultipliers.entries()].map(([id, v]) => ({ id, scale: v.scale }))

  while (queue.length > 0) {
    const batch = queue.filter((item) => !visited.has(item.id))
    if (batch.length === 0) break
    batch.forEach((item) => visited.add(item.id))

    const { data: subRecipeRows } = await db
      .from('recipe_sub_recipes')
      .select('parent_recipe_id, child_recipe_id, quantity')
      .in(
        'parent_recipe_id',
        batch.map((b) => b.id)
      )

    if (!subRecipeRows?.length) break

    // Get child recipe IDs and fetch their ingredients
    const childIds = [...new Set((subRecipeRows as any[]).map((r: any) => r.child_recipe_id))]
    const { data: childRecipes } = await db
      .from('recipes')
      .select('id, name, servings')
      .in('id', childIds)
    const { data: childIngredients } = await db
      .from('recipe_ingredients')
      .select(
        'recipe_id, quantity, unit, yield_pct, ingredient_id, ingredients(id, name, category, default_yield_pct)'
      )
      .in('recipe_id', childIds)

    const childRecipeMap = new Map<string, any>((childRecipes ?? []).map((r: any) => [r.id, r]))

    for (const sr of subRecipeRows as any[]) {
      const parentItem = batch.find((b) => b.id === sr.parent_recipe_id)
      const parentScale = parentItem?.scale ?? 1
      const childScale = parentScale * (Number(sr.quantity) || 1)
      const childRecipe = childRecipeMap.get(sr.child_recipe_id)
      const childName = childRecipe?.name ?? 'Sub-recipe'

      // Add child recipe ingredients
      const childRIs = (childIngredients ?? []).filter(
        (ci: any) => ci.recipe_id === sr.child_recipe_id
      )
      for (const ri of childRIs as any[]) {
        addIngredient(ri, childScale, childName)
      }

      queue.push({ id: sr.child_recipe_id, scale: childScale })
    }
  }

  // 4. Consolidate quantities for each ingredient
  const items: GroceryItem[] = []

  for (const [, entry] of ingredientMap) {
    let totalQty = 0
    let recipeQty = 0
    let finalUnit = ''

    // Consolidate recipe quantities (pre-yield)
    if (entry.recipeQuantities.length > 0) {
      let result = { quantity: entry.recipeQuantities[0].qty, unit: entry.recipeQuantities[0].unit }
      for (let i = 1; i < entry.recipeQuantities.length; i++) {
        const next = entry.recipeQuantities[i]
        if (canConvert(result.unit, next.unit)) {
          result = addQuantities(result.quantity, result.unit, next.qty, next.unit)
        } else {
          result.quantity += next.qty
        }
      }
      recipeQty = result.quantity
    }

    // Consolidate buy quantities (yield-adjusted)
    if (entry.quantities.length === 0) {
      totalQty = 0
      finalUnit = ''
    } else if (entry.quantities.length === 1) {
      totalQty = entry.quantities[0].qty
      finalUnit = entry.quantities[0].unit
    } else {
      let result = { quantity: entry.quantities[0].qty, unit: entry.quantities[0].unit }
      for (let i = 1; i < entry.quantities.length; i++) {
        const next = entry.quantities[i]
        if (canConvert(result.unit, next.unit)) {
          result = addQuantities(result.quantity, result.unit, next.qty, next.unit)
        } else {
          result.quantity += next.qty
        }
      }
      totalQty = result.quantity
      finalUnit = result.unit
    }

    // Apply waste buffer based on event's service style
    const wasteRate = PORTIONS_BY_SERVICE_STYLE[event.service_style ?? 'plated']?.wasteExpected ?? 3
    const bufferedQty = totalQty * (1 + wasteRate / 100)

    items.push({
      ingredientId: entry.ingredientId,
      ingredientName: entry.ingredientName,
      recipeQuantity: recipeQty,
      totalQuantity: bufferedQty,
      displayQuantity: formatQuantity(bufferedQty, finalUnit),
      unit: finalUnit,
      yieldPct: entry.yieldPct,
      category: getCategoryDisplay(entry.category),
      storeSection: assignStoreSection(entry.ingredientName),
      recipes: Array.from(entry.recipes),
      checked: false,
      isCustom: false,
    })
  }

  // 5. Group by category
  const categoryMap = new Map<string, GroceryItem[]>()
  for (const item of items) {
    const cat = item.category
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])
    categoryMap.get(cat)!.push(item)
  }

  // Sort items within each category alphabetically
  const categories: GroceryCategory[] = []
  for (const [name, categoryItems] of categoryMap) {
    categoryItems.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
    categories.push({ name, items: categoryItems })
  }

  // Sort categories in a sensible shopping order
  const CATEGORY_ORDER = [
    'Produce',
    'Fresh Herbs',
    'Proteins',
    'Dairy',
    'Pantry',
    'Spices',
    'Dried Herbs',
    'Oils & Fats',
    'Canned Goods',
    'Baking',
    'Condiments',
    'Frozen',
    'Beverages',
    'Alcohol',
    'Specialty',
    'Other',
  ]
  categories.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.name)
    const bi = CATEGORY_ORDER.indexOf(b.name)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  // ── Budget guardrail ─────────────────────────────────────────────────────
  // Fetch last known price for each ingredient and compute projected spend.
  // Food cost target = 30% of quoted price (standard industry margin).
  // Only shown when we have prices for 50%+ of ingredients.
  let projectedCents: number | null = null
  const ingredientIds = items.map((i) => i.ingredientId).filter(Boolean)
  const quotedCents: number | null = event.quoted_price_cents ?? null

  if (ingredientIds.length > 0) {
    try {
      const { data: priceRows } = await db
        .from('ingredient_price_history')
        .select('ingredient_id, price_cents, quantity, unit')
        .in('ingredient_id', ingredientIds)
        .eq('tenant_id', user.tenantId!)
        .order('recorded_at', { ascending: false })

      if (priceRows && priceRows.length > 0) {
        // Keep only the most recent price per ingredient
        const latestPrice = new Map<string, number>()
        for (const row of priceRows) {
          if (!latestPrice.has(row.ingredient_id) && row.price_cents > 0) {
            latestPrice.set(row.ingredient_id, row.price_cents)
          }
        }

        let priceCount = 0
        let totalCents = 0
        for (const item of items) {
          const pricePer = latestPrice.get(item.ingredientId)
          if (pricePer != null) {
            totalCents += pricePer * item.totalQuantity
            priceCount++
          }
        }

        // Only surface if we have prices for at least half the items
        if (priceCount >= items.length * 0.5) {
          projectedCents = Math.round(totalCents)
        }
      }
    } catch {
      // Price lookup is non-blocking - never fail the list generation
    }
  }

  // Ceiling = 30% of quoted (industry standard food cost target)
  const ceilingCents = quotedCents != null ? Math.round(quotedCents * 0.3) : null

  return {
    categories,
    eventName: event.occasion ?? 'Untitled Event',
    eventDate: event.event_date,
    guestCount,
    totalItems: items.length,
    generatedAt: new Date().toISOString(),
    allergyWarnings,
    budget: {
      quotedCents,
      projectedCents,
      ceilingCents,
      overBudget: projectedCents != null && ceilingCents != null && projectedCents > ceilingCents,
    },
  }
}

// ── Internal Types for the database Query ─────────────────────────────────

interface ComponentRow {
  id: string
  name: string
  dish_id: string
  recipe_id: string | null
  scale_factor: number | null
  dishes: { menu_id: string } | null
  recipes: {
    id: string
    name: string
    servings: number | null
    recipe_ingredients: Array<{
      quantity: number
      unit: string
      yield_pct: number | null
      ingredient_id: string
      ingredients: {
        id: string
        name: string
        category: string
        default_yield_pct: number | null
      } | null
    }>
  } | null
}
