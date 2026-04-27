'use client'

// Ingredient Hazard Badge - shows allergen/cross-contact risk for an ingredient name
// Pure client-side, uses the deterministic ALLERGEN_INGREDIENT_MAP for instant matching.
// Red = FDA Big 9, Amber = common allergen, no badge = safe ingredient.

import { useMemo } from 'react'

// FDA Big 9 allergens (must match lib/constants/allergens.ts)
const FDA_BIG_9_KEYS = new Set([
  'dairy',
  'eggs',
  'fish',
  'shellfish',
  'tree_nuts',
  'peanuts',
  'wheat',
  'soy',
  'sesame',
])

// Display labels for allergen keys
const ALLERGEN_LABELS: Record<string, string> = {
  dairy: 'Milk/Dairy',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  tree_nuts: 'Tree Nuts',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  soy: 'Soy',
  sesame: 'Sesame',
  gluten: 'Gluten',
  nightshade: 'Nightshade',
}

// Inline copy of ALLERGEN_INGREDIENT_MAP to keep this client-side only (no server import).
// Sync with lib/menus/allergen-check.ts if terms are added there.
const ALLERGEN_MAP: Record<string, string[]> = {
  dairy: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'whey',
    'casein',
    'ghee',
    'curd',
    'lactose',
    'mascarpone',
    'ricotta',
    'mozzarella',
    'parmesan',
    'brie',
    'camembert',
    'gouda',
    'cheddar',
    'gruyere',
    'pecorino',
    'provolone',
    'burrata',
    'paneer',
    'kefir',
    'sour cream',
    'ice cream',
    'custard',
    'bechamel',
    'alfredo',
  ],
  eggs: [
    'egg',
    'eggs',
    'meringue',
    'mayonnaise',
    'mayo',
    'aioli',
    'hollandaise',
    'custard',
    'quiche',
    'frittata',
    'souffle',
    'pavlova',
    'tempura batter',
  ],
  fish: [
    'salmon',
    'tuna',
    'cod',
    'halibut',
    'trout',
    'tilapia',
    'swordfish',
    'mahi',
    'snapper',
    'bass',
    'sardine',
    'anchovy',
    'anchovies',
    'mackerel',
    'catfish',
    'haddock',
    'sole',
    'flounder',
    'branzino',
    'arctic char',
    'fish sauce',
    'worcestershire',
  ],
  shellfish: [
    'shrimp',
    'crab',
    'lobster',
    'crawfish',
    'crayfish',
    'prawn',
    'scallop',
    'clam',
    'mussel',
    'oyster',
    'squid',
    'calamari',
    'octopus',
    'langoustine',
  ],
  tree_nuts: [
    'almond',
    'walnut',
    'pecan',
    'cashew',
    'pistachio',
    'macadamia',
    'hazelnut',
    'brazil nut',
    'pine nut',
    'chestnut',
    'praline',
    'marzipan',
    'frangipane',
    'gianduja',
    'nougat',
  ],
  peanuts: ['peanut', 'peanuts', 'peanut butter', 'peanut oil', 'groundnut'],
  wheat: [
    'flour',
    'bread',
    'pasta',
    'noodle',
    'couscous',
    'breadcrumb',
    'panko',
    'crouton',
    'tortilla',
    'pita',
    'naan',
    'cracker',
    'biscuit',
    'pastry',
    'pie crust',
    'phyllo',
    'filo',
    'wonton',
    'dumpling',
  ],
  soy: ['soy', 'soy sauce', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari', 'soybean', 'soy milk'],
  sesame: ['sesame', 'tahini', 'sesame oil', 'sesame seed', 'halva', 'hummus'],
  gluten: [
    'wheat',
    'barley',
    'rye',
    'spelt',
    'farro',
    'bulgur',
    'seitan',
    'triticale',
    'semolina',
    'durum',
  ],
  nightshade: [
    'tomato',
    'potato',
    'pepper',
    'eggplant',
    'paprika',
    'cayenne',
    'chili',
    'chile',
    'jalapeno',
    'habanero',
    'serrano',
    'chipotle',
    'tabasco',
    'goji',
  ],
}

type MatchedAllergen = {
  key: string
  label: string
  isBig9: boolean
}

function matchIngredient(name: string): MatchedAllergen[] {
  if (!name || name.trim().length < 2) return []
  const normalized = name.toLowerCase().trim()
  const matches: MatchedAllergen[] = []
  const seen = new Set<string>()

  for (const [allergenKey, terms] of Object.entries(ALLERGEN_MAP)) {
    for (const term of terms) {
      // Word boundary match
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(normalized) && !seen.has(allergenKey)) {
        seen.add(allergenKey)
        matches.push({
          key: allergenKey,
          label: ALLERGEN_LABELS[allergenKey] || allergenKey,
          isBig9: FDA_BIG_9_KEYS.has(allergenKey),
        })
        break
      }
    }
  }

  // Sort: Big 9 first
  return matches.sort((a, b) => (a.isBig9 === b.isBig9 ? 0 : a.isBig9 ? -1 : 1))
}

type Props = {
  ingredientName: string
  compact?: boolean
}

export function IngredientHazardBadge({ ingredientName, compact = false }: Props) {
  const matches = useMemo(() => matchIngredient(ingredientName), [ingredientName])

  if (matches.length === 0) return null

  const hasBig9 = matches.some((m) => m.isBig9)
  const tooltip = matches.map((m) => `${m.isBig9 ? '[FDA] ' : ''}${m.label}`).join(', ')

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] font-semibold leading-none ${
          hasBig9 ? 'text-red-400' : 'text-amber-400'
        }`}
        title={tooltip}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M8 1l7 13H1L8 1zm0 4v4m0 2v1"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        {matches.length}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 flex-wrap mt-0.5">
      {matches.map((m) => (
        <span
          key={m.key}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium leading-4 ${
            m.isBig9
              ? 'bg-red-500/15 text-red-400 border border-red-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
          title={m.isBig9 ? 'FDA Big 9 Allergen' : 'Common Allergen'}
        >
          {m.isBig9 && (
            <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8 1l7 13H1L8 1zm0 4v4m0 2v1"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}
          {m.label}
        </span>
      ))}
    </span>
  )
}
