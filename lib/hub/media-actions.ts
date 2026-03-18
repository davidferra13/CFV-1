'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { HubMedia } from './types'

// ---------------------------------------------------------------------------
// Hub Media - Photo uploads and gallery
// ---------------------------------------------------------------------------

const UploadMediaSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  storagePath: z.string().min(1),
  filename: z.string().optional().nullable(),
  contentType: z.string().optional().nullable(),
  sizeBytes: z.number().optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
})

/**
 * Record a media upload in a hub group.
 * The actual file upload to Supabase Storage is handled client-side.
 */
export async function createHubMedia(input: z.infer<typeof UploadMediaSchema>): Promise<HubMedia> {
  const validated = UploadMediaSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify membership
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !membership.can_post) {
    throw new Error('No permission to upload media')
  }

  const { data, error } = await supabase
    .from('hub_media')
    .insert({
      group_id: validated.groupId,
      uploaded_by_profile_id: profile.id,
      storage_path: validated.storagePath,
      filename: validated.filename ?? null,
      content_type: validated.contentType ?? null,
      size_bytes: validated.sizeBytes ?? null,
      caption: validated.caption ?? null,
      event_id: validated.eventId ?? null,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to record media: ${error.message}`)
  return data as HubMedia
}

/**
 * Get all media for a hub group.
 */
export async function getGroupMedia(input: {
  groupId: string
  eventId?: string | null
  limit?: number
  offset?: number
}): Promise<HubMedia[]> {
  const supabase = createServerClient({ admin: true })

  let query = supabase
    .from('hub_media')
    .select('*, hub_guest_profiles!uploaded_by_profile_id(*)')
    .eq('group_id', input.groupId)
    .order('created_at', { ascending: false })

  if (input.eventId) {
    query = query.eq('event_id', input.eventId)
  }

  if (input.limit) {
    query = query.limit(input.limit)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to load media: ${error.message}`)

  return (data ?? []).map((m) => ({
    ...m,
    uploaded_by: m.hub_guest_profiles ?? undefined,
    hub_guest_profiles: undefined,
  })) as HubMedia[]
}

/**
 * Delete a media item. Only uploader or group admin.
 */
export async function deleteHubMedia(input: {
  mediaId: string
  profileToken: string
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: media } = await supabase
    .from('hub_media')
    .select('group_id, uploaded_by_profile_id, storage_path')
    .eq('id', input.mediaId)
    .single()

  if (!media) throw new Error('Media not found')

  const isUploader = media.uploaded_by_profile_id === profile.id
  if (!isUploader) {
    const { data: membership } = await supabase
      .from('hub_group_members')
      .select('role')
      .eq('group_id', media.group_id)
      .eq('profile_id', profile.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only the uploader or group admins can delete media')
    }
  }

  // Delete from storage
  try {
    await supabase.storage.from('hub-media').remove([media.storage_path])
  } catch {
    // Non-blocking - DB record deletion is more important
  }

  // Delete record
  await supabase.from('hub_media').delete().eq('id', input.mediaId)
}

/**
 * Get a signed URL for a media item.
 */
export async function getMediaUrl(storagePath: string): Promise<string> {
  const supabase = createServerClient({ admin: true })

  const { data } = await supabase.storage.from('hub-media').createSignedUrl(storagePath, 3600) // 1 hour

  return data?.signedUrl ?? ''
}
