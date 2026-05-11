'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface SharedRecipe {
  id: string
  name: string
  description: string | null
  category: string
  dietary_tags: string[]
  photo_url: string | null
}

/**
 * Fetch recipes linked to a completed event that the chef marked as shareable.
 * Path: event -> menus -> dishes -> components -> recipes (where shareable_with_client = true)
 */
export async function getSharedRecipesForEvent(eventId: string): Promise<SharedRecipe[]> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Verify the client owns this event
  const { data: event } = await db
    .from('events')
    .select('id, status')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) return []

  // Only show shared recipes for completed events
  if (event.status !== 'completed') return []

  // Fetch menus for this event, then walk the chain to recipes
  const { data: menus } = await db.from('menus').select('id').eq('event_id', eventId)

  if (!menus || menus.length === 0) return []

  const menuIds = menus.map((m: any) => m.id)

  // Get dishes from those menus
  const { data: dishes } = await db.from('dishes').select('id').in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map((d: any) => d.id)

  // Get components that have a recipe_id
  const { data: components } = await db
    .from('components')
    .select('recipe_id')
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return []

  const recipeIds = [...new Set(components.map((c: any) => c.recipe_id))]

  // Fetch the actual recipes that are shareable
  const { data: recipes } = await db
    .from('recipes')
    .select('id, name, description, category, dietary_tags, photo_url')
    .in('id', recipeIds)
    .eq('shareable_with_client', true)
    .eq('archived', false)

  if (!recipes || recipes.length === 0) return []

  return recipes.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    dietary_tags: r.dietary_tags ?? [],
    photo_url: r.photo_url,
  }))
}
