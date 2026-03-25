// Instagram Sync: Pull latest stats and store a snapshot
// Called POST with { chefId } from callback, or GET by chef from UI (manual sync)

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/db/admin'
import type { Json } from '@/types/database'

interface IGPost {
  like_count: number
  comments_count: number
  permalink?: string
}

interface IGProfile {
  followers_count?: number
  follows_count?: number
  media_count?: number
}

interface IGInsightValue {
  value: number
}

interface IGInsightMetric {
  name: string
  values: IGInsightValue[]
}

async function syncInstagramStats(chefId: string): Promise<{ ok: boolean; error?: string }> {
  const db: any = createAdminClient()

  // Get stored token
  const { data: conn } = await db
    .from('social_connected_accounts')
    .select('access_token, platform_account_id')
    .eq('tenant_id', chefId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .single()

  if (!conn) return { ok: false, error: 'No active Instagram connection' }

  const token = conn.access_token
  const igUserId = conn.platform_account_id

  // Fetch profile stats
  const profileRes = await fetch(
    `https://graph.instagram.com/${igUserId}?fields=followers_count,follows_count,media_count&access_token=${token}`
  )

  if (!profileRes.ok) {
    const err = await profileRes.text()
    // Increment error count - fetch current count first since RPC won't work inline
    const { data: currentConn } = await db
      .from('social_connected_accounts')
      .select('error_count')
      .eq('tenant_id', chefId)
      .eq('platform', 'instagram')
      .single()
    await db
      .from('social_connected_accounts')
      .update({
        last_error: err,
        error_count: (currentConn?.error_count ?? 0) + 1,
      })
      .eq('tenant_id', chefId)
      .eq('platform', 'instagram')
    return { ok: false, error: err }
  }

  const profile: IGProfile = await profileRes.json()

  // Fetch recent media for engagement calculation
  const mediaRes = await fetch(
    `https://graph.instagram.com/${igUserId}/media?fields=like_count,comments_count,permalink&limit=10&access_token=${token}`
  )
  const mediaData: { data?: IGPost[] } = await mediaRes.json()
  const posts: IGPost[] = mediaData?.data ?? []

  const topPost = [...posts].sort(
    (a, b) => b.like_count + b.comments_count - (a.like_count + a.comments_count)
  )[0] as IGPost | undefined

  const totalEngagement = posts.reduce(
    (s, p) => s + (p.like_count ?? 0) + (p.comments_count ?? 0),
    0
  )
  const avgEngagementRate =
    posts.length > 0 && (profile.followers_count ?? 0) > 0
      ? Math.round((totalEngagement / posts.length / profile.followers_count!) * 10000) / 10000
      : null

  // Fetch insights (requires instagram_manage_insights)
  let reach7d: number | null = null
  let impressions7d: number | null = null
  let profileViews7d: number | null = null

  try {
    const insightRes = await fetch(
      `https://graph.instagram.com/${igUserId}/insights?metric=reach,impressions,profile_views&period=week&access_token=${token}`
    )
    if (insightRes.ok) {
      const insightData: { data?: IGInsightMetric[] } = await insightRes.json()
      for (const metric of insightData?.data ?? []) {
        const val = metric?.values?.[metric.values.length - 1]?.value ?? null
        if (metric.name === 'reach') reach7d = val
        if (metric.name === 'impressions') impressions7d = val
        if (metric.name === 'profile_views') profileViews7d = val
      }
    }
  } catch {
    // Insights may not be available for personal accounts - continue without them
  }

  const today = new Date().toISOString().slice(0, 10)

  await db.from('social_stats_snapshots').upsert(
    {
      chef_id: chefId,
      platform: 'instagram',
      snapshot_date: today,
      followers: profile.followers_count ?? null,
      following: profile.follows_count ?? null,
      posts_count: profile.media_count ?? null,
      avg_engagement_rate: avgEngagementRate,
      reach_7d: reach7d,
      impressions_7d: impressions7d,
      profile_views_7d: profileViews7d,
      top_post_url: topPost?.permalink ?? null,
      top_post_likes: topPost?.like_count ?? null,
      top_post_comments: topPost?.comments_count ?? null,
      raw_payload: { profile, topPost: topPost ?? null } as unknown as Json,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id,platform,snapshot_date' }
  )

  // Update last_refreshed_at on connection
  await db
    .from('social_connected_accounts')
    .update({ last_refreshed_at: new Date().toISOString(), error_count: 0, last_error: null })
    .eq('tenant_id', chefId)
    .eq('platform', 'instagram')

  return { ok: true }
}

// POST: called internally (from callback or cron)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const internalKey = req.headers.get('x-internal-key') ?? ''
  const expected = process.env.INTERNAL_API_KEY ?? ''
  if (
    !expected ||
    internalKey.length !== expected.length ||
    !timingSafeEqual(Buffer.from(internalKey), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chefId } = (await req.json()) as { chefId: string }
  const result = await syncInstagramStats(chefId)
  return NextResponse.json(result)
}

// GET: called by chef from Settings > Integrations (manual sync)
export async function GET(): Promise<NextResponse> {
  const chef = await requireChef()
  const result = await syncInstagramStats(chef.entityId)
  return NextResponse.json(result)
}
