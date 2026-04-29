import { createServerClient } from '@/lib/db/server'
import type { BreadcrumbEntry } from '@/lib/activity/breadcrumb-types'
import type { ChefActivityEntry } from '@/lib/activity/chef-types'

const SESSION_GAP_MS = 30 * 60 * 1000
const DEFAULT_FALLBACK_HOURS = 24
const DEFAULT_ACTIVITY_LIMIT = 8
const DEFAULT_ENTITY_LIMIT = 5
const DEFAULT_ENTITY_LINK_LIMIT = 8

export type ContinuityDigestLoadState = 'available' | 'degraded' | 'unavailable'
export type ContinuityDigestDataSource = 'activity' | 'breadcrumbs'

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

export type ContinuityDigestChangedEntity = {
  entityType: string
  entityId: string
  domain: string
  changeCount: number
  lastChangedAt: string
  href: string | null
}

export type ContinuityDigestEntityLink = {
  entityType: string
  entityId: string
  href: string
  changeCount: number
  lastChangedAt: string
}

export type ContinuityDigest = {
  cutoff: string
  cutoffSource: 'previous_session' | 'fallback_window'
  generatedAt: string
  loadState: ContinuityDigestLoadState
  failedSources: ContinuityDigestDataSource[]
  activityCount: number
  activities: ContinuityDigestActivity[]
  recentSessions: ContinuityDigestSession[]
  lastSession: ContinuityDigestSession | null
  lastPath: string | null
  changedEntityLinks: ContinuityDigestEntityLink[]
  topChangedEntities: ContinuityDigestChangedEntity[]
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
  entityLimit?: number
  entityLinkLimit?: number
  loadState?: ContinuityDigestLoadState
  failedSources?: ContinuityDigestDataSource[]
}): ContinuityDigest {
  const now = input.now ?? new Date()
  const fallbackHours = input.fallbackHours ?? DEFAULT_FALLBACK_HOURS
  const sessions = groupBreadcrumbSessions(input.breadcrumbs)
  const previousSession = sessions.length >= 2 ? sessions[1] : null
  const lastSession = previousSession ?? sessions[0] ?? null
  const fallbackCutoff = new Date(now.getTime() - fallbackHours * 60 * 60 * 1000).toISOString()
  const cutoff = previousSession?.endedAt ?? fallbackCutoff
  const cutoffTime = Date.parse(cutoff)
  const activityLimit = input.activityLimit ?? DEFAULT_ACTIVITY_LIMIT
  const entityLimit = input.entityLimit ?? DEFAULT_ENTITY_LIMIT
  const entityLinkLimit = input.entityLinkLimit ?? DEFAULT_ENTITY_LINK_LIMIT

  const activities = input.activities
    .filter((activity) => {
      const createdAt = Date.parse(activity.created_at)
      return Number.isFinite(createdAt) && createdAt > cutoffTime
    })
    .sort(compareActivitiesDescending)
  const changedEntities = buildChangedEntities(activities)

  return {
    cutoff,
    cutoffSource: previousSession ? 'previous_session' : 'fallback_window',
    generatedAt: now.toISOString(),
    loadState: input.loadState ?? 'available',
    failedSources: input.failedSources ?? [],
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
    lastSession,
    lastPath: lastSession?.lastPath ?? null,
    changedEntityLinks: changedEntities
      .filter((entity): entity is ContinuityDigestChangedEntity & { href: string } =>
        Boolean(entity.href)
      )
      .slice(0, entityLinkLimit)
      .map((entity) => ({
        entityType: entity.entityType,
        entityId: entity.entityId,
        href: entity.href,
        changeCount: entity.changeCount,
        lastChangedAt: entity.lastChangedAt,
      })),
    topChangedEntities: changedEntities.slice(0, entityLimit),
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

  const failedSources: ContinuityDigestDataSource[] = []
  if (activityResult.error) failedSources.push('activity')
  if (breadcrumbResult.error) failedSources.push('breadcrumbs')
  const loadState: ContinuityDigestLoadState =
    failedSources.length === 0
      ? 'available'
      : failedSources.length === 2
        ? 'unavailable'
        : 'degraded'

  return buildContinuityDigest({
    activities: activityResult.error ? [] : ((activityResult.data ?? []) as ChefActivityEntry[]),
    breadcrumbs: breadcrumbResult.error ? [] : ((breadcrumbResult.data ?? []) as BreadcrumbEntry[]),
    now,
    loadState,
    failedSources,
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

function compareActivitiesDescending(a: ChefActivityEntry, b: ChefActivityEntry): number {
  const timeDelta = Date.parse(b.created_at) - Date.parse(a.created_at)
  if (timeDelta !== 0) return timeDelta
  return a.id.localeCompare(b.id)
}

function buildChangedEntities(activities: ChefActivityEntry[]): ContinuityDigestChangedEntity[] {
  const byEntity = new Map<string, ContinuityDigestChangedEntity>()

  for (const activity of activities) {
    if (!activity.entity_id) continue

    const key = `${activity.entity_type}:${activity.entity_id}`
    const existing = byEntity.get(key)
    if (existing) {
      existing.changeCount += 1
      if (Date.parse(activity.created_at) > Date.parse(existing.lastChangedAt)) {
        existing.lastChangedAt = activity.created_at
        existing.domain = activity.domain
      }
      continue
    }

    byEntity.set(key, {
      entityType: activity.entity_type,
      entityId: activity.entity_id,
      domain: activity.domain,
      changeCount: 1,
      lastChangedAt: activity.created_at,
      href: resolveEntityHref(activity.entity_type, activity.entity_id, activity.domain),
    })
  }

  return Array.from(byEntity.values()).sort((a, b) => {
    if (b.changeCount !== a.changeCount) return b.changeCount - a.changeCount

    const timeDelta = Date.parse(b.lastChangedAt) - Date.parse(a.lastChangedAt)
    if (timeDelta !== 0) return timeDelta

    const typeDelta = a.entityType.localeCompare(b.entityType)
    if (typeDelta !== 0) return typeDelta

    return a.entityId.localeCompare(b.entityId)
  })
}

function resolveEntityHref(
  entityType: string,
  entityId: string,
  domain: ChefActivityEntry['domain']
): string | null {
  const normalizedType = entityType.toLowerCase()
  const safeId = encodeURIComponent(entityId)

  switch (normalizedType) {
    case 'event':
      return `/events/${safeId}`
    case 'inquiry':
      return `/inquiries/${safeId}`
    case 'quote':
      return `/quotes/${safeId}`
    case 'menu':
      return `/culinary/menus/${safeId}`
    case 'recipe':
      return `/recipes/${safeId}`
    case 'client':
      return `/clients/${safeId}`
    default:
      break
  }

  if (domain === 'event') return `/events/${safeId}`
  if (domain === 'inquiry') return `/inquiries/${safeId}`
  if (domain === 'quote') return `/quotes/${safeId}`
  if (domain === 'menu') return `/culinary/menus/${safeId}`
  if (domain === 'recipe') return `/recipes/${safeId}`
  if (domain === 'client') return `/clients/${safeId}`

  return null
}
