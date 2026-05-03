'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { requireChef } from '@/lib/auth/get-user'
import type { ChefTipCategory, ChefTip } from './tip-types'

const TIP_FIELDS = 'id, content, tags, shared, pinned, review, promoted_to, created_at, updated_at'

function revalidateTips(chefId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/culinary/cheftips')
  if (chefId) {
    revalidateTag(`cheftips-stats-${chefId}`)
  }
}

// ─── CACHED STATS (for dashboard, 60s TTL) ────────────

export async function getCachedTipStats(chefId: string): Promise<{
  total: number
  thisWeek: number
  thisMonth: number
  streak: number
}> {
  return unstable_cache(
    async () => {
      const db: any = createAdminClient()

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [totalRes, weekRes, monthRes] = await Promise.all([
        db.from('chef_tips').select('id', { count: 'exact', head: true }).eq('chef_id', chefId),
        db
          .from('chef_tips')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', chefId)
          .gte('created_at', weekAgo.toISOString()),
        db
          .from('chef_tips')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', chefId)
          .gte('created_at', monthAgo.toISOString()),
      ])

      // Streak calculation
      const { data: recentDays } = await db
        .from('chef_tips')
        .select('created_at')
        .eq('chef_id', chefId)
        .order('created_at', { ascending: false })
        .limit(90)

      let streak = 0
      if (recentDays && recentDays.length > 0) {
        const daySet = new Set<string>()
        for (const row of recentDays) {
          daySet.add(new Date(row.created_at).toISOString().split('T')[0])
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (let i = 0; i < 90; i++) {
          const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          const dateStr = checkDate.toISOString().split('T')[0]
          if (daySet.has(dateStr)) {
            streak++
          } else {
            if (i === 0) continue
            break
          }
        }
      }

      return {
        total: totalRes.count ?? 0,
        thisWeek: weekRes.count ?? 0,
        thisMonth: monthRes.count ?? 0,
        streak,
      }
    },
    [`cheftips-stats-${chefId}`],
    { revalidate: 60, tags: [`cheftips-stats-${chefId}`] }
  )()
}

// ─── READ ──────────────────────────────────────────────

export async function getTodaysTips(): Promise<ChefTip[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await db
    .from('chef_tips')
    .select(TIP_FIELDS)
    .eq('chef_id', user.entityId)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ChefTips] getTodaysTips failed:', error)
    return []
  }

  return data ?? []
}

export async function getChefTips(filters?: {
  tag?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ tips: ChefTip[]; total: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('chef_tips')
    .select(TIP_FIELDS, { count: 'exact' })
    .eq('chef_id', user.entityId)

  if (filters?.tag) {
    query = query.contains('tags', [filters.tag])
  }

  if (filters?.search) {
    query = query.ilike('content', `%${filters.search}%`)
  }

  query = query.order('created_at', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters?.limit || 20) - 1)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[ChefTips] getChefTips failed:', error)
    return { tips: [], total: 0 }
  }

  return { tips: data ?? [], total: count ?? 0 }
}

export async function getChefTipStats(): Promise<{
  total: number
  thisWeek: number
  thisMonth: number
  streak: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [totalRes, weekRes, monthRes] = await Promise.all([
    db.from('chef_tips').select('id', { count: 'exact', head: true }).eq('chef_id', user.entityId),
    db
      .from('chef_tips')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .gte('created_at', weekAgo.toISOString()),
    db
      .from('chef_tips')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .gte('created_at', monthAgo.toISOString()),
  ])

  // Calculate streak: consecutive days with at least one tip
  const { data: recentDays } = await db
    .from('chef_tips')
    .select('created_at')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(90)

  let streak = 0
  if (recentDays && recentDays.length > 0) {
    const daySet = new Set<string>()
    for (const row of recentDays) {
      daySet.add(new Date(row.created_at).toISOString().split('T')[0])
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = checkDate.toISOString().split('T')[0]
      if (daySet.has(dateStr)) {
        streak++
      } else {
        // Allow today to be missing (day not over yet)
        if (i === 0) continue
        break
      }
    }
  }

  return {
    total: totalRes.count ?? 0,
    thisWeek: weekRes.count ?? 0,
    thisMonth: monthRes.count ?? 0,
    streak,
  }
}

// ─── CREATE ────────────────────────────────────────────

export async function addChefTip(
  content: string,
  tags?: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 2000) {
    return { success: false, error: 'Tip must be 1-2000 characters' }
  }

  const cleanTags = (tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .slice(0, 5)

  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_tips')
    .insert({
      chef_id: user.entityId,
      content: trimmed,
      tags: cleanTags,
      shared: false,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[ChefTips] addChefTip failed:', error)
    return { success: false, error: 'Failed to save tip' }
  }

  revalidateTips(user.entityId)
  return { success: true, id: data.id }
}

// ─── UPDATE ────────────────────────────────────────────

export async function updateChefTip(
  id: string,
  content: string,
  tags?: string[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 2000) {
    return { success: false, error: 'Tip must be 1-2000 characters' }
  }

  const cleanTags = (tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .slice(0, 5)

  const db: any = createServerClient()

  const { error } = await db
    .from('chef_tips')
    .update({
      content: trimmed,
      tags: cleanTags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefTips] updateChefTip failed:', error)
    return { success: false, error: 'Failed to update tip' }
  }

  revalidateTips(user.entityId)
  return { success: true }
}

// ─── RANDOM PAST TIP ──────────────────────────────────

export async function getRandomPastTip(): Promise<ChefTip | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Get count of past tips (before today)
  const { count } = await db
    .from('chef_tips')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.entityId)
    .lt('created_at', todayStart.toISOString())

  if (!count || count === 0) return null

  const randomOffset = Math.floor(Math.random() * count)

  const { data } = await db
    .from('chef_tips')
    .select(TIP_FIELDS)
    .eq('chef_id', user.entityId)
    .lt('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .range(randomOffset, randomOffset)
    .single()

  return data ?? null
}

// ─── MONTHLY SUMMARY ──────────────────────────────────

export async function getMonthlyTipCounts(
  monthsBack: number = 6
): Promise<{ month: string; count: number }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const results: { month: string; count: number }[] = []
  const now = new Date()

  for (let i = 0; i < monthsBack; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

    const { count } = await db
      .from('chef_tips')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())

    results.push({
      month: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count: count ?? 0,
    })
  }

  return results.reverse()
}

// ─── TOP TAGS ─────────────────────────────────────────

export async function getTopTags(limit: number = 8): Promise<{ tag: string; count: number }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db.from('chef_tips').select('tags').eq('chef_id', user.entityId)

  if (!data || data.length === 0) return []

  const tagCounts: Record<string, number> = {}
  for (const row of data) {
    if (Array.isArray(row.tags)) {
      for (const tag of row.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }
  }

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// ─── ON THIS DAY ──────────────────────────────────────

export async function getOnThisDayTips(): Promise<ChefTip[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  // Get all tips, then filter by month/day in JS (more reliable across TZs)
  const { data } = await db
    .from('chef_tips')
    .select(TIP_FIELDS)
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })

  if (!data) return []

  const todayStr = today.toISOString().split('T')[0]

  return (data as ChefTip[]).filter((tip) => {
    const d = new Date(tip.created_at)
    const tipDate = d.toISOString().split('T')[0]
    // Same month and day, but not today
    return d.getMonth() + 1 === month && d.getDate() === day && tipDate !== todayStr
  })
}

// ─── EXPORT AS MARKDOWN ───────────────────────────────

export async function exportTipsAsMarkdown(): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_tips')
    .select(TIP_FIELDS)
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })

  if (!data || data.length === 0) return '# ChefTips\n\nNo tips recorded yet.\n'

  const lines: string[] = ['# ChefTips - Learning Log\n']

  // Group by month
  const byMonth = new Map<string, ChefTip[]>()
  for (const tip of data as ChefTip[]) {
    const d = new Date(tip.created_at)
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const arr = byMonth.get(key) ?? []
    arr.push(tip)
    byMonth.set(key, arr)
  }

  for (const [month, monthTips] of byMonth) {
    lines.push(`\n## ${month}\n`)
    for (const tip of monthTips) {
      const date = new Date(tip.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const tagStr = tip.tags.length > 0 ? ` [${tip.tags.join(', ')}]` : ''
      lines.push(`- **${date}**${tagStr}: ${tip.content}`)
    }
  }

  lines.push(`\n---\n*Exported from ChefFlow on ${new Date().toLocaleDateString()}*\n`)
  return lines.join('\n')
}

// ─── TOGGLES ──────────────────────────────────────────

export async function pinChefTip(
  id: string,
  pinned: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_tips')
    .update({ pinned, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefTips] pinChefTip failed:', error)
    return { success: false, error: 'Failed to update pin' }
  }

  revalidateTips(user.entityId)
  return { success: true }
}

export async function setChefTipReview(
  id: string,
  review: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_tips')
    .update({ review, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefTips] setChefTipReview failed:', error)
    return { success: false, error: 'Failed to update review' }
  }

  revalidateTips(user.entityId)
  return { success: true }
}

export async function shareChefTip(
  id: string,
  shared: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_tips')
    .update({ shared, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefTips] shareChefTip failed:', error)
    return { success: false, error: 'Failed to update sharing' }
  }

  revalidateTips(user.entityId)
  return { success: true }
}

// ─── PROMOTE TO NOTE ──────────────────────────────────

export async function promoteTipToNote(
  tipId: string
): Promise<{ success: boolean; noteId?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the tip
  const { data: tip } = await db
    .from('chef_tips')
    .select(TIP_FIELDS)
    .eq('id', tipId)
    .eq('chef_id', user.entityId)
    .single()

  if (!tip) {
    return { success: false, error: 'Tip not found' }
  }

  if (tip.promoted_to) {
    return { success: false, error: 'Tip already promoted to a note' }
  }

  // Create note from tip
  const { data: note, error: noteError } = await db
    .from('chef_notes')
    .insert({
      chef_id: user.entityId,
      title: tip.content.length > 200 ? tip.content.slice(0, 197) + '...' : tip.content,
      body: tip.content,
      note_type: 'journal',
      tags: tip.tags,
      shared: false,
      pinned: false,
      review: false,
    })
    .select('id')
    .single()

  if (noteError || !note) {
    console.error('[ChefTips] promoteTipToNote note creation failed:', noteError)
    return { success: false, error: 'Failed to create note from tip' }
  }

  // Link tip to note
  await db
    .from('chef_tips')
    .update({ promoted_to: note.id, updated_at: new Date().toISOString() })
    .eq('id', tipId)
    .eq('chef_id', user.entityId)

  // Create knowledge link
  await db.from('chef_knowledge_links').insert({
    source_type: 'note',
    source_id: note.id,
    target_type: 'tip',
    target_id: tipId,
    chef_id: user.entityId,
  })

  revalidateTips(user.entityId)
  revalidatePath('/culinary/chefnotes')
  return { success: true, noteId: note.id }
}

// ─── DELETE ────────────────────────────────────────────

export async function deleteChefTip(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('chef_tips').delete().eq('id', id).eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefTips] deleteChefTip failed:', error)
    return { success: false, error: 'Failed to delete tip' }
  }

  revalidateTips(user.entityId)
  return { success: true }
}
