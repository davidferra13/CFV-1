// LinkedIn publishing adapter.
// Uses the UGC Posts API (v2) to publish text + image posts to the chef's profile.
// Images are shared via originalUrl (external URL - no binary upload needed).
// Tokens expire in 60 days; refresh tokens are issued when r_emailaddress scope is included.

import type { SocialPost } from '@/lib/social/types'
import type { PlatformCredential } from '@/lib/social/oauth/token-store'
import type { PublishResult } from '../engine'

const API = 'https://api.linkedin.com'
const MAX_CAPTION = 3000

function buildCaption(post: SocialPost): string {
  const base = post.caption_linkedin || post.caption_master || ''
  const tags = post.hashtags?.length ? '\n\n' + post.hashtags.join(' ') : ''
  return (base + tags).slice(0, MAX_CAPTION)
}

export async function publishLinkedIn(
  post: SocialPost,
  credential: PlatformCredential
): Promise<PublishResult> {
  const token = credential.accessToken
  const authorUrn =
    (credential.additionalData.urn as string) || `urn:li:person:${credential.externalAccountId}`
  const text = buildCaption(post)

  try {
    // Determine share media category
    let shareMediaCategory = 'NONE'
    let media: any[] = []

    if (post.media_url && post.media_type === 'image') {
      shareMediaCategory = 'IMAGE'
      media = [
        {
          status: 'READY',
          originalUrl: post.media_url,
          title: { text: post.title || '' },
          description: { text: '' },
        },
      ]
    } else if (post.media_url && post.media_type === 'video') {
      // LinkedIn video requires binary upload; for now share as a URL in the text
      shareMediaCategory = 'NONE'
    }

    const ugcPost = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory,
          ...(media.length > 0 ? { media } : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    const res = await fetch(`${API}/v2/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPost),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = (err as any)?.message ?? `LinkedIn post failed (${res.status})`
      const retriable = res.status === 429 || res.status >= 500
      return { success: false, error: msg, retriable }
    }

    // LinkedIn returns the post ID in the X-RestLi-Id header
    const postId = res.headers.get('x-restli-id') ?? res.headers.get('X-RestLi-Id') ?? 'unknown'
    return { success: true, externalId: postId }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|network/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

// ── Token refresh (LinkedIn 60-day tokens, refresh token is also 60 days) ─────

export async function refreshLinkedInToken(credential: PlatformCredential): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
} | null> {
  if (!credential.refreshToken) return null

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch(`${API}/oauth/v2/accessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credential.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      accessToken: data.access_token as string,
      refreshToken: (data.refresh_token as string) ?? null,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 5184000) * 1000),
    }
  } catch {
    return null
  }
}
