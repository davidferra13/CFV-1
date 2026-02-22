'use server'

// Client Photo Actions
// Upload, retrieve, delete, caption photos for a client's site documentation.
// Chef-only — clients cannot see these photos.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = 'client-photos'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_PHOTOS_PER_CLIENT = 30
const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

export const PHOTO_CATEGORIES = [
  { value: 'portrait', label: 'Client Portrait' },
  { value: 'house', label: 'House / Exterior' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'dining', label: 'Dining Area' },
  { value: 'outdoor', label: 'Outdoor / Patio' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other' },
] as const

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]['value']

// ─── Type ─────────────────────────────────────────────────────────────────────

export type ClientPhoto = {
  id: string
  client_id: string
  tenant_id: string
  storage_path: string
  filename_original: string
  content_type: string
  size_bytes: number
  caption: string | null
  category: string
  display_order: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  signedUrl: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hydrateSignedUrls(
  supabase: ReturnType<typeof createServerClient>,
  photos: Omit<ClientPhoto, 'signedUrl'>[]
): Promise<ClientPhoto[]> {
  if (photos.length === 0) return []

  const paths = photos.map((p) => p.storage_path)

  const { data: signedData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS)

  const signedMap: Record<string, string> = {}
  for (const s of signedData ?? []) {
    if (s.signedUrl && s.path) signedMap[s.path] = s.signedUrl
  }

  return photos.map((p) => ({
    ...p,
    signedUrl: signedMap[p.storage_path] ?? '',
  }))
}

// ─── uploadClientPhoto ────────────────────────────────────────────────────────

export async function uploadClientPhoto(
  clientId: string,
  formData: FormData
): Promise<{ success: true; photo: ClientPhoto } | { success: false; error: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify client belongs to this chef's tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Enforce per-client photo cap
  const { count } = await supabase
    .from('client_photos')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if ((count ?? 0) >= MAX_PHOTOS_PER_CLIENT) {
    return { success: false, error: `Maximum ${MAX_PHOTOS_PER_CLIENT} photos per client reached` }
  }

  // Validate file
  const file = formData.get('photo') as File | null
  const caption = ((formData.get('caption') as string | null) ?? '').trim() || null
  const category = ((formData.get('category') as string | null) ?? 'other').trim()

  if (!file || file.size === 0) {
    return { success: false, error: 'No file provided' }
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { success: false, error: 'Invalid file type. Accepted formats: JPEG, PNG, HEIC, WebP' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB`,
    }
  }

  // Generate ID and storage path
  const photoId = crypto.randomUUID()
  const ext = MIME_TO_EXT[file.type]
  const storagePath = `${user.tenantId}/${clientId}/${photoId}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })

  if (uploadError) {
    console.error('[uploadClientPhoto] Storage upload failed:', uploadError)
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Determine display_order
  const { data: lastPhoto } = await supabase
    .from('client_photos')
    .select('display_order')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const displayOrder = lastPhoto ? lastPhoto.display_order + 1 : 0

  // Insert DB record
  const { data: inserted, error: insertError } = await supabase
    .from('client_photos')
    .insert({
      id: photoId,
      tenant_id: user.tenantId!,
      client_id: clientId,
      storage_path: storagePath,
      filename_original: file.name,
      content_type: file.type,
      size_bytes: file.size,
      caption,
      category,
      display_order: displayOrder,
      uploaded_by: user.id,
    } as any)
    .select()
    .single()

  if (insertError || !inserted) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    console.error('[uploadClientPhoto] DB insert failed:', insertError)
    return { success: false, error: 'Failed to save photo record' }
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

  revalidatePath(`/clients/${clientId}`)

  return {
    success: true,
    photo: { ...inserted, signedUrl: signed?.signedUrl ?? '' } as ClientPhoto,
  }
}

// ─── getClientPhotos ──────────────────────────────────────────────────────────

export async function getClientPhotos(clientId: string): Promise<ClientPhoto[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: photos, error } = await supabase
    .from('client_photos')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getClientPhotos] Error:', error)
    return []
  }

  if (!photos?.length) return []

  return hydrateSignedUrls(supabase, photos as any)
}

// ─── deleteClientPhoto ────────────────────────────────────────────────────────

export async function deleteClientPhoto(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: photo } = await supabase
    .from('client_photos')
    .select('storage_path, client_id, deleted_at')
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!photo) return { success: false, error: 'Photo not found' }
  if (photo.deleted_at) return { success: true }

  const { error: updateError } = await supabase
    .from('client_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[deleteClientPhoto] DB update failed:', updateError)
    return { success: false, error: 'Failed to delete photo' }
  }

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path])

  if (storageError) {
    console.warn('[deleteClientPhoto] Storage remove failed (non-fatal):', storageError)
  }

  revalidatePath(`/clients/${photo.client_id}`)
  return { success: true }
}

// ─── updateClientPhotoCaption ─────────────────────────────────────────────────

export async function updateClientPhotoCaption(
  photoId: string,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: photo, error } = await supabase
    .from('client_photos')
    .update({ caption: caption.trim() || null })
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .select('client_id')
    .single()

  if (error || !photo) {
    console.error('[updateClientPhotoCaption] Error:', error)
    return { success: false, error: 'Failed to update caption' }
  }

  revalidatePath(`/clients/${photo.client_id}`)
  return { success: true }
}

// ─── updateClientPhotoCategory ────────────────────────────────────────────────

export async function updateClientPhotoCategory(
  photoId: string,
  category: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: photo, error } = await supabase
    .from('client_photos')
    .update({ category } as any)
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .select('client_id')
    .single()

  if (error || !photo) {
    console.error('[updateClientPhotoCategory] Error:', error)
    return { success: false, error: 'Failed to update category' }
  }

  revalidatePath(`/clients/${photo.client_id}`)
  return { success: true }
}
