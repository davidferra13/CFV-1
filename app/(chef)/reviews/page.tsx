// Chef Reviews Dashboard - Unified reviews, testimonials, and external feedback

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getUnifiedChefReviewFeed } from '@/lib/reviews/actions'
import { getExternalReviewSources } from '@/lib/reviews/external-actions'
import { getTestimonials } from '@/lib/testimonials/actions'
import { getTestimonials as getRequestTestimonials } from '@/lib/testimonials/testimonial-actions'
import { createServerClient } from '@/lib/db/server'
import { ReviewsPageTabs } from '@/components/reviews/reviews-page-tabs'

export const metadata: Metadata = { title: 'Reviews' }

export default async function ReviewsPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  const [reviews, externalSources, guestTestimonials, requestTestimonials, { data: events }] =
    await Promise.all([
      getUnifiedChefReviewFeed(),
      getExternalReviewSources(),
      getTestimonials(),
      getRequestTestimonials(),
      db
        .from('events')
        .select('id, occasion, event_date')
        .eq('tenant_id', user.entityId!)
        .order('event_date', { ascending: false }),
    ])

  return (
    <ReviewsPageTabs
      reviews={reviews}
      externalSources={externalSources}
      guestTestimonials={guestTestimonials as any}
      requestTestimonials={requestTestimonials}
      events={(events ?? []) as any}
    />
  )
}
