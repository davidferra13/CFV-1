import type { NotificationCategory, NotificationAction } from '@/lib/notifications/types'

const DEFAULT_WINDOW_MS = 4 * 60 * 60 * 1000 // 4 hours

// Actions that must never be grouped (always shown individually)
const NEVER_GROUP: NotificationAction[] = ['system_alert', 'payment_failed']

export interface RawNotification {
  id: string
  category: NotificationCategory
  action: NotificationAction
  title: string
  message: string
  link?: string
  eventId?: string
  createdAt: string
  read: boolean
}

export interface AggregatedNotification {
  kind: 'aggregated'
  groupKey: string
  count: number
  items: RawNotification[]
  representative: RawNotification
  summary: string
  category: NotificationCategory
  mostRecentAt: string
}

export type NotificationItem = AggregatedNotification | RawNotification

const ACTION_LABELS: Partial<Record<NotificationAction, string>> = {
  payment_received: 'payments received',
  new_inquiry: 'new inquiries',
  inquiry_reply: 'inquiry replies',
  quote_accepted: 'quotes accepted',
  event_confirmed: 'events confirmed',
  event_completed: 'events completed',
  new_message: 'new messages',
  client_signup: 'client signups',
  review_submitted: 'reviews submitted',
  refund_processed: 'refunds processed',
  goal_milestone: 'goal milestones reached',
}

function actionLabel(action: NotificationAction, count: number): string {
  if (count === 1) return action.replace(/_/g, ' ')
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ')
}

export function groupNotifications(
  notifications: RawNotification[],
  windowMs: number = DEFAULT_WINDOW_MS
): NotificationItem[] {
  const groups = new Map<string, RawNotification[]>()

  // Build groups by category::action
  for (const n of notifications) {
    if (NEVER_GROUP.includes(n.action)) continue
    const key = `${n.category}::${n.action}`
    const list = groups.get(key) ?? []
    list.push(n)
    groups.set(key, list)
  }

  const result: NotificationItem[] = []

  // Add never-group items as individuals
  for (const n of notifications) {
    if (NEVER_GROUP.includes(n.action)) result.push(n)
  }

  // Process each group, splitting by time window
  for (const [key, items] of groups) {
    const sorted = items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const clusters: RawNotification[][] = []
    let current: RawNotification[] = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(current[current.length - 1].createdAt).getTime()
      const curr = new Date(sorted[i].createdAt).getTime()
      if (prev - curr <= windowMs) {
        current.push(sorted[i])
      } else {
        clusters.push(current)
        current = [sorted[i]]
      }
    }
    clusters.push(current)

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        result.push(cluster[0])
      } else {
        const representative = cluster[0]
        result.push({
          kind: 'aggregated',
          groupKey: key,
          count: cluster.length,
          items: cluster,
          representative,
          summary: `${cluster.length} ${actionLabel(representative.action, cluster.length)}`,
          category: representative.category,
          mostRecentAt: representative.createdAt,
        })
      }
    }
  }

  // Sort by most recent timestamp descending
  return result.sort((a, b) => {
    const timeA = 'mostRecentAt' in a ? a.mostRecentAt : a.createdAt
    const timeB = 'mostRecentAt' in b ? b.mostRecentAt : b.createdAt
    return new Date(timeB).getTime() - new Date(timeA).getTime()
  })
}
