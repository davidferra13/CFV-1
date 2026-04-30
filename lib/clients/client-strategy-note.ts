export const STRATEGY_NOTE_PREFIX = 'Strategy recommendation: '

export function buildStrategyRecommendationNote(recommendationId: string): string {
  return `${STRATEGY_NOTE_PREFIX}${recommendationId}`
}
