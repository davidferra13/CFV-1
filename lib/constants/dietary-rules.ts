// Dietary Rule Sets - Ingredient-to-Diet-Violation Lookup
// ──────────────────────────────────────────────────────────────────────────────
// Maps dietary restrictions to the ingredient keywords that violate them.
// Pure deterministic reference data. No AI, no network, works offline.
//
// Used by: menu planning, recipe tagging, event dietary compliance,
//          Remy concierge, grocery list filtering.
//
// Pattern matches allergen-matrix.ts: keyword-based lookup with direct/family tiers.
//   violates  = ingredient directly breaks the diet (meat in a vegan dish)
//   caution   = ingredient may break the diet depending on preparation or source
//
// Sources: established dietary guidelines, culinary school standards,
//          FDA labeling rules, clinical nutrition references.

// ── Types ────────────────────────────────────────────────────────────────────

export type DietId =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'keto'
  | 'paleo'
  | 'whole30'
  | 'gluten-free'
  | 'dairy-free'
  | 'low-fodmap'
  | 'kosher'
  | 'halal'
  | 'low-sodium'
  | 'low-sugar'

export type ViolationLevel = 'violates' | 'caution'

export type DietaryViolation = {
  ingredient: string
  level: ViolationLevel
  reason: string
}

export type DietaryRuleEntry = {
  /** Human-readable name */
  label: string
  /** Short description for UI tooltips */
  description: string
  /** Keywords that directly violate this diet */
  violationKeywords: string[]
  /** Keywords that may violate depending on preparation/source */
  cautionKeywords: string[]
}

// ── Diet Definitions ─────────────────────────────────────────────────────────

export const DIETARY_RULES: Record<DietId, DietaryRuleEntry> = {
  vegan: {
    label: 'Vegan',
    description: 'No animal products of any kind',
    violationKeywords: [
      // Meat
      'beef',
      'steak',
      'ribeye',
      'sirloin',
      'filet mignon',
      'brisket',
      'ground beef',
      'pork',
      'bacon',
      'ham',
      'prosciutto',
      'pancetta',
      'sausage',
      'chorizo',
      'salami',
      'pepperoni',
      'hot dog',
      'bratwurst',
      'chicken',
      'turkey',
      'duck',
      'goose',
      'quail',
      'pheasant',
      'cornish hen',
      'lamb',
      'veal',
      'venison',
      'bison',
      'rabbit',
      'elk',
      'boar',
      'meat',
      'poultry',
      // Seafood
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
      'shrimp',
      'prawn',
      'crab',
      'lobster',
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
      'crawfish',
      'langoustine',
      // Dairy
      'milk',
      'cream',
      'butter',
      'cheese',
      'yogurt',
      'whey',
      'casein',
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
      'whipped cream',
      // Eggs
      'egg',
      'eggs',
      'egg white',
      'egg yolk',
      'mayonnaise',
      'mayo',
      'aioli',
      'meringue',
      'hollandaise',
      'bearnaise',
      'custard',
      'quiche',
      'frittata',
      // Other animal products
      'honey',
      'gelatin',
      'lard',
      'tallow',
      'suet',
      'bone broth',
      'bone marrow',
      'fish sauce',
      'oyster sauce',
      'worcestershire',
    ],
    cautionKeywords: [
      'brioche',
      'pasta',
      'noodles',
      'bread',
      'pastry',
      'cake',
      'cookie',
      'chocolate',
      'marshmallow',
      'gummy',
      'wine',
      'beer',
      'sugar',
      'pesto',
      'caesar',
      'ranch',
      'thousand island',
    ],
  },

  vegetarian: {
    label: 'Vegetarian',
    description: 'No meat, poultry, or seafood (dairy and eggs allowed)',
    violationKeywords: [
      // Meat
      'beef',
      'steak',
      'ribeye',
      'sirloin',
      'filet mignon',
      'brisket',
      'ground beef',
      'pork',
      'bacon',
      'ham',
      'prosciutto',
      'pancetta',
      'sausage',
      'chorizo',
      'salami',
      'pepperoni',
      'hot dog',
      'bratwurst',
      'chicken',
      'turkey',
      'duck',
      'goose',
      'quail',
      'pheasant',
      'cornish hen',
      'lamb',
      'veal',
      'venison',
      'bison',
      'rabbit',
      'elk',
      'boar',
      'meat',
      'poultry',
      // Seafood
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
      'shrimp',
      'prawn',
      'crab',
      'lobster',
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
      'crawfish',
      'langoustine',
      // Hidden animal products
      'gelatin',
      'lard',
      'tallow',
      'suet',
      'bone broth',
      'bone marrow',
      'fish sauce',
      'oyster sauce',
    ],
    cautionKeywords: [
      'worcestershire',
      'caesar',
      'pho',
      'ramen',
      'dashi',
      'marshmallow',
      'gummy',
      'wine',
      'beer',
    ],
  },

  pescatarian: {
    label: 'Pescatarian',
    description: 'No meat or poultry (fish, dairy, and eggs allowed)',
    violationKeywords: [
      'beef',
      'steak',
      'ribeye',
      'sirloin',
      'filet mignon',
      'brisket',
      'ground beef',
      'pork',
      'bacon',
      'ham',
      'prosciutto',
      'pancetta',
      'sausage',
      'chorizo',
      'salami',
      'pepperoni',
      'hot dog',
      'bratwurst',
      'chicken',
      'turkey',
      'duck',
      'goose',
      'quail',
      'pheasant',
      'cornish hen',
      'lamb',
      'veal',
      'venison',
      'bison',
      'rabbit',
      'elk',
      'boar',
      'meat',
      'poultry',
      'gelatin',
      'lard',
      'tallow',
      'suet',
      'bone broth',
      'bone marrow',
    ],
    cautionKeywords: ['broth', 'stock', 'demi-glace', 'gravy', 'worcestershire'],
  },

  keto: {
    label: 'Keto',
    description: 'Very low carb, high fat (under ~20-50g net carbs/day)',
    violationKeywords: [
      // Grains and starches
      'bread',
      'rice',
      'pasta',
      'noodles',
      'couscous',
      'bulgur',
      'farro',
      'oats',
      'oatmeal',
      'cereal',
      'granola',
      'flour',
      'cornstarch',
      'tortilla',
      'pita',
      'naan',
      'flatbread',
      'baguette',
      'roll',
      'bun',
      'crouton',
      'breadcrumb',
      'panko',
      'cracker',
      'potato',
      'potatoes',
      'sweet potato',
      'yam',
      'taro',
      'corn',
      'polenta',
      'grits',
      // Sugars
      'sugar',
      'brown sugar',
      'powdered sugar',
      'maple syrup',
      'honey',
      'agave',
      'molasses',
      'corn syrup',
      'caramel',
      // High-carb fruits
      'banana',
      'grape',
      'grapes',
      'mango',
      'pineapple',
      'dried fruit',
      'raisin',
      'raisins',
      'date',
      'dates',
      'fig',
      'figs',
      // Legumes
      'beans',
      'black beans',
      'kidney beans',
      'chickpea',
      'chickpeas',
      'lentil',
      'lentils',
      'hummus',
    ],
    cautionKeywords: [
      'apple',
      'orange',
      'pear',
      'peach',
      'plum',
      'cherry',
      'cherries',
      'milk',
      'yogurt',
      'tomato sauce',
      'ketchup',
      'bbq sauce',
      'balsamic',
      'teriyaki',
      'hoisin',
      'onion',
      'carrot',
      'beet',
      'beets',
      'squash',
      'pumpkin',
    ],
  },

  paleo: {
    label: 'Paleo',
    description: 'No grains, legumes, dairy, refined sugar, or processed foods',
    violationKeywords: [
      // Grains
      'bread',
      'rice',
      'pasta',
      'noodles',
      'oats',
      'oatmeal',
      'cereal',
      'flour',
      'wheat',
      'barley',
      'rye',
      'corn',
      'cornstarch',
      'tortilla',
      'pita',
      'naan',
      'couscous',
      'bulgur',
      'farro',
      'quinoa',
      'cracker',
      'breadcrumb',
      'panko',
      // Legumes
      'beans',
      'black beans',
      'kidney beans',
      'pinto beans',
      'navy beans',
      'chickpea',
      'chickpeas',
      'lentil',
      'lentils',
      'peanut',
      'peanuts',
      'peanut butter',
      'soybean',
      'tofu',
      'tempeh',
      'edamame',
      'hummus',
      // Dairy
      'milk',
      'cream',
      'butter',
      'cheese',
      'yogurt',
      'whey',
      'casein',
      'ice cream',
      'sour cream',
      'cream cheese',
      // Refined sugar and processed
      'sugar',
      'corn syrup',
      'agave',
      'artificial sweetener',
      'canola oil',
      'vegetable oil',
      'soybean oil',
      'margarine',
    ],
    cautionKeywords: [
      'honey',
      'maple syrup',
      'ghee',
      'potato',
      'white potato',
      'alcohol',
      'wine',
      'beer',
      'spirits',
    ],
  },

  whole30: {
    label: 'Whole30',
    description: 'No sugar, alcohol, grains, legumes, soy, or dairy for 30 days',
    violationKeywords: [
      // Grains
      'bread',
      'rice',
      'pasta',
      'noodles',
      'oats',
      'oatmeal',
      'cereal',
      'flour',
      'wheat',
      'barley',
      'rye',
      'corn',
      'cornstarch',
      'quinoa',
      'tortilla',
      'couscous',
      'bulgur',
      'farro',
      'cracker',
      // Legumes
      'beans',
      'black beans',
      'kidney beans',
      'chickpea',
      'chickpeas',
      'lentil',
      'lentils',
      'peanut',
      'peanuts',
      'peanut butter',
      'soybean',
      'tofu',
      'tempeh',
      'edamame',
      'hummus',
      // Dairy
      'milk',
      'cream',
      'butter',
      'cheese',
      'yogurt',
      'whey',
      'casein',
      'ghee',
      'ice cream',
      'sour cream',
      'cream cheese',
      // Sugar (all forms)
      'sugar',
      'brown sugar',
      'maple syrup',
      'honey',
      'agave',
      'molasses',
      'corn syrup',
      'stevia',
      'monk fruit',
      'artificial sweetener',
      // Soy
      'soy',
      'soy sauce',
      'tamari',
      'miso',
      // Alcohol
      'wine',
      'beer',
      'spirits',
      'vodka',
      'rum',
      'bourbon',
      'whiskey',
      'tequila',
      'sake',
      'mirin',
      // Processed
      'carrageenan',
      'msg',
      'sulfite',
    ],
    cautionKeywords: [
      'vinegar',
      'mustard',
      'ketchup',
      'bbq sauce',
      'worcestershire',
      'bacon',
      'sausage',
      'deli meat',
    ],
  },

  'gluten-free': {
    label: 'Gluten-Free',
    description: 'No wheat, barley, rye, or cross-contaminated grains',
    violationKeywords: [
      'wheat',
      'barley',
      'rye',
      'flour',
      'all-purpose flour',
      'bread flour',
      'cake flour',
      'pastry flour',
      'semolina',
      'spelt',
      'kamut',
      'triticale',
      'bread',
      'baguette',
      'roll',
      'bun',
      'crouton',
      'croutons',
      'breadcrumb',
      'panko',
      'pasta',
      'spaghetti',
      'linguine',
      'fettuccine',
      'noodles',
      'couscous',
      'bulgur',
      'farro',
      'soy sauce',
      'teriyaki',
      'beer',
      'malt',
      'malt vinegar',
      'cake',
      'cookie',
      'pastry',
      'pie crust',
      'dumpling',
      'wonton',
      'tortilla',
      'pita',
      'naan',
      'flatbread',
    ],
    cautionKeywords: [
      'oats',
      'oatmeal',
      'fried',
      'breaded',
      'crusted',
      'battered',
      'roux',
      'gravy',
      'thickened',
      'dusted',
      'seitan',
      'imitation crab',
    ],
  },

  'dairy-free': {
    label: 'Dairy-Free',
    description: 'No milk or milk-derived products',
    violationKeywords: [
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
      'whipped cream',
      'custard',
      'pudding',
    ],
    cautionKeywords: [
      'creamy',
      'au gratin',
      'bechamel',
      'alfredo',
      'carbonara',
      'ranch',
      'caesar',
      'chocolate',
      'caramel',
      'nougat',
    ],
  },

  'low-fodmap': {
    label: 'Low-FODMAP',
    description: 'Avoids fermentable carbs that trigger IBS symptoms',
    violationKeywords: [
      // High-FODMAP vegetables
      'garlic',
      'onion',
      'onions',
      'shallot',
      'shallots',
      'leek',
      'leeks',
      'artichoke',
      'asparagus',
      'cauliflower',
      'mushroom',
      'mushrooms',
      'snow peas',
      'sugar snap peas',
      // High-FODMAP fruits
      'apple',
      'apples',
      'pear',
      'pears',
      'mango',
      'watermelon',
      'cherry',
      'cherries',
      'peach',
      'peaches',
      'plum',
      'plums',
      'dried fruit',
      'raisin',
      'raisins',
      'date',
      'dates',
      'fig',
      'figs',
      // Legumes (high-FODMAP)
      'beans',
      'black beans',
      'kidney beans',
      'chickpea',
      'chickpeas',
      'lentil',
      'lentils',
      'hummus',
      // Dairy (lactose)
      'milk',
      'ice cream',
      'yogurt',
      'cream cheese',
      'ricotta',
      'condensed milk',
      'evaporated milk',
      // Sweeteners
      'honey',
      'agave',
      'high fructose corn syrup',
      'sorbitol',
      'mannitol',
      'xylitol',
      'maltitol',
      // Wheat in large amounts
      'bread',
      'pasta',
      'couscous',
      'cereal',
    ],
    cautionKeywords: [
      'avocado',
      'broccoli',
      'cabbage',
      'celery',
      'corn',
      'sweet potato',
      'coconut milk',
      'cream',
      'butter',
      'aged cheese',
    ],
  },

  kosher: {
    label: 'Kosher',
    description: 'Follows Jewish dietary laws (kashrut)',
    violationKeywords: [
      // Pork
      'pork',
      'bacon',
      'ham',
      'prosciutto',
      'pancetta',
      'sausage',
      'pepperoni',
      'salami',
      'hot dog',
      'bratwurst',
      'lard',
      // Shellfish
      'shrimp',
      'prawn',
      'crab',
      'lobster',
      'crawfish',
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
      // Other non-kosher
      'rabbit',
      'horse',
      'frog',
      'snail',
      'escargot',
    ],
    cautionKeywords: [
      // Meat + dairy combinations
      'cheeseburger',
      'chicken parmesan',
      'chicken alfredo',
      'cream sauce with meat',
      'butter with steak',
      // Gelatin (often pork-derived)
      'gelatin',
      'gummy',
      'marshmallow',
      'jello',
      // Wine needs to be kosher
      'wine',
      'champagne',
    ],
  },

  halal: {
    label: 'Halal',
    description: 'Follows Islamic dietary laws',
    violationKeywords: [
      // Pork
      'pork',
      'bacon',
      'ham',
      'prosciutto',
      'pancetta',
      'sausage',
      'pepperoni',
      'salami',
      'hot dog',
      'bratwurst',
      'lard',
      // Alcohol
      'wine',
      'beer',
      'spirits',
      'vodka',
      'rum',
      'bourbon',
      'whiskey',
      'tequila',
      'sake',
      'mirin',
      'champagne',
      // Other
      'gelatin',
      'vanilla extract',
    ],
    cautionKeywords: [
      // Meat must be halal-slaughtered
      'beef',
      'steak',
      'lamb',
      'chicken',
      'turkey',
      'duck',
      'veal',
      // Sauces with alcohol
      'marsala',
      'coq au vin',
      'beer batter',
      'rum cake',
      'tiramisu',
      'bourbon sauce',
      'wine reduction',
      'flambé',
    ],
  },

  'low-sodium': {
    label: 'Low-Sodium',
    description: 'Under 1500-2300mg sodium per day (heart health)',
    violationKeywords: [
      'soy sauce',
      'tamari',
      'fish sauce',
      'oyster sauce',
      'miso',
      'teriyaki',
      'bacon',
      'ham',
      'prosciutto',
      'pancetta',
      'salami',
      'pepperoni',
      'hot dog',
      'sausage',
      'corned beef',
      'pastrami',
      'pickle',
      'pickled',
      'caper',
      'capers',
      'olive',
      'olives',
      'anchovy',
      'anchovies',
      'bouillon',
      'stock cube',
    ],
    cautionKeywords: [
      'salt',
      'salted',
      'brined',
      'cured',
      'smoked',
      'cheese',
      'parmesan',
      'feta',
      'blue cheese',
      'bread',
      'tortilla',
      'ketchup',
      'mustard',
      'ranch',
      'canned',
      'frozen dinner',
    ],
  },

  'low-sugar': {
    label: 'Low-Sugar',
    description: 'Minimizes added and natural sugars (diabetic-friendly)',
    violationKeywords: [
      'sugar',
      'brown sugar',
      'powdered sugar',
      'cane sugar',
      'maple syrup',
      'honey',
      'agave',
      'molasses',
      'corn syrup',
      'high fructose corn syrup',
      'caramel',
      'candy',
      'chocolate',
      'fudge',
      'toffee',
      'cake',
      'cookie',
      'cookies',
      'brownie',
      'brownies',
      'ice cream',
      'sorbet',
      'gelato',
      'jam',
      'jelly',
      'marmalade',
      'preserves',
      'soda',
      'juice',
      'lemonade',
      'sweet tea',
    ],
    cautionKeywords: [
      'dried fruit',
      'raisin',
      'raisins',
      'date',
      'dates',
      'fig',
      'figs',
      'banana',
      'grape',
      'grapes',
      'mango',
      'pineapple',
      'ketchup',
      'bbq sauce',
      'teriyaki',
      'hoisin',
      'balsamic',
      'glazed',
      'candied',
      'sweetened',
      'granola',
      'yogurt',
      'smoothie',
    ],
  },
} as const

// ── All Diet IDs ─────────────────────────────────────────────────────────────

export const ALL_DIET_IDS = Object.keys(DIETARY_RULES) as DietId[]

export const DIET_LABELS: Record<DietId, string> = Object.fromEntries(
  ALL_DIET_IDS.map((id) => [id, DIETARY_RULES[id].label])
) as Record<DietId, string>

// ── Lookup Engine ────────────────────────────────────────────────────────────

/**
 * Check a single ingredient against a single diet.
 * Returns null if no violation, or the violation details.
 */
export function checkIngredientAgainstDiet(
  ingredient: string,
  dietId: DietId
): DietaryViolation | null {
  const rules = DIETARY_RULES[dietId]
  if (!rules) return null

  const lower = ingredient.toLowerCase().trim()

  // Check direct violations first
  for (const keyword of rules.violationKeywords) {
    if (lower.includes(keyword) || keyword.includes(lower)) {
      return {
        ingredient,
        level: 'violates',
        reason: `${ingredient} is not ${rules.label} (contains ${keyword})`,
      }
    }
  }

  // Check caution keywords
  for (const keyword of rules.cautionKeywords) {
    if (lower.includes(keyword) || keyword.includes(lower)) {
      return {
        ingredient,
        level: 'caution',
        reason: `${ingredient} may not be ${rules.label} (${keyword} - verify preparation)`,
      }
    }
  }

  return null
}

/**
 * Check a list of ingredients against a diet.
 * Returns all violations found.
 */
export function checkIngredientsAgainstDiet(
  ingredients: string[],
  dietId: DietId
): DietaryViolation[] {
  const violations: DietaryViolation[] = []
  for (const ingredient of ingredients) {
    const violation = checkIngredientAgainstDiet(ingredient, dietId)
    if (violation) violations.push(violation)
  }
  return violations
}

/**
 * Check a list of ingredients against ALL diets.
 * Returns a map of dietId -> violations.
 * Only includes diets that have at least one violation.
 */
export function checkIngredientsAgainstAllDiets(
  ingredients: string[]
): Record<DietId, DietaryViolation[]> {
  const results: Partial<Record<DietId, DietaryViolation[]>> = {}

  for (const dietId of ALL_DIET_IDS) {
    const violations = checkIngredientsAgainstDiet(ingredients, dietId)
    if (violations.length > 0) {
      results[dietId] = violations
    }
  }

  return results as Record<DietId, DietaryViolation[]>
}

/**
 * Auto-tag a recipe with compatible diets based on its ingredients.
 * Returns diet IDs that have ZERO violations (fully compatible).
 * Caution-level items are excluded from "compatible" (strict mode).
 */
export function getCompatibleDiets(ingredients: string[], strict: boolean = true): DietId[] {
  return ALL_DIET_IDS.filter((dietId) => {
    const violations = checkIngredientsAgainstDiet(ingredients, dietId)
    if (strict) {
      return violations.length === 0
    }
    // Lenient mode: only direct violations disqualify
    return !violations.some((v) => v.level === 'violates')
  })
}
