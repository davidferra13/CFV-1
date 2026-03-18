// Allergen Risk Matrix - Deterministic Ingredient-to-Allergen Lookup
// Maps menu dish ingredients/descriptions against guest dietary restrictions.
// Uses the same allergen keyword map as dietary-conflict-actions.ts but produces
// the full risk matrix output that the AI version returns.
//
// Risk levels:
//   contains    = direct allergen keyword found in dish name/description/tags
//   may_contain = same allergen family (e.g., "tree nuts" when "almond" is the allergy)
//   safe        = no matches found
//   unknown     = dish has no description or ingredient info to check

// ── Types (match the AI version exactly) ───────────────────────────────────

export type DishRisk = {
  dish: string
  guestName: string
  riskLevel: 'safe' | 'may_contain' | 'contains' | 'unknown'
  triggerAllergen: string | null
  notes: string | null
}

export type AllergenRiskResult = {
  rows: DishRisk[]
  safetyFlags: string[]
  confidence: 'high' | 'medium' | 'low'
}

// ── Allergen Families ──────────────────────────────────────────────────────
// Each allergy maps to: direct keywords (= "contains") and family keywords (= "may_contain")

type AllergenEntry = {
  /** Keywords that directly indicate this allergen is present */
  directKeywords: string[]
  /** Keywords for the allergen family - cross-contamination risk */
  familyKeywords: string[]
  /** FDA Big 9 severity flag */
  isBig9: boolean
}

const ALLERGEN_DATABASE: Record<string, AllergenEntry> = {
  // ── FDA Big 9 Allergens ──
  peanut: {
    directKeywords: ['peanut', 'peanuts', 'peanut butter', 'peanut oil', 'groundnut'],
    familyKeywords: ['satay', 'pad thai', 'kung pao', 'african stew', 'mole'],
    isBig9: true,
  },
  'tree nut': {
    directKeywords: [
      'almond',
      'almonds',
      'walnut',
      'walnuts',
      'pecan',
      'pecans',
      'cashew',
      'cashews',
      'pistachio',
      'pistachios',
      'hazelnut',
      'hazelnuts',
      'macadamia',
      'brazil nut',
      'pine nut',
      'pine nuts',
      'chestnut',
      'praline',
      'marzipan',
      'frangipane',
      'gianduja',
      'nougat',
    ],
    familyKeywords: ['nut', 'nuts', 'pesto', 'baklava', 'granola', 'trail mix'],
    isBig9: true,
  },
  milk: {
    directKeywords: [
      'milk',
      'cream',
      'butter',
      'cheese',
      'yogurt',
      'whey',
      'casein',
      'lactose',
      'ghee',
      'paneer',
      'ricotta',
      'mozzarella',
      'parmesan',
      'cheddar',
      'brie',
      'gouda',
      'gruyere',
      'mascarpone',
      'burrata',
      'cream cheese',
      'sour cream',
      'heavy cream',
      'half and half',
      'buttermilk',
      'condensed milk',
      'evaporated milk',
      'ice cream',
      'custard',
      'pudding',
    ],
    familyKeywords: ['dairy', 'creamy', 'au gratin', 'bechamel', 'alfredo', 'carbonara'],
    isBig9: true,
  },
  egg: {
    directKeywords: [
      'egg',
      'eggs',
      'egg white',
      'egg yolk',
      'meringue',
      'mayonnaise',
      'mayo',
      'aioli',
      'hollandaise',
      'bearnaise',
      'custard',
      'quiche',
      'frittata',
      'souffle',
    ],
    familyKeywords: ['brioche', 'pasta', 'tempura', 'batter', 'breaded'],
    isBig9: true,
  },
  wheat: {
    directKeywords: [
      'wheat',
      'flour',
      'bread',
      'breadcrumbs',
      'crouton',
      'croutons',
      'pasta',
      'noodle',
      'noodles',
      'spaghetti',
      'linguine',
      'fettuccine',
      'couscous',
      'bulgur',
      'semolina',
      'farro',
      'spelt',
      'tortilla',
      'pita',
      'naan',
      'flatbread',
      'baguette',
      'roll',
      'cake',
      'cookie',
      'pastry',
      'pie crust',
      'dumpling',
      'soy sauce',
      'teriyaki',
      'panko',
    ],
    familyKeywords: ['gluten', 'breaded', 'crusted', 'battered', 'roux', 'thickened'],
    isBig9: true,
  },
  soy: {
    directKeywords: [
      'soy',
      'soya',
      'soybean',
      'tofu',
      'tempeh',
      'edamame',
      'miso',
      'soy sauce',
      'tamari',
      'teriyaki',
    ],
    familyKeywords: ['asian sauce', 'stir fry'],
    isBig9: true,
  },
  fish: {
    directKeywords: [
      'fish',
      'salmon',
      'tuna',
      'cod',
      'halibut',
      'snapper',
      'trout',
      'bass',
      'swordfish',
      'mahi',
      'tilapia',
      'anchovy',
      'anchovies',
      'sardine',
      'sardines',
      'mackerel',
      'herring',
      'catfish',
      'sole',
      'flounder',
      'perch',
      'pike',
      'grouper',
      'fish sauce',
      'worcestershire',
    ],
    familyKeywords: ['seafood', 'ocean', 'catch of the day'],
    isBig9: true,
  },
  shellfish: {
    directKeywords: [
      'shrimp',
      'prawn',
      'prawns',
      'crab',
      'lobster',
      'crawfish',
      'crayfish',
      'langoustine',
      'scallop',
      'scallops',
      'clam',
      'clams',
      'mussel',
      'mussels',
      'oyster',
      'oysters',
      'squid',
      'calamari',
      'octopus',
    ],
    familyKeywords: ['shellfish', 'seafood', 'bouillabaisse', 'cioppino', 'paella'],
    isBig9: true,
  },
  sesame: {
    directKeywords: ['sesame', 'sesame seed', 'sesame oil', 'tahini', 'hummus', 'halvah'],
    familyKeywords: ['bagel', 'bun', 'middle eastern', 'asian'],
    isBig9: true,
  },
  // ── Common non-Big-9 allergies ──
  gluten: {
    directKeywords: [
      'wheat',
      'barley',
      'rye',
      'flour',
      'bread',
      'pasta',
      'couscous',
      'crouton',
      'breadcrumb',
      'panko',
      'soy sauce',
      'beer',
      'cake',
      'cookie',
      'pastry',
      'pie',
      'baguette',
    ],
    familyKeywords: ['breaded', 'crusted', 'battered', 'roux', 'thickened', 'dusted'],
    isBig9: false,
  },
  celiac: {
    directKeywords: [
      'wheat',
      'barley',
      'rye',
      'flour',
      'bread',
      'pasta',
      'couscous',
      'crouton',
      'breadcrumb',
      'panko',
      'soy sauce',
    ],
    familyKeywords: ['breaded', 'crusted', 'battered', 'roux'],
    isBig9: false,
  },
  corn: {
    directKeywords: [
      'corn',
      'cornstarch',
      'cornmeal',
      'polenta',
      'grits',
      'hominy',
      'tortilla chip',
    ],
    familyKeywords: ['cornbread', 'tamale'],
    isBig9: false,
  },
  mustard: {
    directKeywords: ['mustard', 'dijon', 'yellow mustard', 'mustard seed'],
    familyKeywords: ['vinaigrette', 'dressing'],
    isBig9: false,
  },
  sulfite: {
    directKeywords: ['wine', 'dried fruit', 'vinegar', 'pickled'],
    familyKeywords: ['preserved', 'cured'],
    isBig9: false,
  },
}

// ── Normalization ──────────────────────────────────────────────────────────

/** Normalize a restriction string to a lookup key */
function normalizeRestriction(raw: string): string {
  const lower = raw
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')
    .replace(/\s+free$/, '')
    .replace(/allerg(y|ic)\s*(to)?\s*/i, '')
    .replace(/intoleran(t|ce)\s*(to)?\s*/i, '')
    .trim()

  // Common aliases
  const aliases: Record<string, string> = {
    dairy: 'milk',
    'dairy free': 'milk',
    lactose: 'milk',
    'lactose intolerant': 'milk',
    nut: 'tree nut',
    nuts: 'tree nut',
    'tree nuts': 'tree nut',
    peanuts: 'peanut',
    eggs: 'egg',
    'wheat free': 'wheat',
    'gluten free': 'gluten',
    'celiac disease': 'celiac',
    coeliac: 'celiac',
    crustacean: 'shellfish',
    crustaceans: 'shellfish',
  }

  return aliases[lower] ?? lower
}

// ── Matrix Builder ─────────────────────────────────────────────────────────

type GuestProfile = {
  name: string
  restrictions: string[] // raw restriction strings
}

type MenuItem = {
  name: string
  description: string | null
  allergenTags: string[] | null
}

/**
 * Builds the allergen risk matrix for an event.
 * Pure keyword lookup - no AI, no network, deterministic.
 * Returns the exact same type as the AI version for drop-in compatibility.
 */
export function buildAllergenMatrixFormula(
  guests: GuestProfile[],
  menuItems: MenuItem[]
): AllergenRiskResult {
  if (menuItems.length === 0) {
    return {
      rows: [],
      safetyFlags: ['No menu items assigned yet - add dishes to run allergen analysis.'],
      confidence: 'low',
    }
  }

  if (guests.length === 0) {
    return {
      rows: [],
      safetyFlags: ['No guest dietary information recorded.'],
      confidence: 'low',
    }
  }

  const rows: DishRisk[] = []
  const safetyFlags: string[] = []

  for (const guest of guests) {
    if (guest.restrictions.length === 0) continue

    for (const dish of menuItems) {
      // Build searchable text from dish
      const dishText = [dish.name, dish.description ?? '', ...(dish.allergenTags ?? [])]
        .join(' ')
        .toLowerCase()

      // If dish has no info at all, mark unknown
      if (!dishText.trim() || dishText.trim() === dish.name.toLowerCase()) {
        for (const restriction of guest.restrictions) {
          rows.push({
            dish: dish.name,
            guestName: guest.name,
            riskLevel: 'unknown',
            triggerAllergen: restriction,
            notes: 'Insufficient dish information - verify ingredients manually.',
          })
        }
        continue
      }

      for (const restriction of guest.restrictions) {
        const normalized = normalizeRestriction(restriction)
        const allergenEntry = ALLERGEN_DATABASE[normalized]

        if (!allergenEntry) {
          // Unknown allergen - check if the raw restriction text appears in dish
          const rawLower = restriction.toLowerCase()
          if (dishText.includes(rawLower)) {
            rows.push({
              dish: dish.name,
              guestName: guest.name,
              riskLevel: 'contains',
              triggerAllergen: restriction,
              notes: `"${restriction}" found in dish description.`,
            })

            if (
              !safetyFlags.includes(
                `ALLERGEN ALERT: ${restriction} detected in ${dish.name} - affects ${guest.name}`
              )
            ) {
              safetyFlags.push(
                `ALLERGEN ALERT: ${restriction} detected in ${dish.name} - affects ${guest.name}`
              )
            }
          } else {
            rows.push({
              dish: dish.name,
              guestName: guest.name,
              riskLevel: 'safe',
              triggerAllergen: null,
              notes: null,
            })
          }
          continue
        }

        // Check direct keywords (= "contains")
        const directMatch = allergenEntry.directKeywords.find((kw) => dishText.includes(kw))
        if (directMatch) {
          rows.push({
            dish: dish.name,
            guestName: guest.name,
            riskLevel: 'contains',
            triggerAllergen: `${normalized} (${directMatch})`,
            notes: `Dish contains "${directMatch}" - ${normalized} allergen.`,
          })

          const flag = allergenEntry.isBig9
            ? `CRITICAL (FDA Big 9): ${normalized} in "${dish.name}" - ${guest.name} has ${restriction}`
            : `WARNING: ${normalized} in "${dish.name}" - ${guest.name} has ${restriction}`

          if (!safetyFlags.includes(flag)) {
            safetyFlags.push(flag)
          }
          continue
        }

        // Check family keywords (= "may_contain")
        const familyMatch = allergenEntry.familyKeywords.find((kw) => dishText.includes(kw))
        if (familyMatch) {
          rows.push({
            dish: dish.name,
            guestName: guest.name,
            riskLevel: 'may_contain',
            triggerAllergen: `${normalized} (possible: ${familyMatch})`,
            notes: `"${familyMatch}" in dish may indicate ${normalized} presence. Verify with recipe.`,
          })

          if (allergenEntry.isBig9) {
            const flag = `VERIFY: "${dish.name}" may contain ${normalized} - ${guest.name} has ${restriction}. Confirm ingredients.`
            if (!safetyFlags.includes(flag)) {
              safetyFlags.push(flag)
            }
          }
          continue
        }

        // No match - safe
        rows.push({
          dish: dish.name,
          guestName: guest.name,
          riskLevel: 'safe',
          triggerAllergen: null,
          notes: null,
        })
      }
    }
  }

  // Confidence based on dish description quality
  const dishesWithDescription = menuItems.filter((d) => d.description && d.description.length > 10)
  const descriptionCoverage = dishesWithDescription.length / menuItems.length
  const confidence: 'high' | 'medium' | 'low' =
    descriptionCoverage >= 0.8 ? 'high' : descriptionCoverage >= 0.5 ? 'medium' : 'low'

  if (confidence === 'low') {
    safetyFlags.unshift(
      'Low confidence: many dishes lack descriptions. Add ingredient details for more accurate analysis.'
    )
  }

  return { rows, safetyFlags, confidence }
}
