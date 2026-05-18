// Chef Menus List - Protected by layout

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export const metadata: Metadata = { title: 'Menus' }
import { getMenuCostSummaries, getMenusPaginated } from '@/lib/menus/actions'
import { MenusClientWrapper } from './menus-client-wrapper'
import { DietaryTrendsBar } from '@/components/intelligence/dietary-trends-bar'
import { IngredientConsolidationBar } from '@/components/intelligence/ingredient-consolidation-bar'

function buildMenusUrl(nextPage: number, search: string) {
  const p = new URLSearchParams()
  if (search) p.set('q', search)
  if (nextPage > 1) p.set('page', String(nextPage))
  const qs = p.toString()
  return `/menus${qs ? `?${qs}` : ''}`
}

export default async function MenusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireChef()
  const params = await searchParams
  const search = typeof params.q === 'string' ? params.q.trim() : ''
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  // Critical fetch: menu list (server-side paginated + FTS). Non-critical: cost summaries
  const [{ menus, pagination }, costSummaries] = await Promise.all([
    getMenusPaginated({ search: search || undefined, page, pageSize: 12 }),
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

  const offset = (pagination.page - 1) * pagination.pageSize

  return (
    <div className="space-y-4">
      {/* Server-side search form */}
      <form action="/menus" method="get" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search menus by name, cuisine, description..."
          className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 hover:bg-stone-700"
        >
          Search
        </button>
        {search && (
          <Link href="/menus" className="text-sm text-stone-500 hover:text-stone-300">
            Clear
          </Link>
        )}
      </form>

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

      {/* Server-side pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-stone-800 pt-3">
          <p className="text-xs text-stone-500">
            Showing {offset + 1}-{Math.min(offset + pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={buildMenusUrl(pagination.page - 1, search)}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Previous
              </Link>
            )}
            {pagination.hasMore && (
              <Link
                href={buildMenusUrl(pagination.page + 1, search)}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
