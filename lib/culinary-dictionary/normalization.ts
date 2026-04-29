import pluralize from 'pluralize'

const ABBREVIATIONS: Record<string, string> = {
  evoo: 'extra virgin olive oil',
  'e v o o': 'extra virgin olive oil',
  'ap flour': 'all purpose flour',
  'a p flour': 'all purpose flour',
  ap: 'all purpose',
  tbsp: 'tablespoon',
  tsp: 'teaspoon',
  pkg: 'package',
  pkt: 'packet',
  lg: 'large',
  sm: 'small',
  med: 'medium',
  oz: 'ounce',
  lb: 'pound',
  lbs: 'pound',
  qt: 'quart',
  pt: 'pint',
  gal: 'gallon',
}

const ARTICLES = new Set(['a', 'an', 'the', 'of'])

export function normalizeCulinaryTerm(value: string): string {
  let result = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')

  result = result.replace(/[()]/g, ' ')
  result = result.replace(/[,.'"/]/g, ' ')
  result = result.replace(/-/g, ' ')
  result = result.replace(/&/g, ' and ')
  result = result.replace(/\s+/g, ' ').trim()

  for (const [abbr, expanded] of Object.entries(ABBREVIATIONS)) {
    const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), expanded)
  }

  const tokens = result.split(' ').filter((token) => token && !ARTICLES.has(token))
  const singularTokens = tokens.map((token) => {
    if (token.length <= 2) return token
    return pluralize.singular(token)
  })

  return singularTokens.join(' ').replace(/\s+/g, ' ').trim()
}

export function normalizeIngredientName(name: string): string {
  return normalizeCulinaryTerm(name)
}

export function normalizeDictionaryAlias(alias: string): string {
  return normalizeCulinaryTerm(alias)
}

export function slugifyCulinaryTerm(value: string): string {
  const normalized = normalizeCulinaryTerm(value)
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function isLikelyAliasMatch(query: string, alias: string): boolean {
  const normalizedQuery = normalizeCulinaryTerm(query)
  const normalizedAlias = normalizeCulinaryTerm(alias)
  if (!normalizedQuery || !normalizedAlias) return false
  return (
    normalizedAlias === normalizedQuery ||
    normalizedAlias.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedAlias)
  )
}
