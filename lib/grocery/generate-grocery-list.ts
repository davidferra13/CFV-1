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

// ── Types ─────────────────────────────────────────────────────────────

export interface GroceryItem {
  ingredientId: string
  ingredientName: string
  totalQuantity: number
  displayQuantity: string
  unit: string
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
    .select('id, occasion, guest_count, event_date, menu_id, quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or access denied')
  }

  if (!event.menu_id) {
    return {
      categories: [],
      eventName: event.occasion ?? 'Untitled Event',
      eventDate: event.event_date,
      guestCount: event.guest_count ?? 0,
      totalItems: 0,
      generatedAt: new Date().toISOString(),
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
      dishes!inner(menu_id),
      recipes(
        id,
        name,
        servings,
        recipe_ingredients(
          quantity,
          unit,
          ingredient_id,
          ingredients(id, name, category)
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
      quantities: { qty: number; unit: string }[]
      recipes: Set<string>
    }
  >()

  for (const comp of componentRows) {
    const recipe = Array.isArray(comp.recipes) ? comp.recipes[0] : comp.recipes
    if (!recipe) continue

    const recipeServings = recipe.servings ?? 4
    const scaleFactor = guestCount / recipeServings
    const recipeIngredients = Array.isArray(recipe.recipe_ingredients)
      ? recipe.recipe_ingredients
      : []

    for (const ri of recipeIngredients) {
      const ingredient = Array.isArray(ri.ingredients) ? ri.ingredients[0] : ri.ingredients
      if (!ingredient) continue

      const key = ingredient.id
      if (!ingredientMap.has(key)) {
        ingredientMap.set(key, {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          category: ingredient.category ?? 'other',
          quantities: [],
          recipes: new Set(),
        })
      }

      const entry = ingredientMap.get(key)!
      const scaledQty = (Number(ri.quantity) || 0) * scaleFactor
      if (scaledQty > 0) {
        entry.quantities.push({
          qty: scaledQty,
          unit: normalizeUnit(ri.unit ?? ''),
        })
      }
      entry.recipes.add(recipe.name)
    }
  }

  // 4. Consolidate quantities for each ingredient
  const items: GroceryItem[] = []

  for (const [, entry] of ingredientMap) {
    let totalQty = 0
    let finalUnit = ''

    if (entry.quantities.length === 0) {
      totalQty = 0
      finalUnit = ''
    } else if (entry.quantities.length === 1) {
      totalQty = entry.quantities[0].qty
      finalUnit = entry.quantities[0].unit
    } else {
      // Consolidate compatible units
      let result = { quantity: entry.quantities[0].qty, unit: entry.quantities[0].unit }
      for (let i = 1; i < entry.quantities.length; i++) {
        const next = entry.quantities[i]
        if (canConvert(result.unit, next.unit)) {
          result = addQuantities(result.quantity, result.unit, next.qty, next.unit)
        } else {
          // Incompatible units, best-effort sum
          result.quantity += next.qty
        }
      }
      totalQty = result.quantity
      finalUnit = result.unit
    }

    items.push({
      ingredientId: entry.ingredientId,
      ingredientName: entry.ingredientName,
      totalQuantity: totalQty,
      displayQuantity: formatQuantity(totalQty, finalUnit),
      unit: finalUnit,
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
  dishes: { menu_id: string } | null
  recipes: {
    id: string
    name: string
    servings: number | null
    recipe_ingredients: Array<{
      quantity: number
      unit: string
      ingredient_id: string
      ingredients: {
        id: string
        name: string
        category: string
      } | null
    }>
  } | null
}
