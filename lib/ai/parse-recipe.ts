// Recipe Smart Import Parser
// Extracts structured recipe data from natural language text

'use server'

import { z } from 'zod'
import { parseWithAI, type ParseResult } from './parse'

// ============================================
// PARSED RECIPE SCHEMA
// ============================================

const RECIPE_CATEGORIES = [
  'sauce', 'protein', 'starch', 'vegetable', 'fruit', 'dessert',
  'bread', 'pasta', 'soup', 'salad', 'appetizer', 'condiment',
  'beverage', 'other'
] as const

const ALLERGEN_FLAGS = [
  'dairy', 'nuts', 'tree_nuts', 'peanuts', 'gluten', 'shellfish',
  'fish', 'eggs', 'soy', 'sesame', 'celery', 'mustard', 'sulfites'
] as const

const ParsedIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().default(1),
  unit: z.string().default('unit'),
  preparation_notes: z.string().nullable().default(null),
  is_optional: z.boolean().default(false),
  estimated: z.boolean().default(false),
  category: z.enum([
    'protein', 'produce', 'dairy', 'pantry', 'spice', 'oil',
    'alcohol', 'baking', 'frozen', 'canned', 'fresh_herb',
    'dry_herb', 'condiment', 'beverage', 'specialty', 'other'
  ]).default('other'),
  allergen_flags: z.array(z.string()).default([])
})

export type ParsedIngredient = z.infer<typeof ParsedIngredientSchema>

export const ParsedRecipeSchema = z.object({
  parsed: z.object({
    name: z.string().min(1),
    category: z.enum(RECIPE_CATEGORIES),
    description: z.string().nullable().default(null),
    method: z.string().min(1),
    method_detailed: z.string().nullable().default(null),
    ingredients: z.array(ParsedIngredientSchema).default([]),
    yield_quantity: z.number().nullable().default(null),
    yield_unit: z.string().nullable().default(null),
    yield_description: z.string().nullable().default(null),
    prep_time_minutes: z.number().nullable().default(null),
    cook_time_minutes: z.number().nullable().default(null),
    total_time_minutes: z.number().nullable().default(null),
    dietary_tags: z.array(z.string()).default([]),
    allergen_flags: z.array(z.string()).default([]),
    adaptations: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
    field_confidence: z.record(z.string(), z.enum(['confirmed', 'inferred', 'unknown'])).default({})
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  warnings: z.array(z.string()).default([])
})

export type ParsedRecipe = z.infer<typeof ParsedRecipeSchema>['parsed']

const RECIPE_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's recipe management system. Your job is to parse natural language recipe descriptions into structured JSON.

This is for a PROFESSIONAL CHEF — the method should be concise (outcomes, not basic instructions). The chef knows HOW to cook; they need to remember WHAT to do.

RULES:
- Extract the recipe name, category, ingredients, and method.
- For ingredients: normalize quantities where possible. "Splash of worcestershire" → quantity: 1, unit: "tsp", name: "worcestershire sauce", estimated: true. "A squeeze of lemon" → quantity: 0.5, unit: "each", name: "lemon", estimated: true.
- Auto-detect allergens from ingredients: dairy products → "dairy", nuts → "nuts", wheat flour → "gluten", shellfish → "shellfish", etc.
- Category must be one of: sauce, protein, starch, vegetable, fruit, dessert, bread, pasta, soup, salad, appetizer, condiment, beverage, other
- Ingredient category must be one of: protein, produce, dairy, pantry, spice, oil, alcohol, baking, frozen, canned, fresh_herb, dry_herb, condiment, beverage, specialty, other
- Method should be concise — steps as brief outcome-oriented sentences.
- method_detailed can include more detail if the input is verbose.
- If yield is mentioned ("serves 4", "makes 2 cups"), capture it.
- Times are often not stated — mark as null if not mentioned.
- Track field_confidence for key fields.

RESPOND WITH ONLY valid JSON (no markdown, no explanation):
{
  "parsed": {
    "name": "string (required)",
    "category": "sauce|protein|starch|vegetable|fruit|dessert|bread|pasta|soup|salad|appetizer|condiment|beverage|other",
    "description": "string or null (brief description)",
    "method": "string (required - concise outcome-oriented steps)",
    "method_detailed": "string or null (more detailed version if input was verbose)",
    "ingredients": [
      {
        "name": "string (required)",
        "quantity": "number",
        "unit": "string (tsp, tbsp, cup, oz, lb, each, ml, g, etc.)",
        "preparation_notes": "string or null (e.g., 'finely diced', 'room temp')",
        "is_optional": false,
        "estimated": false,
        "category": "protein|produce|dairy|pantry|spice|oil|alcohol|baking|frozen|canned|fresh_herb|dry_herb|condiment|beverage|specialty|other",
        "allergen_flags": ["dairy", "gluten", etc.]
      }
    ],
    "yield_quantity": "number or null",
    "yield_unit": "string or null (servings, cups, etc.)",
    "yield_description": "string or null (e.g., 'Serves 4, makes about 2 cups')",
    "prep_time_minutes": "number or null",
    "cook_time_minutes": "number or null",
    "total_time_minutes": "number or null",
    "dietary_tags": ["string (e.g., 'gluten-free', 'dairy-free', 'vegan')"],
    "allergen_flags": ["string (aggregated from ingredients)"],
    "adaptations": "string or null",
    "notes": "string or null",
    "field_confidence": {"field_name": "confirmed|inferred|unknown"}
  },
  "confidence": "high|medium|low",
  "warnings": ["string"]
}`

/**
 * Parse a single recipe from natural language text
 */
export async function parseRecipeFromText(rawText: string): Promise<ParseResult<ParsedRecipe>> {
  const result = await parseWithAI(
    RECIPE_SYSTEM_PROMPT,
    rawText,
    ParsedRecipeSchema
  )
  return result
}
