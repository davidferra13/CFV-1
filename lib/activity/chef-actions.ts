// Chef activity log query server actions.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ChefActivityEntry,
  ChefActivityDomain,
  ChefActivityQueryOptions,
  ChefActivityQueryResult,
} from './chef-types'
import { incrementMetric, logActivityEvent } from './observability'

function parseDaysBack(daysBack?: number): number {
  if (daysBack === 0) return 0 // "all time" sentinel
  const parsed = Math.max(1, Math.min(3650, daysBack ?? 30))
  return Number.isFinite(parsed) ? parsed : 30
}

export async function getChefActivity(
  options: ChefActivityQueryOptions = {}
): Promise<ChefActivityEntry[]> {
  const { items } = await getChefActivityFeed(options)
  return items
}

export async function getChefActivityFeed(
  options: ChefActivityQueryOptions = {}
): Promise<ChefActivityQueryResult> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = Math.max(1, Math.min(100, options.limit ?? 50))
  const daysBack = parseDaysBack(options.daysBack)

  let query = db
    .from('chef_activity_log')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (daysBack > 0) {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  if (options.domain) {
    query = query.eq('domain', options.domain)
  }

  if (options.clientId) {
    query = query.eq('client_id', options.clientId)
  }

  if (options.cursor) {
    const cursorDate = new Date(options.cursor)
    if (!Number.isNaN(cursorDate.getTime())) {
      query = query.lt('created_at', cursorDate.toISOString())
    }
  }

  const { data, error } = await query

  if (error) {
    incrementMetric('activity.feed.query_failure')
    logActivityEvent('error', 'getChefActivityFeed failed', { error: error.message, options })
    return { items: [], nextCursor: null }
  }

  const rows = (data || []) as unknown as ChefActivityEntry[]
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? items[items.length - 1]?.created_at || null : null

  return { items, nextCursor }
}

export async function getChefActivitySummary(limit = 5): Promise<ChefActivityEntry[]> {
  await requireChef()
  return getChefActivity({ limit, daysBack: 7 })
}

export async function getClientChefActivity(
  clientId: string,
  limit = 30
): Promise<ChefActivityEntry[]> {
  return getChefActivity({ clientId, limit, daysBack: 90 })
}

export async function getActivityCountsByDomain(
  daysBack = 7
): Promise<Partial<Record<ChefActivityDomain, number>>> {
  const user = await requireChef()
  const db: any = createServerClient()
  const resolved = parseDaysBack(daysBack)

  let query = db.from('chef_activity_log').select('domain').eq('tenant_id', user.tenantId!)

  if (resolved > 0) {
    const since = new Date(Date.now() - resolved * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  const { data, error } = await query

  if (error) {
    incrementMetric('activity.feed.query_failure')
    logActivityEvent('error', 'getActivityCountsByDomain failed', { error: error.message })
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of (data || []) as unknown as Array<{ domain: string }>) {
    counts[row.domain] = (counts[row.domain] || 0) + 1
  }

  return counts as Partial<Record<ChefActivityDomain, number>>
}
