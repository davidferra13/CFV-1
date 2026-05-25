import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getMyReviews, getReviewableEvents } from '@/lib/reviews/client-review-actions'
import { ReviewsClient } from './reviews-client'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'My Reviews' }

export default async function MyReviewsPage() {
  await requireClient()
  const [reviews, reviewable] = await Promise.all([getMyReviews(), getReviewableEvents()])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">My Reviews</h1>
          <p className="text-stone-400 mt-1">Your feedback helps your chef improve.</p>
        </div>
        <Link
          href="/my-reviews/notes"
          className="inline-flex items-center justify-center rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-500 hover:bg-stone-800"
        >
          Chef Notes
        </Link>
      </div>
      <ReviewsClient reviews={reviews} reviewableEvents={reviewable} />
      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
