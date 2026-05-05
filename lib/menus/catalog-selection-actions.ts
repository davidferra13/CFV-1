// Catalog Selection Actions
// "Curate and send" workflow: chef picks dishes from dish_index,
// sends curated selection to client, client picks their courses,
// picks convert to an event menu.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import crypto from 'crypto'

// ─── Types ───────────────────────────────────────────────────────

export type CatalogSelection = {
  id: string
  tenantId: string
  name: string
  description: string | null
  clientId: string | null
  eventId: string | null
  dishIds: string[]
  shareToken: string | null
  sharedAt: string | null
  expiresAt: string | null
  pickedDishIds: string[]
  pickedAt: string | null
  pickerName: string | null
  pickerNotes: string | null
  menuId: string | null
  status: 'draft' | 'shared' | 'picks_received' | 'menu_created' | 'expired'
  createdAt: string
  updatedAt: string
}

export type PublicCatalogData = {
  selectionName: string
  chefName: string | null
  description: string | null
  eventDate: string | null
  eventOccasion: string | null
  dishes: Array<{
    id: string
    name: string
    course: string
    description: string | null
    dietaryTags: string[]
    allergenFlags: string[]
    isSig: boolean
    photoUrl: string | null
  }>
}

export type CatalogSelectionSummary = CatalogSelection & {
  clientName?: string | null
  dishCount: number
  pickedCount: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateSelectionSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  dishIds: z.array(z.string().uuid()).min(1, 'Select at least one dish'),
})

const UpdateSelectionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  clientId: z.string().uuid().nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
  dishIds: z.array(z.string().uuid()).min(1).optional(),
})

const SubmitPicksSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  dishIds: z.array(z.string().uuid()).min(1, 'Pick at least one course'),
  notes: z.string().optional(),
})

// ─── Chef Actions (authenticated) ───────────────────────────────

/**
 * Get all active dishes currently available in the catalog.
 * Filters by rotation_status = active, not archived, and within availability window.
 */
export async function getAvailableCatalog(filters?: {
  course?: string
  season?: string
  dietaryTag?: string
  search?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date().toISOString().split('T')[0]

  let query = db
    .from('dish_index')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('archived', false)
    .eq('rotation_status', 'active')

  // Availability window: include dishes where available_from is null or <= now
  // AND available_until is null or >= now
  query = query.or(`available_from.is.null,available_from.lte.${now}`)
  query = query.or(`available_until.is.null,available_until.gte.${now}`)

  if (filters?.course) {
    query = query.eq('course', filters.course)
  }
  if (filters?.season) {
    query = query.contains('season_affinity', [filters.season])
  }
  if (filters?.dietaryTag) {
    query = query.contains('dietary_tags', [filters.dietaryTag])
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  query = query.order('course').order('name')

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch catalog: ${error.message}`)
  return data ?? []
}

/**
 * Create a new catalog selection (curated set of dishes for a client).
 */
export async function createCatalogSelection(input: z.infer<typeof CreateSelectionSchema>) {
  const user = await requireChef()
  const parsed = CreateSelectionSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('catalog_selections')
    .insert({
      tenant_id: user.tenantId!,
      name: parsed.name,
      description: parsed.description || null,
      client_id: parsed.clientId || null,
      event_id: parsed.eventId || null,
      dish_ids: parsed.dishIds,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create selection: ${error.message}`)

  revalidatePath('/culinary/dish-index')
  revalidatePath('/menus/selections')
  return { selection: data }
}

/**
 * Update an existing catalog selection.
 */
export async function updateCatalogSelection(
  selectionId: string,
  input: z.infer<typeof UpdateSelectionSchema>
) {
  const user = await requireChef()
  const parsed = UpdateSelectionSchema.parse(input)
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {}
  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.description !== undefined) updates.description = parsed.description
  if (parsed.clientId !== undefined) updates.client_id = parsed.clientId
  if (parsed.eventId !== undefined) updates.event_id = parsed.eventId
  if (parsed.dishIds !== undefined) updates.dish_ids = parsed.dishIds

  const { error } = await db
    .from('catalog_selections')
    .update(updates)
    .eq('id', selectionId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update selection: ${error.message}`)

  revalidatePath('/culinary/dish-index')
  revalidatePath('/menus/selections')
}

/**
 * Share a catalog selection: generate token and public URL.
 */
export async function shareCatalogSelection(
  selectionId: string,
  expiresInDays?: number
): Promise<{ token: string; url: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify selection belongs to chef
  const { data: sel, error: selError } = await db
    .from('catalog_selections')
    .select('id, status, dish_ids')
    .eq('id', selectionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (selError || !sel) throw new Error('Selection not found')
  if (!sel.dish_ids?.length) throw new Error('Selection has no dishes')

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await db
    .from('catalog_selections')
    .update({
      share_token: token,
      shared_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: 'shared',
    })
    .eq('id', selectionId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to share selection: ${error.message}`)

  revalidatePath('/culinary/dish-index')
  revalidatePath('/menus/selections')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  return {
    token,
    url: `${baseUrl}/catalog-pick/${token}`,
  }
}

/**
 * Get all catalog selections for the chef.
 */
export async function getCatalogSelections(): Promise<CatalogSelectionSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('catalog_selections')
    .select(
      `
      *,
      client:client_id(id, name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch selections: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    clientId: row.client_id,
    eventId: row.event_id,
    dishIds: row.dish_ids || [],
    shareToken: row.share_token,
    sharedAt: row.shared_at,
    expiresAt: row.expires_at,
    pickedDishIds: row.picked_dish_ids || [],
    pickedAt: row.picked_at,
    pickerName: row.picker_name,
    pickerNotes: row.picker_notes,
    menuId: row.menu_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientName: row.client?.name || null,
    dishCount: (row.dish_ids || []).length,
    pickedCount: (row.picked_dish_ids || []).length,
  }))
}

/**
 * Get a single catalog selection with its dishes.
 */
export async function getCatalogSelectionById(selectionId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: sel, error: selError } = await db
    .from('catalog_selections')
    .select(
      `
      *,
      client:client_id(id, name),
      event:event_id(id, occasion, event_date)
    `
    )
    .eq('id', selectionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (selError || !sel) return null

  // Fetch the dishes
  let dishes: any[] = []
  if (sel.dish_ids?.length) {
    const { data: dishData } = await db
      .from('dish_index')
      .select('*')
      .in('id', sel.dish_ids)
      .eq('tenant_id', user.tenantId!)

    dishes = dishData ?? []
  }

  return { selection: sel, dishes }
}

/**
 * Delete a draft catalog selection.
 */
export async function deleteCatalogSelection(selectionId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('catalog_selections')
    .delete()
    .eq('id', selectionId)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'draft')

  if (error) throw new Error(`Failed to delete selection: ${error.message}`)

  revalidatePath('/culinary/dish-index')
  revalidatePath('/menus/selections')
}

/**
 * Convert client picks into an event menu.
 * Creates a menu from the picked dishes and links to the event.
 */
export async function convertPicksToMenu(selectionId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the selection
  const { data: sel, error: selError } = await db
    .from('catalog_selections')
    .select('*')
    .eq('id', selectionId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (selError || !sel) throw new Error('Selection not found')
  if (!sel.picked_dish_ids?.length) throw new Error('No picks received yet')

  // Fetch the picked dishes from dish_index
  const { data: pickedDishes, error: dishError } = await db
    .from('dish_index')
    .select('*')
    .in('id', sel.picked_dish_ids)
    .eq('tenant_id', user.tenantId!)
    .order('course')

  if (dishError) throw new Error(`Failed to fetch picked dishes: ${dishError.message}`)
  if (!pickedDishes?.length) throw new Error('Picked dishes not found')

  // Create menu
  const { data: menu, error: menuError } = await db
    .from('menus')
    .insert({
      tenant_id: user.tenantId!,
      name: sel.name,
      description: sel.description || null,
      event_id: sel.event_id || null,
      client_id: sel.client_id || null,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (menuError) throw new Error(`Failed to create menu: ${menuError.message}`)

  // Create dishes from picked catalog entries
  for (let i = 0; i < pickedDishes.length; i++) {
    const dish = pickedDishes[i]
    await db.from('dishes').insert({
      tenant_id: user.tenantId!,
      menu_id: menu.id,
      course_number: i + 1,
      course_name: dish.course || `Course ${i + 1}`,
      name: dish.name,
      description: dish.description || null,
      dietary_tags: dish.dietary_tags || [],
      allergen_flags: dish.allergen_flags || [],
      chef_notes: dish.notes || null,
      photo_url: dish.photo_storage_path || null,
      plating_instructions: null,
      beverage_pairing: null,
      sort_order: i,
      created_by: user.id,
    })

    // Increment times_served on the catalog entry
    await db
      .from('dish_index')
      .update({ times_served: (dish.times_served || 0) + 1 })
      .eq('id', dish.id)
      .eq('tenant_id', user.tenantId!)
  }

  // Link menu to event if applicable
  if (sel.event_id) {
    await db
      .from('events')
      .update({ menu_id: menu.id })
      .eq('id', sel.event_id)
      .eq('tenant_id', user.tenantId!)
  }

  // Update selection status
  await db
    .from('catalog_selections')
    .update({ status: 'menu_created', menu_id: menu.id })
    .eq('id', selectionId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/culinary/dish-index')
  revalidatePath('/menus')
  revalidatePath('/menus/selections')
  if (sel.event_id) revalidatePath(`/events/${sel.event_id}`)

  return { menuId: menu.id }
}

// ─── Public Actions (no auth, token-based) ───────────────────────

/**
 * Get catalog selection data by share token (public, no auth).
 */
export async function getCatalogByToken(token: string): Promise<PublicCatalogData | null> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  await checkRateLimit(`catalog-pick:${ip}`, 60, 15 * 60 * 1000)

  const db: any = createAdminClient()

  // Fetch selection
  const { data: sel, error: selError } = await db
    .from('catalog_selections')
    .select(
      `
      id, tenant_id, name, description, dish_ids, status, expires_at,
      event:event_id(occasion, event_date),
      chef:tenant_id(business_name, first_name, last_name)
    `
    )
    .eq('share_token', token)
    .eq('status', 'shared')
    .single()

  if (selError || !sel) return null

  // Check expiry
  if (sel.expires_at && new Date(sel.expires_at) < new Date()) return null

  // Fetch dishes
  if (!sel.dish_ids?.length) return null

  const { data: dishes } = await db
    .from('dish_index')
    .select(
      'id, name, course, description, dietary_tags, allergen_flags, is_signature, photo_storage_path'
    )
    .in('id', sel.dish_ids)
    .eq('tenant_id', sel.tenant_id)
    .order('course')
    .order('name')

  const chef = sel.chef as any
  const event = sel.event as any

  return {
    selectionName: sel.name,
    chefName:
      chef?.business_name || [chef?.first_name, chef?.last_name].filter(Boolean).join(' ') || null,
    description: sel.description,
    eventDate: event?.event_date || null,
    eventOccasion: event?.occasion || null,
    dishes: (dishes ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      course: d.course,
      description: d.description,
      dietaryTags: d.dietary_tags || [],
      allergenFlags: d.allergen_flags || [],
      isSig: d.is_signature || false,
      photoUrl: d.photo_storage_path || null,
    })),
  }
}

/**
 * Submit client picks for a catalog selection (public, no auth).
 */
export async function submitCatalogPicks(input: z.infer<typeof SubmitPicksSchema>) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  await checkRateLimit(`catalog-submit:${ip}`, 30, 15 * 60 * 1000)

  const parsed = SubmitPicksSchema.parse(input)
  const db: any = createAdminClient()

  // Verify token
  const { data: sel, error: selError } = await db
    .from('catalog_selections')
    .select('id, tenant_id, dish_ids, status, expires_at')
    .eq('share_token', parsed.token)
    .eq('status', 'shared')
    .single()

  if (selError || !sel) throw new Error('Selection not found or already used')
  if (sel.expires_at && new Date(sel.expires_at) < new Date()) {
    throw new Error('This selection link has expired')
  }

  // Verify all picked dishes are in the selection
  const validIds = new Set(sel.dish_ids || [])
  const invalidPicks = parsed.dishIds.filter((id) => !validIds.has(id))
  if (invalidPicks.length > 0) {
    throw new Error('Some selected dishes are not in this selection')
  }

  // Save picks
  const { error } = await db
    .from('catalog_selections')
    .update({
      picked_dish_ids: parsed.dishIds,
      picked_at: new Date().toISOString(),
      picker_name: parsed.name,
      picker_notes: parsed.notes || null,
      status: 'picks_received',
    })
    .eq('id', sel.id)

  if (error) throw new Error(`Failed to submit picks: ${error.message}`)

  // TODO: Fire notification to chef when notification category for catalog picks is added

  return { success: true, pickedCount: parsed.dishIds.length }
}
