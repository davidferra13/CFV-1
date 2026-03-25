// Chef Menus List - Protected by layout

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Menus - ChefFlow' }
import { getMenuCostSummaries, getMenus } from '@/lib/menus/actions'
import { MenusClientWrapper } from './menus-client-wrapper'
import { DietaryTrendsBar } from '@/components/intelligence/dietary-trends-bar'
import { IngredientConsolidationBar } from '@/components/intelligence/ingredient-consolidation-bar'

export default async function MenusPage() {
  const user = await requireChef()

  // Critical fetch: menu list. Non-critical: cost summaries (degrade gracefully)
  const [menus, costSummaries] = await Promise.all([
    getMenus(),
    getMenuCostSummaries().catch((err) => {
      console.error('[menus-list] Cost summaries fetch failed (non-blocking):', err.message)
      return [] as Awaited<ReturnType<typeof getMenuCostSummaries>>
    }),
  ])

  const eventIds = Array.from(
    new Set(menus.map((menu: any) => menu.event_id).filter(Boolean))
  ) as string[]
  let eventsById: Record<
    string,
    { id: string; occasion: string | null; event_date: string; status: string }
  > = {}

  if (eventIds.length > 0) {
    try {
      const supabase: any = createServerClient()
      const { data: events } = await supabase
        .from('events')
        .select('id, occasion, event_date, status')
        .in('id', eventIds)
        .eq('tenant_id', user.tenantId!)

      eventsById = Object.fromEntries((events || []).map((event: any) => [event.id, event]))
    } catch (err: any) {
      console.error('[menus-list] Events fetch failed (non-blocking):', err.message)
    }
  }

  const costByMenuId = Object.fromEntries(
    costSummaries.map((summary) => [summary.menu_id, summary])
  )

  return (
    <div className="space-y-4">
      {/* Dietary Intelligence */}
      <WidgetErrorBoundary name="Dietary Trends" compact>
        <Suspense fallback={null}>
          <DietaryTrendsBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Ingredient Consolidation */}
      <WidgetErrorBoundary name="Ingredient Consolidation" compact>
        <Suspense fallback={null}>
          <IngredientConsolidationBar />
        </Suspense>
      </WidgetErrorBoundary>

      <MenusClientWrapper menus={menus} eventsById={eventsById} costByMenuId={costByMenuId} />
    </div>
  )
}
