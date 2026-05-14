'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { EventTheme, ThemeCategory } from '@/lib/hub/types'

/**
 * Get all active themes, optionally filtered by category.
 */
export async function getThemes(category?: ThemeCategory): Promise<EventTheme[]> {
  const db = createServerClient({ admin: true })

  let query = db
    .from('event_themes')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load themes: ${error.message}`)
  return (data ?? []) as EventTheme[]
}

/**
 * Get a single theme by slug.
 */
export async function getThemeBySlug(slug: string): Promise<EventTheme | null> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db.from('event_themes').select('*').eq('slug', slug).single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load theme: ${error.message}`)
  }
  return (data as EventTheme) ?? null
}

/**
 * Get a single theme by ID.
 */
export async function getThemeById(themeId: string): Promise<EventTheme | null> {
  const db = createServerClient({ admin: true })

  const { data, error } = await db.from('event_themes').select('*').eq('id', themeId).single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load theme: ${error.message}`)
  }
  return (data as EventTheme) ?? null
}

/**
 * Set theme on an event share.
 */
export async function setEventShareTheme(shareId: string, themeId: string | null): Promise<void> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  // Verify ownership: share must belong to this tenant
  const { data: share } = await db
    .from('event_shares')
    .select('id')
    .eq('id', shareId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!share) throw new Error('Event share not found or access denied')

  const { error } = await db.from('event_shares').update({ theme_id: themeId }).eq('id', shareId)

  if (error) throw new Error(`Failed to set theme: ${error.message}`)
}

/**
 * Set theme on a hub group.
 */
export async function setGroupTheme(groupId: string, themeId: string | null): Promise<void> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  // Verify ownership: group must belong to this tenant
  const { data: group } = await db
    .from('hub_groups')
    .select('id')
    .eq('id', groupId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!group) throw new Error('Hub group not found or access denied')

  const { error } = await db
    .from('hub_groups')
    .update({ theme_id: themeId, updated_at: new Date().toISOString() })
    .eq('id', groupId)

  if (error) throw new Error(`Failed to set group theme: ${error.message}`)
}
