'use server'

// Platform Settings Actions — admin-only mutations for global platform config.
// Reads and writes platform_settings table via service role.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logAdminAction } from './audit'

export type AnnouncementType = 'info' | 'warning' | 'critical'

export type PlatformAnnouncement = {
  text: string
  type: AnnouncementType
}

/**
 * Read the current platform announcement (public — can be called from chef layout).
 * Returns null if no active announcement.
 */
export async function getAnnouncement(): Promise<PlatformAnnouncement | null> {
  const supabase: any = createAdminClient()

  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')
    .in('key', ['announcement', 'announcement_type'])

  if (!data) return null

  const rows = data as { key: string; value: string }[]
  const text = rows.find((r) => r.key === 'announcement')?.value ?? ''
  const type = (rows.find((r) => r.key === 'announcement_type')?.value ??
    'info') as AnnouncementType

  if (!text.trim()) return null

  return { text: text.trim(), type }
}

/**
 * Set (or update) the platform announcement banner.
 * Pass an empty string to effectively hide the banner without clearing.
 */
export async function setAnnouncement(
  text: string,
  type: AnnouncementType = 'info'
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin()
  const supabase: any = createAdminClient()

  const now = new Date().toISOString()

  const { error } = await supabase.from('platform_settings').upsert(
    [
      { key: 'announcement', value: text.trim(), updated_at: now, updated_by: admin.email },
      { key: 'announcement_type', value: type, updated_at: now, updated_by: admin.email },
    ],
    { onConflict: 'key' }
  )

  if (error) {
    console.error('[Admin] setAnnouncement error:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorEmail: admin.email,
    actorUserId: admin.id,
    actionType: text.trim() ? 'admin_set_announcement' : 'admin_cleared_announcement',
    details: { text: text.trim(), type },
  })

  return { success: true }
}

/**
 * Clear the announcement banner entirely.
 */
export async function clearAnnouncement(): Promise<{ success: boolean; error?: string }> {
  return setAnnouncement('')
}
