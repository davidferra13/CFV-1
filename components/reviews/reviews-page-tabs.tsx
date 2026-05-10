'use client'

import { useState } from 'react'
import { ChefReviewsList } from '@/components/reviews/chef-reviews-list'
import { ExternalReviewSources } from '@/components/reviews/external-review-sources'
import { TestimonialManager } from '@/components/testimonials/testimonial-manager'
import { ReviewRequestManager } from '@/components/testimonials/review-request-manager'
import { LogFeedbackButton } from '@/components/reviews/log-feedback-button'
import { ImportPlatformReview } from '@/components/reviews/import-platform-review'
import type { UnifiedChefReviewItem } from '@/lib/reviews/actions'
import type { ExternalReviewSourceSummary } from '@/lib/reviews/external-actions'
import type { TestimonialRow } from '@/lib/testimonials/testimonial-actions'
import Link from 'next/link'

type Tab = 'feed' | 'guest' | 'requests' | 'sources'

type Props = {
  reviews: UnifiedChefReviewItem[]
  externalSources: ExternalReviewSourceSummary[]
  guestTestimonials: any[]
  requestTestimonials: TestimonialRow[]
  events: { id: string; occasion: string | null; event_date: string }[]
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'feed', label: 'All Reviews' },
  { key: 'guest', label: 'Guest Testimonials' },
  { key: 'requests', label: 'Review Requests' },
  { key: 'sources', label: 'External Sources' },
]

export function ReviewsPageTabs({
  reviews,
  externalSources,
  guestTestimonials,
  requestTestimonials,
  events,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('feed')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Reviews</h1>
          <p className="text-stone-400 mt-1">
            All client feedback, guest testimonials, and external reviews in one place.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LogFeedbackButton />
          <ImportPlatformReview />
          <Link href="/settings" className="text-sm text-brand-500 hover:text-brand-400">
            Configure Google Review Link
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap border-b border-stone-800 pb-0">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === tab.key
                ? 'bg-stone-800 text-stone-100 border-b-2 border-brand-500'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'feed' && <ChefReviewsList reviews={reviews} />}

      {activeTab === 'guest' && (
        <TestimonialManager initialTestimonials={guestTestimonials} events={events} />
      )}

      {activeTab === 'requests' && (
        <ReviewRequestManager initialTestimonials={requestTestimonials} events={events} />
      )}

      {activeTab === 'sources' && <ExternalReviewSources sources={externalSources} />}
    </div>
  )
}
