// Portfolio Management Actions
// CRUD for chef portfolio items (photos, dishes, event types).
// Uses portfolio_items table (chef_id FK, new table).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type PortfolioItem = {
  id: string
  chefId: string
  photoUrl: string
  caption: string | null
  dishName: string | null
  eventType: string | null
  displayOrder: number
  isFeatured: boolean
  category: string | null
  season: string | null
  cuisineType: string | null
  eventLinkId: string | null
  collection: string | null
  isPublic: boolean
  createdAt: string
}

export type PortfolioCollection = {
  name: string
  count: number
  coverPhotoUrl: string | null
}

// --- Zod Schemas ---

const AddPortfolioItemSchema = z.object({
  photoUrl: z.string().url('Valid URL required'),
  caption: z.string().max(500).optional(),
  dishName: z.string().max(200).optional(),
  eventType: z.string().max(100).optional(),
  isFeatured: z.boolean().optional(),
  category: z.string().max(100).optional(),
  season: z.string().max(50).optional(),
  cuisineType: z.string().max(100).optional(),
  eventLinkId: z.string().uuid().optional(),
  collection: z.string().max(200).optional(),
})

const UpdatePortfolioItemSchema = z.object({
  category: z.string().max(100).optional(),
  season: z.string().max(50).optional(),
  cuisineType: z.string().max(100).optional(),
  eventLinkId: z.string().uuid().nullable().optional(),
  collection: z.string().max(200).nullable().optional(),
  isPublic: z.boolean().optional(),
  caption: z.string().max(500).optional(),
  dishName: z.string().max(200).optional(),
})

const ReorderPortfolioSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, 'At least one item ID required'),
})

const RemovePortfolioItemSchema = z.object({
  itemId: z.string().uuid(),
})

export type AddPortfolioItemInput = z.infer<typeof AddPortfolioItemSchema>

// --- Actions ---

/**
 * Add a new portfolio item. Sets display_order to max+1.
 */
export async function addPortfolioItem(
  input: AddPortfolioItemInput
): Promise<{ success: boolean; item: PortfolioItem }> {
  const validated = AddPortfolioItemSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  // Get current max display_order
  const { data: existing } = await db
    .from('portfolio_items')
    .select('display_order')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0

  const { data: item, error } = await db
    .from('portfolio_items')
    .insert({
      chef_id: user.tenantId!,
      photo_url: validated.photoUrl,
      caption: validated.caption ?? null,
      dish_name: validated.dishName ?? null,
      event_type: validated.eventType ?? null,
      display_order: nextOrder,
      is_featured: validated.isFeatured ?? false,
      category: validated.category ?? 'uncategorized',
      season: validated.season ?? null,
      cuisine_type: validated.cuisineType ?? null,
      event_link_id: validated.eventLinkId ?? null,
      collection: validated.collection ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[addPortfolioItem] Error:', error)
    throw new Error('Failed to add portfolio item')
  }

  revalidatePath('/portfolio')
  revalidatePath('/settings')

  return {
    success: true,
    item: mapPortfolioItem(item),
  }
}

/**
 * Reorder portfolio items based on the provided array of item IDs.
 * Each item's display_order is set to its index in the array.
 */
export async function reorderPortfolio(itemIds: string[]): Promise<{ success: boolean }> {
  const validated = ReorderPortfolioSchema.parse({ itemIds })
  const user = await requireChef()
  const db: any = createServerClient()

  // Update display_order for each item
  for (let i = 0; i < validated.itemIds.length; i++) {
    const { error } = await db
      .from('portfolio_items')
      .update({ display_order: i })
      .eq('id', validated.itemIds[i])
      .eq('chef_id', user.tenantId!)

    if (error) {
      console.error(`[reorderPortfolio] Error updating item ${validated.itemIds[i]}:`, error)
      throw new Error('Failed to reorder portfolio')
    }
  }

  revalidatePath('/portfolio')
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Remove a portfolio item by ID (with chef_id ownership check).
 */
export async function removePortfolioItem(itemId: string): Promise<{ success: boolean }> {
  const validated = RemovePortfolioItemSchema.parse({ itemId })
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('portfolio_items')
    .delete()
    .eq('id', validated.itemId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[removePortfolioItem] Error:', error)
    throw new Error('Failed to remove portfolio item')
  }

  revalidatePath('/portfolio')
  revalidatePath('/settings')

  return { success: true }
}

/**
 * Get all portfolio items ordered by display_order.
 */
export async function getPortfolio(): Promise<PortfolioItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: items, error } = await db
    .from('portfolio_items')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getPortfolio] Error:', error)
    return []
  }

  return (items || []).map(mapPortfolioItem)
}

// --- Helpers ---

function mapPortfolioItem(row: any): PortfolioItem {
  return {
    id: row.id,
    chefId: row.chef_id,
    photoUrl: row.photo_url,
    caption: row.caption,
    dishName: row.dish_name,
    eventType: row.event_type,
    displayOrder: row.display_order,
    isFeatured: row.is_featured,
    category: row.category ?? null,
    season: row.season ?? null,
    cuisineType: row.cuisine_type ?? null,
    eventLinkId: row.event_link_id ?? null,
    collection: row.collection ?? null,
    isPublic: row.is_public ?? true,
    createdAt: row.created_at,
  }
}

/**
 * Update category, season, cuisine, collection, or public status on a portfolio item.
 */
export async function updatePortfolioItem(
  itemId: string,
  updates: z.infer<typeof UpdatePortfolioItemSchema>
): Promise<{ success: boolean; item: PortfolioItem }> {
  const validated = UpdatePortfolioItemSchema.parse(updates)
  const user = await requireChef()
  const db: any = createServerClient()

  const dbUpdates: Record<string, unknown> = {}
  if (validated.category !== undefined) dbUpdates.category = validated.category
  if (validated.season !== undefined) dbUpdates.season = validated.season
  if (validated.cuisineType !== undefined) dbUpdates.cuisine_type = validated.cuisineType
  if (validated.eventLinkId !== undefined) dbUpdates.event_link_id = validated.eventLinkId
  if (validated.collection !== undefined) dbUpdates.collection = validated.collection
  if (validated.isPublic !== undefined) dbUpdates.is_public = validated.isPublic
  if (validated.caption !== undefined) dbUpdates.caption = validated.caption
  if (validated.dishName !== undefined) dbUpdates.dish_name = validated.dishName

  const { data: item, error } = await db
    .from('portfolio_items')
    .update(dbUpdates)
    .eq('id', itemId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updatePortfolioItem] Error:', error)
    throw new Error('Failed to update portfolio item')
  }

  revalidatePath('/portfolio')
  return { success: true, item: mapPortfolioItem(item) }
}

/**
 * Get distinct collection names with item counts and cover photo.
 */
export async function getPortfolioCollections(): Promise<PortfolioCollection[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: items, error } = await db
    .from('portfolio_items')
    .select('collection, photo_url, display_order')
    .eq('chef_id', user.tenantId!)
    .not('collection', 'is', null)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getPortfolioCollections] Error:', error)
    return []
  }

  const collectionMap = new Map<string, { count: number; coverPhotoUrl: string | null }>()
  for (const item of items ?? []) {
    if (!item.collection) continue
    const existing = collectionMap.get(item.collection)
    if (existing) {
      existing.count++
    } else {
      collectionMap.set(item.collection, { count: 1, coverPhotoUrl: item.photo_url })
    }
  }

  return Array.from(collectionMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    coverPhotoUrl: data.coverPhotoUrl,
  }))
}

/**
 * Get the chef's public portfolio URL.
 */
export async function getPublicPortfolioLink(): Promise<string | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: chef } = await db.from('chefs').select('slug').eq('id', user.tenantId!).single()

  if (!chef?.slug) return null
  return `/chef/${chef.slug}/portfolio`
}

/**
 * Get a list of recent events for linking to portfolio items.
 */
export async function getRecentEventsForPortfolio(): Promise<
  { id: string; name: string; date: string | null }[]
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: events, error } = await db
    .from('events')
    .select('id, name, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getRecentEventsForPortfolio] Error:', error)
    return []
  }

  return (events ?? []).map((e: any) => ({
    id: e.id,
    name: e.name || e.occasion || 'Untitled Event',
    date: e.event_date,
  }))
}
