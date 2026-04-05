// Quick Metrics Strip - compact counts + completeness at a glance.
// Shows total scale (how much you have) and health (how complete it is).

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { MetricsStripClient } from './metrics-strip-client'

interface StripMetrics {
  recipes: number
  clients: number
  menus: number
  ingredients: number
  pricingPct: number | null
  updatedToday: number
}

async function getStripMetrics(): Promise<StripMetrics> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const result = await pgClient`
    SELECT
      (SELECT COUNT(*)::int FROM recipes WHERE tenant_id = ${tenantId}) AS recipes,
      (SELECT COUNT(*)::int FROM clients WHERE tenant_id = ${tenantId}) AS clients,
      (SELECT COUNT(*)::int FROM menus WHERE tenant_id = ${tenantId}) AS menus,
      (SELECT COUNT(*)::int FROM ingredients WHERE tenant_id = ${tenantId}) AS ingredients,
      (
        SELECT CASE
          WHEN COUNT(*) = 0 THEN NULL
          ELSE ROUND(
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM ingredient_price_history iph
                WHERE iph.ingredient_id = i.id
                AND iph.created_at > NOW() - INTERVAL '30 days'
              )
            ) * 100.0 / COUNT(*)
          )::int
        END
        FROM ingredients i
        WHERE i.tenant_id = ${tenantId}
      ) AS "pricingPct",
      (
        SELECT COUNT(DISTINCT entity_type || entity_id)::int
        FROM chef_activity_log
        WHERE tenant_id = ${tenantId}
        AND created_at >= ${todayStart.toISOString()}
      ) AS "updatedToday"
  `
  const row = result[0] as unknown as StripMetrics | undefined
  return (
    row ?? { recipes: 0, clients: 0, menus: 0, ingredients: 0, pricingPct: null, updatedToday: 0 }
  )
}

export async function MetricsStrip() {
  let metrics: StripMetrics
  try {
    metrics = await getStripMetrics()
  } catch (err) {
    console.error('[MetricsStrip] Failed:', err)
    return null
  }

  // Don't show if the account is empty
  if (metrics.recipes === 0 && metrics.clients === 0 && metrics.menus === 0) {
    return null
  }

  const items: { label: string; value: string; href: string }[] = [
    { label: 'Recipes', value: String(metrics.recipes), href: '/culinary/recipes' },
    { label: 'Clients', value: String(metrics.clients), href: '/clients' },
    { label: 'Menus', value: String(metrics.menus), href: '/culinary/menus' },
    { label: 'Ingredients', value: String(metrics.ingredients), href: '/culinary/ingredients' },
  ]

  if (metrics.pricingPct != null) {
    items.push({
      label: 'Priced',
      value: `${metrics.pricingPct}%`,
      href: '/culinary/price-catalog',
    })
  }

  if (metrics.updatedToday > 0) {
    items.push({
      label: 'Updated today',
      value: String(metrics.updatedToday),
      href: '/activity',
    })
  }

  return <MetricsStripClient items={items} />
}
