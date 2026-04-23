type PublishDecision =
  | 'blocked_keyword'
  | 'blocked_category'
  | 'food_product_match'
  | 'food_category'
  | 'missing_culinary_signal'

export type PublicIngredientPublishability = {
  allowed: boolean
  reason: PublishDecision
}

type CanonicalIngredientCandidate = {
  id: string
  name: string
  category: string | null
  hasFoodProductMatch: boolean
}

type KnowledgeIngredientCandidate = {
  slug: string
  name?: string | null
}

const OBVIOUS_NON_CULINARY_PATTERNS: RegExp[] = [
  /\b(?:duck|duct)\s+tape\b/i,
  /\belectrical\s+tape\b/i,
  /\bpacking\s+tape\b/i,
  /\bpaper\s+towels?\b/i,
  /\btoilet\s+paper\b/i,
  /\btrash\s+bags?\b/i,
  /\bgarbage\s+bags?\b/i,
  /\bdish(?:washer)?\s+detergent\b/i,
  /\blaundry\s+detergent\b/i,
  /\bfabric\s+softener\b/i,
  /\bdish\s+soap\b/i,
  /\bplastic\s+wrap\b/i,
  /\baluminum\s+foil\b/i,
  /\bparchment\s+paper\b/i,
  /\bwax\s+paper\b/i,
  /\bband(?:\s|-)?aid\b/i,
  /\bbandages?\b/i,
  /\btoothpaste\b/i,
  /\btoothbrush(?:es)?\b/i,
  /\bshampoo\b/i,
  /\bconditioner\b/i,
  /\bbody\s+wash\b/i,
  /\bdeodorant\b/i,
  /\bdiapers?\b/i,
  /\bbaby\s+wipes?\b/i,
  /\bcat\s+food\b/i,
  /\bdog\s+food\b/i,
  /\bcat\s+litter\b/i,
  /\bbatter(?:y|ies)\b/i,
  /\bchargers?\b/i,
  /\blight\s+bulbs?\b/i,
  /\biphone\b/i,
  /\bipad\b/i,
  /\bcondoms?\b/i,
  /\btampons?\b/i,
]

const BLOCKED_CANONICAL_CATEGORIES = new Set([
  'baby',
  'health care',
  'household',
  'kitchen supplies',
  'personal care',
  'pet',
  'pets',
])

const ALLOWED_CANONICAL_FOOD_CATEGORIES = new Set([
  'alcohol',
  'baking',
  'baking essentials',
  'beverages',
  'breakfast',
  'candy',
  'canned goods & soups',
  'condiments',
  'condiments & sauces',
  'dairy',
  'dairy & eggs',
  'deli',
  'dry goods & pasta',
  'flipp-circular',
  'frozen',
  'grains & bakery',
  'international',
  'meat',
  'meat & seafood',
  'oils & spices',
  'oils, vinegars, & spices',
  'pantry',
  'prepared & deli',
  'prepared foods',
  'produce',
  'protein',
  'seafood',
  'snacks',
  'snacks & candy',
  'spices',
  'usda-terminal',
])

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function hasObviousNonCulinaryMarker(...values: Array<string | null | undefined>): boolean {
  return values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .some((value) => OBVIOUS_NON_CULINARY_PATTERNS.some((pattern) => pattern.test(value)))
}

export function isKnowledgeIngredientPubliclyIndexable(
  candidate: KnowledgeIngredientCandidate
): boolean {
  return !hasObviousNonCulinaryMarker(candidate.slug, candidate.name)
}

export function evaluateCanonicalIngredientPublicPublishability(
  candidate: CanonicalIngredientCandidate
): PublicIngredientPublishability {
  if (hasObviousNonCulinaryMarker(candidate.id, candidate.name)) {
    return { allowed: false, reason: 'blocked_keyword' }
  }

  const normalizedCategory = normalizeText(candidate.category)
  if (normalizedCategory && BLOCKED_CANONICAL_CATEGORIES.has(normalizedCategory)) {
    return { allowed: false, reason: 'blocked_category' }
  }

  if (candidate.hasFoodProductMatch) {
    return { allowed: true, reason: 'food_product_match' }
  }

  if (normalizedCategory && ALLOWED_CANONICAL_FOOD_CATEGORIES.has(normalizedCategory)) {
    return { allowed: true, reason: 'food_category' }
  }

  return { allowed: false, reason: 'missing_culinary_signal' }
}
