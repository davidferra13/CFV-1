// Deterministic allergen cross-reference engine
// Checks menu dishes against client allergy records
// Formula > AI: no LLM needed, pure lookup table

// ALLERGEN_INGREDIENT_MAP: maps common allergen categories to ingredient terms
// Groups: dairy, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soy, sesame, gluten, nightshade

const ALLERGEN_INGREDIENT_MAP: Record<string, string[]> = {
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
    'bass',
    'snapper',
    'mahi',
    'swordfish',
    'anchovy',
    'anchovies',
    'sardine',
    'sardines',
    'mackerel',
    'tilapia',
    'branzino',
    'grouper',
    'sole',
    'flounder',
    'catfish',
    'haddock',
    'perch',
    'pike',
    'eel',
    'fish sauce',
    'fish stock',
    'dashi',
    'bonito',
    'worcestershire',
  ],
  shellfish: [
    'shrimp',
    'prawn',
    'prawns',
    'crab',
    'lobster',
    'crayfish',
    'crawfish',
    'scallop',
    'scallops',
    'mussel',
    'mussels',
    'clam',
    'clams',
    'oyster',
    'oysters',
    'calamari',
    'squid',
    'octopus',
    'langoustine',
  ],
  tree_nuts: [
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
    'macadamia',
    'hazelnut',
    'hazelnuts',
    'brazil nut',
    'pine nut',
    'pine nuts',
    'chestnut',
    'chestnuts',
    'praline',
    'marzipan',
    'frangipane',
    'amaretto',
    'nougat',
  ],
  peanuts: ['peanut', 'peanuts', 'peanut butter', 'groundnut', 'groundnuts', 'satay', 'pad thai'],
  wheat: [
    'wheat',
    'flour',
    'bread',
    'pasta',
    'noodles',
    'couscous',
    'semolina',
    'farro',
    'spelt',
    'bulgur',
    'seitan',
    'panko',
    'breadcrumb',
    'breadcrumbs',
    'crouton',
    'croutons',
    'tortilla',
    'pita',
    'naan',
    'focaccia',
    'ciabatta',
    'brioche',
    'croissant',
    'phyllo',
    'filo',
    'wonton',
    'dumpling',
  ],
  soy: [
    'soy',
    'soya',
    'tofu',
    'tempeh',
    'edamame',
    'miso',
    'soy sauce',
    'tamari',
    'teriyaki',
    'soybean',
    'soybeans',
  ],
  sesame: [
    'sesame',
    'tahini',
    'halva',
    'halvah',
    'hummus',
    'sesame oil',
    'sesame seeds',
    'gomashio',
  ],
  gluten: [
    'wheat',
    'barley',
    'rye',
    'oats',
    'flour',
    'bread',
    'pasta',
    'couscous',
    'beer',
    'malt',
    'semolina',
    'spelt',
    'farro',
    'bulgur',
    'seitan',
    'soy sauce',
    'panko',
    'breadcrumbs',
  ],
  nightshade: [
    'tomato',
    'tomatoes',
    'potato',
    'potatoes',
    'pepper',
    'peppers',
    'eggplant',
    'aubergine',
    'paprika',
    'cayenne',
    'chili',
    'jalapeno',
    'habanero',
    'chipotle',
    'tabasco',
    'goji',
  ],
}

export type AllergenConflict = {
  dishId: string
  dishName: string
  ingredientName: string
  allergen: string
  severity: string
  confirmedByChef: boolean
}

function normalizeIngredient(name: string): string {
  return name.toLowerCase().trim()
}

export function ingredientMatchesAllergen(ingredientName: string, allergen: string): boolean {
  const normalized = normalizeIngredient(ingredientName)
  const allergenKey = allergen.toLowerCase().replace(/[^a-z_]/g, '')
  const terms = ALLERGEN_INGREDIENT_MAP[allergenKey]

  if (!terms) {
    // Direct string match for custom allergens
    return normalized.includes(allergen.toLowerCase())
  }

  return terms.some((term) => normalized.includes(term))
}

export function checkDishAgainstAllergens(
  dishName: string,
  dishId: string,
  ingredients: { name: string }[],
  allergyRecords: { allergen: string; severity: string; confirmed_by_chef: boolean }[]
): AllergenConflict[] {
  const conflicts: AllergenConflict[] = []

  for (const ingredient of ingredients) {
    for (const allergy of allergyRecords) {
      if (ingredientMatchesAllergen(ingredient.name, allergy.allergen)) {
        // Avoid duplicate conflicts for same dish + allergen
        const alreadyFlagged = conflicts.some(
          (c) => c.dishId === dishId && c.allergen === allergy.allergen
        )
        if (!alreadyFlagged) {
          conflicts.push({
            dishId,
            dishName,
            ingredientName: ingredient.name,
            allergen: allergy.allergen,
            severity: allergy.severity,
            confirmedByChef: allergy.confirmed_by_chef,
          })
        }
      }
    }
  }

  return conflicts
}

export { ALLERGEN_INGREDIENT_MAP }
