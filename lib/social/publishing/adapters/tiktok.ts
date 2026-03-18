// TikTok publishing adapter.
// Uses the TikTok Content Posting API v2 with PULL_FROM_URL source.
// TikTok for Business only supports VIDEO content (no image-only posts via API).
// Requires a valid, publicly-accessible video URL in post.media_url.

import type { SocialPost } from '@/lib/social/types'
import type { PlatformCredential } from '@/lib/social/oauth/token-store'
import type { PublishResult } from '../engine'

const API = 'https://open.tiktokapis.com/v2'
const MAX_CAPTION = 2200

function buildCaption(post: SocialPost): string {
  const base = post.caption_tiktok || post.caption_master || ''
  const tags = post.hashtags?.length ? '\n' + post.hashtags.join(' ') : ''
  return (base + tags).slice(0, MAX_CAPTION)
}

export async function publishTikTok(
  post: SocialPost,
  credential: PlatformCredential
): Promise<PublishResult> {
  if (post.media_type !== 'video') {
    return {
      success: false,
      error: 'TikTok API only supports video content. Upload a video or skip TikTok for this post.',
      retriable: false,
    }
  }

  if (!post.media_url) {
    return { success: false, error: 'No video URL for TikTok post', retriable: false }
  }

  const token = credential.accessToken
  const caption = buildCaption(post)

  try {
    // Initiate upload using PULL_FROM_URL (platform downloads from our public URL)
    const initRes = await fetch(`${API}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: post.media_url,
        },
      }),
    })

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}))
      const msg = (err as any)?.error?.message ?? `TikTok init failed (${initRes.status})`
      const retriable = initRes.status === 429 || initRes.status >= 500
      return { success: false, error: msg, retriable }
    }

    const initData = await initRes.json()
    const publishId: string = initData.data?.publish_id

    if (!publishId) {
      return { success: false, error: 'TikTok did not return a publish_id', retriable: true }
    }

    // Poll publish status (up to 60 seconds)
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 5000))

      const statusRes = await fetch(`${API}/post/publish/status/fetch/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id: publishId }),
      })

      if (!statusRes.ok) continue

      const statusData = await statusRes.json()
      const status: string = statusData.data?.status

      if (status === 'PUBLISH_COMPLETE') {
        return { success: true, externalId: publishId }
      }
      if (status === 'FAILED') {
        const reason: string = statusData.data?.fail_reason ?? 'Unknown failure'
        return { success: false, error: `TikTok publish failed: ${reason}`, retriable: false }
      }
    }

    return {
      success: false,
      error: 'TikTok publish timed out - will retry',
      retriable: true,
    }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|network/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

// ── Token refresh (TikTok access tokens expire in 24h) ────────────────────────

export async function refreshTikTokToken(credential: PlatformCredential): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
} | null> {
  if (!credential.refreshToken) return null

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (!clientKey || !clientSecret) return null

  try {
    const res = await fetch(`${API}/oauth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: credential.refreshToken,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      accessToken: data.access_token as string,
      refreshToken: (data.refresh_token as string) ?? null,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 86400) * 1000),
    }
  } catch {
    return null
  }
}
