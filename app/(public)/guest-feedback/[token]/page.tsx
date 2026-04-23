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
      <div className="min-h-screen flex items-center justify-center bg-stone-800 p-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-8 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-stone-100">Too many requests</h1>
          <p className="text-stone-400">Please wait a moment and try again.</p>
        </div>
      </div>
    )
  }

  const feedback = await getGuestFeedbackByToken(params.token)

  if (!feedback) return <TokenExpiredPage reason="expired" noun="feedback" />

  if (feedback.submitted_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-800 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-stone-700 bg-stone-900 p-8 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-stone-100">Thank you!</h1>
            <p className="text-stone-400">
              Your feedback has already been submitted. We really appreciate it!
            </p>
          </div>
          <PostActionFooter
            chefSlug={feedback.chefSlug}
            chefName={feedback.chefName}
            crossLink={
              feedback.chefSlug
                ? { href: `/chef/${feedback.chefSlug}/inquire`, label: 'Book Again' }
                : null
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-800 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-100">How was your experience?</h1>
          <p className="mt-1 text-stone-400">
            {feedback.eventTitle}
            {feedback.eventDate
              ? ` | ${new Date(feedback.eventDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}`
              : ''}
          </p>
          <p className="mt-3 text-sm text-stone-500">
            Hi {feedback.guestName}! Your honest feedback helps us improve every experience.
          </p>
        </div>

        <GuestFeedbackForm token={params.token} dishes={feedback.dishes ?? []} />
        <PostActionFooter
          chefSlug={feedback.chefSlug}
          chefName={feedback.chefName}
          crossLink={
            feedback.chefSlug
              ? { href: `/chef/${feedback.chefSlug}/inquire`, label: 'Book Again' }
              : null
          }
        />
      </div>
    </div>
  )
}
