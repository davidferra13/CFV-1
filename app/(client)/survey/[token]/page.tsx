// Client Satisfaction Survey - public, token-authenticated
// No login required. Chef sends the link via email after an event.

import { notFound } from 'next/navigation'
import { getSurveyByToken } from '@/lib/surveys/actions'
import { SurveyForm } from './survey-form'

export const metadata = { title: 'Event Feedback' }

export default async function SurveyPage({ params }: { params: { token: string } }) {
  const survey = await getSurveyByToken(params.token)

  if (!survey) notFound()

  const chefName = survey.chef?.business_name ?? 'Your chef'
  const eventDate = survey.event?.event_date
  const occasion = survey.event?.occasion

  // Already responded
  if (survey.submitted_at) {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center p-4">
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🙏</div>
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Thank you!</h1>
          <p className="text-stone-400">
            Your feedback has already been submitted. We appreciate your time!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-800 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">{chefName}</h1>
          <p className="text-stone-400 mt-1">
            {occasion ? `${occasion} · ` : ''}
            {eventDate
              ? new Date(eventDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : ''}
          </p>
          <p className="text-stone-500 text-sm mt-3">
            A quick note on your experience helps more than you know. Thank you!
          </p>
        </div>

        <SurveyForm token={params.token} />
      </div>
    </div>
  )
}
