// Yield Calculator: Prep loss and waste-adjusted costing
// All money in cents. All yields as integer percentages (0-100).
// Formula > AI: these are deterministic calculations, no LLM needed.

// ============================================
// COMMON YIELD PERCENTAGES
// Industry-standard yields for common prep actions.
// Chefs can override per recipe_ingredient.yield_pct.
// ============================================

export const COMMON_YIELDS: Record<string, { yieldPct: number; description: string }> = {
  // Vegetables
  peel: { yieldPct: 85, description: '~15% loss from skin removal' },
  dice: { yieldPct: 90, description: '~10% loss from trim and ends' },
  julienne: { yieldPct: 88, description: '~12% loss from precise cuts' },
  brunoise: { yieldPct: 85, description: '~15% loss from fine dice trim' },
  chiffonade: { yieldPct: 92, description: '~8% loss from herb strip cuts' },
  mince: { yieldPct: 93, description: '~7% loss from fine mincing' },
  supreme: { yieldPct: 60, description: '~40% loss from citrus segmenting' },
  tourner: { yieldPct: 50, description: '~50% loss from turned vegetable cuts' },
  core_and_seed: { yieldPct: 80, description: '~20% loss from core/seed removal' },

  // Proteins
  fillet: { yieldPct: 45, description: '~55% loss from whole fish to fillet' },
  debone: { yieldPct: 65, description: '~35% loss from bone removal' },
  trim: { yieldPct: 80, description: '~20% loss from fat/sinew trim' },
  portion: { yieldPct: 90, description: '~10% loss from portioning trim' },
  skin: { yieldPct: 90, description: '~10% loss from skin removal' },
  devein: { yieldPct: 92, description: '~8% loss from shrimp deveining' },
  shuck: { yieldPct: 15, description: '~85% loss from oyster/clam shells' },
  crack: { yieldPct: 25, description: '~75% loss from crab/lobster shell' },

  // Herbs
  pick: { yieldPct: 40, description: '~60% loss picking leaves from stems' },
  strip: { yieldPct: 50, description: '~50% loss stripping herb leaves' },

  // Fruits
  peel_and_core: { yieldPct: 70, description: '~30% loss from peeling + coring' },
  zest: { yieldPct: 5, description: '~95% of citrus unused (zest only)' },
  juice: { yieldPct: 35, description: '~65% of citrus unused (juice only)' },
  seed: { yieldPct: 85, description: '~15% loss from seed removal' },

  // Dairy
  strain: { yieldPct: 50, description: '~50% loss straining yogurt/ricotta' },
  clarify: { yieldPct: 75, description: '~25% loss from butter clarification' },
  skim: { yieldPct: 95, description: '~5% loss from skimming cream/stock' },

  // Grains & dry goods
  rinse: { yieldPct: 98, description: '~2% loss from rinsing grains' },
  sift: { yieldPct: 99, description: '~1% loss from sifting flour' },
  toast: { yieldPct: 95, description: '~5% moisture loss from toasting' },

  // Cooking methods that affect yield
  reduce: { yieldPct: 50, description: '~50% volume loss from reduction' },
  render: { yieldPct: 60, description: '~40% loss from fat rendering' },
  roast: { yieldPct: 75, description: '~25% moisture loss from roasting' },
  braise: { yieldPct: 65, description: '~35% shrinkage from braising' },
  grill: { yieldPct: 80, description: '~20% moisture loss from grilling' },
  saute: { yieldPct: 85, description: '~15% moisture loss from sauteing' },
  blanch: { yieldPct: 90, description: '~10% loss from blanching' },
  deep_fry: { yieldPct: 70, description: '~30% moisture loss from frying' },

  // No prep
  whole: { yieldPct: 100, description: 'No loss, used as-is' },
  as_is: { yieldPct: 100, description: 'No loss, used as-is' },
}

// ============================================
// CALCULATIONS
// ============================================

/**
 * Calculate usable product after prep.
 * @param rawQuantity - Amount purchased/raw
 * @param yieldPct - Yield percentage (1-100)
 * @returns Usable quantity after prep loss
 */
export function calculatePrepYield(rawQuantity: number, yieldPct: number): number {
  const effectiveYield = Math.max(1, Math.min(100, yieldPct))
  return Number(((rawQuantity * effectiveYield) / 100).toFixed(3))
}

/**
 * Calculate how much raw product to buy to get a target usable amount.
 * @param targetUsable - How much usable product you need
 * @param yieldPct - Yield percentage (1-100)
 * @returns Raw quantity to purchase
 */
export function calculateRawNeeded(targetUsable: number, yieldPct: number): number {
  const effectiveYield = Math.max(1, Math.min(100, yieldPct))
  return Number(((targetUsable * 100) / effectiveYield).toFixed(3))
}

/**
 * Calculate the true cost per usable unit after yield loss.
 * @param unitCostCents - Cost per raw unit in cents
 * @param yieldPct - Yield percentage (1-100)
 * @returns Cost per usable unit in cents
 */
export function calculateCostPerUsableUnit(unitCostCents: number, yieldPct: number): number {
  const effectiveYield = Math.max(1, Math.min(100, yieldPct))
  return Math.round((unitCostCents * 100) / effectiveYield)
}

/**
 * Calculate total cost for a recipe ingredient line, accounting for yield.
 * This is the core formula used everywhere:
 *   cost = (unitCost * quantity * 100) / yieldPct
 *
 * @param unitCostCents - Cost per unit of the ingredient in cents
 * @param quantity - Amount used in the recipe
 * @param yieldPct - Yield percentage (1-100, defaults to 100)
 * @returns Total cost in cents
 */
export function calculateCostWithYield(
  unitCostCents: number,
  quantity: number,
  yieldPct: number = 100
): number {
  const effectiveYield = Math.max(1, Math.min(100, yieldPct))
  return Math.round((unitCostCents * quantity * 100) / effectiveYield)
}

/**
 * Look up the default yield for a prep action.
 * Returns 100 (no loss) if the action is not recognized.
 */
export function getDefaultYieldForAction(prepAction: string): number {
  const normalized = prepAction.toLowerCase().replace(/[\s-]/g, '_')
  return COMMON_YIELDS[normalized]?.yieldPct ?? 100
}

/**
 * Get all available prep actions with their yields.
 * Useful for dropdown/autocomplete in the UI.
 */
export function getAllPrepActions(): Array<{
  action: string
  yieldPct: number
  description: string
}> {
  return Object.entries(COMMON_YIELDS).map(([action, data]) => ({
    action,
    yieldPct: data.yieldPct,
    description: data.description,
  }))
}

/**
 * Calculate the waste cost for a single ingredient line.
 * wastedCost = totalCost - (totalCost * yieldPct / 100)
 * Represents money spent on trim/waste.
 */
export function calculateWasteCost(
  unitCostCents: number,
  quantity: number,
  yieldPct: number = 100
): number {
  const totalRawCost = Math.round(unitCostCents * quantity)
  const totalWithYield = calculateCostWithYield(unitCostCents, quantity, yieldPct)
  return totalWithYield - totalRawCost
}

/**
 * Calculate food cost percentage for a recipe vs selling price.
 * @param recipeCostCents - Total recipe cost in cents
 * @param sellingPriceCents - Selling price in cents
 * @returns Percentage (0-100+), or null if selling price is 0
 */
export function calculateFoodCostPercentage(
  recipeCostCents: number,
  sellingPriceCents: number
): number | null {
  if (sellingPriceCents <= 0) return null
  return Number(((recipeCostCents / sellingPriceCents) * 100).toFixed(2))
}
