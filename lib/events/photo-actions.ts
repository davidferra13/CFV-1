'use server'

// Event Photo Actions
// Upload, retrieve, delete, caption, and reorder photos for a specific event.
// Chef: full CRUD. Client: read-only for their own events.

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { compressImageBuffer } from '@/lib/images/resmush'

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = 'event-photos'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_PHOTOS_PER_EVENT = 50
const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour

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

// ─── Type ─────────────────────────────────────────────────────────────────────

export type EventPhoto = {
  id: string
  event_id: string
  tenant_id: string
  storage_path: string
  filename_original: string
  content_type: string
  size_bytes: number
  caption: string | null
  display_order: number
  uploaded_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Populated on-demand, never stored in DB
  signedUrl: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hydrateSignedUrls(
  supabase: any,
  photos: Omit<EventPhoto, 'signedUrl'>[]
): Promise<EventPhoto[]> {
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

// ─── uploadEventPhoto ─────────────────────────────────────────────────────────

/**
 * Chef uploads a single photo for an event.
 * formData keys:
 *   'photo'   — File (required)
 *   'caption' — string (optional)
 */
export async function uploadEventPhoto(
  eventId: string,
  formData: FormData
): Promise<{ success: true; photo: EventPhoto } | { success: false; error: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify the event belongs to this chef's tenant
  const { data: event } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, occasion, event_date')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  // Enforce per-event photo cap
  const { count } = await supabase
    .from('event_photos')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)

  if ((count ?? 0) >= MAX_PHOTOS_PER_EVENT) {
    return { success: false, error: `Maximum ${MAX_PHOTOS_PER_EVENT} photos per event reached` }
  }

  // Validate file
  const file = formData.get('photo') as File | null
  const caption = ((formData.get('caption') as string | null) ?? '').trim() || null

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

  // Generate IDs and derive storage path
  const photoId = crypto.randomUUID()
  const ext = MIME_TO_EXT[file.type]
  const storagePath = `${user.tenantId}/${eventId}/${photoId}.${ext}`

  // Attempt image compression via reSmush.it (non-blocking — fallback to original)
  let uploadBody: File | Blob = file
  let uploadContentType = file.type
  let uploadSize = file.size
  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const compressed = await compressImageBuffer(fileBuffer, file.name)
    if (compressed.success && compressed.compressedUrl) {
      const compressedRes = await fetch(compressed.compressedUrl)
      if (compressedRes.ok) {
        const compressedBuf = await compressedRes.arrayBuffer()
        uploadBody = new Blob([compressedBuf], { type: file.type })
        uploadSize = compressedBuf.byteLength
        console.log(
          `[uploadEventPhoto] Compressed ${file.name}: ${compressed.originalSize} → ${compressed.compressedSize} (${compressed.savedPercent}% saved)`
        )
      }
    }
  } catch (compressionErr) {
    console.warn(
      '[uploadEventPhoto] Compression failed (non-blocking), using original:',
      compressionErr
    )
  }

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, uploadBody, {
      contentType: uploadContentType,
      upsert: false,
    })

  if (uploadError) {
    console.error('[uploadEventPhoto] Storage upload failed:', uploadError)
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Determine display_order — append after the last active photo
  const { data: lastPhoto } = await supabase
    .from('event_photos')
    .select('display_order')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const displayOrder = lastPhoto ? lastPhoto.display_order + 1 : 0

  // Insert DB record (use the same UUID as the storage path segment)
  const { data: inserted, error: insertError } = await supabase
    .from('event_photos')
    .insert({
      id: photoId,
      tenant_id: user.tenantId!,
      event_id: eventId,
      storage_path: storagePath,
      filename_original: file.name,
      content_type: uploadContentType,
      size_bytes: uploadSize,
      caption,
      display_order: displayOrder,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (insertError || !inserted) {
    // Clean up orphaned storage object
    await supabase.storage.from(BUCKET).remove([storagePath])
    console.error('[uploadEventPhoto] DB insert failed:', insertError)
    return { success: false, error: 'Failed to save photo record' }
  }

  // Generate a fresh signed URL for immediate display
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)

  // Notify client that photos are ready (non-blocking)
  // In-app notification fires on every upload; email only on the first photo.
  if (event.client_id) {
    const isFirstPhoto = displayOrder === 0
    try {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: event.client_id,
        category: 'event',
        action: 'photos_ready',
        title: 'Your event photos are ready',
        body: `${isFirstPhoto ? 'Photos from your event are now available' : 'New photos added to your event'}`,
        actionUrl: `/my-events/${eventId}`,
        eventId,
      })
    } catch {
      // Non-fatal
    }

    // Circle-first: post photos notification on first photo (non-blocking)
    if (isFirstPhoto) {
      try {
        const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
        await circleFirstNotify({
          eventId,
          tenantId: user.tenantId!,
          notificationType: 'photos_ready',
          body: 'Photos from your event are now available! Check them out.',
          metadata: { event_id: eventId, photo_count: 1 },
          actionUrl: `/my-events/${eventId}`,
          actionLabel: 'View Photos',
        })
      } catch {
        // Non-fatal
      }
    }
  }

  return {
    success: true,
    photo: { ...inserted, signedUrl: signed?.signedUrl ?? '' },
  }
}

// ─── getEventPhotosForChef ────────────────────────────────────────────────────

/**
 * Returns all active photos for an event with fresh signed URLs.
 * Called from the chef's event detail page.
 */
export async function getEventPhotosForChef(eventId: string): Promise<EventPhoto[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: photos, error } = await supabase
    .from('event_photos')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getEventPhotosForChef] Error:', error)
    return []
  }

  if (!photos?.length) return []

  return hydrateSignedUrls(supabase, photos)
}

// ─── getEventPhotosForClient ──────────────────────────────────────────────────

/**
 * Returns all active photos for an event with fresh signed URLs.
 * Called from the client's event portal page.
 * Verifies client owns this event before fetching.
 */
export async function getEventPhotosForClient(eventId: string): Promise<EventPhoto[]> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Verify client owns this event and get the tenant_id
  const { data: ev } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!ev) return []

  const { data: photos, error } = await supabase
    .from('event_photos')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', ev.tenant_id)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })

  if (error || !photos?.length) return []

  return hydrateSignedUrls(supabase, photos)
}

// ─── deleteEventPhoto ─────────────────────────────────────────────────────────

/**
 * Chef only. Soft-deletes the DB record and removes the storage object.
 * Storage removal is non-fatal — if it fails the record is still soft-deleted.
 */
export async function deleteEventPhoto(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: photo } = await supabase
    .from('event_photos')
    .select('storage_path, event_id, deleted_at')
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!photo) return { success: false, error: 'Photo not found' }
  if (photo.deleted_at) return { success: true } // Already deleted — idempotent

  // Soft-delete in DB first
  const { error: updateError } = await supabase
    .from('event_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[deleteEventPhoto] DB update failed:', updateError)
    return { success: false, error: 'Failed to delete photo' }
  }

  // Remove storage object (non-fatal)
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path])

  if (storageError) {
    console.warn('[deleteEventPhoto] Storage remove failed (non-fatal):', storageError)
  }

  revalidatePath(`/events/${photo.event_id}`)
  revalidatePath(`/my-events/${photo.event_id}`)

  return { success: true }
}

// ─── updatePhotoCaption ───────────────────────────────────────────────────────

/**
 * Chef only. Update the caption for a single photo.
 * Pass empty string to clear the caption.
 */
export async function updatePhotoCaption(
  photoId: string,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: photo, error } = await supabase
    .from('event_photos')
    .update({ caption: caption.trim() || null })
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .select('event_id')
    .single()

  if (error || !photo) {
    console.error('[updatePhotoCaption] Error:', error)
    return { success: false, error: 'Failed to update caption' }
  }

  revalidatePath(`/events/${photo.event_id}`)
  revalidatePath(`/my-events/${photo.event_id}`)
  return { success: true }
}

// ─── getPortfolioPhotos ──────────────────────────────────────────────────────

/**
 * Returns all active photos across all events for the chef's portfolio.
 * Includes event metadata (occasion, event_date) for filtering/grouping.
 * Ordered by created_at descending (newest first).
 */
export type PortfolioPhoto = EventPhoto & {
  event_occasion: string | null
  event_date: string | null
}

export async function getPortfolioPhotos(): Promise<PortfolioPhoto[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: photos, error } = await supabase
    .from('event_photos')
    .select('*, events(occasion, event_date)')
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPortfolioPhotos] Error:', error)
    return []
  }

  if (!photos?.length) return []

  // Flatten event join data
  const flattened = photos.map((p: any) => ({
    ...p,
    event_occasion: p.events?.occasion ?? null,
    event_date: p.events?.event_date ?? null,
    events: undefined,
  }))

  // Hydrate signed URLs
  const paths = flattened.map((p: any) => p.storage_path)
  const { data: signedData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS)

  const signedMap: Record<string, string> = {}
  for (const s of signedData ?? []) {
    if (s.signedUrl && s.path) signedMap[s.path] = s.signedUrl
  }

  return flattened.map((p: any) => ({
    ...p,
    signedUrl: signedMap[p.storage_path] ?? '',
  }))
}

// ─── getPhotoSignedUrl ───────────────────────────────────────────────────────

/**
 * Returns a signed URL for a single storage path.
 * Chef-only. Verifies tenant ownership.
 */
export async function getPhotoSignedUrl(
  storagePath: string
): Promise<{ url: string | null; error?: string }> {
  const user = await requireChef()

  // Verify the path belongs to this tenant (path format: {tenantId}/...)
  if (!storagePath.startsWith(`${user.tenantId}/`)) {
    return { url: null, error: 'Unauthorized' }
  }

  const supabase: any = createServerClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

  if (error) {
    console.error('[getPhotoSignedUrl] Error:', error)
    return { url: null, error: 'Failed to generate signed URL' }
  }

  return { url: data?.signedUrl ?? null }
}

// ─── reorderEventPhotos ───────────────────────────────────────────────────────

/**
 * Chef only. Reorder all active photos for an event.
 * Pass ALL active photo IDs for the event in the desired display order.
 * Assigns display_order 0..n-1 based on array position.
 */
export async function reorderEventPhotos(
  eventId: string,
  orderedPhotoIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify event belongs to this chef's tenant
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { success: false, error: 'Event not found' }

  // Update display_order for each photo in parallel
  const results = await Promise.all(
    orderedPhotoIds.map((id, index) =>
      supabase
        .from('event_photos')
        .update({ display_order: index })
        .eq('id', id)
        .eq('event_id', eventId)
        .eq('tenant_id', user.tenantId!)
        .is('deleted_at', null)
    )
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) {
    console.error('[reorderEventPhotos] Error:', failed.error)
    return { success: false, error: 'Failed to reorder photos' }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/my-events/${eventId}`)
  return { success: true }
}
