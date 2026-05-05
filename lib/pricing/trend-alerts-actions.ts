'use server'

/**
 * Price Trend Alerts - Server action producing chef-personalized trend alerts.
 * Queries openclaw.ingredient_trends for ingredients the chef actually uses.
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { pgClient } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { TrendAlert } from '@/components/pricing/price-trend-alerts'

export async function getTrendAlerts(): Promise<TrendAlert[]> {
  const user = await requireChef()
  if (!user.tenantId) return []

  // Get chef's ingredients with their canonical IDs
  const ingredients = (await db.execute(sql`
    SELECT DISTINCT
      ri.name,
      ri.canonical_ingredient_id,
      ri.unit
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    WHERE r.tenant_id = ${user.tenantId}
      AND r.is_archived = false
      AND ri.canonical_ingredient_id IS NOT NULL
    LIMIT 200
  `)) as unknown as Array<{
    name: string
    canonical_ingredient_id: string
    unit: string
  }>

  if (ingredients.length === 0) return []

  const canonicalIds = ingredients.map((i) => i.canonical_ingredient_id)
  const nameMap = new Map(
    ingredients.map((i) => [i.canonical_ingredient_id, { name: i.name, unit: i.unit }])
  )

  // Query trends for chef's ingredients
  const pgSql = pgClient
  const trends = await pgSql`
    SELECT
      ingredient_id,
      direction,
      change_pct,
      confidence,
      current_cents,
      volatility
    FROM openclaw.ingredient_trends
    WHERE ingredient_id = ANY(${canonicalIds})
      AND (
        (direction = 'rising' AND change_pct > 8)
        OR (direction = 'falling' AND change_pct < -8)
        OR (direction = 'volatile' AND volatility > 25)
      )
      AND confidence >= 0.4
    ORDER BY ABS(change_pct) DESC
    LIMIT 15
  `

  const alerts: TrendAlert[] = []

  for (const t of trends) {
    const meta = nameMap.get(t.ingredient_id)
    if (!meta) continue

    const direction =
      t.direction === 'volatile'
        ? ('volatile' as const)
        : Number(t.change_pct) > 0
          ? ('rising' as const)
          : ('falling' as const)

    const changePct = Number(t.change_pct)
    const absPct = Math.abs(changePct)

    let action: string
    if (direction === 'rising' && absPct > 20) {
      action = 'Consider substitutes or adjust menu pricing'
    } else if (direction === 'rising') {
      action = 'Monitor; may need to reprice soon'
    } else if (direction === 'falling' && absPct > 15) {
      action = 'Great time to stock up or feature this ingredient'
    } else if (direction === 'falling') {
      action = 'Price dropping; margin opportunity'
    } else {
      action = 'Price unstable; lock in a vendor price if possible'
    }

    alerts.push({
      ingredientName: meta.name,
      direction,
      changePct,
      currentCents: Number(t.current_cents),
      unit: meta.unit || 'lb',
      action,
    })
  }

  return alerts
}
