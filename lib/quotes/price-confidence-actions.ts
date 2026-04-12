'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface QuotePriceConfidence {
  hasLinkedMenu: boolean
  totalMenus: number
  menusWithFullCosts: number
  menusWithPartialCosts: number
  coveragePct: number | null
}

/**
 * Check whether the menus attached to an event have full recipe cost coverage.
 * Used on the quote detail page to surface a "price confidence" warning.
 */
export async function getEventMenuPriceConfidence(
  eventId: string
): Promise<QuotePriceConfidence | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get menus for this event with their cost summary
  const { data: menus, error } = await db
    .from('menus')
    .select('id, menu_cost_summary:menu_cost_summary(has_all_recipe_costs, total_component_count)')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if (error || !menus || menus.length === 0) {
    return {
      hasLinkedMenu: false,
      totalMenus: 0,
      menusWithFullCosts: 0,
      menusWithPartialCosts: 0,
      coveragePct: null,
    }
  }

  let full = 0
  let partial = 0
  let noData = 0

  for (const menu of menus) {
    const summary = Array.isArray(menu.menu_cost_summary)
      ? menu.menu_cost_summary[0]
      : menu.menu_cost_summary

    if (!summary || summary.total_component_count == null || summary.total_component_count === 0) {
      noData++
    } else if (summary.has_all_recipe_costs === true) {
      full++
    } else {
      partial++
    }
  }

  const total = menus.length
  const coveragePct = total > 0 ? Math.round((full / total) * 100) : null

  return {
    hasLinkedMenu: true,
    totalMenus: total,
    menusWithFullCosts: full,
    menusWithPartialCosts: partial,
    coveragePct,
  }
}
