'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export type MenuRevision = {
  id: string
  menu_id: string
  event_id: string
  version: number
  revision_type: string
  snapshot: any
  changes_summary: string | null
  allergen_conflicts: any
  created_by: string | null
  created_at: string
}

export async function getRevisionHistory(menuId: string, eventId: string): Promise<MenuRevision[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('menu_revisions')
    .select('*')
    .eq('menu_id', menuId)
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('version', { ascending: false })

  if (error) {
    console.error('[revisions] Failed to load history:', error.message)
    return []
  }

  return data ?? []
}

export async function compareRevisions(
  revisionAId: string,
  revisionBId: string
): Promise<{ added: any[]; removed: any[]; modified: any[] } | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: revisions } = await supabase
    .from('menu_revisions')
    .select('*')
    .in('id', [revisionAId, revisionBId])
    .eq('tenant_id', user.entityId)

  if (!revisions || revisions.length !== 2) return null

  const [older, newer] = revisions.sort((a: any, b: any) => a.version - b.version)

  const olderDishes = (older.snapshot as any)?.dishes ?? []
  const newerDishes = (newer.snapshot as any)?.dishes ?? []

  const olderIds = new Set(olderDishes.map((d: any) => d.id))
  const newerIds = new Set(newerDishes.map((d: any) => d.id))

  const added = newerDishes.filter((d: any) => !olderIds.has(d.id))
  const removed = olderDishes.filter((d: any) => !newerIds.has(d.id))
  const modified = newerDishes.filter((d: any) => {
    if (!olderIds.has(d.id)) return false
    const oldDish = olderDishes.find((o: any) => o.id === d.id)
    return JSON.stringify(oldDish) !== JSON.stringify(d)
  })

  return { added, removed, modified }
}
