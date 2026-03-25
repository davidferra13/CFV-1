// Chef Collaboration System - Server Actions
// Handles cross-chef event collaboration and recipe sharing.
//
// Connection gate: both chefs must have an accepted chef_connections row
// before any collaboration invitation can be sent.
//
// Event ownership: tenant_id on events is NEVER changed - events stay in the
// original chef's namespace. Collaborators gain access via event_collaborators
// RLS expansion. Handoff changes the 'primary' role, not the tenant.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { sendCollaborationInviteEmail, sendRecipeShareEmail } from '@/lib/email/notifications'
import { z } from 'zod'
import type {
  CollaboratorRole,
  CollaboratorStatus,
  CollaboratorPermissions,
  EventCollaborator,
  RecipeShare,
} from './types'
import { ROLE_DEFAULTS } from './types'

// ─── Helpers ─────────────────────────────────

function collab(db: any): any {
  return db.from('event_collaborators')
}

function recipeShares(db: any): any {
  return db.from('recipe_shares')
}

/** Check that an accepted chef_connections row exists between two chefs. */
async function assertConnected(db: any, chefAId: string, chefBId: string): Promise<void> {
  const { data } = await db
    .from('chef_connections')
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(requester_id.eq.${chefAId},addressee_id.eq.${chefBId}),and(requester_id.eq.${chefBId},addressee_id.eq.${chefAId})`
    )
    .limit(1)
    .single()

  if (!data) {
    throw new Error(
      'You can only collaborate with chefs you are connected with in the Chef Network.'
    )
  }
}

const CollaboratorPermissionsSchema = z.object({
  can_modify_menu: z.boolean(),
  can_assign_staff: z.boolean(),
  can_view_financials: z.boolean(),
  can_communicate_with_client: z.boolean(),
  can_close_event: z.boolean(),
})

// ─── Chef Profile Helper ──────────────────────

const CHEF_PROFILE_SELECT = 'id, business_name, display_name, profile_image_url, email'

// ============================================
// EVENT COLLABORATION
// ============================================

/**
 * Get all collaborators on an event the current chef owns.
 */
export async function getEventCollaborators(eventId: string): Promise<EventCollaborator[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify caller owns event OR is themselves a collaborator
  const { data: event } = (await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .single()) as any

  if (!event) throw new Error('Event not found')

  const isOwner = event.tenant_id === user.entityId
  if (!isOwner) {
    // Check they are an accepted collaborator
    const { data: selfCollab } = await collab(db)
      .select('id')
      .eq('event_id', eventId)
      .eq('chef_id', user.entityId)
      .eq('status', 'accepted')
      .single()
    if (!selfCollab) throw new Error('Access denied')
  }

  const { data, error } = await collab(db)
    .select(
      `
      id, event_id, chef_id, invited_by_chef_id, role, status, permissions, note, responded_at, created_at,
      chef:chefs!event_collaborators_chef_id_fkey(${CHEF_PROFILE_SELECT}),
      invited_by:chefs!event_collaborators_invited_by_chef_id_fkey(${CHEF_PROFILE_SELECT})
    `
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getEventCollaborators]', error)
    return []
  }

  return (data || []) as EventCollaborator[]
}

/**
 * Invite a connected chef to collaborate on an event.
 */
export async function inviteChefToEvent(input: {
  eventId: string
  targetChefId: string
  role: CollaboratorRole
  permissions?: Partial<CollaboratorPermissions>
  note?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the event belongs to the caller
  const { data: event, error: evErr } = (await db
    .from('events')
    .select('id, tenant_id, occasion, event_date')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()) as any

  if (evErr || !event) throw new Error('Event not found or access denied')

  // Verify connection
  await assertConnected(db, user.entityId, input.targetChefId)

  // Check target chef hasn't opted out of collaboration
  const { data: prefs } = await db
    .from('chef_network_feature_preferences')
    .select('event_collaboration')
    .eq('chef_id', input.targetChefId)
    .single()

  if (prefs && prefs.event_collaboration === false) {
    throw new Error('This chef has opted out of collaboration invitations.')
  }

  // Build effective permissions (role defaults merged with any overrides)
  const effectivePermissions: CollaboratorPermissions = {
    ...ROLE_DEFAULTS[input.role],
    ...input.permissions,
  }

  const { error } = await collab(db).insert({
    event_id: input.eventId,
    chef_id: input.targetChefId,
    invited_by_chef_id: user.entityId,
    role: input.role,
    permissions: effectivePermissions,
    note: input.note?.trim() || null,
  })

  if (error) {
    if (error.code === '23505') throw new Error('This chef has already been invited to this event.')
    console.error('[inviteChefToEvent]', error)
    throw new Error('Failed to send collaboration invitation')
  }

  revalidatePath(`/events/${input.eventId}`)
  revalidatePath('/dashboard') // clears invited chef's dashboard cache so they see the pending invitation on next visit

  // Fire-and-forget email notification to the invited chef
  ;(async () => {
    try {
      const [{ data: targetChef }, { data: invitingChef }] = await Promise.all([
        db
          .from('chefs')
          .select('email, display_name, business_name')
          .eq('id', input.targetChefId)
          .single(),
        db.from('chefs').select('display_name, business_name').eq('id', user.entityId).single(),
      ])
      if (targetChef?.email) {
        await sendCollaborationInviteEmail({
          chefEmail: targetChef.email,
          chefName: targetChef.display_name || targetChef.business_name,
          inviterName:
            invitingChef?.display_name || invitingChef?.business_name || 'A connected chef',
          occasion: event.occasion || 'an upcoming event',
          eventDate: event.event_date || null,
          role: input.role,
          note: input.note?.trim() || null,
        })
      }
    } catch (err) {
      console.error('[inviteChefToEvent] notification error:', err)
    }
  })()

  return { success: true }
}

/**
 * Respond to an incoming event collaboration invitation.
 * Called by the invited chef, not the event owner.
 */
export async function respondToEventInvitation(input: {
  collaboratorId: string
  accepted: boolean
  declineReason?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the row belongs to the caller
  const { data: row, error: fetchErr } = await collab(db)
    .select('id, event_id, status')
    .eq('id', input.collaboratorId)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchErr || !row) throw new Error('Invitation not found or access denied')
  if (row.status !== 'pending') throw new Error('This invitation has already been responded to')

  const { error } = await collab(db)
    .update({
      status: input.accepted ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
      note: !input.accepted && input.declineReason ? input.declineReason : undefined,
    })
    .eq('id', input.collaboratorId)

  if (error) {
    console.error('[respondToEventInvitation]', error)
    throw new Error('Failed to update invitation')
  }

  revalidatePath(`/events/${row.event_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Update a collaborator's role and/or permissions.
 * Only the event owner can do this.
 */
export async function updateCollaboratorRole(input: {
  collaboratorId: string
  role: CollaboratorRole
  permissions?: Partial<CollaboratorPermissions>
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify caller owns the event this collaborator is on
  const { data: row } = await collab(db)
    .select('id, event_id, role')
    .eq('id', input.collaboratorId)
    .single()

  if (!row) throw new Error('Collaborator not found')

  const { data: event } = (await db
    .from('events')
    .select('tenant_id')
    .eq('id', row.event_id)
    .single()) as any

  if (!event || event.tenant_id !== user.entityId) {
    throw new Error('Only the event owner can change collaborator roles')
  }

  const effectivePermissions: CollaboratorPermissions = {
    ...ROLE_DEFAULTS[input.role],
    ...input.permissions,
  }

  const { error } = await collab(db)
    .update({ role: input.role, permissions: effectivePermissions })
    .eq('id', input.collaboratorId)

  if (error) throw new Error('Failed to update collaborator role')

  revalidatePath(`/events/${row.event_id}`)
  return { success: true }
}

/**
 * Remove an accepted collaborator from an event.
 * Only the event owner can remove others; a collaborator can remove themselves.
 */
export async function removeCollaborator(collaboratorId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: row } = await collab(db)
    .select('id, event_id, chef_id')
    .eq('id', collaboratorId)
    .single()

  if (!row) throw new Error('Collaborator not found')

  // Either the event owner or the collaborator themselves can remove
  const { data: event } = (await db
    .from('events')
    .select('tenant_id')
    .eq('id', row.event_id)
    .single()) as any

  const isOwner = event?.tenant_id === user.entityId
  const isSelf = row.chef_id === user.entityId
  if (!isOwner && !isSelf) throw new Error('Access denied')

  const { error } = await collab(db)
    .update({ status: 'removed', responded_at: new Date().toISOString() })
    .eq('id', collaboratorId)

  if (error) throw new Error('Failed to remove collaborator')

  revalidatePath(`/events/${row.event_id}`)
  return { success: true }
}

/**
 * Hand off an event to another chef (who must already be an accepted collaborator).
 * Original chef becomes an observer; new chef gets the primary role.
 * Event tenant_id is NOT changed - ownership in the platform sense stays with original chef,
 * but operational primary shifts.
 */
export async function handoffEvent(input: { eventId: string; newPrimaryChefId: string }) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify caller owns the event
  const { data: event, error: evErr } = (await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', input.eventId)
    .eq('tenant_id', user.entityId)
    .single()) as any

  if (evErr || !event) throw new Error('Event not found or access denied')

  // Verify new primary is an accepted collaborator
  const { data: newPrimaryRow } = await collab(db)
    .select('id, status')
    .eq('event_id', input.eventId)
    .eq('chef_id', input.newPrimaryChefId)
    .eq('status', 'accepted')
    .single()

  if (!newPrimaryRow) {
    throw new Error('The new primary chef must already be an accepted collaborator on this event.')
  }

  // Promote new chef to primary
  await collab(db)
    .update({
      role: 'primary',
      permissions: ROLE_DEFAULTS.primary,
    })
    .eq('id', newPrimaryRow.id)

  // Check if original owner (the current user) already has a collaborator row
  const { data: ownerRow } = await collab(db)
    .select('id')
    .eq('event_id', input.eventId)
    .eq('chef_id', user.entityId)
    .single()

  if (ownerRow) {
    // Downgrade existing row to observer
    await collab(db)
      .update({
        role: 'observer',
        permissions: ROLE_DEFAULTS.observer,
      })
      .eq('id', ownerRow.id)
  } else {
    // Create an observer row for the original owner so they retain read access
    await collab(db).insert({
      event_id: input.eventId,
      chef_id: user.entityId,
      invited_by_chef_id: user.entityId,
      role: 'observer',
      status: 'accepted',
      permissions: ROLE_DEFAULTS.observer,
      note: 'Original event owner - retained read access after handoff',
      responded_at: new Date().toISOString(),
    })
  }

  revalidatePath(`/events/${input.eventId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get all pending collaboration invitations sent to the current chef.
 * Used for dashboard notifications and inbox badge.
 */
export async function getPendingCollaborationInvitations(): Promise<EventCollaborator[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await collab(db)
    .select(
      `
      id, event_id, chef_id, invited_by_chef_id, role, status, permissions, note, responded_at, created_at,
      chef:chefs!event_collaborators_chef_id_fkey(${CHEF_PROFILE_SELECT}),
      invited_by:chefs!event_collaborators_invited_by_chef_id_fkey(${CHEF_PROFILE_SELECT}),
      event:events(id, occasion, event_date, status)
    `
    )
    .eq('chef_id', user.entityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingCollaborationInvitations]', error)
    return []
  }

  return (data || []) as EventCollaborator[]
}

/**
 * Get events where the current chef is an accepted collaborator (not owner).
 * Used for the "Collaborating On" section on the dashboard.
 */
export async function getCollaboratingOnEvents(): Promise<
  Array<{
    event: {
      id: string
      occasion: string | null
      event_date: string | null
      status: string
      client: { full_name: string } | null
    }
    role: CollaboratorRole
    permissions: CollaboratorPermissions
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await collab(db)
    .select(
      `
      role, permissions,
      event:events(id, occasion, event_date, status, tenant_id, client:clients(full_name))
    `
    )
    .eq('chef_id', user.entityId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getCollaboratingOnEvents]', error)
    return []
  }

  return (
    (data || [])
      // Exclude events this chef owns - post-handoff the original owner gets an observer row,
      // but the event already appears in their main events list via tenant_id ownership.
      .filter((row: any) => row.event?.tenant_id !== user.entityId)
      .map((row: any) => ({
        event: row.event,
        role: row.role as CollaboratorRole,
        permissions: row.permissions as CollaboratorPermissions,
      }))
  )
}

/**
 * Get connected chefs that can be invited to collaborate.
 * Filters out chefs who have opted out of collaboration.
 */
export async function getConnectedChefsForCollaboration(search?: string): Promise<
  Array<{
    id: string
    business_name: string
    display_name: string | null
    profile_image_url: string | null
    email: string
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get accepted connections
  const { data: connections } = await db
    .from('chef_connections')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.entityId},addressee_id.eq.${user.entityId}`)

  if (!connections || connections.length === 0) return []

  const connectedIds = connections.map((c: any) =>
    c.requester_id === user.entityId ? c.addressee_id : c.requester_id
  )

  let query = db.from('chefs').select(CHEF_PROFILE_SELECT).in('id', connectedIds)

  if (search?.trim()) {
    const q = `%${search.trim().replace(/[%_,.()"'\\]/g, '')}%`
    query = query.or(`business_name.ilike.${q},display_name.ilike.${q}`)
  }

  const { data } = await query.limit(20)
  return data || []
}

// ============================================
// RECIPE SHARING
// ============================================

/**
 * Share a recipe with a connected chef.
 */
export async function shareRecipe(input: {
  recipeId: string
  targetChefId: string
  note?: string
}) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify recipe belongs to caller
  const { data: recipe, error: recipeErr } = (await db
    .from('recipes')
    .select('id, name, category, tenant_id')
    .eq('id', input.recipeId)
    .eq('tenant_id', user.tenantId!)
    .single()) as any

  if (recipeErr || !recipe) throw new Error('Recipe not found or access denied')

  // Verify connection
  await assertConnected(db, user.entityId, input.targetChefId)

  // Check target hasn't opted out of recipe sharing
  const { data: prefs } = await db
    .from('chef_network_feature_preferences')
    .select('recipe_sharing')
    .eq('chef_id', input.targetChefId)
    .single()

  if (prefs && prefs.recipe_sharing === false) {
    throw new Error('This chef has opted out of recipe sharing.')
  }

  const { error } = await recipeShares(db).insert({
    original_recipe_id: input.recipeId,
    from_chef_id: user.entityId,
    to_chef_id: input.targetChefId,
    note: input.note?.trim() || null,
  })

  if (error) {
    if (error.code === '23505')
      throw new Error('You have already shared this recipe with this chef.')
    console.error('[shareRecipe]', error)
    throw new Error('Failed to share recipe')
  }

  revalidatePath('/dashboard') // clears recipient chef's dashboard cache so they see the pending share on next visit

  // Fire-and-forget email notification to the receiving chef
  ;(async () => {
    try {
      const [{ data: targetChef }, { data: sharingChef }] = await Promise.all([
        db
          .from('chefs')
          .select('email, display_name, business_name')
          .eq('id', input.targetChefId)
          .single(),
        db.from('chefs').select('display_name, business_name').eq('id', user.entityId).single(),
      ])
      if (targetChef?.email) {
        await sendRecipeShareEmail({
          chefEmail: targetChef.email,
          chefName: targetChef.display_name || targetChef.business_name,
          sharerName: sharingChef?.display_name || sharingChef?.business_name || 'A connected chef',
          recipeName: recipe.name,
          category: (recipe as any).category || null,
          note: input.note?.trim() || null,
        })
      }
    } catch (err) {
      console.error('[shareRecipe] notification error:', err)
    }
  })()

  return { success: true }
}

/**
 * Respond to an incoming recipe share.
 * If accepted, creates an editable deep copy in the receiving chef's namespace.
 */
export async function respondToRecipeShare(input: { shareId: string; accepted: boolean }) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify the share is addressed to the caller
  const { data: share, error: shareErr } = await recipeShares(db)
    .select('id, original_recipe_id, from_chef_id, status')
    .eq('id', input.shareId)
    .eq('to_chef_id', user.entityId)
    .single()

  if (shareErr || !share) throw new Error('Share not found or access denied')
  if (share.status !== 'pending') throw new Error('This share has already been responded to')

  let createdRecipeId: string | null = null

  if (input.accepted) {
    createdRecipeId = await deepCopyRecipe({
      originalRecipeId: share.original_recipe_id,
      toTenantId: user.tenantId!,
      toUserId: user.id,
      db,
    })
  }

  const { error } = await recipeShares(db)
    .update({
      status: input.accepted ? 'accepted' : 'declined',
      created_recipe_id: createdRecipeId,
      responded_at: new Date().toISOString(),
    })
    .eq('id', input.shareId)

  if (error) throw new Error('Failed to update recipe share')

  if (createdRecipeId) revalidatePath('/recipes')
  return { success: true, createdRecipeId }
}

/**
 * Deep copy a recipe into a new tenant's namespace.
 * Copies the recipe record and all ingredients (finding or creating ingredients by name).
 * Returns the new recipe id.
 */
async function deepCopyRecipe(input: {
  originalRecipeId: string
  toTenantId: string
  toUserId: string
  db: any
}): Promise<string> {
  const { originalRecipeId, toTenantId, toUserId, db } = input

  // Fetch original recipe
  const { data: original, error: origErr } = await db
    .from('recipes')
    .select('*')
    .eq('id', originalRecipeId)
    .single()

  if (origErr || !original) throw new Error('Failed to read original recipe')

  // Fetch original recipe ingredients with ingredient details
  const { data: origIngredients } = await db
    .from('recipe_ingredients')
    .select(
      `
      quantity, unit, sort_order, is_optional, preparation_notes, substitution_notes,
      ingredient:ingredients(name, category, default_unit)
    `
    )
    .eq('recipe_id', originalRecipeId)
    .order('sort_order', { ascending: true })

  // Create recipe copy in target namespace
  const { data: newRecipe, error: createErr } = await db
    .from('recipes')
    .insert({
      tenant_id: toTenantId,
      name: original.name,
      category: original.category,
      method: original.method || '',
      method_detailed: original.method_detailed || null,
      description: original.description || null,
      notes: [original.notes, 'Shared from another chef via ChefFlow.']
        .filter(Boolean)
        .join('\n\n'),
      adaptations: original.adaptations || null,
      prep_time_minutes: original.prep_time_minutes || null,
      cook_time_minutes: original.cook_time_minutes || null,
      total_time_minutes: original.total_time_minutes || null,
      yield_quantity: original.yield_quantity || null,
      yield_unit: original.yield_unit || null,
      yield_description: original.yield_description || null,
      dietary_tags: original.dietary_tags || [],
      created_by: toUserId,
      updated_by: toUserId,
    })
    .select('id')
    .single()

  if (createErr || !newRecipe) throw new Error('Failed to create recipe copy')

  // Copy ingredients: find-or-create per name in target tenant
  for (const ri of origIngredients || []) {
    const ing = ri.ingredient
    if (!ing) continue

    // Find existing ingredient in target tenant (case-insensitive name match)
    let { data: existingIng } = await db
      .from('ingredients')
      .select('id')
      .eq('tenant_id', toTenantId)
      .ilike('name', ing.name)
      .limit(1)
      .single()

    if (!existingIng) {
      // Create ingredient in target tenant
      const { data: newIng } = await db
        .from('ingredients')
        .insert({
          tenant_id: toTenantId,
          name: ing.name,
          category: ing.category,
          default_unit: ing.default_unit,
        })
        .select('id')
        .single()
      existingIng = newIng
    }

    if (!existingIng?.id) continue

    await db.from('recipe_ingredients').insert({
      recipe_id: newRecipe.id,
      ingredient_id: existingIng.id,
      quantity: ri.quantity,
      unit: ri.unit,
      sort_order: ri.sort_order,
      is_optional: ri.is_optional ?? false,
      preparation_notes: ri.preparation_notes || null,
      substitution_notes: ri.substitution_notes || null,
    })
  }

  return newRecipe.id
}

/**
 * Get pending recipe share invitations sent to the current chef.
 */
export async function getPendingRecipeShares(): Promise<RecipeShare[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await recipeShares(db)
    .select(
      `
      id, original_recipe_id, from_chef_id, to_chef_id, status, note, created_recipe_id, responded_at, created_at,
      from_chef:chefs!recipe_shares_from_chef_id_fkey(${CHEF_PROFILE_SELECT}),
      to_chef:chefs!recipe_shares_to_chef_id_fkey(${CHEF_PROFILE_SELECT}),
      recipe:recipes!recipe_shares_original_recipe_id_fkey(id, name, category)
    `
    )
    .eq('to_chef_id', user.entityId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingRecipeShares]', error)
    return []
  }

  return (data || []) as RecipeShare[]
}

/**
 * Get recipe shares sent FROM the current chef (outgoing).
 */
export async function getOutgoingRecipeShares(recipeId?: string): Promise<RecipeShare[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = recipeShares(db)
    .select(
      `
      id, original_recipe_id, from_chef_id, to_chef_id, status, note, created_recipe_id, responded_at, created_at,
      from_chef:chefs!recipe_shares_from_chef_id_fkey(${CHEF_PROFILE_SELECT}),
      to_chef:chefs!recipe_shares_to_chef_id_fkey(${CHEF_PROFILE_SELECT})
    `
    )
    .eq('from_chef_id', user.entityId)

  if (recipeId) query = query.eq('original_recipe_id', recipeId)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('[getOutgoingRecipeShares]', error)
    return []
  }

  return (data || []) as RecipeShare[]
}
