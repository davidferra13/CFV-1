// @ts-nocheck
// Instagram Sync: Pull latest stats and store a snapshot
// Called POST with { chefId } from callback, or GET by chef from UI (manual sync)

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

async function syncInstagramStats(chefId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Get stored token
  const { data: conn } = await supabase
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
    `https://graph.instagram.com/${igUserId}?fields=followers_count,follows_count,media_count&access_token=${token}`,
  )

  if (!profileRes.ok) {
    const err = await profileRes.text()
    await supabase
      .from('social_connected_accounts')
      .update({ last_error: err, error_count: supabase.rpc('increment', { x: 1 }) as unknown as number })
      .eq('tenant_id', chefId)
      .eq('platform', 'instagram')
    return { ok: false, error: err }
  }

  const profile = await profileRes.json()

  // Fetch recent media for engagement calculation
  const mediaRes = await fetch(
    `https://graph.instagram.com/${igUserId}/media?fields=like_count,comments_count,permalink&limit=10&access_token=${token}`,
  )
  const mediaData = await mediaRes.json()
  const posts = mediaData?.data ?? []

  const topPost = posts.sort(
    (a: { like_count: number; comments_count: number }, b: { like_count: number; comments_count: number }) =>
      (b.like_count + b.comments_count) - (a.like_count + a.comments_count)
  )[0]

  const totalEngagement = posts.reduce(
    (s: number, p: { like_count?: number; comments_count?: number }) => s + (p.like_count ?? 0) + (p.comments_count ?? 0),
    0,
  )
  const avgEngagementRate =
    posts.length > 0 && profile.followers_count > 0
      ? Math.round((totalEngagement / posts.length / profile.followers_count) * 10000) / 10000
      : null

  // Fetch insights (requires instagram_manage_insights)
  let reach7d = null
  let impressions7d = null
  let profileViews7d = null

  try {
    const insightRes = await fetch(
      `https://graph.instagram.com/${igUserId}/insights?metric=reach,impressions,profile_views&period=week&access_token=${token}`,
    )
    if (insightRes.ok) {
      const insightData = await insightRes.json()
      for (const metric of insightData?.data ?? []) {
        const val = metric?.values?.[metric.values.length - 1]?.value ?? null
        if (metric.name === 'reach') reach7d = val
        if (metric.name === 'impressions') impressions7d = val
        if (metric.name === 'profile_views') profileViews7d = val
      }
    }
  } catch {
    // Insights may not be available for personal accounts — continue without them
  }

  const today = new Date().toISOString().slice(0, 10)

  await supabase
    .from('social_stats_snapshots')
    .upsert({
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
      raw_payload: { profile, topPost: topPost ?? null },
      synced_at: new Date().toISOString(),
    }, { onConflict: 'chef_id,platform,snapshot_date' })

  // Update last_refreshed_at on connection
  await supabase
    .from('social_connected_accounts')
    .update({ last_refreshed_at: new Date().toISOString(), error_count: 0, last_error: null })
    .eq('tenant_id', chefId)
    .eq('platform', 'instagram')

  return { ok: true }
}

// POST: called internally (from callback or cron)
export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key')
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chefId } = await req.json()
  const result = await syncInstagramStats(chefId)
  return NextResponse.json(result)
}

// GET: called by chef from Settings > Integrations (manual sync)
export async function GET() {
  const chef = await requireChef()
  const result = await syncInstagramStats(chef.id)
  return NextResponse.json(result)
}
