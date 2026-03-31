// Public Review Submission Page - token-based, no auth required
// Clients receive a link with a unique token to submit their review.

import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { getReviewRequestByToken } from '@/lib/testimonials/submit-testimonial'
import { ReviewForm } from './review-form'

export const metadata = { title: 'Leave a Review' }

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`review:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const request = await getReviewRequestByToken(params.token)

  if (!request) notFound()

  if (request.alreadySubmitted) {
    return (
      <div className="min-h-screen bg-stone-800 flex items-center justify-center p-4">
        <div className="bg-stone-900 rounded-2xl shadow-sm border border-stone-700 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-stone-100 mb-2">Thank you!</h1>
          <p className="text-stone-400">
            Your review has already been submitted. We really appreciate your feedback!
          </p>
        </div>
      </div>
    )
  }

  const formattedDate = request.eventDate
    ? new Date(request.eventDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-stone-800 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-100">How was your experience?</h1>
          {(request.eventType || formattedDate) && (
            <p className="text-stone-400 mt-1">
              {request.eventType}
              {request.eventType && formattedDate ? ' · ' : ''}
              {formattedDate}
            </p>
          )}
          <p className="text-stone-500 text-sm mt-3">
            Hi {request.clientName}! Your honest feedback helps us deliver an even better experience
            next time.
          </p>
        </div>

        <ReviewForm token={params.token} defaultName={request.clientName} />
      </div>
    </div>
  )
}
