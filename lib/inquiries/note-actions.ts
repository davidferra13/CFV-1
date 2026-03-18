// Inquiry Notes Server Actions
// CRUD for rich chef notes on inquiries - categories, pins, image attachments, recipe links

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type InquiryNoteCategory =
  | 'general'
  | 'inspiration'
  | 'menu_planning'
  | 'sourcing'
  | 'logistics'
  | 'staffing'
  | 'post_event'

export interface InquiryNote {
  id: string
  tenant_id: string
  inquiry_id: string
  note_text: string
  category: InquiryNoteCategory
  pinned: boolean
  attachment_url: string | null
  attachment_filename: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface InquiryRecipeLink {
  id: string
  tenant_id: string
  inquiry_id: string
  recipe_id: string
  note: string | null
  created_at: string
  recipe: {
    id: string
    name: string
    category: string
    description: string | null
    photo_url: string | null
  }
}

// ============================================
// VALIDATION
// ============================================

const NOTE_CATEGORIES = [
  'general',
  'inspiration',
  'menu_planning',
  'sourcing',
  'logistics',
  'staffing',
  'post_event',
] as const

const AddNoteSchema = z.object({
  inquiry_id: z.string().uuid(),
  note_text: z.string().min(1).max(5000),
  category: z.enum(NOTE_CATEGORIES).default('general'),
  pinned: z.boolean().optional(),
  attachment_url: z.string().url().nullable().optional(),
  attachment_filename: z.string().nullable().optional(),
})

const UpdateNoteSchema = z.object({
  note_text: z.string().min(1).max(5000).optional(),
  category: z.enum(NOTE_CATEGORIES).optional(),
  attachment_url: z.string().url().nullable().optional(),
  attachment_filename: z.string().nullable().optional(),
})

const LinkRecipeSchema = z.object({
  inquiry_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  note: z.string().max(500).nullable().optional(),
})

// ============================================
// NOTE ACTIONS
// ============================================

/**
 * Add a note to an inquiry.
 */
export async function addInquiryNote(input: z.infer<typeof AddNoteSchema>) {
  const user = await requireChef()
  const validated = AddNoteSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('inquiry_notes')
    .insert({
      tenant_id: user.tenantId!,
      inquiry_id: validated.inquiry_id,
      note_text: validated.note_text,
      category: validated.category,
      pinned: validated.pinned ?? false,
      attachment_url: validated.attachment_url ?? null,
      attachment_filename: validated.attachment_filename ?? null,
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    console.error('[addInquiryNote] Error:', error)
    throw new Error('Failed to add note')
  }

  revalidatePath(`/inquiries/${validated.inquiry_id}`)

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    const preview =
      validated.note_text.length > 60 ? validated.note_text.slice(0, 60) + '…' : validated.note_text
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'inquiry_note_added' as any,
      domain: 'inquiries' as any,
      entityType: 'inquiry_note',
      entityId: data.id,
      summary: `Added ${validated.category} note: "${preview}"`,
      context: {
        category: validated.category,
        pinned: validated.pinned,
        hasAttachment: !!validated.attachment_url,
      },
    })
  } catch (err) {
    console.error('[addInquiryNote] Activity log failed (non-blocking):', err)
  }

  return { success: true as const, note: data as InquiryNote }
}

/**
 * Update a note's text, category, or attachment.
 */
export async function updateInquiryNote(noteId: string, input: z.infer<typeof UpdateNoteSchema>) {
  const user = await requireChef()
  const validated = UpdateNoteSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('inquiry_notes')
    .update(validated)
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateInquiryNote] Error:', error)
    throw new Error('Failed to update note')
  }

  return { success: true as const, note: data as InquiryNote }
}

/**
 * Delete a note.
 */
export async function deleteInquiryNote(noteId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('inquiry_notes')
    .delete()
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteInquiryNote] Error:', error)
    throw new Error('Failed to delete note')
  }

  return { success: true as const }
}

/**
 * Toggle pin status of a note.
 */
export async function toggleInquiryNotePinned(noteId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: existing, error: fetchError } = await supabase
    .from('inquiry_notes')
    .select('pinned')
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Note not found')
  }

  const { error } = await supabase
    .from('inquiry_notes')
    .update({ pinned: !existing.pinned })
    .eq('id', noteId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleInquiryNotePinned] Error:', error)
    throw new Error('Failed to toggle pin')
  }

  return { success: true as const, pinned: !existing.pinned }
}

/**
 * Get all notes for an inquiry.
 * Returns pinned notes first, then by created_at desc.
 */
export async function getInquiryNotes(
  inquiryId: string,
  options?: {
    pinned_only?: boolean
    category?: InquiryNoteCategory
  }
): Promise<InquiryNote[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('inquiry_notes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiryId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.pinned_only) {
    query = query.eq('pinned', true)
  }
  if (options?.category) {
    query = query.eq('category', options.category)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getInquiryNotes] Error:', error)
    return []
  }

  return (data || []) as InquiryNote[]
}

// ============================================
// RECIPE SLIM LIST (for the linker picker)
// ============================================

export interface RecipeSlim {
  id: string
  name: string
  category: string
  description: string | null
  photo_url: string | null
}

/**
 * Fetch a slim list of the chef's active recipes for the inquiry recipe linker.
 * getRecipes() strips photo_url and description from its return shape,
 * so this action queries only the fields we need.
 */
export async function getRecipesForLinker(): Promise<RecipeSlim[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, category, description, photo_url')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getRecipesForLinker] Error:', error)
    return []
  }

  return (data || []) as RecipeSlim[]
}

// ============================================
// RECIPE LINK ACTIONS
// ============================================

/**
 * Link an existing ChefFlow recipe to an inquiry.
 */
export async function linkRecipeToInquiry(input: z.infer<typeof LinkRecipeSchema>) {
  const user = await requireChef()
  const validated = LinkRecipeSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('inquiry_recipe_links')
    .insert({
      tenant_id: user.tenantId!,
      inquiry_id: validated.inquiry_id,
      recipe_id: validated.recipe_id,
      note: validated.note ?? null,
    })
    .select()
    .single()

  if (error) {
    // Handle duplicate gracefully
    if (error.code === '23505') {
      throw new Error('This recipe is already linked to the inquiry')
    }
    console.error('[linkRecipeToInquiry] Error:', error)
    throw new Error('Failed to link recipe')
  }

  revalidatePath(`/inquiries/${validated.inquiry_id}`)

  return { success: true as const, link: data }
}

/**
 * Unlink a recipe from an inquiry.
 */
export async function unlinkRecipeFromInquiry(linkId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('inquiry_recipe_links')
    .delete()
    .eq('id', linkId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[unlinkRecipeFromInquiry] Error:', error)
    throw new Error('Failed to unlink recipe')
  }

  return { success: true as const }
}

/**
 * Get all recipes linked to an inquiry, with recipe details joined.
 */
export async function getLinkedRecipes(inquiryId: string): Promise<InquiryRecipeLink[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('inquiry_recipe_links')
    .select(
      `
      id,
      tenant_id,
      inquiry_id,
      recipe_id,
      note,
      created_at,
      recipe:recipes (
        id,
        name,
        category,
        description,
        photo_url
      )
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getLinkedRecipes] Error:', error)
    return []
  }

  return (data || []) as InquiryRecipeLink[]
}
