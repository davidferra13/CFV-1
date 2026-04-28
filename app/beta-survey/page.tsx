// Authenticated Beta Survey Page
// Handles both chef and client users. Detects role from session
// and redirects accordingly after submission.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getMyBetaSurveyStatus } from '@/lib/beta-survey/actions'
import { getCachedActiveSurvey } from '@/lib/beta-survey/survey-cache'
import { BetaSurveyForm } from '@/components/beta-survey/beta-survey-form'

export const metadata: Metadata = {
  title: 'Beta Survey',
}

export default async function BetaSurveyPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const redirectTo = user.role === 'chef' ? '/dashboard' : '/my-events'

  // Find the active survey - check pre-beta first, then post-beta
  let survey = await getCachedActiveSurvey('pre_beta')
  let type: 'pre_beta' | 'post_beta' = 'pre_beta'

  if (!survey) {
    survey = await getCachedActiveSurvey('post_beta')
    type = 'post_beta'
  }

  if (!survey) {
    redirect(redirectTo)
  }

  // Check if already submitted
  const status = await getMyBetaSurveyStatus(type)
  if (status.hasSubmitted) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
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
      </div>
    )
  }

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
          {survey.description && <p className="text-stone-400 mt-1">{survey.description}</p>}
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <BetaSurveyForm survey={survey} mode="authenticated" redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}
