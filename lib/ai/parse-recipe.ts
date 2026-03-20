// Recipe Smart Import Parser
// Extracts structured recipe data from natural language text

'use server'

import { parseWithOllama } from './parse-ollama'
import type { ParseResult } from './parse'
import { ParsedRecipeSchema, type ParsedRecipe, type ParsedIngredient } from './parse-recipe-schema'
import { log } from '@/lib/logger'

// ParsedRecipeSchema, ParsedRecipe, and ParsedIngredient are defined in ./parse-recipe-schema (no 'use server').
// Re-export the TYPES only for consumers that import from this file.
export type { ParsedRecipe, ParsedIngredient } from './parse-recipe-schema'

const RECIPE_SYSTEM_PROMPT = `You are a data extraction assistant for a private chef's recipe management system. Your job is to parse natural language recipe descriptions into structured JSON.

This is for a PROFESSIONAL CHEF - the method should be concise (outcomes, not basic instructions). The chef knows HOW to cook; they need to remember WHAT to do.

RULES:
- Extract the recipe name, category, ingredients, and method.
- For ingredients: normalize quantities where possible. "Splash of worcestershire" → quantity: 1, unit: "tsp", name: "worcestershire sauce", estimated: true. "A squeeze of lemon" → quantity: 0.5, unit: "each", name: "lemon", estimated: true.
- Auto-detect allergens from ingredients: dairy products → "dairy", nuts → "nuts", wheat flour → "gluten", shellfish → "shellfish", etc.
- Category must be one of: sauce, protein, starch, vegetable, fruit, dessert, bread, pasta, soup, salad, appetizer, condiment, beverage, other
- Ingredient category must be one of: protein, produce, dairy, pantry, spice, oil, alcohol, baking, frozen, canned, fresh_herb, dry_herb, condiment, beverage, specialty, other
- Method should be concise - steps as brief outcome-oriented sentences.
- method_detailed can include more detail if the input is verbose.
- If yield is mentioned ("serves 4", "makes 2 cups"), capture it.
- Times are often not stated - mark as null if not mentioned.
- Track field_confidence for key fields.

EXAMPLE:

Input: "Pan Seared Salmon with Lemon Butter\nSalmon filets, salt & pepper, splash of olive oil. Get a nice sear in a hot pan 3 min each side. Finish with butter, squeeze of lemon, handful of capers. Serves 2."
Output: { "parsed": { "name": "Pan Seared Salmon with Lemon Butter", "category": "protein", "description": "Pan-seared salmon finished with lemon butter and capers", "method": "Season filets. Sear in hot oiled pan 3 min/side. Finish with butter, lemon juice, and capers.", "method_detailed": null, "ingredients": [ { "name": "salmon filet", "quantity": 2, "unit": "each", "preparation_notes": null, "is_optional": false, "estimated": false, "category": "protein", "allergen_flags": ["fish"] }, { "name": "olive oil", "quantity": 1, "unit": "tbsp", "preparation_notes": null, "is_optional": false, "estimated": true, "category": "oil", "allergen_flags": [] }, { "name": "unsalted butter", "quantity": 2, "unit": "tbsp", "preparation_notes": null, "is_optional": false, "estimated": true, "category": "dairy", "allergen_flags": ["dairy"] }, { "name": "lemon", "quantity": 0.5, "unit": "each", "preparation_notes": "juiced", "is_optional": false, "estimated": true, "category": "produce", "allergen_flags": [] }, { "name": "capers", "quantity": 1, "unit": "tbsp", "preparation_notes": null, "is_optional": false, "estimated": true, "category": "condiment", "allergen_flags": [] } ], "yield_quantity": 2, "yield_unit": "servings", "yield_description": "Serves 2", "prep_time_minutes": null, "cook_time_minutes": null, "total_time_minutes": null, "dietary_tags": [], "allergen_flags": ["fish", "dairy"], "adaptations": null, "notes": null, "field_confidence": { "name": "confirmed", "category": "inferred", "method": "confirmed", "ingredients": "inferred" } }, "confidence": "high", "warnings": ["Quantities estimated from informal descriptions ('splash', 'squeeze', 'handful')"] }

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
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Cannot parse an empty recipe. Please provide recipe text.')
  }

  const startTime = Date.now()
  log.ai.info('parseRecipeFromText started', { context: { inputLength: rawText.length } })

  const result = await parseWithOllama(RECIPE_SYSTEM_PROMPT, rawText, ParsedRecipeSchema, {
    modelTier: 'standard',
    timeoutMs: 60_000,
  })

  log.ai.info('parseRecipeFromText completed', { durationMs: Date.now() - startTime })
  // parseWithOllama returns T directly; wrap in ParseResult for callers
  return result as ParseResult<ParsedRecipe>
}
