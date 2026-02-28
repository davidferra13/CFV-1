'use server'

// Carry-Forward Inventory AI Matching
// Takes the list of available leftover ingredients (from lib/events/carry-forward.ts)
// and matches them against an upcoming event's ingredient needs.
// Routed to Ollama (internal inventory + financial data).
// Output is SUGGESTION ONLY — chef confirms before any inventory transfer.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { withAiFallback } from './with-ai-fallback'
import { matchCarryForwardFormula } from '@/lib/formulas/carry-forward'
import { getAvailableCarryForwardItems } from '@/lib/events/carry-forward'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const MatchSchema = z.object({
  leftoverItem: z.string(), // ingredient name from carry-forward list
  neededIngredient: z.string(), // ingredient name from event recipes
  compatibilityScore: z.number().min(0).max(100),
  estimatedSavingsCents: z.number().nullable(),
  notes: z.string().nullable(), // e.g. "quantity may be insufficient, verify"
  matchType: z.enum(['exact', 'partial', 'substitution']),
})

const CarryForwardMatchResultSchema = z.object({
  matches: z.array(MatchSchema),
  totalEstimatedSavingsCents: z.number(),
  summary: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type CarryForwardMatchResult = z.infer<typeof CarryForwardMatchResultSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function matchCarryForwardToEvent(
  targetEventId: string
): Promise<CarryForwardMatchResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // event_menu_components is not in generated types — table exists in DB but not yet in types/database.ts
  const [leftovers, recipesResult] = await Promise.all([
    getAvailableCarryForwardItems(targetEventId),
    (supabase.from as Function)('event_menu_components')
      .select(
        `
        name,
        recipe_id,
        recipes(name, recipe_ingredients(ingredient_id, quantity, unit))
      `
      )
      .eq('event_id', targetEventId) as Promise<{
      data: Array<{
        name: string
        recipe_id: string | null
        recipes: {
          name: string
          recipe_ingredients: Array<{ ingredient_id: string; quantity: number; unit: string }>
        } | null
      }> | null
    }>,
  ])

  if (leftovers.length === 0) {
    return {
      matches: [],
      totalEstimatedSavingsCents: 0,
      summary: 'No reusable leftover ingredients available from recent events.',
      confidence: 'high',
    }
  }

  const menuComponents = recipesResult.data ?? []
  const neededIngredients: string[] = []

  for (const comp of menuComponents) {
    const recipe = Array.isArray(comp.recipes) ? comp.recipes[0] : comp.recipes
    if (recipe) {
      const ingredients = Array.isArray(recipe.recipe_ingredients) ? recipe.recipe_ingredients : []
      for (const ing of ingredients) {
        // recipe_ingredients uses ingredient_id FK — we build a placeholder string for AI matching
        neededIngredients.push(
          `${ing.quantity ?? ''} ${ing.unit ?? ''} (ingredient_id: ${ing.ingredient_id})`.trim()
        )
      }
    }
  }

  if (neededIngredients.length === 0) {
    return {
      matches: [],
      totalEstimatedSavingsCents: 0,
      summary: 'No recipe ingredients found for this event — add menu components with recipes.',
      confidence: 'low',
    }
  }

  const systemPrompt = `You are an inventory optimization assistant for a private chef.
Match available leftover ingredients from previous events to ingredients needed for the upcoming event.
Match types:
  exact: same ingredient (e.g. "burrata" matches "burrata")
  partial: same category (e.g. "heavy cream" partially covers "crème fraîche")
  substitution: different but compatible (e.g. "pancetta" can substitute "guanciale")

Be conservative — only flag as substitution if the swap is clearly culinarily appropriate.
Return valid JSON only.`

  const userContent = `
AVAILABLE LEFTOVER INGREDIENTS (from previous events):
${leftovers.map((l) => `- ${l.ingredientName}${l.estimatedCostCents ? ', est. value $' + (l.estimatedCostCents / 100).toFixed(2) : ''}${l.notes ? ', notes: ' + l.notes : ''}${l.useByDate ? ', use by: ' + l.useByDate : ''}`).join('\n')}

NEEDED INGREDIENTS FOR UPCOMING EVENT:
${neededIngredients
  .slice(0, 50)
  .map((i) => `- ${i}`)
  .join('\n')}

Return JSON: {
  "matches": [{ "leftoverItem": "...", "neededIngredient": "...", "compatibilityScore": 0-100, "estimatedSavingsCents": number|null, "notes": "...or null", "matchType": "exact|partial|substitution" }],
  "totalEstimatedSavingsCents": number,
  "summary": "1-2 sentences",
  "confidence": "high|medium|low"
}`

  const { result } = await withAiFallback(
    // Formula: Levenshtein fuzzy match + culinary substitution groups — deterministic
    () => matchCarryForwardFormula(leftovers, neededIngredients),
    // AI: enhanced matching with culinary context (when Ollama is online)
    () => parseWithOllama(systemPrompt, userContent, CarryForwardMatchResultSchema)
  )

  return result
}
