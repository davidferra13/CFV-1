/**
 * Auto-Cost Bridge
 *
 * Fires non-blocking ingredient price resolution when menus change:
 *   - Recipe linked to a dish (via editor or dish index)
 *   - Menu attached to an event
 *   - Quote created with an event that has a menu
 *
 * Resolves prices via the full PIE chain (resolve-price.ts) and writes
 * cost_per_unit_cents + last_price_cents back to the ingredients table.
 * Also recomputes recipe_ingredients.computed_cost_cents for affected recipes.
 *
 * Non-blocking: failures are logged but never break the calling action.
 * Chef overrides (tier 0) always take precedence (handled by resolve-price).
 * If no price data is found, nothing is written (no $0 hallucination).
 */

import { createServerClient } from '@/lib/db/server'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'
import type { ResolvedPrice } from '@/lib/pricing/resolve-price'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Auto-resolve ingredient prices for all recipes linked to a menu.
 * Call after attachMenuToEvent, linkRecipeToEditorDish, etc.
 * Returns a summary for logging; caller should not surface this to UI.
 */
export async function autoCostMenuIngredients(
  menuId: string,
  tenantId: string
): Promise<AutoCostResult> {
  const start = Date.now()
  try {
    const db: any = createServerClient()

    // 1. Get all recipe IDs from menu -> dishes -> components
    const { data: components } = await db
      .from('components')
      .select('recipe_id, dish_id')
      .eq('tenant_id', tenantId)
      .in('dish_id', db.from('dishes').select('id').eq('menu_id', menuId).eq('tenant_id', tenantId))
      .not('recipe_id', 'is', null)

    if (!components || components.length === 0) {
      return { triggered: false, reason: 'no_recipes', elapsed: Date.now() - start }
    }

    const recipeIds: string[] = components
      .map((c: any) => c.recipe_id as string)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)

    return await autoCostRecipes(recipeIds, tenantId, start)
  } catch (err) {
    console.error('[autoCostMenuIngredients] Failed (non-blocking):', err)
    return { triggered: false, reason: 'error', elapsed: Date.now() - start }
  }
}

/**
 * Auto-resolve ingredient prices for a single recipe.
 * Call after linkRecipeToEditorDish or linkRecipeToDish.
 */
export async function autoCostRecipeIngredients(
  recipeId: string,
  tenantId: string
): Promise<AutoCostResult> {
  const start = Date.now()
  try {
    return await autoCostRecipes([recipeId], tenantId, start)
  } catch (err) {
    console.error('[autoCostRecipeIngredients] Failed (non-blocking):', err)
    return { triggered: false, reason: 'error', elapsed: Date.now() - start }
  }
}

/**
 * Auto-resolve ingredient prices for an event's menu.
 * Call after createEvent (when menu_id is set) or createQuote (when event has menu).
 */
export async function autoCostEventMenu(
  eventId: string,
  tenantId: string
): Promise<AutoCostResult> {
  const start = Date.now()
  try {
    const db: any = createServerClient()

    const { data: event } = await db
      .from('events')
      .select('menu_id')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event?.menu_id) {
      return { triggered: false, reason: 'no_menu', elapsed: Date.now() - start }
    }

    return await autoCostMenuIngredients(event.menu_id, tenantId)
  } catch (err) {
    console.error('[autoCostEventMenu] Failed (non-blocking):', err)
    return { triggered: false, reason: 'error', elapsed: Date.now() - start }
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function autoCostRecipes(
  recipeIds: string[],
  tenantId: string,
  startTime: number
): Promise<AutoCostResult> {
  const db: any = createServerClient()

  // Get all recipe_ingredients for these recipes
  const { data: riRows } = await db
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_id, quantity, unit, yield_pct')
    .in('recipe_id', recipeIds)

  if (!riRows || riRows.length === 0) {
    return { triggered: false, reason: 'no_ingredients', elapsed: Date.now() - startTime }
  }

  // Collect unique ingredient IDs
  const ingredientIds: string[] = riRows
    .filter((ri: any) => ri.ingredient_id)
    .map((ri: any) => ri.ingredient_id as string)
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)

  if (ingredientIds.length === 0) {
    return { triggered: false, reason: 'no_ingredients', elapsed: Date.now() - startTime }
  }

  // Batch resolve prices via full PIE chain
  let resolvedMap: Map<string, ResolvedPrice>
  try {
    resolvedMap = await resolvePricesBatch(ingredientIds, tenantId)
  } catch (err) {
    console.error('[autoCostRecipes] PIE batch resolution failed:', err)
    return { triggered: false, reason: 'pie_unavailable', elapsed: Date.now() - startTime }
  }

  let updated = 0
  let skipped = 0

  // Write resolved prices back to ingredients table (skip if already has override)
  for (const ingredientId of ingredientIds) {
    const resolved = resolvedMap.get(ingredientId)
    if (!resolved || resolved.cents <= 0) {
      skipped++
      continue
    }

    try {
      // Check if ingredient already has a cost set (don't overwrite recent data)
      const { data: existing } = await db
        .from('ingredients')
        .select('cost_per_unit_cents, last_price_date')
        .eq('id', ingredientId)
        .eq('tenant_id', tenantId)
        .single()

      // Skip if ingredient already has a recent price (within 24 hours)
      // This avoids re-resolving on every recipe link action
      if (existing?.last_price_date) {
        const ageMs = Date.now() - new Date(existing.last_price_date).getTime()
        if (ageMs < 24 * 60 * 60 * 1000 && existing.cost_per_unit_cents > 0) {
          skipped++
          continue
        }
      }

      // Unit conversion if needed
      let costPerUnit = resolved.cents
      const resolvedUnit = resolved.unit || 'each'

      try {
        const { data: ingredient } = await db
          .from('ingredients')
          .select('default_unit, weight_to_volume_ratio, name')
          .eq('id', ingredientId)
          .eq('tenant_id', tenantId)
          .single()

        if (ingredient?.default_unit && ingredient.default_unit !== resolvedUnit) {
          const { convertCostToUnit, lookupDensity } = await import('@/lib/units/conversion-engine')
          const density = ingredient.weight_to_volume_ratio ?? lookupDensity(ingredient.name)
          if (density) {
            const converted = convertCostToUnit(
              resolved.cents,
              resolvedUnit,
              ingredient.default_unit,
              density
            )
            if (converted !== null) {
              costPerUnit = Math.round(converted)
            }
          }
        }
      } catch {
        // Unit conversion failure is non-fatal; use resolved price as-is
      }

      // Write to ingredients table
      await db
        .from('ingredients')
        .update({
          cost_per_unit_cents: costPerUnit,
          last_price_cents: resolved.cents,
          last_price_date: new Date().toISOString(),
          last_price_source: resolved.source,
          last_price_confidence: resolved.confidence,
          price_unit: resolved.unit || 'each',
        })
        .eq('id', ingredientId)
        .eq('tenant_id', tenantId)

      updated++
    } catch (err) {
      console.error(`[autoCostRecipes] Failed to update ingredient ${ingredientId}:`, err)
      skipped++
    }
  }

  // Recompute recipe_ingredients.computed_cost_cents for affected recipes
  if (updated > 0) {
    try {
      const { computeRecipeIngredientCost, refreshRecipeTotalCost } =
        await import('@/lib/recipes/actions')
      for (const ri of riRows) {
        if (!ri.ingredient_id || !resolvedMap.has(ri.ingredient_id)) continue
        try {
          const result = await computeRecipeIngredientCost(
            db,
            tenantId,
            ri.ingredient_id,
            ri.quantity ?? 1,
            ri.unit || 'each',
            ri.yield_pct ?? undefined
          )
          await db
            .from('recipe_ingredients')
            .update({ computed_cost_cents: result.costCents } as any)
            .eq('id', ri.id)
            .eq('recipe_id', ri.recipe_id)
        } catch {
          // Non-fatal per-ingredient
        }
      }

      // Refresh recipe total costs
      for (const recipeId of recipeIds) {
        try {
          await refreshRecipeTotalCost(db, tenantId, recipeId)
        } catch {
          // Non-fatal per-recipe
        }
      }
    } catch (err) {
      console.error('[autoCostRecipes] Recipe cost cascade failed (non-blocking):', err)
    }
  }

  const elapsed = Date.now() - startTime
  console.info(
    `[autoCostBridge] Resolved ${updated}/${ingredientIds.length} ingredient prices ` +
      `across ${recipeIds.length} recipe(s) in ${elapsed}ms ` +
      `(skipped: ${skipped}, source mix: PIE chain)`
  )

  return {
    triggered: true,
    ingredientCount: ingredientIds.length,
    resolved: updated,
    skipped,
    recipeCount: recipeIds.length,
    elapsed,
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutoCostResult =
  | {
      triggered: true
      ingredientCount: number
      resolved: number
      skipped: number
      recipeCount: number
      elapsed: number
    }
  | {
      triggered: false
      reason: string
      elapsed: number
    }
