'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import type { ChefTipCategory, ChefTip } from './types'

const TIP_FIELDS = 'id, content, tags, shared, created_at, updated_at'

function revalidateTips() {
  revalidatePath('/dashboard')
  revalidatePath('/culinary/cheftips')
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

  revalidateTips()
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

  revalidateTips()
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

// ─── DELETE ────────────────────────────────────────────

export async function deleteChefTip(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('chef_tips').delete().eq('id', id).eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefTips] deleteChefTip failed:', error)
    return { success: false, error: 'Failed to delete tip' }
  }

  revalidateTips()
  return { success: true }
}
