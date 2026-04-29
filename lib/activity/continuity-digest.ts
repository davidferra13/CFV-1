import { createServerClient } from '@/lib/db/server'
import type { BreadcrumbEntry } from '@/lib/activity/breadcrumb-types'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'

const SESSION_GAP_MS = 30 * 60 * 1000
const DEFAULT_FALLBACK_HOURS = 24

export type ContinuityDigestActivity = {
  id: string
  summary: string
  domain: string
  action: string
  entityType: string
  entityId: string | null
  createdAt: string
}

export type ContinuityDigestSession = {
  sessionId: string
  startedAt: string
  endedAt: string
  pageCount: number
  lastPath: string | null
}

export type ContinuityDigest = {
  cutoff: string
  cutoffSource: 'previous_session' | 'fallback_window'
  generatedAt: string
  activityCount: number
  activities: ContinuityDigestActivity[]
  recentSessions: ContinuityDigestSession[]
}

export function isContinuityDigestPrompt(message: string): boolean {
  return /\b(?:what'?s?\s+changed|what\s+changed|what'?s?\s+new|while\s+i\s+was\s+(?:away|gone)|since\s+i\s+(?:left|was\s+away|was\s+gone)|catch\s+me\s+up|pick\s+back\s+up|resume\s+where\s+i\s+left|been\s+happening)\b/i.test(
    message
  )
}

export function buildContinuityDigest(input: {
  activities: ChefActivityEntry[]
  breadcrumbs: BreadcrumbEntry[]
  now?: Date
  fallbackHours?: number
  activityLimit?: number
}): ContinuityDigest {
  const now = input.now ?? new Date()
  const fallbackHours = input.fallbackHours ?? DEFAULT_FALLBACK_HOURS
  const sessions = groupBreadcrumbSessions(input.breadcrumbs)
  const previousSession = sessions.length >= 2 ? sessions[1] : null
  const fallbackCutoff = new Date(now.getTime() - fallbackHours * 60 * 60 * 1000).toISOString()
  const cutoff = previousSession?.endedAt ?? fallbackCutoff
  const cutoffTime = Date.parse(cutoff)
  const activityLimit = input.activityLimit ?? 8

  const activities = input.activities
    .filter((activity) => {
      const createdAt = Date.parse(activity.created_at)
      return Number.isFinite(createdAt) && createdAt > cutoffTime
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))

  return {
    cutoff,
    cutoffSource: previousSession ? 'previous_session' : 'fallback_window',
    generatedAt: now.toISOString(),
    activityCount: activities.length,
    activities: activities.slice(0, activityLimit).map((activity) => ({
      id: activity.id,
      summary: activity.summary,
      domain: activity.domain,
      action: activity.action,
      entityType: activity.entity_type,
      entityId: activity.entity_id,
      createdAt: activity.created_at,
    })),
    recentSessions: sessions.slice(0, 3),
  }
}

export async function loadContinuityDigest(tenantId: string): Promise<ContinuityDigest> {
  const db: any = createServerClient()
  const now = new Date()
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [activityResult, breadcrumbResult] = await Promise.all([
    db
      .from('chef_activity_log')
      .select(
        'id, tenant_id, actor_id, action, domain, entity_type, entity_id, summary, context, client_id, created_at'
      )
      .eq('tenant_id', tenantId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('chef_breadcrumbs')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (activityResult.error) {
    throw new Error(`Failed to load continuity activity: ${activityResult.error.message}`)
  }
  if (breadcrumbResult.error) {
    throw new Error(`Failed to load continuity breadcrumbs: ${breadcrumbResult.error.message}`)
  }

  return buildContinuityDigest({
    activities: (activityResult.data ?? []) as ChefActivityEntry[],
    breadcrumbs: (breadcrumbResult.data ?? []) as BreadcrumbEntry[],
    now,
  })
}

function groupBreadcrumbSessions(breadcrumbs: BreadcrumbEntry[]): ContinuityDigestSession[] {
  if (breadcrumbs.length === 0) return []

  const chronological = breadcrumbs
    .slice()
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
  const sessions: BreadcrumbEntry[][] = []
  let current: BreadcrumbEntry[] = []

  for (const breadcrumb of chronological) {
    const previous = current[current.length - 1]
    if (
      previous &&
      Date.parse(breadcrumb.created_at) - Date.parse(previous.created_at) > SESSION_GAP_MS
    ) {
      sessions.push(current)
      current = []
    }
    current.push(breadcrumb)
  }

  if (current.length > 0) sessions.push(current)

  return sessions
    .map((session) => {
      const first = session[0]
      const last = session[session.length - 1]
      const pageViews = session.filter((entry) => entry.breadcrumb_type === 'page_view')
      return {
        sessionId: first.session_id || first.id,
        startedAt: first.created_at,
        endedAt: last.created_at,
        pageCount: pageViews.length,
        lastPath: last.path ?? null,
      }
    })
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
}
