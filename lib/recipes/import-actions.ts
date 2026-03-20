// Recipe Import from URL - Server Actions
// Fetches a recipe page, extracts schema.org/Recipe JSON-LD data,
// parses ingredients, and creates the recipe in the chef's collection.
// No AI needed: pure HTML parsing + regex.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { parseIngredientString } from './ingredient-parser'
import type { Database } from '@/types/database'

type RecipeCategory = Database['public']['Enums']['recipe_category']
type IngredientCategory = Database['public']['Enums']['ingredient_category']

// ============================================
// VALIDATION
// ============================================

const ImportUrlSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
})

// ============================================
// TYPES
// ============================================

export type ImportedRecipePreview = {
  name: string
  description: string | null
  category: string
  cuisine: string | null
  method: string
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  totalTimeMinutes: number | null
  yieldDescription: string | null
  imageUrl: string | null
  sourceUrl: string
  ingredients: Array<{
    raw: string
    parsed: {
      quantity: number | null
      unit: string | null
      name: string
      preparation: string | null
    }
  }>
}

export type ImportRecipeResult =
  | {
      success: true
      recipeId: string
      name: string
      ingredientCount: number
    }
  | {
      success: false
      error: string
    }

// ============================================
// ISO 8601 Duration Parser
// ============================================

/**
 * Parse ISO 8601 duration strings into minutes.
 * Handles: PT30M, PT1H30M, PT1H, PT90M, P0DT1H30M, etc.
 */
function parseIsoDuration(duration: string | undefined | null): number | null {
  if (!duration || typeof duration !== 'string') return null

  // Match hours and minutes from ISO 8601 duration
  const match = duration.match(/P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) {
    // Try plain number (some sites just put minutes as a number)
    const num = parseInt(duration, 10)
    if (!isNaN(num) && num > 0) return num
    return null
  }

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  // Ignore seconds for recipe purposes

  const total = hours * 60 + minutes
  return total > 0 ? total : null
}

// ============================================
// Recipe Category Mapping
// ============================================

const CATEGORY_MAP: Record<string, RecipeCategory> = {
  appetizer: 'appetizer',
  appetizers: 'appetizer',
  starter: 'appetizer',
  starters: 'appetizer',
  "hors d'oeuvre": 'appetizer',
  soup: 'soup',
  soups: 'soup',
  stew: 'soup',
  chowder: 'soup',
  salad: 'salad',
  salads: 'salad',
  bread: 'bread',
  breads: 'bread',
  baking: 'bread',
  pasta: 'pasta',
  noodles: 'pasta',
  noodle: 'pasta',
  dessert: 'dessert',
  desserts: 'dessert',
  cake: 'dessert',
  cookies: 'dessert',
  cookie: 'dessert',
  pie: 'dessert',
  pastry: 'dessert',
  sauce: 'sauce',
  sauces: 'sauce',
  dressing: 'sauce',
  dip: 'sauce',
  condiment: 'condiment',
  condiments: 'condiment',
  marinade: 'condiment',
  beverage: 'beverage',
  beverages: 'beverage',
  drink: 'beverage',
  drinks: 'beverage',
  cocktail: 'beverage',
  smoothie: 'beverage',
  'main course': 'protein',
  'main dish': 'protein',
  main: 'protein',
  entree: 'protein',
  dinner: 'protein',
  lunch: 'protein',
  breakfast: 'other',
  brunch: 'other',
  snack: 'other',
  'side dish': 'vegetable',
  side: 'vegetable',
  vegetable: 'vegetable',
  vegetables: 'vegetable',
}

function mapCategory(categories: string | string[] | undefined | null): RecipeCategory {
  if (!categories) return 'other'
  const cats = Array.isArray(categories) ? categories : [categories]

  for (const cat of cats) {
    const lower = cat.toLowerCase().trim()
    if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower]
    // Try partial matching
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
      if (lower.includes(key)) return value
    }
  }

  return 'other'
}

// ============================================
// JSON-LD Extraction
// ============================================

/**
 * Extract schema.org/Recipe JSON-LD from HTML.
 * Handles both single objects and arrays of objects.
 */
function extractRecipeJsonLd(html: string): Record<string, unknown> | null {
  // Find all JSON-LD script blocks
  const scriptPattern = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptPattern.exec(html)) !== null) {
    try {
      const jsonStr = match[1].trim()
      const parsed = JSON.parse(jsonStr)

      // Could be a single object or an array
      const candidates = Array.isArray(parsed) ? parsed : [parsed]

      for (const candidate of candidates) {
        // Direct Recipe type
        if (candidate['@type'] === 'Recipe') return candidate

        // Array of types (some sites use ["Recipe", "HowTo"])
        if (Array.isArray(candidate['@type']) && candidate['@type'].includes('Recipe')) {
          return candidate
        }

        // Nested in @graph (common with WordPress + Yoast)
        if (candidate['@graph'] && Array.isArray(candidate['@graph'])) {
          for (const node of candidate['@graph']) {
            if (node['@type'] === 'Recipe') return node
            if (Array.isArray(node['@type']) && node['@type'].includes('Recipe')) {
              return node
            }
          }
        }
      }
    } catch {
      // Invalid JSON, try next script block
      continue
    }
  }

  return null
}

/**
 * Extract instructions from the recipe JSON-LD.
 * recipeInstructions can be a string, an array of strings,
 * an array of HowToStep objects, or an array of HowToSection objects.
 */
function extractInstructions(instructions: unknown): string {
  if (!instructions) return ''

  // Simple string
  if (typeof instructions === 'string') {
    return instructions
      .replace(/<[^>]+>/g, '') // strip HTML tags
      .trim()
  }

  // Array
  if (Array.isArray(instructions)) {
    const steps: string[] = []

    for (let i = 0; i < instructions.length; i++) {
      const item = instructions[i]

      if (typeof item === 'string') {
        steps.push(`${i + 1}. ${item.replace(/<[^>]+>/g, '').trim()}`)
      } else if (item && typeof item === 'object') {
        // HowToStep
        if (item['@type'] === 'HowToStep' || item.text) {
          const text = (item.text || item.name || '').replace(/<[^>]+>/g, '').trim()
          if (text) steps.push(`${steps.length + 1}. ${text}`)
        }
        // HowToSection (grouped steps)
        else if (item['@type'] === 'HowToSection' && item.itemListElement) {
          if (item.name) steps.push(`\n${item.name}:`)
          const sectionSteps = extractInstructions(item.itemListElement)
          if (sectionSteps) steps.push(sectionSteps)
        }
      }
    }

    return steps.join('\n')
  }

  return ''
}

/**
 * Extract the image URL from recipe JSON-LD.
 * image can be a string, an array of strings, or an ImageObject.
 */
function extractImageUrl(image: unknown): string | null {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) {
    const first = image[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && first.url) return first.url as string
  }
  if (typeof image === 'object' && image !== null && 'url' in image) {
    return (image as Record<string, unknown>).url as string
  }
  return null
}

// ============================================
// FETCH + PARSE (Step 1: Preview)
// ============================================

/**
 * Fetch a URL and extract recipe data for preview.
 * Does NOT save anything to the database.
 */
export async function fetchRecipeFromUrl(
  url: string
): Promise<{ success: true; preview: ImportedRecipePreview } | { success: false; error: string }> {
  // Auth check (must be a chef)
  await requireChef()

  // Validate URL
  const parsed = ImportUrlSchema.safeParse({ url })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const validUrl = parsed.data.url

  // Fetch the page
  let html: string
  try {
    const response = await fetch(validUrl, {
      headers: {
        'User-Agent': 'ChefFlow Recipe Importer (https://cheflowhq.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Could not fetch the page (HTTP ${response.status}). Check the URL and try again.`,
      }
    }

    html = await response.text()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      return {
        success: false,
        error: 'The request timed out. The site may be slow or blocking automated access.',
      }
    }
    return {
      success: false,
      error: 'Could not reach that URL. Check your connection and try again.',
    }
  }

  // Extract JSON-LD
  const recipe = extractRecipeJsonLd(html)
  if (!recipe) {
    return {
      success: false,
      error:
        'No recipe data found on this page. The site may not include structured recipe data (schema.org/Recipe). Try a different recipe site.',
    }
  }

  // Parse recipe fields
  const name = ((recipe.name as string) || '').trim()
  if (!name) {
    return {
      success: false,
      error: 'Found recipe data but no recipe name. The page may have incomplete structured data.',
    }
  }

  const description = recipe.description
    ? String(recipe.description)
        .replace(/<[^>]+>/g, '')
        .trim()
    : null

  const rawIngredients: string[] = Array.isArray(recipe.recipeIngredient)
    ? (recipe.recipeIngredient as string[]).map((s) => String(s).trim()).filter(Boolean)
    : []

  const method = extractInstructions(recipe.recipeInstructions)
  const prepTimeMinutes = parseIsoDuration(recipe.prepTime as string)
  const cookTimeMinutes = parseIsoDuration(recipe.cookTime as string)
  const totalTimeMinutes = parseIsoDuration(recipe.totalTime as string)

  const recipeYield = recipe.recipeYield
  const yieldDescription = recipeYield
    ? Array.isArray(recipeYield)
      ? recipeYield[0]
      : String(recipeYield)
    : null

  const category = mapCategory(recipe.recipeCategory as string | string[])
  const cuisine = recipe.recipeCuisine
    ? Array.isArray(recipe.recipeCuisine)
      ? (recipe.recipeCuisine as string[]).join(', ')
      : String(recipe.recipeCuisine)
    : null

  const imageUrl = extractImageUrl(recipe.image)

  // Parse each ingredient string
  const ingredients = rawIngredients.map((raw) => ({
    raw,
    parsed: parseIngredientString(raw),
  }))

  return {
    success: true,
    preview: {
      name,
      description,
      category,
      cuisine,
      method,
      prepTimeMinutes,
      cookTimeMinutes,
      totalTimeMinutes,
      yieldDescription: yieldDescription ? String(yieldDescription) : null,
      imageUrl,
      sourceUrl: validUrl,
      ingredients,
    },
  }
}

// ============================================
// SAVE IMPORTED RECIPE (Step 2: Confirm)
// ============================================

/**
 * Save an imported recipe preview to the database.
 * Creates the recipe + finds or creates each ingredient + links them.
 */
export async function saveImportedRecipe(
  preview: ImportedRecipePreview
): Promise<ImportRecipeResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  try {
    // Create the recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        tenant_id: user.tenantId!,
        name: preview.name,
        category: preview.category as RecipeCategory,
        method: preview.method,
        description: preview.description || null,
        notes: preview.sourceUrl ? `Imported from: ${preview.sourceUrl}` : null,
        prep_time_minutes: preview.prepTimeMinutes || null,
        cook_time_minutes: preview.cookTimeMinutes || null,
        total_time_minutes: preview.totalTimeMinutes || null,
        yield_description: preview.yieldDescription || null,
        dietary_tags: [],
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id')
      .single()

    if (recipeError || !recipe) {
      console.error('[saveImportedRecipe] Recipe insert error:', recipeError)
      return { success: false, error: 'Failed to create recipe. Please try again.' }
    }

    // Add each ingredient
    let addedCount = 0
    for (let i = 0; i < preview.ingredients.length; i++) {
      const { parsed } = preview.ingredients[i]
      if (!parsed.name) continue

      try {
        // Find or create ingredient (case-insensitive)
        const ingredientId = await findOrCreateIngredientForImport(
          supabase,
          user.tenantId!,
          user.id,
          parsed.name
        )

        // Link to recipe
        await supabase.from('recipe_ingredients').insert({
          recipe_id: recipe.id,
          ingredient_id: ingredientId,
          quantity: parsed.quantity || 1,
          unit: parsed.unit || 'unit',
          preparation_notes: parsed.preparation || null,
          is_optional: false,
          sort_order: i,
        })

        addedCount++
      } catch (err) {
        // Non-blocking: log the failure but keep going with other ingredients
        console.error(`[saveImportedRecipe] Failed to add ingredient "${parsed.name}":`, err)
      }
    }

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${recipe.id}`)

    return {
      success: true,
      recipeId: recipe.id,
      name: preview.name,
      ingredientCount: addedCount,
    }
  } catch (err) {
    console.error('[saveImportedRecipe] Unexpected error:', err)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

// ============================================
// HELPER: Find or create ingredient
// ============================================

async function findOrCreateIngredientForImport(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  userId: string,
  name: string
): Promise<string> {
  // Normalize name: lowercase, trim
  const normalizedName = name.trim()

  // Case-insensitive lookup
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', normalizedName)
    .limit(1)
    .single()

  if (existing) return existing.id

  // Create new ingredient with "other" category (chef can categorize later)
  const { data: newIngredient, error } = await supabase
    .from('ingredients')
    .insert({
      tenant_id: tenantId,
      name: normalizedName,
      category: 'other' as IngredientCategory,
      default_unit: 'unit',
      dietary_tags: [],
      allergen_flags: [],
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error || !newIngredient) {
    throw new Error(`Failed to create ingredient "${normalizedName}"`)
  }

  return newIngredient.id
}
