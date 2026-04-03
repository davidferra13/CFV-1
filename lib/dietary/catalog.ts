// Canonical Dietary Catalog
// Single source of truth for allergen and dietary identifiers, aliases,
// severity normalization, and public filter options.
// Reuses existing constants from lib/constants/allergens.ts where applicable.

import { FDA_BIG_9 } from '@/lib/constants/allergens'

// ── Severity ────────────────────────────────────────────────────────────────

export const CANONICAL_SEVERITIES = ['preference', 'intolerance', 'allergy', 'anaphylaxis'] as const

export type CanonicalSeverity = (typeof CANONICAL_SEVERITIES)[number]

/** Map legacy/variant severity labels to canonical values */
const SEVERITY_ALIASES: Record<string, CanonicalSeverity> = {
  preference: 'preference',
  avoid: 'preference',
  dislike: 'preference',
  intolerance: 'intolerance',
  sensitivity: 'intolerance',
  allergy: 'allergy',
  allergic: 'allergy',
  life_threatening: 'anaphylaxis',
  'life-threatening': 'anaphylaxis',
  anaphylaxis: 'anaphylaxis',
  severe: 'anaphylaxis',
  anaphylactic: 'anaphylaxis',
}

export function normalizeSeverity(raw: string): CanonicalSeverity {
  const key = raw
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '_')
  return SEVERITY_ALIASES[key] ?? 'allergy'
}

// ── Source ───────────────────────────────────────────────────────────────────

export const CANONICAL_SOURCES = [
  'chef_entered',
  'ai_detected',
  'intake_form',
  'client_stated',
] as const

export type CanonicalSource = (typeof CANONICAL_SOURCES)[number]

const SOURCE_ALIASES: Record<string, CanonicalSource> = {
  chef_entered: 'chef_entered',
  chef: 'chef_entered',
  ai_detected: 'ai_detected',
  ai: 'ai_detected',
  intake_form: 'intake_form',
  intake: 'intake_form',
  booking: 'intake_form',
  inquiry: 'intake_form',
  client_stated: 'client_stated',
  client: 'client_stated',
  onboarding: 'client_stated',
  self_reported: 'client_stated',
}

export function normalizeSource(raw: string): CanonicalSource {
  const key = raw
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
  return SOURCE_ALIASES[key] ?? 'client_stated'
}

// ── Catalog Entry ───────────────────────────────────────────────────────────

export type DietaryCatalogEntry = {
  kind: 'allergen' | 'diet'
  id: string
  label: string
  aliases: string[]
  classification: 'fda_major' | 'common_allergen' | 'dietary_pattern' | 'custom'
  defaultSeverity: CanonicalSeverity
  publicFilterable: boolean
  notes: string | null
}

// ── The Catalog ─────────────────────────────────────────────────────────────

export const DIETARY_CATALOG: DietaryCatalogEntry[] = [
  // FDA Big 9 allergens
  {
    kind: 'allergen',
    id: 'milk',
    label: 'Milk',
    aliases: ['dairy', 'lactose', 'cream', 'butter', 'cheese', 'casein', 'whey'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9. Covers all dairy derivatives.',
  },
  {
    kind: 'allergen',
    id: 'eggs',
    label: 'Eggs',
    aliases: ['egg', 'albumin', 'meringue'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9.',
  },
  {
    kind: 'allergen',
    id: 'fish',
    label: 'Fish',
    aliases: ['fin fish', 'anchovy', 'cod', 'salmon', 'tuna', 'halibut'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9. Covers fin fish only; shellfish is separate.',
  },
  {
    kind: 'allergen',
    id: 'shellfish',
    label: 'Shellfish',
    aliases: ['crustacean shellfish', 'shrimp', 'crab', 'lobster', 'crawfish'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9. Crustacean shellfish specifically.',
  },
  {
    kind: 'allergen',
    id: 'tree_nuts',
    label: 'Tree Nuts',
    aliases: [
      'tree nuts',
      'nuts',
      'almond',
      'cashew',
      'walnut',
      'pecan',
      'pistachio',
      'macadamia',
      'hazelnut',
      'brazil nut',
    ],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9. Does not include peanuts (a legume).',
  },
  {
    kind: 'allergen',
    id: 'peanuts',
    label: 'Peanuts',
    aliases: ['peanut', 'groundnut'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9. Legume, not a tree nut.',
  },
  {
    kind: 'allergen',
    id: 'wheat',
    label: 'Wheat',
    aliases: ['flour', 'semolina', 'spelt', 'durum'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9. Distinct from gluten (wheat is one gluten source).',
  },
  {
    kind: 'allergen',
    id: 'soybeans',
    label: 'Soybeans',
    aliases: ['soy', 'soya', 'edamame', 'tofu', 'tempeh', 'miso'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9.',
  },
  {
    kind: 'allergen',
    id: 'sesame',
    label: 'Sesame',
    aliases: ['tahini', 'sesame seeds', 'sesame oil'],
    classification: 'fda_major',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'FDA Big 9 (FASTER Act, effective 2023).',
  },

  // Common culinary allergens
  {
    kind: 'allergen',
    id: 'gluten',
    label: 'Gluten',
    aliases: ['wheat', 'barley', 'rye', 'triticale'],
    classification: 'common_allergen',
    defaultSeverity: 'intolerance',
    publicFilterable: false,
    notes: 'Cross-linked with wheat, barley, rye. Not FDA Big 9 itself, but wheat is.',
  },
  {
    kind: 'allergen',
    id: 'corn',
    label: 'Corn',
    aliases: ['maize', 'cornstarch', 'corn syrup'],
    classification: 'common_allergen',
    defaultSeverity: 'intolerance',
    publicFilterable: false,
    notes: null,
  },
  {
    kind: 'allergen',
    id: 'sulfites',
    label: 'Sulfites',
    aliases: ['sulphites', 'sulfur dioxide', 'so2'],
    classification: 'common_allergen',
    defaultSeverity: 'intolerance',
    publicFilterable: false,
    notes: 'Common in wine, dried fruit, processed foods.',
  },
  {
    kind: 'allergen',
    id: 'mustard',
    label: 'Mustard',
    aliases: ['mustard seed', 'mustard powder'],
    classification: 'common_allergen',
    defaultSeverity: 'allergy',
    publicFilterable: false,
    notes: 'EU major allergen, not FDA Big 9.',
  },
  {
    kind: 'allergen',
    id: 'nightshades',
    label: 'Nightshades',
    aliases: ['nightshade', 'tomato', 'pepper', 'potato', 'eggplant'],
    classification: 'common_allergen',
    defaultSeverity: 'intolerance',
    publicFilterable: false,
    notes: null,
  },

  // Dietary patterns (consumer-facing filters)
  {
    kind: 'diet',
    id: 'vegan',
    label: 'Vegan',
    aliases: ['plant-based', 'plant based'],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: true,
    notes: 'No animal products.',
  },
  {
    kind: 'diet',
    id: 'vegetarian',
    label: 'Vegetarian',
    aliases: ['veggie', 'lacto-ovo'],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: true,
    notes: 'No meat or fish; may include dairy and eggs.',
  },
  {
    kind: 'diet',
    id: 'gluten_free',
    label: 'Gluten-Free',
    aliases: ['gluten free', 'gf', 'celiac', 'coeliac'],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: true,
    notes: 'Avoids wheat, barley, rye, triticale.',
  },
  {
    kind: 'diet',
    id: 'dairy_free',
    label: 'Dairy-Free',
    aliases: ['dairy free', 'df', 'lactose free', 'no dairy'],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: true,
    notes: 'No milk-derived ingredients.',
  },
  {
    kind: 'diet',
    id: 'kosher',
    label: 'Kosher',
    aliases: [],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: false,
    notes: 'Jewish dietary laws. Religious diet.',
  },
  {
    kind: 'diet',
    id: 'halal',
    label: 'Halal',
    aliases: [],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: false,
    notes: 'Islamic dietary laws. Religious diet.',
  },
  {
    kind: 'diet',
    id: 'keto',
    label: 'Keto',
    aliases: ['ketogenic', 'low carb', 'low-carb'],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: false,
    notes: 'High fat, very low carb.',
  },
  {
    kind: 'diet',
    id: 'paleo',
    label: 'Paleo',
    aliases: ['paleolithic'],
    classification: 'dietary_pattern',
    defaultSeverity: 'preference',
    publicFilterable: false,
    notes: 'Whole foods, no grains or processed.',
  },
]

// ── Lookup helpers ──────────────────────────────────────────────────────────

const CATALOG_BY_ID = new Map(DIETARY_CATALOG.map((e) => [e.id, e]))

/** Build a normalized alias index for fast lookup */
function buildAliasIndex(): Map<string, DietaryCatalogEntry> {
  const index = new Map<string, DietaryCatalogEntry>()
  for (const entry of DIETARY_CATALOG) {
    index.set(entry.id, entry)
    index.set(entry.label.toLowerCase(), entry)
    for (const alias of entry.aliases) {
      index.set(alias.toLowerCase(), entry)
    }
  }
  return index
}

const ALIAS_INDEX = buildAliasIndex()

export function lookupCatalogEntry(input: string): DietaryCatalogEntry | null {
  const normalized = input.toLowerCase().trim().replace(/[-_]/g, ' ')
  return ALIAS_INDEX.get(normalized) ?? null
}

export function getCatalogEntryById(id: string): DietaryCatalogEntry | null {
  return CATALOG_BY_ID.get(id) ?? null
}

/** Normalize a raw allergen string to its canonical label, or return cleaned input */
export function normalizeAllergenLabel(raw: string): string {
  const entry = lookupCatalogEntry(raw)
  return entry?.label ?? raw.trim()
}

/** Check if a raw string matches an FDA Big 9 allergen */
export function isFdaMajor(raw: string): boolean {
  const entry = lookupCatalogEntry(raw)
  return entry?.classification === 'fda_major'
}

/** Get all catalog entries suitable for public marketplace filters */
export function getPublicFilterOptions(): DietaryCatalogEntry[] {
  return DIETARY_CATALOG.filter((e) => e.publicFilterable)
}

/** Get allergen entries only (for allergy picker UIs) */
export function getAllergenEntries(): DietaryCatalogEntry[] {
  return DIETARY_CATALOG.filter((e) => e.kind === 'allergen')
}

/** Get dietary pattern entries only */
export function getDietaryPatternEntries(): DietaryCatalogEntry[] {
  return DIETARY_CATALOG.filter((e) => e.kind === 'diet')
}

/** Severity display labels for UI */
export const SEVERITY_LABELS: Record<CanonicalSeverity, string> = {
  preference: 'Preference (avoid if possible)',
  intolerance: 'Intolerance',
  allergy: 'Allergy',
  anaphylaxis: 'Anaphylaxis (severe)',
}

/** Check if severity requires chef confirmation before proceeding */
export function isSevereCaseRequiringConfirmation(severity: CanonicalSeverity): boolean {
  return severity === 'anaphylaxis'
}

/** The FDA Big 9 set for quick checks (lowercase) */
export const FDA_BIG_9_SET = new Set(FDA_BIG_9.map((a) => a.toLowerCase()))
