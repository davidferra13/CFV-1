/**
 * PIE Fuzzy Match Engine
 *
 * Closes the last ~5% coverage gap by matching naked ingredients against
 * Pi's 7.8M product names using token overlap scoring + Levenshtein distance.
 *
 * Strategy:
 *   1. Normalize both query and candidate names
 *   2. Token overlap: what % of query tokens appear in candidate?
 *   3. Levenshtein: how close are the best-matching tokens?
 *   4. Combined weighted score with category bonus
 *
 * Designed to run as a batch process against Pi bridge search endpoint,
 * or locally against a pre-fetched product name list.
 *
 * NOT a 'use server' file. Called by /pie-ratchet and census expansion.
 */

import { normalizeIngredientName } from './ingredient-matching-utils'
import { searchIngredients } from './pi-bridge'
import { getCanonicalName } from './name-normalizer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FuzzyMatchCandidate {
  id: string
  name: string
  normalizedName: string
  category: string | null
  score: number
  breakdown: {
    tokenOverlap: number
    levenshtein: number
    categoryBonus: number
    lengthPenalty: number
  }
}

export interface FuzzyMatchResult {
  ingredientId: string
  ingredientName: string
  bestMatch: FuzzyMatchCandidate | null
  alternatives: FuzzyMatchCandidate[]
  matchedAboveThreshold: boolean
  score: number
}

export interface FuzzyBatchResult {
  processed: number
  matched: number
  unmatched: number
  results: FuzzyMatchResult[]
  durationMs: number
}

// ---------------------------------------------------------------------------
// Levenshtein Distance (optimized single-row)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Use shorter string as "column" for memory efficiency
  if (a.length > b.length) [a, b] = [b, a]

  const row = Array.from({ length: a.length + 1 }, (_, i) => i)

  for (let j = 1; j <= b.length; j++) {
    let prev = row[0]
    row[0] = j
    for (let i = 1; i <= a.length; i++) {
      const curr = row[i]
      row[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[i], row[i - 1])
      prev = curr
    }
  }

  return row[a.length]
}

/**
 * Normalized Levenshtein similarity (0-1, higher = more similar)
 */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// ---------------------------------------------------------------------------
// Token Overlap Scoring
// ---------------------------------------------------------------------------

/**
 * Score how well query tokens appear in candidate tokens.
 * Returns 0-1 representing what fraction of meaningful query tokens match.
 */
function tokenOverlapScore(queryTokens: string[], candidateTokens: string[]): number {
  if (queryTokens.length === 0) return 0

  let matchedWeight = 0
  let totalWeight = 0

  for (const qt of queryTokens) {
    // Weight longer tokens more (they're more specific)
    const weight = Math.max(1, qt.length / 3)
    totalWeight += weight

    // Exact match
    if (candidateTokens.includes(qt)) {
      matchedWeight += weight
      continue
    }

    // Fuzzy match: find best Levenshtein similarity among candidate tokens
    let bestSim = 0
    for (const ct of candidateTokens) {
      // Skip tokens that are wildly different lengths
      if (Math.abs(ct.length - qt.length) > Math.max(qt.length, ct.length) * 0.5) continue
      const sim = levenshteinSimilarity(qt, ct)
      if (sim > bestSim) bestSim = sim
    }

    // Only count if similarity is > 0.7 (e.g., "chicken" vs "chickn")
    if (bestSim > 0.7) {
      matchedWeight += weight * bestSim
    }
  }

  return totalWeight > 0 ? matchedWeight / totalWeight : 0
}

// ---------------------------------------------------------------------------
// Combined Scoring
// ---------------------------------------------------------------------------

const WEIGHTS = {
  tokenOverlap: 0.55,
  levenshtein: 0.3,
  categoryBonus: 0.1,
  lengthPenalty: 0.05,
}

const MATCH_THRESHOLD = 0.65

/**
 * Score a single candidate against a query ingredient.
 */
function scoreCandidate(
  queryNorm: string,
  queryTokens: string[],
  candidateName: string,
  candidateCategory: string | null,
  queryCategory: string | null
): { score: number; breakdown: FuzzyMatchCandidate['breakdown'] } {
  const candNorm = normalizeIngredientName(candidateName)
  const candTokens = candNorm.split(' ').filter(Boolean)

  // Token overlap (bidirectional average)
  const overlapForward = tokenOverlapScore(queryTokens, candTokens)
  const overlapReverse = tokenOverlapScore(candTokens, queryTokens)
  const tokenOverlap = (overlapForward * 2 + overlapReverse) / 3

  // Full-string Levenshtein similarity
  const levSim = levenshteinSimilarity(queryNorm, candNorm)

  // Category bonus: same category = boost
  const categoryBonus =
    queryCategory && candidateCategory && queryCategory === candidateCategory ? 1 : 0

  // Length penalty: very different lengths = likely wrong match
  const lenRatio =
    Math.min(queryNorm.length, candNorm.length) / Math.max(queryNorm.length, candNorm.length)
  const lengthPenalty = lenRatio // 1 = same length, 0 = wildly different

  const score =
    tokenOverlap * WEIGHTS.tokenOverlap +
    levSim * WEIGHTS.levenshtein +
    categoryBonus * WEIGHTS.categoryBonus +
    lengthPenalty * WEIGHTS.lengthPenalty

  return {
    score,
    breakdown: { tokenOverlap, levenshtein: levSim, categoryBonus, lengthPenalty },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fuzzy match a single ingredient name against Pi's product database.
 * Uses Pi bridge /search endpoint for candidates, then scores locally.
 */
export async function fuzzyMatchIngredient(
  ingredientName: string,
  ingredientId: string,
  category: string | null
): Promise<FuzzyMatchResult> {
  const normalized = normalizeIngredientName(ingredientName)
  const alsoNormalized = getCanonicalName(ingredientName)
  const queryTokens = normalized.split(' ').filter(Boolean)

  // Get candidates from Pi bridge search
  const candidates = await searchIngredients(normalized, 30)

  // Also search the alternate normalization if different
  let extraCandidates: typeof candidates = null
  if (alsoNormalized !== normalized) {
    extraCandidates = await searchIngredients(alsoNormalized, 20)
  }

  // Merge and deduplicate candidates
  const allCandidates = candidates || []
  if (extraCandidates) {
    const existingIds = new Set(allCandidates.map((c) => c.id))
    for (const ec of extraCandidates) {
      if (!existingIds.has(ec.id)) allCandidates.push(ec)
    }
  }

  if (allCandidates.length === 0) {
    return {
      ingredientId,
      ingredientName,
      bestMatch: null,
      alternatives: [],
      matchedAboveThreshold: false,
      score: 0,
    }
  }

  // Score all candidates
  const scored: FuzzyMatchCandidate[] = allCandidates.map((c) => {
    const { score, breakdown } = scoreCandidate(
      normalized,
      queryTokens,
      c.name,
      c.category,
      category
    )
    return {
      id: c.id,
      name: c.name,
      normalizedName: normalizeIngredientName(c.name),
      category: c.category,
      score,
      breakdown,
    }
  })

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  const bestMatch = scored[0] || null
  const matchedAboveThreshold = bestMatch !== null && bestMatch.score >= MATCH_THRESHOLD

  return {
    ingredientId,
    ingredientName,
    bestMatch: matchedAboveThreshold ? bestMatch : null,
    alternatives: scored.slice(0, 5),
    matchedAboveThreshold,
    score: bestMatch?.score ?? 0,
  }
}

/**
 * Batch fuzzy match naked ingredients against Pi products.
 * Processes sequentially to avoid overwhelming Pi bridge.
 *
 * @param ingredients - Array of { id, name, category } for naked ingredients
 * @param concurrency - Max parallel Pi queries (default 3)
 */
export async function fuzzyMatchBatch(
  ingredients: Array<{ id: string; name: string; category: string | null }>,
  concurrency = 3
): Promise<FuzzyBatchResult> {
  const start = Date.now()
  const results: FuzzyMatchResult[] = []

  // Process in chunks for controlled concurrency
  for (let i = 0; i < ingredients.length; i += concurrency) {
    const chunk = ingredients.slice(i, i + concurrency)
    const chunkResults = await Promise.all(
      chunk.map((ing) => fuzzyMatchIngredient(ing.name, ing.id, ing.category))
    )
    results.push(...chunkResults)
  }

  const matched = results.filter((r) => r.matchedAboveThreshold).length

  return {
    processed: results.length,
    matched,
    unmatched: results.length - matched,
    results,
    durationMs: Date.now() - start,
  }
}

/**
 * Run fuzzy matching on all naked ingredients in the census.
 * This is the main entry point for /pie-ratchet when coverage gap is the priority.
 *
 * Queries PostgreSQL for naked food ingredients, runs fuzzy match against Pi,
 * and returns matches above threshold for chef approval (PIE Law: chef approves matches).
 */
export async function matchNakedIngredients(opts?: {
  limit?: number
  minScore?: number
}): Promise<FuzzyBatchResult> {
  const { pgClient: sql } = await import('@/lib/db')
  const limit = opts?.limit ?? 100
  const minScore = opts?.minScore ?? MATCH_THRESHOLD

  // Get naked food ingredients (no price at all)
  const rows = await sql`
    SELECT si.id, si.name, si.category
    FROM system_ingredients si
    LEFT JOIN ingredient_prices ip ON ip.system_ingredient_id = si.id
    WHERE ip.id IS NULL
      AND si.category IN (
        'protein', 'seafood', 'produce', 'dairy', 'grain', 'spice', 'herb',
        'oil', 'condiment', 'baking', 'canned', 'frozen', 'beverage',
        'snack', 'pasta', 'bread', 'nut', 'seed', 'legume', 'sweetener',
        'vinegar', 'sauce', 'ethnic'
      )
    ORDER BY si.name
    LIMIT ${limit}
  `

  const batch = await fuzzyMatchBatch(
    rows.map((r: any) => ({ id: r.id, name: r.name, category: r.category }))
  )

  // Filter results to only those above threshold
  batch.results = batch.results.filter((r) => r.score >= minScore)
  batch.matched = batch.results.filter((r) => r.matchedAboveThreshold).length

  return batch
}
