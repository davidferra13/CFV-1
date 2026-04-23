'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { computeRecipeIngredientCost, refreshRecipeTotalCost } from '@/lib/recipes/actions'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'
import { convertCostToUnit, lookupDensity, normalizeUnit } from '@/lib/units/conversion-engine'

// ============================================
// PROPAGATE PRICE CHANGE (cascade)
// ============================================

/**
 * After an ingredient price changes, propagate the change to all recipes
 * that use the ingredient, then flag affected events for review.
 * This is a NON-BLOCKING side effect: wrap calls in try/catch.
 */
export async function propagatePriceChange(
  ingredientIds: string[],
  options?: { admin?: boolean }
) {
  if (ingredientIds.length === 0) return

  const db: any = createServerClient(options?.admin ? { admin: true } : undefined)

  // Find all recipe_ingredients referencing these ingredients
  const { data: riRows } = await db
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_id, quantity, unit, yield_pct')
    .in('ingredient_id', ingredientIds)

  if (!riRows || riRows.length === 0) return

  // Get tenant from first recipe
  const recipeIds: string[] = [
    ...new Set(riRows.map((r: any) => r.recipe_id as string)),
  ] as string[]
  const { data: firstRecipe } = await db
    .from('recipes')
    .select('tenant_id')
    .eq('id', recipeIds[0])
    .single()

  if (!firstRecipe) return
  const tenantId = firstRecipe.tenant_id

  // Recompute each recipe ingredient cost
  for (const ri of riRows) {
    try {
      const result = await computeRecipeIngredientCost(
        db,
        tenantId,
        ri.ingredient_id,
        ri.quantity ?? 1,
        ri.unit || 'each',
        ri.yield_pct ?? undefined
      )
      // Write computed cost
      await db
        .from('recipe_ingredients')
        .update({ computed_cost_cents: result.costCents } as any)
        .eq('id', ri.id)
    } catch (err) {
      console.error(`[propagatePriceChange] Failed to recompute ri ${ri.id}:`, err)
    }
  }

  // Refresh each affected recipe total (deduped)
  for (const recipeId of recipeIds) {
    try {
      await refreshRecipeTotalCost(db, tenantId, recipeId)
    } catch (err) {
      console.error(`[propagatePriceChange] Failed to refresh recipe ${recipeId}:`, err)
    }
  }

  // Find events whose menus use affected recipes and flag them
  try {
    const { data: eventRows } = await db.rpc('raw_sql', {
      query: `
        SELECT DISTINCT e.id
        FROM events e
        JOIN menus m ON m.id = e.menu_id
        JOIN dishes d ON d.menu_id = m.id
        JOIN components c ON c.dish_id = d.id
        WHERE c.recipe_id = ANY($1)
        AND e.cost_needs_refresh = false
      `,
      params: [recipeIds],
    })

    // Fallback: use compat query if rpc not available
    if (!eventRows) {
      // Try a simpler approach via compat
      for (const recipeId of recipeIds.slice(0, 20)) {
        const { data: components } = await db
          .from('components')
          .select('dish_id')
          .eq('recipe_id', recipeId)

        if (!components) continue

        for (const comp of components) {
          const { data: dish } = await db
            .from('dishes')
            .select('menu_id')
            .eq('id', comp.dish_id)
            .single()

          if (!dish?.menu_id) continue

          const { data: events } = await db
            .from('events')
            .select('id')
            .eq('menu_id', dish.menu_id)
            .eq('cost_needs_refresh', false)

          for (const evt of events ?? []) {
            await db
              .from('events')
              .update({ cost_needs_refresh: true } as any)
              .eq('id', evt.id)
          }
        }
      }
    } else {
      for (const evt of eventRows) {
        await db
          .from('events')
          .update({ cost_needs_refresh: true } as any)
          .eq('id', evt.id)
      }
    }
  } catch (err) {
    console.error('[propagatePriceChange] Event flagging failed (non-blocking):', err)
  }

  // Bust UI caches
  revalidatePath('/culinary/costing')
  revalidatePath('/culinary/recipes')
  revalidateTag('recipe-costs')
}

// ============================================
// REFRESH INGREDIENT COSTS (batch engine)
// ============================================

export interface CostRefreshResult {
  refreshed: number
  matched: number
  unmatched: number
  errors: string[]
  skipped?: boolean
  reason?: string
}

type RefreshIngredientCostsOptions = {
  admin?: boolean
}

/**
 * Batch-resolve prices for ingredients and update cost_per_unit_cents.
 * Callable from UI ("Refresh All Prices" button) or after sync.
 */
export async function refreshIngredientCostsAction(
  ingredientIds?: string[]
): Promise<CostRefreshResult> {
  const user = await requireChef()
  return refreshIngredientCostsForTenantInternal(user.tenantId!, ingredientIds)
}

export async function refreshIngredientCostsForTenant(
  tenantId: string,
  ingredientIds?: string[]
): Promise<CostRefreshResult> {
  return refreshIngredientCostsForTenantInternal(tenantId, ingredientIds, { admin: true })
}

async function refreshIngredientCostsForTenantInternal(
  tenantId: string,
  ingredientIds?: string[],
  options?: RefreshIngredientCostsOptions
): Promise<CostRefreshResult> {
  const db: any = createServerClient(options?.admin ? { admin: true } : undefined)

  // Advisory lock to prevent concurrent refreshes
  try {
    const lockId = hashTenantId(tenantId)
    const { data: lockResult } = await db.rpc('raw_sql', {
      query: `SELECT pg_try_advisory_lock($1) as locked`,
      params: [lockId],
    })
    if (lockResult?.[0]?.locked === false) {
      return {
        refreshed: 0,
        matched: 0,
        unmatched: 0,
        errors: [],
        skipped: true,
        reason: 'Refresh already in progress',
      }
    }
  } catch {
    // If advisory lock fails, proceed anyway (non-critical)
  }

  try {
    // Get active ingredient IDs if not provided
    let ids: string[] = ingredientIds ?? []
    if (ids.length === 0) {
      const { data: activeRows } = await db.from('recipe_ingredients').select('ingredient_id')

      if (!activeRows || activeRows.length === 0) {
        return { refreshed: 0, matched: 0, unmatched: 0, errors: [] }
      }

      ids = [...new Set(activeRows.map((r: any) => r.ingredient_id as string))] as string[]
    }

    // Batch resolve prices
    const resolvedMap = await resolvePricesBatch(ids, tenantId)

    let refreshed = 0
    let matched = 0
    let unmatched = 0
    const errors: string[] = []

    // Process each ingredient
    for (const ingredientId of ids) {
      const resolved = resolvedMap.get(ingredientId)

      if (!resolved || resolved.cents === null || resolved.cents === undefined) {
        unmatched++
        continue
      }

      matched++

      try {
        // Get ingredient details for unit conversion
        const { data: ingredient } = await db
          .from('ingredients')
          .select('name, default_unit, weight_to_volume_ratio, price_unit')
          .eq('id', ingredientId)
          .eq('tenant_id', tenantId)
          .single()

        if (!ingredient) continue

        let costPerUnit = resolved.cents
        const resolvedUnit = resolved.unit || 'each'
        const defaultUnit = ingredient.default_unit || null

        // Unit conversion if needed
        if (defaultUnit && normalizeUnit(resolvedUnit) !== normalizeUnit(defaultUnit)) {
          const density = ingredient.weight_to_volume_ratio ?? lookupDensity(ingredient.name)

          if (density) {
            const converted = convertCostToUnit(resolved.cents, resolvedUnit, defaultUnit, density)
            if (converted !== null) {
              costPerUnit = Math.round(converted)
            }
          }
          // If no density or conversion fails, store as-is (Decision 10)
        }

        // Log change for audit
        console.info(
          JSON.stringify({
            event: 'cost_refresh',
            ingredient_id: ingredientId,
            name: ingredient.name,
            old_unit: ingredient.price_unit,
            new_cost_per_unit_cents: costPerUnit,
            source: resolved.source,
            timestamp: new Date().toISOString(),
          })
        )

        // Write to ingredients table
        await db
          .from('ingredients')
          .update({
            cost_per_unit_cents: costPerUnit,
            last_price_cents: resolved.cents,
            last_price_date: resolved.confirmedAt
              ? (() => {
                  const d = new Date(resolved.confirmedAt)
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                })()
              : (() => {
                  const _cr = new Date()
                  return `${_cr.getFullYear()}-${String(_cr.getMonth() + 1).padStart(2, '0')}-${String(_cr.getDate()).padStart(2, '0')}`
                })(),
            last_price_source: resolved.source,
            last_price_store: resolved.store || null,
            last_price_confidence: resolved.confidence,
          } as any)
          .eq('id', ingredientId)
          .eq('tenant_id', tenantId)

        refreshed++
      } catch (err) {
        errors.push(`${ingredientId}: ${(err as Error).message}`)
      }
    }

    // Cascade to recipes
    if (refreshed > 0) {
      try {
        const updatedIds = ids.filter(
          (id) => resolvedMap.has(id) && resolvedMap.get(id)?.cents != null
        )
        await propagatePriceChange(updatedIds, { admin: options?.admin })
      } catch (err) {
        console.error('[refreshIngredientCosts] Cascade failed (non-blocking):', err)
      }
    }

    revalidatePath('/culinary/costing')
    revalidateTag('ingredient-prices')

    return { refreshed, matched, unmatched, errors }
  } finally {
    // Release advisory lock
    try {
      const lockId = hashTenantId(tenantId)
      await db.rpc('raw_sql', {
        query: `SELECT pg_advisory_unlock($1)`,
        params: [lockId],
      })
    } catch {
      // Non-critical
    }
  }
}

// ============================================
// MARK EVENT COST REVIEWED
// ============================================

export async function markEventCostReviewedAction(eventId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('events')
    .update({
      cost_needs_refresh: false,
      cost_refreshed_at: new Date().toISOString(),
    } as any)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error('Failed to mark event cost as reviewed')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ============================================
// HELPERS
// ============================================

function hashTenantId(tenantId: string): number {
  let hash = 0
  for (let i = 0; i < tenantId.length; i++) {
    const char = tenantId.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  // Keep within 32-bit integer range for pg_advisory_lock
  return Math.abs(hash) % 2147483647
}
