// Server component wrapper for BetaSurveyBanner.
// Checks if there's an active survey the user hasn't submitted,
// and renders the client banner if so. Non-blocking - fails silently.

import { getMyBetaSurveyStatus } from '@/lib/beta-survey/actions'
import { getCachedActiveSurvey } from '@/lib/beta-survey/survey-cache'
import { BetaSurveyBannerClient } from './beta-survey-banner'

interface BetaSurveyBannerWrapperProps {
  /** Route prefix for the survey link (e.g. '/beta-survey' for chef, '/beta-survey' for client) */
  href: string
}

export async function BetaSurveyBannerWrapper({ href }: BetaSurveyBannerWrapperProps) {
  try {
    // Check pre-beta first, then post-beta
    for (const type of ['pre_beta', 'post_beta'] as const) {
      const survey = await getCachedActiveSurvey(type)
      if (!survey) continue

      const status = await getMyBetaSurveyStatus(type)
      if (status.hasSubmitted) continue

      // Found an active survey the user hasn't submitted - show banner
      return (
        <BetaSurveyBannerClient surveySlug={survey.slug} surveyTitle={survey.title} href={href} />
      )
    }
  } catch {
    // Non-blocking - if anything fails, don't show the banner
  }

  return null
}
