'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'
import type {
  MenuCostBreakdown,
  MenuCostSummary,
  CourseCostRow,
  DishCostRow,
  ComponentCostRow,
  IngredientCostRow,
  CostConfidence,
  CostGap,
  CostGapType,
  MenuCostComparison,
  MenuCostComparisonSide,
  MenuProfitabilityPreview,
} from './costing-interrogation-types'

// ============================================
// HELPERS
// ============================================

/** Map numeric confidence (0-1) to CostConfidence label */
function toConfidenceLabel(value: number): CostConfidence {
  if (value >= 0.7) return 'high'
  if (value >= 0.4) return 'medium'
  if (value > 0) return 'low'
  return 'unknown'
}

/** Aggregate confidence from child rows. Returns weighted average or 'unknown' if no data. */
function aggregateConfidence(
  items: Array<{ confidence: CostConfidence; weight: number }>
): { label: CostConfidence; weighted: number } {
  if (items.length === 0) return { label: 'unknown', weighted: 0 }

  const weights: Record<CostConfidence, number> = {
    high: 1.0,
    medium: 0.6,
    low: 0.3,
    unknown: 0,
  }

  let totalWeight = 0
  let totalValue = 0
  for (const item of items) {
    totalWeight += item.weight
    totalValue += weights[item.confidence] * item.weight
  }

  const avg = totalWeight > 0 ? totalValue / totalWeight : 0
  return { label: toConfidenceLabel(avg), weighted: Math.round(avg * 100) / 100 }
}

/** Sum cents arrays, returning null if all are null */
function sumCents(values: (number | null)[]): number | null {
  let total = 0
  let hasAny = false
  for (const v of values) {
    if (v != null) {
      total += v
      hasAny = true
    }
  }
  return hasAny ? total : null
}

/** Detect gap types for a single ingredient */
function detectGaps(
  resolvedPrice: { cents: number; confidence: number; freshness: string | null } | null,
  yieldPct: number | null
): CostGapType[] {
  const gaps: CostGapType[] = []
  if (!resolvedPrice || resolvedPrice.confidence === 0) {
    gaps.push('missing_price')
  } else if (resolvedPrice.freshness === 'stale') {
    gaps.push('stale_price')
  }
  if (yieldPct == null || yieldPct === 100) {
    // Only flag if the ingredient likely needs a yield factor
    // (not flagging 100% since it might be intentional)
  }
  if (yieldPct == null) {
    gaps.push('no_yield_factor')
  }
  return gaps
}

// ============================================
// getMenuCostBreakdown
// ============================================

/**
 * Full hierarchical cost breakdown for a menu.
 * menu -> courses -> dishes -> components -> ingredients
 * Each level has subtotal, confidence, and gap flags.
 * Read-only. Auth-gated, tenant-scoped.
 */
export async function getMenuCostBreakdown(
  menuId: string
): Promise<MenuCostBreakdown> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // 1. Get menu info
  const { data: menu } = await db
    .from('menus')
    .select('id, name')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  const menuName = menu?.name || 'Untitled Menu'

  // 2. Get all dishes for this menu
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, course_number, course_name')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('course_number', { ascending: true })

  if (!dishes || dishes.length === 0) {
    const emptySummary: MenuCostSummary = {
      menuId,
      menuName,
      totalFoodCostCents: null,
      ingredientsCosted: 0,
      ingredientsMissing: 0,
      overallConfidence: 'unknown',
      totalGapCount: 0,
      weightedConfidence: 0,
    }
    return { summary: emptySummary, courses: [], gaps: [] }
  }

  const dishIds = dishes.map((d: any) => d.id as string)

  // 3. Get all components for these dishes
  const { data: components } = await db
    .from('components')
    .select('id, name, category, dish_id, recipe_id')
    .in('dish_id', dishIds)
    .eq('tenant_id', tenantId)

  // 4. Get recipe names for linked recipes
  const recipeIds = Array.from(
    new Set<string>(
      (components ?? [])
        .filter((c: any) => c.recipe_id)
        .map((c: any) => c.recipe_id as string)
    )
  )

  const recipeNameMap = new Map<string, string>()
  if (recipeIds.length > 0) {
    const { data: recipes } = await db
      .from('recipes')
      .select('id, name')
      .in('id', recipeIds)
      .eq('tenant_id', tenantId)

    for (const r of recipes ?? []) {
      recipeNameMap.set(r.id, r.name || 'Untitled Recipe')
    }
  }

  // 5. Get all recipe_ingredients for these recipes
  const riByRecipe = new Map<string, any[]>()
  if (recipeIds.length > 0) {
    const { data: riRows } = await db
      .from('recipe_ingredients')
      .select('id, recipe_id, ingredient_id, quantity, unit, yield_pct, computed_cost_cents')
      .in('recipe_id', recipeIds)

    for (const ri of riRows ?? []) {
      const list = riByRecipe.get(ri.recipe_id) ?? []
      list.push(ri)
      riByRecipe.set(ri.recipe_id, list)
    }
  }

  // 6. Collect all unique ingredient IDs and resolve prices in batch
  const allIngredientIds = new Set<string>()
  for (const riList of riByRecipe.values()) {
    for (const ri of riList) {
      if (ri.ingredient_id) allIngredientIds.add(ri.ingredient_id)
    }
  }

  const ingredientIds = Array.from(allIngredientIds)

  // Get ingredient names
  const ingredientNameMap = new Map<string, string>()
  if (ingredientIds.length > 0) {
    const { data: ingRows } = await db
      .from('ingredients')
      .select('id, name')
      .in('id', ingredientIds)

    for (const ing of ingRows ?? []) {
      ingredientNameMap.set(ing.id, ing.name || 'Unknown')
    }
  }

  // Resolve prices via PIE
  let priceMap = new Map<string, any>()
  try {
    if (ingredientIds.length > 0) {
      priceMap = await resolvePricesBatch(ingredientIds, tenantId)
    }
  } catch {
    // Price resolution failed; all will show as unknown
  }

  // 7. Build the hierarchy bottom-up
  const allGaps: CostGap[] = []
  let totalCosted = 0
  let totalMissing = 0

  // Build component rows indexed by dish_id
  const componentsByDish = new Map<string, ComponentCostRow[]>()

  for (const comp of components ?? []) {
    const dishId = comp.dish_id as string
    const recipeId = comp.recipe_id as string | null
    const riList = recipeId ? (riByRecipe.get(recipeId) ?? []) : []

    const ingredientRows: IngredientCostRow[] = []

    for (const ri of riList) {
      const ingId = ri.ingredient_id as string
      const resolved = priceMap.get(ingId) ?? null
      const quantity = parseFloat(ri.quantity) || 0
      const yieldPct = ri.yield_pct as number | null
      const gaps = detectGaps(resolved, yieldPct)

      let rawCostCents: number | null = null
      let adjustedCostCents: number | null = null

      if (resolved && resolved.confidence > 0) {
        rawCostCents = Math.round(resolved.cents * quantity)
        const yieldMultiplier = yieldPct && yieldPct > 0 && yieldPct < 100
          ? 100 / yieldPct
          : 1
        adjustedCostCents = Math.round(rawCostCents * yieldMultiplier)
        totalCosted++
      } else {
        totalMissing++
      }

      const confidence = resolved
        ? toConfidenceLabel(resolved.effectiveConfidence ?? resolved.confidence)
        : 'unknown'

      ingredientRows.push({
        ingredientId: ingId,
        ingredientName: ingredientNameMap.get(ingId) || 'Unknown',
        quantity,
        unit: ri.unit || 'each',
        yieldPct,
        rawCostCents,
        adjustedCostCents,
        confidence,
        priceSource: resolved?.source || null,
        priceFreshness: resolved?.freshness || null,
        gaps,
      })

      // Collect gaps for the flat list
      if (gaps.length > 0) {
        // Find which dish name this belongs to
        const dishRow = dishes.find((d: any) => d.id === dishId)
        for (const gapType of gaps) {
          allGaps.push({
            ingredientId: ingId,
            ingredientName: ingredientNameMap.get(ingId) || 'Unknown',
            gapType,
            staleDays: undefined, // Could be computed from confirmedAt
            quantityNeeded: quantity,
            unit: ri.unit || 'each',
            affectedDishNames: [dishRow?.name || dishRow?.course_name || 'Unknown Dish'],
            affectedComponentNames: [comp.name || 'Unknown Component'],
          })
        }
      }
    }

    const compSubtotal = sumCents(ingredientRows.map((i) => i.adjustedCostCents))
    const compConfidence = aggregateConfidence(
      ingredientRows.map((i) => ({
        confidence: i.confidence,
        weight: i.adjustedCostCents ?? 1,
      }))
    )

    const compRow: ComponentCostRow = {
      componentId: comp.id,
      componentName: comp.name || 'Unknown Component',
      category: comp.category || 'other',
      recipeId,
      recipeName: recipeId ? (recipeNameMap.get(recipeId) || null) : null,
      subtotalCents: compSubtotal,
      confidence: compConfidence.label,
      ingredients: ingredientRows,
      gapCount: ingredientRows.reduce((sum, i) => sum + i.gaps.length, 0),
    }

    const list = componentsByDish.get(dishId) ?? []
    list.push(compRow)
    componentsByDish.set(dishId, list)
  }

  // Build dish rows
  const dishRows: DishCostRow[] = []
  for (const dish of dishes) {
    const comps = componentsByDish.get(dish.id) ?? []
    const dishSubtotal = sumCents(comps.map((c) => c.subtotalCents))
    const dishConfidence = aggregateConfidence(
      comps.map((c) => ({
        confidence: c.confidence,
        weight: c.subtotalCents ?? 1,
      }))
    )

    dishRows.push({
      dishId: dish.id,
      dishName: dish.name || dish.course_name || 'Unnamed Dish',
      courseNumber: dish.course_number,
      courseName: dish.course_name,
      subtotalCents: dishSubtotal,
      confidence: dishConfidence.label,
      components: comps,
      gapCount: comps.reduce((sum, c) => sum + c.gapCount, 0),
    })
  }

  // Group dishes into courses
  const courseMap = new Map<number, DishCostRow[]>()
  for (const dish of dishRows) {
    const list = courseMap.get(dish.courseNumber) ?? []
    list.push(dish)
    courseMap.set(dish.courseNumber, list)
  }

  const courses: CourseCostRow[] = []
  for (const [courseNum, courseDishes] of Array.from(courseMap.entries()).sort(
    (a, b) => a[0] - b[0]
  )) {
    const courseSubtotal = sumCents(courseDishes.map((d) => d.subtotalCents))
    const courseConfidence = aggregateConfidence(
      courseDishes.map((d) => ({
        confidence: d.confidence,
        weight: d.subtotalCents ?? 1,
      }))
    )

    courses.push({
      courseNumber: courseNum,
      courseName: courseDishes[0]?.courseName || `Course ${courseNum}`,
      subtotalCents: courseSubtotal,
      confidence: courseConfidence.label,
      dishes: courseDishes,
      gapCount: courseDishes.reduce((sum, d) => sum + d.gapCount, 0),
    })
  }

  // Sort gaps by impact (highest quantity first)
  allGaps.sort((a, b) => b.quantityNeeded - a.quantityNeeded)

  // Dedupe gaps by ingredientId + gapType (merge affected dish/component names)
  const gapKey = (g: CostGap) => `${g.ingredientId}:${g.gapType}`
  const gapDeduped = new Map<string, CostGap>()
  for (const gap of allGaps) {
    const key = gapKey(gap)
    const existing = gapDeduped.get(key)
    if (existing) {
      for (const dn of gap.affectedDishNames) {
        if (!existing.affectedDishNames.includes(dn)) existing.affectedDishNames.push(dn)
      }
      for (const cn of gap.affectedComponentNames) {
        if (!existing.affectedComponentNames.includes(cn)) existing.affectedComponentNames.push(cn)
      }
      // Keep higher quantity
      if (gap.quantityNeeded > existing.quantityNeeded) {
        existing.quantityNeeded = gap.quantityNeeded
      }
    } else {
      gapDeduped.set(key, { ...gap })
    }
  }
  const dedupedGaps = Array.from(gapDeduped.values()).sort(
    (a, b) => b.quantityNeeded - a.quantityNeeded
  )

  const totalFoodCostCents = sumCents(courses.map((c) => c.subtotalCents))
  const overallConf = aggregateConfidence(
    courses.map((c) => ({
      confidence: c.confidence,
      weight: c.subtotalCents ?? 1,
    }))
  )

  const summary: MenuCostSummary = {
    menuId,
    menuName,
    totalFoodCostCents,
    ingredientsCosted: totalCosted,
    ingredientsMissing: totalMissing,
    overallConfidence: overallConf.label,
    totalGapCount: dedupedGaps.length,
    weightedConfidence: overallConf.weighted,
  }

  return { summary, courses, gaps: dedupedGaps }
}

// ============================================
// getMenuCostGaps
// ============================================

/**
 * List ingredients with missing, stale, or low-confidence prices.
 * Sorted by impact (highest quantity items first).
 * Read-only. Auth-gated, tenant-scoped.
 */
export async function getMenuCostGaps(menuId: string): Promise<CostGap[]> {
  const breakdown = await getMenuCostBreakdown(menuId)
  return breakdown.gaps
}

// ============================================
// getMenuCostComparison
// ============================================

/**
 * Side-by-side cost comparison between two menus.
 * Useful for fork/variant analysis.
 * Read-only. Auth-gated, tenant-scoped.
 */
export async function getMenuCostComparison(
  menuIdA: string,
  menuIdB: string
): Promise<MenuCostComparison> {
  // Run both breakdowns (auth is checked inside each)
  const [breakdownA, breakdownB] = await Promise.all([
    getMenuCostBreakdown(menuIdA),
    getMenuCostBreakdown(menuIdB),
  ])

  function toSide(b: MenuCostBreakdown): MenuCostComparisonSide {
    let ingredientCount = 0
    let dishCount = 0
    for (const course of b.courses) {
      dishCount += course.dishes.length
      for (const dish of course.dishes) {
        for (const comp of dish.components) {
          ingredientCount += comp.ingredients.length
        }
      }
    }
    return {
      menuId: b.summary.menuId,
      menuName: b.summary.menuName,
      totalFoodCostCents: b.summary.totalFoodCostCents,
      courseCount: b.courses.length,
      dishCount,
      ingredientCount,
      overallConfidence: b.summary.overallConfidence,
      weightedConfidence: b.summary.weightedConfidence,
    }
  }

  const menuA = toSide(breakdownA)
  const menuB = toSide(breakdownB)

  let deltaCents: number | null = null
  let deltaPct: number | null = null
  if (menuA.totalFoodCostCents != null && menuB.totalFoodCostCents != null) {
    deltaCents = menuB.totalFoodCostCents - menuA.totalFoodCostCents
    if (menuA.totalFoodCostCents > 0) {
      deltaPct = Math.round((deltaCents / menuA.totalFoodCostCents) * 10000) / 100
    }
  }

  // Build per-course deltas where course numbers match
  const coursesA = new Map<number, CourseCostRow>()
  for (const c of breakdownA.courses) coursesA.set(c.courseNumber, c)
  const coursesB = new Map<number, CourseCostRow>()
  for (const c of breakdownB.courses) coursesB.set(c.courseNumber, c)

  const allCourseNums = new Set([...coursesA.keys(), ...coursesB.keys()])
  const courseDeltas = Array.from(allCourseNums)
    .sort((a, b) => a - b)
    .map((num) => {
      const a = coursesA.get(num)
      const b = coursesB.get(num)
      const aCents = a?.subtotalCents ?? null
      const bCents = b?.subtotalCents ?? null
      return {
        courseNumber: num,
        courseName: a?.courseName || b?.courseName || `Course ${num}`,
        aCents,
        bCents,
        deltaCents:
          aCents != null && bCents != null ? bCents - aCents : null,
      }
    })

  return { menuA, menuB, deltaCents, deltaPct, courseDeltas }
}

// ============================================
// getMenuProfitabilityPreview
// ============================================

/**
 * Preview profitability at a given price point and guest count.
 * Uses chef_pricing_config for labor/overhead rates.
 * Read-only. Auth-gated, tenant-scoped.
 */
export async function getMenuProfitabilityPreview(
  menuId: string,
  guestCount: number,
  pricePerHeadCents: number
): Promise<MenuProfitabilityPreview> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get cost breakdown
  const breakdown = await getMenuCostBreakdown(menuId)
  const { summary } = breakdown

  // Get chef pricing config for labor/overhead
  const { data: config } = await db
    .from('chef_pricing_config')
    .select('overhead_percent, hourly_rate_cents')
    .eq('chef_id', tenantId)
    .single()

  const overheadPct = config?.overhead_percent ?? 15
  const hourlyRateCents = config?.hourly_rate_cents ?? 5000

  const totalRevenueCents = guestCount * pricePerHeadCents

  // Scale food cost by guest count (breakdown is per-menu, which is per-event)
  const totalFoodCostCents = summary.totalFoodCostCents

  // Estimate labor: assume 1 hour prep per 2 guests + 1 hour per 4 guests for service
  const estimatedHours = Math.ceil(guestCount / 2) + Math.ceil(guestCount / 4)
  const laborCostCents = estimatedHours * hourlyRateCents

  // Overhead as percentage of food cost
  const overheadCents =
    totalFoodCostCents != null
      ? Math.round(totalFoodCostCents * (overheadPct / 100))
      : null

  // Profit calculation
  let estimatedProfitCents: number | null = null
  let profitMarginPct: number | null = null
  let foodCostPct: number | null = null

  if (totalFoodCostCents != null && overheadCents != null) {
    estimatedProfitCents =
      totalRevenueCents - totalFoodCostCents - laborCostCents - overheadCents
    if (totalRevenueCents > 0) {
      profitMarginPct =
        Math.round((estimatedProfitCents / totalRevenueCents) * 10000) / 100
      foodCostPct =
        Math.round((totalFoodCostCents / totalRevenueCents) * 10000) / 100
    }
  }

  // Build warnings
  const warnings: string[] = []
  if (summary.ingredientsMissing > 0) {
    warnings.push(
      `${summary.ingredientsMissing} ingredient${summary.ingredientsMissing === 1 ? '' : 's'} with unknown prices`
    )
  }
  if (summary.overallConfidence === 'low' || summary.overallConfidence === 'unknown') {
    warnings.push('Overall cost confidence is low; numbers may be inaccurate')
  }
  if (foodCostPct != null && foodCostPct > 35) {
    warnings.push(
      `Food cost is ${foodCostPct}% of revenue (target: under 35%)`
    )
  }
  if (profitMarginPct != null && profitMarginPct < 10) {
    warnings.push(
      `Profit margin is only ${profitMarginPct}% (consider raising price or reducing costs)`
    )
  }

  return {
    menuId,
    menuName: summary.menuName,
    guestCount,
    pricePerHeadCents,
    totalRevenueCents,
    totalFoodCostCents,
    foodCostPct,
    laborCostCents,
    overheadCents,
    estimatedProfitCents,
    profitMarginPct,
    confidence: summary.overallConfidence,
    warnings,
  }
}
