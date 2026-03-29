import { getSurveyData } from '@/lib/feedback/surveys'
import { PostEventSurveyForm } from '@/components/feedback/post-event-survey-form'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'

export const metadata = { title: 'Share Your Feedback | ChefFlow' }

export default async function FeedbackPage({ params }: { params: { token: string } }) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`feedback:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const surveyData = await getSurveyData(params.token)

  if (!surveyData) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Link Expired</h1>
          <p className="text-stone-400">
            This feedback link is no longer valid. Please contact your chef for a new one.
          </p>
        </div>
      </div>
    )
  }

  if (surveyData.alreadyCompleted) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Thank You!</h1>
          <p className="text-stone-400">
            You have already submitted your feedback. We appreciate it!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">How was your {surveyData.occasion}?</h1>
          <p className="text-stone-400 mt-2">
            {surveyData.chefName} would love to hear your feedback. It only takes about 2 minutes.
          </p>
        </div>

        <PostEventSurveyForm
          token={params.token}
          occasion={surveyData.occasion}
          dishes={surveyData.dishes}
          chefName={surveyData.chefName}
        />
      </div>
    </div>
  )
}
