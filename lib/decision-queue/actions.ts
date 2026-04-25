'use server'

import { getNextBestActions, type NextBestAction } from '@/lib/clients/next-best-action'
import {
  getProactiveAlerts,
  type ProactiveAlert,
  type ProactiveAlertsResult,
} from '@/lib/intelligence/proactive-alerts'
import { getDashboardWorkSurface } from '@/lib/workflow/actions'
import type { DashboardWorkSurface, WorkItem, WorkStage } from '@/lib/workflow/types'

export interface DecisionQueueItem {
  id: string
  rank: number
  title: string
  description: string
  href: string | null
  urgency: 'critical' | 'high' | 'normal' | 'low'
  source: 'work_surface' | 'next_best_action' | 'proactive_alert'
  context: string
  category: string
}

export interface DecisionQueueResult {
  items: DecisionQueueItem[]
  totalCount: number
  criticalCount: number
}

type DecisionUrgency = DecisionQueueItem['urgency']
type DecisionSource = DecisionQueueItem['source']

const EMPTY_RESULT: DecisionQueueResult = {
  items: [],
  totalCount: 0,
  criticalCount: 0,
}

const URGENCY_ORDER: Record<DecisionUrgency, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const SOURCE_ORDER: Record<DecisionSource, number> = {
  proactive_alert: 0,
  work_surface: 1,
  next_best_action: 2,
}

const STAGE_CATEGORY: Record<WorkStage, string> = {
  inquiry_intake: 'inquiry',
  qualification: 'qualification',
  menu_development: 'menu',
  quote: 'proposal',
  financial_commitment: 'payment',
  grocery_list: 'procurement',
  prep_list: 'prep',
  equipment_planning: 'equipment',
  packing: 'packing',
  timeline: 'timeline',
  travel_arrival: 'travel',
  execution: 'execution',
  breakdown: 'breakdown',
  post_event_capture: 'post_event',
  follow_up: 'follow_up',
  financial_closure: 'payment',
  inquiry_closure: 'inquiry',
}

const ACTION_CATEGORY: Partial<Record<NextBestAction['actionType'], string>> = {
  booking_blocker: 'booking',
  reply_inquiry: 'inquiry',
  follow_up_quote: 'proposal',
  quote_revision: 'proposal',
  re_engage: 'retention',
  schedule_event: 'booking',
  send_birthday: 'milestone',
  ask_referral: 'referral',
  reach_out: 'outreach',
}

function mapWorkUrgency(urgency: WorkItem['urgency']): DecisionUrgency {
  switch (urgency) {
    case 'fragile':
      return 'critical'
    case 'normal':
      return 'high'
    case 'low':
      return 'normal'
  }
}

function mapAlertUrgency(severity: ProactiveAlert['severity']): DecisionUrgency {
  switch (severity) {
    case 'critical':
      return 'critical'
    case 'warning':
      return 'high'
    case 'opportunity':
      return 'normal'
    case 'info':
      return 'low'
  }
}

function actionCategory(actionType: NextBestAction['actionType']): string {
  return ACTION_CATEGORY[actionType] ?? actionType.split('_')[0] ?? 'action'
}

function extractEventId(href: string | null): string | null {
  if (!href) return null
  const match = href.match(/\/events\/([^/?#]+)/)
  return match?.[1] ?? null
}

function isHigherPriority(left: DecisionQueueItem, right: DecisionQueueItem): boolean {
  const urgencyDiff = URGENCY_ORDER[left.urgency] - URGENCY_ORDER[right.urgency]
  if (urgencyDiff !== 0) return urgencyDiff < 0
  return SOURCE_ORDER[left.source] < SOURCE_ORDER[right.source]
}

function addDeduped(
  items: Map<string, DecisionQueueItem>,
  eventItems: Map<string, DecisionQueueItem>,
  item: DecisionQueueItem
) {
  const existingById = items.get(item.id)
  if (existingById && !isHigherPriority(item, existingById)) return

  const eventId = extractEventId(item.href)
  if (eventId && (item.source === 'work_surface' || item.source === 'next_best_action')) {
    const existingByEvent = eventItems.get(eventId)
    if (existingByEvent && existingByEvent.id !== item.id) {
      const keeper = isHigherPriority(item, existingByEvent) ? item : existingByEvent
      const discarded = keeper === item ? existingByEvent : item
      items.delete(discarded.id)
      eventItems.set(eventId, keeper)
      items.set(keeper.id, keeper)
      return
    }

    eventItems.set(eventId, item)
  }

  items.set(item.id, item)
}

function mapWorkSurface(surface: DashboardWorkSurface): DecisionQueueItem[] {
  const workItems = [...surface.blocked, ...surface.preparable]

  return workItems.map((item) => ({
    id: item.id,
    rank: 0,
    title: item.title,
    description: item.description,
    href: `/events/${item.eventId}`,
    urgency: mapWorkUrgency(item.urgency),
    source: 'work_surface',
    context: `Event: ${item.eventOccasion || item.clientName}`,
    category: STAGE_CATEGORY[item.stage],
  }))
}

function mapNextBestActions(actions: NextBestAction[]): DecisionQueueItem[] {
  return actions.map((action) => ({
    id: `nba:${action.clientId}:${action.actionType}`,
    rank: 0,
    title: action.label,
    description: action.description,
    href: action.href,
    urgency: action.urgency,
    source: 'next_best_action',
    context: `Client: ${action.clientName}`,
    category: actionCategory(action.actionType),
  }))
}

function mapProactiveAlerts(result: ProactiveAlertsResult): DecisionQueueItem[] {
  return result.alerts.map((alert) => ({
    id: alert.id,
    rank: 0,
    title: alert.action || alert.title,
    description: alert.detail,
    href: alert.link,
    urgency: mapAlertUrgency(alert.severity),
    source: 'proactive_alert',
    context: alert.title,
    category: alert.category,
  }))
}

export async function getDecisionQueue(): Promise<DecisionQueueResult> {
  const [workSurfaceResult, nextBestActionsResult, proactiveAlertsResult] =
    await Promise.allSettled([
      getDashboardWorkSurface(),
      getNextBestActions(15),
      getProactiveAlerts(),
    ])

  const mapped: DecisionQueueItem[] = []

  if (workSurfaceResult.status === 'fulfilled') {
    mapped.push(...mapWorkSurface(workSurfaceResult.value))
  } else {
    console.error('[getDecisionQueue] Work surface failed:', workSurfaceResult.reason)
  }

  if (nextBestActionsResult.status === 'fulfilled') {
    mapped.push(...mapNextBestActions(nextBestActionsResult.value))
  } else {
    console.error('[getDecisionQueue] Next best actions failed:', nextBestActionsResult.reason)
  }

  if (proactiveAlertsResult.status === 'fulfilled') {
    mapped.push(...mapProactiveAlerts(proactiveAlertsResult.value))
  } else {
    console.error('[getDecisionQueue] Proactive alerts failed:', proactiveAlertsResult.reason)
  }

  if (mapped.length === 0) return EMPTY_RESULT

  const itemsById = new Map<string, DecisionQueueItem>()
  const itemsByEventId = new Map<string, DecisionQueueItem>()

  for (const item of mapped) {
    addDeduped(itemsById, itemsByEventId, item)
  }

  const sorted = Array.from(itemsById.values()).sort((left, right) => {
    const urgencyDiff = URGENCY_ORDER[left.urgency] - URGENCY_ORDER[right.urgency]
    if (urgencyDiff !== 0) return urgencyDiff
    return SOURCE_ORDER[left.source] - SOURCE_ORDER[right.source]
  })

  const totalCount = sorted.length
  const items = sorted.slice(0, 15).map((item, index) => ({
    ...item,
    rank: index + 1,
  }))

  return {
    items,
    totalCount,
    criticalCount: sorted.filter((item) => item.urgency === 'critical').length,
  }
}
