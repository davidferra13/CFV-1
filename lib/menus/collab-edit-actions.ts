// Collaborative Menu Editing: server actions for turn-based chef+client co-editing.
// Chef actions use requireChef(). Client actions use token-based auth via getClientPortalAccess().

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getClientPortalAccess } from '@/lib/client-portal/actions'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  CollabSession,
  CollabSessionStatus,
  EditSuggestion,
  EditorType,
  ReviewAction,
  SuggestionType,
} from './collab-edit-types'

// ---- Schemas ---------------------------------------------------------------

const SuggestionInputSchema = z.object({
  change_type: z.enum([
    'add_dish',
    'remove_dish',
    'swap_dish',
    'modify_component',
    'comment',
    'reorder',
    'add_course',
    'remove_course',
  ]),
  target_dish_id: z.string().uuid().nullable().optional(),
  target_course_name: z.string().max(200).nullable().optional(),
  target_course_number: z.number().int().nullable().optional(),
  change_data: z.record(z.string(), z.unknown()).default({}),
  sort_order: z.number().int().default(0),
})

type SuggestionInput = z.infer<typeof SuggestionInputSchema>

// ---- Chef Actions (requireChef) --------------------------------------------

/**
 * Chef initiates a collaborative editing session on a menu.
 * Supersedes any existing draft/submitted session for this menu.
 * Returns the session with a client_token for sharing.
 */
export async function createCollabSession(
  menuId: string,
  eventId: string
): Promise<{ session: CollabSession } | { error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify menu exists and belongs to tenant
  const { data: menu, error: menuErr } = await db
    .from('menus')
    .select('id, name')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()

  if (menuErr || !menu) return { error: 'Menu not found.' }

  // Verify event exists and belongs to tenant
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event) return { error: 'Event not found.' }

  // Supersede any existing active sessions for this menu
  await db
    .from('menu_collab_sessions')
    .update({
      status: 'superseded' as CollabSessionStatus,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'submitted'])

  // Capture base snapshot of current menu state
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, description, course_name, course_number, sort_order')
    .eq('menu_id', menuId)
    .is('deleted_at', null)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  const baseSnapshot = {
    menu_id: menuId,
    menu_name: menu.name,
    captured_at: new Date().toISOString(),
    dishes: dishes || [],
  }

  // Generate a unique client token for this session
  const clientToken = crypto.randomUUID()

  const { data: session, error: insertErr } = await db
    .from('menu_collab_sessions')
    .insert({
      menu_id: menuId,
      event_id: eventId,
      tenant_id: tenantId,
      editor_type: 'client' as EditorType,
      editor_id: tenantId, // Will be updated when client accesses
      version_number: 1,
      base_snapshot: baseSnapshot,
      current_turn: 'client' as EditorType,
      turn_changed_at: new Date().toISOString(),
      status: 'draft' as CollabSessionStatus,
      client_token: clientToken,
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (insertErr || !session) {
    return { error: 'Failed to create collaboration session.' }
  }

  revalidatePath('/menus')
  return { session }
}

/**
 * Chef retrieves all suggestions for a session.
 */
export async function getSuggestions(sessionId: string): Promise<EditSuggestion[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify session belongs to tenant
  const { data: session } = await db
    .from('menu_collab_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!session) return []

  const { data } = await db
    .from('menu_edit_suggestions')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return data || []
}

/**
 * Chef reviews a single suggestion: approve, reject, or counter-propose.
 */
export async function reviewSuggestion(
  suggestionId: string,
  action: ReviewAction,
  notes?: string,
  counterProposal?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get suggestion and verify session belongs to tenant
  const { data: suggestion } = await db
    .from('menu_edit_suggestions')
    .select('id, session_id, resolution')
    .eq('id', suggestionId)
    .maybeSingle()

  if (!suggestion) return { success: false, error: 'Suggestion not found.' }

  const { data: session } = await db
    .from('menu_collab_sessions')
    .select('id, status')
    .eq('id', suggestion.session_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!session) return { success: false, error: 'Session not found.' }
  if (session.status !== 'submitted') {
    return { success: false, error: 'Session is not awaiting review.' }
  }

  const resolutionMap: Record<ReviewAction, string> = {
    approve: 'approved',
    reject: 'rejected',
    counter_propose: 'modified',
  }

  const updateData: Record<string, unknown> = {
    resolution: resolutionMap[action],
    resolution_notes: notes || null,
    resolved_at: new Date().toISOString(),
  }

  if (action === 'counter_propose' && counterProposal) {
    updateData.counter_proposal = counterProposal
  }

  const { error: updateErr } = await db
    .from('menu_edit_suggestions')
    .update(updateData)
    .eq('id', suggestionId)

  if (updateErr) return { success: false, error: 'Failed to review suggestion.' }

  // If counter-proposed, pass turn back to client
  if (action === 'counter_propose') {
    await db
      .from('menu_collab_sessions')
      .update({
        current_turn: 'client' as EditorType,
        turn_changed_at: new Date().toISOString(),
        status: 'draft' as CollabSessionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', suggestion.session_id)
  }

  // Check if all suggestions resolved
  const { data: pending } = await db
    .from('menu_edit_suggestions')
    .select('id')
    .eq('session_id', suggestion.session_id)
    .eq('resolution', 'pending')
    .limit(1)

  if (!pending || pending.length === 0) {
    // All resolved; check if any were counter-proposed
    const { data: countered } = await db
      .from('menu_edit_suggestions')
      .select('id')
      .eq('session_id', suggestion.session_id)
      .eq('resolution', 'modified')
      .limit(1)

    if (countered && countered.length > 0) {
      // Turn passes back to client for counter-proposal review
      await db
        .from('menu_collab_sessions')
        .update({
          current_turn: 'client' as EditorType,
          turn_changed_at: new Date().toISOString(),
          status: 'draft' as CollabSessionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', suggestion.session_id)
    }
  }

  revalidatePath('/menus')
  return { success: true }
}

/**
 * Chef batch-applies all approved suggestions to the menu.
 * Creates a new version in menu_edit_history.
 */
export async function applyApprovedSuggestions(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify session
  const { data: session } = await db
    .from('menu_collab_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!session) return { success: false, error: 'Session not found.' }

  // Check no pending suggestions remain
  const { data: pending } = await db
    .from('menu_edit_suggestions')
    .select('id')
    .eq('session_id', sessionId)
    .eq('resolution', 'pending')
    .limit(1)

  if (pending && pending.length > 0) {
    return { success: false, error: 'Unresolved suggestions remain. Review all before applying.' }
  }

  // Get approved suggestions
  const { data: approved } = await db
    .from('menu_edit_suggestions')
    .select('*')
    .eq('session_id', sessionId)
    .eq('resolution', 'approved')
    .order('sort_order', { ascending: true })

  if (!approved || approved.length === 0) {
    // Nothing to apply; just close session
    await db
      .from('menu_collab_sessions')
      .update({
        status: 'rejected' as CollabSessionStatus,
        resolved_at: new Date().toISOString(),
        resolution_notes: 'No suggestions approved.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    revalidatePath('/menus')
    return { success: true }
  }

  // Apply each approved suggestion to the menu
  for (const s of approved) {
    const data = (s.change_data || {}) as Record<string, unknown>
    const changeType = s.change_type as SuggestionType

    if (changeType === 'add_dish') {
      await db.from('dishes').insert({
        menu_id: session.menu_id,
        tenant_id: tenantId,
        name: data.name || 'New Dish',
        description: data.description || null,
        course_name: s.target_course_name || (data.course_name as string) || null,
        course_number: s.target_course_number ?? (data.course_number as number) ?? null,
        sort_order: s.sort_order,
      })
    } else if (changeType === 'remove_dish' && s.target_dish_id) {
      await db
        .from('dishes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', s.target_dish_id)
        .eq('menu_id', session.menu_id)
    } else if (changeType === 'swap_dish' && s.target_dish_id) {
      const proposed = (data.proposed_dish || {}) as Record<string, unknown>
      await db
        .from('dishes')
        .update({
          name: proposed.name || 'Swapped Dish',
          description: proposed.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', s.target_dish_id)
        .eq('menu_id', session.menu_id)
    } else if (changeType === 'modify_component' && s.target_dish_id) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (data.new_value !== undefined && typeof data.field === 'string') {
        updates[data.field] = data.new_value
      }
      await db
        .from('dishes')
        .update(updates)
        .eq('id', s.target_dish_id)
        .eq('menu_id', session.menu_id)
    }
    // 'comment' type does not mutate menu
  }

  // Capture post-apply snapshot
  const { data: updatedDishes } = await db
    .from('dishes')
    .select('id, name, description, course_name, course_number, sort_order')
    .eq('menu_id', session.menu_id)
    .is('deleted_at', null)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  const proposedSnapshot = {
    menu_id: session.menu_id,
    captured_at: new Date().toISOString(),
    dishes: updatedDishes || [],
  }

  // Get next version number
  const { data: lastHistory } = await db
    .from('menu_edit_history')
    .select('version_number')
    .eq('menu_id', session.menu_id)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = (lastHistory?.[0]?.version_number ?? 0) + 1

  // Record history
  await db.from('menu_edit_history').insert({
    menu_id: session.menu_id,
    session_id: sessionId,
    version_number: nextVersion,
    snapshot: proposedSnapshot,
    change_summary: `${approved.length} suggestion(s) applied from collaborative session.`,
    author_type: 'chef' as EditorType,
    author_id: user.id,
  })

  // Mark session accepted
  await db
    .from('menu_collab_sessions')
    .update({
      status: 'accepted' as CollabSessionStatus,
      proposed_snapshot: proposedSnapshot,
      resolved_at: new Date().toISOString(),
      resolution_notes: `Applied ${approved.length} approved suggestion(s).`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  revalidatePath('/menus')
  return { success: true }
}

/**
 * Chef retrieves a collab session by ID.
 */
export async function getCollabSession(sessionId: string): Promise<CollabSession | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data } = await db
    .from('menu_collab_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return data || null
}

/**
 * Chef lists active collab sessions for an event.
 */
export async function getCollabSessionsForEvent(eventId: string): Promise<CollabSession[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data } = await db
    .from('menu_collab_sessions')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return data || []
}

// ---- Client Actions (token-based auth) -------------------------------------

/**
 * Client submits a suggestion to an active collab session. Token-based auth.
 */
export async function submitSuggestion(
  sessionId: string,
  suggestion: SuggestionInput,
  clientToken: string
): Promise<{ suggestion: EditSuggestion } | { error: string }> {
  const access = await getClientPortalAccess(clientToken)
  if (!access) return { error: 'Invalid or expired portal link.' }

  const parsed = SuggestionInputSchema.safeParse(suggestion)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || 'Invalid input.' }

  const db: any = createServerClient({ admin: true })

  // Verify session exists and accepts client input
  const { data: session } = await db
    .from('menu_collab_sessions')
    .select('id, status, current_turn, tenant_id, client_token')
    .eq('id', sessionId)
    .eq('tenant_id', access.tenantId)
    .maybeSingle()

  if (!session) return { error: 'Session not found.' }

  // Verify client token matches
  if (session.client_token !== clientToken) {
    // Also accept portal-based access for the same tenant
    const portalValid = session.tenant_id === access.tenantId
    if (!portalValid) return { error: 'Not authorized for this session.' }
  }

  if (session.status !== 'draft') {
    return { error: 'Session is not accepting suggestions right now.' }
  }

  if (session.current_turn !== 'client') {
    return { error: 'It is not your turn to edit.' }
  }

  // Rate limiting: max 50 suggestions per session
  const { count } = await db
    .from('menu_edit_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if ((count ?? 0) >= 50) {
    return { error: 'Maximum suggestions reached for this session.' }
  }

  const { data: created, error: insertErr } = await db
    .from('menu_edit_suggestions')
    .insert({
      session_id: sessionId,
      change_type: parsed.data.change_type,
      target_dish_id: parsed.data.target_dish_id || null,
      target_course_name: parsed.data.target_course_name || null,
      target_course_number: parsed.data.target_course_number ?? null,
      change_data: parsed.data.change_data,
      resolution: 'pending',
      sort_order: parsed.data.sort_order,
    })
    .select('*')
    .single()

  if (insertErr || !created) {
    return { error: 'Failed to submit suggestion.' }
  }

  // Update editor_id to the actual client who submitted
  await db
    .from('menu_collab_sessions')
    .update({
      editor_id: access.clientId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  revalidatePath('/menus')
  return { suggestion: created }
}

/**
 * Client submits all their suggestions (marks session as submitted, passes turn to chef).
 */
export async function submitCollabSession(
  sessionId: string,
  clientToken: string
): Promise<{ success: boolean; error?: string }> {
  const access = await getClientPortalAccess(clientToken)
  if (!access) return { success: false, error: 'Invalid or expired portal link.' }

  const db: any = createServerClient({ admin: true })

  const { data: session } = await db
    .from('menu_collab_sessions')
    .select('id, status, current_turn, tenant_id, client_token')
    .eq('id', sessionId)
    .eq('tenant_id', access.tenantId)
    .maybeSingle()

  if (!session) return { success: false, error: 'Session not found.' }
  if (session.status !== 'draft') {
    return { success: false, error: 'Session is not in draft state.' }
  }
  if (session.current_turn !== 'client') {
    return { success: false, error: 'It is not your turn.' }
  }

  // Must have at least one suggestion
  const { count } = await db
    .from('menu_edit_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if ((count ?? 0) === 0) {
    return { success: false, error: 'Add at least one suggestion before submitting.' }
  }

  const { error: updateErr } = await db
    .from('menu_collab_sessions')
    .update({
      status: 'submitted' as CollabSessionStatus,
      current_turn: 'chef' as EditorType,
      turn_changed_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (updateErr) return { success: false, error: 'Failed to submit session.' }

  revalidatePath('/menus')
  return { success: true }
}

/**
 * Client views the status of a collab session. Token-based auth.
 */
export async function getCollabSessionStatus(
  sessionId: string,
  clientToken: string
): Promise<
  | {
      session: CollabSession
      suggestions: EditSuggestion[]
    }
  | { error: string }
> {
  const access = await getClientPortalAccess(clientToken)
  if (!access) return { error: 'Invalid or expired portal link.' }

  const db: any = createServerClient({ admin: true })

  const { data: session } = await db
    .from('menu_collab_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', access.tenantId)
    .maybeSingle()

  if (!session) return { error: 'Session not found.' }

  const { data: suggestions } = await db
    .from('menu_edit_suggestions')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return {
    session,
    suggestions: suggestions || [],
  }
}
