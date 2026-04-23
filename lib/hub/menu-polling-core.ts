export type MenuPollType = 'single_choice' | 'multi_choice' | 'ranked_choice'

export type MenuPollOptionType = 'standard' | 'opt_out'

export type MenuPollOptionInput = {
  id: string
  label: string
  optionType: MenuPollOptionType
  dishIndexId?: string | null
}

export type MenuPollVoteInput = {
  optionId: string
  profileId: string
  rank: number | null
}

export type MenuPollOptionAggregate = MenuPollOptionInput & {
  voteCount: number
  responseCount: number
  score: number
  firstChoiceCount: number
  averageRank: number | null
}

function compareAggregateOptions(
  left: MenuPollOptionAggregate,
  right: MenuPollOptionAggregate
): number {
  if (right.score !== left.score) {
    return right.score - left.score
  }
  if (right.voteCount !== left.voteCount) {
    return right.voteCount - left.voteCount
  }
  if (left.averageRank !== null && right.averageRank !== null && left.averageRank !== right.averageRank) {
    return left.averageRank - right.averageRank
  }
  if (left.averageRank === null && right.averageRank !== null) {
    return 1
  }
  if (left.averageRank !== null && right.averageRank === null) {
    return -1
  }
  return left.label.localeCompare(right.label)
}

export function aggregateMenuPollOptions(input: {
  pollType: MenuPollType
  options: MenuPollOptionInput[]
  votes: MenuPollVoteInput[]
}): MenuPollOptionAggregate[] {
  const optionById = new Map(input.options.map((option) => [option.id, option]))
  const profileSets = new Map<string, Set<string>>()
  const voteCounts = new Map<string, number>()
  const scoreCounts = new Map<string, number>()
  const firstChoiceCounts = new Map<string, number>()
  const rankTotals = new Map<string, number>()
  const rankCounts = new Map<string, number>()
  const standardOptionCount = input.options.filter((option) => option.optionType === 'standard').length

  for (const vote of input.votes) {
    if (!optionById.has(vote.optionId)) {
      continue
    }

    voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) ?? 0) + 1)

    const profiles = profileSets.get(vote.optionId) ?? new Set<string>()
    profiles.add(vote.profileId)
    profileSets.set(vote.optionId, profiles)

    if (vote.rank === 1) {
      firstChoiceCounts.set(vote.optionId, (firstChoiceCounts.get(vote.optionId) ?? 0) + 1)
    }

    if (input.pollType === 'ranked_choice' && vote.rank !== null) {
      const score = Math.max(standardOptionCount - vote.rank + 1, 1)
      scoreCounts.set(vote.optionId, (scoreCounts.get(vote.optionId) ?? 0) + score)
      rankTotals.set(vote.optionId, (rankTotals.get(vote.optionId) ?? 0) + vote.rank)
      rankCounts.set(vote.optionId, (rankCounts.get(vote.optionId) ?? 0) + 1)
    } else {
      scoreCounts.set(vote.optionId, (scoreCounts.get(vote.optionId) ?? 0) + 1)
    }
  }

  return input.options.map((option) => {
    const totalRank = rankTotals.get(option.id) ?? 0
    const totalRankCount = rankCounts.get(option.id) ?? 0

    return {
      ...option,
      voteCount: voteCounts.get(option.id) ?? 0,
      responseCount: profileSets.get(option.id)?.size ?? 0,
      score: scoreCounts.get(option.id) ?? 0,
      firstChoiceCount: firstChoiceCounts.get(option.id) ?? 0,
      averageRank: totalRankCount > 0 ? Number((totalRank / totalRankCount).toFixed(2)) : null,
    }
  })
}

export function pickLeadingMenuPollOption(
  pollType: MenuPollType,
  options: MenuPollOptionAggregate[]
): MenuPollOptionAggregate | null {
  const standardOptions = options.filter((option) => option.optionType === 'standard')
  if (standardOptions.length === 0) {
    return null
  }

  const sorted = [...standardOptions].sort(compareAggregateOptions)

  if (pollType === 'ranked_choice') {
    return sorted[0] ?? null
  }

  return sorted[0] ?? null
}

export function buildDefaultLockSelections(
  pollType: MenuPollType,
  options: MenuPollOptionAggregate[]
): string | null {
  const leader = pickLeadingMenuPollOption(pollType, options)
  if (leader) {
    return leader.id
  }

  return options.find((option) => option.optionType === 'standard')?.id ?? null
}
