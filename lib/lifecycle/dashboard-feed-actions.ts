'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  FeedItem,
  FeedFilter,
  FeedSummary,
  FeedItemType,
  FeedItemsQuery,
} from './dashboard-feed-types'

// ---- helpers ----

function fromFeedItems(db: any): any {
  return (db as any).from('lifecycle_feed_items')
}

function fromFeedFilters(db: any): any {
  return (db as any).from('lifecycle_feed_filters')
}

// ---- actions ----

export async function getFeedItems(filters?: FeedItemsQuery): Promise<FeedItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromFeedItems(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (filters?.itemTypes && filters.itemTypes.length > 0) {
    query = query.in('item_type', filters.itemTypes)
  }
  if (filters?.eventIds && filters.eventIds.length > 0) {
    query = query.in('event_id', filters.eventIds)
  }
  if (filters?.unreadOnly) {
    query = query.is('read_at', null)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load feed items: ${error.message}`)
  return (data ?? []).map(mapFeedItem)
}

export async function createFeedItem(params: {
  eventId?: string
  itemType: FeedItemType
  title: string
  description?: string
  actorId?: string
  actorName?: string
  metadata?: Record<string, unknown>
}): Promise<FeedItem> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    item_type: params.itemType,
    title: params.title,
  }
  if (params.eventId) payload.event_id = params.eventId
  if (params.description) payload.description = params.description
  if (params.actorId) payload.actor_id = params.actorId
  if (params.actorName) payload.actor_name = params.actorName
  if (params.metadata) payload.metadata = params.metadata

  const { data, error } = await fromFeedItems(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to create feed item: ${error.message}`)
  return mapFeedItem(data)
}

export async function markFeedItemRead(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromFeedItems(db)
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to mark feed item read: ${error.message}`)
}

export async function markAllRead(): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromFeedItems(db)
    .update({ read_at: new Date().toISOString() })
    .eq('tenant_id', user.tenantId)
    .is('read_at', null)

  if (error) throw new Error(`Failed to mark all feed items read: ${error.message}`)
}

export async function getFeedFilters(): Promise<FeedFilter[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromFeedFilters(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load feed filters: ${error.message}`)
  return (data ?? []).map(mapFeedFilter)
}

export async function saveFeedFilter(params: {
  name: string
  itemTypes?: string[]
  eventIds?: string[]
  dateRange?: { from: string; to: string } | null
}): Promise<FeedFilter> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    name: params.name,
    item_types: params.itemTypes ?? [],
    event_ids: params.eventIds ?? [],
  }
  if (params.dateRange !== undefined) payload.date_range = params.dateRange

  const { data, error } = await fromFeedFilters(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to save feed filter: ${error.message}`)
  return mapFeedFilter(data)
}

export async function getFeedSummary(): Promise<FeedSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: items, error } = await fromFeedItems(db)
    .select('item_type, read_at, created_at')
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to load feed summary: ${error.message}`)

  const all = items ?? []
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const itemsByType: Record<string, number> = {}
  let unreadCount = 0
  let recentActivity = 0

  for (const item of all) {
    itemsByType[item.item_type] = (itemsByType[item.item_type] || 0) + 1
    if (!item.read_at) unreadCount++
    if (new Date(item.created_at) >= oneDayAgo) recentActivity++
  }

  return {
    totalItems: all.length,
    unreadCount,
    itemsByType,
    recentActivity,
  }
}

// ---- mappers ----

function mapFeedItem(row: any): FeedItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id ?? null,
    itemType: row.item_type,
    title: row.title,
    description: row.description ?? null,
    actorId: row.actor_id ?? null,
    actorName: row.actor_name ?? null,
    metadata: row.metadata ?? null,
    readAt: row.read_at ? new Date(row.read_at) : null,
    createdAt: new Date(row.created_at),
  }
}

function mapFeedFilter(row: any): FeedFilter {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    itemTypes: row.item_types ?? [],
    eventIds: row.event_ids ?? [],
    dateRange: row.date_range ?? null,
    createdAt: new Date(row.created_at),
  }
}
