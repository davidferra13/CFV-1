export const STRATEGY_NOTE_PREFIX = 'Strategy recommendation: '
export const STRATEGY_REPLY_PREFIX = 'Strategy client reply: '
export const STRATEGY_OUTCOME_PREFIX = 'Strategy outcome: '

export function buildStrategyRecommendationNote(recommendationId: string): string {
  return `${STRATEGY_NOTE_PREFIX}${recommendationId}`
}

export function buildStrategyReplyNote(recommendationId: string): string {
  return `${STRATEGY_REPLY_PREFIX}${recommendationId}`
}

export function buildStrategyOutcomeNote(recommendationId: string): string {
  return `${STRATEGY_OUTCOME_PREFIX}${recommendationId}`
}
