// Recipe Photo Vision Parser
// Extracts structured recipe data from photographed recipe cards, printed pages, handwritten notes
// Uses Gemini vision (cloud) for image analysis.

// ⚠️ AI POLICY EXCEPTION: Vision processing
// Uses Gemini cloud because Ollama does not support vision models on our hardware (6GB VRAM).
// Recipe text (names, ingredients, methods) is the chef's IP but LOW-sensitivity compared to
// client PII. This is acceptable until a local vision model becomes viable.
// REVIEW WHEN: LLaVA or similar runs on Ollama with 6GB VRAM.

'use server'

import { GoogleGenAI } from '@google/genai'
import { ParsedRecipeSchema, type ParsedRecipe } from './parse-recipe-schema'
import type { ParseResult } from './parse'
import { log } from '@/lib/logger'

const MODEL = 'gemini-2.5-flash'

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
10. Track field_confidence for key fields: "confirmed" if clearly readable, "inferred" if you had to guess, "unknown" if not present

RESPOND WITH ONLY valid JSON (no markdown, no explanation):
{
  "parsed": {
    "name": "string (required - recipe title)",
    "category": "sauce|protein|starch|vegetable|fruit|dessert|bread|pasta|soup|salad|appetizer|condiment|beverage|other",
    "description": "string or null (brief description if apparent)",
    "method": "string (required - concise outcome-oriented steps)",
    "method_detailed": "string or null (full verbose version if the source has detailed instructions)",
    "ingredients": [
      {
        "name": "string (required)",
        "quantity": "number",
        "unit": "string (tsp, tbsp, cup, oz, lb, each, ml, g, etc.)",
        "preparation_notes": "string or null (e.g., 'finely diced', 'room temp')",
        "is_optional": false,
        "estimated": false,
        "category": "protein|produce|dairy|pantry|spice|oil|alcohol|baking|frozen|canned|fresh_herb|dry_herb|condiment|beverage|specialty|other",
        "allergen_flags": ["dairy", "gluten", "nuts", "shellfish", "eggs", "soy", "fish"]
      }
    ],
    "yield_quantity": "number or null",
    "yield_unit": "string or null (servings, cups, portions, etc.)",
    "yield_description": "string or null (e.g., 'Serves 4', 'Makes about 2 cups')",
    "prep_time_minutes": "number or null",
    "cook_time_minutes": "number or null",
    "total_time_minutes": "number or null",
    "dietary_tags": ["string (e.g., 'gluten-free', 'dairy-free', 'vegan', 'vegetarian', 'keto')"],
    "allergen_flags": ["string (aggregated from all ingredients)"],
    "adaptations": "string or null (any noted variations or substitutions visible)",
    "notes": "string or null (any additional notes visible on the card/page)",
    "field_confidence": {"field_name": "confirmed|inferred|unknown"}
  },
  "confidence": "high|medium|low",
  "warnings": ["string"]
}`

/**
 * Parse a recipe from a photographed image using Gemini vision.
 * Accepts base64-encoded image data.
 * Returns the same ParsedRecipe structure as parseRecipeFromText.
 */
export async function parseRecipeFromImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' = 'image/jpeg'
): Promise<ParseResult<ParsedRecipe>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Recipe photo import requires a Gemini API key.'
    )
  }

  const startTime = Date.now()
  log.ai.info('parseRecipeFromImage started', { context: { mediaType } })

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        inlineData: {
          mimeType: mediaType,
          data: imageBase64,
        },
      },
      {
        text: 'Extract the complete recipe from this photo. Return only valid JSON.',
      },
    ],
    config: { systemInstruction: RECIPE_VISION_PROMPT },
  })

  const rawText = response.text
  if (!rawText) {
    throw new Error('No response from vision parser. Try again with a clearer photo.')
  }

  // Parse JSON (handle potential markdown wrapping)
  let jsonStr = rawText.trim()
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('Vision parser returned invalid JSON. Please try again with a clearer photo.')
  }

  // Validate with the same schema used by text parser
  const zodResult = ParsedRecipeSchema.safeParse(parsed)
  if (!zodResult.success) {
    console.error('[parseRecipeFromImage] Validation errors:', zodResult.error.issues)
    throw new Error('Recipe extraction did not match expected format. Please try again.')
  }

  const durationMs = Date.now() - startTime
  log.ai.info('parseRecipeFromImage completed', { durationMs })

  return zodResult.data as ParseResult<ParsedRecipe>
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
