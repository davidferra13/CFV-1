// Reputation Studio Page (server component)
// Routes: /reputation/studio

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getReputationOverview,
  getReviews,
  getTestimonials,
  getSocialProofConfig,
} from '@/lib/social/reputation-studio-actions'
import { ReputationStudioClient } from './reputation-studio-client'

export const metadata: Metadata = { title: 'Reputation Studio' }

export default async function ReputationStudioPage() {
  await requireChef()

  const [overview, reviews, testimonials, config] = await Promise.all([
    getReputationOverview().catch(() => ({
      aggregateScore: 0,
      totalReviews: 0,
      trendDirection: 'stable' as const,
      responseRate: 0,
      respondedCount: 0,
      unrespondedCount: 0,
    })),
    getReviews().catch(() => []),
    getTestimonials().catch(() => []),
    getSocialProofConfig().catch(() => ({
      id: '',
      chefId: '',
      maxFeatured: 5,
      showOnProfile: true,
      showOnPortal: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  ])

  return (
    <ReputationStudioClient
      initialOverview={overview}
      initialReviews={reviews}
      initialTestimonials={testimonials}
      initialConfig={config}
    />
  )
}
