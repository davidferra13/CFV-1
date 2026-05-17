// Prep Time Estimator
// Deterministic prep time estimation based on component category, technique, and quantity.
// No AI. Pure formula.

// Base prep times in minutes by component category
const CATEGORY_BASE_MINUTES: Record<string, number> = {
  protein: 45,
  sauce: 30,
  starch: 20,
  vegetable: 15,
  fruit: 10,
  dessert: 60,
  garnish: 10,
  bread: 90,
  cheese: 15,
  condiment: 20,
  beverage: 10,
  other: 30,
}

// Technique multipliers: some techniques add significant time
const TECHNIQUE_MULTIPLIERS: Record<string, number> = {
  braise: 2.5,
  confit: 3.0,
  smoke: 3.0,
  ferment: 1.5,
  cure: 1.5,
  sous_vide: 2.0,
  slow_roast: 2.0,
  dehydrate: 2.5,
  marinate: 1.5,
  pickle: 1.2,
  temper: 1.8,
  laminate: 3.0,
  proof: 2.0,
  blanch: 0.8,
  saute: 0.7,
  grill: 0.8,
  fry: 0.9,
  roast: 1.3,
  steam: 0.8,
  poach: 1.0,
  bake: 1.5,
  reduce: 1.2,
}

// Quantity scaling: prep time scales sub-linearly with quantity.
// Doubling quantity does not double prep time (batch efficiency).
function quantityScale(quantity: number): number {
  if (quantity <= 1) return 1
  if (quantity <= 4) return 1 + (quantity - 1) * 0.15
  if (quantity <= 8) return 1.45 + (quantity - 4) * 0.1
  if (quantity <= 16) return 1.85 + (quantity - 8) * 0.05
  return 2.25 + (quantity - 16) * 0.02
}

/**
 * Estimate prep time for a single component.
 *
 * Priority:
 *   1. If recipe has prep_time_minutes, use that (most accurate)
 *   2. Otherwise, calculate from category + technique + quantity
 *
 * Returns estimated minutes, always >= 5 (minimum meaningful prep).
 */
export function estimatePrepMinutes(opts: {
  recipe_prep_time_minutes?: number | null
  category: string
  technique?: string | null
  quantity?: number
}): number {
  // Use recipe's known prep time if available
  if (opts.recipe_prep_time_minutes != null && opts.recipe_prep_time_minutes > 0) {
    // Scale by quantity if more than 1 serving batch
    const qty = opts.quantity ?? 1
    return Math.max(5, Math.round(opts.recipe_prep_time_minutes * quantityScale(qty)))
  }

  // Calculate from category and technique
  const base = CATEGORY_BASE_MINUTES[opts.category] ?? CATEGORY_BASE_MINUTES.other
  const techMultiplier = opts.technique
    ? (TECHNIQUE_MULTIPLIERS[opts.technique.toLowerCase()] ?? 1.0)
    : 1.0
  const qtyScale = quantityScale(opts.quantity ?? 1)

  return Math.max(5, Math.round(base * techMultiplier * qtyScale))
}

/**
 * Estimate total prep time for multiple components.
 * Returns total minutes.
 */
export function estimateTotalPrepMinutes(
  components: Array<{
    recipe_prep_time_minutes?: number | null
    category: string
    technique?: string | null
    quantity?: number
  }>
): number {
  return components.reduce((sum, comp) => sum + estimatePrepMinutes(comp), 0)
}
