'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

/** Record a page visit for usage tracking */
export async function trackPageVisit(route: string): Promise<void> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId ?? user.entityId
    const db: any = createServerClient()

    // Upsert: increment visit count or create new row
    await db
      .rpc('upsert_page_visit', {
        p_tenant_id: tenantId,
        p_route: route,
      })
      .catch(async () => {
        // Fallback if RPC not available: try direct insert/update
        const { data: existing } = await db
          .from('page_visits')
          .select('id, visit_count')
          .eq('tenant_id', tenantId)
          .eq('route', route)
          .single()

        if (existing) {
          await db
            .from('page_visits')
            .update({
              visit_count: (existing.visit_count ?? 0) + 1,
              last_visited_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        } else {
          await db.from('page_visits').insert({
            tenant_id: tenantId,
            route,
            visit_count: 1,
            last_visited_at: new Date().toISOString(),
          })
        }
      })
  } catch {
    // Usage tracking is best-effort; never block the user
  }
}

export type UsageStats = {
  route: string
  visitCount: number
  lastVisitedAt: string | null
}

/** Get usage statistics for the authenticated chef's tenant */
export async function getUsageStats(): Promise<UsageStats[]> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const db: any = createServerClient()

  const { data, error } = await db
    .from('page_visits')
    .select('route, visit_count, last_visited_at')
    .eq('tenant_id', tenantId)
    .order('visit_count', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getUsageStats] failed:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    route: row.route,
    visitCount: row.visit_count ?? 0,
    lastVisitedAt: row.last_visited_at ?? null,
  }))
}

/** Get features that have never been visited */
export async function getUnusedFeatures(): Promise<string[]> {
  const ALL_TRACKABLE_ROUTES = [
    '/dashboard',
    '/events',
    '/clients',
    '/recipes',
    '/culinary',
    '/finance',
    '/menus',
    '/inquiries',
    '/calendar',
    '/inbox',
    '/quotes',
    '/circles',
    '/contracts',
    '/analytics',
    '/network',
    '/communication',
    '/autopilot',
    '/tasks',
  ]

  const stats = await getUsageStats()
  const visitedRoutes = new Set(stats.map((s) => s.route))

  return ALL_TRACKABLE_ROUTES.filter((route) => !visitedRoutes.has(route))
}
