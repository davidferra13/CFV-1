import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { ClientStrategyPriority } from './client-strategy-brief'
import { STRATEGY_NOTE_PREFIX } from './client-strategy-note'

export type ClientStrategyActionStatus = 'new' | 'needs_client' | 'scheduled' | 'done'

export type ClientStrategyActionStatusRecord = {
  recommendationId: string
  status: ClientStrategyActionStatus
  taskIds: string[]
  scheduledMessageIds: string[]
  detail: string
}

export type ClientStrategyOperationalState = {
  clientId: string
  statuses: ClientStrategyActionStatusRecord[]
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

type TodoRow = {
  id: string
  completed: boolean
  notes: string | null
}

type ScheduledMessageRow = {
  id: string
  status: string
  body: string | null
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
      .select('id, completed, notes')
      .eq('chef_id', user.entityId)
      .eq('client_id', clientId),
    db
      .from('scheduled_messages')
      .select('id, status, body')
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

  return {
    clientId,
    statuses: buildOperationalStatuses(todoResult.data ?? [], messageResult.data ?? []),
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
  todos: TodoRow[],
  scheduledMessages: ScheduledMessageRow[]
): ClientStrategyActionStatusRecord[] {
  const byRecommendation = new Map<string, ClientStrategyActionStatusRecord>()

  for (const todo of todos) {
    const recommendationId = extractRecommendationId(todo.notes)
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

  for (const message of scheduledMessages) {
    const recommendationId = extractRecommendationId(message.body)
    if (!recommendationId) continue
    const record = getOrCreateStatusRecord(byRecommendation, recommendationId)
    record.scheduledMessageIds.push(message.id)
    if (record.status !== 'done') {
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
    detail: 'No linked reminder or scheduled message exists yet.',
  }
  records.set(recommendationId, created)
  return created
}

function extractRecommendationId(value: string | null): string | null {
  if (!value) return null
  const index = value.indexOf(STRATEGY_NOTE_PREFIX)
  if (index < 0) return null
  const rest = value.slice(index + STRATEGY_NOTE_PREFIX.length)
  const [id] = rest.split(/\s|\n/)
  return id?.trim() || null
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
