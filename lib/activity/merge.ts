import type { ChefActivityEntry } from './chef-types'
import type { ActivityEvent } from './types'

export type MergedActivityItem = {
  id: string
  created_at: string
  source: 'chef' | 'client'
  chef: ChefActivityEntry | null
  client: ActivityEvent | null
}

export function mergeActivityByCreatedAt(
  chefItems: ChefActivityEntry[],
  clientItems: ActivityEvent[]
): MergedActivityItem[] {
  const merged: MergedActivityItem[] = [
    ...chefItems.map((item) => ({
      id: `chef:${item.id}`,
      created_at: item.created_at,
      source: 'chef' as const,
      chef: item,
      client: null,
    })),
    ...clientItems.map((item) => ({
      id: `client:${item.id}`,
      created_at: item.created_at,
      source: 'client' as const,
      chef: null,
      client: item,
    })),
  ]

  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return merged
}

export function parseTimeRangeDays(range: '1' | '7' | '30' | '90' | '180' | '365' | 'all'): number {
  if (range === 'all') return 0 // Sentinel: no date filter
  return Number.parseInt(range, 10)
}
