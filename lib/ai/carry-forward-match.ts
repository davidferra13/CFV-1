// @ts-nocheck
'use server'

// Carry-Forward Inventory AI Matching
// Takes the list of available leftover ingredients (from lib/events/carry-forward.ts)
// and matches them against an upcoming event's ingredient needs.
// Routed to Ollama (internal inventory + financial data).
// Output is SUGGESTION ONLY — chef confirms before any inventory transfer.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { OllamaOfflineError } from './ollama-errors'
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

  const [leftovers, recipesResult] = await Promise.all([
    getAvailableCarryForwardItems(targetEventId),
    supabase
      .from('event_menu_components')
      .select(
        `
        name,
        recipe_id,
        recipes(name, recipe_ingredients(ingredient_name, quantity, unit))
      `
      )
      .eq('event_id', targetEventId),
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
      const ingredients = Array.isArray((recipe as any).recipe_ingredients)
        ? (recipe as any).recipe_ingredients
        : []
      for (const ing of ingredients) {
        neededIngredients.push(
          `${ing.quantity ?? ''} ${ing.unit ?? ''} ${ing.ingredient_name ?? ''}`.trim()
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

  try {
    return await parseWithOllama(systemPrompt, userContent, CarryForwardMatchResultSchema)
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[carry-forward-match] Failed:', err)
    return {
      matches: [],
      totalEstimatedSavingsCents: 0,
      summary: 'AI matching unavailable — review leftover inventory manually.',
      confidence: 'low',
    }
  }
}
