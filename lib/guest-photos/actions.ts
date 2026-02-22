'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Public actions (no auth — guests uploading from share page)
// ---------------------------------------------------------------------------

/**
 * Upload a guest photo via the share page.
 * Public — no auth required. Uses admin client.
 * Photos are stored in Supabase storage bucket 'guest-photos'.
 */
export async function uploadGuestPhoto(formData: FormData) {
  const shareToken = formData.get('shareToken') as string
  const guestName = formData.get('guestName') as string
  const guestToken = formData.get('guestToken') as string | null
  const caption = formData.get('caption') as string | null
  const file = formData.get('photo') as File

  if (!shareToken || !guestName || !file) {
    throw new Error('Missing required fields')
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Photo must be under 10MB')
  }

  const supabase = createServerClient({ admin: true })

  // Resolve share token → event + tenant
  const { data: share } = await supabase
    .from('event_shares')
    .select('event_id, tenant_id')
    .eq('token', shareToken)
    .eq('is_active', true)
    .single()

  if (!share) {
    throw new Error('Invalid or expired share link')
  }

  // Rate limit: max 20 photos per guest per event
  const { data: existing } = await supabase
    .from('guest_photos')
    .select('id')
    .eq('event_id', share.event_id)
    .eq('guest_name', guestName.trim())

  if (existing && existing.length >= 20) {
    throw new Error('Photo limit reached (20 per guest per event)')
  }

  // Resolve guest ID if token provided
  let guestId: string | null = null
  if (guestToken) {
    const { data: guest } = await supabase
      .from('event_guests')
      .select('id')
      .eq('guest_token', guestToken)
      .eq('event_id', share.event_id)
      .single()
    if (guest) guestId = guest.id
  }

  // Upload to storage
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${share.tenant_id}/${share.event_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase.storage.from('guest-photos').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (uploadError) {
    console.error('[uploadGuestPhoto] Storage error:', uploadError)
    throw new Error('Failed to upload photo')
  }

  // Insert record
  const { error: insertError } = await supabase.from('guest_photos').insert({
    tenant_id: share.tenant_id,
    event_id: share.event_id,
    guest_id: guestId,
    guest_name: guestName.trim(),
    storage_path: path,
    caption: caption?.trim() || null,
    is_visible: true,
  })

  if (insertError) {
    console.error('[uploadGuestPhoto] Insert error:', insertError)
    // Clean up uploaded file
    await supabase.storage.from('guest-photos').remove([path])
    throw new Error('Failed to save photo record')
  }

  return { success: true }
}

/**
 * Get visible guest photos for an event (public — share page).
 */
export async function getEventGuestPhotos(shareToken: string) {
  const supabase = createServerClient({ admin: true })

  // Resolve share token → event
  const { data: share } = await supabase
    .from('event_shares')
    .select('event_id')
    .eq('token', shareToken)
    .eq('is_active', true)
    .single()

  if (!share) return []

  const { data, error } = await supabase
    .from('guest_photos')
    .select('id, guest_name, storage_path, caption, created_at')
    .eq('event_id', share.event_id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[getEventGuestPhotos] Query error:', error)
    return []
  }

  // Generate public URLs
  const photos = (data ?? []).map((photo: any) => {
    const { data: urlData } = supabase.storage.from('guest-photos').getPublicUrl(photo.storage_path)
    return {
      ...photo,
      url: urlData?.publicUrl || null,
    }
  })

  return photos
}

// ---------------------------------------------------------------------------
// Chef actions (auth required)
// ---------------------------------------------------------------------------

/**
 * Get ALL guest photos for an event (including hidden). Chef only.
 */
export async function getGuestPhotosForChef(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_photos')
    .select('id, guest_name, storage_path, caption, is_visible, guest_id, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getGuestPhotosForChef] Query error:', error)
    return []
  }

  // Generate public URLs
  const photos = (data ?? []).map((photo: any) => {
    const { data: urlData } = supabase.storage.from('guest-photos').getPublicUrl(photo.storage_path)
    return {
      ...photo,
      url: urlData?.publicUrl || null,
    }
  })

  return photos
}

/**
 * Toggle guest photo visibility. Chef only.
 */
export async function toggleGuestPhotoVisibility(photoId: string, visible: boolean) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('guest_photos')
    .update({ is_visible: visible })
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleGuestPhotoVisibility] Error:', error)
    throw new Error('Failed to update photo visibility')
  }
}

/**
 * Delete a guest photo. Chef only.
 */
export async function deleteGuestPhoto(photoId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Get storage path first
  const { data: photo } = await supabase
    .from('guest_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!photo) throw new Error('Photo not found')

  // Delete from storage
  await supabase.storage.from('guest-photos').remove([photo.storage_path])

  // Delete record
  const { error } = await supabase
    .from('guest_photos')
    .delete()
    .eq('id', photoId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteGuestPhoto] Error:', error)
    throw new Error('Failed to delete photo')
  }
}
