import { createCommandBrief, type CommandBrief } from './command-brief'
import type { ChefSignal } from './noise-simulator'
import type { NotificationAction } from './types'
import { createSignalsFromNotifications, type SignalNotificationRow } from './signal-event-factory'
import { preServiceReadinessToSignal } from './event-readiness-adapter'
import type { PreServiceReadinessInput, PreServiceReadinessResult } from './pre-service-readiness'

type BriefingAlertLike = {
  type: string
  title: string
  detail?: string | null
  severity?: 'critical' | 'high' | 'medium' | string
  href?: string
}

type BriefingEventLike = {
  id: string
  title: string
  event_date: string
  start_time?: string | null
  guest_count?: number | null
  dietary_notes?: string | null
  staff_count?: number | null
}

type MorningBriefingLike = {
  today: string
  alerts?: BriefingAlertLike[]
  todayEvents?: BriefingEventLike[]
  carriedOverTasks?: Array<{ id: string; title: string }>
}

export type DailyCommandBriefData = {
  notifications?: SignalNotificationRow[]
  morningBriefing?: MorningBriefingLike
  preServiceResults?: Array<{
    input: PreServiceReadinessInput
    result: PreServiceReadinessResult
  }>
}

function alertAction(alert: BriefingAlertLike): NotificationAction {
  switch (alert.type) {
    case 'payment_due':
      return alert.severity === 'critical' ? 'payment_overdue' : 'payment_due_approaching'
    case 'unanswered_inquiry':
    case 'stale_followup':
      return 'follow_up_due'
    case 'low_stock':
    case '86d':
      return 'low_stock'
    case 'overdue_task':
      return 'task_assigned'
    default:
      return 'reminder_fired'
  }
}

function briefingToSignals(briefing: MorningBriefingLike, occurredAt: string): ChefSignal[] {
  const signals: ChefSignal[] = []

  for (const alert of briefing.alerts ?? []) {
    signals.push({
      id: `brief-alert:${alert.type}:${alert.title}`,
      action: alertAction(alert),
      title: alert.title,
      body: alert.detail ?? undefined,
      occurredAt,
      context: {
        duplicateKey: `brief-alert:${alert.type}:${alert.href ?? alert.title}`,
        activeEventLinked: alert.type === 'payment_due',
      },
    })
  }

  for (const task of briefing.carriedOverTasks ?? []) {
    signals.push({
      id: `carried-task:${task.id}`,
      action: 'task_assigned',
      title: `Carried over: ${task.title}`,
      occurredAt,
      context: {
        duplicateKey: `carried-task:${task.id}`,
      },
    })
  }

  for (const event of briefing.todayEvents ?? []) {
    if (event.dietary_notes) {
      signals.push({
        id: `brief-event-dietary:${event.id}`,
        action: 'guest_dietary_alert',
        title: `Dietary review for ${event.title}`,
        body: event.dietary_notes,
        occurredAt,
        eventId: event.id,
        context: {
          duplicateKey: `event:${event.id}:dietary`,
          activeEventLinked: true,
          hoursUntilEvent:
            event.event_date && event.start_time
              ? Math.max(
                  0,
                  (new Date(`${event.event_date}T${event.start_time}`).getTime() -
                    new Date(occurredAt).getTime()) /
                    3600000
                )
              : null,
        },
      })
    }

    if (event.staff_count !== undefined && event.staff_count !== null && event.staff_count <= 0) {
      signals.push({
        id: `brief-event-staff:${event.id}`,
        action: 'staff_assignment',
        title: `Staffing review for ${event.title}`,
        occurredAt,
        eventId: event.id,
        context: {
          duplicateKey: `event:${event.id}:staffing`,
          activeEventLinked: true,
        },
      })
    }
  }

  return signals
}

export function createDailyCommandBriefFromData(
  data: DailyCommandBriefData,
  generatedAt = new Date().toISOString()
): CommandBrief {
  const notificationSignals = createSignalsFromNotifications(data.notifications ?? [])
  const briefingSignals = data.morningBriefing
    ? briefingToSignals(data.morningBriefing, generatedAt)
    : []
  const preServiceSignals = (data.preServiceResults ?? [])
    .map(({ input, result }) => preServiceReadinessToSignal(input, result, generatedAt))
    .filter((signal): signal is ChefSignal => signal !== null)

  return createCommandBrief(
    [...notificationSignals, ...briefingSignals, ...preServiceSignals],
    'daily',
    generatedAt
  )
}
