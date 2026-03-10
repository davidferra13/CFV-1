import { ALL_ALLERGENS, FDA_BIG_9 } from '@/lib/constants/allergens'

const ALLERGEN_ORDER = new Map(ALL_ALLERGENS.map((label, index) => [label, index]))

const ALLERGEN_ALIASES: Record<string, string> = {
  alcohol: 'Alcohol',
  avocado: 'Avocado',
  celery: 'Celery',
  citrus: 'Citrus',
  coconut: 'Coconut',
  corn: 'Corn',
  'crustacean shellfish': 'Crustacean shellfish',
  crustacean: 'Crustacean shellfish',
  shellfish: 'Crustacean shellfish',
  crab: 'Crustacean shellfish',
  lobster: 'Crustacean shellfish',
  shrimp: 'Crustacean shellfish',
  prawn: 'Crustacean shellfish',
  dairy: 'Milk',
  milk: 'Milk',
  egg: 'Eggs',
  eggs: 'Eggs',
  fish: 'Fish',
  gluten: 'Gluten',
  garlic: 'Garlic',
  lupin: 'Lupin',
  mollusk: 'Mollusks',
  mollusks: 'Mollusks',
  mustard: 'Mustard',
  nightshade: 'Nightshades',
  nightshades: 'Nightshades',
  onion: 'Onion',
  peanut: 'Peanuts',
  peanuts: 'Peanuts',
  'red meat': 'Red meat',
  sesame: 'Sesame',
  soy: 'Soybeans',
  soybean: 'Soybeans',
  soybeans: 'Soybeans',
  sulfite: 'Sulfites',
  sulfites: 'Sulfites',
  'tree nut': 'Tree nuts',
  'tree nuts': 'Tree nuts',
  nuts: 'Tree nuts',
  wheat: 'Wheat',
}

const ALLERGEN_TEXT_RULES: Array<{ label: string; keywords: string[] }> = [
  { label: 'Milk', keywords: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein'] },
  { label: 'Eggs', keywords: ['egg', 'eggs', 'mayonnaise', 'mayo', 'aioli'] },
  {
    label: 'Fish',
    keywords: ['fish', 'salmon', 'tuna', 'cod', 'trout', 'anchovy', 'anchovies'],
  },
  {
    label: 'Crustacean shellfish',
    keywords: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'langoustine'],
  },
  {
    label: 'Tree nuts',
    keywords: [
      'tree nut',
      'almond',
      'walnut',
      'pecan',
      'cashew',
      'pistachio',
      'hazelnut',
      'macadamia',
      'brazil nut',
      'pine nut',
    ],
  },
  { label: 'Peanuts', keywords: ['peanut', 'peanuts', 'peanut butter', 'groundnut'] },
  {
    label: 'Wheat',
    keywords: ['wheat', 'flour', 'bread', 'breadcrumbs', 'panko', 'pasta', 'noodle', 'noodles'],
  },
  { label: 'Gluten', keywords: ['gluten', 'barley', 'rye', 'semolina', 'farro', 'spelt'] },
  {
    label: 'Soybeans',
    keywords: ['soy', 'soybean', 'soybeans', 'soya', 'tofu', 'tempeh', 'edamame', 'miso'],
  },
  { label: 'Sesame', keywords: ['sesame', 'tahini', 'halvah'] },
  { label: 'Mustard', keywords: ['mustard', 'dijon'] },
  { label: 'Corn', keywords: ['corn', 'cornmeal', 'cornstarch', 'polenta'] },
  { label: 'Coconut', keywords: ['coconut'] },
  { label: 'Garlic', keywords: ['garlic'] },
  { label: 'Onion', keywords: ['onion', 'shallot', 'leek'] },
  { label: 'Alcohol', keywords: ['wine', 'beer', 'rum', 'vodka', 'whiskey', 'bourbon'] },
]

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsKeyword(haystack: string, keyword: string): boolean {
  const normalizedKeyword = normalizeToken(keyword)
  const pattern = new RegExp(`\\b${escapeRegex(normalizedKeyword).replace(/\s+/g, '\\s+')}\\b`, 'i')
  return pattern.test(haystack)
}

export function canonicalizeAllergen(value?: string | null): string | null {
  if (!value) return null
  const normalized = normalizeToken(value)

  const exact = ALL_ALLERGENS.find((candidate) => normalizeToken(candidate) === normalized)
  if (exact) return exact

  return ALLERGEN_ALIASES[normalized] ?? null
}

export function canonicalizeAllergenFlags(values: Array<string | null | undefined>): string[] {
  const normalized = new Set<string>()

  for (const value of values) {
    const canonical = canonicalizeAllergen(value)
    if (canonical) normalized.add(canonical)
  }

  return Array.from(normalized).sort((a, b) => {
    return (
      (ALLERGEN_ORDER.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (ALLERGEN_ORDER.get(b) ?? Number.MAX_SAFE_INTEGER)
    )
  })
}

export function deriveAllergenFlagsFromText(...texts: Array<string | null | undefined>): string[] {
  const haystack = texts
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()

  if (!haystack.trim()) return []

  const matches = ALLERGEN_TEXT_RULES.filter((rule) =>
    rule.keywords.some((keyword) => containsKeyword(haystack, keyword))
  ).map((rule) => rule.label)

  return canonicalizeAllergenFlags(matches)
}

export function mergeAllergenFlags(...lists: Array<Array<string | null | undefined>>): string[] {
  return canonicalizeAllergenFlags(lists.flat())
}

export function isFdaBig9Allergen(value?: string | null): boolean {
  const canonical = canonicalizeAllergen(value)
  return canonical ? FDA_BIG_9.includes(canonical as (typeof FDA_BIG_9)[number]) : false
}
