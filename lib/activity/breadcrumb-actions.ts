// Chef breadcrumb query server actions - reading + session grouping for retrace mode.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { BreadcrumbEntry, BreadcrumbSession, BreadcrumbQueryResult } from './breadcrumb-types'
import { labelForPath } from './breadcrumb-types'

const SESSION_GAP_MS = 30 * 60 * 1000 // 30 minutes = new session

function parseDaysBack(daysBack?: number): number {
  if (daysBack === 0) return 0
  const parsed = Math.max(1, Math.min(365, daysBack ?? 7))
  return Number.isFinite(parsed) ? parsed : 7
}

/**
 * Get breadcrumbs grouped into sessions for the retrace view.
 * Sessions are split by 30-minute gaps in activity.
 */
export async function getBreadcrumbSessions(
  options: {
    limit?: number
    daysBack?: number
    cursor?: string | null
  } = {}
): Promise<BreadcrumbQueryResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const daysBack = parseDaysBack(options.daysBack)
  const rawLimit = Math.max(1, Math.min(500, options.limit ?? 200))

  let query = supabase
    .from('chef_breadcrumbs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(rawLimit + 1)

  if (daysBack > 0) {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  if (options.cursor) {
    const cursorDate = new Date(options.cursor)
    if (!Number.isNaN(cursorDate.getTime())) {
      query = query.lt('created_at', cursorDate.toISOString())
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('[breadcrumbs] Query failed:', error.message)
    return { sessions: [], nextCursor: null }
  }

  const rows = (data || []) as unknown as BreadcrumbEntry[]
  const hasMore = rows.length > rawLimit
  const items = hasMore ? rows.slice(0, rawLimit) : rows
  const nextCursor = hasMore ? items[items.length - 1]?.created_at || null : null

  // Group into sessions (reverse chronological → we need to process in chronological order)
  const chronological = [...items].reverse()
  const sessions = groupIntoSessions(chronological)

  // Return sessions newest-first
  sessions.reverse()

  return { sessions, nextCursor }
}

function groupIntoSessions(breadcrumbs: BreadcrumbEntry[]): BreadcrumbSession[] {
  if (breadcrumbs.length === 0) return []

  const sessions: BreadcrumbSession[] = []
  let currentSession: BreadcrumbEntry[] = [breadcrumbs[0]]

  for (let i = 1; i < breadcrumbs.length; i++) {
    const prev = new Date(breadcrumbs[i - 1].created_at).getTime()
    const curr = new Date(breadcrumbs[i].created_at).getTime()

    if (curr - prev > SESSION_GAP_MS) {
      // Gap detected - finalize current session
      sessions.push(buildSession(currentSession))
      currentSession = [breadcrumbs[i]]
    } else {
      currentSession.push(breadcrumbs[i])
    }
  }

  // Finalize last session
  if (currentSession.length > 0) {
    sessions.push(buildSession(currentSession))
  }

  return sessions
}

function buildSession(breadcrumbs: BreadcrumbEntry[]): BreadcrumbSession {
  const first = breadcrumbs[0]
  const last = breadcrumbs[breadcrumbs.length - 1]
  const startedAt = first.created_at
  const endedAt = last.created_at
  const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const durationMinutes = Math.round(durationMs / 60000)

  // Build summary: unique page paths in order visited
  const pageViews = breadcrumbs.filter((b) => b.breadcrumb_type === 'page_view')
  const uniquePages: string[] = []
  for (const pv of pageViews) {
    const label = pv.label || labelForPath(pv.path)
    if (uniquePages[uniquePages.length - 1] !== label) {
      uniquePages.push(label)
    }
  }

  // Cap summary at 5 pages, add "..." if more
  const summaryPages = uniquePages.slice(0, 5)
  const summary =
    summaryPages.join(' → ') +
    (uniquePages.length > 5 ? ` → ... (+${uniquePages.length - 5} more)` : '')

  return {
    session_id: first.session_id || first.id,
    started_at: startedAt,
    ended_at: endedAt,
    duration_minutes: durationMinutes,
    breadcrumbs,
    page_count: pageViews.length,
    summary: summary || 'Brief session',
  }
}
