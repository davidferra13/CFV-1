import type { HubPollOption, HubPollType } from './types'

export type ActiveHubPollVote = {
  option_id: string
  profile_id: string
  rank: number | null
  revoked_at?: string | null
}

export type HubPollSummary = {
  participantCount: number
  totalSelections: number
  winningOptionIds: string[]
}

type SummarizeHubPollVotesInput = {
  options: Array<
    Pick<HubPollOption, 'id' | 'option_type'> & {
      vote_count?: number
      first_choice_count?: number
      score?: number
      voted_by_me?: boolean
      ranked_by_me?: number | null
    }
  >
  votes: ActiveHubPollVote[]
  pollType: HubPollType
  viewerProfileId?: string
}

export function summarizeHubPollVotes(
  input: SummarizeHubPollVotesInput
): {
  options: Array<
    SummarizeHubPollVotesInput['options'][number] & {
      vote_count: number
      first_choice_count: number
      score: number
      voted_by_me: boolean
      ranked_by_me: number | null
    }
  >
  summary: HubPollSummary
} {
  const activeVotes = input.votes.filter((vote) => !vote.revoked_at)
  const participantIds = new Set(activeVotes.map((vote) => vote.profile_id))
  const optionCount = Math.max(
    input.options.filter((option) => option.option_type !== 'opt_out').length,
    1
  )

  const optionMap = new Map(
    input.options.map((option) => [
      option.id,
      {
        ...option,
        vote_count: 0,
        first_choice_count: 0,
        score: 0,
        voted_by_me: false,
        ranked_by_me: null as number | null,
      },
    ])
  )

  for (const vote of activeVotes) {
    const option = optionMap.get(vote.option_id)
    if (!option) continue

    option.vote_count += 1
    if (vote.rank === 1) {
      option.first_choice_count += 1
    }

    option.score +=
      input.pollType === 'ranked_choice'
        ? Math.max(optionCount - ((vote.rank ?? optionCount) - 1), 1)
        : 1

    if (input.viewerProfileId && vote.profile_id === input.viewerProfileId) {
      option.voted_by_me = true
      option.ranked_by_me = vote.rank ?? null
    }
  }

  const summarizedOptions = Array.from(optionMap.values())
  const countField = input.pollType === 'ranked_choice' ? 'score' : 'vote_count'
  const candidates = summarizedOptions.filter((option) => option.option_type !== 'opt_out')
  const winningScore =
    candidates.length > 0
      ? Math.max(...candidates.map((option) => option[countField] ?? 0))
      : 0

  return {
    options: summarizedOptions,
    summary: {
      participantCount: participantIds.size,
      totalSelections: activeVotes.length,
      winningOptionIds:
        winningScore > 0
          ? candidates
              .filter((option) => (option[countField] ?? 0) === winningScore)
              .map((option) => option.id)
          : [],
    },
  }
}

export function buildMenuPollQuestion(courseName: string) {
  const trimmed = courseName.trim()
  return trimmed ? `Choose the ${trimmed} course` : 'Choose this course'
}

export function getNextRank(votes: Array<Pick<ActiveHubPollVote, 'rank' | 'revoked_at'>>) {
  const activeRanks = votes
    .filter((vote) => !vote.revoked_at && vote.rank !== null)
    .map((vote) => vote.rank as number)

  return activeRanks.length > 0 ? Math.max(...activeRanks) + 1 : 1
}
