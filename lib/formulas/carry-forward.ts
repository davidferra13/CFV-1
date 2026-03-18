// Carry-Forward Ingredient Matching - Deterministic Fuzzy String Match
// Matches leftover ingredients from previous events to upcoming event needs.
// Uses Levenshtein distance for fuzzy matching - the same algorithm that
// spell-checkers, search engines, and every autocomplete has used for 60 years.
//
// Reference: Vladimir Levenshtein, 1965 - "Binary codes capable of correcting
// deletions, insertions, and reversals"

// ── Types (match the AI version exactly) ───────────────────────────────────

export type CarryForwardMatch = {
  leftoverItem: string
  neededIngredient: string
  compatibilityScore: number // 0–100
  estimatedSavingsCents: number | null
  notes: string | null
  matchType: 'exact' | 'partial' | 'substitution'
}

export type CarryForwardMatchResult = {
  matches: CarryForwardMatch[]
  totalEstimatedSavingsCents: number
  summary: string
  confidence: 'high' | 'medium' | 'low'
}

// ── Input types ────────────────────────────────────────────────────────────

export type LeftoverItem = {
  ingredientName: string
  estimatedCostCents: number | null
  notes: string | null
  useByDate: string | null
}

// ── Levenshtein Distance ───────────────────────────────────────────────────

/**
 * Calculates the Levenshtein edit distance between two strings.
 * Time: O(n×m), Space: O(min(n,m)) - optimized single-row DP.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Ensure a is the shorter string (less memory)
  if (a.length > b.length) [a, b] = [b, a]

  const aLen = a.length
  const bLen = b.length
  let prev = new Array(aLen + 1)
  let curr = new Array(aLen + 1)

  for (let i = 0; i <= aLen; i++) prev[i] = i

  for (let j = 1; j <= bLen; j++) {
    curr[0] = j
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(
        prev[i] + 1, // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost // substitution
      )
    }
    ;[prev, curr] = [curr, prev]
  }

  return prev[aLen]
}

/**
 * Calculates similarity score (0–100) between two strings.
 * 100 = identical, 0 = completely different.
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 100
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100)
}

// ── Culinary Substitution Map ──────────────────────────────────────────────
// Common ingredient substitutions that chefs actually use.
// These are well-known culinary equivalences, not AI opinions.

const SUBSTITUTION_GROUPS: string[][] = [
  // Dairy fats
  ['butter', 'ghee', 'clarified butter'],
  // Cream family
  ['heavy cream', 'whipping cream', 'double cream', 'crème fraîche'],
  ['sour cream', 'crème fraîche', 'greek yogurt'],
  // Soft cheese
  ['ricotta', 'cottage cheese', 'mascarpone'],
  // Oils
  ['olive oil', 'extra virgin olive oil', 'evoo'],
  ['vegetable oil', 'canola oil', 'sunflower oil', 'grapeseed oil'],
  // Alliums
  ['onion', 'yellow onion', 'white onion', 'sweet onion'],
  ['shallot', 'red onion'],
  ['garlic', 'garlic cloves', 'fresh garlic'],
  // Citrus
  ['lemon', 'lemon juice'],
  ['lime', 'lime juice'],
  // Vinegars
  ['red wine vinegar', 'sherry vinegar'],
  ['rice vinegar', 'rice wine vinegar', 'seasoned rice vinegar'],
  // Stocks
  ['chicken stock', 'chicken broth'],
  ['beef stock', 'beef broth'],
  ['vegetable stock', 'vegetable broth'],
  // Pasta (shape substitutions)
  ['penne', 'rigatoni', 'ziti'],
  ['spaghetti', 'linguine', 'fettuccine'],
  // Italian cured meats
  ['pancetta', 'guanciale', 'bacon'],
  ['prosciutto', 'serrano ham', 'speck'],
  // Fresh herbs (common subs)
  ['parsley', 'flat leaf parsley', 'italian parsley'],
  ['cilantro', 'coriander', 'fresh coriander'],
  ['basil', 'fresh basil'],
  ['thyme', 'fresh thyme'],
  // Sugar
  ['sugar', 'granulated sugar', 'white sugar'],
  ['brown sugar', 'light brown sugar', 'dark brown sugar'],
  ['powdered sugar', 'confectioners sugar', 'icing sugar'],
  // Salt
  ['salt', 'kosher salt', 'sea salt', 'table salt'],
  // Flour
  ['flour', 'all purpose flour', 'ap flour', 'all-purpose flour'],
]

/**
 * Checks if two ingredients are known culinary substitutes.
 * Returns the group name if found, null otherwise.
 */
function findSubstitutionGroup(a: string, b: string): string | null {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()

  for (const group of SUBSTITUTION_GROUPS) {
    const aInGroup = group.some((item) => aLower.includes(item) || item.includes(aLower))
    const bInGroup = group.some((item) => bLower.includes(item) || item.includes(bLower))
    if (aInGroup && bInGroup) return group[0]
  }
  return null
}

// ── Matcher ────────────────────────────────────────────────────────────────

/**
 * Extracts the core ingredient name from a quantity string.
 * "2 cups heavy cream" → "heavy cream"
 * "500g chicken breast" → "chicken breast"
 */
function extractIngredientName(raw: string): string {
  return raw
    .replace(/^\d+\.?\d*\s*/g, '') // leading numbers
    .replace(
      /^(cups?|tbsp|tsp|oz|g|kg|lb|lbs|ml|l|qt|gal|pt|bunch|cloves?|heads?|stalks?|pieces?|slices?|cans?|jars?|bottles?|bags?|boxes?|packages?|pints?|quarts?|gallons?)\s+/i,
      ''
    ) // units
    .replace(/\s*\(.*?\)\s*/g, '') // parenthetical notes
    .trim()
}

/**
 * Matches leftover ingredients to needed ingredients.
 * Pure string matching - no AI, no network, deterministic.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function matchCarryForwardFormula(
  leftovers: LeftoverItem[],
  neededIngredients: string[]
): CarryForwardMatchResult {
  if (leftovers.length === 0) {
    return {
      matches: [],
      totalEstimatedSavingsCents: 0,
      summary: 'No reusable leftover ingredients available from recent events.',
      confidence: 'high',
    }
  }

  if (neededIngredients.length === 0) {
    return {
      matches: [],
      totalEstimatedSavingsCents: 0,
      summary: 'No recipe ingredients found for this event - add menu components with recipes.',
      confidence: 'low',
    }
  }

  const matches: CarryForwardMatch[] = []

  for (const leftover of leftovers) {
    const leftName = extractIngredientName(leftover.ingredientName).toLowerCase()
    if (!leftName) continue

    let bestMatch: CarryForwardMatch | null = null
    let bestScore = 0

    for (const needed of neededIngredients) {
      const neededName = extractIngredientName(needed).toLowerCase()
      if (!neededName) continue

      // 1. Exact match
      if (
        leftName === neededName ||
        leftName.includes(neededName) ||
        neededName.includes(leftName)
      ) {
        const score = leftName === neededName ? 100 : 90
        if (score > bestScore) {
          bestScore = score
          bestMatch = {
            leftoverItem: leftover.ingredientName,
            neededIngredient: needed,
            compatibilityScore: score,
            estimatedSavingsCents: leftover.estimatedCostCents,
            notes: leftover.useByDate ? `Use by: ${leftover.useByDate}` : null,
            matchType: 'exact',
          }
        }
        continue
      }

      // 2. Substitution check
      const subGroup = findSubstitutionGroup(leftName, neededName)
      if (subGroup) {
        const score = 70
        if (score > bestScore) {
          bestScore = score
          bestMatch = {
            leftoverItem: leftover.ingredientName,
            neededIngredient: needed,
            compatibilityScore: score,
            estimatedSavingsCents: leftover.estimatedCostCents,
            notes: `Culinary substitution (${subGroup} family).${leftover.useByDate ? ' Use by: ' + leftover.useByDate : ''}`,
            matchType: 'substitution',
          }
        }
        continue
      }

      // 3. Fuzzy match (Levenshtein)
      const sim = similarity(leftName, neededName)
      if (sim >= 70 && sim > bestScore) {
        bestScore = sim
        bestMatch = {
          leftoverItem: leftover.ingredientName,
          neededIngredient: needed,
          compatibilityScore: sim,
          estimatedSavingsCents: leftover.estimatedCostCents,
          notes: `Similar name (${sim}% match). Verify this is the same ingredient.${leftover.useByDate ? ' Use by: ' + leftover.useByDate : ''}`,
          matchType: 'partial',
        }
      }
    }

    if (bestMatch) {
      matches.push(bestMatch)
    }
  }

  // Sort by compatibility score descending
  matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

  const totalSavings = matches.reduce((sum, m) => sum + (m.estimatedSavingsCents ?? 0), 0)

  // Build summary
  let summary: string
  if (matches.length === 0) {
    summary = 'No matching ingredients found between leftovers and event needs.'
  } else {
    const exact = matches.filter((m) => m.matchType === 'exact').length
    const partial = matches.filter((m) => m.matchType === 'partial').length
    const subs = matches.filter((m) => m.matchType === 'substitution').length
    const parts: string[] = [
      `Found ${matches.length} potential match${matches.length > 1 ? 'es' : ''}`,
    ]
    if (exact > 0) parts.push(`${exact} exact`)
    if (subs > 0) parts.push(`${subs} substitution${subs > 1 ? 's' : ''}`)
    if (partial > 0) parts.push(`${partial} partial`)
    if (totalSavings > 0) {
      parts.push(`Estimated savings: $${(totalSavings / 100).toFixed(2)}`)
    }
    summary = parts.join('. ') + '.'
  }

  return {
    matches,
    totalEstimatedSavingsCents: totalSavings,
    summary,
    confidence: matches.some((m) => m.matchType === 'exact') ? 'high' : 'medium',
  }
}
