// Capture Actions
// CRUD + AI processing for chef_captures table.
// Captures persist raw ideas/notes/photos, auto-tag via AI, and feed into content + recipes.

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ── Types ──────────────────────────────────────────────────────────────────

export type CaptureType = 'text' | 'photo' | 'voice'
export type CaptureStatus = 'inbox' | 'processing' | 'sorted' | 'archived'
export type CaptureTag =
  | 'recipe'
  | 'event-idea'
  | 'client-note'
  | 'marketing-thought'
  | 'prep-task'
  | 'shopping'
  | 'menu-idea'
  | 'business'
  | 'field-capture'
  | 'incident'
  | 'vendor'
  | 'loadout'
  | 'household'
  | 'waste'
  | 'staff'
  | 'craft'
  | 'private_only'
  | 'chef_internal'

export type Capture = {
  id: string
  tenantId: string
  captureType: CaptureType
  rawContent: string
  parsedItems: ParsedItem[]
  tags: CaptureTag[]
  status: CaptureStatus
  source: string
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export type ParsedItem = {
  text: string
  category: string
  urgency?: 'high' | 'medium' | 'low'
  actionable?: boolean
}

// ── Schemas ────────────────────────────────────────────────────────────────

const CreateCaptureSchema = z.object({
  captureType: z.enum(['text', 'photo', 'voice']),
  rawContent: z.string().min(1).max(10000),
  tags: z.array(z.string()).optional(),
  photoUrl: z.string().url().optional(),
  source: z.string().optional(),
  parsedItems: z
    .array(
      z.object({
        text: z.string(),
        category: z.string(),
        urgency: z.enum(['high', 'medium', 'low']).optional(),
        actionable: z.boolean().optional(),
      })
    )
    .optional(),
})

const UpdateCaptureSchema = z.object({
  rawContent: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['inbox', 'processing', 'sorted', 'archived']).optional(),
  parsedItems: z
    .array(
      z.object({
        text: z.string(),
        category: z.string(),
        urgency: z.enum(['high', 'medium', 'low']).optional(),
        actionable: z.boolean().optional(),
      })
    )
    .optional(),
})

// ── Actions ────────────────────────────────────────────────────────────────

export async function createCapture(
  input: z.infer<typeof CreateCaptureSchema>
): Promise<{ success: boolean; capture: Capture }> {
  const validated = CreateCaptureSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_captures')
    .insert({
      tenant_id: user.tenantId!,
      capture_type: validated.captureType,
      raw_content: validated.rawContent,
      tags: validated.tags ?? [],
      photo_url: validated.photoUrl ?? null,
      source: validated.source ?? 'manual',
      parsed_items: validated.parsedItems ?? [],
      status: 'inbox',
    })
    .select()
    .single()

  if (error) {
    console.error('[createCapture] Error:', error)
    throw new Error('Failed to create capture')
  }

  revalidatePath('/capture')
  return { success: true, capture: mapCapture(data) }
}

export async function getCaptures(opts?: {
  status?: CaptureStatus
  tag?: string
  limit?: number
}): Promise<Capture[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('chef_captures')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50)

  if (opts?.status) {
    query = query.eq('status', opts.status)
  }
  if (opts?.tag) {
    query = query.contains('tags', [opts.tag])
  }

  const { data, error } = await query
  if (error) {
    console.error('[getCaptures] Error:', error)
    return []
  }
  return (data ?? []).map(mapCapture)
}

export async function getCapture(id: string): Promise<Capture | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_captures')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) return null
  return mapCapture(data)
}

export async function updateCapture(
  id: string,
  input: z.infer<typeof UpdateCaptureSchema>
): Promise<{ success: boolean; capture: Capture }> {
  const validated = UpdateCaptureSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  const updatePayload: Record<string, unknown> = {}
  if (validated.rawContent !== undefined) updatePayload.raw_content = validated.rawContent
  if (validated.tags !== undefined) updatePayload.tags = validated.tags
  if (validated.status !== undefined) updatePayload.status = validated.status
  if (validated.parsedItems !== undefined) updatePayload.parsed_items = validated.parsedItems

  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No fields to update')
  }

  const { data, error } = await db
    .from('chef_captures')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateCapture] Error:', error)
    throw new Error('Failed to update capture')
  }

  revalidatePath('/capture')
  return { success: true, capture: mapCapture(data) }
}

export async function archiveCapture(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_captures')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[archiveCapture] Error:', error)
    throw new Error('Failed to archive capture')
  }

  revalidatePath('/capture')
  return { success: true }
}

export async function deleteCapture(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_captures')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteCapture] Error:', error)
    throw new Error('Failed to delete capture')
  }

  revalidatePath('/capture')
  return { success: true }
}

/** Get count of captures by status for dashboard badges */
export async function getCaptureStats(): Promise<Record<CaptureStatus, number>> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_captures')
    .select('status')
    .eq('tenant_id', user.tenantId!)

  if (error || !data) return { inbox: 0, processing: 0, sorted: 0, archived: 0 }

  const stats: Record<CaptureStatus, number> = { inbox: 0, processing: 0, sorted: 0, archived: 0 }
  for (const row of data) {
    const s = row.status as CaptureStatus
    if (s in stats) stats[s]++
  }
  return stats
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mapCapture(row: any): Capture {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    captureType: row.capture_type,
    rawContent: row.raw_content,
    parsedItems: row.parsed_items ?? [],
    tags: row.tags ?? [],
    status: row.status,
    source: row.source,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
