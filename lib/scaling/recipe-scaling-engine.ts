// Recipe Scaling Engine - Deterministic (Formula > AI)
// Single source of truth for all recipe quantity scaling.
// Replaces duplicated linear formulas across 5 consumers.
//
// Handles: guest-count scaling, service style multipliers,
// category-aware non-linear scaling, yield adjustment,
// waste buffer, and pack rounding.
//
// All computation is pure math. No LLM calls, no network, no DB.

import { PORTIONS_BY_SERVICE_STYLE } from '@/lib/finance/industry-benchmarks'

// ── Types ────────────────────────────────────────────────────────────────

export type ScalingCategory = 'linear' | 'sublinear' | 'fixed' | 'by_pan'

export type ScalingContext = {
  guestCount: number
  recipeServings: number
  componentScaleFactor: number
  serviceStyle: string
  scalingCategory: ScalingCategory
}

export type ScalingOptions = {
  yieldPct?: number // ingredient yield percentage (1-100, default 100)
  wasteBufferPct?: number // override waste buffer (default from service style)
  minOrderQty?: number // minimum order quantity from vendor
  packSize?: number // vendor pack size for rounding
}

export type ScaledResult = {
  recipeQty: number // original recipe quantity
  scaledQty: number // after guest/service/category scaling
  yieldAdjustedQty: number // after yield adjustment (AP quantity)
  bufferedQty: number // after waste buffer
  roundedQty: number // after pack rounding (final buy quantity)
  compositeMultiplier: number // total multiplier applied to recipeQty
}

// ── Default Category Map ─────────────────────────────────────────────────
// Maps ingredient_category to scaling behavior.
// Overridden by ingredients.scaling_category when set.

const DEFAULT_SCALING_MAP: Record<string, ScalingCategory> = {
  protein: 'linear',
  produce: 'linear',
  dairy: 'linear',
  pantry: 'linear',
  spice: 'sublinear',
  dry_herb: 'sublinear',
  fresh_herb: 'sublinear',
  oil: 'by_pan',
  baking: 'linear',
  frozen: 'linear',
  canned: 'linear',
  condiment: 'sublinear',
  beverage: 'linear',
  specialty: 'linear',
  other: 'linear',
  alcohol: 'linear',
}

export { DEFAULT_SCALING_MAP }

// ── Category Scaling Modifier ────────────────────────────────────────────

/**
 * Apply category-specific scaling modifier to a base multiplier.
 *
 * - linear: no change (proteins, produce, dairy)
 * - sublinear: 75-90% of linear (seasonings, spices, herbs, condiments)
 *   Formula: 0.75 + 0.25 / sqrt(mult), clamped to [0.75, 1.0]
 *   At 1x: 1.0 (no change), at 2x: ~0.93, at 4x: ~0.875, at 10x: ~0.83
 * - fixed: stays at 1.0 regardless of multiplier (bay leaves, vanilla beans)
 * - by_pan: rounds up to pan capacity increments (future: configurable per recipe)
 */
function applyCategoryModifier(baseMultiplier: number, category: ScalingCategory): number {
  switch (category) {
    case 'linear':
      return baseMultiplier

    case 'sublinear': {
      if (baseMultiplier <= 1) return baseMultiplier
      // Sublinear curve: converges toward 0.75 of linear as scale increases
      const modifier = Math.min(1.0, 0.75 + 0.25 / Math.sqrt(baseMultiplier))
      return baseMultiplier * modifier
    }

    case 'fixed':
      return 1.0

    case 'by_pan': {
      // Round up to whole-pan increments
      // Default pan capacity = 1 batch (future: per-recipe pan config)
      return Math.ceil(baseMultiplier)
    }

    default:
      return baseMultiplier
  }
}

// ── Pack Rounding ────────────────────────────────────────────────────────

// Units that are countable (can not buy fractional amounts)
const COUNT_UNITS = new Set([
  'each',
  'ea',
  'bunch',
  'bunches',
  'head',
  'heads',
  'can',
  'cans',
  'bottle',
  'bottles',
  'bag',
  'bags',
  'box',
  'boxes',
  'package',
  'packages',
  'pack',
  'packs',
  'piece',
  'pieces',
  'clove',
  'cloves',
  'dozen',
  'loaf',
  'loaves',
  'jar',
  'jars',
])

const WEIGHT_UNITS = new Set(['oz', 'lb', 'lbs', 'g', 'kg', 'ounce', 'pound', 'gram', 'kilogram'])

const VOLUME_UNITS = new Set([
  'tsp',
  'tbsp',
  'cup',
  'cups',
  'ml',
  'l',
  'pint',
  'quart',
  'gallon',
  'fl_oz',
  'dl',
  'liter',
  'litre',
])

/**
 * Round a quantity up to a practical purchase amount.
 * Count units: whole numbers. Weight: nearest 0.25. Volume: nearest 0.5.
 * Custom pack size overrides all.
 */
export function roundToPackSize(qty: number, unit: string, packSize?: number | null): number {
  if (qty <= 0) return 0

  // Custom pack size takes priority
  if (packSize && packSize > 0) {
    return Math.ceil(qty / packSize) * packSize
  }

  const unitLower = unit.toLowerCase().trim()

  if (COUNT_UNITS.has(unitLower)) {
    return Math.ceil(qty)
  }

  if (WEIGHT_UNITS.has(unitLower)) {
    // Round up to nearest 0.25
    return Math.ceil(qty * 4) / 4
  }

  if (VOLUME_UNITS.has(unitLower)) {
    // Round up to nearest 0.5
    return Math.ceil(qty * 2) / 2
  }

  // Unknown unit: round to 2 decimal places (ceiling)
  return Math.ceil(qty * 100) / 100
}

// ── Core Scaling Function ────────────────────────────────────────────────

/**
 * Compute the scaled quantity for a recipe ingredient given full context.
 *
 * Pipeline: base qty -> guest scaling -> service style -> category modifier
 *           -> yield adjustment -> waste buffer -> pack rounding
 *
 * All steps are deterministic. Same inputs = same outputs.
 */
export function computeScaledQuantity(
  baseQty: number,
  context: ScalingContext,
  unit: string = 'each',
  options: ScalingOptions = {}
): ScaledResult {
  const { guestCount, recipeServings, componentScaleFactor, serviceStyle, scalingCategory } =
    context

  const { yieldPct = 100, wasteBufferPct, minOrderQty, packSize } = options

  // Step 1: Base multiplier from guest count
  const safeServings = recipeServings > 0 ? recipeServings : 4
  const baseMultiplier = (guestCount / safeServings) * componentScaleFactor

  // Step 2: Service style multiplier
  const styleConfig = PORTIONS_BY_SERVICE_STYLE[serviceStyle]
  const styleMultiplier = styleConfig?.multiplier ?? 1.0

  // Step 3: Category-aware scaling
  const categoryAdjusted = applyCategoryModifier(baseMultiplier * styleMultiplier, scalingCategory)

  // Compute scaled quantity
  const scaledQty = baseQty * categoryAdjusted

  // Step 4: Yield adjustment (AP = EP * 100 / yield%)
  const safeYield = Math.max(yieldPct, 1)
  const yieldAdjustedQty = (scaledQty * 100) / safeYield

  // Step 5: Waste buffer
  const wasteRate = wasteBufferPct ?? styleConfig?.wasteExpected ?? 3
  const bufferedQty = yieldAdjustedQty * (1 + wasteRate / 100)

  // Step 6: Pack rounding + minimum order quantity
  let roundedQty = roundToPackSize(bufferedQty, unit, packSize)
  if (minOrderQty && minOrderQty > 0 && roundedQty < minOrderQty) {
    roundedQty = minOrderQty
  }

  return {
    recipeQty: baseQty,
    scaledQty,
    yieldAdjustedQty,
    bufferedQty,
    roundedQty,
    compositeMultiplier: baseQty > 0 ? roundedQty / baseQty : 0,
  }
}

// ── Resolve Scaling Category ─────────────────────────────────────────────

/**
 * Resolve the effective scaling category for an ingredient.
 * Priority: explicit ingredient.scaling_category > default from ingredient_category.
 */
export function resolveScalingCategory(
  ingredientScalingCategory: string | null,
  ingredientCategory: string
): ScalingCategory {
  if (
    ingredientScalingCategory &&
    ['linear', 'sublinear', 'fixed', 'by_pan'].includes(ingredientScalingCategory)
  ) {
    return ingredientScalingCategory as ScalingCategory
  }
  return DEFAULT_SCALING_MAP[ingredientCategory] ?? 'linear'
}
