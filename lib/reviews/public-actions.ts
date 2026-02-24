// Public Review Feed & Stats — No authentication required
// Aggregates consented client reviews, public chef feedback,
// external reviews, and approved guest testimonials into a
// single feed with unified statistics for the public chef profile.

'use server'

import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export type PublicReviewItem = {
  id: string
  kind: 'client_review' | 'logged_feedback' | 'external_review' | 'guest_testimonial'
  sourceLabel: string
  sourceUrl: string | null
  reviewerName: string
  rating: number | null
  reviewText: string
  reviewDate: string
  isFeatured: boolean
}

export type PublicReviewStats = {
  totalReviews: number
  averageRating: number
  platformBreakdown: { platform: string; count: number; avgRating: number }[]
}

export type PublicReviewFeedResult = {
  reviews: PublicReviewItem[]
  stats: PublicReviewStats
}

// ============================================
// HELPERS
// ============================================

function safeRating(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

const FEEDBACK_SOURCE_LABELS: Record<string, string> = {
  verbal: 'Verbal',
  google: 'Google',
  yelp: 'Yelp',
  yelp_guest: 'Yelp',
  email: 'Email',
  social_media: 'Social Media',
  text_message: 'Text',
  other: 'Other',
  airbnb: 'Airbnb',
  facebook: 'Facebook',
  tripadvisor: 'TripAdvisor',
  thumbtack: 'Thumbtack',
  bark: 'Bark',
  gigsalad: 'GigSalad',
  taskrabbit: 'TaskRabbit',
  houzz: 'Houzz',
  angi: 'Angi',
  nextdoor: 'Nextdoor',
  instagram: 'Instagram',
}

function providerLabel(provider: string): string {
  if (provider === 'google_places') return 'Google'
  if (provider === 'website_jsonld') return 'Website'
  return provider
}

// ============================================
// MAIN PUBLIC QUERY
// ============================================

/**
 * Get all public-facing reviews for a chef by their tenant ID.
 * No authentication required — uses admin client.
 *
 * Sources included:
 * 1. client_reviews where display_consent = true
 * 2. chef_feedback where public_display = true
 * 3. external_reviews (all — inherently public platform data)
 * 4. guest_testimonials where is_approved = true
 */
export async function getPublicChefReviewFeed(tenantId: string): Promise<PublicReviewFeedResult> {
  const supabase: any = createServerClient({ admin: true })

  const [clientResult, feedbackResult, externalResult, testimonialResult] = await Promise.all([
    // 1. Consented client reviews
    supabase
      .from('client_reviews')
      .select('id, rating, feedback_text, what_they_loved, created_at, client:clients(full_name)')
      .eq('tenant_id', tenantId)
      .eq('display_consent', true)
      .order('created_at', { ascending: false }),

    // 2. Public chef-logged feedback
    supabase
      .from('chef_feedback')
      .select(
        'id, source, rating, feedback_text, reviewer_name, source_url, feedback_date, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('public_display', true)
      .order('feedback_date', { ascending: false }),

    // 3. External reviews (all public)
    supabase
      .from('external_reviews')
      .select(
        'id, provider, source_url, author_name, rating, review_text, review_date, source_id, created_at'
      )
      .eq('tenant_id', tenantId)
      .order('review_date', { ascending: false }),

    // 4. Approved guest testimonials
    supabase
      .from('guest_testimonials')
      .select(
        'id, guest_name, testimonial, rating, food_rating, chef_rating, is_featured, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false }),
  ])

  // Gracefully handle missing tables (42P01 = undefined_table)
  const clientReviews =
    clientResult.error?.code === '42P01' ? [] : ((clientResult.data || []) as any[])
  const feedbackEntries =
    feedbackResult.error?.code === '42P01' ? [] : ((feedbackResult.data || []) as any[])
  const externalReviews =
    externalResult.error?.code === '42P01' ? [] : ((externalResult.data || []) as any[])
  const testimonials =
    testimonialResult.error?.code === '42P01' ? [] : ((testimonialResult.data || []) as any[])

  // Log non-missing-table errors
  if (clientResult.error && clientResult.error.code !== '42P01') {
    console.error('[getPublicChefReviewFeed] client_reviews error:', clientResult.error)
  }
  if (feedbackResult.error && feedbackResult.error.code !== '42P01') {
    console.error('[getPublicChefReviewFeed] chef_feedback error:', feedbackResult.error)
  }
  if (externalResult.error && externalResult.error.code !== '42P01') {
    console.error('[getPublicChefReviewFeed] external_reviews error:', externalResult.error)
  }
  if (testimonialResult.error && testimonialResult.error.code !== '42P01') {
    console.error('[getPublicChefReviewFeed] guest_testimonials error:', testimonialResult.error)
  }

  // ── Transform to unified items ──

  const clientItems: PublicReviewItem[] = clientReviews.map((r: any) => {
    const fragments = [
      typeof r.feedback_text === 'string' ? r.feedback_text.trim() : '',
      typeof r.what_they_loved === 'string' && r.what_they_loved.trim()
        ? `Loved: ${r.what_they_loved.trim()}`
        : '',
    ].filter(Boolean)

    return {
      id: `client_${r.id}`,
      kind: 'client_review' as const,
      sourceLabel: 'ChefFlow',
      sourceUrl: null,
      reviewerName: r.client?.full_name || 'Client',
      rating: safeRating(r.rating),
      reviewText: fragments.join(' ') || 'Great experience!',
      reviewDate: r.created_at,
      isFeatured: false,
    }
  })

  const feedbackItems: PublicReviewItem[] = feedbackEntries.map((f: any) => ({
    id: `feedback_${f.id}`,
    kind: 'logged_feedback' as const,
    sourceLabel: FEEDBACK_SOURCE_LABELS[f.source] || f.source,
    sourceUrl: f.source_url || null,
    reviewerName: f.reviewer_name || 'Guest',
    rating: safeRating(f.rating),
    reviewText: typeof f.feedback_text === 'string' ? f.feedback_text.trim() : '',
    reviewDate: f.feedback_date || f.created_at,
    isFeatured: false,
  }))

  const externalItems: PublicReviewItem[] = externalReviews.map((r: any) => ({
    id: `external_${r.id}`,
    kind: 'external_review' as const,
    sourceLabel: providerLabel(r.provider),
    sourceUrl: r.source_url || null,
    reviewerName: r.author_name || 'Guest',
    rating: safeRating(r.rating),
    reviewText: typeof r.review_text === 'string' ? r.review_text.trim() : '',
    reviewDate: r.review_date || r.created_at,
    isFeatured: false,
  }))

  const testimonialItems: PublicReviewItem[] = testimonials.map((t: any) => {
    // Compute overall from dual ratings if available
    const foodR = safeRating(t.food_rating)
    const chefR = safeRating(t.chef_rating)
    const overallR = safeRating(t.rating)
    const computedRating = overallR ?? (foodR && chefR ? (foodR + chefR) / 2 : (foodR ?? chefR))

    return {
      id: `testimonial_${t.id}`,
      kind: 'guest_testimonial' as const,
      sourceLabel: 'Guest',
      sourceUrl: null,
      reviewerName: t.guest_name || 'Guest',
      rating: computedRating,
      reviewText: typeof t.testimonial === 'string' ? t.testimonial.trim() : '',
      reviewDate: t.created_at,
      isFeatured: Boolean(t.is_featured),
    }
  })

  // ── Merge and sort (featured first, then by date) ──

  const allReviews = [...clientItems, ...feedbackItems, ...externalItems, ...testimonialItems]
    .filter((r) => r.reviewText.length > 0)
    .sort((a, b) => {
      // Featured items first
      if (a.isFeatured && !b.isFeatured) return -1
      if (!a.isFeatured && b.isFeatured) return 1
      // Then by date descending
      const dateA = Date.parse(a.reviewDate)
      const dateB = Date.parse(b.reviewDate)
      return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA)
    })

  // ── Compute unified stats ──

  const rated = allReviews.filter((r) => r.rating !== null)
  const averageRating =
    rated.length > 0 ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length : 0

  // Platform breakdown
  const platformMap = new Map<string, { count: number; ratingSum: number; ratedCount: number }>()
  for (const r of allReviews) {
    const key = r.sourceLabel
    const existing = platformMap.get(key) || { count: 0, ratingSum: 0, ratedCount: 0 }
    existing.count++
    if (r.rating !== null) {
      existing.ratingSum += r.rating
      existing.ratedCount++
    }
    platformMap.set(key, existing)
  }

  const platformBreakdown = Array.from(platformMap.entries())
    .map(([platform, data]) => ({
      platform,
      count: data.count,
      avgRating: data.ratedCount > 0 ? data.ratingSum / data.ratedCount : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    reviews: allReviews,
    stats: {
      totalReviews: allReviews.length,
      averageRating: Number(averageRating.toFixed(2)),
      platformBreakdown,
    },
  }
}
