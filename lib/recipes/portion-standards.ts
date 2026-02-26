// Culinary Portion Intelligence Library
// ──────────────────────────────────────────────────────────────────────────────
// Professional-grade portion standards, yield loss factors, and ingredient
// scaling exponents for a private-chef context (6–24 guests per dinner).
//
// Portion sizes follow classical culinary training:
//   Each course type has a standard cooked/served weight per guest.
//   Proteins include yield-loss guidance (raw → cooked conversion).
//
// Scaling exponents follow the sub-linear rule taught in culinary school:
//   As batch size grows, flavor compounds concentrate.
//   Seasonings and aromatics scale at 0.70–0.85 power, NOT 1:1.
//   Proteins and base liquids always scale linearly.
//   At 2× scale the difference is small. At 5× it's highly significant.

// ─── Course Positions ─────────────────────────────────────────────────────────

export const COURSE_POSITIONS = [
  'amuse',
  'appetizer',
  'first',
  'main',
  'side',
  'dessert',
  'full_meal',
] as const

export type CoursePosition = (typeof COURSE_POSITIONS)[number]

export const COURSE_POSITION_LABELS: Record<CoursePosition, string> = {
  amuse: 'Amuse-Bouche',
  appetizer: 'Appetizer / Passed',
  first: 'First Course',
  main: 'Main Course',
  side: 'Side Dish',
  dessert: 'Dessert',
  full_meal: 'Standalone / Full Meal',
}

// ─── Portion Info ─────────────────────────────────────────────────────────────

export type PortionInfo = {
  portionOz: number // standard cooked/served oz per guest
  portionNote: string // human-readable description of the standard
  rawFactor: number | null // multiply cooked oz × rawFactor = raw purchase oz
  rawNote: string | null // e.g. "25% cooking loss — buy ~8 oz raw per guest"
  totalOz: number // portionOz × guestCount
  totalLabel: string // formatted total e.g. "4.5 lbs cooked" or "6 cups"
  rawTotalLabel: string | null // formatted raw purchase total e.g. "5.8 lbs raw"
}

// ─── Portion Standards ───────────────────────────────────────────────────────
// [recipeCategory][coursePosition] → { oz, note, rawFactor?, rawNote? }
//
// portionOz = expected COOKED or SERVED weight per person in ounces
// rawFactor = multiply cooked_oz × rawFactor to get raw purchase oz

type RawStandard = {
  oz: number
  note: string
  rawFactor?: number
  rawNote?: string
}

const STANDARDS: Partial<Record<string, Partial<Record<CoursePosition, RawStandard>>>> = {
  protein: {
    amuse: {
      oz: 1.5,
      note: '1–2 oz cooked bite-size piece per guest',
      rawFactor: 1.33,
      rawNote: '~25% cooking loss — buy ~2 oz raw per guest',
    },
    appetizer: {
      oz: 2.5,
      note: '2–3 oz cooked — plated starter or passed bite',
      rawFactor: 1.3,
      rawNote: '~23% cooking loss',
    },
    first: {
      oz: 3.5,
      note: '3–4 oz cooked — first-course protein',
      rawFactor: 1.3,
      rawNote: '~23% cooking loss',
    },
    main: {
      oz: 6.0,
      note: '5–8 oz cooked — 6 oz is the industry standard for main course',
      rawFactor: 1.33,
      rawNote: '~25% cooking loss — buy ~8 oz raw per guest',
    },
    side: {
      oz: 2.0,
      note: '~2 oz cooked — protein as a supporting element',
      rawFactor: 1.25,
      rawNote: '~20% cooking loss',
    },
    full_meal: {
      oz: 7.0,
      note: '7–8 oz cooked — generous standalone protein entrée',
      rawFactor: 1.33,
      rawNote: '~25% cooking loss — buy ~9 oz raw per guest',
    },
  },

  soup: {
    amuse: { oz: 2.0, note: '2 oz (60 ml) — shooter or small cup amuse' },
    appetizer: { oz: 4.0, note: '4 oz (120 ml) — small appetizer bowl' },
    first: { oz: 6.0, note: '6 oz (180 ml) — standard first-course soup bowl' },
    main: { oz: 8.0, note: '8 oz (240 ml) — medium bowl' },
    full_meal: { oz: 12.0, note: '12 oz (355 ml) — hearty standalone soup meal' },
  },

  sauce: {
    amuse: { oz: 0.5, note: '1 tbsp (15 ml) — pool, drizzle, or dip' },
    appetizer: { oz: 1.0, note: '2 tbsp (30 ml) per plate' },
    first: { oz: 1.0, note: '2 tbsp (30 ml) — add 25% extra for reduction waste' },
    main: { oz: 1.5, note: '3 tbsp (45 ml) — make 20–25% extra (reduction waste)' },
    side: { oz: 1.0, note: '2 tbsp (30 ml) — dipping or drizzle accompaniment' },
    full_meal: { oz: 2.0, note: '4 tbsp (60 ml) — generous plated sauce' },
  },

  salad: {
    amuse: { oz: 1.5, note: '1.5 oz dressed — micro salad or amuse garnish' },
    appetizer: { oz: 2.5, note: '2–3 oz dressed — light passed or plated starter' },
    first: { oz: 3.0, note: '3 oz dressed — standard first-course salad' },
    main: { oz: 5.0, note: '4–6 oz dressed — main-course salad (no protein)' },
    side: { oz: 2.5, note: '2–3 oz dressed — side salad' },
    full_meal: { oz: 6.0, note: '6 oz dressed — generous standalone salad' },
  },

  starch: {
    appetizer: { oz: 2.0, note: '2 oz cooked starch element' },
    first: { oz: 3.0, note: '3 oz cooked — first-course starch' },
    main: { oz: 4.5, note: '4–5 oz cooked — standard starch accompaniment to protein' },
    side: { oz: 4.0, note: '4 oz cooked — side starch portion' },
    full_meal: { oz: 6.0, note: '6 oz cooked — hearty standalone starch dish' },
  },

  pasta: {
    appetizer: { oz: 2.5, note: '2.5 oz cooked (≈ 1.5 oz dry) — light pasta starter' },
    first: { oz: 3.0, note: '3 oz cooked (≈ 2 oz dry) — classic Italian first-course portion' },
    main: { oz: 5.0, note: '5 oz cooked (≈ 3 oz dry) — satisfying main-course pasta' },
    side: { oz: 3.0, note: '3 oz cooked (≈ 2 oz dry) — side pasta' },
    full_meal: { oz: 6.0, note: '6 oz cooked (≈ 4 oz dry) — generous pasta entrée' },
  },

  vegetable: {
    amuse: { oz: 1.5, note: '1.5 oz — raw crudité bite or cooked amuse garnish' },
    appetizer: { oz: 2.5, note: '2–3 oz cooked or raw per serve' },
    first: { oz: 3.0, note: '3 oz cooked — vegetable first course' },
    main: {
      oz: 4.0,
      note: '4 oz cooked — featured or side vegetable',
      rawFactor: 1.15,
      rawNote: '~12% trim and cooking loss',
    },
    side: {
      oz: 4.0,
      note: '4 oz cooked — standard vegetable side',
      rawFactor: 1.15,
      rawNote: '~12% trim and cooking loss',
    },
    full_meal: { oz: 6.0, note: '6 oz cooked — vegetable main course (larger portion)' },
  },

  dessert: {
    amuse: { oz: 1.5, note: '1.5 oz — mignardise, pre-dessert bite, or palate cleanser' },
    appetizer: { oz: 2.0, note: '2 oz — light sweet starter or intermezzo' },
    dessert: { oz: 4.0, note: '4 oz — standard plated dessert portion' },
    full_meal: { oz: 5.0, note: '5 oz — generous standalone dessert (e.g., dessert dinner)' },
  },

  appetizer: {
    amuse: { oz: 1.5, note: '1–2 oz per piece — 1 to 2 pieces per guest' },
    appetizer: { oz: 3.5, note: '3–4 oz — plated appetizer or per-person board portion' },
    first: { oz: 4.0, note: '4 oz — substantial appetizer-style first course' },
    full_meal: { oz: 6.0, note: '6 oz — appetizer as a light standalone meal' },
  },

  bread: {
    appetizer: { oz: 1.5, note: '1–2 rolls, or 2 slices per guest' },
    first: { oz: 2.0, note: '2 oz — bread course with butter or accompaniment' },
    main: { oz: 1.5, note: '1–2 slices served alongside the main' },
    side: { oz: 1.5, note: '1–2 pieces as table bread' },
    full_meal: { oz: 3.0, note: '3 oz — generous bread service' },
  },

  condiment: {
    amuse: { oz: 0.5, note: '½ tbsp per guest' },
    appetizer: { oz: 0.5, note: '½–1 tbsp per guest' },
    first: { oz: 0.75, note: '1½ tsp per guest' },
    main: { oz: 0.5, note: '½–1 tbsp per guest alongside the main' },
    side: { oz: 0.5, note: '½ tbsp per guest' },
    full_meal: { oz: 1.0, note: '1 tbsp (larger standalone condiment portion)' },
  },

  fruit: {
    amuse: { oz: 1.5, note: '1.5 oz fresh or prepared fruit element' },
    appetizer: { oz: 2.5, note: '2–3 oz fruit appetizer component' },
    dessert: { oz: 3.5, note: '3–4 oz fruit dessert component' },
    side: { oz: 3.0, note: '3 oz fruit accompaniment' },
    full_meal: { oz: 5.0, note: '5 oz fruit plate or standalone dessert' },
  },
}

// ─── Public: Get Portion Info ─────────────────────────────────────────────────

export function getPortionInfo(
  recipeCategory: string,
  coursePosition: CoursePosition,
  guestCount: number
): PortionInfo | null {
  const cat = STANDARDS[recipeCategory]
  if (!cat) return null
  const std = cat[coursePosition]
  if (!std) return null

  const totalOz = std.oz * guestCount
  const rawTotalOz = std.rawFactor ? totalOz * std.rawFactor : null

  return {
    portionOz: std.oz,
    portionNote: std.note,
    rawFactor: std.rawFactor ?? null,
    rawNote: std.rawNote ?? null,
    totalOz,
    totalLabel: formatOz(totalOz, guestCount, std.oz),
    rawTotalLabel: rawTotalOz
      ? formatOz(rawTotalOz, guestCount, std.oz * (std.rawFactor ?? 1)) + ' raw'
      : null,
  }
}

// ─── Ingredient Scaling Exponents ─────────────────────────────────────────────
//
// These exponents govern how each ingredient CATEGORY scales when you
// multiply a recipe. A value of 1.0 = perfectly linear (buy exactly N×).
// A value of 0.75 = highly sub-linear (flavor concentrates at large scale).
//
// Reference: as a recipe scales from 4→20 portions (5× scale):
//   exponent 1.00: 1 tsp → 5 tsp        (linear)
//   exponent 0.90: 1 tsp → 4.22 tsp     (slightly sub-linear)
//   exponent 0.80: 1 tsp → 3.62 tsp     (sub-linear)
//   exponent 0.75: 1 tsp → 3.34 tsp     (highly sub-linear)
//
// Rule of thumb: when scaling 2× or less, the difference is small.
// When scaling 4× or more, ALWAYS use sub-linear for aromatics and spices.

type ScalingRule = {
  exponent: number
  label: string // short display label
  reason: string // full chef-readable explanation
}

const SCALING_RULES: Record<string, ScalingRule> = {
  protein: {
    exponent: 1.0,
    label: 'linear',
    reason: 'Always buy by weight per guest — protein scales 1:1, no exceptions.',
  },
  produce: {
    exponent: 1.0,
    label: 'linear',
    reason: 'Vegetables and garnish scale linearly by weight.',
  },
  dairy: {
    exponent: 0.92,
    label: 'near-linear',
    reason:
      'Cream and butter slightly concentrate in larger batches — start with ~90–92% and taste.',
  },
  pantry: {
    exponent: 0.85,
    label: 'sub-linear',
    reason:
      'Pantry items (stocks, canned goods, vinegars) are more efficient at scale — use 80–88%.',
  },
  spice: {
    exponent: 0.75,
    label: 'highly sub-linear',
    reason:
      'Spice flavor intensifies with batch size. At 4× scale use ~3× spice, not 4×. Taste and adjust.',
  },
  oil: {
    exponent: 0.88,
    label: 'sub-linear',
    reason: 'Cooking fat coats larger volumes more efficiently — less oil needed proportionally.',
  },
  alcohol: {
    exponent: 0.9,
    label: 'slightly sub-linear',
    reason: 'Wine and spirits concentrate as liquid reduces — flavor compounds carry further.',
  },
  baking: {
    exponent: 1.0,
    label: 'linear (chemistry)',
    reason: 'Baking is chemistry — NEVER sub-scale leavening, eggs, or ratios. Always linear.',
  },
  frozen: {
    exponent: 1.0,
    label: 'linear',
    reason: 'Frozen proteins and vegetables scale linearly by weight.',
  },
  canned: {
    exponent: 0.95,
    label: 'near-linear',
    reason: 'Canned goods are near-linear — slight efficiency at large scale.',
  },
  fresh_herb: {
    exponent: 0.9,
    label: 'slightly sub-linear',
    reason:
      'Visual garnish uses are near-linear; flavoring uses concentrate — split the difference.',
  },
  dry_herb: {
    exponent: 0.75,
    label: 'highly sub-linear',
    reason: 'Dried herbs concentrate like spices. At 4× scale use ~3×, not 4×. Taste and adjust.',
  },
  condiment: {
    exponent: 0.8,
    label: 'sub-linear',
    reason:
      'Mustard, Worcestershire, fish sauce, hot sauce — punch-above-weight ingredients. Use 75–85%.',
  },
  beverage: {
    exponent: 1.0,
    label: 'linear',
    reason: 'Beverages always scale 1:1.',
  },
  specialty: {
    exponent: 0.85,
    label: 'sub-linear',
    reason: 'Specialty ingredients tend to be flavor-forward — use 80–88% and taste.',
  },
  other: {
    exponent: 0.9,
    label: 'slightly sub-linear',
    reason: 'Default assumption for unclassified ingredients.',
  },
}

// ─── Public: Smart Scale ─────────────────────────────────────────────────────

/**
 * Apply professional sub-linear scaling to an ingredient quantity.
 *
 * @param base          The original recipe quantity (at scale 1.0)
 * @param scaleFactor   Target scale multiplier (e.g. 2.5 = making 2.5× the recipe)
 * @param ingredientCategory  The ingredient's category (determines exponent)
 * @returns             The scaled quantity, accounting for sub-linear concentration
 */
export function smartScale(base: number, scaleFactor: number, ingredientCategory: string): number {
  if (scaleFactor <= 0 || scaleFactor === 1) return base
  const rule = SCALING_RULES[ingredientCategory] ?? SCALING_RULES.other
  return base * Math.pow(scaleFactor, rule.exponent)
}

export function getScalingExponent(ingredientCategory: string): number {
  return (SCALING_RULES[ingredientCategory] ?? SCALING_RULES.other).exponent
}

export function getScalingLabel(ingredientCategory: string): string {
  return (SCALING_RULES[ingredientCategory] ?? SCALING_RULES.other).label
}

export function getScalingReason(ingredientCategory: string): string {
  return (SCALING_RULES[ingredientCategory] ?? SCALING_RULES.other).reason
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Format a total oz amount into the most useful chef unit. */
function formatOz(totalOz: number, guestCount: number, portionOz: number): string {
  const breakdown = `${fmtNum(portionOz)} oz × ${guestCount} guests`

  if (totalOz >= 32) {
    const lbs = totalOz / 16
    return `${fmtNum(lbs)} lbs (${breakdown})`
  }
  if (totalOz >= 8) {
    const cups = totalOz / 8
    const cupsStr = Number.isInteger(cups)
      ? `${cups} cup${cups !== 1 ? 's' : ''}`
      : `${fmtNum(totalOz)} oz`
    return `${cupsStr} (${breakdown})`
  }
  return `${fmtNum(totalOz)} oz (${breakdown})`
}

function fmtNum(n: number): string {
  return parseFloat(n.toFixed(2)).toString()
}

/** Format a scaled quantity as a culinary fraction string. */
export function formatScaledQty(qty: number): string {
  if (qty === 0) return '0'
  const fractions: [number, string][] = [
    [0.125, '⅛'],
    [0.25, '¼'],
    [0.333, '⅓'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [0.667, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
  ]
  const whole = Math.floor(qty)
  const dec = qty - whole
  for (const [val, frac] of fractions) {
    if (Math.abs(dec - val) < 0.04) {
      return whole > 0 ? `${whole} ${frac}` : frac
    }
  }
  return parseFloat(qty.toFixed(2)).toString()
}
