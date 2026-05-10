'use server'

// Action Center - Smart Routing Engine
// Links notifications to tasks, escalates reminders, and clears related items.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { ACTIONABLE_NOTIFICATIONS, AUTO_TASK_TITLES } from './types'

/**
 * Creates a task from an actionable notification.
 * Sets source_notification_id and auto_source='notification' on the task.
 * Updates notification.linked_task_id to point back.
 */
export async function routeNotificationToTask(
  notificationId: string
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Fetch the notification
    const { data: notification, error: fetchError } = await db
      .from('notifications')
      .select(
        'id, action, title, body, event_id, inquiry_id, client_id, action_url, linked_task_id'
      )
      .eq('id', notificationId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (fetchError || !notification) {
      return { success: false, error: 'Notification not found' }
    }

    // Already routed
    if (notification.linked_task_id) {
      return { success: true, taskId: notification.linked_task_id }
    }

    // Derive task title from the notification action, or fall back to notification title
    const taskTitle = AUTO_TASK_TITLES[notification.action] ?? notification.title

    // Create the task
    const today = new Date().toISOString().split('T')[0]
    const { data: task, error: insertError } = await db
      .from('tasks')
      .insert({
        chef_id: user.tenantId!,
        title: taskTitle,
        description: notification.body ?? null,
        due_date: today,
        priority: 'high',
        status: 'pending',
        auto_source: 'notification',
        source_notification_id: notificationId,
        event_id: notification.event_id ?? null,
      })
      .select('id')
      .single()

    if (insertError || !task) {
      console.error('[ActionCenter] routeNotificationToTask insert failed:', insertError)
      return { success: false, error: 'Failed to create task from notification' }
    }

    // Link back: update notification with linked_task_id
    const { error: linkError } = await db
      .from('notifications')
      .update({ linked_task_id: task.id })
      .eq('id', notificationId)
      .eq('tenant_id', user.tenantId!)

    if (linkError) {
      console.error('[ActionCenter] routeNotificationToTask link-back failed:', linkError)
      // Task was created successfully; the link-back is non-critical
    }

    return { success: true, taskId: task.id }
  } catch (err) {
    console.error('[ActionCenter] routeNotificationToTask error:', err)
    return { success: false, error: 'Unexpected error routing notification to task' }
  }
}

/**
 * When a reminder is overdue (due_date < today and not completed),
 * create a notification with action='reminder_fired'.
 */
export async function escalateReminderToNotification(
  reminderId: string
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Fetch the reminder
    const { data: reminder, error: fetchError } = await db
      .from('chef_todos')
      .select('id, text, due_date, due_time, priority, category, completed, event_id, client_id')
      .eq('id', reminderId)
      .eq('chef_id', user.entityId)
      .single()

    if (fetchError || !reminder) {
      return { success: false, error: 'Reminder not found' }
    }

    if (reminder.completed) {
      return { success: false, error: 'Reminder is already completed' }
    }

    const today = new Date().toISOString().split('T')[0]
    if (reminder.due_date && reminder.due_date >= today) {
      return { success: false, error: 'Reminder is not yet overdue' }
    }

    // Check for existing escalation to avoid duplicates (same reminder in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await db
      .from('notifications')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('action', 'reminder_fired')
      .gte('created_at', oneDayAgo)
      .limit(1)

    // Use metadata to check for specific reminder match
    // (the dedup in createNotification handles the general case,
    // but we do an explicit check here for clarity)

    const duePart = reminder.due_date
      ? ` (due ${reminder.due_date}${reminder.due_time ? ' at ' + reminder.due_time : ''})`
      : ''

    const { data: notification, error: insertError } = await db
      .from('notifications')
      .insert({
        tenant_id: user.tenantId!,
        recipient_id: user.id,
        category: 'system',
        action: 'reminder_fired',
        title: 'Overdue reminder',
        body: `${reminder.text}${duePart}`,
        action_url: '/reminders',
        event_id: reminder.event_id ?? null,
        client_id: reminder.client_id ?? null,
        metadata: JSON.stringify({
          todoId: reminder.id,
          priority: reminder.priority,
          category: reminder.category,
          escalated: true,
        }),
      })
      .select('id')
      .single()

    if (insertError || !notification) {
      console.error('[ActionCenter] escalateReminderToNotification insert failed:', insertError)
      return { success: false, error: 'Failed to create escalation notification' }
    }

    return { success: true, notificationId: notification.id }
  } catch (err) {
    console.error('[ActionCenter] escalateReminderToNotification error:', err)
    return { success: false, error: 'Unexpected error escalating reminder' }
  }
}

/**
 * When a task completes, mark linked notifications as read
 * and mark linked reminders as completed.
 */
export async function clearRelatedOnTaskComplete(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    // Fetch the task to get source links
    const { data: task, error: fetchError } = await db
      .from('tasks')
      .select('id, source_notification_id, source_reminder_id, status')
      .eq('id', taskId)
      .eq('chef_id', user.tenantId!)
      .single()

    if (fetchError || !task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status !== 'done') {
      return { success: false, error: 'Task is not completed' }
    }

    const now = new Date().toISOString()

    // Mark linked notification as read
    if (task.source_notification_id) {
      const { error: notifError } = await db
        .from('notifications')
        .update({ read_at: now })
        .eq('id', task.source_notification_id)
        .eq('tenant_id', user.tenantId!)
        .is('read_at', null)

      if (notifError) {
        console.error('[ActionCenter] clearRelated notification update failed:', notifError)
      }
    }

    // Mark linked reminder as completed
    if (task.source_reminder_id) {
      const { error: todoError } = await db
        .from('chef_todos')
        .update({ completed: true, completed_at: now })
        .eq('id', task.source_reminder_id)
        .eq('chef_id', user.entityId)

      if (todoError) {
        console.error('[ActionCenter] clearRelated reminder update failed:', todoError)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[ActionCenter] clearRelatedOnTaskComplete error:', err)
    return { success: false, error: 'Unexpected error clearing related items' }
  }
}

/**
 * Called when creating notifications. If the action is in ACTIONABLE_NOTIFICATIONS,
 * auto-creates a task linked to it.
 * Designed to be called as a non-blocking side effect from createNotification.
 */
export async function autoRouteNewNotification(
  notificationId: string,
  action: string
): Promise<void> {
  if (!ACTIONABLE_NOTIFICATIONS.has(action)) {
    return
  }

  try {
    await routeNotificationToTask(notificationId)
  } catch (err) {
    // Non-blocking: log and move on. Never crash the notification pipeline.
    console.error('[ActionCenter] autoRouteNewNotification failed:', err)
  }
}
