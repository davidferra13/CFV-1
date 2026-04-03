export const BETA_SURVEY_BANNER_DISMISS_DURATION_MS = 24 * 60 * 60 * 1000

const BETA_SURVEY_BANNER_DISMISS_PREFIX = 'beta-survey-banner-dismissed'
const BETA_SURVEY_COMPLETION_PREFIX = 'beta-survey-completed'

export function getBetaSurveyBannerDismissKey(surveySlug: string): string {
  return `${BETA_SURVEY_BANNER_DISMISS_PREFIX}-${surveySlug}`
}

export function getBetaSurveyCompletionKey(surveySlug: string): string {
  return `${BETA_SURVEY_COMPLETION_PREFIX}-${surveySlug}`
}
