'use server'

// Memory Surface: Decision Memory Actions
// Auth-gated server actions that query chef_captures and rank results
// by recency and context match for surfacing at decision points.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { DecisionPoint, MemoryHit, DecisionContext } from './decision-point-types'
import { DECISION_CONTEXT_MAP } from './decision-point-types'

// ── Scoring ───────────────────────────────────────────────────────────────

const MAX_RECENCY_DAYS = 90

function scoreMemory(row: any, targetContextTypes: string[], targetTags: string[]): number {
  let score = 0

  // Recency: captures from today score 1.0, 90+ days ago score 0.0
  const ageMs = Date.now() - new Date(row.created_at).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(0, 1 - ageDays / MAX_RECENCY_DAYS)
  score += recencyScore * 0.5

  // Context type match from parsed_items category
  const parsedItems = (row.parsed_items as Array<{ category?: string }>) ?? []
  const category = parsedItems[0]?.category ?? 'general'
  if (targetContextTypes.includes(category)) {
    score += 0.3
  }

  // Tag overlap
  const rowTags = (row.tags as string[]) ?? []
  const tagOverlap = rowTags.filter((t: string) => targetTags.includes(t)).length
  if (tagOverlap > 0) {
    score += Math.min(0.2, tagOverlap * 0.1)
  }

  return Math.round(score * 100) / 100
}

function rowToMemoryHit(row: any, relevanceScore: number): MemoryHit {
  const parsedItems = (row.parsed_items as Array<{ category?: string }>) ?? []
  return {
    captureId: row.id,
    content: row.raw_content,
    relevanceScore,
    contextType: parsedItems[0]?.category ?? 'general',
    createdAt: row.created_at,
  }
}

// ── Actions ───────────────────────────────────────────────────────────────

/**
 * Get memories relevant to a specific decision point, filtered by entity.
 */
export async function getMemoriesForDecision(
  point: DecisionPoint,
  entityType: string | null,
  entityId: string | null
): Promise<MemoryHit[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const mapping = DECISION_CONTEXT_MAP[point]

  let query = db
    .from('chef_captures')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(50)

  // If we have target tags, filter to captures that overlap
  if (mapping.tags.length > 0) {
    query = query.overlaps('tags', mapping.tags)
  }

  const { data, error } = await query

  if (error) {
    console.error('[memory-surface] getMemoriesForDecision error:', error)
    return []
  }

  const rows = (data ?? []) as any[]
  const scored = rows
    .map((row) => ({
      row,
      score: scoreMemory(row, mapping.contextTypes, mapping.tags),
    }))
    .filter((entry) => entry.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return scored.map((entry) => rowToMemoryHit(entry.row, entry.score))
}

/**
 * Get all captures associated with a specific client.
 */
export async function getClientMemories(clientId: string): Promise<MemoryHit[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_captures')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'archived')
    .overlaps('tags', ['client-note'])
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[memory-surface] getClientMemories error:', error)
    return []
  }

  const mapping = DECISION_CONTEXT_MAP.client_onboarding
  return ((data ?? []) as any[]).map((row) =>
    rowToMemoryHit(row, scoreMemory(row, mapping.contextTypes, mapping.tags))
  )
}

/**
 * Get all captures associated with a specific event.
 */
export async function getEventMemories(eventId: string): Promise<MemoryHit[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_captures')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .neq('status', 'archived')
    .overlaps('tags', ['event-idea', 'prep-task', 'loadout'])
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[memory-surface] getEventMemories error:', error)
    return []
  }

  const mapping = DECISION_CONTEXT_MAP.event_planning
  return ((data ?? []) as any[]).map((row) =>
    rowToMemoryHit(row, scoreMemory(row, mapping.contextTypes, mapping.tags))
  )
}

/**
 * Main entry point: surface relevant context for a decision point.
 * Returns a full DecisionContext with ranked memories.
 */
export async function surfaceRelevantContext(
  point: DecisionPoint,
  metadata?: { entityType?: string; entityId?: string }
): Promise<DecisionContext> {
  const entityType = metadata?.entityType ?? null
  const entityId = metadata?.entityId ?? null

  const relevantMemories = await getMemoriesForDecision(point, entityType, entityId)

  return {
    point,
    entityType,
    entityId,
    relevantMemories,
  }
}
