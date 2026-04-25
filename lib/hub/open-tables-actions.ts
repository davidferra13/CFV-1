'use server'

import { createServerClient } from '@/lib/db/server'

export type OpenTableListing = {
  id: string
  name: string
  emoji: string | null
  groupToken: string
  displayArea: string | null
  displayVibe: string[] | null
  dietaryTheme: string[] | null
  openSeats: number | null
  maxGroupSize: number | null
  closesAt: string | null
  memberCount: number
  lastMessageAt: string | null
}

export async function getOpenTables(filters?: {
  area?: string
  vibe?: string
  dietary?: string
}): Promise<OpenTableListing[]> {
  const db: any = createServerClient({ admin: true })

  let query = db
    .from('hub_groups')
    .select(
      `
      id, name, emoji, group_token, display_area, display_vibe,
      dietary_theme, open_seats, max_group_size, closes_at,
      member_count, last_message_at
    `
    )
    .eq('is_open_table', true)
    .eq('is_active', true)
    .in('visibility', ['public'])
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (filters?.area) {
    query = query.ilike('display_area', `%${filters.area}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getOpenTables] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    groupToken: row.group_token,
    displayArea: row.display_area,
    displayVibe: row.display_vibe,
    dietaryTheme: row.dietary_theme,
    openSeats: row.open_seats,
    maxGroupSize: row.max_group_size,
    closesAt: row.closes_at,
    memberCount: row.member_count ?? 0,
    lastMessageAt: row.last_message_at,
  }))
}
