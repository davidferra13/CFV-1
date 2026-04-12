'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { dateToMonthString } from '@/lib/utils/format'
// ─── Types ───────────────────────────────────────────────────────────────────

export interface SocialPlatformSnapshot {
  platform: string
  snapshotDate: string
  followers: number | null
  following: number | null
  postsCount: number | null
  avgEngagementRate: number | null
  reach7d: number | null
  impressions7d: number | null
  profileViews7d: number | null
  topPostUrl: string | null
  topPostLikes: number | null
  topPostComments: number | null
}

export interface SocialGrowthTrend {
  date: string
  followers: number | null
  engagementRate: number | null
  reach7d: number | null
}

export interface SocialConnectionStatus {
  platform: string
  isConnected: boolean
  accountHandle: string | null
  accountName: string | null
  lastSyncedAt: string | null
}

export interface GoogleReviewStats {
  totalReviews: number
  avgRating: number
  ratingDistribution: Record<string, number> // "1"-"5" → count
  newReviewsLast7d: number
  ratingTrend: Array<{ date: string; avgRating: number; totalReviews: number }>
}

export interface ExternalReviewSummary {
  provider: string
  reviewCount: number
  avgRating: number
  mostRecentReviewDate: string | null
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getSocialConnectionStatuses(): Promise<SocialConnectionStatus[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('social_connected_accounts')
    .select(
      'platform, is_active, platform_account_handle, platform_account_name, last_refreshed_at'
    )
    .eq('tenant_id', chef.tenantId!)

  const platforms = [
    'instagram',
    'facebook',
    'tiktok',
    'linkedin',
    'x',
    'pinterest',
    'youtube_shorts',
  ]
  const connectedMap = new Map<string, NonNullable<typeof data>[number]>()
  for (const row of data ?? []) {
    if (row.is_active) connectedMap.set(row.platform, row)
  }

  return platforms.map((platform) => {
    const conn = connectedMap.get(platform)
    return {
      platform,
      isConnected: !!conn,
      accountHandle: conn?.platform_account_handle ?? null,
      accountName: conn?.platform_account_name ?? null,
      lastSyncedAt: conn?.last_refreshed_at ?? null,
    }
  })
}

export async function getLatestSocialSnapshot(
  platform: string
): Promise<SocialPlatformSnapshot | null> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('social_stats_snapshots')
    .select('*')
    .eq('chef_id', chef.entityId)
    .eq('platform', platform)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    platform: data.platform,
    snapshotDate: data.snapshot_date,
    followers: data.followers,
    following: data.following,
    postsCount: data.posts_count,
    avgEngagementRate: data.avg_engagement_rate ? Number(data.avg_engagement_rate) : null,
    reach7d: data.reach_7d,
    impressions7d: data.impressions_7d,
    profileViews7d: data.profile_views_7d,
    topPostUrl: data.top_post_url,
    topPostLikes: data.top_post_likes,
    topPostComments: data.top_post_comments,
  }
}

export async function getSocialGrowthTrend(
  platform: string,
  months: number = 6
): Promise<SocialGrowthTrend[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const _cn = new Date()
  const cutoff = new Date(_cn.getFullYear(), _cn.getMonth() - months, _cn.getDate())

  const { data } = await db
    .from('social_stats_snapshots')
    .select('snapshot_date, followers, avg_engagement_rate, reach_7d')
    .eq('chef_id', chef.entityId)
    .eq('platform', platform)
    .gte(
      'snapshot_date',
      `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
    )
    .order('snapshot_date', { ascending: true })

  return (data ?? []).map((row: any) => ({
    date: row.snapshot_date,
    followers: row.followers,
    engagementRate: row.avg_engagement_rate ? Number(row.avg_engagement_rate) : null,
    reach7d: row.reach_7d,
  }))
}

export async function getFollowerGrowthRate(
  platform: string,
  periodDays: number = 30
): Promise<{
  currentFollowers: number | null
  growthCount: number | null
  growthRate: number | null
}> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - periodDays)

  const { data } = await db
    .from('social_stats_snapshots')
    .select('snapshot_date, followers')
    .eq('chef_id', chef.entityId)
    .eq('platform', platform)
    .not('followers', 'is', null)
    .order('snapshot_date', { ascending: false })
    .limit(2)

  if (!data || data.length < 2) {
    return { currentFollowers: data?.[0]?.followers ?? null, growthCount: null, growthRate: null }
  }

  const current = data[0].followers!
  const previous = data[data.length - 1].followers!
  const growthCount = current - previous
  const growthRate = previous > 0 ? Math.round((growthCount / previous) * 1000) / 10 : null

  return { currentFollowers: current, growthCount, growthRate }
}

export async function getGoogleReviewStats(): Promise<GoogleReviewStats | null> {
  const chef = await requireChef()
  const db: any = createServerClient()

  // Get latest and historical snapshots from external_reviews
  const { data: reviews } = await db
    .from('external_reviews')
    .select('rating, review_date, first_seen_at')
    .eq('tenant_id', chef.tenantId!)
    .eq('provider', 'google_places')
    .not('rating', 'is', null)
    .order('review_date', { ascending: false })

  if (!reviews?.length) return null

  const totalReviews = reviews.length
  const avgRating =
    Math.round(
      (reviews.reduce((s: any, r: any) => s + Number(r.rating ?? 0), 0) / totalReviews) * 10
    ) / 10

  const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  for (const r of reviews) {
    const key = String(Math.round(Number(r.rating ?? 0)))
    if (key in ratingDistribution) ratingDistribution[key]++
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const newReviews = reviews.filter(
    (r: any) => r.first_seen_at && new Date(r.first_seen_at) >= sevenDaysAgo
  ).length

  // Monthly trend (last 12 months)
  const monthMap = new Map<string, { total: number; sum: number }>()
  for (const r of reviews) {
    if (!r.review_date) continue
    const month = dateToMonthString(r.review_date)
    const slot = monthMap.get(month) ?? { total: 0, sum: 0 }
    slot.total++
    slot.sum += Number(r.rating ?? 0)
    monthMap.set(month, slot)
  }

  const ratingTrend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, { total, sum }]) => ({
      date,
      avgRating: Math.round((sum / total) * 10) / 10,
      totalReviews: total,
    }))

  return { totalReviews, avgRating, ratingDistribution, newReviewsLast7d: newReviews, ratingTrend }
}

export async function getExternalReviewSummary(): Promise<ExternalReviewSummary[]> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: sources } = await db
    .from('external_review_sources')
    .select('id, provider, label')
    .eq('tenant_id', chef.tenantId!)
    .eq('active', true)

  const results: ExternalReviewSummary[] = []

  for (const source of sources ?? []) {
    const { data: reviews } = await db
      .from('external_reviews')
      .select('rating, review_date')
      .eq('source_id', source.id)
      .not('rating', 'is', null)
      .order('review_date', { ascending: false })

    const total = reviews?.length ?? 0
    const avg =
      total > 0
        ? Math.round(
            (reviews!.reduce((s: any, r: any) => s + Number(r.rating ?? 0), 0) / total) * 10
          ) / 10
        : 0

    results.push({
      provider: source.provider,
      reviewCount: total,
      avgRating: avg,
      mostRecentReviewDate: reviews?.[0]?.review_date ?? null,
    })
  }

  return results
}
