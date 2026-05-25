// Client-to-Chef Notes Server Actions
// CRUD for client notes about their chef (reverse of chef-notes-on-client)

'use server'

import { requireClient, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type ClientChefNoteCategory =
  | 'general'
  | 'service_quality'
  | 'food'
  | 'communication'
  | 'logistics'

export interface ClientChefNote {
  id: string
  client_id: string
  chef_id: string
  note_text: string
  category: ClientChefNoteCategory
  pinned: boolean
  shared_with_chef: boolean
  created_at: string
  updated_at: string
}

// ============================================
// VALIDATION
// ============================================

const categoryEnum = z.enum(['general', 'service_quality', 'food', 'communication', 'logistics'])

const AddClientChefNoteSchema = z.object({
  chef_id: z.string().uuid(),
  note_text: z.string().min(1).max(5000),
  category: categoryEnum.default('general'),
  pinned: z.boolean().optional(),
  shared_with_chef: z.boolean().optional(),
})

const UpdateClientChefNoteSchema = z.object({
  note_text: z.string().min(1).max(5000).optional(),
  category: categoryEnum.optional(),
})

// ============================================
// CLIENT ACTIONS
// ============================================

/**
 * Client adds a note about their chef.
 */
export async function addClientChefNote(input: z.infer<typeof AddClientChefNoteSchema>) {
  const user = await requireClient()
  const validated = AddClientChefNoteSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_chef_notes')
    .insert({
      client_id: user.entityId,
      chef_id: validated.chef_id,
      note_text: validated.note_text,
      category: validated.category,
      pinned: validated.pinned ?? false,
      shared_with_chef: validated.shared_with_chef ?? false,
    })
    .select()
    .single()

  if (error) {
    console.error('[addClientChefNote] Error:', error)
    throw new Error('Failed to add note')
  }

  revalidatePath('/portal')

  return { success: true as const, note: data as ClientChefNote }
}

/**
 * Client updates their own note.
 */
export async function updateClientChefNote(
  noteId: string,
  input: z.infer<typeof UpdateClientChefNoteSchema>
) {
  const user = await requireClient()
  const validated = UpdateClientChefNoteSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_chef_notes')
    .update(validated)
    .eq('id', noteId)
    .eq('client_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[updateClientChefNote] Error:', error)
    throw new Error('Failed to update note')
  }

  revalidatePath('/portal')

  return { success: true as const, note: data as ClientChefNote }
}

/**
 * Client deletes their own note.
 */
export async function deleteClientChefNote(noteId: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { error } = await db
    .from('client_chef_notes')
    .delete()
    .eq('id', noteId)
    .eq('client_id', user.entityId)

  if (error) {
    console.error('[deleteClientChefNote] Error:', error)
    throw new Error('Failed to delete note')
  }

  revalidatePath('/portal')

  return { success: true as const }
}

/**
 * Client toggles pin on their own note.
 */
export async function toggleClientChefNotePin(noteId: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: existing, error: fetchError } = await db
    .from('client_chef_notes')
    .select('pinned')
    .eq('id', noteId)
    .eq('client_id', user.entityId)
    .single()

  if (fetchError || !existing) {
    throw new Error('Note not found')
  }

  const { error } = await db
    .from('client_chef_notes')
    .update({ pinned: !existing.pinned })
    .eq('id', noteId)
    .eq('client_id', user.entityId)

  if (error) {
    console.error('[toggleClientChefNotePin] Error:', error)
    throw new Error('Failed to toggle pin')
  }

  revalidatePath('/portal')

  return { success: true as const, pinned: !existing.pinned }
}

/**
 * Client toggles whether a note is shared with their chef.
 */
export async function toggleClientChefNoteSharing(noteId: string) {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: existing, error: fetchError } = await db
    .from('client_chef_notes')
    .select('shared_with_chef')
    .eq('id', noteId)
    .eq('client_id', user.entityId)
    .single()

  if (fetchError || !existing) {
    throw new Error('Note not found')
  }

  const { error } = await db
    .from('client_chef_notes')
    .update({ shared_with_chef: !existing.shared_with_chef })
    .eq('id', noteId)
    .eq('client_id', user.entityId)

  if (error) {
    console.error('[toggleClientChefNoteSharing] Error:', error)
    throw new Error('Failed to toggle sharing')
  }

  revalidatePath('/portal')

  return { success: true as const, shared_with_chef: !existing.shared_with_chef }
}

// ============================================
// QUERY ACTIONS
// ============================================

/**
 * Client gets their own notes on a specific chef.
 * Pinned first, then by created_at desc.
 */
export async function getMyChefNotes(
  chefId: string,
  options?: {
    pinned_only?: boolean
    category?: ClientChefNoteCategory
    shared_only?: boolean
  }
): Promise<ClientChefNote[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  let query = db
    .from('client_chef_notes')
    .select('*')
    .eq('client_id', user.entityId)
    .eq('chef_id', chefId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.pinned_only) {
    query = query.eq('pinned', true)
  }
  if (options?.category) {
    query = query.eq('category', options.category)
  }
  if (options?.shared_only) {
    query = query.eq('shared_with_chef', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getMyChefNotes] Error:', error)
    return []
  }

  return (data || []) as ClientChefNote[]
}

/**
 * Chef gets notes that clients have shared with them.
 * Scoped to chef's tenant. Only returns shared notes.
 */
export async function getSharedClientNotes(options?: {
  client_id?: string
  category?: ClientChefNoteCategory
}): Promise<ClientChefNote[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('client_chef_notes')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('shared_with_chef', true)
    .order('created_at', { ascending: false })

  if (options?.client_id) {
    query = query.eq('client_id', options.client_id)
  }
  if (options?.category) {
    query = query.eq('category', options.category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getSharedClientNotes] Error:', error)
    return []
  }

  return (data || []) as ClientChefNote[]
}
