// Chef Portal Beta Survey Page
// Shows the active beta survey for authenticated chefs.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getActiveSurvey, getMyBetaSurveyStatus } from '@/lib/beta-survey/actions'
import { BetaSurveyForm } from '@/components/beta-survey/beta-survey-form'

export const metadata: Metadata = {
  title: 'Beta Survey - ChefFlow',
}

export default async function ChefBetaSurveyPage() {
  await requireChef()

  // Find the active survey — check pre-beta first, then post-beta
  let survey = await getActiveSurvey('pre_beta')
  let type: 'pre_beta' | 'post_beta' = 'pre_beta'

  if (!survey) {
    survey = await getActiveSurvey('post_beta')
    type = 'post_beta'
  }

  if (!survey) {
    redirect('/dashboard')
  }

  // Check if already submitted
  const status = await getMyBetaSurveyStatus(type)
  if (status.hasSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-stone-100 mb-2">Survey Complete</h1>
        <p className="text-stone-400">You&apos;ve already submitted your feedback. Thank you!</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">{survey.title}</h1>
        {survey.description && <p className="text-stone-400 mt-1">{survey.description}</p>}
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
        <BetaSurveyForm survey={survey} mode="authenticated" redirectTo="/dashboard" />
      </div>
    </div>
  )
}
