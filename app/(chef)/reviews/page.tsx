// Chef Reviews Dashboard - View all client feedback, ratings, and stats

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getUnifiedChefReviewFeed } from '@/lib/reviews/actions'
import { getExternalReviewSources } from '@/lib/reviews/external-actions'
import { ChefReviewsList } from '@/components/reviews/chef-reviews-list'
import { LogFeedbackButton } from '@/components/reviews/log-feedback-button'
import { ImportPlatformReview } from '@/components/reviews/import-platform-review'
import { ExternalReviewSources } from '@/components/reviews/external-review-sources'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Reviews' }

export default async function ReviewsPage() {
  await requireChef()

  const [reviews, externalSources] = await Promise.all([
    getUnifiedChefReviewFeed(),
    getExternalReviewSources(),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Reviews</h1>
          <p className="text-stone-400 mt-1">
            Unified feed of internal and external reviews with source attribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LogFeedbackButton />
          <ImportPlatformReview />
          <Link href="/settings" className="text-sm text-brand-500 hover:text-brand-400">
            Configure Google Review Link
          </Link>
        </div>
      </div>

      <ExternalReviewSources sources={externalSources} />
      <ChefReviewsList reviews={reviews} />
    </div>
  )
}
