'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { requireChef } from '@/lib/auth/get-user'
import type { ChefNote, ChefNoteType } from './note-types'

const NOTE_FIELDS =
  'id, chef_id, title, body, note_type, tags, shared, pinned, review, created_at, updated_at'

function revalidateNotes(chefId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/culinary/chefnotes')
  if (chefId) {
    revalidateTag(`chefnotes-stats-${chefId}`)
  }
}

// ─── CREATE ────────────────────────────────────────────

export async function addChefNote(
  title: string,
  body: string,
  noteType: ChefNoteType = 'journal',
  tags?: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()

  const trimmedTitle = title.trim()
  if (!trimmedTitle || trimmedTitle.length > 200) {
    return { success: false, error: 'Title must be 1-200 characters' }
  }

  const trimmedBody = body.trim()
  if (!trimmedBody) {
    return { success: false, error: 'Body is required' }
  }

  if (noteType !== 'journal' && noteType !== 'reference') {
    return { success: false, error: 'Invalid note type' }
  }

  const cleanTags = (tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .slice(0, 10)

  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_notes')
    .insert({
      chef_id: user.entityId,
      title: trimmedTitle,
      body: trimmedBody,
      note_type: noteType,
      tags: cleanTags,
      shared: false,
      pinned: false,
      review: false,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[ChefNotes] addChefNote failed:', error)
    return { success: false, error: 'Failed to save note' }
  }

  revalidateNotes(user.entityId)
  return { success: true, id: data.id }
}

// ─── UPDATE ────────────────────────────────────────────

export async function updateChefNote(
  id: string,
  fields: {
    title?: string
    body?: string
    note_type?: ChefNoteType
    tags?: string[]
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (fields.title !== undefined) {
    const t = fields.title.trim()
    if (!t || t.length > 200) return { success: false, error: 'Title must be 1-200 characters' }
    updates.title = t
  }

  if (fields.body !== undefined) {
    const b = fields.body.trim()
    if (!b) return { success: false, error: 'Body is required' }
    updates.body = b
  }

  if (fields.note_type !== undefined) {
    if (fields.note_type !== 'journal' && fields.note_type !== 'reference') {
      return { success: false, error: 'Invalid note type' }
    }
    updates.note_type = fields.note_type
  }

  if (fields.tags !== undefined) {
    updates.tags = fields.tags
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
      .slice(0, 10)
  }

  const db: any = createServerClient()

  const { error } = await db
    .from('chef_notes')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefNotes] updateChefNote failed:', error)
    return { success: false, error: 'Failed to update note' }
  }

  revalidateNotes(user.entityId)
  return { success: true }
}

// ─── DELETE ────────────────────────────────────────────

export async function deleteChefNote(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('chef_notes').delete().eq('id', id).eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefNotes] deleteChefNote failed:', error)
    return { success: false, error: 'Failed to delete note' }
  }

  revalidateNotes(user.entityId)
  return { success: true }
}

// ─── READ ──────────────────────────────────────────────

export async function getChefNote(id: string): Promise<ChefNote | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_notes')
    .select(NOTE_FIELDS)
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (error || !data) return null
  return data
}

export async function getChefNotes(filters?: {
  note_type?: ChefNoteType
  tag?: string
  search?: string
  pinned?: boolean
  review?: boolean
  shared?: boolean
  limit?: number
  offset?: number
}): Promise<{ notes: ChefNote[]; total: number }> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('chef_notes')
    .select(NOTE_FIELDS, { count: 'exact' })
    .eq('chef_id', user.entityId)

  if (filters?.note_type) {
    query = query.eq('note_type', filters.note_type)
  }
  if (filters?.tag) {
    query = query.contains('tags', [filters.tag])
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%`)
  }
  if (filters?.pinned !== undefined) {
    query = query.eq('pinned', filters.pinned)
  }
  if (filters?.review !== undefined) {
    query = query.eq('review', filters.review)
  }
  if (filters?.shared !== undefined) {
    query = query.eq('shared', filters.shared)
  }

  query = query.order('created_at', { ascending: false })

  const limit = filters?.limit ?? 20
  const offset = filters?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[ChefNotes] getChefNotes failed:', error)
    return { notes: [], total: 0 }
  }

  return { notes: data ?? [], total: count ?? 0 }
}

// ─── STATS ─────────────────────────────────────────────

export async function getChefNoteStats(): Promise<{
  total: number
  journal: number
  reference: number
  thisWeek: number
  thisMonth: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [totalRes, journalRes, referenceRes, weekRes, monthRes] = await Promise.all([
    db.from('chef_notes').select('id', { count: 'exact', head: true }).eq('chef_id', user.entityId),
    db
      .from('chef_notes')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .eq('note_type', 'journal'),
    db
      .from('chef_notes')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .eq('note_type', 'reference'),
    db
      .from('chef_notes')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .gte('created_at', weekAgo.toISOString()),
    db
      .from('chef_notes')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.entityId)
      .gte('created_at', monthAgo.toISOString()),
  ])

  return {
    total: totalRes.count ?? 0,
    journal: journalRes.count ?? 0,
    reference: referenceRes.count ?? 0,
    thisWeek: weekRes.count ?? 0,
    thisMonth: monthRes.count ?? 0,
  }
}

export async function getCachedNoteStats(chefId: string) {
  return unstable_cache(
    async () => {
      const db: any = createAdminClient()
      const [totalRes, journalRes, referenceRes] = await Promise.all([
        db.from('chef_notes').select('id', { count: 'exact', head: true }).eq('chef_id', chefId),
        db
          .from('chef_notes')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', chefId)
          .eq('note_type', 'journal'),
        db
          .from('chef_notes')
          .select('id', { count: 'exact', head: true })
          .eq('chef_id', chefId)
          .eq('note_type', 'reference'),
      ])
      return {
        total: totalRes.count ?? 0,
        journal: journalRes.count ?? 0,
        reference: referenceRes.count ?? 0,
      }
    },
    [`chefnotes-stats-${chefId}`],
    { revalidate: 60, tags: [`chefnotes-stats-${chefId}`] }
  )()
}

// ─── TOGGLES ───────────────────────────────────────────

export async function pinChefNote(
  id: string,
  pinned: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_notes')
    .update({ pinned, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefNotes] pinChefNote failed:', error)
    return { success: false, error: 'Failed to update pin' }
  }

  revalidateNotes(user.entityId)
  return { success: true }
}

export async function setChefNoteReview(
  id: string,
  review: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_notes')
    .update({ review, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefNotes] setChefNoteReview failed:', error)
    return { success: false, error: 'Failed to update review' }
  }

  revalidateNotes(user.entityId)
  return { success: true }
}

export async function shareChefNote(
  id: string,
  shared: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_notes')
    .update({ shared, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[ChefNotes] shareChefNote failed:', error)
    return { success: false, error: 'Failed to update sharing' }
  }

  revalidateNotes(user.entityId)
  return { success: true }
}

// ─── EXPORT ────────────────────────────────────────────

export async function exportNotesAsMarkdown(): Promise<string> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('chef_notes')
    .select(NOTE_FIELDS)
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })

  if (!data || data.length === 0) return '# ChefNotes\n\nNo notes recorded yet.\n'

  const lines: string[] = ['# ChefNotes\n']

  for (const note of data as ChefNote[]) {
    const date = new Date(note.created_at).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const typeLabel = note.note_type === 'reference' ? 'Reference' : 'Journal'
    const tagStr = note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : ''
    lines.push(`\n## ${note.title}\n`)
    lines.push(`*${typeLabel} | ${date}${tagStr}*\n`)
    lines.push(note.body)
    lines.push('')
  }

  lines.push(`\n---\n*Exported from ChefFlow on ${new Date().toLocaleDateString()}*\n`)
  return lines.join('\n')
}

// ─── TOP TAGS ──────────────────────────────────────────

export async function getNoteTopTags(limit: number = 8): Promise<{ tag: string; count: number }[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db.from('chef_notes').select('tags').eq('chef_id', user.entityId)

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
