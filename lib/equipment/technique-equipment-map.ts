// Static mapping of cooking techniques/methods to required equipment.
// Used by packing list auto-generation to infer equipment needs from recipes and dishes.

export interface TechniqueEquipment {
  /** Keywords matched against recipe.method, recipe.equipment[], dish.description */
  keywords: string[]
  /** Equipment items this technique requires */
  items: { name: string; category: string; note?: string }[]
}

/**
 * Map of technique identifiers to their equipment requirements.
 * Keywords are matched case-insensitively against recipe methods, equipment arrays,
 * and dish descriptions.
 */
export const TECHNIQUE_EQUIPMENT_MAP: Record<string, TechniqueEquipment> = {
  sous_vide: {
    keywords: ['sous vide', 'sous-vide', 'immersion circulator', 'water bath'],
    items: [
      { name: 'Immersion circulator', category: 'cooking' },
      { name: 'Sous vide container', category: 'cooking' },
      { name: 'Vacuum sealer', category: 'prep' },
      { name: 'Vacuum bags', category: 'prep', note: 'Check stock before packing' },
    ],
  },
  brulee: {
    keywords: ['brulee', 'brulée', 'torch', 'caramelize sugar top'],
    items: [
      { name: 'Kitchen torch', category: 'cooking' },
      { name: 'Butane fuel canister', category: 'cooking', note: 'Verify fuel level' },
    ],
  },
  deep_fry: {
    keywords: ['deep fry', 'deep-fry', 'fried', 'frying', 'fryer', 'tempura'],
    items: [
      { name: 'Deep fryer or heavy pot', category: 'cooking' },
      { name: 'Fry thermometer', category: 'cooking' },
      { name: 'Spider strainer', category: 'cooking' },
      { name: 'Sheet pan with rack (draining)', category: 'prep' },
    ],
  },
  grill: {
    keywords: ['grill', 'grilled', 'charcoal', 'bbq', 'barbecue'],
    items: [
      { name: 'Portable grill', category: 'cooking', note: 'Only if venue lacks one' },
      { name: 'Grill tongs', category: 'cooking' },
      { name: 'Charcoal or propane', category: 'cooking' },
      { name: 'Grill brush', category: 'cooking' },
    ],
  },
  smoke: {
    keywords: ['smoke', 'smoked', 'smoking', 'smoker', 'wood chips'],
    items: [
      { name: 'Portable smoker or smoking gun', category: 'cooking' },
      { name: 'Wood chips', category: 'cooking' },
    ],
  },
  plated_fine_dining: {
    keywords: ['plated', 'fine dining', 'tasting menu', 'ring mold', 'tweezers'],
    items: [
      { name: 'Ring molds', category: 'plating' },
      { name: 'Plating tweezers', category: 'plating' },
      { name: 'Squeeze bottles', category: 'plating' },
      { name: 'Offset spatulas', category: 'plating' },
    ],
  },
  buffet: {
    keywords: ['buffet', 'family style', 'family-style', 'station'],
    items: [
      { name: 'Chafing dishes', category: 'service' },
      { name: 'Sterno fuel cans', category: 'service' },
      { name: 'Serving tongs and spoons', category: 'service' },
      { name: 'Platters', category: 'service' },
    ],
  },
  baking: {
    keywords: ['bake', 'baked', 'baking', 'pastry', 'oven'],
    items: [
      { name: 'Sheet pans', category: 'cooking' },
      { name: 'Parchment paper', category: 'prep' },
      { name: 'Cooling racks', category: 'prep' },
    ],
  },
  pasta: {
    keywords: ['pasta', 'noodle', 'fresh pasta', 'pasta machine', 'ravioli'],
    items: [
      { name: 'Pasta machine or rolling pin', category: 'prep' },
      { name: 'Large stock pot', category: 'cooking' },
      { name: 'Colander', category: 'prep' },
    ],
  },
  cold_prep: {
    keywords: ['ceviche', 'tartare', 'crudo', 'sashimi', 'carpaccio', 'cold prep'],
    items: [
      { name: 'Coolers with ice', category: 'transport' },
      { name: 'Insulated bags', category: 'transport' },
    ],
  },
  candy_chocolate: {
    keywords: ['temper', 'chocolate', 'candy', 'confection', 'praline'],
    items: [
      { name: 'Candy thermometer', category: 'cooking' },
      { name: 'Silicone molds', category: 'plating' },
      { name: 'Offset spatula', category: 'plating' },
    ],
  },
  cocktail: {
    keywords: ['cocktail', 'mixology', 'bar service', 'drinks'],
    items: [
      { name: 'Cocktail shaker set', category: 'service' },
      { name: 'Jigger', category: 'service' },
      { name: 'Bar spoon', category: 'service' },
      { name: 'Strainer', category: 'service' },
      { name: 'Ice bucket', category: 'service' },
    ],
  },
}

/**
 * Guest-count-driven scaling rules.
 * When guest count exceeds a threshold, additional equipment is recommended.
 */
export const GUEST_SCALE_EQUIPMENT: {
  minGuests: number
  items: { name: string; category: string; note: string }[]
}[] = [
  {
    minGuests: 12,
    items: [
      { name: 'Extra sheet pans', category: 'cooking', note: 'Volume production for 12+ guests' },
      { name: 'Hotel pans (full size)', category: 'cooking', note: 'Batch holding for 12+ guests' },
    ],
  },
  {
    minGuests: 20,
    items: [
      { name: 'Folding prep table', category: 'prep', note: 'Counter space for 20+ covers' },
      { name: 'Extra burner (portable)', category: 'cooking', note: 'Additional heat source for 20+ covers' },
      { name: 'Bus tubs', category: 'service', note: 'Cleanup at scale' },
    ],
  },
  {
    minGuests: 40,
    items: [
      { name: 'Speed racks', category: 'transport', note: 'Sheet pan storage for 40+ covers' },
      { name: 'Cambro containers', category: 'transport', note: 'Hot/cold transport for 40+ covers' },
    ],
  },
]

/**
 * Universal "always bring" items that every off-site event needs.
 */
export const UNIVERSAL_EQUIPMENT: { name: string; category: string; note: string }[] = [
  { name: 'Knife roll', category: 'prep', note: 'Essential for every event' },
  { name: 'Cutting boards (2+)', category: 'prep', note: 'Cross-contamination prevention' },
  { name: 'Towels (bar and kitchen)', category: 'misc', note: 'Always run out' },
  { name: 'Aprons', category: 'misc', note: 'Professional appearance' },
  { name: 'First aid kit', category: 'misc', note: 'Safety requirement' },
  { name: 'Trash bags', category: 'misc', note: 'Leave venue clean' },
  { name: 'Extension cord', category: 'misc', note: 'Outlets often far from prep area' },
  { name: 'Phone charger', category: 'misc', note: 'Communication lifeline' },
]

/**
 * Match text against technique keywords. Returns all matched technique keys.
 */
export function detectTechniques(texts: string[]): string[] {
  const combined = texts.join(' ').toLowerCase()
  const matched: string[] = []

  for (const [key, tech] of Object.entries(TECHNIQUE_EQUIPMENT_MAP)) {
    for (const kw of tech.keywords) {
      if (combined.includes(kw.toLowerCase())) {
        matched.push(key)
        break
      }
    }
  }

  return matched
}
