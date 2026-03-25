// Unified Inbox Server Actions
// Aggregates chat, CRM messages, Wix submissions, and notifications
// into a single chronological feed.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { UnifiedInboxItem, InboxFilters, InboxStats, InboxSource } from './types'

// ─── Get Unified Inbox ───────────────────────────────────────────────────

export async function getUnifiedInbox(filters?: InboxFilters): Promise<UnifiedInboxItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = filters?.limit ?? 30
  const offset = filters?.offset ?? 0

  let query = db
    .from('unified_inbox' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('activity_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Source filter
  if (filters?.sources && filters.sources.length > 0) {
    query = query.in('source', filters.sources)
  }

  // Context filters
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }
  if (filters?.inquiryId) {
    query = query.eq('inquiry_id', filters.inquiryId)
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  // Unread filter
  if (filters?.unreadOnly) {
    query = query.eq('is_read', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getUnifiedInbox] Error:', error)
    throw new Error('Failed to fetch inbox')
  }

  return (data || []) as unknown as UnifiedInboxItem[]
}

// ─── Get Inbox Stats ─────────────────────────────────────────────────────

export async function getInboxStats(): Promise<InboxStats> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get counts per source (recent 7 days to keep performant)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('unified_inbox' as any)
    .select('source, is_read')
    .eq('tenant_id', user.tenantId!)
    .gte('activity_at', sevenDaysAgo)

  if (error) {
    console.error('[getInboxStats] Error:', error)
    return { total: 0, unread: 0, bySource: { chat: 0, message: 0, wix: 0, notification: 0 } }
  }

  const items = (data || []) as any[]
  const bySource: Record<InboxSource, number> = { chat: 0, message: 0, wix: 0, notification: 0 }
  let unread = 0

  for (const item of items) {
    const source = item.source as InboxSource
    if (bySource[source] !== undefined) {
      bySource[source]++
    }
    if (!item.is_read) unread++
  }

  return {
    total: items.length,
    unread,
    bySource,
  }
}
