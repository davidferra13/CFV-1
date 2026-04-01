'use server'

// Workflow Note Server Actions
// CRUD, context assignment, menu linking, and note-to-dish promotion.
// Culinary workflow idea capture layer - independent from client_notes / inquiry_notes.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// SCHEMAS
// ============================================================

const OwnershipScopeSchema = z.enum(['global', 'client', 'event'])

const CreateWorkflowNoteSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1, 'Note body is required'),
  ownership_scope: OwnershipScopeSchema.default('global'),
  client_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
})

const UpdateWorkflowNoteSchema = z.object({
  title: z.string().nullable().optional(),
  body: z.string().min(1).optional(),
  status: z.enum(['open', 'promoted', 'archived']).optional(),
})

const AssignContextSchema = z.object({
  ownership_scope: OwnershipScopeSchema,
  client_id: z.string().uuid().nullable().optional(),
  event_id: z.string().uuid().nullable().optional(),
})

const LinkNoteToMenuSchema = z.object({
  noteId: z.string().uuid(),
  menuId: z.string().uuid().optional(),
  draftMenuKey: z.string().optional(),
})

const UnlinkNoteFromMenuSchema = z.object({
  noteId: z.string().uuid(),
  menuId: z.string().uuid(),
})

const PromoteNoteSchema = z.object({
  noteId: z.string().uuid(),
  name: z.string().min(1, 'Dish name is required'),
  course: z.string().min(1, 'Course is required'),
  description: z.string().optional(),
  ownership_scope: OwnershipScopeSchema.optional(),
  client_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  attachMenuId: z.string().uuid().optional(),
  attachMode: z.enum(['reference', 'copy']).optional(),
})

// ============================================================
// HELPERS
// ============================================================

function validateOwnershipArgs(
  scope: string,
  clientId?: string | null,
  eventId?: string | null
): string | null {
  if (scope === 'global' && (clientId || eventId)) {
    return 'Global notes must not have a client or event'
  }
  if (scope === 'client' && !clientId) {
    return 'Client-scoped notes require a client_id'
  }
  if (scope === 'client' && eventId) {
    return 'Client-scoped notes must not have an event_id'
  }
  if (scope === 'event' && !eventId) {
    return 'Event-scoped notes require an event_id'
  }
  return null
}

// ============================================================
// CREATE
// ============================================================

export async function createWorkflowNote(input: {
  title?: string
  body: string
  ownership_scope?: 'global' | 'client' | 'event'
  client_id?: string
  event_id?: string
}) {
  const user = await requireChef()
  const validated = CreateWorkflowNoteSchema.parse(input)

  const scopeError = validateOwnershipArgs(
    validated.ownership_scope,
    validated.client_id,
    validated.event_id
  )
  if (scopeError) {
    return { success: false, error: scopeError }
  }

  const db: any = createServerClient()

  const { data: note, error } = await db
    .from('workflow_notes')
    .insert({
      tenant_id: user.tenantId!,
      title: validated.title ?? null,
      body: validated.body,
      ownership_scope: validated.ownership_scope,
      client_id: validated.client_id ?? null,
      event_id: validated.event_id ?? null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error || !note) {
    console.error('[createWorkflowNote] Error:', error)
    return { success: false, error: 'Failed to create note' }
  }

  revalidatePath('/menus')

  return { success: true, note }
}

// ============================================================
// UPDATE
// ============================================================

export async function updateWorkflowNote(
  noteId: string,
  input: {
    title?: string | null
    body?: string
    status?: 'open' | 'promoted' | 'archived'
  }
) {
  const user = await requireChef()
  const validated = UpdateWorkflowNoteSchema.parse(input)

  if (Object.keys(validated).length === 0) {
    return { success: false, error: 'No fields to update' }
  }

  const db: any = createServerClient()

  const { data: existing } = await db
    .from('workflow_notes')
    .select('id')
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) {
    return { success: false, error: 'Note not found' }
  }

  const { data: note, error } = await db
    .from('workflow_notes')
    .update({
      ...validated,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error || !note) {
    console.error('[updateWorkflowNote] Error:', error)
    return { success: false, error: 'Failed to update note' }
  }

  revalidatePath('/menus')

  return { success: true, note }
}

// ============================================================
// ASSIGN CONTEXT
// ============================================================

export async function assignWorkflowNoteContext(
  noteId: string,
  input: {
    ownership_scope: 'global' | 'client' | 'event'
    client_id?: string | null
    event_id?: string | null
  }
) {
  const user = await requireChef()
  const validated = AssignContextSchema.parse(input)

  const scopeError = validateOwnershipArgs(
    validated.ownership_scope,
    validated.client_id,
    validated.event_id
  )
  if (scopeError) {
    return { success: false, error: scopeError }
  }

  const db: any = createServerClient()

  const { data: existing } = await db
    .from('workflow_notes')
    .select('id')
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) {
    return { success: false, error: 'Note not found' }
  }

  const { error } = await db
    .from('workflow_notes')
    .update({
      ownership_scope: validated.ownership_scope,
      client_id: validated.client_id ?? null,
      event_id: validated.event_id ?? null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[assignWorkflowNoteContext] Error:', error)
    return { success: false, error: 'Failed to update note context' }
  }

  revalidatePath('/menus')

  return { success: true }
}

// ============================================================
// LINK / UNLINK NOTE TO MENU
// ============================================================

export async function linkWorkflowNoteToMenu(input: {
  noteId: string
  menuId?: string
  draftMenuKey?: string
}) {
  const user = await requireChef()
  const validated = LinkNoteToMenuSchema.parse(input)

  if (!validated.menuId && !validated.draftMenuKey) {
    return { success: false, error: 'Either menuId or draftMenuKey is required' }
  }

  const db: any = createServerClient()

  // Verify note belongs to tenant
  const { data: note } = await db
    .from('workflow_notes')
    .select('id')
    .eq('id', validated.noteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!note) {
    return { success: false, error: 'Note not found' }
  }

  // Verify menu belongs to tenant if menuId is provided
  if (validated.menuId) {
    const { data: menu } = await db
      .from('menus')
      .select('id')
      .eq('id', validated.menuId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!menu) {
      return { success: false, error: 'Menu not found' }
    }
  }

  const { error } = await db.from('workflow_note_menu_links').upsert(
    {
      tenant_id: user.tenantId!,
      note_id: validated.noteId,
      menu_id: validated.menuId ?? null,
      draft_menu_key: validated.draftMenuKey ?? null,
      linked_by: user.id,
    },
    {
      onConflict: validated.menuId ? 'note_id,menu_id' : 'note_id,draft_menu_key',
      ignoreDuplicates: true,
    }
  )

  if (error) {
    console.error('[linkWorkflowNoteToMenu] Error:', error)
    return { success: false, error: 'Failed to link note to menu' }
  }

  if (validated.menuId) {
    revalidatePath(`/menus/${validated.menuId}`)
  }

  return { success: true }
}

export async function unlinkWorkflowNoteFromMenu(input: { noteId: string; menuId: string }) {
  const user = await requireChef()
  const validated = UnlinkNoteFromMenuSchema.parse(input)

  const db: any = createServerClient()

  // Verify note belongs to tenant
  const { data: note } = await db
    .from('workflow_notes')
    .select('id')
    .eq('id', validated.noteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!note) {
    return { success: false, error: 'Note not found' }
  }

  const { error } = await db
    .from('workflow_note_menu_links')
    .delete()
    .eq('note_id', validated.noteId)
    .eq('menu_id', validated.menuId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[unlinkWorkflowNoteFromMenu] Error:', error)
    return { success: false, error: 'Failed to unlink note from menu' }
  }

  revalidatePath(`/menus/${validated.menuId}`)

  return { success: true }
}

// ============================================================
// PROMOTE NOTE TO DISH
// ============================================================

export async function promoteWorkflowNoteToDish(input: {
  noteId: string
  name: string
  course: string
  description?: string
  ownership_scope?: 'global' | 'client' | 'event'
  client_id?: string
  event_id?: string
  attachMenuId?: string
  attachMode?: 'reference' | 'copy'
}) {
  const user = await requireChef()
  const validated = PromoteNoteSchema.parse(input)

  const db: any = createServerClient()

  // Verify note belongs to tenant
  const { data: note } = await db
    .from('workflow_notes')
    .select('id, body, title')
    .eq('id', validated.noteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!note) {
    return { success: false, error: 'Note not found' }
  }

  const scope = validated.ownership_scope ?? 'global'

  // Create or update canonical dish in dish_index
  const { data: dish, error: dishError } = await db
    .from('dish_index')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      course: validated.course,
      description: validated.description ?? note.body,
      ownership_scope: scope,
      client_id: validated.client_id ?? null,
      event_id: validated.event_id ?? null,
    })
    .select()
    .single()

  if (dishError || !dish) {
    console.error('[promoteWorkflowNoteToDish] dish_index insert error:', dishError)
    return { success: false, error: 'Failed to create canonical dish' }
  }

  // Create lineage link - preserves the original note
  const { error: linkError } = await db.from('dish_index_note_links').insert({
    tenant_id: user.tenantId!,
    dish_id: dish.id,
    note_id: validated.noteId,
    relation: 'promoted',
    created_by: user.id,
  })

  if (linkError) {
    console.error('[promoteWorkflowNoteToDish] lineage link error:', linkError)
    // Non-blocking: dish was created, lineage failed. Log and continue.
  }

  // Mark the note as promoted
  await db
    .from('workflow_notes')
    .update({
      status: 'promoted',
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', validated.noteId)
    .eq('tenant_id', user.tenantId!)

  let menuDishId: string | null = null

  // Optionally add to a menu immediately
  if (validated.attachMenuId && validated.attachMode) {
    const { addCanonicalDishToMenu } = await import('@/lib/menus/dish-source-actions')
    const result = await addCanonicalDishToMenu({
      menuId: validated.attachMenuId,
      dishId: dish.id,
      mode: validated.attachMode,
    })
    if (result.success && result.menuDishId) {
      menuDishId = result.menuDishId
    }
  }

  revalidatePath('/menus')
  revalidatePath('/culinary/dish-index')

  return { success: true, dishId: dish.id, menuDishId }
}

// ============================================================
// LIST / QUERY HELPERS
// ============================================================

export async function getWorkflowNotes(filters?: {
  ownership_scope?: 'global' | 'client' | 'event'
  client_id?: string
  event_id?: string
  menu_id?: string
  status?: 'open' | 'promoted' | 'archived'
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('workflow_notes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.ownership_scope) {
    query = query.eq('ownership_scope', filters.ownership_scope)
  }
  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id)
  }
  if (filters?.event_id) {
    query = query.eq('event_id', filters.event_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getWorkflowNotes] Error:', error)
    return { success: false, error: 'Failed to load notes', notes: [] }
  }

  // If filtering by menu_id, intersect with link table
  if (filters?.menu_id && data) {
    const { data: links } = await db
      .from('workflow_note_menu_links')
      .select('note_id')
      .eq('menu_id', filters.menu_id)
      .eq('tenant_id', user.tenantId!)

    const linkedNoteIds = new Set((links ?? []).map((l: any) => l.note_id))
    const filteredNotes = data.filter((n: any) => linkedNoteIds.has(n.id))
    return { success: true, notes: filteredNotes }
  }

  return { success: true, notes: data ?? [] }
}

/**
 * Resolve draft-keyed note links to a real menu after creation.
 * Called inside createMenuWithCourses to move draft links onto the real menu.
 */
export async function resolveDraftNoteLinks(draftMenuKey: string, menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('workflow_note_menu_links')
    .update({
      menu_id: menuId,
      draft_menu_key: null,
    })
    .eq('draft_menu_key', draftMenuKey)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[resolveDraftNoteLinks] Error:', error)
    // Non-blocking: draft links stay recoverable by key if this fails
  }

  return { success: !error }
}
