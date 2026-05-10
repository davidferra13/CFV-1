'use server'

// Action Center - Unified Feed
// Fetches from notifications, chef_todos (reminders), and tasks,
// normalizes into UnifiedActionItem[], sorted by priority then time.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { Notification } from '@/lib/notifications/types'
import type { UnifiedActionItem, ActionSource, ActionPriority, ActionStatus } from './types'

// Priority weight for sorting (lower = more urgent = sorted first)
const PRIORITY_WEIGHT: Record<ActionPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

// ---- Normalizers ----

function normalizeNotification(n: Notification): UnifiedActionItem {
  const isRead = !!n.read_at
  const status: ActionStatus = isRead ? 'dismissed' : 'pending'

  return {
    id: `notification:${n.id}`,
    source: 'notification',
    sourceId: n.id,
    title: n.title,
    description: n.body,
    priority: deriveNotificationPriority(n.action),
    status,
    createdAt: n.created_at,
    dueAt: null,
    snoozedUntil: null,
    eventId: n.event_id,
    clientId: n.client_id,
    inquiryId: n.inquiry_id,
    actionUrl: n.action_url,
    metadata: n.metadata ?? {},
    linkedTaskId: (n as any).linked_task_id ?? null,
    linkedNotificationId: null,
  }
}

function deriveNotificationPriority(action: string): ActionPriority {
  const urgentActions = new Set([
    'payment_failed',
    'dispute_created',
    'dietary_menu_conflict',
    'client_allergy_changed',
  ])
  const highActions = new Set([
    'new_inquiry',
    'inquiry_reply',
    'follow_up_due',
    'quote_expiring',
    'wix_submission',
    'guest_dietary_alert',
  ])

  if (urgentActions.has(action)) return 'urgent'
  if (highActions.has(action)) return 'high'
  return 'medium'
}

function normalizeReminder(todo: any): UnifiedActionItem {
  const dueAt = todo.due_date
    ? `${todo.due_date}${todo.due_time ? 'T' + todo.due_time : 'T23:59:59'}`
    : null

  const snoozedUntil = todo.snoozed_until ?? null
  let status: ActionStatus = 'pending'
  if (todo.completed) {
    status = 'completed'
  } else if (snoozedUntil && new Date(snoozedUntil) > new Date()) {
    status = 'snoozed'
  }

  const priority = (todo.priority as ActionPriority) ?? 'medium'

  return {
    id: `reminder:${todo.id}`,
    source: 'reminder',
    sourceId: todo.id,
    title: todo.text,
    description: todo.notes ?? null,
    priority,
    status,
    createdAt: todo.created_at,
    dueAt,
    snoozedUntil,
    eventId: todo.event_id ?? null,
    clientId: todo.client_id ?? null,
    inquiryId: null,
    actionUrl: '/reminders',
    metadata: {
      category: todo.category,
      reminderAt: todo.reminder_at,
      reminderSent: todo.reminder_sent,
    },
    linkedTaskId: null,
    linkedNotificationId: null,
  }
}

function normalizeTask(task: any): UnifiedActionItem {
  const dueAt = task.due_date
    ? `${task.due_date}${task.due_time ? 'T' + task.due_time : 'T23:59:59'}`
    : null

  let status: ActionStatus = 'pending'
  if (task.status === 'done') {
    status = 'completed'
  } else if (task.status === 'in_progress') {
    status = 'active'
  }

  const priority = (task.priority as ActionPriority) ?? 'medium'

  return {
    id: `task:${task.id}`,
    source: 'task',
    sourceId: task.id,
    title: task.title,
    description: task.description ?? null,
    priority,
    status,
    createdAt: task.created_at,
    dueAt,
    snoozedUntil: null,
    eventId: task.event_id ?? null,
    clientId: null,
    inquiryId: null,
    actionUrl: '/tasks',
    metadata: {
      assignedTo: task.assigned_to,
      stationId: task.station_id,
      autoSource: task.auto_source,
      sourceNotificationId: task.source_notification_id,
      sourceReminderId: task.source_reminder_id,
      timeEstimateMinutes: task.time_estimate_minutes,
    },
    linkedTaskId: null,
    linkedNotificationId: task.source_notification_id ?? null,
  }
}

// ---- Sorting ----

function sortActionItems(items: UnifiedActionItem[]): UnifiedActionItem[] {
  return items.sort((a, b) => {
    // 1. Priority: urgent first
    const pDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
    if (pDiff !== 0) return pDiff

    // 2. Due date: soonest first (nulls last)
    if (a.dueAt && b.dueAt) {
      const diff = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      if (diff !== 0) return diff
    } else if (a.dueAt && !b.dueAt) {
      return -1
    } else if (!a.dueAt && b.dueAt) {
      return 1
    }

    // 3. Created at: newest first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

// ---- Public API ----

export async function getActionFeed(options?: {
  limit?: number
  sources?: ActionSource[]
}): Promise<UnifiedActionItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = options?.limit ?? 100
  const sources = options?.sources ?? ['notification', 'reminder', 'task']

  const items: UnifiedActionItem[] = []
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Fetch in parallel from all requested sources
    const fetches: Promise<void>[] = []

    if (sources.includes('notification')) {
      fetches.push(
        (async () => {
          try {
            const { data, error } = await db
              .from('notifications')
              .select('*')
              .eq('recipient_id', user.id)
              .is('archived_at', null)
              .gte('created_at', sevenDaysAgo)
              .order('created_at', { ascending: false })
              .limit(50)

            if (error) {
              console.error('[ActionCenter] Notifications fetch failed:', error)
              return
            }
            for (const n of data ?? []) {
              items.push(normalizeNotification(n as Notification))
            }
          } catch (err) {
            console.error('[ActionCenter] Notifications fetch error:', err)
          }
        })()
      )
    }

    if (sources.includes('reminder')) {
      fetches.push(
        (async () => {
          try {
            const now = new Date().toISOString()
            let query = db
              .from('chef_todos')
              .select(
                'id, text, completed, completed_at, sort_order, created_at, due_date, due_time, priority, category, reminder_at, reminder_sent, notes, event_id, client_id, snoozed_until'
              )
              .eq('chef_id', user.entityId)
              .eq('completed', false)
              .order('due_date', { ascending: true, nullsFirst: false })
              .limit(50)

            const { data, error } = await query

            if (error) {
              console.error('[ActionCenter] Reminders fetch failed:', error)
              return
            }
            for (const todo of data ?? []) {
              // Skip items snoozed into the future
              if (todo.snoozed_until && new Date(todo.snoozed_until) > new Date(now)) {
                continue
              }
              items.push(normalizeReminder(todo))
            }
          } catch (err) {
            console.error('[ActionCenter] Reminders fetch error:', err)
          }
        })()
      )
    }

    if (sources.includes('task')) {
      fetches.push(
        (async () => {
          try {
            const { data, error } = await db
              .from('tasks')
              .select('*')
              .eq('chef_id', user.tenantId!)
              .in('status', ['pending', 'in_progress'])
              .order('due_date', { ascending: true, nullsFirst: false })
              .limit(50)

            if (error) {
              console.error('[ActionCenter] Tasks fetch failed:', error)
              return
            }
            for (const task of data ?? []) {
              items.push(normalizeTask(task))
            }
          } catch (err) {
            console.error('[ActionCenter] Tasks fetch error:', err)
          }
        })()
      )
    }

    await Promise.all(fetches)
  } catch (err) {
    console.error('[ActionCenter] Feed fetch failed:', err)
  }

  const sorted = sortActionItems(items)
  return sorted.slice(0, limit)
}

export async function getActionStats(): Promise<{
  total: number
  bySource: Record<ActionSource, number>
  urgent: number
}> {
  const feed = await getActionFeed()

  const bySource: Record<ActionSource, number> = {
    notification: 0,
    reminder: 0,
    task: 0,
  }

  let urgent = 0

  for (const item of feed) {
    bySource[item.source]++
    if (item.priority === 'urgent') urgent++
  }

  return {
    total: feed.length,
    bySource,
    urgent,
  }
}
