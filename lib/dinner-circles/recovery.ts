'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireClient, requireAuth } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Look up the caller's hub guest profile ID; required for participant actions. */
async function getCallerProfile(db: any, userId: string, entityId: string): Promise<string> {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .or(`auth_user_id.eq.${userId},client_id.eq.${entityId}`)
    .maybeSingle()

  if (!profile) throw new Error('Hub profile not found for this account')
  return profile.id as string
}

/** Verify the caller is a member of the given circle. Returns member row. */
async function assertMembership(
  db: any,
  circleId: string,
  profileId: string
): Promise<{ role: string; can_post: boolean }> {
  const { data: member } = await db
    .from('hub_group_members')
    .select('role, can_post')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!member) throw new Error('You are not a member of this circle')
  return member as { role: string; can_post: boolean }
}

/** Load circle tenant_id for scoping; verifies circle exists. */
async function getCircleTenantId(db: any, circleId: string): Promise<string> {
  const { data: circle } = await db
    .from('hub_groups')
    .select('tenant_id')
    .eq('id', circleId)
    .maybeSingle()

  if (!circle) throw new Error('Circle not found')
  if (!circle.tenant_id) throw new Error('Circle is missing tenant context')
  return circle.tenant_id as string
}

/** Write an action log entry. */
async function logAction(
  db: any,
  params: {
    circleId: string
    actionType: string
    actorId: string
    actorRole: string
    entityId?: string
    entityType?: string
    beforeState?: Record<string, unknown>
    afterState?: Record<string, unknown>
    reversible?: boolean
    notes?: string
    tenantId: string
  }
) {
  await db.from('dinner_circle_action_log').insert({
    circle_id: params.circleId,
    action_type: params.actionType,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    entity_id: params.entityId ?? null,
    entity_type: params.entityType ?? null,
    before_state: params.beforeState ?? null,
    after_state: params.afterState ?? null,
    reversible: params.reversible ?? true,
    notes: params.notes ?? null,
    tenant_id: params.tenantId,
  })
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const EditPostSchema = z.object({
  circleId: z.string().uuid(),
  postId: z.string().uuid(),
  newBody: z.string().min(1).max(4000),
})

const DeletePostSchema = z.object({
  circleId: z.string().uuid(),
  postId: z.string().uuid(),
})

const ChangeRsvpSchema = z.object({
  circleId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: z.enum(['attending', 'declined', 'maybe', 'waitlist']),
  note: z.string().max(500).optional(),
})

const UndoBringClaimSchema = z.object({
  circleId: z.string().uuid(),
  bringItemId: z.string().uuid(),
})

const CancelBroadcastSchema = z.object({
  circleId: z.string().uuid(),
  broadcastId: z.string().uuid(),
})

const RetractPollVoteSchema = z.object({
  circleId: z.string().uuid(),
  pollId: z.string().uuid(),
})

const GetHistorySchema = z.object({
  circleId: z.string().uuid(),
  entityId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Edit a post body within the allowed change window (10 min). Logs audit. */
export async function editPost(input: z.infer<typeof EditPostSchema>) {
  const user = await requireClient()
  const validated = EditPostSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  // Load the post
  const { data: post } = await db
    .from('hub_messages')
    .select('id, body, author_profile_id, created_at')
    .eq('id', validated.postId)
    .eq('group_id', validated.circleId)
    .maybeSingle()

  if (!post) throw new Error('Post not found')
  if (post.author_profile_id !== profileId) throw new Error('You can only edit your own posts')

  // 10-minute change window
  const createdAt = new Date(post.created_at).getTime()
  if (Date.now() - createdAt > 10 * 60 * 1000) {
    throw new Error('Edit window has closed (10 minutes after posting)')
  }

  const { error } = await db
    .from('hub_messages')
    .update({ body: validated.newBody, edited_at: new Date().toISOString() })
    .eq('id', validated.postId)
    .eq('group_id', validated.circleId)

  if (error) throw new Error(`Failed to edit post: ${error.message}`)

  await logAction(db, {
    circleId: validated.circleId,
    actionType: 'edit_post',
    actorId: profileId,
    actorRole: membership.role,
    entityId: validated.postId,
    entityType: 'post',
    beforeState: { body: post.body },
    afterState: { body: validated.newBody },
    tenantId,
  })

  revalidatePath(`/my-hub/g`)
  revalidatePath(`/circles`)
  return { success: true }
}

/** Delete a post (soft delete with tombstone). Logs audit. */
export async function deletePost(input: z.infer<typeof DeletePostSchema>) {
  const user = await requireClient()
  const validated = DeletePostSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: post } = await db
    .from('hub_messages')
    .select('id, body, author_profile_id')
    .eq('id', validated.postId)
    .eq('group_id', validated.circleId)
    .maybeSingle()

  if (!post) throw new Error('Post not found')

  const isHost =
    membership.role === 'owner' || membership.role === 'host' || membership.role === 'co_host'
  if (post.author_profile_id !== profileId && !isHost) {
    throw new Error('You can only delete your own posts (or be a host)')
  }

  const { error } = await db
    .from('hub_messages')
    .update({ deleted_at: new Date().toISOString(), body: '[deleted]' })
    .eq('id', validated.postId)
    .eq('group_id', validated.circleId)

  if (error) throw new Error(`Failed to delete post: ${error.message}`)

  await logAction(db, {
    circleId: validated.circleId,
    actionType: 'delete_post',
    actorId: profileId,
    actorRole: membership.role,
    entityId: validated.postId,
    entityType: 'post',
    beforeState: { body: post.body },
    afterState: { body: '[deleted]' },
    reversible: false,
    tenantId,
  })

  revalidatePath(`/my-hub/g`)
  revalidatePath(`/circles`)
  return { success: true }
}

/** Change RSVP status for the caller on an event. Logs audit. */
export async function changeRsvp(input: z.infer<typeof ChangeRsvpSchema>) {
  const user = await requireClient()
  const validated = ChangeRsvpSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  // Upsert RSVP
  const { data: existing } = await db
    .from('hub_group_rsvps')
    .select('id, status')
    .eq('group_id', validated.circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing) {
    await db
      .from('hub_group_rsvps')
      .update({
        status: validated.status,
        note: validated.note ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await db.from('hub_group_rsvps').insert({
      group_id: validated.circleId,
      profile_id: profileId,
      event_id: validated.eventId,
      status: validated.status,
      note: validated.note ?? null,
      tenant_id: tenantId,
    })
  }

  await logAction(db, {
    circleId: validated.circleId,
    actionType: 'change_rsvp',
    actorId: profileId,
    actorRole: membership.role,
    entityId: validated.eventId,
    entityType: 'rsvp',
    beforeState: existing ? { status: existing.status } : undefined,
    afterState: { status: validated.status },
    tenantId,
  })

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Undo a bring-list claim (unclaim an item the caller previously claimed). */
export async function undoBringClaim(input: z.infer<typeof UndoBringClaimSchema>) {
  const user = await requireClient()
  const validated = UndoBringClaimSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: item } = await db
    .from('dinner_circle_bring_items')
    .select('id, item_name, claimed_by, brought_at')
    .eq('id', validated.bringItemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!item) throw new Error('Bring item not found')
  if (item.claimed_by !== profileId) throw new Error('You did not claim this item')
  if (item.brought_at) throw new Error('Cannot undo a claim after marking as brought')

  const { error } = await db
    .from('dinner_circle_bring_items')
    .update({ claimed_by: null, claimed_at: null, updated_at: new Date().toISOString() })
    .eq('id', validated.bringItemId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to undo claim: ${error.message}`)

  await logAction(db, {
    circleId: validated.circleId,
    actionType: 'unclaim_bring_item',
    actorId: profileId,
    actorRole: membership.role,
    entityId: validated.bringItemId,
    entityType: 'bring_item',
    beforeState: { claimed_by: profileId, item_name: item.item_name },
    afterState: { claimed_by: null },
    tenantId,
  })

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Cancel a scheduled broadcast (only sender or host can cancel). */
export async function cancelBroadcast(input: z.infer<typeof CancelBroadcastSchema>) {
  const user = await requireClient()
  const validated = CancelBroadcastSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: broadcast } = await db
    .from('dinner_circle_broadcasts')
    .select('id, status, sender_id')
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!broadcast) throw new Error('Broadcast not found')
  if (broadcast.status !== 'scheduled' && broadcast.status !== 'draft') {
    throw new Error('Only scheduled or draft broadcasts can be cancelled')
  }

  const isHost =
    membership.role === 'owner' || membership.role === 'host' || membership.role === 'co_host'
  if (broadcast.sender_id !== profileId && !isHost) {
    throw new Error('Only the sender or a host can cancel this broadcast')
  }

  const { error } = await db
    .from('dinner_circle_broadcasts')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.broadcastId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to cancel broadcast: ${error.message}`)

  await logAction(db, {
    circleId: validated.circleId,
    actionType: 'cancel_broadcast',
    actorId: profileId,
    actorRole: membership.role,
    entityId: validated.broadcastId,
    entityType: 'broadcast',
    beforeState: { status: broadcast.status },
    afterState: { status: 'cancelled' },
    tenantId,
  })

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Retract a poll vote (only if poll allows vote changes and is still open). */
export async function retractPollVote(input: z.infer<typeof RetractPollVoteSchema>) {
  const user = await requireClient()
  const validated = RetractPollVoteSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: poll } = await db
    .from('dinner_circle_polls')
    .select('id, is_closed, allow_vote_change')
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!poll) throw new Error('Poll not found')
  if (poll.is_closed) throw new Error('Poll is closed; votes cannot be retracted')
  if (!poll.allow_vote_change) throw new Error('This poll does not allow vote changes')

  const { data: vote } = await db
    .from('dinner_circle_poll_votes')
    .select('id, option_index')
    .eq('poll_id', validated.pollId)
    .eq('voter_id', profileId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!vote) throw new Error('No vote found to retract')

  const { error } = await db
    .from('dinner_circle_poll_votes')
    .delete()
    .eq('poll_id', validated.pollId)
    .eq('voter_id', profileId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to retract vote: ${error.message}`)

  await logAction(db, {
    circleId: validated.circleId,
    actionType: 'retract_poll_vote',
    actorId: profileId,
    actorRole: membership.role,
    entityId: validated.pollId,
    entityType: 'poll',
    beforeState: { option_index: vote.option_index },
    afterState: { retracted: true },
    tenantId,
  })

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Get change history for a circle (or filtered by entity). */
export async function getCircleHistory(input: z.infer<typeof GetHistorySchema>) {
  const user = await requireClient()
  const validated = GetHistorySchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  let query = db
    .from('dinner_circle_action_log')
    .select('*')
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(validated.limit)

  if (validated.entityId) {
    query = query.eq('entity_id', validated.entityId)
  }
  if (validated.entityType) {
    query = query.eq('entity_type', validated.entityType)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch history: ${error.message}`)

  return { success: true, history: data ?? [] }
}
