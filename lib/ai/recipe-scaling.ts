// @ts-nocheck
'use server'

// Recipe Scaling Intelligence
// Beyond simple multiplication — AI adjusts technique notes when scaling.
// Routed to Gemini (creative/quality culinary knowledge).
// Output is DRAFT ONLY — chef must confirm scaled recipe before using.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface ScaledIngredient {
  name: string
  originalQuantity: string
  scaledQuantity: string
  unit: string
  scalingNote: string | null // e.g. "reduce seasoning by 15% — doesn't scale linearly"
}

export interface ScaledRecipe {
  recipeName: string
  originalServings: number
  targetServings: number
  scaledIngredients: ScaledIngredient[]
  techniqueAdjustments: string[] // e.g. "Switch from sauté to sheet-pan roast at this scale"
  timingAdjustments: string[] // e.g. "Increase roasting time by 8–10 min for full sheet pan"
  equipmentNotes: string[] // e.g. "You'll need 2 sheet pans, not 1"
  yieldNote: string // plain-English summary of what changed
  generatedAt: string
}

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  return new GoogleGenAI({ apiKey })
}

export async function scaleRecipeWithAI(
  recipeId: string,
  targetServings: number
): Promise<ScaledRecipe> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: recipe } = await supabase
    .from('recipes')
    .select(
      `
      name, servings, prep_time_minutes, cook_time_minutes, method_steps,
      recipe_ingredients(ingredient_name, quantity, unit, notes)
    `
    )
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) throw new Error('Recipe not found')

  const originalServings = recipe.servings ?? 4
  const scaleFactor = targetServings / originalServings

  const ingredients = Array.isArray((recipe as any).recipe_ingredients)
    ? (recipe as any).recipe_ingredients
    : []

  const prompt = `You are a professional chef with deep knowledge of culinary scaling.
Scale this recipe from ${originalServings} to ${targetServings} servings (${scaleFactor.toFixed(2)}x multiplier).

Recipe: ${recipe.name}
Original servings: ${originalServings}
Target servings: ${targetServings}

Original Ingredients:
${ingredients.map((i: any) => `  - ${i.quantity ?? ''} ${i.unit ?? ''} ${i.ingredient_name}${i.notes ? ' (' + i.notes + ')' : ''}`).join('\n')}

Cooking method/steps:
${recipe.method_steps ? JSON.stringify(recipe.method_steps).slice(0, 800) : 'Not recorded'}
Prep time: ${recipe.prep_time_minutes ?? 'Unknown'} min
Cook time: ${recipe.cook_time_minutes ?? 'Unknown'} min

Key scaling rules to apply:
- Salt, acids (lemon juice, vinegar), spices, aromatics: scale at 60–75% — they don't scale linearly
- Fats for cooking (oil for searing): scale by pan count, not recipe multiplier
- Leavening agents in baking: use 75% of the mathematically scaled amount
- Herbs, seasonings: taste and adjust — suggest conservative starting amounts
- Broth/liquids for braises: scale conservatively (less evaporation per unit at large scale)
- Heat and timing: flag when technique changes are needed (e.g., sauté → roast)
- Equipment: flag when volume requires different equipment

Return JSON: {
  "scaledIngredients": [{ "name": "...", "originalQuantity": "...", "scaledQuantity": "...", "unit": "...", "scalingNote": "...or null" }],
  "techniqueAdjustments": ["..."],
  "timingAdjustments": ["..."],
  "equipmentNotes": ["..."],
  "yieldNote": "plain English summary of key changes"
}

Return ONLY valid JSON.`

  try {
    const ai = getClient()
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { temperature: 0.3, responseMimeType: 'application/json' },
    })
    const text = (response.text || '').replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(text)
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
