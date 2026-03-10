// Portioning Calculator
// Industry-standard per-person quantities for catering categories.
// Pure reference data + math. No AI.
//
// Sources: ACF (American Culinary Federation) catering guidelines,
// industry standard buffet/grazing portioning.

// ============================================
// PER-PERSON STANDARDS (in oz unless noted)
// ============================================

export interface PortionStandard {
  category: string
  label: string
  perPersonOz: number
  perPersonDisplay: string
  notes: string
  serviceStyles: ('buffet' | 'plated' | 'grazing' | 'cocktail' | 'family_style')[]
}

// These are industry standards for catering. Buffet/grazing portions are
// slightly higher than plated because guests self-serve and take more.
export const PORTION_STANDARDS: PortionStandard[] = [
  // Cheese & Charcuterie (grazing boards)
  {
    category: 'cheese',
    label: 'Cheese (total)',
    perPersonOz: 3,
    perPersonDisplay: '3 oz',
    notes: 'Mix of soft + hard. 3-4 varieties minimum.',
    serviceStyles: ['grazing', 'buffet', 'cocktail'],
  },
  {
    category: 'charcuterie',
    label: 'Cured meats',
    perPersonOz: 2,
    perPersonDisplay: '2 oz',
    notes: 'Prosciutto, salami, coppa, etc.',
    serviceStyles: ['grazing', 'buffet', 'cocktail'],
  },
  {
    category: 'crackers',
    label: 'Crackers & bread',
    perPersonOz: 2,
    perPersonDisplay: '2 oz (4-5 pieces)',
    notes: 'Mix of crackers, crostini, breadsticks.',
    serviceStyles: ['grazing', 'buffet', 'cocktail'],
  },
  {
    category: 'fruit',
    label: 'Fresh fruit',
    perPersonOz: 3,
    perPersonDisplay: '3 oz',
    notes: 'Grapes, berries, figs, dried fruit.',
    serviceStyles: ['grazing', 'buffet', 'cocktail'],
  },
  {
    category: 'nuts',
    label: 'Nuts & dried fruit',
    perPersonOz: 1,
    perPersonDisplay: '1 oz',
    notes: 'Marcona almonds, candied pecans, etc.',
    serviceStyles: ['grazing', 'buffet', 'cocktail'],
  },
  {
    category: 'olives_pickles',
    label: 'Olives & pickles',
    perPersonOz: 1.5,
    perPersonDisplay: '1.5 oz',
    notes: 'Castelvetrano, cornichons, peppers.',
    serviceStyles: ['grazing', 'buffet', 'cocktail'],
  },
  {
    category: 'dips_spreads',
    label: 'Dips & spreads',
    perPersonOz: 2,
    perPersonDisplay: '2 oz',
    notes: 'Hummus, honey, jam, mustard.',
    serviceStyles: ['grazing', 'buffet', 'cocktail'],
  },

  // Protein (main course / buffet)
  {
    category: 'protein_main',
    label: 'Protein (main)',
    perPersonOz: 6,
    perPersonDisplay: '6 oz (cooked weight)',
    notes: 'Beef, chicken, fish, pork. Pre-cook weight is ~8 oz.',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },
  {
    category: 'protein_appetizer',
    label: 'Protein (appetizer)',
    perPersonOz: 3,
    perPersonDisplay: '3 oz',
    notes: 'Shrimp cocktail, ceviche, tartare.',
    serviceStyles: ['buffet', 'plated', 'cocktail'],
  },

  // Sides
  {
    category: 'starch',
    label: 'Starch (rice, pasta, potato)',
    perPersonOz: 5,
    perPersonDisplay: '5 oz (cooked)',
    notes: 'Roughly 3/4 cup cooked.',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },
  {
    category: 'vegetable',
    label: 'Vegetables (side)',
    perPersonOz: 4,
    perPersonDisplay: '4 oz',
    notes: 'Roasted, grilled, or raw.',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },
  {
    category: 'salad',
    label: 'Salad',
    perPersonOz: 3,
    perPersonDisplay: '3 oz (about 1.5 cups)',
    notes: 'Dressed greens. Add 1 oz for hearty salad.',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },
  {
    category: 'bread_dinner',
    label: 'Dinner rolls / bread',
    perPersonOz: 2,
    perPersonDisplay: '1.5 rolls',
    notes: 'Plus butter.',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },

  // Dessert
  {
    category: 'dessert',
    label: 'Dessert',
    perPersonOz: 4,
    perPersonDisplay: '4 oz (one portion)',
    notes: 'Cake slice, tart, mousse, etc.',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },
  {
    category: 'dessert_mini',
    label: 'Mini desserts (cocktail)',
    perPersonOz: 3,
    perPersonDisplay: '3 pieces',
    notes: 'Bite-size: truffles, petit fours, cookies.',
    serviceStyles: ['cocktail', 'grazing'],
  },

  // Beverages
  {
    category: 'coffee_tea',
    label: 'Coffee / tea',
    perPersonOz: 8,
    perPersonDisplay: '8 oz (1 cup)',
    notes: '60% coffee, 40% tea typical split.',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },

  // Sauces
  {
    category: 'sauce',
    label: 'Sauce / gravy',
    perPersonOz: 2,
    perPersonDisplay: '2 oz',
    notes: 'Per protein. More for pasta sauce (3 oz).',
    serviceStyles: ['buffet', 'plated', 'family_style'],
  },
]

// ============================================
// CALCULATION
// ============================================

export interface PortionCalculation {
  category: string
  label: string
  perPersonOz: number
  perPersonDisplay: string
  totalOz: number
  totalLbs: number
  totalDisplay: string
  notes: string
}

/**
 * Calculate total quantities for a given guest count.
 * Optionally filter by service style.
 */
export function calculatePortions(guestCount: number, serviceStyle?: string): PortionCalculation[] {
  const standards = serviceStyle
    ? PORTION_STANDARDS.filter((s) => s.serviceStyles.includes(serviceStyle as any))
    : PORTION_STANDARDS

  return standards.map((std) => {
    const totalOz = std.perPersonOz * guestCount
    const totalLbs = totalOz / 16

    let totalDisplay: string
    if (totalOz >= 16) {
      const lbs = Math.floor(totalLbs)
      const remainingOz = Math.round(totalOz - lbs * 16)
      totalDisplay = remainingOz > 0 ? `${lbs} lb ${remainingOz} oz` : `${lbs} lb`
    } else {
      totalDisplay = `${Math.round(totalOz)} oz`
    }

    return {
      category: std.category,
      label: std.label,
      perPersonOz: std.perPersonOz,
      perPersonDisplay: std.perPersonDisplay,
      totalOz,
      totalLbs: Math.round(totalLbs * 10) / 10,
      totalDisplay,
      notes: std.notes,
    }
  })
}

/**
 * Get just the grazing board standards (cheese, charcuterie, crackers, fruit, etc.)
 */
export function calculateGrazingPortions(guestCount: number): PortionCalculation[] {
  return calculatePortions(guestCount, 'grazing')
}
