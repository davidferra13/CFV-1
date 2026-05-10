'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TestimonialCandidate = {
  id: string
  type: 'client_review' | 'guest_testimonial' | 'testimonial_request'
  source: string
  clientName: string
  rating: number
  excerpt: string
  eventOccasion: string | null
  eventDate: string | null
  createdAt: string
  isApproved: boolean
  isFeatured: boolean
}

export type ContentLibraryItem = {
  id: string
  sourceType: string
  clientName: string
  rating: number
  content: string
  eventOccasion: string | null
  approvedAt: string
  socialDraftsCount: number
}

export type ReviewMarketingFunnelStats = {
  totalReviews: number
  positiveReviews: number
  withConsent: number
  approved: number
  socialDraftsGenerated: number
  funnelConversionRate: number
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PromoteSchema = z.object({
  sourceType: z.enum(['client_review', 'guest_testimonial', 'testimonial_request']),
  sourceId: z.string().uuid(),
})

const GenerateDraftsSchema = z.object({
  testimonialId: z.string().uuid(),
  sourceType: z.enum(['client_review', 'guest_testimonial', 'testimonial_request']),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstName(fullName: string | null | undefined): string {
  if (!fullName) return 'Guest'
  return fullName.trim().split(/\s+/)[0] || 'Guest'
}

function truncate(text: string | null | undefined, maxLen: number): string {
  if (!text) return ''
  const trimmed = text.trim()
  if (trimmed.length <= maxLen) return trimmed
  return trimmed.slice(0, maxLen).trimEnd() + '...'
}

// ---------------------------------------------------------------------------
// 1. getTestimonialCandidates
// ---------------------------------------------------------------------------

/**
 * Find reviews and testimonials with high ratings (4-5 stars) that could be
 * promoted into the marketing content pipeline.
 */
export async function getTestimonialCandidates(): Promise<TestimonialCandidate[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Query all three review sources in parallel
  const [clientReviewsResult, guestTestimonialsResult, testimonialRequestsResult] =
    await Promise.all([
      db
        .from('client_reviews')
        .select(
          'id, rating, feedback_text, what_they_loved, display_consent, created_at, client:clients(full_name), event:events(occasion, event_date)'
        )
        .eq('tenant_id', user.tenantId!)
        .eq('display_consent', true)
        .gte('rating', 4)
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false }),

      db
        .from('guest_testimonials')
        .select(
          'id, rating, testimonial, guest_name, is_approved, is_featured, created_at, event:events(occasion, event_date)'
        )
        .eq('tenant_id', user.tenantId!)
        .gte('rating', 4)
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false }),

      db
        .from('testimonials')
        .select(
          'id, rating, content, client_name, is_public, submitted_at, event:events(occasion, event_date)'
        )
        .eq('tenant_id', user.tenantId!)
        .gte('rating', 4)
        .order('rating', { ascending: false })
        .order('submitted_at', { ascending: false }),
    ])

  const candidates: TestimonialCandidate[] = []

  // Client reviews (display_consent = true, not yet featured via content library)
  if (clientReviewsResult.data) {
    for (const r of clientReviewsResult.data as any[]) {
      const text = r.what_they_loved || r.feedback_text || ''
      candidates.push({
        id: r.id,
        type: 'client_review',
        source: 'client_reviews',
        clientName: firstName(r.client?.full_name),
        rating: r.rating,
        excerpt: truncate(text, 200),
        eventOccasion: r.event?.occasion || null,
        eventDate: r.event?.event_date || null,
        createdAt: r.created_at,
        isApproved: !!r.display_consent,
        isFeatured: false,
      })
    }
  }

  // Guest testimonials
  if (guestTestimonialsResult.data) {
    for (const t of guestTestimonialsResult.data as any[]) {
      candidates.push({
        id: t.id,
        type: 'guest_testimonial',
        source: 'guest_testimonials',
        clientName: firstName(t.guest_name),
        rating: t.rating,
        excerpt: truncate(t.testimonial, 200),
        eventOccasion: t.event?.occasion || null,
        eventDate: t.event?.event_date || null,
        createdAt: t.created_at,
        isApproved: !!t.is_approved,
        isFeatured: !!t.is_featured,
      })
    }
  }

  // Testimonial requests (testimonials table)
  if (testimonialRequestsResult.data) {
    for (const t of testimonialRequestsResult.data as any[]) {
      candidates.push({
        id: t.id,
        type: 'testimonial_request',
        source: 'testimonials',
        clientName: firstName(t.client_name),
        rating: t.rating,
        excerpt: truncate(t.content, 200),
        eventOccasion: t.event?.occasion || null,
        eventDate: t.event?.event_date || null,
        createdAt: t.submitted_at || t.created_at || '',
        isApproved: !!t.is_public,
        isFeatured: !!t.is_public,
      })
    }
  }

  // Sort: rating desc, then date desc
  candidates.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return candidates
}

// ---------------------------------------------------------------------------
// 2. promoteToContentLibrary
// ---------------------------------------------------------------------------

/**
 * Mark a review or testimonial as approved for marketing use.
 * Updates the appropriate flags on the source record.
 */
export async function promoteToContentLibrary(input: {
  sourceType: string
  sourceId: string
}): Promise<{ success: boolean }> {
  const user = await requireChef()
  const validated = PromoteSchema.parse(input)
  const db: any = createServerClient()

  if (validated.sourceType === 'client_review') {
    // Client reviews: display_consent is set by client. We confirm approval
    // by ensuring it remains true (no-op if already set).
    const { error } = await db
      .from('client_reviews')
      .update({ display_consent: true })
      .eq('id', validated.sourceId)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[promoteToContentLibrary] client_review error:', error)
      throw new Error('Failed to promote client review')
    }
  } else if (validated.sourceType === 'guest_testimonial') {
    const { error } = await db
      .from('guest_testimonials')
      .update({ is_approved: true, is_featured: true })
      .eq('id', validated.sourceId)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[promoteToContentLibrary] guest_testimonial error:', error)
      throw new Error('Failed to promote guest testimonial')
    }
  } else if (validated.sourceType === 'testimonial_request') {
    const { error } = await db
      .from('testimonials')
      .update({ is_public: true })
      .eq('id', validated.sourceId)
      .eq('tenant_id', user.tenantId!)

    if (error) {
      console.error('[promoteToContentLibrary] testimonial error:', error)
      throw new Error('Failed to promote testimonial')
    }
  }

  revalidatePath('/reviews')
  revalidatePath('/marketing')

  return { success: true }
}

// ---------------------------------------------------------------------------
// 3. generateSocialDrafts
// ---------------------------------------------------------------------------

/**
 * Generate social media post drafts from an approved testimonial.
 * Creates 3 variants (Instagram, Facebook, generic quote) in the
 * social_templates table.
 */
export async function generateSocialDrafts(input: {
  testimonialId: string
  sourceType: string
}): Promise<{ drafts: Array<{ id: string; platform: string; title: string }> }> {
  const user = await requireChef()
  const validated = GenerateDraftsSchema.parse(input)
  const db: any = createServerClient()

  // Fetch the source content
  let content = ''
  let clientName = ''
  let occasion = ''

  if (validated.sourceType === 'client_review') {
    const { data } = await db
      .from('client_reviews')
      .select('feedback_text, what_they_loved, client:clients(full_name), event:events(occasion)')
      .eq('id', validated.testimonialId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!data) throw new Error('Review not found')
    content = (data as any).what_they_loved || (data as any).feedback_text || ''
    clientName = firstName((data as any).client?.full_name)
    occasion = (data as any).event?.occasion || ''
  } else if (validated.sourceType === 'guest_testimonial') {
    const { data } = await db
      .from('guest_testimonials')
      .select('testimonial, guest_name, event:events(occasion)')
      .eq('id', validated.testimonialId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!data) throw new Error('Testimonial not found')
    content = (data as any).testimonial || ''
    clientName = firstName((data as any).guest_name)
    occasion = (data as any).event?.occasion || ''
  } else if (validated.sourceType === 'testimonial_request') {
    const { data } = await db
      .from('testimonials')
      .select('content, client_name, event:events(occasion)')
      .eq('id', validated.testimonialId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (!data) throw new Error('Testimonial not found')
    content = (data as any).content || ''
    clientName = firstName((data as any).client_name)
    occasion = (data as any).event?.occasion || ''
  }

  if (!content.trim()) {
    throw new Error('No testimonial content to generate drafts from')
  }

  const excerpt = truncate(content, 300)
  const attribution = occasion ? `${clientName}, ${occasion}` : clientName

  // Build 3 draft variants
  const drafts = [
    {
      platform: 'instagram' as const,
      template_type: 'post' as const,
      title: `Testimonial: ${clientName}`,
      content: `"${excerpt}"\n\nThank you, ${clientName}, for the kind words. Moments like these are why I do what I do.`,
      hashtags: ['#privatechef', '#clientlove', '#testimonial', '#happyclients', '#cheflife'],
    },
    {
      platform: 'facebook' as const,
      template_type: 'post' as const,
      title: `Client Love: ${clientName}`,
      content: `Nothing makes my day more than hearing from happy guests.\n\n"${excerpt}"\n\nThank you, ${clientName}! If you are looking for a private chef experience, send me a message.`,
      hashtags: ['#privatechef', '#testimonial', '#privatecatering'],
    },
    {
      platform: 'instagram' as const,
      template_type: 'post' as const,
      title: `Quote: ${clientName}`,
      content: `"${excerpt}" \n\n- ${attribution}`,
      hashtags: ['#privatechef', '#clientquote', '#testimonial'],
    },
  ]

  // Insert all drafts into social_templates
  const rows = drafts.map((d) => ({
    chef_id: user.tenantId!,
    platform: d.platform,
    template_type: d.template_type,
    title: d.title,
    content: d.content,
    hashtags: d.hashtags,
  }))

  const { data: inserted, error } = await db
    .from('social_templates')
    .insert(rows)
    .select('id, platform, title')

  if (error) {
    console.error('[generateSocialDrafts] Insert error:', error)
    throw new Error('Failed to create social drafts')
  }

  revalidatePath('/marketing')
  revalidatePath('/reviews')

  return {
    drafts: (inserted ?? []).map((d: any) => ({
      id: d.id,
      platform: d.platform,
      title: d.title,
    })),
  }
}

// ---------------------------------------------------------------------------
// 4. getContentLibrary
// ---------------------------------------------------------------------------

/**
 * Get all approved/featured content items across all review sources,
 * along with a count of social drafts generated from each.
 */
export async function getContentLibrary(): Promise<ContentLibraryItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch approved items from all three sources in parallel
  const [clientResult, guestResult, testimonialResult, socialResult] = await Promise.all([
    db
      .from('client_reviews')
      .select(
        'id, rating, feedback_text, what_they_loved, display_consent, created_at, client:clients(full_name), event:events(occasion)'
      )
      .eq('tenant_id', user.tenantId!)
      .eq('display_consent', true)
      .gte('rating', 4)
      .order('created_at', { ascending: false }),

    db
      .from('guest_testimonials')
      .select(
        'id, rating, testimonial, guest_name, is_approved, is_featured, created_at, event:events(occasion)'
      )
      .eq('tenant_id', user.tenantId!)
      .eq('is_approved', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false }),

    db
      .from('testimonials')
      .select('id, rating, content, client_name, is_public, submitted_at, event:events(occasion)')
      .eq('tenant_id', user.tenantId!)
      .eq('is_public', true)
      .order('submitted_at', { ascending: false }),

    // Count social drafts per testimonial title pattern
    db
      .from('social_templates')
      .select('id, title, template_type')
      .eq('chef_id', user.tenantId!)
      .like('title', 'Testimonial:%')
      .or('title.like.Client Love:%,title.like.Quote:%'),
  ])

  // Build a map of client names to social draft counts
  const socialDraftsByName: Record<string, number> = {}
  if (socialResult.data) {
    for (const t of socialResult.data as any[]) {
      // Extract name from title patterns like "Testimonial: John" or "Quote: John"
      const match = t.title?.match(/^(?:Testimonial|Client Love|Quote):\s*(.+)$/)
      if (match) {
        const name = match[1].trim()
        socialDraftsByName[name] = (socialDraftsByName[name] || 0) + 1
      }
    }
  }

  const items: ContentLibraryItem[] = []

  if (clientResult.data) {
    for (const r of clientResult.data as any[]) {
      const name = firstName(r.client?.full_name)
      items.push({
        id: r.id,
        sourceType: 'client_review',
        clientName: name,
        rating: r.rating,
        content: r.what_they_loved || r.feedback_text || '',
        eventOccasion: r.event?.occasion || null,
        approvedAt: r.created_at,
        socialDraftsCount: socialDraftsByName[name] || 0,
      })
    }
  }

  if (guestResult.data) {
    for (const t of guestResult.data as any[]) {
      const name = firstName(t.guest_name)
      items.push({
        id: t.id,
        sourceType: 'guest_testimonial',
        clientName: name,
        rating: t.rating,
        content: t.testimonial || '',
        eventOccasion: t.event?.occasion || null,
        approvedAt: t.created_at,
        socialDraftsCount: socialDraftsByName[name] || 0,
      })
    }
  }

  if (testimonialResult.data) {
    for (const t of testimonialResult.data as any[]) {
      const name = firstName(t.client_name)
      items.push({
        id: t.id,
        sourceType: 'testimonial_request',
        clientName: name,
        rating: t.rating,
        content: t.content || '',
        eventOccasion: t.event?.occasion || null,
        approvedAt: t.submitted_at || '',
        socialDraftsCount: socialDraftsByName[name] || 0,
      })
    }
  }

  return items
}

// ---------------------------------------------------------------------------
// 5. getReviewToMarketingFunnelStats
// ---------------------------------------------------------------------------

/**
 * Pipeline health metrics: how reviews flow from submission through
 * approval to social content generation.
 */
export async function getReviewToMarketingFunnelStats(): Promise<ReviewMarketingFunnelStats> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [clientResult, guestResult, testimonialResult, socialResult] = await Promise.all([
    db.from('client_reviews').select('id, rating, display_consent').eq('tenant_id', user.tenantId!),

    db
      .from('guest_testimonials')
      .select('id, rating, is_approved, is_featured')
      .eq('tenant_id', user.tenantId!),

    db.from('testimonials').select('id, rating, is_public').eq('tenant_id', user.tenantId!),

    db
      .from('social_templates')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .in('template_type', ['post', 'testimonial_post']),
  ])

  const clientReviews = (clientResult.data || []) as any[]
  const guestTestimonials = (guestResult.data || []) as any[]
  const testimonials = (testimonialResult.data || []) as any[]

  const totalReviews = clientReviews.length + guestTestimonials.length + testimonials.length

  const positiveReviews =
    clientReviews.filter((r) => r.rating >= 4).length +
    guestTestimonials.filter((t) => t.rating >= 4).length +
    testimonials.filter((t) => t.rating >= 4).length

  const withConsent =
    clientReviews.filter((r) => r.display_consent).length +
    guestTestimonials.filter((t) => t.is_approved).length +
    testimonials.filter((t) => t.is_public).length

  const approved =
    clientReviews.filter((r) => r.display_consent && r.rating >= 4).length +
    guestTestimonials.filter((t) => t.is_approved && t.is_featured).length +
    testimonials.filter((t) => t.is_public).length

  const socialDraftsGenerated = (socialResult.data || []).length

  const funnelConversionRate = totalReviews > 0 ? approved / totalReviews : 0

  return {
    totalReviews,
    positiveReviews,
    withConsent,
    approved,
    socialDraftsGenerated,
    funnelConversionRate,
  }
}
