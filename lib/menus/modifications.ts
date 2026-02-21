// Menu Modification Server Actions
// Track proposed vs actually served menu changes

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Schemas ---

const ModificationTypeEnum = z.enum(['substitution', 'addition', 'removal', 'method_change'])

const LogModificationSchema = z.object({
  event_id: z.string().uuid(),
  component_id: z.string().uuid().nullable().optional(),
  modification_type: ModificationTypeEnum,
  original_description: z.string().nullable().optional(),
  actual_description: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
})

export type LogModificationInput = z.infer<typeof LogModificationSchema>

// --- Actions ---

/**
 * Record a menu modification — what changed between proposed and served
 */
export async function logMenuModification(input: LogModificationInput) {
  const user = await requireChef()
  const validated = LogModificationSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('menu_modifications')
    .insert({
      ...validated,
      tenant_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[logMenuModification] Error:', error)
    throw new Error('Failed to log modification')
  }

  revalidatePath(`/events/${validated.event_id}`)
  return { success: true, modification: data }
}

/**
 * Get all menu modifications for a specific event
 */
export async function getEventModifications(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('menu_modifications')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getEventModifications] Error:', error)
    return []
  }

  return data
}

/**
 * Delete a menu modification
 */
export async function deleteMenuModification(id: string, eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('menu_modifications')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteMenuModification] Error:', error)
    throw new Error('Failed to delete modification')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ─── Photo proof upload ───────────────────────────────────────────────────────

const MOD_PHOTO_BUCKET = 'event-photos'
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png',
  'image/heic': 'heic', 'image/heif': 'heif', 'image/webp': 'webp',
}
const MAX_PHOTO_SIZE = 10 * 1024 * 1024

export type ModificationPhotoResult =
  | { success: true; signedUrl: string }
  | { success: false; error: string }

/**
 * Upload a proof photo for a menu modification record.
 * Stores in event-photos bucket under a mods/ prefix.
 * formData key: 'photo' (File)
 */
export async function uploadModificationPhoto(
  modId: string,
  eventId: string,
  formData: FormData
): Promise<ModificationPhotoResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify modification belongs to this chef
  const { data: mod } = await (supabase as any)
    .from('menu_modifications')
    .select('id')
    .eq('id', modId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!mod) return { success: false, error: 'Modification not found' }

  const file = formData.get('photo') as File | null
  if (!file || file.size === 0) return { success: false, error: 'No file provided' }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return { success: false, error: 'Invalid file type.' }
  if (file.size > MAX_PHOTO_SIZE) return { success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.` }

  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  const storagePath = `${user.tenantId}/${eventId}/mods/${modId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(MOD_PHOTO_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Get a 1-hour signed URL to return immediately for display
  const { data: signedData } = await supabase.storage
    .from(MOD_PHOTO_BUCKET)
    .createSignedUrl(storagePath, 3600)

  const signedUrl = signedData?.signedUrl ?? ''

  // Store the storage path (not the signed URL) so it can be re-signed later
  await (supabase as any)
    .from('menu_modifications')
    .update({ photo_url: storagePath })
    .eq('id', modId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${eventId}`)
  return { success: true, signedUrl }
}

/**
 * Get modification stats across all events
 * Reveals patterns: most common reasons, most substituted items
 */
export async function getModificationStats() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('menu_modifications')
    .select('modification_type, reason, original_description, actual_description')
    .eq('tenant_id', user.tenantId!)

  if (error || !data) {
    console.error('[getModificationStats] Error:', error)
    return { totalModifications: 0, byType: {}, topReasons: [], topSubstitutions: [] }
  }

  // Count by type
  const byType: Record<string, number> = {}
  const reasonCounts: Record<string, number> = {}
  const substitutionCounts: Record<string, number> = {}

  for (const mod of data) {
    byType[mod.modification_type] = (byType[mod.modification_type] || 0) + 1

    if (mod.reason) {
      reasonCounts[mod.reason] = (reasonCounts[mod.reason] || 0) + 1
    }

    if (mod.modification_type === 'substitution' && mod.original_description && mod.actual_description) {
      const key = `${mod.original_description} → ${mod.actual_description}`
      substitutionCounts[key] = (substitutionCounts[key] || 0) + 1
    }
  }

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  const topSubstitutions = Object.entries(substitutionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([substitution, count]) => ({ substitution, count }))

  return {
    totalModifications: data.length,
    byType,
    topReasons,
    topSubstitutions,
  }
}
