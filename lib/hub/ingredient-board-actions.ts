// Ingredient Availability Board - Server Actions
// Co-hosts declare available ingredients; chef sees sourcing picture.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export type IngredientCategory =
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'pantry'
  | 'herb'
  | 'grain'
  | 'other'

export type IngredientStatus = 'available' | 'limited' | 'unavailable' | 'sourced_externally'

export interface IngredientBoardItem {
  id: string
  board_id: string
  ingredient_name: string
  category: IngredientCategory | null
  offered_by_profile_id: string | null
  offered_by_name: string | null
  status: IngredientStatus
  quantity_notes: string | null
  available_from: string | null
  available_to: string | null
  chef_notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface IngredientBoard {
  id: string
  group_id: string
  event_id: string | null
  tenant_id: string
  created_at: string
  items: IngredientBoardItem[]
}

/**
 * Get or create the ingredient board for a dinner circle.
 */
export async function getOrCreateIngredientBoard(input: {
  groupId: string
  eventId?: string
}): Promise<IngredientBoard> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Check existing board owned by current user
  const { data: existing } = await db
    .from('circle_ingredient_board')
    .select('*')
    .eq('group_id', input.groupId)
    .eq('tenant_id', user.entityId)
    .maybeSingle()

  let board = existing

  // If no board owned by user, check if there's one for this group (collaborator access)
  if (!board) {
    const { data: anyBoard } = await db
      .from('circle_ingredient_board')
      .select('*')
      .eq('group_id', input.groupId)
      .maybeSingle()

    if (anyBoard && anyBoard.event_id) {
      // Verify collaborator access
      const { data: collab } = await db
        .from('event_collaborators')
        .select('id')
        .eq('event_id', anyBoard.event_id)
        .eq('chef_id', user.entityId)
        .eq('status', 'accepted')
        .maybeSingle()

      if (collab) board = anyBoard
    }
  }

  // Create new board if still none (only owner can create)
  if (!board) {
    const { data: created, error } = await db
      .from('circle_ingredient_board')
      .insert({
        group_id: input.groupId,
        event_id: input.eventId || null,
        tenant_id: user.entityId,
      })
      .select('*')
      .single()

    if (error) throw new Error('Failed to create ingredient board')
    board = created
  }

  // Fetch items
  const { data: items } = await db
    .from('circle_ingredient_items')
    .select('*')
    .eq('board_id', board.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return { ...board, items: items || [] }
}

/**
 * Add an ingredient item to the board.
 * Accessible by board owner OR accepted collaborators on the linked event.
 */
export async function addIngredientItem(input: {
  boardId: string
  ingredientName: string
  category?: IngredientCategory
  offeredByName?: string
  offeredByProfileId?: string
  quantityNotes?: string
  availableFrom?: string
  availableTo?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify board belongs to chef or user is a collaborator
  const { data: board } = await db
    .from('circle_ingredient_board')
    .select('id, group_id, tenant_id, event_id')
    .eq('id', input.boardId)
    .single()

  if (!board) return { success: false, error: 'Board not found' }

  const isOwner = board.tenant_id === user.entityId
  if (!isOwner) {
    if (!board.event_id) return { success: false, error: 'Access denied' }
    const { data: collab } = await db
      .from('event_collaborators')
      .select('id')
      .eq('event_id', board.event_id)
      .eq('chef_id', user.entityId)
      .eq('status', 'accepted')
      .maybeSingle()
    if (!collab) return { success: false, error: 'Access denied' }
  }

  // Get max sort order
  const { data: maxItem } = await db
    .from('circle_ingredient_items')
    .select('sort_order')
    .eq('board_id', input.boardId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxItem?.sort_order ?? -1) + 1

  const { error } = await db.from('circle_ingredient_items').insert({
    board_id: input.boardId,
    ingredient_name: input.ingredientName.trim(),
    category: input.category || 'other',
    offered_by_profile_id: input.offeredByProfileId || null,
    offered_by_name: input.offeredByName || null,
    status: 'available',
    quantity_notes: input.quantityNotes || null,
    available_from: input.availableFrom || null,
    available_to: input.availableTo || null,
    sort_order: nextOrder,
  })

  if (error) return { success: false, error: 'Failed to add ingredient' }

  revalidatePath(`/hub`)
  return { success: true }
}

/**
 * Update an ingredient item (status, notes, quantity).
 * Accessible by the board owner OR accepted collaborators on the linked event.
 */
export async function updateIngredientItem(input: {
  itemId: string
  status?: IngredientStatus
  quantityNotes?: string
  chefNotes?: string
  category?: IngredientCategory
  offeredByName?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch item with board details
  const { data: item } = await db
    .from('circle_ingredient_items')
    .select(
      'id, board_id, ingredient_name, status, circle_ingredient_board!inner(tenant_id, event_id, group_id)'
    )
    .eq('id', input.itemId)
    .single()

  if (!item) return { success: false, error: 'Item not found' }

  const boardTenantId = item.circle_ingredient_board?.tenant_id
  const boardEventId = item.circle_ingredient_board?.event_id
  const isOwner = boardTenantId === user.entityId

  // If not the owner, check collaborator access
  if (!isOwner) {
    if (!boardEventId) return { success: false, error: 'Access denied' }

    const { data: collab } = await db
      .from('event_collaborators')
      .select('id, role')
      .eq('event_id', boardEventId)
      .eq('chef_id', user.entityId)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!collab) return { success: false, error: 'Access denied' }
  }

  const previousStatus = item.status
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.status !== undefined) updateData.status = input.status
  if (input.quantityNotes !== undefined) updateData.quantity_notes = input.quantityNotes
  if (input.chefNotes !== undefined) updateData.chef_notes = input.chefNotes
  if (input.category !== undefined) updateData.category = input.category
  if (input.offeredByName !== undefined) updateData.offered_by_name = input.offeredByName

  const { error } = await db
    .from('circle_ingredient_items')
    .update(updateData)
    .eq('id', input.itemId)

  if (error) return { success: false, error: 'Failed to update ingredient' }

  // Notify board owner if a collaborator changed status
  if (!isOwner && input.status && input.status !== previousStatus && boardTenantId) {
    void notifyIngredientStatusChange({
      ownerChefId: boardTenantId,
      ingredientName: item.ingredient_name,
      newStatus: input.status,
      changedByChefId: user.entityId!,
      eventId: boardEventId,
    })
  }

  revalidatePath(`/hub`)
  return { success: true }
}

/**
 * Notify the board owner when a collaborator changes ingredient status.
 * Non-blocking, fire-and-forget.
 */
async function notifyIngredientStatusChange(params: {
  ownerChefId: string
  ingredientName: string
  newStatus: IngredientStatus
  changedByChefId: string
  eventId: string | null
}) {
  try {
    const { createElement } = await import('react')
    const db: any = createServerClient({ admin: true })

    // Get collaborator name
    const { data: collab } = await db
      .from('chefs')
      .select('display_name, business_name')
      .eq('id', params.changedByChefId)
      .single()

    const collabName = collab?.business_name || collab?.display_name || 'Co-host'
    const statusLabel =
      params.newStatus === 'sourced_externally' ? 'needs sourcing' : params.newStatus

    // Get owner email
    const { data: owner } = await db
      .from('chefs')
      .select('email')
      .eq('id', params.ownerChefId)
      .single()

    if (!owner?.email) return

    const { sendEmail } = await import('@/lib/email/send')
    const { NotificationGenericEmail } = await import('@/lib/email/templates/notification-generic')

    const actionUrl = params.eventId
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/events/${params.eventId}?tab=tickets`
      : null

    await sendEmail({
      to: owner.email,
      subject: `${collabName} updated ingredient: ${params.ingredientName} is now ${statusLabel}`,
      react: createElement(NotificationGenericEmail, {
        title: `Ingredient Update: ${params.ingredientName}`,
        body: `${collabName} changed the status of "${params.ingredientName}" to ${statusLabel}. Check your ingredient board for the latest availability.`,
        actionUrl,
        actionLabel: 'View Event',
      }),
    })
  } catch (err) {
    console.error('[non-blocking] notifyIngredientStatusChange failed', err)
  }
}

/**
 * Remove an ingredient item from the board.
 */
export async function removeIngredientItem(input: {
  itemId: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: item } = await db
    .from('circle_ingredient_items')
    .select('id, board_id, circle_ingredient_board!inner(tenant_id)')
    .eq('id', input.itemId)
    .single()

  if (!item || item.circle_ingredient_board?.tenant_id !== user.entityId) {
    return { success: false, error: 'Item not found' }
  }

  const { error } = await db.from('circle_ingredient_items').delete().eq('id', input.itemId)

  if (error) return { success: false, error: 'Failed to remove ingredient' }

  revalidatePath(`/hub`)
  return { success: true }
}

/**
 * Bulk add ingredients (e.g. from a menu's ingredient list).
 */
export async function bulkAddIngredients(input: {
  boardId: string
  ingredients: { name: string; category?: IngredientCategory; quantity?: string }[]
}): Promise<{ success: boolean; added: number; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: board } = await db
    .from('circle_ingredient_board')
    .select('id')
    .eq('id', input.boardId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!board) return { success: false, added: 0, error: 'Board not found' }

  // Get existing names to avoid duplicates
  const { data: existing } = await db
    .from('circle_ingredient_items')
    .select('ingredient_name')
    .eq('board_id', input.boardId)

  const existingNames = new Set(
    (existing || []).map((e: any) => e.ingredient_name.toLowerCase().trim())
  )

  const newItems = input.ingredients
    .filter((i) => !existingNames.has(i.name.toLowerCase().trim()))
    .map((i, idx) => ({
      board_id: input.boardId,
      ingredient_name: i.name.trim(),
      category: i.category || 'other',
      status: 'available',
      quantity_notes: i.quantity || null,
      sort_order: (existing?.length || 0) + idx,
    }))

  if (newItems.length === 0) return { success: true, added: 0 }

  const { error } = await db.from('circle_ingredient_items').insert(newItems)

  if (error) return { success: false, added: 0, error: 'Failed to add ingredients' }

  revalidatePath(`/hub`)
  return { success: true, added: newItems.length }
}
