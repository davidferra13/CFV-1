// Chef Reviews Dashboard - View all client feedback, ratings, and stats

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getChefReviews, getChefReviewStats } from '@/lib/reviews/actions'
import { ChefReviewsList } from '@/components/reviews/chef-reviews-list'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Reviews - ChefFlow' }

export default async function ReviewsPage() {
  await requireChef()

  const [reviews, stats] = await Promise.all([
    getChefReviews(),
    getChefReviewStats(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Client Reviews</h1>
          <p className="text-stone-600 mt-1">
            Feedback from your clients after completed events.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          Configure Google Review Link
        </Link>
      </div>

      <ChefReviewsList reviews={reviews as any} stats={stats} />
    </div>
  )
}
