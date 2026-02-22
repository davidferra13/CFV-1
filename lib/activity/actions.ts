// Activity dashboard server actions (engagement + feed queries).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type {
  ActivityEvent,
  ActivityQueryOptions,
  ActivityQueryResult,
  ActiveClient,
  ActiveClientWithContext,
  ActivityEventRow,
} from './types'
import { incrementMetric, logActivityEvent } from './observability'
import { computeEngagementScore } from './engagement'

function normalizeMetadata(input: ActivityEventRow['metadata']): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  return input as Record<string, unknown>
}

function normalizeActivityEvent(row: ActivityEventRow): ActivityEvent {
  return {
    ...row,
    actor_type: row.actor_type as ActivityEvent['actor_type'],
    event_type: row.event_type as ActivityEvent['event_type'],
    metadata: normalizeMetadata(row.metadata),
  }
}

function parseDaysBack(daysBack?: number): number {
  if (daysBack === 0) return 0 // "all time" sentinel
  const parsed = Math.max(1, Math.min(3650, daysBack ?? 7))
  return Number.isFinite(parsed) ? parsed : 7
}

export async function getActiveClients(minutesWindow = 15): Promise<ActiveClient[]> {
  const user = await requireChef()
  const supabase = createServerClient()
  const since = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('activity_events')
    .select(
      `
      client_id,
      event_type,
      entity_type,
      entity_id,
      metadata,
      created_at,
      clients:client_id(full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('actor_type', 'client')
    .not('client_id', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    incrementMetric('activity.feed.query_failure')
    logActivityEvent('error', 'getActiveClients failed', { error: error.message })
    return []
  }

  const clientMap = new Map<string, ActiveClient>()
  for (const row of data || []) {
    if (!row.client_id || clientMap.has(row.client_id)) continue
    const clientData = row.clients as { full_name: string } | null
    clientMap.set(row.client_id, {
      client_id: row.client_id,
      client_name: clientData?.full_name || 'Unknown',
      last_activity: row.created_at,
      event_type: row.event_type as ActiveClient['event_type'],
      entity_type: row.entity_type,
      last_entity_id: row.entity_id,
      metadata: normalizeMetadata(row.metadata),
    })
  }

  return Array.from(clientMap.values())
}

export async function getActivityFeed(
  options: ActivityQueryOptions = {}
): Promise<ActivityQueryResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  const limit = Math.max(1, Math.min(100, options.limit ?? 25))
  const daysBack = parseDaysBack(options.daysBack)

  let query = supabase
    .from('activity_events')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (daysBack > 0) {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', since)
  }

  if (options.actorType) {
    query = query.eq('actor_type', options.actorType)
  }

  if (options.actorTypes && options.actorTypes.length > 0) {
    query = query.in('actor_type', options.actorTypes)
  }

  if (options.eventTypes && options.eventTypes.length > 0) {
    query = query.in('event_type', options.eventTypes)
  }

  if (options.excludeEventTypes && options.excludeEventTypes.length > 0) {
    for (const excluded of options.excludeEventTypes) {
      query = query.neq('event_type', excluded)
    }
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
    logActivityEvent('error', 'getActivityFeed failed', { error: error.message, options })
    return { items: [], nextCursor: null }
  }

  const rows = (data || []) as ActivityEventRow[]
  const hasMore = rows.length > limit
  const sliced = hasMore ? rows.slice(0, limit) : rows
  const items = sliced.map(normalizeActivityEvent)
  const nextCursor = hasMore ? items[items.length - 1]?.created_at || null : null

  return { items, nextCursor }
}

export async function getRecentActivity(limit = 20): Promise<ActivityEvent[]> {
  const { items } = await getActivityFeed({ limit, daysBack: 30 })
  return items
}

export async function getRecentClientActivity(options?: {
  limit?: number
  daysBack?: number
  cursor?: string | null
}): Promise<ActivityQueryResult> {
  return getActivityFeed({
    limit: options?.limit ?? 25,
    daysBack: options?.daysBack ?? 30,
    cursor: options?.cursor || null,
    actorType: 'client',
    // session_heartbeat is internal — written to DB for engagement scoring, never shown in feeds
    excludeEventTypes: ['session_heartbeat'],
  })
}

export async function getClientTimeline(clientId: string, limit = 30): Promise<ActivityEvent[]> {
  const { items } = await getActivityFeed({
    limit,
    clientId,
    daysBack: 90,
  })
  return items
}

export async function getEngagementStats(): Promise<{
  activeToday: number
  activeThisWeek: number
  totalEventsThisWeek: number
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const { data: todayData } = await supabase
    .from('activity_events')
    .select('client_id')
    .eq('tenant_id', user.tenantId!)
    .eq('actor_type', 'client')
    .not('client_id', 'is', null)
    .gte('created_at', todayStart.toISOString())

  const uniqueToday = new Set((todayData || []).map((r) => r.client_id).filter(Boolean))

  const { data: weekData } = await supabase
    .from('activity_events')
    .select('client_id')
    .eq('tenant_id', user.tenantId!)
    .eq('actor_type', 'client')
    .not('client_id', 'is', null)
    .gte('created_at', weekAgo.toISOString())

  const uniqueWeek = new Set((weekData || []).map((r) => r.client_id).filter(Boolean))

  const { count } = await supabase
    .from('activity_events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('actor_type', 'client')
    .gte('created_at', weekAgo.toISOString())

  return {
    activeToday: uniqueToday.size,
    activeThisWeek: uniqueWeek.size,
    totalEventsThisWeek: count || 0,
  }
}

/**
 * Returns active clients enriched with engagement scores and entity context (event occasion).
 * Used by the dedicated /clients/presence monitoring page.
 */
export async function getActiveClientsWithContext(
  minutesWindow = 60
): Promise<ActiveClientWithContext[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const activeClients = await getActiveClients(minutesWindow)
  if (activeClients.length === 0) return []

  const clientIds = activeClients.map((c) => c.client_id)
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all recent events for active clients in one query (for engagement scoring)
  const eventEntityIds = activeClients
    .filter((c) => c.entity_type === 'event' && c.last_entity_id)
    .map((c) => c.last_entity_id!)

  const [recentEventsResult, eventTitlesResult] = await Promise.all([
    supabase
      .from('activity_events')
      .select('client_id, event_type, created_at, metadata')
      .eq('tenant_id', user.tenantId!)
      .in('client_id', clientIds)
      .gte('created_at', since14d)
      .order('created_at', { ascending: false }),
    eventEntityIds.length > 0
      ? supabase.from('events').select('id, occasion').in('id', eventEntityIds)
      : Promise.resolve({ data: [] as { id: string; occasion: string | null }[], error: null }),
  ])

  // Group raw events by client for engagement scoring
  const eventsByClient = new Map<string, ActivityEvent[]>()
  for (const row of recentEventsResult.data || []) {
    if (!row.client_id) continue
    const list = eventsByClient.get(row.client_id) || []
    list.push({
      id: '',
      tenant_id: user.tenantId!,
      actor_id: row.client_id,
      client_id: row.client_id,
      actor_type: 'client',
      event_type: row.event_type as ActivityEvent['event_type'],
      entity_type: null,
      entity_id: null,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {},
      created_at: row.created_at,
    })
    eventsByClient.set(row.client_id, list)
  }

  // Build entity title lookup from event occasions
  const entityTitles = new Map<string, string>()
  for (const event of eventTitlesResult.data || []) {
    if (event.occasion) entityTitles.set(event.id, event.occasion)
  }

  return activeClients.map((client) => {
    const clientEvents = eventsByClient.get(client.client_id) || []
    const engagement = computeEngagementScore(clientEvents)
    const entityTitle =
      client.entity_type === 'event' && client.last_entity_id
        ? (entityTitles.get(client.last_entity_id) ?? null)
        : null

    return {
      ...client,
      engagement_level: engagement.level,
      engagement_signals: engagement.signals,
      entity_title: entityTitle,
    }
  })
}
