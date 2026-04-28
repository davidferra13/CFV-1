// Private Context Layer - Server Actions
// Chef-only notes, reminders, observations attachable to any entity

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  ChefPrivateContext,
  PrivateContextEntityType,
  PrivateContextType,
} from './types'

// ============================================================
// VALIDATION
// ============================================================

const CreateContextSchema = z.object({
  entity_type: z.enum(['event', 'client', 'menu', 'circle', 'dish', 'recipe']),
  entity_id: z.string().uuid(),
  context_type: z.enum(['note', 'reminder', 'observation', 'intention', 'item']).default('note'),
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(10000).nullable().optional(),
  structured_data: z.record(z.string(), z.unknown()).optional(),
  pinned: z.boolean().optional(),
  remind_at: z.string().datetime().nullable().optional(),
})

const UpdateContextSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(10000).nullable().optional(),
  structured_data: z.record(z.string(), z.unknown()).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  remind_at: z.string().datetime().nullable().optional(),
})

// ============================================================
// CREATE
// ============================================================

export async function createPrivateContext(
  input: z.infer<typeof CreateContextSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const user = await requireChef()
    const validated = CreateContextSchema.parse(input)
    const db: any = createServerClient()

    const { data, error } = await db
      .from('chef_private_context')
      .insert({
        tenant_id: user.tenantId,
        entity_type: validated.entity_type,
        entity_id: validated.entity_id,
        context_type: validated.context_type,
        title: validated.title ?? null,
        content: validated.content ?? null,
        structured_data: validated.structured_data ?? {},
        pinned: validated.pinned ?? false,
        remind_at: validated.remind_at ?? null,
      })
      .select('id')
      .single()

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[PrivateContext] create failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================
// READ
// ============================================================

export async function getPrivateContexts(
  entityType: PrivateContextEntityType,
  entityId: string,
  opts?: { includeArchived?: boolean; contextType?: PrivateContextType }
): Promise<ChefPrivateContext[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('chef_private_context')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (!opts?.includeArchived) {
    query = query.eq('archived', false)
  }
  if (opts?.contextType) {
    query = query.eq('context_type', opts.contextType)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ChefPrivateContext[]
}

export async function getPrivateContextById(id: string): Promise<ChefPrivateContext | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_private_context')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId)
    .single()

  if (error) return null
  return data as ChefPrivateContext
}

export async function getPendingReminders(): Promise<ChefPrivateContext[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_private_context')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('archived', false)
    .not('remind_at', 'is', null)
    .lte('remind_at', new Date().toISOString())
    .order('remind_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as ChefPrivateContext[]
}

// ============================================================
// UPDATE
// ============================================================

export async function updatePrivateContext(
  id: string,
  input: z.infer<typeof UpdateContextSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const validated = UpdateContextSchema.parse(input)
    const db: any = createServerClient()

    const updates: Record<string, unknown> = {}
    if (validated.title !== undefined) updates.title = validated.title
    if (validated.content !== undefined) updates.content = validated.content
    if (validated.structured_data !== undefined) updates.structured_data = validated.structured_data
    if (validated.pinned !== undefined) updates.pinned = validated.pinned
    if (validated.archived !== undefined) updates.archived = validated.archived
    if (validated.remind_at !== undefined) updates.remind_at = validated.remind_at

    const { error } = await db
      .from('chef_private_context')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', user.tenantId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[PrivateContext] update failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function togglePinContext(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('chef_private_context')
    .select('pinned')
    .eq('id', id)
    .eq('tenant_id', user.tenantId)
    .single()

  if (!existing) return { success: false }

  const { error } = await db
    .from('chef_private_context')
    .update({ pinned: !existing.pinned })
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) return { success: false }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function archiveContext(id: string): Promise<{ success: boolean }> {
  return updatePrivateContext(id, { archived: true })
}

// ============================================================
// DELETE
// ============================================================

export async function deletePrivateContext(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { error } = await db
      .from('chef_private_context')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.tenantId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[PrivateContext] delete failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
