'use server'

/**
 * Menu Storytelling & FOH Presentation Studio
 *
 * Server actions for narrative content, wine pairings, chef notes,
 * and presentation instructions for front-of-house staff.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { StoryElementType, StoryElement, WinePairing, PresentationGuide } from './storytelling-types'

// -------------------------------------------------------------------
// addStoryElement
// -------------------------------------------------------------------

export async function addStoryElement(
  menuId: string,
  input: {
    type: StoryElementType
    title?: string
    content: string
    dishId?: string
    fohOnly?: boolean
  }
): Promise<{ id: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get next sort order
  const { data: maxRow } = await db
    .from('menu_story_elements')
    .select('sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await db
    .from('menu_story_elements')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: menuId,
      type: input.type,
      title: input.title ?? null,
      content: input.content,
      dish_id: input.dishId ?? null,
      sort_order: nextOrder,
      foh_only: input.fohOnly ?? false,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to add story element: ${error.message}`)

  revalidatePath(`/menus/${menuId}`)
  return { id: data.id }
}

// -------------------------------------------------------------------
// getMenuStory
// -------------------------------------------------------------------

export async function getMenuStory(menuId: string): Promise<{
  stories: StoryElement[]
  pairings: WinePairing[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: stories, error: storyErr } = await db
    .from('menu_story_elements')
    .select('id, menu_id, type, title, content, dish_id, sort_order, foh_only, created_at')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (storyErr) throw new Error(`Failed to load stories: ${storyErr.message}`)

  const { data: pairings, error: pairErr } = await db
    .from('menu_wine_pairings')
    .select('id, menu_id, dish_id, wine_name, vineyard, vintage, notes, price_per_bottle, sort_order, created_at')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (pairErr) throw new Error(`Failed to load pairings: ${pairErr.message}`)

  return {
    stories: (stories ?? []).map(mapStoryRow),
    pairings: (pairings ?? []).map(mapPairingRow),
  }
}

// -------------------------------------------------------------------
// updateStoryElement
// -------------------------------------------------------------------

export async function updateStoryElement(
  elementId: string,
  updates: Partial<Pick<StoryElement, 'type' | 'title' | 'content' | 'dishId' | 'order' | 'fohOnly'>>
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const patch: Record<string, unknown> = {}
  if (updates.type !== undefined) patch.type = updates.type
  if (updates.title !== undefined) patch.title = updates.title
  if (updates.content !== undefined) patch.content = updates.content
  if (updates.dishId !== undefined) patch.dish_id = updates.dishId
  if (updates.order !== undefined) patch.sort_order = updates.order
  if (updates.fohOnly !== undefined) patch.foh_only = updates.fohOnly

  if (Object.keys(patch).length === 0) return

  const { error } = await db
    .from('menu_story_elements')
    .update(patch)
    .eq('id', elementId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update story element: ${error.message}`)

  revalidatePath('/menus')
}

// -------------------------------------------------------------------
// removeStoryElement
// -------------------------------------------------------------------

export async function removeStoryElement(elementId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('menu_story_elements')
    .delete()
    .eq('id', elementId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to remove story element: ${error.message}`)

  revalidatePath('/menus')
}

// -------------------------------------------------------------------
// addWinePairing
// -------------------------------------------------------------------

export async function addWinePairing(
  menuId: string,
  input: {
    dishId?: string
    wineName: string
    vineyard?: string
    vintage?: string
    notes?: string
    pricePerBottle?: number
  }
): Promise<{ id: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get next sort order
  const { data: maxRow } = await db
    .from('menu_wine_pairings')
    .select('sort_order')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await db
    .from('menu_wine_pairings')
    .insert({
      tenant_id: user.tenantId!,
      menu_id: menuId,
      dish_id: input.dishId ?? null,
      wine_name: input.wineName,
      vineyard: input.vineyard ?? null,
      vintage: input.vintage ?? null,
      notes: input.notes ?? null,
      price_per_bottle: input.pricePerBottle ?? null,
      sort_order: nextOrder,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to add wine pairing: ${error.message}`)

  revalidatePath(`/menus/${menuId}`)
  return { id: data.id }
}

// -------------------------------------------------------------------
// removeWinePairing
// -------------------------------------------------------------------

export async function removeWinePairing(pairingId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('menu_wine_pairings')
    .delete()
    .eq('id', pairingId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to remove wine pairing: ${error.message}`)

  revalidatePath('/menus')
}

// -------------------------------------------------------------------
// getPresentationGuide
// -------------------------------------------------------------------

export async function getPresentationGuide(menuId: string): Promise<PresentationGuide> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: stories, error: storyErr } = await db
    .from('menu_story_elements')
    .select('id, menu_id, type, title, content, dish_id, sort_order, foh_only, created_at')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (storyErr) throw new Error(`Failed to load stories: ${storyErr.message}`)

  const { data: pairings, error: pairErr } = await db
    .from('menu_wine_pairings')
    .select('id, menu_id, dish_id, wine_name, vineyard, vintage, notes, price_per_bottle, sort_order, created_at')
    .eq('menu_id', menuId)
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (pairErr) throw new Error(`Failed to load pairings: ${pairErr.message}`)

  // Derive service notes from stories of type 'chef_note' marked foh_only
  const fohNotes = (stories ?? [])
    .filter((s: any) => s.foh_only && s.type === 'chef_note')
    .map((s: any) => s.content)
    .join('\n\n')

  return {
    menuId,
    stories: (stories ?? []).map(mapStoryRow),
    pairings: (pairings ?? []).map(mapPairingRow),
    serviceNotes: fohNotes || null,
    printReady: (stories ?? []).length > 0 || (pairings ?? []).length > 0,
  }
}

// -------------------------------------------------------------------
// Row mappers
// -------------------------------------------------------------------

function mapStoryRow(row: any): StoryElement {
  return {
    id: row.id,
    menuId: row.menu_id,
    type: row.type,
    title: row.title,
    content: row.content,
    dishId: row.dish_id,
    order: row.sort_order,
    fohOnly: row.foh_only,
    createdAt: row.created_at,
  }
}

function mapPairingRow(row: any): WinePairing {
  return {
    id: row.id,
    menuId: row.menu_id,
    dishId: row.dish_id,
    wineName: row.wine_name,
    vineyard: row.vineyard,
    vintage: row.vintage,
    notes: row.notes,
    pricePerBottle: row.price_per_bottle,
    order: row.sort_order,
  }
}
