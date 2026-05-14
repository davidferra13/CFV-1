import {
  canonicalizeCuisineSlug,
  getCuisineAncestors,
  getCuisineDescendants,
  getCuisineDisplayName,
} from '@/lib/constants/cuisines'

export type FoodTaxonomyKind =
  | 'allergen'
  | 'budget'
  | 'craving'
  | 'cuisine'
  | 'dietary'
  | 'dish'
  | 'ingredient'
  | 'restaurant'
  | 'service_style'
  | 'tag'

export type AllergenFamilyKey =
  | 'egg'
  | 'fish'
  | 'milk'
  | 'peanut'
  | 'sesame'
  | 'shellfish'
  | 'soy'
  | 'tree_nut'
  | 'wheat'
  | 'gluten'

export interface NormalizedFoodTaxonomyTerm {
  originalLabel: string
  kind: FoodTaxonomyKind
  slug: string
  canonicalKey: string
  displayLabel: string
  parentKeys: string[]
  childKeys: string[]
  allergenFamilies: AllergenFamilyKey[]
  matchKeys: string[]
  isKnown: boolean
}

type TaxonomySeed = {
  kind: FoodTaxonomyKind
  slug: string
  displayLabel: string
  aliases?: string[]
  parentKeys?: string[]
  allergenFamilies?: AllergenFamilyKey[]
}

const TAXONOMY_SEEDS: TaxonomySeed[] = [
  {
    kind: 'ingredient',
    slug: 'shellfish',
    displayLabel: 'Shellfish',
    aliases: ['crustacean shellfish', 'crustaceans', 'mollusks', 'molluscs'],
    parentKeys: ['ingredient:seafood'],
    allergenFamilies: ['shellfish'],
  },
  {
    kind: 'ingredient',
    slug: 'shrimp',
    displayLabel: 'Shrimp',
    aliases: ['prawn', 'prawns'],
    parentKeys: ['ingredient:shellfish', 'ingredient:seafood'],
    allergenFamilies: ['shellfish'],
  },
  {
    kind: 'ingredient',
    slug: 'lobster',
    displayLabel: 'Lobster',
    aliases: ['langoustine'],
    parentKeys: ['ingredient:shellfish', 'ingredient:seafood'],
    allergenFamilies: ['shellfish'],
  },
  {
    kind: 'ingredient',
    slug: 'seafood',
    displayLabel: 'Seafood',
    aliases: ['sea food'],
  },
  {
    kind: 'ingredient',
    slug: 'cashew_cream',
    displayLabel: 'Cashew Cream',
    aliases: ['cashew sauce', 'cashew crema'],
    parentKeys: ['ingredient:cashew', 'ingredient:tree_nut'],
    allergenFamilies: ['tree_nut'],
  },
  {
    kind: 'ingredient',
    slug: 'almond_flour',
    displayLabel: 'Almond Flour',
    aliases: ['almond meal'],
    parentKeys: ['ingredient:almond', 'ingredient:tree_nut'],
    allergenFamilies: ['tree_nut'],
  },
  {
    kind: 'ingredient',
    slug: 'fish_sauce',
    displayLabel: 'Fish Sauce',
    aliases: ['nam pla'],
    parentKeys: ['ingredient:fish'],
    allergenFamilies: ['fish'],
  },
  {
    kind: 'ingredient',
    slug: 'soy_sauce',
    displayLabel: 'Soy Sauce',
    aliases: ['shoyu'],
    parentKeys: ['ingredient:soy', 'ingredient:wheat'],
    allergenFamilies: ['soy', 'wheat', 'gluten'],
  },
  {
    kind: 'ingredient',
    slug: 'whey',
    displayLabel: 'Whey',
    parentKeys: ['ingredient:milk', 'ingredient:dairy'],
    allergenFamilies: ['milk'],
  },
  {
    kind: 'ingredient',
    slug: 'cilantro',
    displayLabel: 'Cilantro',
    aliases: ['coriander leaf', 'fresh coriander'],
  },
  {
    kind: 'dish',
    slug: 'pad_thai',
    displayLabel: 'Pad Thai',
    aliases: ['phad thai'],
    parentKeys: ['cuisine:thai', 'ingredient:peanut'],
    allergenFamilies: ['peanut'],
  },
  {
    kind: 'allergen',
    slug: 'shellfish',
    displayLabel: 'Shellfish',
    aliases: ['crustacean shellfish', 'crustaceans', 'mollusks', 'molluscs'],
    parentKeys: ['ingredient:shellfish', 'ingredient:seafood'],
    allergenFamilies: ['shellfish'],
  },
  {
    kind: 'allergen',
    slug: 'tree_nut',
    displayLabel: 'Tree Nut',
    aliases: ['tree nuts', 'nuts', 'nut allergy'],
    parentKeys: ['ingredient:tree_nut'],
    allergenFamilies: ['tree_nut'],
  },
  {
    kind: 'allergen',
    slug: 'peanut',
    displayLabel: 'Peanut',
    aliases: ['peanuts', 'groundnut'],
    parentKeys: ['ingredient:peanut'],
    allergenFamilies: ['peanut'],
  },
  {
    kind: 'allergen',
    slug: 'milk',
    displayLabel: 'Milk',
    aliases: ['dairy', 'dairy free', 'lactose'],
    parentKeys: ['ingredient:milk', 'ingredient:dairy'],
    allergenFamilies: ['milk'],
  },
  {
    kind: 'allergen',
    slug: 'soy',
    displayLabel: 'Soy',
    aliases: ['soybeans', 'soya'],
    parentKeys: ['ingredient:soy'],
    allergenFamilies: ['soy'],
  },
  {
    kind: 'allergen',
    slug: 'wheat',
    displayLabel: 'Wheat',
    aliases: ['gluten', 'gluten free', 'celiac', 'coeliac'],
    parentKeys: ['ingredient:wheat', 'ingredient:gluten'],
    allergenFamilies: ['wheat', 'gluten'],
  },
  {
    kind: 'tag',
    slug: 'spicy',
    displayLabel: 'Spicy',
    aliases: ['hot', 'extra spicy', 'heat'],
  },
  {
    kind: 'tag',
    slug: 'no_heat',
    displayLabel: 'No Heat',
    aliases: ['not spicy', 'mild only', 'no spice', 'zero spice'],
  },
]

const TOKEN_TO_SEED = new Map<string, TaxonomySeed>()

for (const seed of TAXONOMY_SEEDS) {
  for (const value of [seed.slug, seed.displayLabel, ...(seed.aliases ?? [])]) {
    TOKEN_TO_SEED.set(normalizeFoodToken(value), seed)
  }
}

export function normalizeFoodToken(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function titleizeSlug(slug: string): string {
  return slug
    .replace(/_/g, ' ')
    .split(' ')
    .map((token) => (token ? token[0].toUpperCase() + token.slice(1) : token))
    .join(' ')
}

function key(kind: FoodTaxonomyKind, slug: string): string {
  return `${kind}:${slug}`
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function cuisineTerm(originalLabel: string, cuisineSlug: string): NormalizedFoodTaxonomyTerm {
  const canonicalKey = key('cuisine', cuisineSlug)
  const parentKeys = getCuisineAncestors(cuisineSlug).map((entry) => key('cuisine', entry.slug))
  const childKeys = getCuisineDescendants(cuisineSlug).map((entry) => key('cuisine', entry.slug))

  return {
    originalLabel,
    kind: 'cuisine',
    slug: cuisineSlug,
    canonicalKey,
    displayLabel: getCuisineDisplayName(cuisineSlug),
    parentKeys,
    childKeys,
    allergenFamilies: [],
    matchKeys: unique([canonicalKey, ...parentKeys, ...childKeys]),
    isKnown: true,
  }
}

export function normalizeFoodTaxonomyTerm(
  rawValue: string,
  requestedKind?: FoodTaxonomyKind | null
): NormalizedFoodTaxonomyTerm {
  const originalLabel = rawValue.trim()
  const token = normalizeFoodToken(originalLabel)
  const cuisineSlug =
    requestedKind === 'cuisine' || requestedKind == null ? canonicalizeCuisineSlug(token) : null

  if (cuisineSlug) {
    return cuisineTerm(originalLabel, cuisineSlug)
  }

  const seed = TOKEN_TO_SEED.get(token)
  if (seed && (!requestedKind || requestedKind === seed.kind)) {
    const canonicalKey = key(seed.kind, seed.slug)
    const allergenKeys = (seed.allergenFamilies ?? []).map((family) => key('allergen', family))
    const parentKeys = seed.parentKeys ?? []

    return {
      originalLabel,
      kind: seed.kind,
      slug: seed.slug,
      canonicalKey,
      displayLabel: seed.displayLabel,
      parentKeys,
      childKeys: [],
      allergenFamilies: seed.allergenFamilies ?? [],
      matchKeys: unique([canonicalKey, ...parentKeys, ...allergenKeys]),
      isKnown: true,
    }
  }

  const kind = requestedKind ?? 'tag'
  const slug = token || 'unknown'
  const canonicalKey = key(kind, slug)

  return {
    originalLabel,
    kind,
    slug,
    canonicalKey,
    displayLabel: titleizeSlug(slug),
    parentKeys: [],
    childKeys: [],
    allergenFamilies: [],
    matchKeys: [canonicalKey],
    isKnown: false,
  }
}

export function expandFoodTaxonomyMatchKeys(
  rawValue: string,
  requestedKind?: FoodTaxonomyKind | null
): string[] {
  return normalizeFoodTaxonomyTerm(rawValue, requestedKind).matchKeys
}

export function foodTaxonomyTermsOverlap(
  left: NormalizedFoodTaxonomyTerm,
  right: NormalizedFoodTaxonomyTerm
): boolean {
  const rightKeys = new Set(right.matchKeys)
  return left.matchKeys.some((matchKey) => rightKeys.has(matchKey))
}
