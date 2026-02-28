'use server'

import { createServerClient } from '@/lib/supabase/server'
import type { EventTheme, ThemeCategory } from '@/lib/hub/types'

/**
 * Get all active themes, optionally filtered by category.
 */
export async function getThemes(category?: ThemeCategory): Promise<EventTheme[]> {
  const supabase = createServerClient({ admin: true })

  let query = supabase
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
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase.from('event_themes').select('*').eq('slug', slug).single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load theme: ${error.message}`)
  }
  return (data as EventTheme) ?? null
}

/**
 * Get a single theme by ID.
 */
export async function getThemeById(themeId: string): Promise<EventTheme | null> {
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase.from('event_themes').select('*').eq('id', themeId).single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load theme: ${error.message}`)
  }
  return (data as EventTheme) ?? null
}

/**
 * Set theme on an event share.
 */
export async function setEventShareTheme(shareId: string, themeId: string | null): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('event_shares')
    .update({ theme_id: themeId })
    .eq('id', shareId)

  if (error) throw new Error(`Failed to set theme: ${error.message}`)
}

/**
 * Set theme on a hub group.
 */
export async function setGroupTheme(groupId: string, themeId: string | null): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase
    .from('hub_groups')
    .update({ theme_id: themeId, updated_at: new Date().toISOString() })
    .eq('id', groupId)

  if (error) throw new Error(`Failed to set group theme: ${error.message}`)
}
