// Prospecting Hub - Shared Fuzzy Matching Utilities
// Extracted for reuse across scrub, CSV import, and merge features.
// NOT a server action file - safe to export functions/constants.

/**
 * Normalize a business/prospect name for comparison.
 * Strips articles, apostrophes, non-alphanumeric chars, and collapses whitespace.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // strip leading articles
    .replace(/[''`]/g, '') // strip apostrophes/quotes
    .replace(/[^a-z0-9\s]/g, '') // strip all non-alphanumeric except spaces
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

/**
 * Normalize a city name for comparison.
 * Expands directional abbreviations (N. → north) and strips punctuation.
 */
export function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/^(north|south|east|west|n\.?|s\.?|e\.?|w\.?)\s*/i, (m) => {
      const abbrevMap: Record<string, string> = {
        n: 'north',
        'n.': 'north',
        s: 'south',
        's.': 'south',
        e: 'east',
        'e.': 'east',
        w: 'west',
        'w.': 'west',
      }
      const key = m.trim().toLowerCase()
      return (abbrevMap[key] ?? key) + ' '
    })
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Levenshtein edit distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Check if two names are "close enough" to be considered duplicates.
 * Uses normalized Levenshtein distance with 85% similarity threshold.
 */
export function isSimilarName(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na === nb) return true
  // One contains the other (e.g., "Hamptons Yacht Club" contains "Hamptons Yacht")
  if (na.includes(nb) || nb.includes(na)) return true
  // Levenshtein for short names - require exact match
  if (na.length < 5 || nb.length < 5) return na === nb
  const distance = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  return distance / maxLen < 0.15 // 85% similar
}
