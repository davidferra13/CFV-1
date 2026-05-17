'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  CaptureCategory,
  CaptureStatus,
  CapturePriority,
  CaptureEntry,
  CaptureStats,
} from './capture-types'

// ============================================
// Quick Capture - fast brain dump
// ============================================

export async function quickCapture(
  content: string,
  category: CaptureCategory = 'general',
  priority: CapturePriority = 'normal'
): Promise<CaptureEntry> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!content || !content.trim()) {
    throw new Error('Capture content cannot be empty')
  }

  const { data, error } = await db
    .from('capture_entries')
    .insert({
      tenant_id: user.tenantId!,
      content: content.trim(),
      category,
      priority,
      status: 'inbox',
      captured_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[quickCapture] Error:', error)
    throw new Error('Failed to capture entry')
  }

  revalidatePath('/dashboard')
  return data
}

// ============================================
// Get Capture Inbox
// ============================================

export async function getCaptureInbox(
  status?: CaptureStatus,
  limit: number = 50
): Promise<CaptureEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('capture_entries')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('captured_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getCaptureInbox] Error:', error)
    throw new Error('Failed to fetch capture entries')
  }

  return data ?? []
}

// ============================================
// Triage - categorize and optionally link
// ============================================

export async function triageCapture(
  captureId: string,
  category: CaptureCategory,
  priority?: CapturePriority,
  linkedEventId?: string,
  linkedClientId?: string
): Promise<CaptureEntry> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {
    category,
    status: 'triaged',
    triaged_at: new Date().toISOString(),
  }

  if (priority) updates.priority = priority
  if (linkedEventId) updates.linked_event_id = linkedEventId
  if (linkedClientId) updates.linked_client_id = linkedClientId

  const { data, error } = await db
    .from('capture_entries')
    .update(updates)
    .eq('id', captureId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[triageCapture] Error:', error)
    throw new Error('Failed to triage capture entry')
  }

  revalidatePath('/dashboard')
  return data
}

// ============================================
// Action - mark as actioned
// ============================================

export async function actionCapture(captureId: string): Promise<CaptureEntry> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('capture_entries')
    .update({
      status: 'actioned',
      actioned_at: new Date().toISOString(),
    })
    .eq('id', captureId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[actionCapture] Error:', error)
    throw new Error('Failed to action capture entry')
  }

  revalidatePath('/dashboard')
  return data
}

// ============================================
// Dismiss - mark as dismissed
// ============================================

export async function dismissCapture(captureId: string): Promise<CaptureEntry> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('capture_entries')
    .update({ status: 'dismissed' })
    .eq('id', captureId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[dismissCapture] Error:', error)
    throw new Error('Failed to dismiss capture entry')
  }

  revalidatePath('/dashboard')
  return data
}

// ============================================
// Stats - count by status
// ============================================

export async function getCaptureStats(): Promise<CaptureStats> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('capture_entries')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getCaptureStats] Error:', error)
    throw new Error('Failed to fetch capture stats')
  }

  const rows = data ?? []
  const stats: CaptureStats = { inbox: 0, triaged: 0, actioned: 0, total: rows.length }

  for (const row of rows) {
    if (row.status === 'inbox') stats.inbox++
    else if (row.status === 'triaged') stats.triaged++
    else if (row.status === 'actioned') stats.actioned++
  }

  return stats
}

// ============================================
// Bulk Triage - batch categorize
// ============================================

export async function bulkTriageCaptures(
  captureIds: string[],
  category: CaptureCategory
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!captureIds.length) return

  const { error } = await db
    .from('capture_entries')
    .update({
      category,
      status: 'triaged',
      triaged_at: new Date().toISOString(),
    })
    .in('id', captureIds)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[bulkTriageCaptures] Error:', error)
    throw new Error('Failed to bulk triage capture entries')
  }

  revalidatePath('/dashboard')
}
