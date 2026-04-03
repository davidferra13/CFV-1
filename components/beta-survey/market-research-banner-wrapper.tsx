import { cookies } from 'next/headers'
import { getMyBetaSurveyStatus } from '@/lib/beta-survey/actions'
import { getCachedActiveSurvey } from '@/lib/beta-survey/survey-cache'
import { getBetaSurveyCompletionKey } from '@/lib/beta-survey/survey-presence'
import {
  getDefaultRespondentRoleForSurveyType,
  type SurveyType,
} from '@/lib/beta-survey/survey-utils'
import { BetaSurveyBannerClient } from './beta-survey-banner'

type MarketResearchSurveyType = Extract<
  SurveyType,
  'market_research_operator' | 'market_research_client'
>

type MarketResearchBannerWrapperProps = {
  surveyType: MarketResearchSurveyType
  channel: 'chef_portal' | 'client_portal'
  launch?: string
  respondentRole?: string
}

function buildTrackedHref(surveySlug: string, params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  const query = searchParams.toString()
  return query ? `/beta-survey/public/${surveySlug}?${query}` : `/beta-survey/public/${surveySlug}`
}

export async function MarketResearchBannerWrapper({
  surveyType,
  channel,
  launch = 'in_app_banner',
  respondentRole,
}: MarketResearchBannerWrapperProps) {
  try {
    const survey = await getCachedActiveSurvey(surveyType)
    if (!survey) return null

    const cookieStore = cookies()
    if (cookieStore.get(getBetaSurveyCompletionKey(survey.slug))) {
      return null
    }

    const status = await getMyBetaSurveyStatus(surveyType)
    if (status.hasSubmitted) {
      return null
    }

    const href = buildTrackedHref(survey.slug, {
      source: 'owned_surface',
      channel,
      launch,
      respondent_role: respondentRole || getDefaultRespondentRoleForSurveyType(survey.survey_type),
    })
    const containerClass =
      channel === 'chef_portal'
        ? '-mx-4 -mt-6 mb-6 sm:-mx-6 lg:-mx-8 lg:-mt-8 lg:mb-8'
        : '-mx-4 mb-6 sm:-mx-6 lg:-mx-8 lg:mb-8'

    return (
      <div className={containerClass}>
        <BetaSurveyBannerClient
          surveySlug={survey.slug}
          surveyTitle={survey.title}
          href={href}
          respectOnboardingPeripherals={false}
        />
      </div>
    )
  } catch {
    return null
  }
}
