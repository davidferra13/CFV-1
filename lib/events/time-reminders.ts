// Gentle time-tracking reminder sweep.
// Designed to improve completeness without spamming chefs.

import { createServerClient } from '@/lib/db/server'
import { createNotification } from '@/lib/notifications/actions'
import type { Json } from '@/types/database'
import {
  EVENT_TIME_ACTIVITY_TYPES,
  EVENT_TIME_ACTIVITY_CONFIG,
  type EventTimeActivityType,
  formatMinutesAsDuration,
  safeDurationMinutes,
} from './time-tracking'

const RUNNING_REMINDER_INTERVAL_MINUTES = 120
const RUNNING_REMINDER_MAX_PER_DAY = 3
const COMPLETION_REMINDER_WINDOW_HOURS = 24

type ReminderRunResult = {
  runningReminders: number
  completionReminders: number
  errors: string[]
}

type RunningReminderHistory = {
  count: number
  lastSentAtMs: number
}

function asRecord(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function isEventTimeActivityType(value: unknown): value is EventTimeActivityType {
  return (
    typeof value === 'string' && EVENT_TIME_ACTIVITY_TYPES.includes(value as EventTimeActivityType)
  )
}

function makeRunningKey(
  recipientId: string,
  eventId: string,
  activity: EventTimeActivityType
): string {
  return `${recipientId}:${eventId}:${activity}`
}

function makeCompletionKey(recipientId: string, eventId: string): string {
  return `${recipientId}:${eventId}`
}

export async function runTimeTrackingReminderSweep(): Promise<ReminderRunResult> {
  const db = createServerClient({ admin: true })
  const now = new Date()
  const nowIso = now.toISOString()
  const lookbackDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const dayStart = new Date(now)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayStartIso = dayStart.toISOString()

  const result: ReminderRunResult = {
    runningReminders: 0,
    completionReminders: 0,
    errors: [],
  }

  const { data: events, error: eventsError } = await db
    .from('events')
    .select(
      `
      id, tenant_id, client_id, occasion, status, event_date, updated_at,
      time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes,
      shopping_started_at, shopping_completed_at,
      prep_started_at, prep_completed_at,
      reset_started_at, reset_completed_at,
      travel_started_at, travel_completed_at,
      service_started_at, service_completed_at
    `
    )
    .in('status', ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'])
    .gte('event_date', lookbackDate)

  if (eventsError) {
    return {
      ...result,
      errors: [`time_tracking_events_query: ${eventsError.message}`],
    }
  }

  if (!events || events.length === 0) {
    return result
  }

  const tenantIds = Array.from(new Set(events.map((event: any) => event.tenant_id)))
  const { data: chefRoles, error: rolesError } = await db
    .from('user_roles')
    .select('entity_id, auth_user_id')
    .eq('role', 'chef')
    .in('entity_id', tenantIds)

  if (rolesError) {
    return {
      ...result,
      errors: [`time_tracking_roles_query: ${rolesError.message}`],
    }
  }

  const chefByTenant = new Map<string, string>()
  for (const row of chefRoles || []) {
    if (!chefByTenant.has(row.entity_id)) {
      chefByTenant.set(row.entity_id, row.auth_user_id)
    }
  }

  // ── Respect time_tracking_reminders_enabled per tenant ──────────────────
  // Query tenants that have explicitly disabled this automation.
  // Missing row = enabled (opt-out model; matches all other built-in automations).
  const disabledTenants = new Set<string>()
  if (tenantIds.length > 0) {
    const { data: disabledSettings } = (await db
      .from('chef_automation_settings')
      .select('tenant_id')
      .in('tenant_id', tenantIds)
      .eq('time_tracking_reminders_enabled', false)) as {
      data: Array<{ tenant_id: string }> | null
    }
    for (const row of disabledSettings || []) {
      disabledTenants.add(row.tenant_id)
    }
  }

  const recipientIds = Array.from(new Set(Array.from(chefByTenant.values())))
  const runningHistory = new Map<string, RunningReminderHistory>()
  const completionSent = new Set<string>()

  if (recipientIds.length > 0) {
    const { data: notifications, error: notificationsError } = await db
      .from('notifications')
      .select('recipient_id, event_id, created_at, metadata')
      .eq('category', 'event')
      .eq('action', 'system_alert')
      .gte('created_at', dayStartIso)
      .in('recipient_id', recipientIds)

    if (notificationsError) {
      result.errors.push(`time_tracking_notification_history_query: ${notificationsError.message}`)
    } else {
      for (const notification of notifications || []) {
        if (!notification.recipient_id || !notification.event_id) continue
        const metadata = asRecord(notification.metadata as Json | null)
        const kind = metadata.kind
        const sentAtMs = new Date(notification.created_at).getTime()

        if (kind === 'time_tracking_running' && isEventTimeActivityType(metadata.activity)) {
          const key = makeRunningKey(
            notification.recipient_id,
            notification.event_id,
            metadata.activity
          )
          const previous = runningHistory.get(key) || { count: 0, lastSentAtMs: 0 }
          runningHistory.set(key, {
            count: previous.count + 1,
            lastSentAtMs: Math.max(previous.lastSentAtMs, Number.isFinite(sentAtMs) ? sentAtMs : 0),
          })
          continue
        }

        if (kind === 'time_tracking_completion') {
          completionSent.add(makeCompletionKey(notification.recipient_id, notification.event_id))
        }
      }
    }
  }

  for (const event of events) {
    const recipientId = chefByTenant.get(event.tenant_id)
    if (!recipientId) continue
    if (disabledTenants.has(event.tenant_id)) continue

    for (const activity of EVENT_TIME_ACTIVITY_TYPES) {
      const config = EVENT_TIME_ACTIVITY_CONFIG[activity]
      const startedAt = event[config.startedAtColumn]
      const completedAt = event[config.completedAtColumn]

      if (!startedAt || completedAt) continue

      const runtimeMinutes = safeDurationMinutes(startedAt, nowIso)
      if (runtimeMinutes < RUNNING_REMINDER_INTERVAL_MINUTES) continue

      const historyKey = makeRunningKey(recipientId, event.id, activity)
      const history = runningHistory.get(historyKey)
      const sinceLastMinutes = history?.lastSentAtMs
        ? Math.floor((now.getTime() - history.lastSentAtMs) / 60000)
        : null

      const intervalSatisfied =
        sinceLastMinutes === null || sinceLastMinutes >= RUNNING_REMINDER_INTERVAL_MINUTES
      const capSatisfied = (history?.count ?? 0) < RUNNING_REMINDER_MAX_PER_DAY

      if (!intervalSatisfied || !capSatisfied) continue

      const title = `Still tracking ${config.label}?`
      const eventName = event.occasion || 'this event'
      const body =
        `${config.label} has been running for ${formatMinutesAsDuration(runtimeMinutes)} on "${eventName}". ` +
        'Stop when finished so your hours stay accurate.'

      try {
        await createNotification({
          tenantId: event.tenant_id,
          recipientId,
          category: 'event',
          action: 'system_alert',
          title,
          body,
          actionUrl: `/events/${event.id}`,
          eventId: event.id,
          clientId: event.client_id,
          metadata: {
            kind: 'time_tracking_running',
            activity,
            runtime_minutes: runtimeMinutes,
            reminder_interval_minutes: RUNNING_REMINDER_INTERVAL_MINUTES,
            daily_cap: RUNNING_REMINDER_MAX_PER_DAY,
          },
        })
      } catch (insertErr) {
        const msg = insertErr instanceof Error ? insertErr.message : String(insertErr)
        result.errors.push(`time_tracking_running_reminder_${event.id}: ${msg}`)
        continue
      }

      result.runningReminders += 1
      runningHistory.set(historyKey, {
        count: (history?.count ?? 0) + 1,
        lastSentAtMs: now.getTime(),
      })
    }

    if (event.status !== 'completed') continue

    const updatedAtMs = new Date(event.updated_at).getTime()
    const withinCompletionWindow =
      Number.isFinite(updatedAtMs) &&
      now.getTime() - updatedAtMs <= COMPLETION_REMINDER_WINDOW_HOURS * 60 * 60 * 1000

    if (!withinCompletionWindow) continue

    const totalMinutes =
      (event.time_shopping_minutes ?? 0) +
      (event.time_prep_minutes ?? 0) +
      (event.time_travel_minutes ?? 0) +
      (event.time_service_minutes ?? 0) +
      (event.time_reset_minutes ?? 0)

    if (totalMinutes > 0) continue

    const completionKey = makeCompletionKey(recipientId, event.id)
    if (completionSent.has(completionKey)) continue

    const eventName = event.occasion || 'this event'
    try {
      await createNotification({
        tenantId: event.tenant_id,
        recipientId,
        category: 'event',
        action: 'system_alert',
        title: 'Log final event hours?',
        body: `Event "${eventName}" is completed with no tracked hours yet. Add Shopping, Prep, Packing, Driving, and Execution when you have a moment.`,
        actionUrl: `/events/${event.id}`,
        eventId: event.id,
        clientId: event.client_id,
        metadata: {
          kind: 'time_tracking_completion',
        },
      })
    } catch (completionErr) {
      const msg = completionErr instanceof Error ? completionErr.message : String(completionErr)
      result.errors.push(`time_tracking_completion_reminder_${event.id}: ${msg}`)
      continue
    }

    completionSent.add(completionKey)
    result.completionReminders += 1
  }

  return result
}
