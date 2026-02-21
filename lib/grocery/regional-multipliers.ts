// lib/grocery/regional-multipliers.ts
// BLS CPI Northeast division vs US average food price premiums (2026)
// Applied to national API prices (Spoonacular, Kroger) to nudge them toward NE levels.
// USDA NE prices are already regional -- do NOT apply multiplier to those.

export const NE_MULTIPLIER: Record<string, number> = {
  protein:    1.15,  // Meat/seafood: NE avg 15% above national
  produce:    1.18,  // Fresh produce: highest regional variation
  dairy:      1.12,  // Dairy: NE runs ~12% above national
  pantry:     1.05,  // Shelf-stable: lowest variation
  spice:      1.08,  // Spices: mild NE premium
  oil:        1.07,  // Oils: moderate premium
  alcohol:    1.10,  // Alcohol: NE excise taxes
  baking:     1.05,  // Baking basics: low variation
  frozen:     1.08,  // Frozen: moderate
  canned:     1.04,  // Canned: near-national
  fresh_herb: 1.20,  // Fresh herbs: highest premium (short shelf life)
  dry_herb:   1.08,
  condiment:  1.06,
  beverage:   1.10,
  specialty:  1.22,  // Specialty/artisan: highest premium
  other:      1.10,
}

export function getNeMultiplier(category: string | null | undefined): number {
  if (!category) return 1.10
  return NE_MULTIPLIER[category] ?? 1.10
}
