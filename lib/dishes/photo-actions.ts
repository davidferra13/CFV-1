'use server'

// Dish & Recipe Photo Actions
// Upload or remove a single hero photo for a recipe (canonical) or a dish (per-event plating).
// Both use the public dish-photos bucket — permanent URLs stored directly in the DB.
// No signed URLs needed since these are portfolio/showcase images.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = 'dish-photos'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const

// Extension derived from MIME type only — never from filename (security)
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the storage object path from a public bucket URL.
 * Used to delete old files before uploading a replacement.
 */
function extractStoragePath(publicUrl: string | null): string | null {
  if (!publicUrl) return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(
    publicUrl
      .slice(idx + marker.length)
      .split('?')[0]
      .split('#')[0]
  )
}

function validateFile(file: File | null): string | null {
  if (!file || file.size === 0) return 'No file provided'
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Invalid file type. Accepted: JPEG, PNG, HEIC, WebP'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB`
  }
  return null
}

// ─── uploadRecipePhoto ────────────────────────────────────────────────────────

/**
 * Upload (or replace) the canonical photo for a recipe.
 * formData key: 'photo' (File, required)
 *
 * Storage path: {tenantId}/recipes/{recipeId}.{ext}
 * Updates: recipes.photo_url
 */
export async function uploadRecipePhoto(
  recipeId: string,
  formData: FormData
): Promise<{ success: true; photoUrl: string } | { success: false; error: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, photo_url')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) return { success: false, error: 'Recipe not found' }

  const file = formData.get('photo') as File | null
  const validationError = validateFile(file)
  if (validationError) return { success: false, error: validationError }

  const ext = MIME_TO_EXT[file!.type]
  const storagePath = `${user.tenantId}/recipes/${recipeId}.${ext}`

  // Remove old file if it has a different path (e.g. extension changed)
  const oldPath = extractStoragePath(recipe.photo_url)
  if (oldPath && oldPath !== storagePath) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }

  // Upload (upsert handles same-extension replacement)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file!, { contentType: file!.type, upsert: true })

  if (uploadError) {
    console.error('[uploadRecipePhoto] Storage upload failed:', uploadError)
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  const { error: updateError } = await supabase
    .from('recipes')
    .update({ photo_url: publicUrl })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[uploadRecipePhoto] DB update failed:', updateError)
    return { success: false, error: 'Failed to save photo' }
  }

  revalidatePath(`/recipes/${recipeId}`)
  revalidatePath('/recipes')
  return { success: true, photoUrl: publicUrl }
}

// ─── removeRecipePhoto ────────────────────────────────────────────────────────

export async function removeRecipePhoto(
  recipeId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, photo_url')
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!recipe) return { success: false, error: 'Recipe not found' }

  const oldPath = extractStoragePath(recipe.photo_url)
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }

  await supabase
    .from('recipes')
    .update({ photo_url: null })
    .eq('id', recipeId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/recipes/${recipeId}`)
  revalidatePath('/recipes')
  return { success: true }
}

// ─── uploadDishPhoto ──────────────────────────────────────────────────────────

/**
 * Upload (or replace) the plating photo for a specific dish on a menu.
 * formData key: 'photo' (File, required)
 *
 * Storage path: {tenantId}/dishes/{dishId}.{ext}
 * Updates: dishes.photo_url
 */
export async function uploadDishPhoto(
  dishId: string,
  formData: FormData
): Promise<{ success: true; photoUrl: string } | { success: false; error: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: dish } = await supabase
    .from('dishes')
    .select('id, photo_url')
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) return { success: false, error: 'Dish not found' }

  const file = formData.get('photo') as File | null
  const validationError = validateFile(file)
  if (validationError) return { success: false, error: validationError }

  const ext = MIME_TO_EXT[file!.type]
  const storagePath = `${user.tenantId}/dishes/${dishId}.${ext}`

  const oldPath = extractStoragePath(dish.photo_url)
  if (oldPath && oldPath !== storagePath) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file!, { contentType: file!.type, upsert: true })

  if (uploadError) {
    console.error('[uploadDishPhoto] Storage upload failed:', uploadError)
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  const { error: updateError } = await supabase
    .from('dishes')
    .update({ photo_url: publicUrl })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[uploadDishPhoto] DB update failed:', updateError)
    return { success: false, error: 'Failed to save photo' }
  }

  revalidatePath('/menus')
  return { success: true, photoUrl: publicUrl }
}

// ─── removeDishPhoto ──────────────────────────────────────────────────────────

export async function removeDishPhoto(
  dishId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: dish } = await supabase
    .from('dishes')
    .select('id, photo_url')
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!dish) return { success: false, error: 'Dish not found' }

  const oldPath = extractStoragePath((dish as any).photo_url)
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath])
  }

  await supabase
    .from('dishes')
    .update({ photo_url: null })
    .eq('id', dishId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/menus')
  return { success: true }
}
