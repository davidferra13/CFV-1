'use server'

// Recipe Scaling Intelligence
// Migrated from Gemini to Ollama for AI policy compliance.
// Recipe data (names, ingredient lists, cooking methods) is private chef IP
// and must stay local per AI-POLICY.md Section 3.
// Beyond simple multiplication - AI adjusts technique notes when scaling.
// Output is DRAFT ONLY - chef must confirm scaled recipe before using.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { z } from 'zod'

export interface ScaledIngredient {
  name: string
  originalQuantity: string
  scaledQuantity: string
  unit: string
  scalingNote: string | null // e.g. "reduce seasoning by 15% - doesn't scale linearly"
}

export interface ScaledRecipe {
  recipeName: string
  originalServings: number
  targetServings: number
  scaledIngredients: ScaledIngredient[]
  techniqueAdjustments: string[] // e.g. "Switch from saute to sheet-pan roast at this scale"
  timingAdjustments: string[] // e.g. "Increase roasting time by 8-10 min for full sheet pan"
  equipmentNotes: string[] // e.g. "You'll need 2 sheet pans, not 1"
  yieldNote: string // plain-English summary of what changed
  generatedAt: string
}

// ── Zod schema for parseWithOllama validation ─────────────────────────────────

const ScaledIngredientSchema = z.object({
  name: z.string(),
  originalQuantity: z.string(),
  scaledQuantity: z.string(),
  unit: z.string(),
  scalingNote: z.string().nullable(),
})

const ScaledRecipeOutputSchema = z.object({
  scaledIngredients: z.array(ScaledIngredientSchema),
  techniqueAdjustments: z.array(z.string()),
  timingAdjustments: z.array(z.string()),
  equipmentNotes: z.array(z.string()),
  yieldNote: z.string(),
})

type ScaledRecipeOutput = z.infer<typeof ScaledRecipeOutputSchema>

// ── Server Action ─────────────────────────────────────────────────────────────

export async function scaleRecipeWithAI(
  recipeId: string,
  targetServings: number
): Promise<ScaledRecipe> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: recipe } = await supabase
    .from('recipes')
    .select(
      `
      name, servings, prep_time_minutes, cook_time_minutes, method,
      recipe_ingredients(quantity, unit, preparation_notes, ingredients(name))
    `
    )
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new Error('Recipe not found')

  const originalServings = recipe.servings ?? 4
  const scaleFactor = targetServings / originalServings

  const ingredients = Array.isArray(recipe.recipe_ingredients) ? recipe.recipe_ingredients : []

  const systemPrompt = `You are a professional chef with deep knowledge of culinary scaling.
Your job is to scale recipes accurately, applying culinary expertise to adjust ingredients and techniques.

Key scaling rules to apply:
- Salt, acids (lemon juice, vinegar), spices, aromatics: scale at 60-75% - they don't scale linearly
- Fats for cooking (oil for searing): scale by pan count, not recipe multiplier
- Leavening agents in baking: use 75% of the mathematically scaled amount
- Herbs, seasonings: taste and adjust - suggest conservative starting amounts
- Broth/liquids for braises: scale conservatively (less evaporation per unit at large scale)
- Heat and timing: flag when technique changes are needed (e.g., saute to roast)
- Equipment: flag when volume requires different equipment

Return ONLY valid JSON matching this exact structure:
{
  "scaledIngredients": [{ "name": "string", "originalQuantity": "string", "scaledQuantity": "string", "unit": "string", "scalingNote": "string or null" }],
  "techniqueAdjustments": ["string"],
  "timingAdjustments": ["string"],
  "equipmentNotes": ["string"],
  "yieldNote": "plain English summary of key changes"
}`

  const userPrompt = `Scale this recipe from ${originalServings} to ${targetServings} servings (${scaleFactor.toFixed(2)}x multiplier).

Recipe: ${recipe.name}
Original servings: ${originalServings}
Target servings: ${targetServings}

Original Ingredients:
${ingredients
  .map((i) => {
    const ingredientName = Array.isArray(i.ingredients)
      ? i.ingredients[0]?.name
      : i.ingredients?.name
    return `  - ${i.quantity ?? ''} ${i.unit ?? ''} ${ingredientName ?? 'unknown'}${i.preparation_notes ? ' (' + i.preparation_notes + ')' : ''}`
  })
  .join('\n')}

Cooking method/steps:
${recipe.method ? recipe.method.slice(0, 800) : 'Not recorded'}
Prep time: ${recipe.prep_time_minutes ?? 'Unknown'} min
Cook time: ${recipe.cook_time_minutes ?? 'Unknown'} min`

  try {
    const parsed = await parseWithOllama<ScaledRecipeOutput>(
      systemPrompt,
      userPrompt,
      ScaledRecipeOutputSchema,
      {
        modelTier: 'standard',
        maxTokens: 2048,
      }
    )

    return {
      recipeName: recipe.name,
      originalServings,
      targetServings,
      scaledIngredients: parsed.scaledIngredients ?? [],
      techniqueAdjustments: parsed.techniqueAdjustments ?? [],
      timingAdjustments: parsed.timingAdjustments ?? [],
      equipmentNotes: parsed.equipmentNotes ?? [],
      yieldNote: parsed.yieldNote ?? '',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[recipe-scaling] Failed:', err)
    throw new Error('Could not scale recipe. Please try again.')
  }
}
