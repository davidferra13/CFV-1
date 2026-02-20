// Google Business Sync: Pull reviews from Google My Business API and store them
// Uses existing external_review_sources + external_reviews tables

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const { access_token } = await res.json()
  return access_token ?? null
}

async function syncGoogleReviews(chefId: string): Promise<{ ok: boolean; error?: string; reviewsImported?: number }> {
  const supabase = createAdminClient()

  // Get stored credentials
  const { data: cred } = await supabase
    .from('social_platform_credentials')
    .select('access_token, refresh_token, token_expires_at, external_account_id')
    .eq('tenant_id', chefId)
    .eq('platform', 'google_business' as unknown as string)
    .eq('is_active', true)
    .single()

  if (!cred) return { ok: false, error: 'No active Google Business connection' }

  let token = cred.access_token

  // Refresh token if expired
  if (cred.token_expires_at && new Date(cred.token_expires_at) < new Date()) {
    if (!cred.refresh_token) return { ok: false, error: 'Token expired, no refresh token' }
    const newToken = await refreshGoogleToken(cred.refresh_token)
    if (!newToken) return { ok: false, error: 'Token refresh failed' }
    token = newToken
    await supabase
      .from('social_platform_credentials')
      .update({
        access_token: newToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      })
      .eq('tenant_id', chefId)
      .eq('platform', 'google_business' as unknown as string)
  }

  // Get or create external_review_source for google_places
  let { data: source } = await supabase
    .from('external_review_sources')
    .select('id, last_cursor')
    .eq('tenant_id', chefId)
    .eq('provider', 'google_places')
    .single()

  if (!source) {
    const { data: newSource } = await supabase
      .from('external_review_sources')
      .insert({
        tenant_id: chefId,
        provider: 'google_places',
        label: 'Google Business',
        config: {},
        created_by: chefId,
      })
      .select('id')
      .single()
    source = newSource as typeof source
  }

  if (!source) return { ok: false, error: 'Could not create review source' }

  // Fetch locations from Google My Business API
  const locRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!locRes.ok) return { ok: false, error: `GMB API error: ${locRes.status}` }

  const locData = await locRes.json()
  const accountName = locData?.accounts?.[0]?.name
  if (!accountName) return { ok: false, error: 'No Google Business account found' }

  // Get reviews for first account/location
  const reviewsRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${accountName}/locations/-/reviews?pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!reviewsRes.ok) return { ok: false, error: `Reviews API error: ${reviewsRes.status}` }

  const reviewsData = await reviewsRes.json()
  const reviews = reviewsData?.reviews ?? []

  let imported = 0
  for (const review of reviews) {
    const ratingMap: Record<string, number> = {
      ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
    }
    const rating = ratingMap[review.starRating] ?? null

    const { error } = await supabase
      .from('external_reviews')
      .upsert({
        tenant_id: chefId,
        source_id: source.id,
        provider: 'google_places',
        source_review_id: review.reviewId,
        source_url: review.reviewReply?.name ?? null,
        author_name: review.reviewer?.displayName ?? null,
        rating,
        review_text: review.comment ?? '(no comment)',
        review_date: review.createTime?.slice(0, 10) ?? null,
        raw_payload: review,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,provider,source_review_id' })

    if (!error) imported++
  }

  await supabase
    .from('external_review_sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', source.id)

  return { ok: true, reviewsImported: imported }
}

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key')
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chefId } = await req.json()
  const result = await syncGoogleReviews(chefId)
  return NextResponse.json(result)
}

export async function GET() {
  const chef = await requireChef()
  const result = await syncGoogleReviews(chef.id)
  return NextResponse.json(result)
}
