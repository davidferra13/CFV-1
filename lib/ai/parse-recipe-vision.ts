// Recipe Photo Vision Parser
// Extracts structured recipe data from photographed recipe cards, printed pages, handwritten notes
// Uses Gemma 4 native vision via Ollama. Fully local, no cloud dependency.
// Recipe text is chef IP - local processing preserves privacy.

'use server'

import { parseWithOllama } from '@/lib/ai/parse-ollama'
import { ParsedRecipeSchema, type ParsedRecipe } from './parse-recipe-schema'
import type { ParseResult } from './parse'
import { log } from '@/lib/logger'

const RECIPE_VISION_PROMPT = `You are a recipe extraction specialist for a professional private chef's recipe management system.

You receive photos of recipe cards, printed recipes, handwritten notes, cookbook pages, or screenshots of recipes. Extract the complete recipe into structured JSON.

This is for a PROFESSIONAL CHEF. The method should be concise (outcomes, not basic instructions). The chef knows HOW to cook; they need to remember WHAT to do.

RULES:
1. Extract EVERYTHING visible: recipe name, all ingredients with quantities, full method/instructions
2. For handwritten recipes: do your best to decipher handwriting. Flag uncertain readings in warnings
3. For printed recipes: extract verbatim, then normalize
4. Normalize ingredient quantities: "a splash of" = 1 tsp (estimated), "a handful" = 0.25 cup (estimated), "a pinch" = 0.125 tsp (estimated)
5. Auto-detect allergens from ingredients: dairy products = "dairy", nuts = "nuts", wheat flour = "gluten", shellfish = "shellfish", eggs = "eggs", soy = "soy"
6. Category must be one of: sauce, protein, starch, vegetable, fruit, dessert, bread, pasta, soup, salad, appetizer, condiment, beverage, other
7. Ingredient category must be one of: protein, produce, dairy, pantry, spice, oil, alcohol, baking, frozen, canned, fresh_herb, dry_herb, condiment, beverage, specialty, other
8. If multiple recipes are on one page, extract ONLY the most prominent one. Note others in warnings.
9. If the photo is blurry or hard to read, set confidence to "low" and list what you couldn't read in warnings
10. Track field_confidence for key fields: "confirmed" if clearly readable, "inferred" if you had to guess, "unknown" if not present`

/**
 * Parse a recipe from a photographed image using Gemma 4 native vision.
 * Accepts base64-encoded image data.
 * Returns the same ParsedRecipe structure as parseRecipeFromText.
 */
export async function parseRecipeFromImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' = 'image/jpeg'
): Promise<ParseResult<ParsedRecipe>> {
  const startTime = Date.now()
  log.ai.info('parseRecipeFromImage started', { context: { mediaType } })

  const result = await parseWithOllama(
    RECIPE_VISION_PROMPT,
    'Extract the complete recipe from this photo. Return only valid JSON.',
    ParsedRecipeSchema,
    {
      images: [imageBase64],
      maxTokens: 2048,
      timeoutMs: 30_000,
    }
  )

  const durationMs = Date.now() - startTime
  log.ai.info('parseRecipeFromImage completed', { durationMs })

  // parseWithOllama returns ParsedRecipe directly; wrap in ParseResult for callers
  return {
    parsed: result,
    confidence: 'high',
    warnings: [],
  } as unknown as ParseResult<ParsedRecipe>
}

/**
 * Parse multiple recipe photos in sequence.
 * Returns results for each image (success or error).
 */
export async function parseRecipePhotoBatch(
  images: {
    base64: string
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic'
    filename: string
  }[]
): Promise<{
  results: {
    filename: string
    success: boolean
    recipe?: ParseResult<ParsedRecipe>
    error?: string
  }[]
}> {
  const results: {
    filename: string
    success: boolean
    recipe?: ParseResult<ParsedRecipe>
    error?: string
  }[] = []

  for (const image of images) {
    try {
      const recipe = await parseRecipeFromImage(image.base64, image.mediaType)
      results.push({ filename: image.filename, success: true, recipe })
    } catch (err) {
      results.push({
        filename: image.filename,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown parsing error',
      })
    }
  }

  return { results }
}
