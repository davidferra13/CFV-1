// Client Notes Server Actions
// CRUD for quick chef notes on clients

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type NoteCategory = 'general' | 'dietary' | 'preference' | 'logistics' | 'relationship'

export interface ClientNote {
  id: string
  tenant_id: string
  client_id: string
  event_id: string | null
  note_text: string
  category: NoteCategory
  pinned: boolean
  source: string
  created_at: string
  updated_at: string
}

// ============================================
// VALIDATION
// ============================================

const AddNoteSchema = z.object({
  client_id: z.string().uuid(),
  note_text: z.string().min(1).max(5000),
  category: z
    .enum(['general', 'dietary', 'preference', 'logistics', 'relationship'])
    .default('general'),
  event_id: z.string().uuid().nullable().optional(),
  pinned: z.boolean().optional(),
})

const UpdateNoteSchema = z.object({
  note_text: z.string().min(1).max(5000).optional(),
  category: z.enum(['general', 'dietary', 'preference', 'logistics', 'relationship']).optional(),
})

// ============================================
// ACTIONS
// ============================================

/**
 * Add a note to a client.
 */
export async function addClientNote(input: z.infer<typeof AddNoteSchema>) {
  const user = await requireChef()
  const validated = AddNoteSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_notes')
    .insert({
      tenant_id: user.tenantId!,
      client_id: validated.client_id,
      event_id: validated.event_id ?? null,
      note_text: validated.note_text,
      category: validated.category,
      pinned: validated.pinned ?? false,
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    console.error('[addClientNote] Error:', error)
    throw new Error('Failed to add note')
  }

  revalidatePath(`/clients/${validated.client_id}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const preview =
      validated.note_text.length > 60 ? validated.note_text.slice(0, 60) + '…' : validated.note_text
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'client_note_added',
      domain: 'communication',
      entityType: 'client_note',
      entityId: data.id,
      summary: `Added ${validated.category} note: "${preview}"`,
      context: { category: validated.category, pinned: validated.pinned },
      clientId: validated.client_id,
    })
  } catch (err) {
    console.error('[addClientNote] Activity log failed (non-blocking):', err)
  }

  return { success: true as const, note: data as ClientNote }
}

/**
 * Update a note.
 */
export async function updateClientNote(noteId: string, input: z.infer<typeof UpdateNoteSchema>) {
  const user = await requireChef()
  const validated = UpdateNoteSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_notes')
    .update(validated)
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateClientNote] Error:', error)
    throw new Error('Failed to update note')
  }

  return { success: true as const, note: data as ClientNote }
}

/**
 * Delete a note.
 */
export async function deleteClientNote(noteId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_notes')
    .delete()
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteClientNote] Error:', error)
    throw new Error('Failed to delete note')
  }

  return { success: true as const }
}

/**
 * Toggle pin status of a note.
 */
export async function toggleNotePin(noteId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get current pin state
  const { data: existing, error: fetchError } = await db
    .from('client_notes')
    .select('pinned')
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Note not found')
  }

  const { error } = await db
    .from('client_notes')
    .update({ pinned: !existing.pinned })
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleNotePin] Error:', error)
    throw new Error('Failed to toggle pin')
  }

  return { success: true as const, pinned: !existing.pinned }
}

/**
 * Get all notes for a client.
 * Returns pinned notes first, then by created_at desc.
 */
export async function getClientNotes(
  clientId: string,
  options?: {
    pinned_only?: boolean
    event_id?: string
    category?: NoteCategory
  }
): Promise<ClientNote[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('client_notes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.pinned_only) {
    query = query.eq('pinned', true)
  }
  if (options?.event_id) {
    query = query.eq('event_id', options.event_id)
  }
  if (options?.category) {
    query = query.eq('category', options.category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getClientNotes] Error:', error)
    return []
  }

  return (data || []) as ClientNote[]
}
