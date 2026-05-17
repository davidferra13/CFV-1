'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ActionCard,
  ActionCardPriority,
  ActionCardActionType,
  ActionRecommendation,
  ActionCardSummary,
} from './action-card-types'

// ---- helpers ----

function fromActionCards(db: any): any {
  return (db as any).from('lifecycle_action_cards')
}

function fromRecommendations(db: any): any {
  return (db as any).from('action_recommendations')
}

// ---- actions ----

export async function getActionCards(eventId: string, stage?: string): Promise<ActionCard[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromActionCards(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load action cards: ${error.message}`)
  return (data ?? []).map(mapCard)
}

export async function createActionCard(params: {
  eventId: string
  lifecycleStage: string
  title: string
  description?: string
  actionType: ActionCardActionType
  targetRoute?: string
  priority?: ActionCardPriority
  dueAt?: string
}): Promise<ActionCard> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    event_id: params.eventId,
    lifecycle_stage: params.lifecycleStage,
    title: params.title,
    action_type: params.actionType,
  }
  if (params.description !== undefined) payload.description = params.description
  if (params.targetRoute !== undefined) payload.target_route = params.targetRoute
  if (params.priority !== undefined) payload.priority = params.priority
  if (params.dueAt !== undefined) payload.due_at = params.dueAt

  const { data, error } = await fromActionCards(db).insert(payload).select('*').single()

  if (error) throw new Error(`Failed to create action card: ${error.message}`)
  return mapCard(data)
}

export async function completeActionCard(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromActionCards(db)
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to complete action card: ${error.message}`)
}

export async function dismissActionCard(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromActionCards(db)
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to dismiss action card: ${error.message}`)
}

export async function getActionRecommendations(stage?: string): Promise<ActionRecommendation[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromRecommendations(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load action recommendations: ${error.message}`)
  return (data ?? []).map(mapRecommendation)
}

export async function getActionCardSummary(eventId: string): Promise<ActionCardSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromActionCards(db)
    .select('id, priority, completed_at, dismissed_at, due_at')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)

  if (error) throw new Error(`Failed to load action card summary: ${error.message}`)

  const cards = data ?? []
  const now = new Date()
  let pendingCards = 0
  let overdueCards = 0
  let completedCards = 0
  let criticalCount = 0

  for (const card of cards) {
    if (card.completed_at) {
      completedCards++
      continue
    }
    if (card.dismissed_at) continue

    pendingCards++
    if (card.priority === 'critical') criticalCount++
    if (card.due_at && new Date(card.due_at) < now) overdueCards++
  }

  return {
    eventId,
    totalCards: cards.length,
    pendingCards,
    overdueCards,
    completedCards,
    criticalCount,
  }
}

// ---- mappers ----

function mapCard(row: any): ActionCard {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    lifecycleStage: row.lifecycle_stage,
    title: row.title,
    description: row.description ?? null,
    actionType: row.action_type,
    targetRoute: row.target_route ?? null,
    priority: row.priority ?? 'normal',
    dueAt: row.due_at ? new Date(row.due_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    dismissedAt: row.dismissed_at ? new Date(row.dismissed_at) : null,
    createdAt: new Date(row.created_at),
  }
}

function mapRecommendation(row: any): ActionRecommendation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStage: row.lifecycle_stage,
    triggerCondition: row.trigger_condition ?? {},
    recommendedAction: row.recommended_action,
    title: row.title,
    description: row.description ?? null,
    autoCreate: row.auto_create ?? false,
    createdAt: new Date(row.created_at),
  }
}
