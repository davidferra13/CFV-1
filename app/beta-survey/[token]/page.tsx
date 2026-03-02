// Public Beta Survey Page — token-based access for external testers.
// No authentication required. Token validated server-side.

import type { Metadata } from 'next'
import { getSurveyByInviteToken } from '@/lib/beta-survey/actions'
import { BetaSurveyForm } from '@/components/beta-survey/beta-survey-form'

export const metadata: Metadata = {
  title: 'Beta Survey - ChefFlow',
}

export default async function PublicBetaSurveyPage({ params }: { params: { token: string } }) {
  const result = await getSurveyByInviteToken(params.token)

  if (!result) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Invalid or Expired Link</h1>
          <p className="text-stone-400">
            This survey link is no longer valid. Please check your email for a new link or contact
            the ChefFlow team.
          </p>
        </div>
      </div>
    )
  }

  if (result.alreadySubmitted) {
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
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Already Submitted</h1>
          <p className="text-stone-400">
            You&apos;ve already completed this survey. Thank you for your feedback!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-brand-400 text-sm font-medium mb-3">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs">
              CF
            </span>
            ChefFlow
          </div>
          <h1 className="text-3xl font-bold text-stone-100 mb-2">{result.survey.title}</h1>
          {result.survey.description && (
            <p className="text-stone-400">{result.survey.description}</p>
          )}
        </div>

        {/* Form */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
          <BetaSurveyForm
            survey={result.survey}
            mode="public"
            inviteToken={params.token}
            prefillName={result.invite.name || undefined}
            prefillEmail={result.invite.email || undefined}
          />
        </div>
      </div>
    </div>
  )
}
