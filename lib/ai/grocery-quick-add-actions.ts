'use server'

// Grocery Quick-Add — Server Actions
// PRIVACY: Recipe ingredients = business data → local only.
// Parses natural language grocery items and adds them to an event's shopping list.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { OllamaOfflineError } from '@/lib/ai/ollama-errors'
import { z } from 'zod'

export interface ParsedGroceryItem {
  name: string
  quantity: string
  unit: string
  category: string
  notes?: string
}

export interface GroceryQuickAddResult {
  items: ParsedGroceryItem[]
  rawInput: string
  summary: string
}

const GroceryParseSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      unit: z.string(),
      category: z.string(),
      notes: z.string().optional(),
    })
  ),
})

/**
 * Parse natural language grocery input into structured items.
 * Example: "2 lbs chicken breast, 1 bunch cilantro, 3 avocados, olive oil"
 */
export async function parseGroceryItems(rawInput: string): Promise<GroceryQuickAddResult> {
  if (!rawInput.trim()) {
    return { items: [], rawInput, summary: 'No items to parse.' }
  }

  const systemPrompt = `You are a grocery list parser for a private chef.
Parse the following natural language grocery list into structured items.

For each item, extract:
- name: the ingredient name (clean, no quantity)
- quantity: the numeric quantity (e.g., "2", "1.5", "a bunch of")
- unit: the unit of measurement (e.g., "lbs", "oz", "each", "bunch", "can", "bottle")
- category: produce, protein, dairy, pantry, spices, bakery, frozen, beverages, other
- notes: any special notes (e.g., "organic", "ripe", "boneless skinless")

Return JSON: { "items": [...] }`

  try {
    const result = await parseWithOllama(
      systemPrompt,
      `Parse this grocery list: "${rawInput}"`,
      GroceryParseSchema,
      { modelTier: 'fast' }
    )

    return {
      items: result.items,
      rawInput,
      summary: `Parsed ${result.items.length} item${result.items.length !== 1 ? 's' : ''} from your list.`,
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err

    // Fallback: simple comma-split parsing (no LLM)
    const items = rawInput
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        name: item,
        quantity: '1',
        unit: 'each',
        category: 'other',
      }))

    return {
      items,
      rawInput,
      summary: `Parsed ${items.length} item${items.length !== 1 ? 's' : ''} (simple parse — Ollama was unavailable for smart parsing).`,
    }
  }
}

/**
 * Get all grocery items for an event (from event_grocery_items or recipe ingredients).
 */
export async function getEventGroceryList(
  eventId: string
): Promise<{ items: ParsedGroceryItem[]; summary: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Try to load from grocery_items table
  const { data: groceryItems } = await (supabase
    .from('grocery_items' as any)
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!) as any)

  if (groceryItems && (groceryItems as any[]).length > 0) {
    const items = (groceryItems as any[]).map((gi) => ({
      name: gi.name ?? gi.ingredient_name ?? '',
      quantity: String(gi.quantity ?? '1'),
      unit: gi.unit ?? 'each',
      category: gi.category ?? 'other',
      notes: gi.notes,
    }))
    return {
      items,
      summary: `${items.length} items on the grocery list for this event.`,
    }
  }

  // Fallback: extract from menu recipes
  const { data: eventMenus } = await (supabase
    .from('event_menus' as any)
    .select('menu_id')
    .eq('event_id', eventId) as any)

  const menuIds = ((eventMenus ?? []) as Array<{ menu_id: string }>).map((em) => em.menu_id)

  if (menuIds.length === 0) {
    return {
      items: [],
      summary: 'No menus linked to this event. Add a menu to generate a grocery list.',
    }
  }

  // Get recipe ingredients via menu items
  const { data: menuItems } = await (supabase
    .from('menu_items' as any)
    .select('recipe_id')
    .in('menu_id', menuIds)
    .not('recipe_id', 'is', null) as any)

  const recipeIds = ((menuItems ?? []) as Array<{ recipe_id: string }>).map((mi) => mi.recipe_id)

  if (recipeIds.length === 0) {
    return {
      items: [],
      summary:
        'No recipes linked to menu items. Add recipes to your menu items to generate a grocery list.',
    }
  }

  const { data: ingredients } = await (supabase
    .from('recipe_ingredients')
    .select('name, quantity, unit')
    .in('recipe_id', recipeIds) as any)

  const items = (
    (ingredients ?? []) as Array<{ name: string; quantity: number | null; unit: string | null }>
  ).map((ing) => ({
    name: ing.name,
    quantity: String(ing.quantity ?? ''),
    unit: ing.unit ?? '',
    category: 'other',
  }))

  return {
    items,
    summary: `${items.length} ingredients from ${recipeIds.length} recipe${recipeIds.length !== 1 ? 's' : ''}.`,
  }
}
