'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MenuBoardItem = {
  id: string
  name: string
  description: string | null
  category: string
  priceCents: number | null
  available: boolean
  dietaryTags: string[]
  allergenFlags: string[]
  isSpecial: boolean
  sortOrder: number
}

export type MenuBoardCategory = {
  name: string
  items: MenuBoardItem[]
}

export type MenuBoardSettings = {
  fontSize: 'small' | 'medium' | 'large'
  layout: 'grid' | 'list'
  accentColor: string
  showAllergens: boolean
  showDescriptions: boolean
  refreshIntervalSeconds: number
  title: string
}

const DEFAULT_SETTINGS: MenuBoardSettings = {
  fontSize: 'large',
  layout: 'list',
  accentColor: '#f59e0b',
  showAllergens: true,
  showDescriptions: true,
  refreshIntervalSeconds: 60,
  title: 'Menu',
}

// We store menu board state in a JSONB column on the chefs table
// via unknown_fields, or in a dedicated food_truck_settings table if it
// exists. For now we use localStorage on the client for settings and
// recipes + a dedicated availability map stored in recipe.notes JSON.

// ---------------------------------------------------------------------------
// getMenuBoardItems
// ---------------------------------------------------------------------------

export async function getMenuBoardItems(): Promise<{
  categories: MenuBoardCategory[]
  settings: MenuBoardSettings
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Fetch all non-archived recipes for this tenant
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, description, category, dietary_tags, servings, notes')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('category')
    .order('name')

  if (error) {
    throw new Error(`Failed to load menu board items: ${error.message}`)
  }

  // Fetch ingredients for allergen data
  const recipeIds = (recipes ?? []).map((r) => r.id)

  let allergenMap: Record<string, string[]> = {}
  if (recipeIds.length > 0) {
    const { data: ri } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id, ingredients(allergen_flags)')
      .in('recipe_id', recipeIds)

    if (ri) {
      for (const row of ri) {
        const recipeId = row.recipe_id
        if (!allergenMap[recipeId]) allergenMap[recipeId] = []
        const ing = row.ingredients as { allergen_flags: string[] } | null
        if (ing?.allergen_flags) {
          for (const flag of ing.allergen_flags) {
            if (!allergenMap[recipeId].includes(flag)) {
              allergenMap[recipeId].push(flag)
            }
          }
        }
      }
    }
  }

  // Parse per-recipe menu board overrides stored in notes JSON
  // Format: { "_menuBoard": { "priceCents": 1200, "available": true, "isSpecial": false, "sortOrder": 0 } }
  const items: MenuBoardItem[] = (recipes ?? []).map((r) => {
    const overrides = parseMenuBoardOverrides(r.notes)
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: formatCategory(r.category),
      priceCents: overrides.priceCents ?? null,
      available: overrides.available ?? true,
      dietaryTags: r.dietary_tags ?? [],
      allergenFlags: allergenMap[r.id] ?? [],
      isSpecial: overrides.isSpecial ?? false,
      sortOrder: overrides.sortOrder ?? 0,
    }
  })

  // Only include items that have a price set (active menu board items)
  const activeItems = items.filter((i) => i.priceCents !== null)

  // Group by category
  const categoryMap = new Map<string, MenuBoardItem[]>()
  // Specials first
  const specials = activeItems.filter((i) => i.isSpecial)
  if (specials.length > 0) {
    categoryMap.set('Daily Specials', specials)
  }
  for (const item of activeItems.filter((i) => !i.isSpecial)) {
    const cat = item.category
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])
    categoryMap.get(cat)!.push(item)
  }

  // Sort items within each category
  for (const items of categoryMap.values()) {
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }

  const categories: MenuBoardCategory[] = Array.from(categoryMap.entries()).map(
    ([name, catItems]) => ({ name, items: catItems })
  )

  // Settings (stored in localStorage on client, defaults here)
  return { categories, settings: DEFAULT_SETTINGS }
}

// ---------------------------------------------------------------------------
// toggleItemAvailability - 86 an item or bring it back
// ---------------------------------------------------------------------------

export async function toggleItemAvailability(
  itemId: string,
  available: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  // Verify ownership
  const { data: recipe, error: fetchErr } = await supabase
    .from('recipes')
    .select('id, notes, tenant_id')
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !recipe) {
    return { success: false, error: 'Item not found' }
  }

  // Update the menu board overrides in notes
  const overrides = parseMenuBoardOverrides(recipe.notes)
  overrides.available = available

  const updatedNotes = updateMenuBoardOverrides(recipe.notes, overrides)

  const { error: updateErr } = await supabase
    .from('recipes')
    .update({ notes: updatedNotes })
    .eq('id', itemId)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  revalidatePath('/food-truck/menu-board')
  revalidatePath('/food-truck/menu-board/display')
  return { success: true }
}

// ---------------------------------------------------------------------------
// updateMenuBoardItemPrice - set the truck price for an item
// ---------------------------------------------------------------------------

export async function updateMenuBoardItemPrice(
  itemId: string,
  priceCents: number | null,
  isSpecial: boolean = false,
  sortOrder: number = 0
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { data: recipe, error: fetchErr } = await supabase
    .from('recipes')
    .select('id, notes, tenant_id')
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !recipe) {
    return { success: false, error: 'Item not found' }
  }

  const overrides = parseMenuBoardOverrides(recipe.notes)
  overrides.priceCents = priceCents
  overrides.isSpecial = isSpecial
  overrides.sortOrder = sortOrder

  const updatedNotes = updateMenuBoardOverrides(recipe.notes, overrides)

  const { error: updateErr } = await supabase
    .from('recipes')
    .update({ notes: updatedNotes })
    .eq('id', itemId)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  revalidatePath('/food-truck/menu-board')
  revalidatePath('/food-truck/menu-board/display')
  return { success: true }
}

// ---------------------------------------------------------------------------
// getAllRecipesForBoard - get all recipes (including ones not yet on the board)
// ---------------------------------------------------------------------------

export async function getAllRecipesForBoard(): Promise<
  {
    id: string
    name: string
    category: string
    onBoard: boolean
    priceCents: number | null
    isSpecial: boolean
    available: boolean
    sortOrder: number
  }[]
> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = createServerClient()

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, category, notes')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('category')
    .order('name')

  if (error) {
    throw new Error(`Failed to load recipes: ${error.message}`)
  }

  return (recipes ?? []).map((r) => {
    const overrides = parseMenuBoardOverrides(r.notes)
    return {
      id: r.id,
      name: r.name,
      category: formatCategory(r.category),
      onBoard: overrides.priceCents !== null && overrides.priceCents !== undefined,
      priceCents: overrides.priceCents ?? null,
      isSpecial: overrides.isSpecial ?? false,
      available: overrides.available ?? true,
      sortOrder: overrides.sortOrder ?? 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MenuBoardOverrides = {
  priceCents?: number | null
  available?: boolean
  isSpecial?: boolean
  sortOrder?: number
}

function parseMenuBoardOverrides(notes: string | null): MenuBoardOverrides {
  if (!notes) return {}
  try {
    // Look for a JSON block at the end of notes: <!-- _menuBoard:{...} -->
    const match = notes.match(/<!-- _menuBoard:(.*?) -->/)
    if (match) {
      return JSON.parse(match[1])
    }
  } catch {
    // notes is just plain text
  }
  return {}
}

function updateMenuBoardOverrides(notes: string | null, overrides: MenuBoardOverrides): string {
  const json = JSON.stringify(overrides)
  const tag = `<!-- _menuBoard:${json} -->`

  if (!notes) return tag

  // Replace existing tag or append
  const existing = notes.match(/<!-- _menuBoard:.*? -->/)
  if (existing) {
    return notes.replace(/<!-- _menuBoard:.*? -->/, tag)
  }
  return `${notes}\n${tag}`
}

function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    sauce: 'Sauces',
    protein: 'Mains',
    starch: 'Sides',
    vegetable: 'Sides',
    fruit: 'Sides',
    dessert: 'Desserts',
    bread: 'Sides',
    pasta: 'Mains',
    soup: 'Soups',
    salad: 'Salads',
    appetizer: 'Appetizers',
    condiment: 'Extras',
    beverage: 'Drinks',
    other: 'Other',
  }
  return map[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1)
}
