// Industry Benchmark Data - Deterministic Constants
// Curated from publicly available culinary education standards:
// CIA (Culinary Institute of America), ACF (American Culinary Federation),
// JWU (Johnson & Wales), NRA (National Restaurant Association), USDA yield data.
//
// Formula > AI. These are static lookup tables, not AI-generated.

import type { FoodCostRating, FoodCostRatingResult } from './food-cost-calculator'

// ── Food Cost % Benchmarks by Cuisine ───────────────────────────────────────
// Each cuisine has a target range (low-high) reflecting standard industry margins.
// Private chefs typically run 2-5% lower than restaurant benchmarks due to
// zero waste from known guest counts, no walk-in variability, and direct sourcing.

export type CuisineBenchmark = {
  cuisine: string
  targetLow: number // Lower bound of healthy range (%)
  targetHigh: number // Upper bound of healthy range (%)
  warningThreshold: number // Above this = warning
  notes: string
}

export const FOOD_COST_BY_CUISINE: Record<string, CuisineBenchmark> = {
  italian: {
    cuisine: 'Italian',
    targetLow: 26,
    targetHigh: 32,
    warningThreshold: 35,
    notes: 'Pasta dishes lower (20-25%), protein-heavy mains higher (30-35%)',
  },
  french: {
    cuisine: 'French',
    targetLow: 28,
    targetHigh: 35,
    warningThreshold: 38,
    notes: 'Fine dining protein costs drive higher range; butter and cream add up',
  },
  japanese: {
    cuisine: 'Japanese',
    targetLow: 30,
    targetHigh: 38,
    warningThreshold: 40,
    notes: 'Premium fish and imported ingredients push costs higher',
  },
  mexican: {
    cuisine: 'Mexican',
    targetLow: 22,
    targetHigh: 28,
    warningThreshold: 32,
    notes: 'Legume and grain-heavy bases keep costs low; proteins vary widely',
  },
  thai: {
    cuisine: 'Thai',
    targetLow: 24,
    targetHigh: 30,
    warningThreshold: 33,
    notes: 'Aromatic bases are cheap; seafood and premium proteins drive costs up',
  },
  indian: {
    cuisine: 'Indian',
    targetLow: 22,
    targetHigh: 28,
    warningThreshold: 32,
    notes: 'Spice-forward cuisine with legume bases keeps costs low',
  },
  chinese: {
    cuisine: 'Chinese',
    targetLow: 24,
    targetHigh: 30,
    warningThreshold: 33,
    notes: 'Wok cooking maximizes yield; specialty ingredients can spike costs',
  },
  korean: {
    cuisine: 'Korean',
    targetLow: 25,
    targetHigh: 32,
    warningThreshold: 35,
    notes: 'Banchan (side dishes) add volume cheaply; premium meats drive costs up',
  },
  mediterranean: {
    cuisine: 'Mediterranean',
    targetLow: 25,
    targetHigh: 30,
    warningThreshold: 34,
    notes: 'Olive oil, grains, and produce-forward keeps costs moderate',
  },
  american: {
    cuisine: 'American',
    targetLow: 25,
    targetHigh: 32,
    warningThreshold: 35,
    notes: 'Highly variable; comfort food lower, steakhouse style higher',
  },
  bbq: {
    cuisine: 'BBQ / Smokehouse',
    targetLow: 22,
    targetHigh: 28,
    warningThreshold: 32,
    notes: 'Low-cost cuts + long cook time = great margins; brisket is the outlier',
  },
  seafood: {
    cuisine: 'Seafood-focused',
    targetLow: 30,
    targetHigh: 38,
    warningThreshold: 42,
    notes: 'Highest food cost category; wild-caught and shellfish push costs up',
  },
  vegan: {
    cuisine: 'Vegan / Plant-Based',
    targetLow: 20,
    targetHigh: 26,
    warningThreshold: 30,
    notes:
      'Lowest food costs in the industry; specialty products (cashew cream, etc.) increase costs',
  },
  vegetarian: {
    cuisine: 'Vegetarian',
    targetLow: 22,
    targetHigh: 28,
    warningThreshold: 32,
    notes: 'Similar to vegan with dairy/egg additions; cheese can be expensive',
  },
  fusion: {
    cuisine: 'Fusion / Contemporary',
    targetLow: 26,
    targetHigh: 33,
    warningThreshold: 36,
    notes: 'Specialty imported ingredients and technique-heavy preparations',
  },
  pastry: {
    cuisine: 'Pastry / Baking',
    targetLow: 18,
    targetHigh: 25,
    warningThreshold: 30,
    notes: 'Flour, sugar, butter, eggs are cheap; labor is the real cost',
  },
  private_chef: {
    cuisine: 'Private Chef (General)',
    targetLow: 22,
    targetHigh: 30,
    warningThreshold: 35,
    notes: 'Zero waste advantage from known guest counts; direct sourcing reduces costs',
  },
}

/**
 * Get a food cost rating that accounts for cuisine type.
 * Falls back to generic private chef benchmarks if cuisine is unknown.
 */
export function getFoodCostRatingByCuisine(
  percentage: number,
  cuisineType?: string | null
): FoodCostRatingResult & { benchmark: CuisineBenchmark } {
  const key = cuisineType?.toLowerCase().replace(/[^a-z]/g, '') ?? 'private_chef'
  const benchmark = FOOD_COST_BY_CUISINE[key] ?? FOOD_COST_BY_CUISINE.private_chef

  let rating: FoodCostRating
  let label: string
  let color: string

  if (percentage < benchmark.targetLow) {
    rating = 'excellent'
    label = 'Excellent'
    color = 'text-green-500'
  } else if (percentage <= benchmark.targetHigh) {
    rating = 'good'
    label = 'Good'
    color = 'text-emerald-500'
  } else if (percentage <= benchmark.warningThreshold) {
    rating = 'fair'
    label = 'Fair'
    color = 'text-amber-500'
  } else {
    rating = 'high'
    label = 'High'
    color = 'text-red-500'
  }

  return { rating, label, color, benchmark }
}

// ── Yield Benchmarks by Ingredient Category ─────────────────────────────────
// Standard usable yield percentages after trimming, peeling, cooking loss, etc.
// Sources: USDA Agricultural Handbook No. 102, CIA Professional Chef textbook.
// Values represent the percentage of as-purchased weight that is usable.

export type YieldBenchmark = {
  category: string
  yieldPct: number // Average usable yield (0-100)
  yieldRange: [number, number] // Low-high range
  notes: string
}

export const YIELD_BY_CATEGORY: Record<string, YieldBenchmark> = {
  // Proteins
  beef_tenderloin: {
    category: 'Beef Tenderloin',
    yieldPct: 70,
    yieldRange: [65, 75],
    notes: 'Silver skin, chain, fat removal; higher for pre-trimmed',
  },
  beef_ribeye: {
    category: 'Beef Ribeye',
    yieldPct: 80,
    yieldRange: [75, 85],
    notes: 'Minimal trim; fat cap is often left for cooking',
  },
  beef_ground: {
    category: 'Ground Beef',
    yieldPct: 75,
    yieldRange: [70, 80],
    notes: 'Cooking shrinkage from fat rendering (depends on fat %)',
  },
  chicken_whole: {
    category: 'Whole Chicken',
    yieldPct: 65,
    yieldRange: [60, 70],
    notes: 'Bones + skin removal = ~35% loss; use carcass for stock',
  },
  chicken_breast: {
    category: 'Chicken Breast (boneless)',
    yieldPct: 85,
    yieldRange: [80, 90],
    notes: 'Minimal trim; ~15% cooking loss',
  },
  chicken_thigh: {
    category: 'Chicken Thigh (bone-in)',
    yieldPct: 70,
    yieldRange: [65, 75],
    notes: 'Bone + excess fat removal',
  },
  pork_loin: {
    category: 'Pork Loin',
    yieldPct: 80,
    yieldRange: [75, 85],
    notes: 'Minimal silverskin trim',
  },
  pork_shoulder: {
    category: 'Pork Shoulder',
    yieldPct: 65,
    yieldRange: [60, 70],
    notes: 'Bone, fat cap, and connective tissue removal',
  },
  lamb_rack: {
    category: 'Lamb Rack',
    yieldPct: 55,
    yieldRange: [50, 60],
    notes: 'Frenching + fat removal is significant',
  },
  salmon_fillet: {
    category: 'Salmon Fillet (skin-on)',
    yieldPct: 85,
    yieldRange: [80, 90],
    notes: 'Pin bones + belly trim; skin optional',
  },
  salmon_whole: {
    category: 'Whole Salmon',
    yieldPct: 55,
    yieldRange: [50, 60],
    notes: 'Head, bones, skin, belly = ~45% loss',
  },
  shrimp_shell_on: {
    category: 'Shrimp (shell-on)',
    yieldPct: 55,
    yieldRange: [50, 60],
    notes: 'Shell, head, vein removal; save shells for stock',
  },
  shrimp_peeled: {
    category: 'Shrimp (peeled)',
    yieldPct: 90,
    yieldRange: [85, 95],
    notes: 'Deveining only; minimal loss',
  },
  scallops: {
    category: 'Sea Scallops',
    yieldPct: 90,
    yieldRange: [85, 95],
    notes: 'Remove side muscle; very little trim',
  },

  // Produce
  onion: {
    category: 'Onion',
    yieldPct: 88,
    yieldRange: [85, 92],
    notes: 'Peel and root end removal',
  },
  garlic: {
    category: 'Garlic',
    yieldPct: 85,
    yieldRange: [80, 88],
    notes: 'Skin and root removal; varies by clove size',
  },
  potato: {
    category: 'Potato',
    yieldPct: 80,
    yieldRange: [75, 85],
    notes: 'Peeling loss; unpeeled = 95%+',
  },
  carrot: {
    category: 'Carrot',
    yieldPct: 82,
    yieldRange: [78, 88],
    notes: 'Peel and top removal; baby carrots = 95%+',
  },
  celery: {
    category: 'Celery',
    yieldPct: 75,
    yieldRange: [70, 80],
    notes: 'Base, leaves, and outer ribs removed',
  },
  bell_pepper: {
    category: 'Bell Pepper',
    yieldPct: 82,
    yieldRange: [78, 85],
    notes: 'Seeds, stem, and membrane removed',
  },
  tomato: {
    category: 'Tomato',
    yieldPct: 90,
    yieldRange: [85, 95],
    notes: 'Minimal waste unless seeding and peeling (then ~75%)',
  },
  lettuce: {
    category: 'Lettuce / Greens',
    yieldPct: 75,
    yieldRange: [65, 85],
    notes: 'Outer leaves, core, stems; highly variable by type',
  },
  mushroom: {
    category: 'Mushroom',
    yieldPct: 90,
    yieldRange: [85, 95],
    notes: 'Stem trim only; morels and chanterelles higher loss (cleaning)',
  },
  avocado: {
    category: 'Avocado',
    yieldPct: 65,
    yieldRange: [60, 70],
    notes: 'Large pit + skin = ~35% loss',
  },
  citrus: {
    category: 'Citrus (lemon, lime, orange)',
    yieldPct: 45,
    yieldRange: [40, 55],
    notes: 'Juice only = ~45%; with zest = ~55%; supremes = ~40%',
  },
  herbs_fresh: {
    category: 'Fresh Herbs',
    yieldPct: 60,
    yieldRange: [50, 75],
    notes: 'Stems removed; basil/mint higher yield than rosemary/thyme',
  },
  broccoli: {
    category: 'Broccoli',
    yieldPct: 70,
    yieldRange: [65, 80],
    notes: 'Thick stem removal; can use stems peeled for soups',
  },
  cauliflower: {
    category: 'Cauliflower',
    yieldPct: 65,
    yieldRange: [60, 72],
    notes: 'Core and leaves removed',
  },
  asparagus: {
    category: 'Asparagus',
    yieldPct: 70,
    yieldRange: [65, 80],
    notes: 'Woody end snap/trim; pencil asparagus higher yield',
  },
  corn: {
    category: 'Corn on Cob',
    yieldPct: 55,
    yieldRange: [50, 60],
    notes: 'Husk, silk, cob = ~45% loss; kernels only',
  },
}

/**
 * Look up yield benchmark by ingredient or category name.
 * Tries exact key match, then partial match.
 */
export function getYieldBenchmark(ingredientOrCategory: string): YieldBenchmark | null {
  const key = ingredientOrCategory
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z_]/g, '')

  if (key in YIELD_BY_CATEGORY) return YIELD_BY_CATEGORY[key]

  // Partial match
  for (const [k, v] of Object.entries(YIELD_BY_CATEGORY)) {
    if (key.includes(k) || k.includes(key)) return v
  }

  return null
}

// ── Portion Multipliers by Service Style ────────────────────────────────────
// How much MORE food to prepare relative to a standard plated dinner.
// Base = 1.0 (plated dinner with known guest count).

export type ServiceStyleBenchmark = {
  style: string
  multiplier: number // Multiply total food qty by this
  wasteExpected: number // Expected waste percentage (%)
  notes: string
}

export const PORTIONS_BY_SERVICE_STYLE: Record<string, ServiceStyleBenchmark> = {
  plated: {
    style: 'Plated Dinner',
    multiplier: 1.0,
    wasteExpected: 3,
    notes: 'Most controlled format; exact portions per guest',
  },
  family_style: {
    style: 'Family Style',
    multiplier: 1.15,
    wasteExpected: 8,
    notes: 'Guests serve themselves; prepare 10-20% extra for presentation and seconds',
  },
  buffet: {
    style: 'Buffet',
    multiplier: 1.25,
    wasteExpected: 12,
    notes: 'Must look abundant; guests take variable portions; plan for ~25% over plated',
  },
  cocktail: {
    style: 'Cocktail / Passed',
    multiplier: 0.75,
    wasteExpected: 5,
    notes: 'Lighter bites; 8-12 pieces per person over 2-3 hours',
  },
  tasting_menu: {
    style: 'Tasting Menu',
    multiplier: 0.85,
    wasteExpected: 4,
    notes: 'Small portions per course but 5-9 courses; total food is ~85% of plated',
  },
  stations: {
    style: 'Food Stations',
    multiplier: 1.3,
    wasteExpected: 15,
    notes: 'Similar to buffet but spread out; need visual abundance at each station',
  },
  brunch: {
    style: 'Brunch Service',
    multiplier: 1.1,
    wasteExpected: 8,
    notes: 'Lighter proteins but more variety; pastry and egg stations add volume',
  },
  meal_prep: {
    style: 'Meal Prep / Batch Cook',
    multiplier: 1.0,
    wasteExpected: 2,
    notes: 'Most efficient; exact portions packed; minimal waste',
  },
}

// ── Waste Benchmarks by Operation Type ──────────────────────────────────────
// Target waste percentages for different kitchen operation types.
// Waste = food purchased but not consumed by guests (includes trim, spoilage,
// overproduction, but NOT yield loss which is accounted separately).

export type WasteBenchmark = {
  operation: string
  targetPct: number // Target waste % of total food purchased
  acceptableMax: number // Above this = action needed
  notes: string
}

export const WASTE_BY_OPERATION: Record<string, WasteBenchmark> = {
  private_chef_dinner: {
    operation: 'Private Chef Dinner',
    targetPct: 3,
    acceptableMax: 6,
    notes: 'Known guest count = near-zero overproduction; trim waste is main source',
  },
  private_chef_meal_prep: {
    operation: 'Private Chef Meal Prep',
    targetPct: 2,
    acceptableMax: 5,
    notes: 'Batch cooking for known recipients; lowest waste category',
  },
  catering_small: {
    operation: 'Catering (under 50 guests)',
    targetPct: 5,
    acceptableMax: 10,
    notes: 'Moderate overproduction buffer needed; can adjust day-of',
  },
  catering_large: {
    operation: 'Catering (50+ guests)',
    targetPct: 8,
    acceptableMax: 15,
    notes: 'Larger buffers needed; more stations = more waste points',
  },
  restaurant: {
    operation: 'Restaurant',
    targetPct: 10,
    acceptableMax: 15,
    notes: 'Walk-in variability; NRA industry average is 4-10% of revenue',
  },
  bakery: {
    operation: 'Bakery',
    targetPct: 5,
    acceptableMax: 8,
    notes: 'End-of-day unsold goods; bread/pastry donation programs help',
  },
  food_truck: {
    operation: 'Food Truck',
    targetPct: 7,
    acceptableMax: 12,
    notes: 'Limited menu helps; weather and location variability hurts',
  },
}

/**
 * Get all available cuisine benchmark keys for UI dropdowns.
 */
export function getCuisineOptions(): Array<{ value: string; label: string }> {
  return Object.entries(FOOD_COST_BY_CUISINE).map(([key, b]) => ({
    value: key,
    label: b.cuisine,
  }))
}

/**
 * Get all service style options for UI dropdowns.
 */
export function getServiceStyleOptions(): Array<{ value: string; label: string }> {
  return Object.entries(PORTIONS_BY_SERVICE_STYLE).map(([key, b]) => ({
    value: key,
    label: b.style,
  }))
}
