import type { Metadata } from 'next'
import { BetaSurveyForm } from '@/components/beta-survey/beta-survey-form'
import { getCachedPublicSurveyBySlug } from '@/lib/beta-survey/survey-cache'
import { getDefaultRespondentRoleForSurveyType } from '@/lib/beta-survey/survey-utils'

export const metadata: Metadata = {
  title: 'ChefFlow Survey',
  robots: {
    index: false,
    follow: false,
  },
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export default async function PublicSharedSurveyPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const survey = await getCachedPublicSurveyBySlug(params.slug)

  if (!survey) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Survey Not Available</h1>
          <p className="text-stone-400">This survey link is inactive or no longer available.</p>
        </div>
      </div>
    )
  }

  const trackedSource = firstValue(searchParams?.source) || firstValue(searchParams?.utm_source)
  const trackedChannel = firstValue(searchParams?.channel) || firstValue(searchParams?.utm_medium)
  const trackedCampaign =
    firstValue(searchParams?.campaign) || firstValue(searchParams?.utm_campaign)
  const trackedWave = firstValue(searchParams?.wave)
  const trackedLaunch = firstValue(searchParams?.launch)
  const trackedRespondentRole =
    firstValue(searchParams?.respondent_role) || firstValue(searchParams?.role)

  return (
    <div className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-brand-400 text-sm font-medium mb-3">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs">
              CF
            </span>
            ChefFlow
          </div>
          <h1 className="text-3xl font-bold text-stone-100">{survey.title}</h1>
          {survey.description && <p className="text-stone-400 mt-2">{survey.description}</p>}
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <BetaSurveyForm
            survey={survey}
            mode="public_shared"
            surveySlug={survey.slug}
            trackedSource={trackedSource}
            trackedChannel={trackedChannel}
            trackedCampaign={trackedCampaign}
            trackedWave={trackedWave}
            trackedLaunch={trackedLaunch}
            respondentRole={
              trackedRespondentRole || getDefaultRespondentRoleForSurveyType(survey.survey_type)
            }
          />
        </div>
      </div>
    </div>
  )
}
