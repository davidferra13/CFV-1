// Recipe Versioning & Cost History
// Auto-snapshots recipe state (ingredients + costs) before edits.
// Provides version history with cost tracking over time.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ────────────────────────────────────────────────────────────────

export type RecipeVersionSummary = {
  id: string
  versionNumber: number
  changeSummary: string | null
  createdAt: string
  createdBy: string | null
  totalCostCents: number | null
  costPerPortionCents: number | null
  ingredientCount: number
}

export type RecipeVersionDetail = RecipeVersionSummary & {
  snapshot: {
    name?: string
    category?: string
    method?: string
    yield_quantity?: number | null
    yield_unit?: string | null
    servings?: number | null
    dietary_tags?: string[]
    ingredients?: Array<{
      name: string
      quantity: number
      unit: string
      priceCents: number | null
      isOptional: boolean
    }>
  }
}

// ── Snapshot Before Update ───────────────────────────────────────────────

/**
 * Capture current recipe state (including ingredients and costs) as a version snapshot.
 * Called automatically before recipe updates to preserve history.
 * Non-blocking: failures are logged but don't prevent the update.
 */
export async function snapshotRecipeVersion(
  recipeId: string,
  changeSummary?: string
): Promise<void> {
  try {
    const user = await requireChef()
    const supabase: any = createServerClient()

    // Fetch current recipe state
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(
        'name, category, method, yield_quantity, yield_unit, servings, dietary_tags, updated_at'
      )
      .eq('id', recipeId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (recipeError || !recipe) return

    // Fetch current ingredients with costs
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity, unit, is_optional, ingredient:ingredients(name, average_price_cents)')
      .eq('recipe_id', recipeId)
      .order('sort_order', { ascending: true })

    const ingredientSnapshot = (ingredients ?? []).map((ri: any) => ({
      name: ri.ingredient?.name ?? 'Unknown',
      quantity: ri.quantity,
      unit: ri.unit,
      priceCents: ri.ingredient?.average_price_cents ?? null,
      isOptional: ri.is_optional ?? false,
    }))

    // Compute total cost from snapshot
    let totalCostCents: number | null = null
    const priced = ingredientSnapshot.filter((i: any) => i.priceCents != null && !i.isOptional)
    if (priced.length > 0) {
      totalCostCents = priced.reduce(
        (sum: number, i: any) => sum + Math.round(i.quantity * i.priceCents),
        0
      )
    }

    const costPerPortionCents =
      totalCostCents != null && recipe.yield_quantity
        ? Math.round(totalCostCents / recipe.yield_quantity)
        : null

    // Find next version number
    const { data: existing } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('tenant_id', user.tenantId!)
      .eq('entity_type', 'recipe')
      .eq('entity_id', recipeId)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion = existing && existing.length > 0 ? existing[0].version_number + 1 : 1

    await supabase.from('document_versions').insert({
      tenant_id: user.tenantId!,
      entity_type: 'recipe',
      entity_id: recipeId,
      version_number: nextVersion,
      snapshot: {
        ...recipe,
        ingredients: ingredientSnapshot,
        totalCostCents,
        costPerPortionCents,
        ingredientCount: ingredientSnapshot.length,
      },
      change_summary: changeSummary ?? `Version ${nextVersion}`,
      created_by: user.id,
    })
  } catch (err) {
    // Non-blocking: log and continue
    console.error('[snapshotRecipeVersion] Failed (non-fatal):', err)
  }
}

// ── Get Version History ──────────────────────────────────────────────────

/**
 * Get all version snapshots for a recipe, newest first.
 */
export async function getRecipeVersionHistory(recipeId: string): Promise<RecipeVersionSummary[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('document_versions')
    .select('id, version_number, snapshot, change_summary, created_by, created_at')
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', 'recipe')
    .eq('entity_id', recipeId)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('[getRecipeVersionHistory] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    versionNumber: row.version_number,
    changeSummary: row.change_summary,
    createdAt: row.created_at,
    createdBy: row.created_by,
    totalCostCents: row.snapshot?.totalCostCents ?? null,
    costPerPortionCents: row.snapshot?.costPerPortionCents ?? null,
    ingredientCount: row.snapshot?.ingredientCount ?? 0,
  }))
}

/**
 * Get a specific version's full detail including ingredient snapshot.
 */
export async function getRecipeVersionDetail(
  versionId: string
): Promise<RecipeVersionDetail | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('id', versionId)
    .eq('tenant_id', user.tenantId!)
    .eq('entity_type', 'recipe')
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    versionNumber: data.version_number,
    changeSummary: data.change_summary,
    createdAt: data.created_at,
    createdBy: data.created_by,
    totalCostCents: data.snapshot?.totalCostCents ?? null,
    costPerPortionCents: data.snapshot?.costPerPortionCents ?? null,
    ingredientCount: data.snapshot?.ingredientCount ?? 0,
    snapshot: {
      name: data.snapshot?.name,
      category: data.snapshot?.category,
      method: data.snapshot?.method,
      yield_quantity: data.snapshot?.yield_quantity,
      yield_unit: data.snapshot?.yield_unit,
      servings: data.snapshot?.servings,
      dietary_tags: data.snapshot?.dietary_tags,
      ingredients: data.snapshot?.ingredients ?? [],
    },
  }
}
