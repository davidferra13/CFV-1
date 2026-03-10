// Receipt-to-Ingredient Cost Sync
// Matches receipt line items to chef's ingredients using fuzzy string matching,
// then updates ingredient costs and cascades through recipes.
//
// Pipeline:
//   1. matchReceiptToIngredients() - fuzzy match receipt lines to ingredients
//   2. Chef reviews matches in UI (approve/reject/edit)
//   3. applyReceiptPrices() - update costs + cascade through recipes
//
// Uses deterministic matching only (no AI). Formula > AI.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type ReceiptLineItem = {
  id: string
  description: string
  priceCents: number | null
  ingredientCategory: string | null
}

export type IngredientMatch = {
  lineItemId: string
  lineItemDescription: string
  lineItemPriceCents: number | null
  matchedIngredientId: string | null
  matchedIngredientName: string | null
  matchedIngredientUnit: string | null
  currentCostCents: number | null
  confidence: number // 0-1 score
  affectedRecipeCount: number
}

export type ApplyMatchInput = {
  lineItemId: string
  ingredientId: string
  priceCents: number
  quantity: number // how many units were purchased at this price
}

// ============================================
// 1. MATCH RECEIPT LINE ITEMS TO INGREDIENTS
// ============================================

/**
 * Fuzzy-match receipt line items to the chef's ingredient library.
 * Returns matches with confidence scores. Chef reviews before applying.
 */
export async function matchReceiptToIngredients(
  receiptPhotoId: string
): Promise<IngredientMatch[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch receipt line items
  const { data: photo } = await supabase
    .from('receipt_photos')
    .select(
      `
      id,
      receipt_extractions(
        id,
        receipt_line_items(id, description, price_cents, ingredient_category)
      )
    `
    )
    .eq('id', receiptPhotoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!photo) throw new Error('Receipt not found')

  const extraction = (photo.receipt_extractions as any)?.[0]
  const lineItems: ReceiptLineItem[] = (extraction?.receipt_line_items ?? []).map((li: any) => ({
    id: li.id,
    description: li.description,
    priceCents: li.price_cents,
    ingredientCategory: li.ingredient_category,
  }))

  if (lineItems.length === 0) return []

  // Fetch chef's ingredient library
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, default_unit, cost_per_unit_cents, last_price_cents, category')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .order('name')

  if (!ingredients || ingredients.length === 0)
    return lineItems.map((li) => ({
      lineItemId: li.id,
      lineItemDescription: li.description,
      lineItemPriceCents: li.priceCents,
      matchedIngredientId: null,
      matchedIngredientName: null,
      matchedIngredientUnit: null,
      currentCostCents: null,
      confidence: 0,
      affectedRecipeCount: 0,
    }))

  // For each line item, find the best matching ingredient
  const matches: IngredientMatch[] = []

  for (const li of lineItems) {
    let bestMatch: {
      id: string
      name: string
      default_unit: string
      cost_per_unit_cents: number | null
      last_price_cents: number | null
    } | null = null
    let bestScore = 0

    const normalizedLine = normalizeText(li.description)

    for (const ing of ingredients) {
      const normalizedIng = normalizeText(ing.name)
      const score = computeMatchScore(normalizedLine, normalizedIng)

      if (score > bestScore && score >= 0.3) {
        bestScore = score
        bestMatch = ing
      }
    }

    // Count affected recipes if we have a match
    let affectedRecipeCount = 0
    if (bestMatch) {
      const { count } = await supabase
        .from('recipe_ingredients')
        .select('id', { count: 'exact', head: true })
        .eq('ingredient_id', bestMatch.id)

      affectedRecipeCount = count ?? 0
    }

    matches.push({
      lineItemId: li.id,
      lineItemDescription: li.description,
      lineItemPriceCents: li.priceCents,
      matchedIngredientId: bestMatch?.id ?? null,
      matchedIngredientName: bestMatch?.name ?? null,
      matchedIngredientUnit: bestMatch?.default_unit ?? null,
      currentCostCents: bestMatch?.cost_per_unit_cents ?? bestMatch?.last_price_cents ?? null,
      confidence: bestScore,
      affectedRecipeCount,
    })
  }

  return matches
}

// ============================================
// 2. APPLY RECEIPT PRICES
// ============================================

const ApplyMatchSchema = z.object({
  lineItemId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  priceCents: z.number().int().positive(),
  quantity: z.number().positive().default(1),
})

/**
 * Apply approved receipt price matches to ingredients.
 * Updates ingredient costs, logs to price history, and cascades through recipes.
 */
export async function applyReceiptPrices(
  matches: ApplyMatchInput[],
  receiptPhotoId: string,
  storeName?: string | null
): Promise<{
  ingredientsUpdated: number
  recipesAffected: number
  priceChanges: Array<{
    ingredientId: string
    ingredientName: string
    oldCostCents: number | null
    newCostCents: number
    recipesAffected: number
  }>
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const validatedMatches = matches.map((m) => ApplyMatchSchema.parse(m))

  const priceChanges: Array<{
    ingredientId: string
    ingredientName: string
    oldCostCents: number | null
    newCostCents: number
    recipesAffected: number
  }> = []

  let totalRecipesAffected = 0

  for (const match of validatedMatches) {
    // Fetch current ingredient
    const { data: ingredient } = await supabase
      .from('ingredients')
      .select('id, name, cost_per_unit_cents, last_price_cents')
      .eq('id', match.ingredientId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!ingredient) continue

    const pricePerUnit = Math.round(match.priceCents / match.quantity)
    const oldCost = ingredient.cost_per_unit_cents ?? ingredient.last_price_cents

    // Log to ingredient_price_history
    const { logIngredientPrice } = await import('@/lib/ingredients/pricing')
    try {
      await logIngredientPrice({
        ingredient_id: match.ingredientId,
        store_name: storeName ?? null,
        price_cents: match.priceCents,
        quantity: match.quantity,
        price_per_unit_cents: pricePerUnit,
        purchase_date: new Date().toISOString().split('T')[0],
      })
    } catch (err) {
      console.error('[applyReceiptPrices] Price log failed (non-blocking):', err)
    }

    // Cascade price change through recipes
    const { cascadeIngredientPriceChange } = await import('@/lib/costing/cascade-engine')
    try {
      const cascadeResult = await cascadeIngredientPriceChange(match.ingredientId, pricePerUnit)

      priceChanges.push({
        ingredientId: match.ingredientId,
        ingredientName: ingredient.name,
        oldCostCents: oldCost,
        newCostCents: pricePerUnit,
        recipesAffected: cascadeResult.recipesUpdated.length,
      })

      totalRecipesAffected += cascadeResult.recipesUpdated.length
    } catch (err) {
      console.error('[applyReceiptPrices] Cascade failed for ingredient', match.ingredientId, err)
      // Still count as updated even if cascade had issues
      priceChanges.push({
        ingredientId: match.ingredientId,
        ingredientName: ingredient.name,
        oldCostCents: oldCost,
        newCostCents: pricePerUnit,
        recipesAffected: 0,
      })
    }
  }

  revalidatePath('/recipes')
  revalidatePath('/receipts')
  revalidatePath('/ingredients')

  return {
    ingredientsUpdated: priceChanges.length,
    recipesAffected: totalRecipesAffected,
    priceChanges,
  }
}

// ============================================
// 3. GET RECEIPT MATCHES FOR REVIEW
// ============================================

/**
 * Convenience wrapper: fetch receipt, run matching, return matches
 * with store name for the review UI.
 */
export async function getReceiptMatchesForReview(receiptPhotoId: string): Promise<{
  storeName: string | null
  purchaseDate: string | null
  matches: IngredientMatch[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch store info
  const { data: photo } = await supabase
    .from('receipt_photos')
    .select(
      `
      id,
      receipt_extractions(store_name, purchase_date)
    `
    )
    .eq('id', receiptPhotoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const extraction = (photo?.receipt_extractions as any)?.[0]

  const matches = await matchReceiptToIngredients(receiptPhotoId)

  return {
    storeName: extraction?.store_name ?? null,
    purchaseDate: extraction?.purchase_date ?? null,
    matches,
  }
}

// ============================================
// FUZZY MATCHING HELPERS (deterministic, no AI)
// ============================================

/**
 * Normalize text for comparison: lowercase, remove punctuation,
 * strip common grocery receipt abbreviations.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(org|organic|fresh|frozen|lg|sm|med|bulk|bnls|skinless|boneless)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compute a match score between a receipt line item and an ingredient name.
 * Combines multiple strategies for robust matching:
 * - Exact substring match (highest weight)
 * - Word overlap (Jaccard similarity)
 * - Levenshtein-based similarity for short strings
 *
 * Returns 0-1 score.
 */
function computeMatchScore(receiptText: string, ingredientName: string): number {
  if (!receiptText || !ingredientName) return 0

  // Exact match
  if (receiptText === ingredientName) return 1.0

  // Substring containment
  if (receiptText.includes(ingredientName)) return 0.9
  if (ingredientName.includes(receiptText)) return 0.85

  // Word-level Jaccard similarity
  const receiptWords = new Set(receiptText.split(' ').filter((w) => w.length > 1))
  const ingredientWords = new Set(ingredientName.split(' ').filter((w) => w.length > 1))

  if (receiptWords.size === 0 || ingredientWords.size === 0) return 0

  let intersection = 0
  for (const word of receiptWords) {
    if (ingredientWords.has(word)) intersection++
    // Partial word match (e.g., "tomato" matches "tomatoes")
    else {
      for (const ingWord of ingredientWords) {
        if (
          (word.length >= 4 && ingWord.startsWith(word.slice(0, -1))) ||
          (ingWord.length >= 4 && word.startsWith(ingWord.slice(0, -1)))
        ) {
          intersection += 0.8
          break
        }
      }
    }
  }

  const union = receiptWords.size + ingredientWords.size - intersection
  const jaccard = union > 0 ? intersection / union : 0

  // Levenshtein for short strings (< 20 chars)
  let levenshteinScore = 0
  if (receiptText.length < 20 && ingredientName.length < 20) {
    const distance = levenshteinDistance(receiptText, ingredientName)
    const maxLen = Math.max(receiptText.length, ingredientName.length)
    levenshteinScore = maxLen > 0 ? 1 - distance / maxLen : 0
  }

  // Weighted combination
  return Math.max(jaccard * 0.7 + levenshteinScore * 0.3, jaccard)
}

/**
 * Classic Levenshtein distance. Kept simple since strings are short.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }

  return dp[m][n]
}
