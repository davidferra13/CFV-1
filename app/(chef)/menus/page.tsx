// Chef Menus List - Protected by layout

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export const metadata: Metadata = { title: 'Menus' }
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
      const db: any = createServerClient()
      const { data: events } = await db
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

  // Fetch first dish photo per menu for card heroes
  let dishPhotoByMenuId: Record<string, string> = {}
  const menuIds = menus.map((m: any) => m.id)
  if (menuIds.length > 0) {
    try {
      const db: any = createServerClient()
      const { data: dishes } = await db
        .from('dishes')
        .select('menu_id, photo_url')
        .in('menu_id', menuIds)
        .not('photo_url', 'is', null)
        .order('course_number', { ascending: true })
      if (dishes) {
        for (const dish of dishes) {
          if (dish.photo_url && !dishPhotoByMenuId[dish.menu_id]) {
            dishPhotoByMenuId[dish.menu_id] = dish.photo_url
          }
        }
      }
    } catch (err: any) {
      console.error('[menus-list] Dish photos fetch failed (non-blocking):', err.message)
    }
  }

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

      <MenusClientWrapper
        menus={menus}
        eventsById={eventsById}
        costByMenuId={costByMenuId}
        dishPhotoByMenuId={dishPhotoByMenuId}
      />
    </div>
  )
}
