'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export type QuickNote = {
  id: string
  text: string
  status: 'raw' | 'triaged' | 'dismissed'
  triaged_to: string | null
  triaged_ref_id: string | null
  created_at: string
  updated_at: string
}

export async function getQuickNotes(opts?: {
  status?: string
  limit?: number
}): Promise<QuickNote[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const limit = opts?.limit ?? 20

  let query = db
    .from('chef_quick_notes')
    .select('id, text, status, triaged_to, triaged_ref_id, created_at, updated_at')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (opts?.status) {
    query = query.eq('status', opts.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[QuickNotes] getQuickNotes failed:', error)
    return []
  }

  return data ?? []
}

export async function addQuickNote(
  text: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  const trimmed = text.trim()
  if (!trimmed) {
    return { success: false, error: 'Note cannot be empty' }
  }
  if (trimmed.length > 1000) {
    return { success: false, error: 'Note must be under 1000 characters' }
  }

  const db: any = createServerClient()

  const { data: created, error } = await db
    .from('chef_quick_notes')
    .insert({
      chef_id: user.entityId,
      text: trimmed,
      status: 'raw',
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('[QuickNotes] addQuickNote failed:', error)
    return { success: false, error: 'Failed to save note' }
  }

  revalidatePath('/dashboard')
  return { success: true, id: created.id }
}

export async function triageQuickNote(
  id: string,
  action: {
    status: 'triaged' | 'dismissed'
    triaged_to?: string
    triaged_ref_id?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  if (!id) return { success: false, error: 'Note ID required' }

  const db: any = createServerClient()

  const { error } = await db
    .from('chef_quick_notes')
    .update({
      status: action.status,
      triaged_to: action.triaged_to ?? null,
      triaged_ref_id: action.triaged_ref_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[QuickNotes] triageQuickNote failed:', error)
    return { success: false, error: 'Failed to update note' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteQuickNote(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  if (!id) return { success: false, error: 'Note ID required' }

  const db: any = createServerClient()

  const { error } = await db
    .from('chef_quick_notes')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[QuickNotes] deleteQuickNote failed:', error)
    return { success: false, error: 'Failed to delete note' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
