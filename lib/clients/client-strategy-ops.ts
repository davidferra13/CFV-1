import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { ClientStrategyPriority } from './client-strategy-brief'
import {
  STRATEGY_NOTE_PREFIX,
  STRATEGY_OUTCOME_PREFIX,
  STRATEGY_REPLY_PREFIX,
} from './client-strategy-note'

export type ClientStrategyActionStatus =
  | 'new'
  | 'needs_client'
  | 'scheduled'
  | 'reply_review'
  | 'done'
  | 'dismissed'
  | 'wrong_recommendation'

export type ClientStrategyOutcomeCode =
  | 'booked'
  | 'no_response'
  | 'profile_updated'
  | 'wrong_recommendation'
  | 'dismissed'

export type ClientStrategyActionStatusRecord = {
  recommendationId: string
  status: ClientStrategyActionStatus
  taskIds: string[]
  scheduledMessageIds: string[]
  replyReviewTaskIds: string[]
  outcomes: Array<{
    id: string
    outcome: ClientStrategyOutcomeCode
  }>
  detail: string
}

export type ClientStrategyOperationalState = {
  clientId: string
  statuses: ClientStrategyActionStatusRecord[]
  timeline: ClientStrategyTimelineItem[]
  diff: ClientStrategyBriefDiff
}

export type ClientStrategyTimelineItem = {
  id: string
  recommendationId: string
  kind: 'reminder' | 'message' | 'reply_review' | 'outcome'
  label: string
  detail: string
  occurredAt: string | null
}

export type ClientStrategyBriefDiff = {
  newRecommendationIds: string[]
  activeRecommendationIds: string[]
  completedRecommendationIds: string[]
  dismissedRecommendationIds: string[]
  wrongRecommendationIds: string[]
  replyReviewRecommendationIds: string[]
}

export type ClientStrategyReadinessRow = {
  clientId: string
  clientName: string
  score: number
  priority: ClientStrategyPriority
  missingFields: string[]
  staleFields: string[]
  knownPreferenceCount: number
  lastUpdatedAt: string | null
}

export type ClientStrategyReadinessReport = {
  rows: ClientStrategyReadinessRow[]
  summary: {
    totalClients: number
    highRiskClients: number
    missingSafetyClients: number
    averageScore: number
  }
}

export type ClientStrategyTodoRow = {
  id: string
  completed: boolean
  notes: string | null
  text: string | null
  created_at: string | null
  completed_at: string | null
}

export type ClientStrategyScheduledMessageRow = {
  id: string
  status: string
  body: string | null
  scheduled_for: string | null
  sent_at: string | null
  created_at: string | null
}

export type ClientStrategyOperationalProjectionInput = {
  clientId: string
  todos: ClientStrategyTodoRow[]
  scheduledMessages: ClientStrategyScheduledMessageRow[]
}

type ClientReadinessRecord = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  preferred_contact_method: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  favorite_cuisines: string[] | null
  updated_at: string | null
}

const STALE_PROFILE_DAYS = 180

export async function getClientStrategyOperationalState(
  clientId: string
): Promise<ClientStrategyOperationalState> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [todoResult, messageResult] = await Promise.all([
    db
      .from('chef_todos')
      .select('id, text, completed, completed_at, created_at, notes')
      .eq('chef_id', user.entityId)
      .eq('client_id', clientId),
    db
      .from('scheduled_messages')
      .select('id, status, body, scheduled_for, sent_at, created_at')
      .eq('chef_id', user.entityId)
      .eq('context_type', 'client')
      .eq('context_id', clientId),
  ])

  if (todoResult.error) {
    console.error('[client-strategy-ops] todo status load failed:', todoResult.error)
  }

  if (messageResult.error) {
    console.error('[client-strategy-ops] message status load failed:', messageResult.error)
  }

  const todos = (todoResult.data ?? []) as ClientStrategyTodoRow[]
  const scheduledMessages = (messageResult.data ?? []) as ClientStrategyScheduledMessageRow[]
  return projectClientStrategyOperationalState({
    clientId,
    todos,
    scheduledMessages,
  })
}

export function projectClientStrategyOperationalState(
  input: ClientStrategyOperationalProjectionInput
): ClientStrategyOperationalState {
  const statuses = buildOperationalStatuses(input.todos, input.scheduledMessages)

  return {
    clientId: input.clientId,
    statuses,
    timeline: buildTimeline(input.todos, input.scheduledMessages),
    diff: buildBriefDiff(statuses),
  }
}

export async function getClientStrategyReadinessReport(): Promise<ClientStrategyReadinessReport> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .select(
      'id, full_name, email, phone, preferred_contact_method, dietary_restrictions, allergies, favorite_cuisines, updated_at'
    )
    .eq('tenant_id', user.tenantId!)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[client-strategy-ops] readiness report load failed:', error)
    throw new Error('Could not load client strategy readiness')
  }

  const rows = ((data ?? []) as ClientReadinessRecord[])
    .map(buildReadinessRow)
    .sort((left, right) => {
      const priorityDelta = priorityRank(right.priority) - priorityRank(left.priority)
      if (priorityDelta !== 0) return priorityDelta
      return left.score - right.score
    })
  const averageScore =
    rows.length > 0
      ? Math.round(rows.reduce((total, row) => total + row.score, 0) / rows.length)
      : 0

  return {
    rows,
    summary: {
      totalClients: rows.length,
      highRiskClients: rows.filter((row) => row.priority === 'critical' || row.priority === 'high')
        .length,
      missingSafetyClients: rows.filter(
        (row) =>
          row.missingFields.includes('allergies') ||
          row.missingFields.includes('dietary restrictions')
      ).length,
      averageScore,
    },
  }
}

function buildOperationalStatuses(
  todos: ClientStrategyTodoRow[],
  scheduledMessages: ClientStrategyScheduledMessageRow[]
): ClientStrategyActionStatusRecord[] {
  const byRecommendation = new Map<string, ClientStrategyActionStatusRecord>()

  for (const todo of todos) {
    const recommendationId = extractRecommendationId(todo.notes, STRATEGY_NOTE_PREFIX)
    if (!recommendationId) continue
    const record = getOrCreateStatusRecord(byRecommendation, recommendationId)
    record.taskIds.push(todo.id)
    if (todo.completed) {
      record.status = 'done'
      record.detail = 'Completed reminder exists for this recommendation.'
    } else if (record.status !== 'done') {
      record.status = 'scheduled'
      record.detail = 'Open reminder exists for this recommendation.'
    }
  }

  for (const todo of todos) {
    const recommendationId = extractRecommendationId(todo.notes, STRATEGY_REPLY_PREFIX)
    if (!recommendationId) continue
    const record = getOrCreateStatusRecord(byRecommendation, recommendationId)
    record.replyReviewTaskIds.push(todo.id)
    if (record.status !== 'done' && record.status !== 'dismissed') {
      record.status = 'reply_review'
      record.detail = todo.completed
        ? 'Client reply review has been completed.'
        : 'Client reply needs chef review before profile updates.'
    }
  }

  for (const todo of todos) {
    const recommendationId = extractRecommendationId(todo.notes, STRATEGY_OUTCOME_PREFIX)
    if (!recommendationId) continue
    const outcome = extractOutcome(todo.notes)
    const record = getOrCreateStatusRecord(byRecommendation, recommendationId)
    record.outcomes.push({ id: todo.id, outcome })

    if (outcome === 'wrong_recommendation') {
      record.status = 'wrong_recommendation'
      record.detail = 'Chef marked this recommendation as wrong.'
    } else if (outcome === 'dismissed') {
      record.status = 'dismissed'
      record.detail = 'Chef dismissed this recommendation.'
    } else {
      record.status = 'done'
      record.detail = `Outcome recorded: ${outcome.replace(/_/g, ' ')}.`
    }
  }

  for (const message of scheduledMessages) {
    const recommendationId = extractRecommendationId(message.body, STRATEGY_NOTE_PREFIX)
    if (!recommendationId) continue
    const record = getOrCreateStatusRecord(byRecommendation, recommendationId)
    record.scheduledMessageIds.push(message.id)
    if (
      record.status !== 'done' &&
      record.status !== 'dismissed' &&
      record.status !== 'wrong_recommendation' &&
      record.status !== 'reply_review'
    ) {
      record.status = message.status === 'sent' ? 'done' : 'scheduled'
      record.detail =
        message.status === 'sent'
          ? 'Scheduled message was sent for this recommendation.'
          : 'Chef-approved message is scheduled for this recommendation.'
    }
  }

  return [...byRecommendation.values()]
}

function getOrCreateStatusRecord(
  records: Map<string, ClientStrategyActionStatusRecord>,
  recommendationId: string
): ClientStrategyActionStatusRecord {
  const existing = records.get(recommendationId)
  if (existing) return existing

  const created: ClientStrategyActionStatusRecord = {
    recommendationId,
    status: 'new',
    taskIds: [],
    scheduledMessageIds: [],
    replyReviewTaskIds: [],
    outcomes: [],
    detail: 'No linked reminder or scheduled message exists yet.',
  }
  records.set(recommendationId, created)
  return created
}

function extractRecommendationId(value: string | null, prefix: string): string | null {
  if (!value) return null
  const index = value.indexOf(prefix)
  if (index < 0) return null
  const rest = value.slice(index + prefix.length)
  const [id] = rest.split(/\s|\n/)
  return id?.trim() || null
}

function extractOutcome(value: string | null): ClientStrategyOutcomeCode {
  const match = value?.match(/^Outcome:\s*([a-z_]+)/m)
  const outcome = match?.[1] as ClientStrategyOutcomeCode | undefined
  if (
    outcome === 'booked' ||
    outcome === 'no_response' ||
    outcome === 'profile_updated' ||
    outcome === 'wrong_recommendation' ||
    outcome === 'dismissed'
  ) {
    return outcome
  }
  return 'profile_updated'
}

function buildTimeline(
  todos: ClientStrategyTodoRow[],
  scheduledMessages: ClientStrategyScheduledMessageRow[]
): ClientStrategyTimelineItem[] {
  const todoItems = todos.flatMap((todo): ClientStrategyTimelineItem[] => {
    const outcomeId = extractRecommendationId(todo.notes, STRATEGY_OUTCOME_PREFIX)
    if (outcomeId) {
      return [
        {
          id: `outcome:${todo.id}`,
          recommendationId: outcomeId,
          kind: 'outcome',
          label: todo.text ?? 'Recommendation outcome recorded',
          detail: extractOutcome(todo.notes).replace(/_/g, ' '),
          occurredAt: todo.completed_at ?? todo.created_at,
        },
      ]
    }

    const replyId = extractRecommendationId(todo.notes, STRATEGY_REPLY_PREFIX)
    if (replyId) {
      return [
        {
          id: `reply:${todo.id}`,
          recommendationId: replyId,
          kind: 'reply_review',
          label: todo.text ?? 'Client reply review',
          detail: todo.completed ? 'Reply review complete' : 'Reply needs review',
          occurredAt: todo.completed_at ?? todo.created_at,
        },
      ]
    }

    const recommendationId = extractRecommendationId(todo.notes, STRATEGY_NOTE_PREFIX)
    if (!recommendationId) return []

    return [
      {
        id: `reminder:${todo.id}`,
        recommendationId,
        kind: 'reminder',
        label: todo.text ?? 'Strategy reminder',
        detail: todo.completed ? 'Reminder completed' : 'Reminder open',
        occurredAt: todo.completed_at ?? todo.created_at,
      },
    ]
  })

  const messageItems = scheduledMessages.flatMap((message): ClientStrategyTimelineItem[] => {
    const recommendationId = extractRecommendationId(message.body, STRATEGY_NOTE_PREFIX)
    if (!recommendationId) return []

    return [
      {
        id: `message:${message.id}`,
        recommendationId,
        kind: 'message',
        label: message.status === 'sent' ? 'Message sent' : 'Message scheduled',
        detail: `Status: ${message.status}`,
        occurredAt: message.sent_at ?? message.scheduled_for ?? message.created_at,
      },
    ]
  })

  return [...todoItems, ...messageItems].sort((left, right) => {
    const leftTime = left.occurredAt ? Date.parse(left.occurredAt) : 0
    const rightTime = right.occurredAt ? Date.parse(right.occurredAt) : 0
    return rightTime - leftTime
  })
}

function buildBriefDiff(statuses: ClientStrategyActionStatusRecord[]): ClientStrategyBriefDiff {
  return {
    newRecommendationIds: statuses
      .filter((status) => status.status === 'new')
      .map((status) => status.recommendationId),
    activeRecommendationIds: statuses
      .filter((status) => status.status === 'scheduled' || status.status === 'needs_client')
      .map((status) => status.recommendationId),
    completedRecommendationIds: statuses
      .filter((status) => status.status === 'done')
      .map((status) => status.recommendationId),
    dismissedRecommendationIds: statuses
      .filter((status) => status.status === 'dismissed')
      .map((status) => status.recommendationId),
    wrongRecommendationIds: statuses
      .filter((status) => status.status === 'wrong_recommendation')
      .map((status) => status.recommendationId),
    replyReviewRecommendationIds: statuses
      .filter((status) => status.status === 'reply_review')
      .map((status) => status.recommendationId),
  }
}

function buildReadinessRow(client: ClientReadinessRecord): ClientStrategyReadinessRow {
  const missingFields = [
    !hasText(client.email) && 'email',
    !hasText(client.phone) && 'phone',
    !hasText(client.preferred_contact_method) && 'preferred contact method',
    !hasItems(client.dietary_restrictions) && 'dietary restrictions',
    !hasItems(client.allergies) && 'allergies',
    !hasItems(client.favorite_cuisines) && 'favorite cuisines',
  ].filter((item): item is string => Boolean(item))
  const staleFields =
    daysSince(client.updated_at) !== null &&
    Number(daysSince(client.updated_at)) > STALE_PROFILE_DAYS
      ? ['profile']
      : []
  const knownPreferenceCount =
    (client.dietary_restrictions ?? []).length +
    (client.allergies ?? []).length +
    (client.favorite_cuisines ?? []).length
  const score = Math.max(
    0,
    Math.min(
      100,
      100 - missingFields.length * 10 - staleFields.length * 15 + knownPreferenceCount * 3
    )
  )

  return {
    clientId: client.id,
    clientName: client.full_name,
    score,
    priority: priorityFromReadiness(score, missingFields),
    missingFields,
    staleFields,
    knownPreferenceCount,
    lastUpdatedAt: client.updated_at,
  }
}

function priorityFromReadiness(score: number, missingFields: string[]): ClientStrategyPriority {
  if (missingFields.includes('allergies') || missingFields.includes('dietary restrictions')) {
    return 'critical'
  }
  if (score < 55) return 'high'
  if (score < 75) return 'medium'
  return 'low'
}

function priorityRank(priority: ClientStrategyPriority): number {
  if (priority === 'critical') return 4
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  return 1
}

function hasText(value?: string | null): boolean {
  return Boolean(value && value.trim().length > 0)
}

function hasItems(value?: string[] | null): boolean {
  return Array.isArray(value) && value.some((item) => hasText(item))
}

function daysSince(value?: string | null): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
}
