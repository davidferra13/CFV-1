'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  CloseoutChecklist,
  CloseoutItem,
  CloseoutItemKey,
  CloseoutItemStatus,
  CloseoutStatus,
} from './closeout-types'
import {
  CLOSEOUT_ITEM_KEYS,
  CLOSEOUT_ITEM_LABELS,
} from './closeout-types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildDefaultItems(): CloseoutItem[] {
  return CLOSEOUT_ITEM_KEYS.map((key) => ({
    key,
    label: CLOSEOUT_ITEM_LABELS[key],
    status: 'pending' as const,
    completedAt: null,
  }))
}

function parseChecklist(row: any): CloseoutChecklist {
  const rawItems: any[] =
    typeof row.checklist_json === 'string'
      ? JSON.parse(row.checklist_json)
      : row.checklist_json ?? buildDefaultItems()

  // Normalize legacy snake_case fields and 'complete' status from stored JSON
  const items: CloseoutItem[] = rawItems.map((item: any) => ({
    key: item.key,
    label: item.label,
    status: item.status === 'complete' ? 'completed' : item.status,
    completedAt: item.completedAt ?? item.completed_at ?? null,
  }))

  return {
    id: row.id,
    eventId: row.event_id,
    tenantId: row.tenant_id,
    status: row.status as CloseoutStatus,
    initiatedAt: row.initiated_at,
    finalizedAt: row.finalized_at,
    items,
  }
}

// ── Initiate Closeout ───────────────────────────────────────────────────────

export async function initiateCloseout(eventId: string): Promise<{
  success: boolean
  checklist?: CloseoutChecklist
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Idempotent: return existing if already initiated
  const { data: existing } = await db
    .from('event_closeouts')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existing) {
    return { success: true, checklist: parseChecklist(existing) }
  }

  const items = buildDefaultItems()

  const { data, error } = await db
    .from('event_closeouts')
    .insert({
      event_id: eventId,
      tenant_id: tenantId,
      status: 'in_progress',
      checklist_json: JSON.stringify(items),
    })
    .select()
    .single()

  if (error) {
    console.error('[closeout] initiate error', error)
    return { success: false, error: 'Failed to initiate closeout' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true, checklist: parseChecklist(data) }
}

// ── Get Closeout Checklist ──────────────────────────────────────────────────

export async function getCloseoutChecklist(
  eventId: string
): Promise<CloseoutChecklist | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_closeouts')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !data) return null
  return parseChecklist(data)
}

// ── Update Closeout Item ────────────────────────────────────────────────────

export async function updateCloseoutItem(
  eventId: string,
  itemKey: CloseoutItemKey,
  status: CloseoutItemStatus
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Validate item key
  if (!CLOSEOUT_ITEM_KEYS.includes(itemKey)) {
    return { success: false, error: 'Invalid checklist item key' }
  }

  const { data: row, error: fetchErr } = await db
    .from('event_closeouts')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchErr || !row) {
    return { success: false, error: 'Closeout not found' }
  }

  if (row.status === 'complete') {
    return { success: false, error: 'Closeout already finalized' }
  }

  const checklist = parseChecklist(row)
  const updatedItems = checklist.items.map((item) => {
    if (item.key !== itemKey) return item
    return {
      ...item,
      status,
      completedAt:
        status === 'completed' ? new Date().toISOString() : null,
    }
  })

  const { error: updateErr } = await db
    .from('event_closeouts')
    .update({ checklist_json: JSON.stringify(updatedItems) })
    .eq('id', row.id)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    console.error('[closeout] update item error', updateErr)
    return { success: false, error: 'Failed to update checklist item' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ── Get Closeout Completeness ───────────────────────────────────────────────

export async function getCloseoutCompleteness(eventId: string): Promise<{
  total: number
  completed: number
  skipped: number
  pending: number
  percentage: number
}> {
  const checklist = await getCloseoutChecklist(eventId)

  if (!checklist) {
    return { total: 0, completed: 0, skipped: 0, pending: 0, percentage: 0 }
  }

  const total = checklist.items.length
  const completed = checklist.items.filter((i) => i.status === 'completed').length
  const skipped = checklist.items.filter((i) => i.status === 'skipped').length
  const pending = checklist.items.filter((i) => i.status === 'pending').length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, skipped, pending, percentage }
}

// ── Finalize Closeout ───────────────────────────────────────────────────────

export async function finalizeCloseout(eventId: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: row, error: fetchErr } = await db
    .from('event_closeouts')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (fetchErr || !row) {
    return { success: false, error: 'Closeout not found' }
  }

  if (row.status === 'complete') {
    return { success: true }
  }

  const checklist = parseChecklist(row)
  const pending = checklist.items.filter((i) => i.status === 'pending')

  if (pending.length > 0) {
    return {
      success: false,
      error: `${pending.length} item(s) still pending. Complete or skip all items before finalizing.`,
    }
  }

  const { error: updateErr } = await db
    .from('event_closeouts')
    .update({
      status: 'complete',
      finalized_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    console.error('[closeout] finalize error', updateErr)
    return { success: false, error: 'Failed to finalize closeout' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
