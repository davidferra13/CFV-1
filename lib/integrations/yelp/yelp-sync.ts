// Yelp Business API - Review sync following the Google Places pattern.
// Pulls reviews from a Yelp business profile and upserts into external_reviews.

import { createServerClient } from '@/lib/supabase/server'

const YELP_API_BASE = 'https://api.yelp.com/v3'

function getYelpApiKey(): string {
  const key = process.env.YELP_API_KEY
  if (!key) throw new Error('YELP_API_KEY is not configured')
  return key
}

type NormalizedExternalReview = {
  sourceReviewId: string
  sourceUrl: string | null
  authorName: string | null
  rating: number | null
  reviewText: string
  reviewDate: string | null
  rawPayload: Record<string, unknown>
}

export async function fetchYelpReviews(
  config: Record<string, unknown>
): Promise<NormalizedExternalReview[]> {
  const businessId = typeof config.business_id === 'string' ? config.business_id.trim() : ''
  if (!businessId) {
    throw new Error('Yelp source config requires business_id (Yelp business alias or ID)')
  }

  const apiKey = getYelpApiKey()

  // Yelp Fusion API v3 - /businesses/{id}/reviews
  const response = await fetch(
    `${YELP_API_BASE}/businesses/${encodeURIComponent(businessId)}/reviews?sort_by=newest`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Yelp API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    reviews: Array<{
      id: string
      url: string
      text: string
      rating: number
      time_created: string
      user: {
        id: string
        name: string
        image_url: string | null
        profile_url: string
      }
    }>
    total: number
  }

  return (data.reviews || [])
    .filter((review) => review.text?.trim())
    .map((review) => ({
      sourceReviewId: `yelp:${review.id}`,
      sourceUrl: review.url || null,
      authorName: review.user?.name || null,
      rating: review.rating != null ? Math.min(5, Math.max(0, review.rating)) : null,
      reviewText: review.text.trim(),
      reviewDate: review.time_created ? review.time_created.split(' ')[0] : null,
      rawPayload: review as unknown as Record<string, unknown>,
    }))
}

// Search for a Yelp business by name and location (for setup wizard)
export async function searchYelpBusiness(
  term: string,
  location?: string
): Promise<
  Array<{
    id: string
    alias: string
    name: string
    location: { display_address: string[] }
    rating: number
    review_count: number
    url: string
  }>
> {
  const apiKey = getYelpApiKey()

  const params = new URLSearchParams({
    term,
    limit: '5',
  })
  if (location) params.set('location', location)
  else params.set('location', 'United States')

  const response = await fetch(`${YELP_API_BASE}/businesses/search?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Yelp search failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    businesses: Array<{
      id: string
      alias: string
      name: string
      location: { display_address: string[] }
      rating: number
      review_count: number
      url: string
    }>
  }

  return (data.businesses || []).map((b) => ({
    id: b.id,
    alias: b.alias,
    name: b.name,
    location: b.location || { display_address: [] },
    rating: b.rating,
    review_count: b.review_count,
    url: b.url,
  }))
}

// Sync Yelp reviews into the external_reviews table (same pattern as Google Places)
export async function syncYelpReviews(
  sourceId: string,
  tenantId: string,
  config: Record<string, unknown>
) {
  const supabase: any = createServerClient({ admin: true })

  try {
    const reviews = await fetchYelpReviews(config)
    const nowIso = new Date().toISOString()

    const rows = reviews.map((review) => ({
      tenant_id: tenantId,
      source_id: sourceId,
      provider: 'yelp',
      source_review_id: review.sourceReviewId,
      source_url: review.sourceUrl,
      author_name: review.authorName,
      rating: review.rating,
      review_text: review.reviewText,
      review_date: review.reviewDate,
      raw_payload: review.rawPayload,
      last_seen_at: nowIso,
    }))

    let upserted = 0
    if (rows.length > 0) {
      const { data, error } = await supabase
        .from('external_reviews')
        .upsert(rows, { onConflict: 'tenant_id,provider,source_review_id' })
        .select('id')

      if (error) throw new Error(`Failed to upsert Yelp reviews: ${error.message}`)
      upserted = (data || []).length
    }

    // Update source sync state
    await supabase
      .from('external_review_sources')
      .update({
        last_synced_at: nowIso,
        last_error: null,
        last_cursor: nowIso,
      })
      .eq('id', sourceId)

    return { pulled: reviews.length, upserted, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Yelp sync error'

    await supabase
      .from('external_review_sources')
      .update({ last_error: message, updated_at: new Date().toISOString() })
      .eq('id', sourceId)

    return { pulled: 0, upserted: 0, error: message }
  }
}
