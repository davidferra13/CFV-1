/**
 * Fuzzy name matching for linking extracted entities to known clients/events.
 * No external dependencies - pure string similarity.
 */

/**
 * Normalize a name for comparison: lowercase, trim, remove punctuation, collapse spaces.
 */
function normalize(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Similarity score between 0 and 1.
 */
function similarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  return 1 - levenshtein(na, nb) / maxLen
}

/**
 * Token overlap score: what fraction of tokens in `query` appear in `candidate`.
 */
function tokenOverlap(query, candidate) {
  const qTokens = normalize(query).split(' ').filter(Boolean)
  const cTokens = normalize(candidate).split(' ').filter(Boolean)
  if (qTokens.length === 0) return 0
  const cSet = new Set(cTokens)
  const matches = qTokens.filter(t => cSet.has(t)).length
  return matches / qTokens.length
}

/**
 * Find the best match for a name in a list of candidates.
 * Returns { match, score, index } or null if no match above threshold.
 */
export function findBestMatch(query, candidates, threshold = 0.7) {
  if (!query || !candidates || candidates.length === 0) return null

  let bestScore = 0
  let bestIndex = -1

  for (let i = 0; i < candidates.length; i++) {
    const name = typeof candidates[i] === 'string' ? candidates[i] : candidates[i].name
    // Weighted combo: 60% string similarity, 40% token overlap
    const sim = similarity(query, name)
    const tok = tokenOverlap(query, name)
    const score = sim * 0.6 + tok * 0.4

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  if (bestScore < threshold) return null

  return {
    match: candidates[bestIndex],
    score: Math.round(bestScore * 100) / 100,
    index: bestIndex,
  }
}

/**
 * Group name variants that likely refer to the same person.
 * Returns arrays of grouped names.
 */
export function groupNameVariants(names, threshold = 0.75) {
  const groups = []
  const assigned = new Set()

  for (let i = 0; i < names.length; i++) {
    if (assigned.has(i)) continue

    const group = [names[i]]
    assigned.add(i)

    for (let j = i + 1; j < names.length; j++) {
      if (assigned.has(j)) continue
      const sim = similarity(names[i], names[j])
      if (sim >= threshold) {
        group.push(names[j])
        assigned.add(j)
      }
    }

    groups.push(group)
  }

  return groups
}
