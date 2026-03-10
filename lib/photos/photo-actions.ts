'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Types

export type EntityType =
  | 'event'
  | 'recipe'
  | 'equipment'
  | 'bakery_order'
  | 'compliance'
  | 'station'
  | 'vendor'
  | 'menu'
  | 'staff'
  | 'general'

export type PhotoTag = 'plating' | 'setup' | 'damage' | 'inspection' | 'design' | 'before' | 'after'

export type EntityPhoto = {
  id: string
  tenant_id: string
  entity_type: EntityType
  entity_id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  tags: string[] | null
  sort_order: number
  uploaded_by: string | null
  created_at: string
}

// Actions

export async function addPhoto(
  entityType: EntityType,
  entityId: string,
  url: string,
  caption?: string,
  tags?: string[]
): Promise<{ success: boolean; error?: string; photo?: EntityPhoto }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('entity_photos')
    .insert({
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: entityId,
      url,
      caption: caption || null,
      tags: tags || null,
      uploaded_by: user.userId,
    })
    .select()
    .single()

  if (error) {
    console.error('[photo] addPhoto failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/photos`)
  return { success: true, photo: data as EntityPhoto }
}

export async function updatePhoto(
  id: string,
  updates: { caption?: string; tags?: string[] }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('entity_photos')
    .update({
      caption: updates.caption ?? undefined,
      tags: updates.tags ?? undefined,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[photo] updatePhoto failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/photos`)
  return { success: true }
}

export async function deletePhoto(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('entity_photos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[photo] deletePhoto failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/photos`)
  return { success: true }
}

export async function getPhotosForEntity(
  entityType: EntityType,
  entityId: string
): Promise<{ photos: EntityPhoto[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('entity_photos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[photo] getPhotosForEntity failed:', error)
    return { photos: [], error: error.message }
  }

  return { photos: (data || []) as EntityPhoto[] }
}

export async function getRecentPhotos(
  limit: number = 20
): Promise<{ photos: EntityPhoto[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('entity_photos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[photo] getRecentPhotos failed:', error)
    return { photos: [], error: error.message }
  }

  return { photos: (data || []) as EntityPhoto[] }
}

export async function getPhotosByTag(
  tag: string
): Promise<{ photos: EntityPhoto[]; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('entity_photos')
    .select('*')
    .eq('tenant_id', tenantId)
    .contains('tags', [tag])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[photo] getPhotosByTag failed:', error)
    return { photos: [], error: error.message }
  }

  return { photos: (data || []) as EntityPhoto[] }
}

export async function reorderPhotos(
  entityType: EntityType,
  entityId: string,
  photoIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase = await createServerClient()

  // Update sort_order for each photo based on position in array
  const updates = photoIds.map((id, index) =>
    supabase
      .from('entity_photos')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)

  if (failed?.error) {
    console.error('[photo] reorderPhotos failed:', failed.error)
    return { success: false, error: failed.error.message }
  }

  revalidatePath(`/photos`)
  return { success: true }
}
