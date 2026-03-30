/**
 * Ingredient Name Normalizer
 * Pure function: no database, no auth, no side effects.
 * Used by Pi sync and recipe matching to improve match rates.
 */

/**
 * Normalize an ingredient name for matching purposes.
 * Strips common prefixes, parenthetical qualifiers, and brand suffixes
 * to produce a clean canonical name for comparison.
 *
 * Examples:
 *   "Fresh Organic Cilantro (chopped)" -> "cilantro"
 *   "Homemade Chicken Stock" -> "chicken stock"
 *   "Large Yellow Onion" -> "yellow onion"
 *   "Frozen Sweet Corn Kernels" -> "sweet corn kernels"
 */
export function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase().trim()

  // Strip common prefixes that don't affect identity
  // Run multiple passes since names can stack prefixes ("fresh organic large...")
  const prefixPattern =
    /^(fresh|organic|homemade|dried|frozen|canned|raw|cooked|roasted|grilled|steamed|boiled|fried|baked|smoked|pickled|marinated|minced|diced|chopped|sliced|shredded|grated|crushed|ground|whole|large|medium|small|extra|fine|coarse|thick|thin|boneless|skinless|trimmed|peeled|deveined|pitted|seeded|hulled|toasted|blanched|unsweetened|sweetened|salted|unsalted)\s+/
  // Apply up to 5 times to strip stacked prefixes
  for (let i = 0; i < 5; i++) {
    const stripped = n.replace(prefixPattern, '')
    if (stripped === n) break
    n = stripped
  }

  // Strip parenthetical qualifiers: "cilantro (fresh)" -> "cilantro"
  n = n.replace(/\s*\([^)]*\)\s*/g, ' ')

  // Normalize whitespace
  n = n.replace(/\s+/g, ' ').trim()

  // Strip trailing brand/qualifier clauses: "flour, store brand" -> "flour"
  n = n.replace(/,\s*(brand|store|generic|organic|local|imported|domestic).*$/i, '')

  return n.trim()
}
