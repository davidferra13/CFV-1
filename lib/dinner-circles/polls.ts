'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireClient, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function getCallerProfile(db: any, userId: string, entityId: string): Promise<string> {
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .or(`auth_user_id.eq.${userId},client_id.eq.${entityId}`)
    .maybeSingle()
  if (!profile) throw new Error('Hub profile not found')
  return profile.id as string
}

async function assertMembership(
  db: any,
  circleId: string,
  profileId: string
): Promise<{ role: string }> {
  const { data: member } = await db
    .from('hub_group_members')
    .select('role')
    .eq('group_id', circleId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (!member) throw new Error('You are not a member of this circle')
  return member as { role: string }
}

async function getCircleTenantId(db: any, circleId: string): Promise<string> {
  const { data: circle } = await db
    .from('hub_groups')
    .select('tenant_id')
    .eq('id', circleId)
    .maybeSingle()
  if (!circle) throw new Error('Circle not found')
  if (!circle.tenant_id) throw new Error('Circle missing tenant context')
  return circle.tenant_id as string
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PollOptionSchema = z.object({
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
})

const CreatePollSchema = z.object({
  circleId: z.string().uuid(),
  question: z.string().min(1).max(500),
  options: z.array(PollOptionSchema).min(2).max(10),
  pollType: z
    .enum(['theme', 'playlist', 'arrival_window', 'bring_list', 'celebration', 'add_on', 'general'])
    .default('general'),
  closeAt: z.string().datetime().optional(),
  resultVisibility: z.enum(['public', 'after_close', 'host_only']).default('after_close'),
  allowVoteChange: z.boolean().default(true),
  maxVotesPerMember: z.number().int().min(1).max(5).default(1),
})

const CastVoteSchema = z.object({
  circleId: z.string().uuid(),
  pollId: z.string().uuid(),
  optionIndex: z.number().int().min(0),
})

const UpdateVoteSchema = z.object({
  circleId: z.string().uuid(),
  pollId: z.string().uuid(),
  optionIndex: z.number().int().min(0),
})

const ClosePollSchema = z.object({
  circleId: z.string().uuid(),
  pollId: z.string().uuid(),
})

const SetFinalDecisionSchema = z.object({
  circleId: z.string().uuid(),
  pollId: z.string().uuid(),
  finalChoice: z.number().int().min(0),
  finalChoiceNote: z.string().max(1000).optional(),
  requiresChefReview: z.boolean().default(false),
})

const GetPollsSchema = z.object({
  circleId: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Guard: no poll outcome mutates chef scope without review task
// ---------------------------------------------------------------------------

const CHEF_SCOPE_TYPES: string[] = []
// Note: poll_type values that could affect chef scope (menu items, pricing add-ons)
// are gated by requiresChefReview = true. Enforce at setFinalDecision.

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Create a poll. Host, co_host, or member with can_post may create. */
export async function createPoll(input: z.infer<typeof CreatePollSchema>) {
  const user = await requireClient()
  const validated = CreatePollSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const { data: memberRow } = await db
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.circleId)
    .eq('profile_id', profileId)
    .maybeSingle()

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost && !memberRow?.can_post) {
    throw new Error('You do not have permission to create polls in this circle')
  }

  // add-on type polls require chef review
  const requiresChefReview = validated.pollType === 'add_on'

  const { data, error } = await db
    .from('dinner_circle_polls')
    .insert({
      circle_id: validated.circleId,
      question: validated.question,
      options: validated.options,
      poll_type: validated.pollType,
      close_at: validated.closeAt ?? null,
      created_by: profileId,
      result_visibility: validated.resultVisibility,
      allow_vote_change: validated.allowVoteChange,
      max_votes_per_member: validated.maxVotesPerMember,
      requires_chef_review: requiresChefReview,
      tenant_id: tenantId,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create poll: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true, pollId: data.id }
}

/** Cast a vote. Enforces one vote per member by default. */
export async function castVote(input: z.infer<typeof CastVoteSchema>) {
  const user = await requireClient()
  const validated = CastVoteSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data: poll } = await db
    .from('dinner_circle_polls')
    .select('id, options, is_closed, close_at, max_votes_per_member')
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!poll) throw new Error('Poll not found')
  if (poll.is_closed) throw new Error('This poll is closed')
  if (poll.close_at && new Date(poll.close_at) < new Date()) {
    throw new Error('This poll has expired')
  }

  const options = poll.options as { label: string }[]
  if (validated.optionIndex < 0 || validated.optionIndex >= options.length) {
    throw new Error('Invalid option index')
  }

  // Check existing vote
  const { data: existingVote } = await db
    .from('dinner_circle_poll_votes')
    .select('id')
    .eq('poll_id', validated.pollId)
    .eq('voter_id', profileId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (existingVote) throw new Error('You have already voted. Use updateVote to change your vote.')

  const { error } = await db.from('dinner_circle_poll_votes').insert({
    poll_id: validated.pollId,
    circle_id: validated.circleId,
    voter_id: profileId,
    option_index: validated.optionIndex,
    tenant_id: tenantId,
  })

  if (error) throw new Error(`Failed to cast vote: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Update an existing vote (only if poll allows vote changes and is still open). */
export async function updateVote(input: z.infer<typeof UpdateVoteSchema>) {
  const user = await requireClient()
  const validated = UpdateVoteSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data: poll } = await db
    .from('dinner_circle_polls')
    .select('id, options, is_closed, allow_vote_change, close_at')
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!poll) throw new Error('Poll not found')
  if (poll.is_closed) throw new Error('Poll is closed')
  if (!poll.allow_vote_change) throw new Error('This poll does not allow vote changes')
  if (poll.close_at && new Date(poll.close_at) < new Date()) {
    throw new Error('Poll has expired')
  }

  const options = poll.options as { label: string }[]
  if (validated.optionIndex < 0 || validated.optionIndex >= options.length) {
    throw new Error('Invalid option index')
  }

  const { error } = await db
    .from('dinner_circle_poll_votes')
    .update({ option_index: validated.optionIndex, updated_at: new Date().toISOString() })
    .eq('poll_id', validated.pollId)
    .eq('voter_id', profileId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update vote: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/** Close a poll (host or chef only). */
export async function closePoll(input: z.infer<typeof ClosePollSchema>) {
  const user = await requireClient()
  const validated = ClosePollSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost) throw new Error('Only a host can close a poll')

  const { data: poll } = await db
    .from('dinner_circle_polls')
    .select('id, is_closed')
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!poll) throw new Error('Poll not found')
  if (poll.is_closed) throw new Error('Poll is already closed')

  const { error } = await db
    .from('dinner_circle_polls')
    .update({
      is_closed: true,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to close poll: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true }
}

/**
 * Set the final decision on a poll (host only).
 * Outcomes that affect chef scope (add_on type) require chef review before applying.
 */
export async function setFinalDecision(input: z.infer<typeof SetFinalDecisionSchema>) {
  const user = await requireClient()
  const validated = SetFinalDecisionSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  const membership = await assertMembership(db, validated.circleId, profileId)

  const isHost = ['owner', 'host', 'co_host'].includes(membership.role)
  if (!isHost) throw new Error('Only a host can set a final decision')

  const { data: poll } = await db
    .from('dinner_circle_polls')
    .select('id, options, poll_type, requires_chef_review')
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!poll) throw new Error('Poll not found')

  const options = poll.options as { label: string }[]
  if (validated.finalChoice < 0 || validated.finalChoice >= options.length) {
    throw new Error('Invalid option index')
  }

  // Guard: add_on poll outcomes cannot force chef scope/pricing changes without review
  if (poll.poll_type === 'add_on' || poll.requires_chef_review || validated.requiresChefReview) {
    // Create a chef review task (note: this is a stub; implement with notification system)
    // For now, mark the decision as pending chef review
    const { error } = await db
      .from('dinner_circle_polls')
      .update({
        final_choice: validated.finalChoice,
        final_choice_note: `PENDING CHEF REVIEW: ${validated.finalChoiceNote ?? ''}`,
        requires_chef_review: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.pollId)
      .eq('circle_id', validated.circleId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(`Failed to set decision: ${error.message}`)
    revalidatePath(`/my-hub/g`)
    return { success: true, status: 'pending_chef_review' }
  }

  const { error } = await db
    .from('dinner_circle_polls')
    .update({
      final_choice: validated.finalChoice,
      final_choice_note: validated.finalChoiceNote ?? null,
      is_closed: true,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to set decision: ${error.message}`)

  revalidatePath(`/my-hub/g`)
  return { success: true, status: 'decided' }
}

/** Get all polls for a circle (member-visible). */
export async function getCirclePolls(input: z.infer<typeof GetPollsSchema>) {
  const user = await requireClient()
  const validated = GetPollsSchema.parse(input)
  const db: any = createServerClient()

  const tenantId = await getCircleTenantId(db, validated.circleId)
  const profileId = await getCallerProfile(db, user.id, user.entityId)
  await assertMembership(db, validated.circleId, profileId)

  const { data: polls, error } = await db
    .from('dinner_circle_polls')
    .select('*, dinner_circle_poll_votes(voter_id, option_index)')
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch polls: ${error.message}`)

  // Apply result visibility filter
  const visible = (polls ?? []).map((poll: any) => {
    const callerVote = (poll.dinner_circle_poll_votes ?? []).find(
      (v: any) => v.voter_id === profileId
    )
    const canSeeResults =
      poll.result_visibility === 'public' ||
      (poll.result_visibility === 'after_close' && poll.is_closed)

    return {
      ...poll,
      caller_vote: callerVote ?? null,
      votes: canSeeResults ? poll.dinner_circle_poll_votes : [],
      dinner_circle_poll_votes: undefined,
    }
  })

  return { success: true, polls: visible }
}

/** Chef: approve a pending-review poll decision. */
export async function chefApprovePollDecision(input: z.infer<typeof ClosePollSchema>) {
  const user = await requireChef()
  const validated = ClosePollSchema.parse(input)
  const db: any = createServerClient()

  // Verify chef owns this circle's tenant
  const tenantId = await getCircleTenantId(db, validated.circleId)
  if (user.tenantId !== tenantId) throw new Error('Unauthorized')

  const { error } = await db
    .from('dinner_circle_polls')
    .update({
      requires_chef_review: false,
      is_closed: true,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.pollId)
    .eq('circle_id', validated.circleId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to approve decision: ${error.message}`)

  revalidatePath(`/circles`)
  return { success: true }
}
