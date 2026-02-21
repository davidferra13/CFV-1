// Portfolio Management Actions
// CRUD for chef portfolio items (photos, dishes, event types).
// Uses portfolio_items table (chef_id FK, new table).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
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
  createdAt: string
}

// --- Zod Schemas ---

const AddPortfolioItemSchema = z.object({
  photoUrl: z.string().url('Valid URL required'),
  caption: z.string().max(500).optional(),
  dishName: z.string().max(200).optional(),
  eventType: z.string().max(100).optional(),
  isFeatured: z.boolean().optional(),
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
  const supabase = createServerClient()

  // Get current max display_order
  const { data: existing } = await (supabase as any)
    .from('portfolio_items')
    .select('display_order')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing && existing.length > 0)
    ? (existing[0].display_order ?? 0) + 1
    : 0

  const { data: item, error } = await (supabase as any)
    .from('portfolio_items')
    .insert({
      chef_id: user.tenantId!,
      photo_url: validated.photoUrl,
      caption: validated.caption ?? null,
      dish_name: validated.dishName ?? null,
      event_type: validated.eventType ?? null,
      display_order: nextOrder,
      is_featured: validated.isFeatured ?? false,
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
export async function reorderPortfolio(
  itemIds: string[]
): Promise<{ success: boolean }> {
  const validated = ReorderPortfolioSchema.parse({ itemIds })
  const user = await requireChef()
  const supabase = createServerClient()

  // Update display_order for each item
  for (let i = 0; i < validated.itemIds.length; i++) {
    const { error } = await (supabase as any)
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
export async function removePortfolioItem(
  itemId: string
): Promise<{ success: boolean }> {
  const validated = RemovePortfolioItemSchema.parse({ itemId })
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await (supabase as any)
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
  const supabase = createServerClient()

  const { data: items, error } = await (supabase as any)
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
    createdAt: row.created_at,
  }
}
