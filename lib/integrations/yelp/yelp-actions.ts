'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { revalidatePath } from 'next/cache'

export async function saveYelpBusinessId(businessId: string, businessName: string) {
  await requirePro('integrations')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  // Upsert an integration_connection record for Yelp
  await db.from('integration_connections').upsert(
    {
      id: crypto.randomUUID(),
      chef_id: user.entityId,
      tenant_id: user.entityId,
      provider: 'yelp',
      auth_type: 'api_key',
      status: 'connected',
      external_account_id: businessId,
      external_account_name: businessName,
      config: { business_id: businessId },
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,provider' }
  )

  revalidatePath('/settings/yelp')
  return { success: true }
}

export async function removeYelpBusinessId() {
  await requirePro('integrations')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  await db
    .from('integration_connections')
    .update({ status: 'disconnected' })
    .eq('tenant_id', user.entityId)
    .eq('provider', 'yelp')

  revalidatePath('/settings/yelp')
  return { success: true }
}

export async function getYelpConnection() {
  await requirePro('integrations')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data } = await db
    .from('integration_connections')
    .select('external_account_id, external_account_name, config')
    .eq('tenant_id', user.entityId)
    .eq('provider', 'yelp')
    .eq('status', 'connected')
    .single()

  if (!data) return { businessId: null, businessName: null }

  return {
    businessId: data.external_account_id,
    businessName: data.external_account_name,
  }
}

export async function getYelpReviewCount() {
  await requirePro('integrations')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { count } = await db
    .from('external_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.entityId)
    .eq('provider', 'yelp')

  return count ?? 0
}

export async function searchYelpBusinessAction(term: string, location?: string) {
  await requirePro('integrations')
  const { searchYelpBusiness } = await import('@/lib/integrations/yelp/yelp-sync')
  return searchYelpBusiness(term, location)
}

export async function syncYelpReviewsAction(businessId: string) {
  await requirePro('integrations')
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })
  const { fetchYelpReviews } = await import('@/lib/integrations/yelp/yelp-sync')

  const reviews = await fetchYelpReviews({ business_id: businessId })
  const nowIso = new Date().toISOString()

  if (reviews.length === 0) return { newCount: 0 }

  const rows = reviews.map((review) => ({
    tenant_id: user.entityId,
    provider: 'yelp' as const,
    source_review_id: review.sourceReviewId,
    source_url: review.sourceUrl,
    author_name: review.authorName,
    rating: review.rating,
    review_text: review.reviewText,
    review_date: review.reviewDate,
    raw_payload: review.rawPayload,
    last_seen_at: nowIso,
  }))

  const { data, error } = await db
    .from('external_reviews')
    .upsert(rows, { onConflict: 'tenant_id,provider,source_review_id' })
    .select('id')

  if (error) throw new Error(`Failed to sync Yelp reviews: ${error.message}`)

  revalidatePath('/reviews')
  revalidatePath('/settings/yelp')

  return { newCount: (data || []).length }
}
