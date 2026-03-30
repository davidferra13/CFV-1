'use server'

/**
 * Substitute Mapping (Phase I)
 * For every ingredient, find the 3 closest substitutes by category and price.
 * Pure database math. No AI.
 *
 * When ribeye is $18/lb, the chef instantly sees "NY strip at $14/lb, flank at $9/lb."
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/**
 * Compute substitute mappings for all ingredients in a tenant.
 * Called as part of the polish job. Admin only (called internally).
 */
export async function computeSubstitutes(options?: {
  dryRun?: boolean
}): Promise<{ computed: number; errors: string[] }> {
  const dryRun = options?.dryRun ?? false
  const errors: string[] = []
  let computed = 0

  try {
    // Get all priced ingredients grouped by category + tenant
    const ingredients = (await db.execute(sql`
      SELECT id, name, category, last_price_cents, tenant_id
      FROM ingredients
      WHERE archived = false
        AND last_price_cents IS NOT NULL
        AND last_price_cents > 0
        AND category IS NOT NULL
        AND category != ''
      ORDER BY tenant_id, category, last_price_cents ASC
    `)) as unknown as Array<{
      id: string
      name: string
      category: string
      last_price_cents: string
      tenant_id: string
    }>

    // Group by tenant+category
    const groups = new Map<string, typeof ingredients>()
    for (const ing of ingredients) {
      const key = `${ing.tenant_id}::${ing.category}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(ing)
    }

    // For each ingredient, find top 3 substitutes in same category
    for (const [, group] of groups) {
      for (const ing of group) {
        const priceCents = parseInt(ing.last_price_cents)
        if (priceCents <= 0) continue

        // Find alternatives: prefer cheaper, sorted by price proximity
        const alternatives = group
          .filter((alt) => alt.id !== ing.id)
          .map((alt) => {
            const altPrice = parseInt(alt.last_price_cents)
            const diffPct = ((altPrice - priceCents) / priceCents) * 100
            return { ...alt, priceCents: altPrice, diffPct }
          })
          // Sort: cheapest alternatives first, then closest in price
          .sort((a, b) => {
            // Prefer cheaper alternatives
            if (a.diffPct < 0 && b.diffPct >= 0) return -1
            if (a.diffPct >= 0 && b.diffPct < 0) return 1
            // Among same direction, sort by absolute price difference
            return Math.abs(a.diffPct) - Math.abs(b.diffPct)
          })
          .slice(0, 3)

        if (alternatives.length === 0) continue

        for (let rank = 0; rank < alternatives.length; rank++) {
          const alt = alternatives[rank]
          const reason =
            alt.diffPct < -5
              ? `Same category, ${Math.abs(Math.round(alt.diffPct))}% cheaper`
              : alt.diffPct > 5
                ? `Same category, ${Math.round(alt.diffPct)}% more expensive`
                : 'Same category, similar price'

          if (!dryRun) {
            try {
              await db.execute(sql`
                INSERT INTO ingredient_substitutes (
                  ingredient_id, tenant_id, substitute_ingredient_id,
                  rank, reason, price_difference_pct, updated_at
                ) VALUES (
                  ${ing.id}, ${ing.tenant_id}, ${alt.id},
                  ${rank + 1}, ${reason}, ${Math.round(alt.diffPct * 100) / 100},
                  now()
                )
                ON CONFLICT (ingredient_id, tenant_id, substitute_ingredient_id) DO UPDATE SET
                  rank = EXCLUDED.rank,
                  reason = EXCLUDED.reason,
                  price_difference_pct = EXCLUDED.price_difference_pct,
                  updated_at = now()
              `)
            } catch (err) {
              errors.push(
                `[substitutes] ${ing.id}->${alt.id}: ${err instanceof Error ? err.message : 'unknown'}`
              )
            }
          }
        }

        computed++
      }
    }
  } catch (err) {
    errors.push(`[substitutes] Query failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  console.log(`[substitutes] Computed ${computed} ingredient mappings, ${errors.length} errors`)
  return { computed, errors }
}

/**
 * Get substitutes for a specific ingredient.
 */
export async function getSubstitutes(options: { ingredientId: string }): Promise<{
  substitutes: Array<{
    id: string
    name: string
    priceCents: number
    diffPct: number
    reason: string
    rank: number
  }>
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const rows = (await db.execute(sql`
    SELECT
      s.substitute_ingredient_id as id,
      i.name,
      i.last_price_cents,
      s.price_difference_pct,
      s.reason,
      s.rank
    FROM ingredient_substitutes s
    JOIN ingredients i ON i.id = s.substitute_ingredient_id
    WHERE s.ingredient_id = ${options.ingredientId}
      AND s.tenant_id = ${tenantId}
    ORDER BY s.rank ASC
    LIMIT 5
  `)) as unknown as Array<{
    id: string
    name: string
    last_price_cents: string | null
    price_difference_pct: string
    reason: string
    rank: number
  }>

  return {
    substitutes: rows.map((r) => ({
      id: r.id,
      name: r.name,
      priceCents: parseInt(r.last_price_cents || '0'),
      diffPct: parseFloat(r.price_difference_pct),
      reason: r.reason,
      rank: r.rank,
    })),
  }
}
