// Favorite Chefs Actions
// CRUD for the chef's list of culinary heroes, mentors, and inspiring chefs.
// Mirrors profile_highlights pattern.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { FavoriteChef, CreateFavoriteChefInput, UpdateFavoriteChefInput } from './types'

// --- Zod Schemas ---

const CreateSchema = z.object({
  chefName: z.string().min(1, 'Name is required').max(200),
  reason: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
})

const UpdateSchema = z.object({
  chefName: z.string().min(1).max(200).optional(),
  reason: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  websiteUrl: z.string().url().optional().or(z.literal('')).nullable(),
})

// --- Actions ---

export async function getFavoriteChefs(): Promise<FavoriteChef[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('favorite_chefs')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getFavoriteChefs] Error:', error)
    return []
  }

  return (data || []).map(mapRow)
}

export async function createFavoriteChef(
  input: CreateFavoriteChefInput
): Promise<{ success: boolean; chef: FavoriteChef }> {
  const validated = CreateSchema.parse(input)
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get next sort_order
  const { data: existing } = await supabase
    .from('favorite_chefs')
    .select('sort_order')
    .eq('chef_id', user.tenantId!)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0

  const { data: row, error } = await supabase
    .from('favorite_chefs')
    .insert({
      chef_id: user.tenantId!,
      chef_name: validated.chefName,
      reason: validated.reason || null,
      image_url: validated.imageUrl || null,
      website_url: validated.websiteUrl || null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('[createFavoriteChef] Error:', error)
    throw new Error('Failed to add favorite chef')
  }

  revalidatePath('/settings/favorite-chefs')

  return { success: true, chef: mapRow(row) }
}

export async function updateFavoriteChef(
  id: string,
  updates: UpdateFavoriteChefInput
): Promise<{ success: boolean; chef: FavoriteChef }> {
  const validated = UpdateSchema.parse(updates)
  const user = await requireChef()
  const supabase: any = createServerClient()

  const payload: Record<string, unknown> = {}
  if (validated.chefName !== undefined) payload.chef_name = validated.chefName
  if (validated.reason !== undefined) payload.reason = validated.reason || null
  if (validated.imageUrl !== undefined) payload.image_url = validated.imageUrl || null
  if (validated.websiteUrl !== undefined) payload.website_url = validated.websiteUrl || null

  if (Object.keys(payload).length === 0) {
    throw new Error('No fields to update')
  }

  const { data: row, error } = await supabase
    .from('favorite_chefs')
    .update(payload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateFavoriteChef] Error:', error)
    throw new Error('Failed to update favorite chef')
  }

  revalidatePath('/settings/favorite-chefs')

  return { success: true, chef: mapRow(row) }
}

export async function deleteFavoriteChef(id: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('favorite_chefs')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteFavoriteChef] Error:', error)
    throw new Error('Failed to remove favorite chef')
  }

  revalidatePath('/settings/favorite-chefs')

  return { success: true }
}

export async function reorderFavoriteChefs(
  ordered: { id: string; sortOrder: number }[]
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  await Promise.all(
    ordered.map(({ id, sortOrder }) =>
      supabase
        .from('favorite_chefs')
        .update({ sort_order: sortOrder })
        .eq('id', id)
        .eq('chef_id', user.tenantId!)
    )
  )

  revalidatePath('/settings/favorite-chefs')
  return { success: true }
}

export async function generateSocialText(): Promise<string> {
  const chefs = await getFavoriteChefs()

  if (chefs.length === 0) {
    return "I haven't added my culinary heroes yet — stay tuned!"
  }

  const lines = chefs.map((c, i) => {
    const reason = c.reason ? ` — ${c.reason}` : ''
    return `${i + 1}. ${c.chefName}${reason}`
  })

  return [
    'My culinary heroes who inspire everything I create:\n',
    ...lines,
    '\nWho are YOUR culinary heroes? Drop them below! 👇',
    '\n#ChefLife #CulinaryInspiration #FavoriteChefs #ChefFlow',
  ].join('\n')
}

// --- Helpers ---

function mapRow(row: Record<string, unknown>): FavoriteChef {
  return {
    id: row.id as string,
    chefId: row.chef_id as string,
    chefName: row.chef_name as string,
    reason: row.reason as string | null,
    imageUrl: row.image_url as string | null,
    websiteUrl: row.website_url as string | null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  }
}
