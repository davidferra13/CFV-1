'use server'

// Grocery List Consolidation + Substitution
// Takes all recipe ingredients for an event, consolidates duplicates,
// groups by store section, and suggests substitutions for dietary restrictions.
// Routed to local Ollama (culinary knowledge, stays private).
// Output is DRAFT ONLY — chef reviews before adding to grocery quote.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'
import { z } from 'zod'

export interface ConsolidatedIngredient {
  name: string
  totalQuantity: string // e.g. "3 cups + 2 tbsp"
  unit: string
  storeSection: string // Produce, Proteins, Dairy, Pantry, Bakery, Alcohol, Supplies
  usedIn: string[] // recipe names that need this
  substitution: string | null // dietary-safe substitute if applicable
  substitutionReason: string | null
}

export interface GroceryConsolidationResult {
  ingredients: ConsolidatedIngredient[]
  bySection: Record<string, ConsolidatedIngredient[]> // grouped by store section
  dietaryFlags: string[] // items that conflict with event restrictions
  shoppingNotes: string // general notes for the shopping trip
  generatedAt: string
}

const ConsolidatedIngredientSchema = z.object({
  name: z.string(),
  totalQuantity: z.string(),
  unit: z.string(),
  storeSection: z.string(),
  usedIn: z.array(z.string()),
  substitution: z.string().nullable(),
  substitutionReason: z.string().nullable(),
})

const GroceryResultSchema = z.object({
  ingredients: z.array(ConsolidatedIngredientSchema),
  dietaryFlags: z.array(z.string()),
  shoppingNotes: z.string(),
})

export async function consolidateGroceryList(eventId: string): Promise<GroceryConsolidationResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // event_menu_components is not in generated types — table exists in DB but not yet in types/database.ts
  const [eventResult, menuResult] = await Promise.all([
    supabase
      .from('events')
      .select('occasion, guest_count, dietary_restrictions, allergies')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (supabase.from as Function)('event_menu_components')
      .select(
        `
        name,
        recipes(name, servings, recipe_ingredients(quantity, unit, ingredients(name)))
      `
      )
      .eq('event_id', eventId) as Promise<{
      data: Array<{
        name: string
        recipes: {
          name: string
          servings: number | null
          recipe_ingredients: Array<{
            quantity: number
            unit: string
            ingredients: { name: string } | null
          }>
        } | null
      }> | null
    }>,
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menuItems = menuResult.data ?? []
  const guestCount = event.guest_count ?? 10

  // Flatten all ingredients with recipe context
  const allIngredients: {
    recipeName: string
    ingredientName: string
    quantity: string
    unit: string
    servings: number
  }[] = []

  for (const item of menuItems) {
    const recipe = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes
    if (!recipe) continue
    const recipeServings = recipe.servings ?? 4
    const scaleFactor = guestCount / recipeServings
    const ingredients = Array.isArray(recipe.recipe_ingredients) ? recipe.recipe_ingredients : []

    for (const ing of ingredients) {
      allIngredients.push({
        recipeName: item.name,
        ingredientName: ing.ingredients?.name ?? 'Unknown ingredient',
        quantity: ing.quantity ? String(Math.ceil(Number(ing.quantity) * scaleFactor)) : '',
        unit: ing.unit ?? '',
        servings: recipeServings,
      })
    }
  }

  if (allIngredients.length === 0) {
    return {
      ingredients: [],
      bySection: {},
      dietaryFlags: [],
      shoppingNotes:
        'No recipes with ingredients found for this event. Add recipes with ingredient lists to generate a grocery list.',
      generatedAt: new Date().toISOString(),
    }
  }

  const restrictions = [...(event.dietary_restrictions ?? []), ...(event.allergies ?? [])].filter(
    Boolean
  )

  const systemPrompt = `You are a professional chef's grocery planning assistant.
Consolidate ingredient lists, combine duplicate ingredients, group by store section, and flag any items that conflict with dietary restrictions.

Tasks:
1. CONSOLIDATE: Combine the same ingredient across recipes (e.g., "2 tbsp butter" + "1/4 cup butter" = "1/4 cup + 2 tbsp butter")
2. GROUP: Assign each to a store section: Produce, Proteins, Dairy, Pantry, Bakery, Alcohol, Supplies
3. FLAG: Identify items that may conflict with dietary restrictions
4. SUBSTITUTE: Suggest safe substitutions for flagged items (only when a clearly better alternative exists)
5. NOTES: One or two shopping trip notes (e.g., "buy proteins last, check use-by dates")

Return JSON with keys: ingredients (array of objects with name, totalQuantity, unit, storeSection, usedIn, substitution, substitutionReason), dietaryFlags (array of strings), shoppingNotes (string).`

  const userContent = `Guest count: ${guestCount}
Dietary restrictions/allergies: ${restrictions.join(', ') || 'None'}

All ingredients (scaled for ${guestCount} guests):
${allIngredients.map((i) => `- [${i.recipeName}] ${i.quantity} ${i.unit} ${i.ingredientName}`).join('\n')}`

  try {
    const parsed = await parseWithOllama(systemPrompt, userContent, GroceryResultSchema, {
      modelTier: 'standard',
      timeoutMs: 60_000,
    })

    const ingredients: ConsolidatedIngredient[] = parsed.ingredients ?? []

    // Build bySection map
    const bySection: Record<string, ConsolidatedIngredient[]> = {}
    for (const ing of ingredients) {
      if (!bySection[ing.storeSection]) bySection[ing.storeSection] = []
      bySection[ing.storeSection].push(ing)
    }

    return {
      ingredients,
      bySection,
      dietaryFlags: parsed.dietaryFlags ?? [],
      shoppingNotes: parsed.shoppingNotes ?? '',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[grocery-consolidation] Failed:', err)
    throw new Error('Could not consolidate grocery list. Please try again.')
  }
}
