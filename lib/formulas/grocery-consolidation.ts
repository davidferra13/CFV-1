// Grocery Consolidation Formula - Deterministic
// Combines duplicate ingredients, assigns store sections, flags dietary conflicts.
// No AI needed for any of these: they're arithmetic, lookup tables, and keyword matching.
//
// Substitution suggestions use a curated lookup table of common swaps.
// This covers 90%+ of real private chef scenarios. If a chef needs something exotic,
// they already know the swap (they're the expert, not AI).

import { WEIGHT_CONVERSIONS, VOLUME_CONVERSIONS } from '@/lib/costing/knowledge'

//── Store Section Lookup ────────────────────────────────────────────────
// Maps ingredient names (lowercase) to store sections.
// Falls back to heuristic keyword matching for unknown ingredients.

const SECTION_MAP: Record<string, string> = {
  // Produce
  tomato: 'Produce',
  tomatoes: 'Produce',
  onion: 'Produce',
  onions: 'Produce',
  garlic: 'Produce',
  ginger: 'Produce',
  lemon: 'Produce',
  lemons: 'Produce',
  lime: 'Produce',
  limes: 'Produce',
  orange: 'Produce',
  oranges: 'Produce',
  potato: 'Produce',
  potatoes: 'Produce',
  carrot: 'Produce',
  carrots: 'Produce',
  celery: 'Produce',
  broccoli: 'Produce',
  cauliflower: 'Produce',
  spinach: 'Produce',
  kale: 'Produce',
  lettuce: 'Produce',
  arugula: 'Produce',
  cucumber: 'Produce',
  'bell pepper': 'Produce',
  jalapeño: 'Produce',
  mushroom: 'Produce',
  mushrooms: 'Produce',
  avocado: 'Produce',
  zucchini: 'Produce',
  squash: 'Produce',
  eggplant: 'Produce',
  corn: 'Produce',
  peas: 'Produce',
  'green beans': 'Produce',
  asparagus: 'Produce',
  artichoke: 'Produce',
  beet: 'Produce',
  beets: 'Produce',
  cabbage: 'Produce',
  'bok choy': 'Produce',
  scallion: 'Produce',
  scallions: 'Produce',
  shallot: 'Produce',
  shallots: 'Produce',
  fennel: 'Produce',
  radish: 'Produce',
  parsley: 'Produce',
  cilantro: 'Produce',
  basil: 'Produce',
  mint: 'Produce',
  rosemary: 'Produce',
  thyme: 'Produce',
  dill: 'Produce',
  chives: 'Produce',
  apple: 'Produce',
  apples: 'Produce',
  pear: 'Produce',
  banana: 'Produce',
  strawberry: 'Produce',
  strawberries: 'Produce',
  blueberry: 'Produce',
  blueberries: 'Produce',
  raspberry: 'Produce',
  raspberries: 'Produce',
  mango: 'Produce',
  pineapple: 'Produce',
  peach: 'Produce',
  grape: 'Produce',
  grapes: 'Produce',
  watermelon: 'Produce',
  cherry: 'Produce',
  cherries: 'Produce',

  // Proteins
  chicken: 'Proteins',
  'chicken breast': 'Proteins',
  'chicken thigh': 'Proteins',
  beef: 'Proteins',
  steak: 'Proteins',
  'ground beef': 'Proteins',
  pork: 'Proteins',
  'pork chop': 'Proteins',
  'pork loin': 'Proteins',
  bacon: 'Proteins',
  sausage: 'Proteins',
  lamb: 'Proteins',
  salmon: 'Proteins',
  tuna: 'Proteins',
  shrimp: 'Proteins',
  cod: 'Proteins',
  halibut: 'Proteins',
  scallops: 'Proteins',
  crab: 'Proteins',
  lobster: 'Proteins',
  mussels: 'Proteins',
  clams: 'Proteins',
  oysters: 'Proteins',
  duck: 'Proteins',
  turkey: 'Proteins',
  veal: 'Proteins',
  tofu: 'Proteins',
  tempeh: 'Proteins',
  seitan: 'Proteins',
  'ground turkey': 'Proteins',
  'ground pork': 'Proteins',

  // Dairy
  butter: 'Dairy',
  milk: 'Dairy',
  cream: 'Dairy',
  'heavy cream': 'Dairy',
  'sour cream': 'Dairy',
  'cream cheese': 'Dairy',
  yogurt: 'Dairy',
  'greek yogurt': 'Dairy',
  cheese: 'Dairy',
  parmesan: 'Dairy',
  mozzarella: 'Dairy',
  cheddar: 'Dairy',
  gruyere: 'Dairy',
  gouda: 'Dairy',
  brie: 'Dairy',
  feta: 'Dairy',
  ricotta: 'Dairy',
  mascarpone: 'Dairy',
  egg: 'Dairy',
  eggs: 'Dairy',
  'half and half': 'Dairy',
  'whipping cream': 'Dairy',
  buttermilk: 'Dairy',

  // Pantry
  flour: 'Pantry',
  sugar: 'Pantry',
  'brown sugar': 'Pantry',
  'powdered sugar': 'Pantry',
  salt: 'Pantry',
  pepper: 'Pantry',
  'olive oil': 'Pantry',
  'vegetable oil': 'Pantry',
  'canola oil': 'Pantry',
  'coconut oil': 'Pantry',
  'sesame oil': 'Pantry',
  vinegar: 'Pantry',
  'balsamic vinegar': 'Pantry',
  'rice vinegar': 'Pantry',
  'soy sauce': 'Pantry',
  'fish sauce': 'Pantry',
  worcestershire: 'Pantry',
  'hot sauce': 'Pantry',
  sriracha: 'Pantry',
  ketchup: 'Pantry',
  mustard: 'Pantry',
  mayonnaise: 'Pantry',
  honey: 'Pantry',
  'maple syrup': 'Pantry',
  vanilla: 'Pantry',
  'vanilla extract': 'Pantry',
  'baking powder': 'Pantry',
  'baking soda': 'Pantry',
  yeast: 'Pantry',
  cornstarch: 'Pantry',
  'cocoa powder': 'Pantry',
  chocolate: 'Pantry',
  rice: 'Pantry',
  pasta: 'Pantry',
  noodles: 'Pantry',
  quinoa: 'Pantry',
  couscous: 'Pantry',
  lentils: 'Pantry',
  chickpeas: 'Pantry',
  'black beans': 'Pantry',
  'kidney beans': 'Pantry',
  'canned tomatoes': 'Pantry',
  'tomato paste': 'Pantry',
  'tomato sauce': 'Pantry',
  'coconut milk': 'Pantry',
  broth: 'Pantry',
  stock: 'Pantry',
  'chicken broth': 'Pantry',
  'beef broth': 'Pantry',
  'vegetable broth': 'Pantry',
  breadcrumbs: 'Pantry',
  panko: 'Pantry',
  nuts: 'Pantry',
  almonds: 'Pantry',
  walnuts: 'Pantry',
  pecans: 'Pantry',
  'pine nuts': 'Pantry',
  cashews: 'Pantry',
  peanuts: 'Pantry',
  'dried cranberries': 'Pantry',
  raisins: 'Pantry',
  cumin: 'Pantry',
  paprika: 'Pantry',
  'smoked paprika': 'Pantry',
  oregano: 'Pantry',
  'chili powder': 'Pantry',
  cinnamon: 'Pantry',
  nutmeg: 'Pantry',
  'curry powder': 'Pantry',
  turmeric: 'Pantry',
  'bay leaf': 'Pantry',
  'bay leaves': 'Pantry',
  'red pepper flakes': 'Pantry',
  capers: 'Pantry',
  olives: 'Pantry',
  anchovy: 'Pantry',
  anchovies: 'Pantry',

  // Bakery
  bread: 'Bakery',
  baguette: 'Bakery',
  brioche: 'Bakery',
  'pita bread': 'Bakery',
  tortilla: 'Bakery',
  tortillas: 'Bakery',
  'pie crust': 'Bakery',
  'puff pastry': 'Bakery',
  croissant: 'Bakery',
  'hamburger buns': 'Bakery',
  'hot dog buns': 'Bakery',

  // Alcohol
  wine: 'Alcohol',
  'white wine': 'Alcohol',
  'red wine': 'Alcohol',
  beer: 'Alcohol',
  champagne: 'Alcohol',
  prosecco: 'Alcohol',
  vodka: 'Alcohol',
  rum: 'Alcohol',
  bourbon: 'Alcohol',
  whiskey: 'Alcohol',
  tequila: 'Alcohol',
  gin: 'Alcohol',
  brandy: 'Alcohol',
  'cooking wine': 'Alcohol',
  marsala: 'Alcohol',
  sherry: 'Alcohol',

  // Supplies
  'aluminum foil': 'Supplies',
  'plastic wrap': 'Supplies',
  'parchment paper': 'Supplies',
  napkins: 'Supplies',
  'paper towels': 'Supplies',
  gloves: 'Supplies',
  'trash bags': 'Supplies',
  skewers: 'Supplies',
  toothpicks: 'Supplies',
  'butcher twine': 'Supplies',
  cheesecloth: 'Supplies',
}

// Heuristic section assignment for ingredients not in the lookup table
const SECTION_KEYWORDS: [string[], string][] = [
  [['fresh', 'leaf', 'leaves', 'root', 'sprout', 'herb', 'fruit', 'berry'], 'Produce'],
  [['filet', 'fillet', 'loin', 'rib', 'wing', 'thigh', 'breast', 'ground', 'seafood'], 'Proteins'],
  [['cheese', 'cream', 'milk', 'yogurt', 'butter', 'egg'], 'Dairy'],
  [['oil', 'sauce', 'spice', 'dried', 'canned', 'powder', 'extract', 'seed', 'grain'], 'Pantry'],
  [['bread', 'roll', 'bun', 'pastry', 'dough'], 'Bakery'],
  [['wine', 'beer', 'liquor', 'liqueur', 'spirit'], 'Alcohol'],
  [['foil', 'wrap', 'bag', 'napkin', 'towel', 'glove', 'container'], 'Supplies'],
]

export function assignStoreSection(ingredientName: string): string {
  const lower = ingredientName.toLowerCase().trim()

  // Direct lookup first
  if (SECTION_MAP[lower]) return SECTION_MAP[lower]

  // Try partial match (e.g., "fresh basil" matches "basil")
  for (const [key, section] of Object.entries(SECTION_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return section
  }

  // Keyword heuristic
  for (const [keywords, section] of SECTION_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return section
  }

  return 'Pantry' // safe default
}

// ── Unit Normalization ──────────────────────────────────────────────────
// For consolidation, we normalize compatible units to a base unit so we can add quantities.

const UNIT_ALIASES: Record<string, string> = {
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  pinch: 'pinch',
  dash: 'dash',
  clove: 'clove',
  cloves: 'clove',
  bunch: 'bunch',
  bunches: 'bunch',
  piece: 'piece',
  pieces: 'piece',
  whole: 'piece',
  can: 'can',
  cans: 'can',
  head: 'head',
  heads: 'head',
  sprig: 'sprig',
  sprigs: 'sprig',
  slice: 'slice',
  slices: 'slice',
  '': 'piece',
}

// Conversion factors to a common unit within compatible groups (from canonical knowledge layer)
// Volume: everything to tbsp
const VOLUME_TO_TBSP: Record<string, number> = {
  tsp: 1 / VOLUME_CONVERSIONS.TBSP_TO_TSP,
  tbsp: 1,
  cup: VOLUME_CONVERSIONS.CUP_TO_ML / VOLUME_CONVERSIONS.TBSP_TO_ML,
  ml: 1 / VOLUME_CONVERSIONS.TBSP_TO_ML,
  l: VOLUME_CONVERSIONS.L_TO_ML / VOLUME_CONVERSIONS.TBSP_TO_ML,
}

// Weight: everything to oz
const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1,
  lb: WEIGHT_CONVERSIONS.LB_TO_OZ,
  g: 1 / WEIGHT_CONVERSIONS.OZ_TO_G,
  kg: WEIGHT_CONVERSIONS.KG_TO_LB * WEIGHT_CONVERSIONS.LB_TO_OZ,
}

function normalizeUnit(unit: string): string {
  return UNIT_ALIASES[unit.toLowerCase().trim()] ?? unit.toLowerCase().trim()
}

function canConvert(unitA: string, unitB: string): boolean {
  if (unitA === unitB) return true
  const bothVolume = unitA in VOLUME_TO_TBSP && unitB in VOLUME_TO_TBSP
  const bothWeight = unitA in WEIGHT_TO_OZ && unitB in WEIGHT_TO_OZ
  return bothVolume || bothWeight
}

function addQuantities(
  qtyA: number,
  unitA: string,
  qtyB: number,
  unitB: string
): { quantity: number; unit: string } {
  if (unitA === unitB) {
    return { quantity: qtyA + qtyB, unit: unitA }
  }

  // Convert to common base, then convert back to the larger unit
  if (unitA in VOLUME_TO_TBSP && unitB in VOLUME_TO_TBSP) {
    const totalTbsp = qtyA * VOLUME_TO_TBSP[unitA] + qtyB * VOLUME_TO_TBSP[unitB]
    // Pick the most readable unit
    if (totalTbsp >= 16) return { quantity: Math.round((totalTbsp / 16) * 100) / 100, unit: 'cup' }
    if (totalTbsp >= 1) return { quantity: Math.round(totalTbsp * 100) / 100, unit: 'tbsp' }
    return { quantity: Math.round(totalTbsp * 3 * 100) / 100, unit: 'tsp' }
  }

  if (unitA in WEIGHT_TO_OZ && unitB in WEIGHT_TO_OZ) {
    const totalOz = qtyA * WEIGHT_TO_OZ[unitA] + qtyB * WEIGHT_TO_OZ[unitB]
    if (totalOz >= 16) return { quantity: Math.round((totalOz / 16) * 100) / 100, unit: 'lb' }
    return { quantity: Math.round(totalOz * 100) / 100, unit: 'oz' }
  }

  // Can't convert - return as string sum
  return { quantity: qtyA + qtyB, unit: unitA }
}

// ── Dietary Flagging ────────────────────────────────────────────────────
// FDA Big 9 + common dietary restrictions

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  dairy: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'whey',
    'casein',
    'lactose',
    'ghee',
    'buttermilk',
    'half and half',
    'mascarpone',
    'ricotta',
    'mozzarella',
    'parmesan',
    'cheddar',
    'gruyere',
    'brie',
    'feta',
    'gouda',
    'sour cream',
    'cream cheese',
    'ice cream',
  ],
  gluten: [
    'flour',
    'bread',
    'pasta',
    'noodles',
    'couscous',
    'breadcrumbs',
    'panko',
    'soy sauce',
    'tortilla',
    'baguette',
    'brioche',
    'croissant',
    'puff pastry',
    'pie crust',
    'wheat',
    'barley',
    'rye',
    'seitan',
  ],
  shellfish: [
    'shrimp',
    'crab',
    'lobster',
    'scallops',
    'mussels',
    'clams',
    'oysters',
    'crawfish',
    'crayfish',
    'prawns',
  ],
  fish: [
    'salmon',
    'tuna',
    'cod',
    'halibut',
    'anchovy',
    'anchovies',
    'fish sauce',
    'sardine',
    'trout',
    'bass',
    'swordfish',
    'mahi',
  ],
  'tree nuts': [
    'almonds',
    'walnuts',
    'pecans',
    'cashews',
    'pine nuts',
    'pistachios',
    'macadamia',
    'hazelnuts',
    'brazil nuts',
  ],
  peanuts: ['peanuts', 'peanut', 'peanut butter', 'peanut oil'],
  soy: ['soy sauce', 'tofu', 'tempeh', 'edamame', 'miso', 'soy milk', 'soybean'],
  eggs: ['egg', 'eggs', 'mayonnaise'],
  sesame: ['sesame', 'sesame oil', 'tahini', 'sesame seeds'],
  vegan: [
    'butter',
    'milk',
    'cream',
    'cheese',
    'yogurt',
    'egg',
    'eggs',
    'honey',
    'ghee',
    'whey',
    'casein',
    'gelatin',
    'lard',
    'bacon',
    'chicken',
    'beef',
    'pork',
    'lamb',
    'duck',
    'turkey',
    'veal',
    'salmon',
    'tuna',
    'shrimp',
    'crab',
    'lobster',
    'scallops',
    'mussels',
    'clams',
    'oysters',
    'anchovy',
    'anchovies',
    'fish sauce',
    'sour cream',
    'cream cheese',
    'mayonnaise',
    'buttermilk',
    'half and half',
    'mascarpone',
    'ricotta',
    'mozzarella',
    'parmesan',
    'cheddar',
    'gruyere',
    'brie',
    'feta',
    'gouda',
  ],
  vegetarian: [
    'bacon',
    'chicken',
    'beef',
    'pork',
    'lamb',
    'duck',
    'turkey',
    'veal',
    'salmon',
    'tuna',
    'shrimp',
    'crab',
    'lobster',
    'scallops',
    'mussels',
    'clams',
    'oysters',
    'anchovy',
    'anchovies',
    'fish sauce',
    'lard',
    'gelatin',
  ],
}

// ── Common Substitutions ────────────────────────────────────────────────
// Curated from professional kitchen practice, not AI-generated.

const SUBSTITUTION_MAP: Record<string, Record<string, { sub: string; reason: string }>> = {
  dairy: {
    butter: { sub: 'Vegan butter or coconut oil', reason: 'Dairy-free fat substitute' },
    milk: { sub: 'Oat milk or almond milk', reason: 'Dairy-free liquid substitute' },
    cream: { sub: 'Coconut cream or cashew cream', reason: 'Dairy-free richness' },
    'heavy cream': { sub: 'Coconut cream', reason: 'Dairy-free, similar fat content' },
    'sour cream': { sub: 'Cashew cream or coconut yogurt', reason: 'Dairy-free tang' },
    'cream cheese': { sub: 'Vegan cream cheese', reason: 'Dairy-free spread' },
    yogurt: { sub: 'Coconut yogurt', reason: 'Dairy-free cultured substitute' },
    'greek yogurt': { sub: 'Coconut yogurt (strained)', reason: 'Dairy-free, similar texture' },
    cheese: { sub: 'Nutritional yeast or vegan cheese', reason: 'Dairy-free umami' },
    parmesan: { sub: 'Nutritional yeast', reason: 'Dairy-free, similar umami flavor' },
    mozzarella: { sub: 'Vegan mozzarella', reason: 'Dairy-free melting cheese' },
    buttermilk: { sub: 'Oat milk + 1 tbsp lemon juice per cup', reason: 'Dairy-free acidic milk' },
  },
  gluten: {
    flour: { sub: 'Almond flour, rice flour, or GF all-purpose', reason: 'Gluten-free baking' },
    bread: { sub: 'Gluten-free bread', reason: 'Gluten-free carb' },
    pasta: { sub: 'Rice noodles or GF pasta', reason: 'Gluten-free pasta' },
    noodles: { sub: 'Rice noodles or zucchini noodles', reason: 'Gluten-free alternative' },
    breadcrumbs: { sub: 'Crushed GF crackers or almond meal', reason: 'Gluten-free coating' },
    panko: { sub: 'GF panko or crushed rice cereal', reason: 'Gluten-free crispy coating' },
    'soy sauce': { sub: 'Tamari or coconut aminos', reason: 'Gluten-free soy alternative' },
    tortilla: { sub: 'Corn tortillas', reason: 'Naturally gluten-free' },
    couscous: { sub: 'Quinoa or cauliflower rice', reason: 'Gluten-free grain substitute' },
  },
  eggs: {
    egg: { sub: 'Flax egg (1 tbsp ground flax + 3 tbsp water per egg)', reason: 'Egg-free binder' },
    eggs: { sub: 'Flax eggs or commercial egg replacer', reason: 'Egg-free binder' },
    mayonnaise: { sub: 'Vegan mayo', reason: 'Egg-free condiment' },
  },
  vegan: {
    butter: { sub: 'Vegan butter or coconut oil', reason: 'Plant-based fat' },
    milk: { sub: 'Oat milk', reason: 'Plant-based milk' },
    cream: { sub: 'Coconut cream', reason: 'Plant-based richness' },
    'heavy cream': { sub: 'Coconut cream', reason: 'Plant-based, high fat' },
    cheese: { sub: 'Nutritional yeast or vegan cheese', reason: 'Plant-based umami' },
    egg: { sub: 'Flax egg', reason: 'Plant-based binder' },
    eggs: { sub: 'Flax eggs', reason: 'Plant-based binder' },
    honey: { sub: 'Maple syrup or agave', reason: 'Plant-based sweetener' },
    mayonnaise: { sub: 'Vegan mayo', reason: 'Plant-based condiment' },
    yogurt: { sub: 'Coconut yogurt', reason: 'Plant-based cultured' },
  },
}

export interface IngredientInput {
  recipeName: string
  ingredientName: string
  quantity: string
  unit: string
}

export interface ConsolidatedIngredient {
  name: string
  totalQuantity: string
  unit: string
  storeSection: string
  usedIn: string[]
  substitution: string | null
  substitutionReason: string | null
}

export interface GroceryConsolidationResult {
  ingredients: ConsolidatedIngredient[]
  bySection: Record<string, ConsolidatedIngredient[]>
  dietaryFlags: string[]
  shoppingNotes: string
  generatedAt: string
}

/**
 * Consolidate a list of recipe ingredients into a grouped, de-duped grocery list.
 * Pure formula: arithmetic for quantities, lookup tables for sections, keyword matching for flags.
 */
export function consolidateGroceryFormula(
  ingredients: IngredientInput[],
  restrictions: string[]
): GroceryConsolidationResult {
  // Normalize restrictions to lowercase for matching
  const normalizedRestrictions = restrictions.map((r) => r.toLowerCase().trim())

  // 1. Group by normalized ingredient name
  const groups = new Map<
    string,
    { quantities: { qty: number; unit: string }[]; recipes: Set<string> }
  >()

  for (const ing of ingredients) {
    const key = ing.ingredientName.toLowerCase().trim()
    if (!groups.has(key)) {
      groups.set(key, { quantities: [], recipes: new Set() })
    }
    const group = groups.get(key)!
    const qty = parseFloat(ing.quantity) || 0
    const unit = normalizeUnit(ing.unit)
    if (qty > 0) {
      group.quantities.push({ qty, unit })
    }
    group.recipes.add(ing.recipeName)
  }

  // 2. Consolidate quantities and build output
  const consolidated: ConsolidatedIngredient[] = []
  const dietaryFlags: string[] = []

  for (const [name, group] of groups) {
    // Consolidate quantities
    let totalQty = 0
    let finalUnit = ''

    if (group.quantities.length === 0) {
      // No quantity info
      totalQty = 0
      finalUnit = ''
    } else if (group.quantities.length === 1) {
      totalQty = group.quantities[0].qty
      finalUnit = group.quantities[0].unit
    } else {
      // Try to add compatible units
      let result = { quantity: group.quantities[0].qty, unit: group.quantities[0].unit }
      for (let i = 1; i < group.quantities.length; i++) {
        const next = group.quantities[i]
        if (canConvert(result.unit, next.unit)) {
          result = addQuantities(result.quantity, result.unit, next.qty, next.unit)
        } else {
          // Incompatible units - just add the number (best effort)
          result.quantity += next.qty
        }
      }
      totalQty = result.quantity
      finalUnit = result.unit
    }

    const totalQuantityStr = totalQty > 0 ? `${totalQty}` : ''
    const storeSection = assignStoreSection(name)
    const usedIn = Array.from(group.recipes)

    // Check dietary flags
    let substitution: string | null = null
    let substitutionReason: string | null = null

    for (const restriction of normalizedRestrictions) {
      const allergenKeywords = ALLERGEN_KEYWORDS[restriction]
      if (!allergenKeywords) continue

      const isConflict = allergenKeywords.some((kw) => name.includes(kw) || kw.includes(name))

      if (isConflict) {
        dietaryFlags.push(`${name} conflicts with ${restriction} restriction`)

        // Try to find a substitution
        const subs = SUBSTITUTION_MAP[restriction]
        if (subs) {
          // Try exact match, then partial match
          const subEntry = subs[name] ?? Object.entries(subs).find(([k]) => name.includes(k))?.[1]
          if (subEntry) {
            substitution = subEntry.sub
            substitutionReason = subEntry.reason
          }
        }
        break // one flag per ingredient is enough
      }
    }

    consolidated.push({
      name:
        ingredients.find((i) => i.ingredientName.toLowerCase().trim() === name)?.ingredientName ??
        name,
      totalQuantity: totalQuantityStr,
      unit: finalUnit,
      storeSection,
      usedIn,
      substitution,
      substitutionReason,
    })
  }

  // 3. Group by section
  const bySection: Record<string, ConsolidatedIngredient[]> = {}
  for (const ing of consolidated) {
    if (!bySection[ing.storeSection]) bySection[ing.storeSection] = []
    bySection[ing.storeSection].push(ing)
  }

  // 4. Shopping notes (deterministic, based on what's in the list)
  const notes: string[] = []
  if (bySection['Proteins']?.length) notes.push('Buy proteins last to keep cold chain intact.')
  if (bySection['Produce']?.length && bySection['Produce'].length > 5)
    notes.push('Check produce for ripeness; buy delicate herbs day-of if possible.')
  if (dietaryFlags.length > 0)
    notes.push(
      `${dietaryFlags.length} item(s) flagged for dietary conflicts. Review substitutions.`
    )

  return {
    ingredients: consolidated,
    bySection,
    dietaryFlags,
    shoppingNotes:
      notes.join(' ') || 'Standard shopping list. Check use-by dates on dairy and proteins.',
    generatedAt: new Date().toISOString(),
  }
}
