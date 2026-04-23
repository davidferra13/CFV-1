'use server'

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type { Json } from '@/types/database'
import type { HubPoll, HubPollOption, HubPollType } from './types'
import { getNextRank, summarizeHubPollVotes } from './menu-poll-core'

const CreatePollSchema = z.object({
  groupId: z.string().uuid(),
  profileToken: z.string().uuid(),
  question: z.string().min(1).max(300),
  poll_type: z.enum(['single_choice', 'multi_choice', 'ranked_choice']).optional(),
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

type ActiveVoteRow = {
  id: string
  option_id: string
  profile_id: string
  rank: number | null
  revoked_at: string | null
}

type PollOptionRow = {
  id: string
  poll_id: string
  label: string
  metadata: Record<string, unknown> | null
  sort_order: number
  option_type?: 'standard' | 'opt_out'
  dish_index_id?: string | null
}

type PollRow = {
  id: string
  group_id: string
  created_by_profile_id: string
  message_id: string | null
  question: string
  poll_type: HubPollType
  is_closed: boolean
  closes_at: string | null
  created_at: string
  poll_scope?: 'general' | 'menu_course'
  event_id?: string | null
  source_menu_id?: string | null
  source_revision_id?: string | null
  course_number?: number | null
  course_name?: string | null
  allow_opt_out?: boolean
  max_selections?: number | null
  locked_option_id?: string | null
  locked_at?: string | null
  locked_by_profile_id?: string | null
  lock_reason?: string | null
}

export async function createHubPoll(input: z.infer<typeof CreatePollSchema>): Promise<HubPoll> {
  const validated = CreatePollSchema.parse(input)
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', validated.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: membership } = await db
    .from('hub_group_members')
    .select('can_post')
    .eq('group_id', validated.groupId)
    .eq('profile_id', profile.id)
    .single()

  if (!membership || !membership.can_post) {
    throw new Error('No permission to create polls')
  }

  const { data: poll, error: pollError } = await db
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

  const optionInserts = validated.options.map((option, index) => ({
    poll_id: poll.id,
    label: option.label,
    metadata: (option.metadata ?? null) as Json,
    sort_order: index,
  }))

  const { data: options, error: optionError } = await db
    .from('hub_poll_options')
    .insert(optionInserts)
    .select('*')

  if (optionError) throw new Error(`Failed to create poll options: ${optionError.message}`)

  const { data: message } = await db
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

  if (message) {
    await db.from('hub_polls').update({ message_id: message.id }).eq('id', poll.id)
  }

  return {
    ...(poll as PollRow),
    options: ((options ?? []) as PollOptionRow[]).map((option) => ({
      ...option,
      voted_by_me: false,
      vote_count: 0,
      first_choice_count: 0,
      score: 0,
      ranked_by_me: null,
    })),
    total_votes: 0,
    participant_count: 0,
    total_selections: 0,
    winning_option_ids: [],
  }
}

export async function voteOnPoll(input: {
  pollId: string
  optionId: string
  profileToken: string
}): Promise<void> {
  await mutatePollBallot({ ...input, intent: 'toggle' })
}

export async function removeVote(input: {
  pollId: string
  optionId: string
  profileToken: string
}): Promise<void> {
  await mutatePollBallot({ ...input, intent: 'remove' })
}

export async function getPoll(pollId: string, viewerProfileId?: string): Promise<HubPoll | null> {
  const db = createServerClient({ admin: true })

  const { data: poll, error } = await db.from('hub_polls').select('*').eq('id', pollId).single()
  if (error || !poll) return null

  const { data: options } = await db
    .from('hub_poll_options')
    .select('*')
    .eq('poll_id', pollId)
    .order('sort_order', { ascending: true })

  const { data: votes } = await db
    .from('hub_poll_votes')
    .select('option_id, profile_id, rank, revoked_at')
    .eq('poll_id', pollId)

  const { options: summarizedOptions, summary } = summarizeHubPollVotes({
    options: ((options ?? []) as PollOptionRow[]).map((option) => ({
      ...option,
      option_type: option.option_type ?? 'standard',
    })),
    votes: (votes ?? []) as ActiveVoteRow[],
    pollType: (poll as PollRow).poll_type,
    viewerProfileId,
  })

  return {
    ...(poll as PollRow),
    options: summarizedOptions as HubPollOption[],
    total_votes: summary.participantCount,
    participant_count: summary.participantCount,
    total_selections: summary.totalSelections,
    winning_option_ids: summary.winningOptionIds,
  }
}

export async function closePoll(input: { pollId: string; profileToken: string }): Promise<void> {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: poll } = await db
    .from('hub_polls')
    .select('group_id, created_by_profile_id')
    .eq('id', input.pollId)
    .single()

  if (!poll) throw new Error('Poll not found')

  const isCreator = poll.created_by_profile_id === profile.id
  if (!isCreator) {
    const { data: membership } = await db
      .from('hub_group_members')
      .select('role')
      .eq('group_id', poll.group_id)
      .eq('profile_id', profile.id)
      .single()

    if (!membership || !['owner', 'admin', 'chef'].includes(membership.role)) {
      throw new Error('Only the poll creator or group admins can close polls')
    }
  }

  await db.from('hub_polls').update({ is_closed: true }).eq('id', input.pollId)
}

async function mutatePollBallot(input: {
  pollId: string
  optionId: string
  profileToken: string
  intent: 'toggle' | 'remove'
}) {
  const db = createServerClient({ admin: true })

  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', input.profileToken)
    .single()

  if (!profile) throw new Error('Invalid profile token')

  const { data: poll } = await db
    .from('hub_polls')
    .select('id, group_id, poll_type, is_closed, closes_at, max_selections, locked_option_id')
    .eq('id', input.pollId)
    .single()

  if (!poll) throw new Error('Poll not found')
  if (poll.is_closed || poll.locked_option_id) throw new Error('Poll is closed')
  if (poll.closes_at && new Date(poll.closes_at) <= new Date()) {
    throw new Error('Poll is closed')
  }

  const { data: membership } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', poll.group_id)
    .eq('profile_id', profile.id)
    .single()

  if (!membership) throw new Error('Not a member of this group')

  const { data: options } = await db
    .from('hub_poll_options')
    .select('id, option_type')
    .eq('poll_id', input.pollId)
    .order('sort_order', { ascending: true })

  const optionMap = new Map(
    ((options ?? []) as Array<{ id: string; option_type: string | null }>).map((option) => [
      option.id,
      option.option_type ?? 'standard',
    ])
  )

  const targetOptionType = optionMap.get(input.optionId)
  if (!targetOptionType) {
    throw new Error('Poll option not found')
  }

  const { data: currentVotes } = await db
    .from('hub_poll_votes')
    .select('id, option_id, profile_id, rank, revoked_at')
    .eq('poll_id', input.pollId)
    .eq('profile_id', profile.id)
    .is('revoked_at', null)
    .order('rank', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  const activeVotes = (currentVotes ?? []) as ActiveVoteRow[]
  const nextSelections = computeNextSelections({
    currentVotes: activeVotes,
    optionMap,
    targetOptionId: input.optionId,
    targetOptionType,
    pollType: poll.poll_type as HubPollType,
    maxSelections: poll.max_selections ?? null,
    intent: input.intent,
  })

  const now = new Date().toISOString()

  if (activeVotes.length > 0) {
    await db
      .from('hub_poll_votes')
      .update({ revoked_at: now })
      .in(
        'id',
        activeVotes.map((vote) => vote.id)
      )
  }

  if (nextSelections.length === 0) return

  const ballotId = crypto.randomUUID()
  const insertRows = nextSelections.map((selection) => ({
    ballot_id: ballotId,
    poll_id: input.pollId,
    option_id: selection.optionId,
    profile_id: profile.id,
    rank: selection.rank,
  }))

  const { error: voteError } = await db.from('hub_poll_votes').insert(insertRows)
  if (voteError) {
    throw new Error(`Failed to vote: ${voteError.message}`)
  }
}

function computeNextSelections(input: {
  currentVotes: ActiveVoteRow[]
  optionMap: Map<string, string>
  targetOptionId: string
  targetOptionType: string
  pollType: HubPollType
  maxSelections: number | null
  intent: 'toggle' | 'remove'
}) {
  const withoutOptOut = input.currentVotes.filter(
    (vote) => input.optionMap.get(vote.option_id) !== 'opt_out'
  )
  const hasTarget = input.currentVotes.some((vote) => vote.option_id === input.targetOptionId)

  if (input.intent === 'remove') {
    return normalizeSelections(
      input.currentVotes.filter((vote) => vote.option_id !== input.targetOptionId),
      input.pollType
    )
  }

  if (input.targetOptionType === 'opt_out') {
    if (hasTarget && input.currentVotes.length === 1) return []
    return [{ optionId: input.targetOptionId, rank: null }]
  }

  if (input.pollType === 'single_choice') {
    if (hasTarget && withoutOptOut.length === 1) return []
    return [{ optionId: input.targetOptionId, rank: null }]
  }

  if (input.pollType === 'multi_choice') {
    if (hasTarget) {
      return input.currentVotes
        .filter((vote) => vote.option_id !== input.targetOptionId)
        .filter((vote) => input.optionMap.get(vote.option_id) !== 'opt_out')
        .map((vote) => ({ optionId: vote.option_id, rank: null }))
    }

    const currentSelections = withoutOptOut.map((vote) => ({ optionId: vote.option_id, rank: null }))
    if (input.maxSelections && currentSelections.length >= input.maxSelections) {
      throw new Error(`You can select up to ${input.maxSelections} options`)
    }
    return [...currentSelections, { optionId: input.targetOptionId, rank: null }]
  }

  const rankedSelections = normalizeSelections(withoutOptOut, 'ranked_choice')
  if (hasTarget) {
    return normalizeSelections(
      rankedSelections.filter((vote) => vote.optionId !== input.targetOptionId),
      'ranked_choice'
    )
  }

  if (input.maxSelections && rankedSelections.length >= input.maxSelections) {
    throw new Error(`You can rank up to ${input.maxSelections} options`)
  }

  return normalizeSelections(
    [
      ...rankedSelections.map((vote) => ({ option_id: vote.optionId, rank: vote.rank })),
      { option_id: input.targetOptionId, rank: getNextRank(rankedSelections) },
    ],
    'ranked_choice'
  )
}

function normalizeSelections(
  selections: Array<
    | { optionId: string; rank: number | null }
    | { option_id: string; rank: number | null }
    | ActiveVoteRow
  >,
  pollType: HubPollType
) {
  if (pollType !== 'ranked_choice') {
    return selections.map((selection) => ({
      optionId: 'optionId' in selection ? selection.optionId : selection.option_id,
      rank: null,
    }))
  }

  return selections.map((selection, index) => ({
    optionId: 'optionId' in selection ? selection.optionId : selection.option_id,
    rank: index + 1,
  }))
}
