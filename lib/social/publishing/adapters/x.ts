// X (Twitter) publishing adapter.
// Uses X API v2 for tweet creation and v1.1 media upload endpoint for images/videos.
// X access tokens expire in 2 hours; refresh tokens last 6 months (offline.access scope).
// Requires the X Developer Basic plan (~$100/mo) for write access.

import type { SocialPost } from '@/lib/social/types'
import type { PlatformCredential } from '@/lib/social/oauth/token-store'
import type { PublishResult } from '../engine'

const V2 = 'https://api.twitter.com/2'
const V1_UPLOAD = 'https://upload.twitter.com/1.1/media/upload.json'
const MAX_TWEET = 280

function buildTweetText(post: SocialPost): string {
  const base = post.caption_x || post.caption_master || ''
  const tags = post.hashtags?.length ? ' ' + post.hashtags.join(' ') : ''
  return (base + tags).slice(0, MAX_TWEET)
}

/** Upload media from a public URL to Twitter's media endpoint. Returns media_id_string. */
async function uploadMediaFromUrl(mediaUrl: string, token: string): Promise<string> {
  // Fetch the image/video from Supabase storage
  const mediaRes = await fetch(mediaUrl)
  if (!mediaRes.ok) throw new Error(`Failed to fetch media from URL: ${mediaRes.status}`)
  const blob = await mediaRes.blob()
  const mimeType = blob.type || 'image/jpeg'
  const buffer = Buffer.from(await blob.arrayBuffer())

  // INIT phase (chunked upload)
  const initBody = new URLSearchParams({
    command: 'INIT',
    total_bytes: String(buffer.length),
    media_type: mimeType,
    media_category: mimeType.startsWith('video/') ? 'tweet_video' : 'tweet_image',
  })
  const initRes = await fetch(V1_UPLOAD, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: initBody,
  })
  if (!initRes.ok) throw new Error(`X media INIT failed: ${initRes.status}`)
  const initData = await initRes.json()
  const mediaId: string = initData.media_id_string

  // APPEND phase (single chunk for files ≤5MB)
  const formData = new FormData()
  formData.append('command', 'APPEND')
  formData.append('media_id', mediaId)
  formData.append('segment_index', '0')
  formData.append('media', new Blob([buffer], { type: mimeType }))
  const appendRes = await fetch(V1_UPLOAD, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!appendRes.ok && appendRes.status !== 204) {
    throw new Error(`X media APPEND failed: ${appendRes.status}`)
  }

  // FINALIZE phase
  const finalRes = await fetch(V1_UPLOAD, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }),
  })
  if (!finalRes.ok) throw new Error(`X media FINALIZE failed: ${finalRes.status}`)

  return mediaId
}

export async function publishX(
  post: SocialPost,
  credential: PlatformCredential
): Promise<PublishResult> {
  const token = credential.accessToken
  const text = buildTweetText(post)

  try {
    const tweetBody: Record<string, any> = { text }

    // Upload media if present (images ≤5MB; larger videos may fail in serverless)
    if (post.media_url && post.media_type !== 'text') {
      try {
        const mediaId = await uploadMediaFromUrl(post.media_url, token)
        tweetBody.media = { media_ids: [mediaId] }
      } catch (mediaErr) {
        console.warn('[x-adapter] Media upload failed, posting text-only:', mediaErr)
        // Fall through: post text-only rather than failing entirely
      }
    }

    const res = await fetch(`${V2}/tweets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetBody),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const detail =
        (err as any)?.detail ?? (err as any)?.errors?.[0]?.message ?? `X API ${res.status}`
      const retriable = res.status === 429 || res.status >= 500
      return { success: false, error: detail, retriable }
    }

    const data = await res.json()
    return { success: true, externalId: data.data?.id ?? 'unknown' }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|network/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

// ── Token refresh (X tokens expire in 2 hours; refresh tokens last 6 months) ──

export async function refreshXToken(credential: PlatformCredential): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
} | null> {
  if (!credential.refreshToken) return null

  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch(`${V2}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credential.refreshToken,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      accessToken: data.access_token as string,
      refreshToken: (data.refresh_token as string) ?? null,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 7200) * 1000),
    }
  } catch {
    return null
  }
}
