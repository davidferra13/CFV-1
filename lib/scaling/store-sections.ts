const STORE_SECTION_ORDER: Record<string, number> = {
  produce: 1,
  fresh_herb: 2,
  dairy: 3,
  protein: 4,
  frozen: 5,
  baking: 6,
  pantry: 7,
  canned: 8,
  spice: 9,
  dry_herb: 10,
  oil: 11,
  condiment: 12,
  alcohol: 13,
  beverage: 14,
  specialty: 15,
  other: 16,
}

const STORE_SECTION_LABELS: Record<string, string> = {
  produce: 'Produce',
  fresh_herb: 'Fresh Herbs',
  dairy: 'Dairy',
  protein: 'Protein / Meat',
  frozen: 'Frozen',
  baking: 'Baking',
  pantry: 'Pantry',
  canned: 'Canned Goods',
  spice: 'Spices',
  dry_herb: 'Dried Herbs',
  oil: 'Oils & Vinegars',
  condiment: 'Condiments',
  alcohol: 'Alcohol',
  beverage: 'Beverages',
  specialty: 'Specialty',
  other: 'Other',
}

export function getStoreSectionOrder(category: string): number {
  return STORE_SECTION_ORDER[category] ?? 99
}

export function getStoreSectionLabel(category: string): string {
  return STORE_SECTION_LABELS[category] ?? 'Other'
}
