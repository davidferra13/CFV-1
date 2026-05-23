'use server'

// Passive Capture Triage Dock
// Server actions for the inbound triage dock where chef reviews and routes
// captured items (emails, messages, photos, notes) to appropriate entities.
// No manual data entry required; system captures, chef triages.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { CaptureCategory, CaptureStatus, CaptureEntry } from './capture-types'

// ── Types ──────────────────────────────────────────────────────────────────

export type TriageTarget =
  | { type: 'event'; eventId: string }
  | { type: 'client'; clientId: string }
  | { type: 'recipe'; recipeId: string }
  | { type: 'menu'; menuId: string }
  | { type: 'inquiry'; inquiryId: string }
  | { type: 'task'; description: string }
  | { type: 'dismiss' }

export interface TriageDockItem {
  capture: CaptureEntry
  suggestedTargets: TriageSuggestion[]
}

export interface TriageSuggestion {
  type: TriageTarget['type']
  entityId: string | null
  label: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface TriageDockFeed {
  items: TriageDockItem[]
  totalInbox: number
}

// ── Dock Feed ──────────────────────────────────────────────────────────────

/**
 * Get the triage dock feed: inbox items with suggested routing targets.
 */
export async function getTriageDockFeed(limit: number = 20): Promise<TriageDockFeed> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error, count } = await db
    .from('capture_entries')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'inbox')
    .order('captured_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[triage-dock] Feed error:', error)
    return { items: [], totalInbox: 0 }
  }

  const entries = (data ?? []) as CaptureEntry[]

  // Generate suggestions for each entry based on content analysis
  const items: TriageDockItem[] = entries.map((entry) => ({
    capture: entry,
    suggestedTargets: inferTargets(entry),
  }))

  return {
    items,
    totalInbox: count ?? entries.length,
  }
}

// ── Route Action ───────────────────────────────────────────────────────────

/**
 * Route a capture entry to a target entity.
 * Links the capture to the entity and marks it as triaged.
 */
export async function routeCaptureToTarget(
  captureId: string,
  target: TriageTarget
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (target.type === 'dismiss') {
    const { error } = await db
      .from('capture_entries')
      .update({
        status: 'dismissed' as CaptureStatus,
        triaged_at: new Date().toISOString(),
      })
      .eq('id', captureId)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[triage-dock] Dismiss error:', error)
      return { success: false, error: 'Failed to dismiss capture' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  }

  // Build update payload with linked entity
  const updates: Record<string, unknown> = {
    status: 'triaged' as CaptureStatus,
    triaged_at: new Date().toISOString(),
  }

  switch (target.type) {
    case 'event':
      updates.linked_event_id = target.eventId
      updates.category = 'event_note'
      break
    case 'client':
      updates.linked_client_id = target.clientId
      updates.category = 'client_note'
      break
    case 'recipe':
      updates.linked_recipe_id = target.recipeId
      updates.category = 'recipe_idea'
      break
    case 'menu':
      updates.category = 'menu_idea'
      break
    case 'inquiry':
      updates.category = 'general'
      break
    case 'task':
      updates.category = 'prep_reminder'
      break
  }

  const { error } = await db
    .from('capture_entries')
    .update(updates)
    .eq('id', captureId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[triage-dock] Route error:', error)
    return { success: false, error: 'Failed to route capture' }
  }

  // If routing to task, create a chef_todo from the capture content
  if (target.type === 'task') {
    const { data: capture } = await db
      .from('capture_entries')
      .select('content')
      .eq('id', captureId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (capture?.content) {
      await db.from('chef_todos').insert({
        chef_id: user.entityId,
        text: target.description || capture.content,
        completed: false,
        priority: 'medium',
        category: 'task',
      })
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// ── Batch Operations ───────────────────────────────────────────────────────

/**
 * Dismiss multiple captures at once.
 */
export async function batchDismissCaptures(
  captureIds: string[]
): Promise<{ success: boolean; dismissed: number }> {
  if (!captureIds.length) return { success: true, dismissed: 0 }

  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('capture_entries')
    .update({
      status: 'dismissed' as CaptureStatus,
      triaged_at: new Date().toISOString(),
    })
    .in('id', captureIds)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[triage-dock] Batch dismiss error:', error)
    return { success: false, dismissed: 0 }
  }

  revalidatePath('/dashboard')
  return { success: true, dismissed: captureIds.length }
}

// ── Suggestion Engine ──────────────────────────────────────────────────────

/**
 * Infer routing targets from capture content using keyword matching.
 * Pure pattern matching, no AI.
 */
function inferTargets(entry: CaptureEntry): TriageSuggestion[] {
  const suggestions: TriageSuggestion[] = []
  const content = entry.content.toLowerCase()

  // Category-based suggestions
  if (entry.category === 'recipe_idea' || entry.category === 'menu_idea') {
    suggestions.push({
      type: 'recipe',
      entityId: null,
      label: 'Add to recipes',
      confidence: 'medium',
      reason: `Categorized as ${entry.category.replace('_', ' ')}`,
    })
  }

  if (entry.category === 'client_note' && entry.linked_client_id) {
    suggestions.push({
      type: 'client',
      entityId: entry.linked_client_id,
      label: 'Attach to client',
      confidence: 'high',
      reason: 'Already linked to a client',
    })
  }

  if (entry.category === 'event_note' && entry.linked_event_id) {
    suggestions.push({
      type: 'event',
      entityId: entry.linked_event_id,
      label: 'Attach to event',
      confidence: 'high',
      reason: 'Already linked to an event',
    })
  }

  // Keyword-based suggestions
  const recipeKeywords = ['recipe', 'cook', 'ingredient', 'dish', 'sauce', 'prep']
  const eventKeywords = ['dinner', 'event', 'party', 'catering', 'service']
  const taskKeywords = ['todo', 'buy', 'order', 'pick up', 'call', 'schedule', 'remind']

  if (recipeKeywords.some((k) => content.includes(k))) {
    suggestions.push({
      type: 'recipe',
      entityId: null,
      label: 'Create recipe note',
      confidence: 'low',
      reason: 'Content mentions cooking or recipes',
    })
  }

  if (eventKeywords.some((k) => content.includes(k))) {
    suggestions.push({
      type: 'event',
      entityId: null,
      label: 'Link to event',
      confidence: 'low',
      reason: 'Content mentions events or dinners',
    })
  }

  if (taskKeywords.some((k) => content.includes(k))) {
    suggestions.push({
      type: 'task',
      entityId: null,
      label: 'Create task',
      confidence: 'medium',
      reason: 'Content sounds like an action item',
    })
  }

  return suggestions
}
