// Reputation Studio Types
// Types for the chef reputation management studio.

export type ReputationOverview = {
  aggregateScore: number
  totalReviews: number
  trendDirection: 'up' | 'down' | 'stable'
  responseRate: number
  respondedCount: number
  unrespondedCount: number
}

export type ReviewEntry = {
  id: string
  eventId: string | null
  clientName: string
  rating: number
  comment: string
  date: string
  responded: boolean
  responseText: string | null
  eventContext: string | null
  source: 'client_review' | 'logged_feedback' | 'external_review'
}

export type TestimonialEntry = {
  id: string
  reviewId: string
  excerpt: string
  clientName: string
  rating: number | null
  approved: boolean
  featured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type SocialProofConfig = {
  id: string
  chefId: string
  maxFeatured: number
  showOnProfile: boolean
  showOnPortal: boolean
  createdAt: string
  updatedAt: string
}

export type ReputationActionResult = {
  success: boolean
  error?: string
}
