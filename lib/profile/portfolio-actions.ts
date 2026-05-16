// Portfolio Entries Actions - Event-level showcase management
// CRUD for portfolio_entries table (event-linked showcase with description,
// guest count, menu highlights, photos, and linked reviews).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ── Types ──

export type PortfolioEntry = {
  id: string
  chefId: string
  eventId: string | null
  title: string
  description: string | null
  occasionType: string | null
  guestCountRange: string | null
  menuHighlights: string[]
  photos: { url: string; caption?: string }[]
  linkedReviewId: string | null
  isPublic: boolean
  displayOrder: number
  eventDate: string | null
  createdAt: string
}

// ── Schemas ──

const CreateEntrySchema = z.object({
  eventId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  occasionType: z.string().max(100).optional(),
  guestCountRange: z.enum(['intimate', 'small', 'medium', 'large', 'xl']).optional(),
  menuHighlights: z.array(z.string().max(200)).max(10).default([]),
  photos: z
    .array(z.object({ url: z.string().url(), caption: z.string().max(200).optional() }))
    .max(5)
    .default([]),
  linkedReviewId: z.string().uuid().optional(),
  isPublic: z.boolean().default(true),
  eventDate: z.string().optional(),
})

const UpdateEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  occasionType: z.string().max(100).nullable().optional(),
  guestCountRange: z.enum(['intimate', 'small', 'medium', 'large', 'xl']).nullable().optional(),
  menuHighlights: z.array(z.string().max(200)).max(10).optional(),
  photos: z
    .array(z.object({ url: z.string().url(), caption: z.string().max(200).optional() }))
    .max(5)
    .optional(),
  linkedReviewId: z.string().uuid().nullable().optional(),
  isPublic: z.boolean().optional(),
})

// ── Actions ──

export async function createPortfolioEntry(
  input: z.infer<typeof CreateEntrySchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const validated = CreateEntrySchema.parse(input)
  const db: any = createServerClient()

  // If eventId provided, verify it belongs to this chef
  if (validated.eventId) {
    const { data: event } = await db
      .from('events')
      .select('id')
      .eq('id', validated.eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!event) {
      return { success: false, error: 'Event not found' }
    }
  }

  const { data, error } = await db
    .from('portfolio_entries')
    .insert({
      chef_id: user.tenantId!,
      event_id: validated.eventId ?? null,
      title: validated.title,
      description: validated.description ?? null,
      occasion_type: validated.occasionType ?? null,
      guest_count_range: validated.guestCountRange ?? null,
      menu_highlights: JSON.stringify(validated.menuHighlights),
      photos: JSON.stringify(validated.photos),
      linked_review_id: validated.linkedReviewId ?? null,
      is_public: validated.isPublic,
      event_date: validated.eventDate ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPortfolioEntry] Insert error:', error)
    return { success: false, error: 'Failed to create portfolio entry' }
  }

  revalidatePath('/portfolio')
  return { success: true, id: data.id }
}

export async function updatePortfolioEntry(
  input: z.infer<typeof UpdateEntrySchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = UpdateEntrySchema.parse(input)
  const { id, ...fields } = validated
  const db: any = createServerClient()

  const updateData: Record<string, unknown> = {}
  if (fields.title !== undefined) updateData.title = fields.title
  if (fields.description !== undefined) updateData.description = fields.description
  if (fields.occasionType !== undefined) updateData.occasion_type = fields.occasionType
  if (fields.guestCountRange !== undefined) updateData.guest_count_range = fields.guestCountRange
  if (fields.menuHighlights !== undefined)
    updateData.menu_highlights = JSON.stringify(fields.menuHighlights)
  if (fields.photos !== undefined) updateData.photos = JSON.stringify(fields.photos)
  if (fields.linkedReviewId !== undefined) updateData.linked_review_id = fields.linkedReviewId
  if (fields.isPublic !== undefined) updateData.is_public = fields.isPublic

  if (Object.keys(updateData).length === 0) {
    return { success: true }
  }

  const { error } = await db
    .from('portfolio_entries')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updatePortfolioEntry] Update error:', error)
    return { success: false, error: 'Failed to update portfolio entry' }
  }

  revalidatePath('/portfolio')
  return { success: true }
}

export async function deletePortfolioEntry(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('portfolio_entries')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deletePortfolioEntry] Delete error:', error)
    return { success: false, error: 'Failed to delete portfolio entry' }
  }

  revalidatePath('/portfolio')
  return { success: true }
}

export async function getPortfolioEntries(): Promise<PortfolioEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('portfolio_entries')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getPortfolioEntries] Query error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    eventId: row.event_id,
    title: row.title,
    description: row.description,
    occasionType: row.occasion_type,
    guestCountRange: row.guest_count_range,
    menuHighlights: Array.isArray(row.menu_highlights) ? row.menu_highlights : [],
    photos: Array.isArray(row.photos) ? row.photos : [],
    linkedReviewId: row.linked_review_id,
    isPublic: row.is_public,
    displayOrder: row.display_order,
    eventDate: row.event_date,
    createdAt: row.created_at,
  }))
}

/**
 * Get public portfolio entries for a chef (no auth required).
 */
export async function getPublicPortfolioEntries(chefId: string): Promise<PortfolioEntry[]> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('portfolio_entries')
    .select('*')
    .eq('chef_id', chefId)
    .eq('is_public', true)
    .order('display_order', { ascending: true })

  if (error) {
    // Gracefully handle missing table
    if (error.code === '42P01') return []
    console.error('[getPublicPortfolioEntries] Query error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    chefId: row.chef_id,
    eventId: row.event_id,
    title: row.title,
    description: row.description,
    occasionType: row.occasion_type,
    guestCountRange: row.guest_count_range,
    menuHighlights: Array.isArray(row.menu_highlights) ? row.menu_highlights : [],
    photos: Array.isArray(row.photos) ? row.photos : [],
    linkedReviewId: row.linked_review_id,
    isPublic: row.is_public,
    displayOrder: row.display_order,
    eventDate: row.event_date,
    createdAt: row.created_at,
  }))
}
