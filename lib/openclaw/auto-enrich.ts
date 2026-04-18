/**
 * Auto-Enrich New Ingredients
 *
 * Shared non-blocking enrichment for newly created ingredients.
 * Called from ALL ingredient creation paths:
 *   - lib/recipes/actions.ts (createIngredient, findOrCreateIngredient)
 *   - lib/ai/import-actions.ts (brain dump import)
 *   - lib/recipes/photo-import-actions.ts (photo/vision import)
 *   - lib/recipes/csv-import-actions.ts (CSV import)
 *
 * NOT a 'use server' file. Internal logic only.
 */

import type { createServerClient } from '@/lib/db/server'

/**
 * Auto-match ingredient to system_ingredients via pg_trgm, then resolve price
 * from the 10-tier chain. Non-blocking: callers wrap in try/catch.
 */
export async function autoEnrichNewIngredient(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  ingredientId: string,
  ingredientName: string
): Promise<void> {
  const { normalizeIngredientName } = await import('@/lib/pricing/ingredient-matching-utils')

  const normalized = normalizeIngredientName(ingredientName)
  if (!normalized || normalized.length < 2) return

  // Step 1: Auto-match to system_ingredients via pg_trgm
  const { data: existingAlias } = await db
    .from('ingredient_aliases')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('ingredient_id', ingredientId)
    .single()

  if (!existingAlias) {
    try {
      const { data: matches } = await db.rpc('raw_sql', {
        query: `
          SELECT id, name, extensions.similarity(lower(name), $1) AS score
          FROM system_ingredients
          WHERE extensions.similarity(lower(name), $1) > 0.4
            AND is_active = true
          ORDER BY score DESC
          LIMIT 1
        `,
        params: [normalized],
      })

      if (matches && (matches as any[]).length > 0) {
        const bestMatch = (matches as any[])[0]
        if (bestMatch.id && bestMatch.score >= 0.5) {
          await db.from('ingredient_aliases').insert({
            tenant_id: tenantId,
            ingredient_id: ingredientId,
            system_ingredient_id: bestMatch.id,
            match_method: 'trigram',
            similarity_score: bestMatch.score,
            // confirmed_at left null: chef must review
          })
        }
      }
    } catch (err) {
      console.error('[autoEnrichNewIngredient] pg_trgm query failed:', err)
    }
  }

  // Step 2: Resolve best available price
  const { data: ingredient } = await db
    .from('ingredients')
    .select('cost_per_unit_cents, last_price_cents')
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!ingredient) return
  if (ingredient.cost_per_unit_cents != null || ingredient.last_price_cents != null) return

  const { resolvePrice } = await import('@/lib/pricing/resolve-price')
  let resolved = await resolvePrice(ingredientId, tenantId)

  // Fallback: sibling alias check
  if (resolved.cents == null || resolved.source === 'none') {
    try {
      const { data: alias } = await db
        .from('ingredient_aliases')
        .select('system_ingredient_id')
        .eq('tenant_id', tenantId)
        .eq('ingredient_id', ingredientId)
        .single()

      if (alias?.system_ingredient_id) {
        const { data: siblings } = await db
          .from('ingredient_aliases')
          .select('ingredient_id')
          .eq('tenant_id', tenantId)
          .eq('system_ingredient_id', alias.system_ingredient_id)
          .neq('ingredient_id', ingredientId)
          .limit(5)

        if (siblings && siblings.length > 0) {
          for (const sibling of siblings) {
            const siblingResolved = await resolvePrice(sibling.ingredient_id, tenantId)
            if (siblingResolved.cents != null && siblingResolved.source !== 'none') {
              resolved = siblingResolved
              break
            }
          }
        }
      }
    } catch {
      // non-blocking
    }
  }

  if (resolved.cents == null || resolved.source === 'none') return

  // Write resolved price
  await db
    .from('ingredients')
    .update({
      last_price_cents: resolved.cents,
      last_price_source: resolved.source,
      last_price_store: resolved.store || null,
      last_price_confidence: resolved.confidence,
    } as any)
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
}
