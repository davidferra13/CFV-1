'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  ReputationOverview,
  ReviewEntry,
  TestimonialEntry,
  SocialProofConfig,
  ReputationActionResult,
} from './reputation-studio-types'

// ── Validation ────────────────────────────────────────────────────────────────

const RespondToReviewSchema = z.object({
  reviewId: z.string().min(1),
  responseText: z.string().min(1).max(2000),
})

const FeatureTestimonialSchema = z.object({
  reviewId: z.string().min(1),
  excerpt: z.string().min(1).max(1000),
  clientName: z.string().default(''),
  rating: z.number().int().min(1).max(5).nullable().optional(),
})

const UnfeatureTestimonialSchema = z.object({
  testimonialId: z.string().uuid(),
})

const ReorderTestimonialsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})

const UpdateSocialProofConfigSchema = z.object({
  maxFeatured: z.number().int().min(1).max(20).optional(),
  showOnProfile: z.boolean().optional(),
  showOnPortal: z.boolean().optional(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeRating(value: unknown): number {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// ── getReputationOverview ─────────────────────────────────────────────────────

export async function getReputationOverview(): Promise<ReputationOverview> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: reviews, error } = await db
    .from('client_reviews')
    .select('id, rating, responded, created_at')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getReputationOverview] Query failed:', error)
    return {
      aggregateScore: 0,
      totalReviews: 0,
      trendDirection: 'stable',
      responseRate: 0,
      respondedCount: 0,
      unrespondedCount: 0,
    }
  }

  const rows = (reviews ?? []) as any[]
  const total = rows.length

  if (total === 0) {
    return {
      aggregateScore: 0,
      totalReviews: 0,
      trendDirection: 'stable',
      responseRate: 0,
      respondedCount: 0,
      unrespondedCount: 0,
    }
  }

  const sum = rows.reduce((acc: number, r: any) => acc + safeRating(r.rating), 0)
  const aggregateScore = sum / total
  const respondedCount = rows.filter((r: any) => r.responded).length
  const unrespondedCount = total - respondedCount
  const responseRate = total > 0 ? respondedCount / total : 0

  // Trend: compare last 30 days vs prior 30 days
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000

  const recent = rows.filter((r: any) => Date.parse(r.created_at) >= thirtyDaysAgo)
  const prior = rows.filter(
    (r: any) => Date.parse(r.created_at) >= sixtyDaysAgo && Date.parse(r.created_at) < thirtyDaysAgo
  )

  const recentAvg =
    recent.length > 0
      ? recent.reduce((a: number, r: any) => a + safeRating(r.rating), 0) / recent.length
      : 0
  const priorAvg =
    prior.length > 0
      ? prior.reduce((a: number, r: any) => a + safeRating(r.rating), 0) / prior.length
      : 0

  let trendDirection: 'up' | 'down' | 'stable' = 'stable'
  if (recent.length > 0 && prior.length > 0) {
    if (recentAvg > priorAvg + 0.2) trendDirection = 'up'
    else if (recentAvg < priorAvg - 0.2) trendDirection = 'down'
  }

  return {
    aggregateScore,
    totalReviews: total,
    trendDirection,
    responseRate,
    respondedCount,
    unrespondedCount,
  }
}

// ── getReviews ────────────────────────────────────────────────────────────────

export async function getReviews(filters?: {
  minRating?: number
  responded?: boolean
}): Promise<ReviewEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('client_reviews')
    .select(
      `
      id, event_id, rating, feedback_text, responded, response_text, created_at,
      client:clients(id, full_name),
      event:events(id, occasion, event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.minRating !== undefined) {
    query = query.gte('rating', filters.minRating)
  }

  if (filters?.responded !== undefined) {
    query = query.eq('responded', filters.responded)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getReviews] Query failed:', error)
    return []
  }

  return ((data ?? []) as any[]).map((r) => {
    const occasion = r.event?.occasion?.trim() || 'Event'
    const eventDate = r.event?.event_date || ''
    const eventContext = r.event ? `${occasion} - ${eventDate}` : null

    return {
      id: r.id,
      eventId: r.event_id || null,
      clientName: r.client?.full_name || 'Client',
      rating: safeRating(r.rating),
      comment: r.feedback_text?.trim() || '',
      date: r.created_at,
      responded: Boolean(r.responded),
      responseText: r.response_text || null,
      eventContext,
      source: 'client_review' as const,
    }
  })
}

// ── respondToReview ───────────────────────────────────────────────────────────

export async function respondToReview(
  reviewId: string,
  responseText: string
): Promise<ReputationActionResult> {
  const user = await requireChef()
  const validated = RespondToReviewSchema.parse({ reviewId, responseText })
  const db: any = createServerClient()

  const { error } = await db
    .from('client_reviews')
    .update({
      responded: true,
      response_text: validated.responseText,
    })
    .eq('id', validated.reviewId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[respondToReview] Update failed:', error)
    return { success: false, error: 'Failed to save response' }
  }

  revalidatePath('/reputation/studio')
  return { success: true }
}

// ── getTestimonials ───────────────────────────────────────────────────────────

export async function getTestimonials(): Promise<TestimonialEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_testimonials')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getTestimonials] Query failed:', error)
    return []
  }

  return ((data ?? []) as any[]).map((t) => ({
    id: t.id,
    reviewId: t.review_id,
    excerpt: t.excerpt,
    clientName: t.client_name || '',
    rating: t.rating ?? null,
    approved: Boolean(t.approved),
    featured: Boolean(t.featured),
    displayOrder: t.display_order ?? 0,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }))
}

// ── featureTestimonial ────────────────────────────────────────────────────────

export async function featureTestimonial(
  reviewId: string,
  excerpt: string,
  clientName?: string,
  rating?: number | null
): Promise<ReputationActionResult> {
  const user = await requireChef()
  const validated = FeatureTestimonialSchema.parse({
    reviewId,
    excerpt,
    clientName: clientName || '',
    rating: rating ?? null,
  })
  const db: any = createServerClient()

  // Check if this review is already featured
  const { data: existing } = await db
    .from('chef_testimonials')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .eq('review_id', validated.reviewId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'This review is already featured as a testimonial' }
  }

  // Get current max display_order
  const { data: maxRow } = await db
    .from('chef_testimonials')
    .select('display_order')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((maxRow as any)?.display_order ?? 0) + 1

  const { error } = await db.from('chef_testimonials').insert({
    chef_id: user.tenantId!,
    review_id: validated.reviewId,
    excerpt: validated.excerpt,
    client_name: validated.clientName,
    rating: validated.rating,
    approved: true,
    featured: true,
    display_order: nextOrder,
  })

  if (error) {
    console.error('[featureTestimonial] Insert failed:', error)
    return { success: false, error: 'Failed to create testimonial' }
  }

  revalidatePath('/reputation/studio')
  return { success: true }
}

// ── unfeatureTestimonial ──────────────────────────────────────────────────────

export async function unfeatureTestimonial(testimonialId: string): Promise<ReputationActionResult> {
  const user = await requireChef()
  const validated = UnfeatureTestimonialSchema.parse({ testimonialId })
  const db: any = createServerClient()

  const { error } = await db
    .from('chef_testimonials')
    .delete()
    .eq('id', validated.testimonialId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[unfeatureTestimonial] Delete failed:', error)
    return { success: false, error: 'Failed to remove testimonial' }
  }

  revalidatePath('/reputation/studio')
  return { success: true }
}

// ── reorderTestimonials ───────────────────────────────────────────────────────

export async function reorderTestimonials(orderedIds: string[]): Promise<ReputationActionResult> {
  const user = await requireChef()
  const validated = ReorderTestimonialsSchema.parse({ orderedIds })
  const db: any = createServerClient()

  // Update display_order for each testimonial
  for (let i = 0; i < validated.orderedIds.length; i++) {
    const { error } = await db
      .from('chef_testimonials')
      .update({ display_order: i + 1, updated_at: new Date().toISOString() })
      .eq('id', validated.orderedIds[i])
      .eq('chef_id', user.tenantId!)

    if (error) {
      console.error('[reorderTestimonials] Update failed for id:', validated.orderedIds[i], error)
      return { success: false, error: 'Failed to reorder testimonials' }
    }
  }

  revalidatePath('/reputation/studio')
  return { success: true }
}

// ── getSocialProofConfig ──────────────────────────────────────────────────────

export async function getSocialProofConfig(): Promise<SocialProofConfig> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('social_proof_config')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    console.error('[getSocialProofConfig] Query failed:', error)
  }

  if (data) {
    return {
      id: data.id,
      chefId: data.chef_id,
      maxFeatured: data.max_featured ?? 5,
      showOnProfile: data.show_on_profile ?? true,
      showOnPortal: data.show_on_portal ?? true,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  // Return defaults if no config row exists yet
  return {
    id: '',
    chefId: user.tenantId!,
    maxFeatured: 5,
    showOnProfile: true,
    showOnPortal: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── updateSocialProofConfig ───────────────────────────────────────────────────

export async function updateSocialProofConfig(config: {
  maxFeatured?: number
  showOnProfile?: boolean
  showOnPortal?: boolean
}): Promise<ReputationActionResult> {
  const user = await requireChef()
  const validated = UpdateSocialProofConfigSchema.parse(config)
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (validated.maxFeatured !== undefined) payload.max_featured = validated.maxFeatured
  if (validated.showOnProfile !== undefined) payload.show_on_profile = validated.showOnProfile
  if (validated.showOnPortal !== undefined) payload.show_on_portal = validated.showOnPortal

  // Upsert: try update first, insert if no row
  const { data: existing } = await db
    .from('social_proof_config')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('social_proof_config')
      .update(payload)
      .eq('chef_id', user.tenantId!)

    if (error) {
      console.error('[updateSocialProofConfig] Update failed:', error)
      return { success: false, error: 'Failed to update social proof settings' }
    }
  } else {
    const { error } = await db.from('social_proof_config').insert({
      chef_id: user.tenantId!,
      max_featured: validated.maxFeatured ?? 5,
      show_on_profile: validated.showOnProfile ?? true,
      show_on_portal: validated.showOnPortal ?? true,
    })

    if (error) {
      console.error('[updateSocialProofConfig] Insert failed:', error)
      return { success: false, error: 'Failed to create social proof settings' }
    }
  }

  revalidatePath('/reputation/studio')
  return { success: true }
}
