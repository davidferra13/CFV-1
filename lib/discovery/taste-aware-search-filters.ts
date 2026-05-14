import type { DerivedPreferenceProfile } from '@/lib/discovery/preference-contract'
import {
  type PersonalizationCandidate,
  type TasteMatchScore,
  type TasteScoreContext,
  scoreTasteCandidate,
} from '@/lib/discovery/personalization-scoring'

export type TasteAwareSearchFilter =
  | 'safe_for_me'
  | 'matches_favorites'
  | 'hide_dislikes'
  | 'new_but_similar'
  | 'budget_fit'
  | 'nearby'
  | 'occasion_fit'

export interface TasteAwareSearchContext extends TasteScoreContext {
  recentlySeenCandidateIds?: string[]
}

export interface TasteAwareSearchResult<TCandidate extends PersonalizationCandidate> {
  candidate: TCandidate
  score: TasteMatchScore
  activeFilters: TasteAwareSearchFilter[]
  explanations: string[]
}

const FILTER_EXPLANATIONS: Record<TasteAwareSearchFilter, string> = {
  safe_for_me: 'Safe for this profile',
  matches_favorites: 'Matches favorites',
  hide_dislikes: 'Does not include disliked items',
  new_but_similar: 'Similar to favorites and not recently seen',
  budget_fit: 'Fits budget',
  nearby: 'Nearby',
  occasion_fit: 'Fits the occasion',
}

function passesFilter(
  filter: TasteAwareSearchFilter,
  candidate: PersonalizationCandidate,
  score: TasteMatchScore,
  context?: TasteAwareSearchContext
): boolean {
  switch (filter) {
    case 'safe_for_me':
      return !score.hidden
    case 'matches_favorites':
      return score.components.positive > 0
    case 'hide_dislikes':
      return score.components.negative === 0
    case 'new_but_similar':
      return (
        score.components.positive > 0 &&
        !(context?.recentlySeenCandidateIds ?? []).includes(candidate.id)
      )
    case 'budget_fit':
      return candidate.budgetCents != null && score.components.budget > 0
    case 'nearby':
      return candidate.distanceMiles != null && score.components.distance > 0
    case 'occasion_fit':
      return score.components.occasion > 0
  }
}

export function filterTasteAwareCandidates<TCandidate extends PersonalizationCandidate>(
  profile: DerivedPreferenceProfile,
  candidates: TCandidate[],
  filters: TasteAwareSearchFilter[],
  context?: TasteAwareSearchContext
): Array<TasteAwareSearchResult<TCandidate>> {
  const activeFilters = [...new Set(filters)]

  return candidates
    .map((candidate) => {
      const score = scoreTasteCandidate(profile, candidate, context)
      return { candidate, score }
    })
    .filter(({ candidate, score }) =>
      activeFilters.every((filter) => passesFilter(filter, candidate, score, context))
    )
    .map(({ candidate, score }) => ({
      candidate,
      score,
      activeFilters,
      explanations: activeFilters.map((filter) => FILTER_EXPLANATIONS[filter]),
    }))
    .sort((left, right) => right.score.totalScore - left.score.totalScore)
}

export function describeTasteAwareFilters(filters: TasteAwareSearchFilter[]): string[] {
  return [...new Set(filters)].map((filter) => FILTER_EXPLANATIONS[filter])
}
