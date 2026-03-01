'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/types/database'
import type { HubPoll, HubPollOption } from './types'

// ---------------------------------------------------------------------------
// Hub Polls — Theme voting, date picking, menu preferences
// ---------------------------------------------------------------------------

const CreatePollSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  question: z.string().min(1).max(300),
  poll_type: z.enum(['single_choice', 'multi_choice']).optional(),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(2)
    .max(10),
  closes_at: z.string().datetime().optional().nullable(),
})

/**
 * Create a poll in a hub group. Also posts a system message.
 */
export async function createHubPoll(input: z.infer<typeof CreatePollSchema>): Promise<HubPoll> {
  const validated = CreatePollSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id, display_name')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Verify membership
  const { data: membership } = await supabase
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !membership.can_post) {
    throw new Error('No permission to create polls')
  }

  // Create poll
  const { data: poll, error: pollError } = await supabase
    .from('hub_polls')
    .insert({
      group_id: validated.groupId,
      created_by_profile_id: profile.id,
      question: validated.question,
      poll_type: validated.poll_type ?? 'single_choice',
      closes_at: validated.closes_at ?? null,
    })
    .select('*')
    .single()

  if (pollError) throw new Error(`Failed to create poll: ${pollError.message}`)

  // Create options
  const optionInserts = validated.options.map((opt, i) => ({
    poll_id: poll.id,
    label: opt.label,
    metadata: (opt.metadata ?? null) as Json,
    sort_order: i,
  }))

  const { data: options, error: optError } = await supabase
    .from('hub_poll_options')
    .insert(optionInserts)
    .select('*')

  if (optError) throw new Error(`Failed to create poll options: ${optError.message}`)

  // Post a poll message to the thread
  const { data: message } = await supabase
    .from('hub_messages')
    .insert({
      group_id: validated.groupId,
      author_profile_id: profile.id,
      message_type: 'poll',
      body: validated.question,
      system_metadata: { poll_id: poll.id } as Json,
    })
    .select('id')
    .single()

  // Link message to poll
  if (message) {
    await supabase.from('hub_polls').update({ message_id: message.id }).eq('id', poll.id)
  }

  return {
    ...poll,
    options: (options ?? []) as HubPollOption[],
    total_votes: 0,
  } as HubPoll
}

/**
 * Vote on a poll option.
 */
export async function voteOnPoll(input: {
  pollId: string
  optionId: string
  profileToken: string
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  // Check poll is open
  const { data: poll } = await supabase
    .from('hub_polls')
    .select('is_closed, poll_type')
    .eq('id', input.pollId)
    .single()

  if (!poll) throw new Error('Poll not found')
  if (poll.is_closed) throw new Error('Poll is closed')

  // For single_choice, remove any existing vote first
  if (poll.poll_type === 'single_choice') {
    await supabase
      .from('hub_poll_votes')
      .delete()
      .eq('poll_id', input.pollId)
      .eq('profile_id', profile.id)
  }

  // Cast vote
  const { error } = await supabase.from('hub_poll_votes').insert({
    poll_id: input.pollId,
    option_id: input.optionId,
    profile_id: profile.id,
  })

  // Ignore duplicate (unique constraint)
  if (error && error.code !== '23505') {
    throw new Error(`Failed to vote: ${error.message}`)
  }
}

/**
 * Remove a vote from a poll option.
 */
export async function removeVote(input: {
  pollId: string
  optionId: string
  profileToken: string
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  await supabase
    .from('hub_poll_votes')
    .delete()
    .eq('poll_id', input.pollId)
    .eq('option_id', input.optionId)
    .eq('profile_id', profile.id)
}

/**
 * Get a poll with options and vote counts.
 */
export async function getPoll(pollId: string, viewerProfileId?: string): Promise<HubPoll | null> {
  const supabase = createServerClient({ admin: true })

  const { data: poll, error } = await supabase
    .from('hub_polls')
    .select('*')
    .eq('id', pollId)
    .single()

  if (error || !poll) return null

  // Get options
  const { data: options } = await supabase
    .from('hub_poll_options')
    .select('*')
    .eq('poll_id', pollId)
    .order('sort_order', { ascending: true })

  // Get vote counts per option
  const { data: votes } = await supabase
    .from('hub_poll_votes')
    .select('option_id, profile_id')
    .eq('poll_id', pollId)

  const voteCounts: Record<string, number> = {}
  const myVotes = new Set<string>()
  for (const v of votes ?? []) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1
    if (viewerProfileId && v.profile_id === viewerProfileId) {
      myVotes.add(v.option_id)
    }
  }

  const enrichedOptions = (options ?? []).map((o) => ({
    ...o,
    vote_count: voteCounts[o.id] ?? 0,
    voted_by_me: myVotes.has(o.id),
  })) as HubPollOption[]

  return {
    ...poll,
    options: enrichedOptions,
    total_votes: (votes ?? []).length,
  } as HubPoll
}

/**
 * Close a poll. Only creator or group owner/admin.
 */
export async function closePoll(input: { pollId: string; profileToken: string }): Promise<void> {
  const supabase = createServerClient({ admin: true })

  const { data: profile } = await supabase
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: poll } = await supabase
    .from('hub_polls')
    .select('group_id, created_by_profile_id')
    .eq('id', input.pollId)
    .single()

  if (!poll) throw new Error('Poll not found')

  // Check permission
  const isCreator = poll.created_by_profile_id === profile.id
  if (!isCreator) {
    const { data: membership } = await supabase
      .from('hub_group_members')
      .select('role')
      .eq('group_id', poll.group_id)
      .eq('profile_id', profile.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only the poll creator or group admins can close polls')
    }
  }

  await supabase.from('hub_polls').update({ is_closed: true }).eq('id', input.pollId)
}
