// Timeline search: full-text search across unified thread items for a client
// Used by Communication Timeline (Deliverable 4)

import { getUnifiedThread } from '@/lib/communication/unified-thread'
import type { UnifiedThreadItem } from '@/lib/communication/unified-thread'

export type TimelineSearchResult = {
  items: UnifiedThreadItem[]
  query: string
  total: number
}

/**
 * Search across all unified thread items for a client.
 * Performs case-insensitive substring matching on content.
 * Optionally filters by channel type and date range.
 */
export async function searchTimeline(
  clientId: string,
  tenantId: string,
  options: {
    query?: string
    channels?: string[]
    dateFrom?: string
    dateTo?: string
    limit?: number
  } = {}
): Promise<TimelineSearchResult> {
  // Fetch a large batch so we can filter client-side
  const thread = await getUnifiedThread(clientId, tenantId, { limit: 500 })
  let filtered = thread.items

  // Channel filter
  if (options.channels && options.channels.length > 0) {
    const channelSet = new Set(options.channels)
    filtered = filtered.filter((item) => channelSet.has(item.channel) || channelSet.has(item.type))
  }

  // Date range filter
  if (options.dateFrom) {
    const from = new Date(options.dateFrom).getTime()
    filtered = filtered.filter((item) => new Date(item.timestamp).getTime() >= from)
  }
  if (options.dateTo) {
    const to = new Date(options.dateTo).getTime()
    filtered = filtered.filter((item) => new Date(item.timestamp).getTime() <= to)
  }

  // Text search
  const query = (options.query || '').trim().toLowerCase()
  if (query.length > 0) {
    filtered = filtered.filter((item) => item.content.toLowerCase().includes(query))
  }

  const limit = options.limit ?? 50
  return {
    items: filtered.slice(0, limit),
    query: options.query || '',
    total: filtered.length,
  }
}
