'use server'

import { requireChef } from '@/lib/auth/get-user'
import { parseQueueFile, getAllItems } from './queue-parser'
import type {
  BuildQueueSummary,
  BuildQueueItem,
  BuildQueueFilter,
  BuildQueueStatus,
} from './queue-types'
import { BUILD_QUEUE_STATUSES } from './queue-types'

/**
 * Summary counts by status, completion percentage, and per-category breakdown.
 */
export async function getQueueSummary(): Promise<BuildQueueSummary> {
  await requireChef()

  const categories = parseQueueFile()
  const allItems = categories.flatMap((c) => c.items)

  const byStatus = Object.fromEntries(BUILD_QUEUE_STATUSES.map((s) => [s, 0])) as Record<
    BuildQueueStatus,
    number
  >

  for (const item of allItems) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1
  }

  const total = allItems.length
  const done = byStatus['DONE'] || 0
  const completionPercentage = total > 0 ? Math.round((done / total) * 1000) / 10 : 0

  const categoryBreakdown = categories.map((c) => ({
    name: c.name,
    total: c.items.length,
    done: c.items.filter((i) => i.status === 'DONE').length,
  }))

  return {
    total,
    byStatus,
    completionPercentage,
    categories: categoryBreakdown,
  }
}

/**
 * Filtered list of queue items. Supports filtering by status, category, and text search.
 */
export async function getQueueItems(filter?: BuildQueueFilter): Promise<BuildQueueItem[]> {
  await requireChef()

  let items = getAllItems()

  if (filter?.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
    items = items.filter((i) => statuses.includes(i.status))
  }

  if (filter?.category) {
    const cat = filter.category.toLowerCase()
    items = items.filter((i) => i.category.toLowerCase().includes(cat))
  }

  if (filter?.search) {
    const term = filter.search.toLowerCase()
    items = items.filter(
      (i) => i.title.toLowerCase().includes(term) || i.notes.toLowerCase().includes(term)
    )
  }

  return items
}

/**
 * All items with BLOCKED status, including their dependency info.
 */
export async function getBlockedItems(): Promise<BuildQueueItem[]> {
  await requireChef()
  return getAllItems().filter((i) => i.status === 'BLOCKED')
}

/**
 * Overall completion percentage (DONE items / total items).
 */
export async function getCompletionPercentage(): Promise<number> {
  await requireChef()

  const items = getAllItems()
  const total = items.length
  if (total === 0) return 0

  const done = items.filter((i) => i.status === 'DONE').length
  return Math.round((done / total) * 1000) / 10
}
