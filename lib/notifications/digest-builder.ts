import type { NotificationCategory, NotificationAction } from '@/lib/notifications/types'
import type { RawNotification } from '@/lib/notifications/aggregation'

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  inquiry: 'Inquiries',
  quote: 'Quotes',
  event: 'Events',
  payment: 'Payments',
  chat: 'Messages',
  client: 'Clients',
  loyalty: 'Loyalty',
  goals: 'Goals',
  lead: 'Leads',
  protection: 'Protection',
  wellbeing: 'Wellbeing',
  review: 'Reviews',
  ops: 'Operations',
  system: 'System',
}

const URGENT_ACTIONS: NotificationAction[] = [
  'payment_failed',
  'system_alert',
  'account_access_alert',
  'dispute_created',
]

export interface DigestSection {
  category: NotificationCategory
  label: string
  count: number
  highlights: string[]
  hasMore: boolean
}

export interface NotificationDigest {
  period: 'daily' | 'weekly'
  startDate: string
  endDate: string
  totalCount: number
  sections: DigestSection[]
  urgentItems: RawNotification[]
}

export function buildDigest(
  notifications: RawNotification[],
  period: 'daily' | 'weekly',
  startDate: Date,
  endDate: Date
): NotificationDigest {
  const startMs = startDate.getTime()
  const endMs = endDate.getTime()

  // Filter to date range
  const inRange = notifications.filter((n) => {
    const t = new Date(n.createdAt).getTime()
    return t >= startMs && t <= endMs
  })

  const urgentItems: RawNotification[] = []
  const byCategory = new Map<NotificationCategory, RawNotification[]>()

  for (const n of inRange) {
    if (URGENT_ACTIONS.includes(n.action)) {
      urgentItems.push(n)
      continue
    }
    const list = byCategory.get(n.category) ?? []
    list.push(n)
    byCategory.set(n.category, list)
  }

  const sections: DigestSection[] = []
  for (const [category, items] of byCategory) {
    // Sort by most recent first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const highlights = items.slice(0, 3).map((n) => n.title)
    sections.push({
      category,
      label: CATEGORY_LABELS[category],
      count: items.length,
      highlights,
      hasMore: items.length > 3,
    })
  }

  // Sort sections by count descending
  sections.sort((a, b) => b.count - a.count)

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalCount: inRange.length,
    sections,
    urgentItems,
  }
}
