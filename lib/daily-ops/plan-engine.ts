// Daily Ops - Plan Engine
// Pure computation: categorizes items from all existing systems into 4 swim lanes.
// No database calls. Receives pre-fetched data and returns a DailyPlan.

import type { DailyPlan, PlanItem, PlanLane, PlanLaneData, PlanItemSource } from './types'
import type { QueueItem, PriorityQueue } from '@/lib/queue/types'
import type { DOPTaskDigest, DigestTask } from '@/lib/scheduling/task-digest'
import type { OverdueFollowUpEvent } from '@/lib/dashboard/accountability'
import type { NextBestAction } from '@/lib/clients/next-best-action'
import type { ChefTodo } from '@/lib/todos/actions'

// ============================================
// INPUT TYPE - everything pre-fetched by the server action
// ============================================

export interface PlanEngineInput {
  queue: PriorityQueue
  dopDigest: DOPTaskDigest
  nextBestActions: NextBestAction[]
  overdueFollowUps: OverdueFollowUpEvent[]
  todos: ChefTodo[]
  recipeDebt: {
    total: number
    last7Days: number
    last30Days: number
    older: number
    totalRecipes: number
  }
  upcomingCalls: {
    id: string
    call_type: string
    scheduled_at: string
    client_name?: string
    title?: string
  }[]
  todayEvents: {
    id: string
    occasion: string | null
    clientName: string
    serveTime: string
    guestCount: number
  }[]
  protectedTime: { title: string; startDate: string; endDate: string; blockType: string }[]
  dismissedKeys: Set<string>
}

// ============================================
// LANE CONFIG
// ============================================

const LANE_CONFIG: Record<PlanLane, { label: string; icon: string }> = {
  quick_admin: { label: 'Quick Admin', icon: 'Zap' },
  event_prep: { label: 'Event Prep', icon: 'ChefHat' },
  creative: { label: 'Creative Time', icon: 'Palette' },
  relationship: { label: 'Relationship', icon: 'Users' },
}

// ============================================
// QUEUE ITEM → LANE MAPPING
// ============================================

function queueDomainToLane(domain: string, urgency: string): PlanLane {
  switch (domain) {
    case 'inquiry':
    case 'message':
      return 'quick_admin'
    case 'quote':
      return urgency === 'critical' || urgency === 'high' ? 'quick_admin' : 'event_prep'
    case 'event':
      return 'event_prep'
    case 'financial':
      return 'quick_admin'
    case 'post_event':
      return 'quick_admin'
    case 'client':
      return 'relationship'
    case 'culinary':
      return 'creative'
    default:
      return 'quick_admin'
  }
}

function queueItemTimeEstimate(domain: string): number {
  switch (domain) {
    case 'message':
      return 2
    case 'inquiry':
      return 3
    case 'quote':
      return 5
    case 'financial':
      return 3
    case 'post_event':
      return 5
    case 'event':
      return 10
    case 'client':
      return 5
    case 'culinary':
      return 15
    default:
      return 3
  }
}

// ============================================
// DOP TASK → LANE MAPPING
// ============================================

function dopCategoryToLane(category: string): PlanLane {
  switch (category) {
    case 'shopping':
    case 'prep':
    case 'packing':
      return 'event_prep'
    case 'documents':
      return 'quick_admin'
    case 'admin':
      return 'quick_admin'
    case 'reset':
      return 'quick_admin'
    default:
      return 'event_prep'
  }
}

function dopTaskTimeEstimate(category: string): number {
  switch (category) {
    case 'shopping':
      return 60
    case 'prep':
      return 90
    case 'packing':
      return 20
    case 'documents':
      return 5
    case 'admin':
      return 3
    case 'reset':
      return 15
    default:
      return 10
  }
}

// ============================================
// NBA → LANE MAPPING
// ============================================

function nbaToLane(actionType: string): PlanLane {
  switch (actionType) {
    case 'reply_inquiry':
      return 'quick_admin'
    case 'follow_up_quote':
      return 'quick_admin'
    default:
      return 'relationship'
  }
}

// ============================================
// MAIN BUILD FUNCTION
// ============================================

export function buildDailyPlan(input: PlanEngineInput): DailyPlan {
  const items: PlanItem[] = []
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // ---- 1. Queue items (highest priority, most diverse) ----
  for (const qi of input.queue.items) {
    const key = `queue:${qi.id}`
    if (input.dismissedKeys.has(key)) continue

    items.push({
      id: key,
      lane: queueDomainToLane(qi.domain, qi.urgency),
      title: qi.title,
      description:
        qi.context.primaryLabel +
        (qi.context.secondaryLabel ? ` - ${qi.context.secondaryLabel}` : ''),
      href: qi.href,
      timeEstimateMinutes: queueItemTimeEstimate(qi.domain),
      priority: urgencyToPriority(qi.urgency),
      sourceSystem: 'queue',
      sourceId: qi.id,
      completed: false,
      dismissed: false,
    })
  }

  // ---- 2. DOP tasks (event-specific operational tasks) ----
  for (const task of input.dopDigest.tasks) {
    const key = `dop:${task.eventId}:${task.taskId}`
    if (input.dismissedKeys.has(key)) continue
    // Skip if already represented in queue
    if (items.some((i) => i.sourceSystem === 'queue' && i.sourceId.includes(task.eventId))) continue

    items.push({
      id: key,
      lane: dopCategoryToLane(task.taskCategory),
      title: task.taskLabel,
      description: `${task.clientName} - ${task.eventOccasion ?? 'Event'} (${task.phase})`,
      href: task.scheduleHref,
      timeEstimateMinutes: dopTaskTimeEstimate(task.taskCategory),
      priority: task.isOverdue ? 1 : 2,
      sourceSystem: 'dop',
      sourceId: `${task.eventId}:${task.taskId}`,
      completed: false,
      dismissed: false,
      eventContext: {
        eventId: task.eventId,
        occasion: task.eventOccasion,
        eventDate: task.eventDate,
        clientName: task.clientName,
      },
    })
  }

  // ---- 3. Overdue follow-ups ----
  for (const fu of input.overdueFollowUps) {
    const key = `follow_up:${fu.eventId}`
    if (input.dismissedKeys.has(key)) continue
    // Skip if already in queue
    if (items.some((i) => i.sourceId.includes(fu.eventId))) continue

    items.push({
      id: key,
      lane: 'quick_admin',
      title: `Send follow-up - ${fu.clientName}`,
      description: `${fu.occasion ?? 'Event'} - ${fu.hoursOverdue}h overdue`,
      href: `/clients/${fu.clientId}#messages`,
      timeEstimateMinutes: 3,
      priority: 1,
      sourceSystem: 'follow_up',
      sourceId: fu.eventId,
      completed: false,
      dismissed: false,
    })
  }

  // ---- 4. Next Best Actions (client relationship tasks) ----
  for (const nba of input.nextBestActions) {
    const key = `nba:${nba.clientId}:${nba.actionType}`
    if (input.dismissedKeys.has(key)) continue

    items.push({
      id: key,
      lane: nbaToLane(nba.actionType),
      title: `${nba.label} - ${nba.clientName}`,
      description: nba.description,
      href: nba.href,
      timeEstimateMinutes: nba.urgency === 'critical' ? 3 : 5,
      priority: urgencyToPriority(nba.urgency),
      sourceSystem: 'nba',
      sourceId: `${nba.clientId}:${nba.actionType}`,
      completed: false,
      dismissed: false,
    })
  }

  // ---- 5. Chef todos (manual tasks) ----
  for (const todo of input.todos) {
    if (todo.completed) continue
    const key = `todo:${todo.id}`
    if (input.dismissedKeys.has(key)) continue

    items.push({
      id: key,
      lane: 'quick_admin',
      title: todo.text,
      description: 'Personal to-do',
      href: '/dashboard#todos',
      timeEstimateMinutes: 5,
      priority: 3,
      sourceSystem: 'todo',
      sourceId: todo.id,
      completed: false,
      dismissed: false,
    })
  }

  // ---- 6. Recipe debt ----
  if (input.recipeDebt.total > 0) {
    const key = 'recipe_debt:all'
    if (!input.dismissedKeys.has(key)) {
      items.push({
        id: key,
        lane: 'creative',
        title: `${input.recipeDebt.total} recipes need documentation`,
        description:
          input.recipeDebt.last7Days > 0
            ? `${input.recipeDebt.last7Days} from the last week`
            : `${input.recipeDebt.last30Days} from the last month`,
        href: '/recipes',
        timeEstimateMinutes: input.recipeDebt.total * 10,
        priority: 3,
        sourceSystem: 'recipe_debt',
        sourceId: 'all',
        completed: false,
        dismissed: false,
      })
    }
  }

  // ---- 7. Upcoming calls ----
  for (const call of input.upcomingCalls) {
    const key = `call:${call.id}`
    if (input.dismissedKeys.has(key)) continue

    const callDate = new Date(call.scheduled_at)
    const isToday = callDate.toISOString().split('T')[0] === todayStr

    if (!isToday) continue // Only show today's calls

    items.push({
      id: key,
      lane: 'quick_admin',
      title: `Call: ${call.title || call.client_name || call.call_type}`,
      description: `Scheduled at ${callDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      href: '/calls',
      timeEstimateMinutes: 15,
      priority: 1,
      sourceSystem: 'call',
      sourceId: call.id,
      completed: false,
      dismissed: false,
    })
  }

  // ---- Deduplicate by title similarity ----
  const deduped = deduplicateItems(items)

  // ---- Sort each lane by priority then time estimate ----
  const sorted = deduped.sort((a, b) => {
    if (a.lane !== b.lane) return laneOrder(a.lane) - laneOrder(b.lane)
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.timeEstimateMinutes - b.timeEstimateMinutes
  })

  // ---- Build lane data ----
  const lanes: PlanLaneData[] = (
    ['quick_admin', 'event_prep', 'creative', 'relationship'] as PlanLane[]
  ).map((lane) => {
    const laneItems = sorted.filter((i) => i.lane === lane)
    const config = LANE_CONFIG[lane]
    return {
      lane,
      label: config.label,
      icon: config.icon,
      items: laneItems,
      totalTimeMinutes: laneItems.reduce((sum, i) => sum + i.timeEstimateMinutes, 0),
      completedCount: laneItems.filter((i) => i.completed).length,
    }
  })

  // ---- Generate Remy summary ----
  const remySummary = generateRemySummary(lanes, input.todayEvents, input.protectedTime)

  // ---- Stats ----
  const allItems = lanes.flatMap((l) => l.items)
  const stats = {
    totalItems: allItems.length,
    completedItems: allItems.filter((i) => i.completed).length,
    adminItems: lanes.find((l) => l.lane === 'quick_admin')?.items.length ?? 0,
    prepItems: lanes.find((l) => l.lane === 'event_prep')?.items.length ?? 0,
    creativeItems: lanes.find((l) => l.lane === 'creative')?.items.length ?? 0,
    relationshipItems: lanes.find((l) => l.lane === 'relationship')?.items.length ?? 0,
    estimatedMinutes: lanes.reduce((sum, l) => sum + l.totalTimeMinutes, 0),
  }

  return {
    planDate: todayStr,
    lanes,
    remySummary,
    stats,
    todayEvents: input.todayEvents,
    protectedTime: input.protectedTime,
    computedAt: now.toISOString(),
  }
}

// ============================================
// HELPERS
// ============================================

function urgencyToPriority(urgency: string): number {
  switch (urgency) {
    case 'critical':
      return 1
    case 'high':
      return 2
    case 'normal':
      return 3
    case 'low':
      return 4
    default:
      return 3
  }
}

function laneOrder(lane: PlanLane): number {
  switch (lane) {
    case 'quick_admin':
      return 0
    case 'event_prep':
      return 1
    case 'creative':
      return 2
    case 'relationship':
      return 3
  }
}

function deduplicateItems(items: PlanItem[]): PlanItem[] {
  const seen = new Set<string>()
  const result: PlanItem[] = []

  for (const item of items) {
    // Use the item id as primary dedup key
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }

  return result
}

function generateRemySummary(
  lanes: PlanLaneData[],
  todayEvents: {
    id: string
    occasion: string | null
    clientName: string
    serveTime: string
    guestCount: number
  }[],
  protectedTime: { title: string; startDate: string; endDate: string; blockType: string }[]
): string {
  const adminLane = lanes.find((l) => l.lane === 'quick_admin')
  const prepLane = lanes.find((l) => l.lane === 'event_prep')
  const creativeLane = lanes.find((l) => l.lane === 'creative')
  const relationshipLane = lanes.find((l) => l.lane === 'relationship')

  const totalItems = lanes.reduce((sum, l) => sum + l.items.length, 0)
  const adminMin = adminLane?.totalTimeMinutes ?? 0
  const prepMin = prepLane?.totalTimeMinutes ?? 0

  if (totalItems === 0) {
    return "Nothing on the board today. Your calendar's clear - perfect day to experiment with new recipes or take some well-earned time off."
  }

  const parts: string[] = []

  // Events today
  if (todayEvents.length > 0) {
    if (todayEvents.length === 1) {
      const e = todayEvents[0]
      parts.push(
        `You've got ${e.occasion ?? 'an event'} for ${e.clientName} today (${e.guestCount} guests, serve at ${e.serveTime}).`
      )
    } else {
      parts.push(`Big day - ${todayEvents.length} events on the schedule.`)
    }
  }

  // Admin estimate
  if (adminMin > 0 && adminMin <= 20) {
    parts.push(`Clear the admin in about ${adminMin} minutes - it's mostly quick stuff.`)
  } else if (adminMin > 20) {
    parts.push(`${adminLane!.items.length} admin items today (around ${adminMin} min).`)
  }

  // Prep work
  if (prepLane && prepLane.items.length > 0) {
    parts.push(`${prepLane.items.length} prep tasks to knock out.`)
  }

  // Creative time
  if (creativeLane && creativeLane.items.length > 0 && todayEvents.length === 0) {
    parts.push(`After the admin and prep, you've got room for creative work.`)
  }

  // Protected time
  if (protectedTime.length > 0) {
    const block = protectedTime[0]
    parts.push(`Don't forget - you blocked off time for "${block.title}."`)
  }

  // If admin is light, emphasize it
  if (adminMin > 0 && adminMin <= 15 && totalItems > 0) {
    parts.push('Then go cook.')
  }

  return parts.join(' ')
}
