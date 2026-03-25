// Profile Highlight Actions
// CRUD for chef profile highlight sections (events, behind-the-scenes, testimonials, press).
// Uses profile_highlights table (chef_id FK, new table).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type HighlightCategory = 'events' | 'behind_scenes' | 'testimonials' | 'press'

export type ProfileHighlight = {
  id: string
  chefId: string
  title: string
  category: HighlightCategory
  items: any[]
  displayOrder: number
  createdAt: string
}

// --- Zod Schemas ---

const HighlightCategoryEnum = z.enum(['events', 'behind_scenes', 'testimonials', 'press'])

const CreateHighlightSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  category: HighlightCategoryEnum,
  items: z.array(z.any()).optional(),
})

const UpdateHighlightSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: HighlightCategoryEnum.optional(),
  items: z.array(z.any()).optional(),
})

const DeleteHighlightSchema = z.object({
  id: z.string().uuid(),
})

export type CreateHighlightInput = z.infer<typeof CreateHighlightSchema>
export type UpdateHighlightInput = z.infer<typeof UpdateHighlightSchema>

// --- Actions ---

/**
 * Create a new profile highlight section.
 * Sets display_order to max+1.
 */
export async function createHighlight(
  input: CreateHighlightInput
): Promise<{ success: boolean; highlight: ProfileHighlight }> {
  const validated = CreateHighlightSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  // Get current max display_order
  const { data: existing } = await db
    .from('profile_highlights')
    .select('display_order')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0

  const { data: highlight, error } = await db
    .from('profile_highlights')
    .insert({
      chef_id: user.tenantId!,
      title: validated.title,
      category: validated.category,
      items: validated.items ?? [],
      display_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('[createHighlight] Error:', error)
    throw new Error('Failed to create highlight')
  }

  revalidatePath('/portfolio')
  revalidatePath('/settings')

  return {
    success: true,
    highlight: mapHighlight(highlight),
  }
}

/**
 * Partially update a highlight by ID (with chef_id ownership check).
 * Only provided fields are updated.
 */
export async function updateHighlight(
  id: string,
  updates: UpdateHighlightInput
): Promise<{ success: boolean; highlight: ProfileHighlight }> {
  const validated = UpdateHighlightSchema.parse(updates)
  const user = await requireChef()
  const db: any = createServerClient()

  // Build the update payload from only provided fields
  const updatePayload: Record<string, any> = {}
  if (validated.title !== undefined) updatePayload.title = validated.title
  if (validated.category !== undefined) updatePayload.category = validated.category
  if (validated.items !== undefined) updatePayload.items = validated.items

  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No fields to update')
  }

  const { data: highlight, error } = await db
    .from('profile_highlights')
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateHighlight] Error:', error)
    throw new Error('Failed to update highlight')
  }

  revalidatePath('/portfolio')
  revalidatePath('/settings')

  return {
    success: true,
    highlight: mapHighlight(highlight),
  }
}

/**
 * Delete a highlight by ID (with chef_id ownership check).
 */
export async function deleteHighlight(id: string): Promise<{ success: boolean }> {
  const validated = DeleteHighlightSchema.parse({ id })
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('profile_highlights')
    .delete()
    .eq('id', validated.id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteHighlight] Error:', error)
    throw new Error('Failed to delete highlight')
  }

  revalidatePath('/portfolio')
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Get all highlights ordered by display_order.
 */
export async function getHighlights(): Promise<ProfileHighlight[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: highlights, error } = await db
    .from('profile_highlights')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getHighlights] Error:', error)
    return []
  }

  return (highlights || []).map(mapHighlight)
}

// --- Aliases for backward-compatible component imports ---

export async function addHighlight(input: CreateHighlightInput) {
  return createHighlight(input)
}

export async function removeHighlight(id: string) {
  return deleteHighlight(id)
}

export async function reorderHighlights(
  ordered: { id: string; displayOrder: number }[]
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  await Promise.all(
    ordered.map(({ id, displayOrder }) =>
      db
        .from('profile_highlights')
        .update({ display_order: displayOrder })
        .eq('id', id)
        .eq('chef_id', user.tenantId!)
    )
  )

  revalidatePath('/portfolio')
  return { success: true }
}

// --- Helpers ---

function mapHighlight(row: any): ProfileHighlight {
  return {
    id: row.id,
    chefId: row.chef_id,
    title: row.title,
    category: row.category,
    items: row.items ?? [],
    displayOrder: row.display_order,
    createdAt: row.created_at,
  }
}
