// Guest Post-Event Feedback - public, token-authenticated
// No login required. Sent to event guests after completion.

import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { getGuestFeedbackByToken } from '@/lib/sharing/actions'
import { TokenExpiredPage } from '@/components/ui/token-expired-page'
import { PostActionFooter } from '@/components/public/post-action-footer'
import { GuestFeedbackForm } from './guest-feedback-form'

export const metadata = { title: 'Guest Feedback' }

export default async function GuestFeedbackPage({ params }: { params: { token: string } }) {
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown'
  try {
    await checkRateLimit(`guest-feedback:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center p-4">
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Too many requests</h1>
          <p className="text-stone-400">Please wait a moment and try again.</p>
        </div>
      </div>
    )
  }

  const feedback = await getGuestFeedbackByToken(params.token)

  if (!feedback) return <TokenExpiredPage reason="expired" noun="feedback" />

  if (feedback.submitted_at) {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-8 text-center">
            <h1 className="text-2xl font-bold text-stone-100 mb-2">Thank you!</h1>
            <p className="text-stone-400">
              Your feedback has already been submitted. We really appreciate it!
            </p>
          </div>
          <PostActionFooter chefSlug={feedback.chefSlug} chefName={feedback.chefName} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-800 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">How was your experience?</h1>
          <p className="text-stone-400 mt-1">
            {feedback.eventTitle}
            {feedback.eventDate
              ? ` · ${new Date(feedback.eventDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}`
              : ''}
          </p>
          <p className="text-stone-500 text-sm mt-3">
            Hi {feedback.guestName}! Your honest feedback helps us improve every experience.
          </p>
        </div>

        <GuestFeedbackForm token={params.token} />
        <PostActionFooter chefSlug={feedback.chefSlug} chefName={feedback.chefName} />
      </div>
    </div>
  )
}
