// Edamam Nutrition Analysis API - allergen detection + nutrition data
// https://developer.edamam.com/edamam-nutrition-api
// Free tier: 10K calls/month. Results cached in Upstash (30 days) to stay well under limit.
//
// This module uses Edamam's STRUCTURED allergen/health labels - not AI interpretation.
// Formula > AI: the API returns definitive caution flags, we surface them directly.

import { cacheGet, cacheSet } from '@/lib/cache/upstash'

// ── Types ────────────────────────────────────────────────────────────────────

export type EdamamNutritionResult = {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  allergens: string[]
  healthLabels: string[]
  cautions: string[]
}

// The 14 major allergens recognized by FDA/EU food labeling laws
const MAJOR_ALLERGEN_HEALTH_LABELS: Record<string, string> = {
  PEANUT_FREE: 'Peanuts',
  TREE_NUT_FREE: 'Tree Nuts',
  DAIRY_FREE: 'Dairy',
  EGG_FREE: 'Eggs',
  GLUTEN_FREE: 'Gluten',
  WHEAT_FREE: 'Wheat',
  SOY_FREE: 'Soy',
  FISH_FREE: 'Fish',
  SHELLFISH_FREE: 'Shellfish',
  CELERY_FREE: 'Celery',
  MUSTARD_FREE: 'Mustard',
  SESAME_FREE: 'Sesame',
  LUPINE_FREE: 'Lupine',
  MOLLUSK_FREE: 'Mollusks',
  CRUSTACEAN_FREE: 'Crustaceans',
  SULFITE_FREE: 'Sulfites',
}

// Friendly names for caution labels from the API
const CAUTION_LABELS: Record<string, string> = {
  GLUTEN: 'Gluten',
  WHEAT: 'Wheat',
  EGGS: 'Eggs',
  MILK: 'Dairy',
  PEANUTS: 'Peanuts',
  TREE_NUTS: 'Tree Nuts',
  SOY: 'Soy',
  FISH: 'Fish',
  SHELLFISH: 'Shellfish',
  SULFITES: 'Sulfites',
  FODMAP: 'FODMAPs',
}

// ── Structured result type ───────────────────────────────────────────────────

export type EdamamResult = {
  data: EdamamNutritionResult | null
  error: string | null
}

// ── API Call ──────────────────────────────────────────────────────────────────

/**
 * Analyze a list of ingredient lines via Edamam Nutrition Analysis API.
 * Returns { data, error } so callers can distinguish "no allergens" from "API failed."
 * SAFETY: returning null used to hide allergens when API was down.
 */
export async function analyzeRecipe(ingredientLines: string[]): Promise<EdamamResult> {
  const appId = process.env.EDAMAM_APP_ID
  const appKey = process.env.EDAMAM_APP_KEY

  if (!appId || !appKey) {
    return { data: null, error: 'Edamam API keys not configured' }
  }

  if (ingredientLines.length === 0) {
    return { data: null, error: null }
  }

  // Build a deterministic cache key from sorted ingredients
  const cacheKey = `edamam:nutrition:${hashIngredients(ingredientLines)}`

  // Check Upstash cache first (30-day TTL)
  try {
    const cached = await cacheGet<EdamamNutritionResult>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }
  } catch {
    // Cache miss is fine - proceed to API call
  }

  // Call Edamam
  try {
    const url = `https://api.edamam.com/api/nutrition-details?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingr: ingredientLines }),
    })

    if (!response.ok) {
      console.error(`[edamam] HTTP ${response.status}: ${response.statusText}`)
      return { data: null, error: `Edamam API returned ${response.status}` }
    }

    const data = await response.json()

    // Extract nutrition totals from the response
    const calories = Math.round(data.calories ?? 0)
    const protein = Math.round((data.totalNutrients?.PROCNT?.quantity ?? 0) * 10) / 10
    const fat = Math.round((data.totalNutrients?.FAT?.quantity ?? 0) * 10) / 10
    const carbs = Math.round((data.totalNutrients?.CHOCDF?.quantity ?? 0) * 10) / 10
    const fiber = Math.round((data.totalNutrients?.FIBTG?.quantity ?? 0) * 10) / 10

    // Extract health labels from the response (e.g., "VEGAN", "GLUTEN_FREE", "PEANUT_FREE")
    const rawHealthLabels: string[] = data.healthLabels ?? []
    const rawCautions: string[] = data.cautions ?? []

    // Derive allergens: if a *_FREE label is ABSENT, the recipe CONTAINS that allergen
    const allergens = deriveAllergens(rawHealthLabels, rawCautions)

    // Format cautions into friendly names
    const cautions = rawCautions.map((c) => CAUTION_LABELS[c] || formatLabel(c))

    // Format positive health labels (only the useful ones, skip the *_FREE flags)
    const healthLabels = rawHealthLabels
      .filter((label) => !label.endsWith('_FREE'))
      .map(formatLabel)

    const result: EdamamNutritionResult = {
      calories,
      protein,
      fat,
      carbs,
      fiber,
      allergens,
      healthLabels,
      cautions,
    }

    // Cache for 30 days (2,592,000 seconds)
    try {
      await cacheSet(cacheKey, result, 30 * 24 * 60 * 60)
    } catch {
      // Cache write failed - result still returned
    }

    return { data: result, error: null }
  } catch (err) {
    console.error('[edamam] API call failed:', err)
    return { data: null, error: 'Edamam service unreachable' }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive allergens from Edamam health labels.
 * Logic: if a *_FREE label is ABSENT from the health labels, the recipe contains that allergen.
 * Also includes any explicit caution flags.
 */
function deriveAllergens(healthLabels: string[], cautions: string[]): string[] {
  const healthLabelSet = new Set(healthLabels)
  const allergens: string[] = []

  // Check each major allergen - if the *_FREE label is missing, it's present
  for (const [freeLabel, allergenName] of Object.entries(MAJOR_ALLERGEN_HEALTH_LABELS)) {
    if (!healthLabelSet.has(freeLabel)) {
      allergens.push(allergenName)
    }
  }

  // Add any caution labels not already covered
  for (const caution of cautions) {
    const friendlyName = CAUTION_LABELS[caution] || formatLabel(caution)
    if (!allergens.includes(friendlyName)) {
      allergens.push(friendlyName)
    }
  }

  return allergens
}

/**
 * Convert API label format to human-readable.
 * e.g. "TREE_NUT_FREE" → "Tree Nut Free", "VEGAN" → "Vegan"
 */
function formatLabel(label: string): string {
  return label
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Create a deterministic hash from ingredient lines for cache key.
 * Simple string hash - doesn't need to be cryptographic, just consistent.
 */
function hashIngredients(ingredients: string[]): string {
  const normalized = ingredients
    .map((i) => i.toLowerCase().trim())
    .sort()
    .join('|')

  // Simple FNV-1a 32-bit hash
  let hash = 0x811c9dc5
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(36)
}
