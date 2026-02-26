// Meta publishing adapter — handles Instagram Business and Facebook Pages.
// Instagram: Container-based publishing via the Instagram Content Publishing API.
// Facebook: Direct photo/video/text posts via the Pages API.
// Both platforms use a User Access Token (stored encrypted in social_platform_credentials).

import type { SocialPost } from '@/lib/social/types'
import type { PlatformCredential } from '@/lib/social/oauth/token-store'
import type { PublishResult } from '../engine'

const GRAPH = 'https://graph.facebook.com/v21.0'
const MAX_CAPTION_LENGTH = 2200 // Instagram limit

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildCaption(post: SocialPost, platform: 'instagram' | 'facebook'): string {
  const base =
    (platform === 'instagram' ? post.caption_instagram : post.caption_facebook) ||
    post.caption_master ||
    ''
  const tags = post.hashtags?.length ? '\n\n' + post.hashtags.join(' ') : ''
  return (base + tags).slice(0, MAX_CAPTION_LENGTH)
}

async function graphGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${GRAPH}${path}&access_token=${token}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `Graph GET ${path} → ${res.status}`)
  }
  return res.json()
}

async function graphPost(
  path: string,
  token: string,
  body: Record<string, string>
): Promise<unknown> {
  body.access_token = token
  const res = await fetch(`${GRAPH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as any)?.error?.message ?? `Graph POST ${path} → ${res.status}`)
  }
  return data
}

// ── Instagram ─────────────────────────────────────────────────────────────────

export async function publishInstagram(
  post: SocialPost,
  credential: PlatformCredential
): Promise<PublishResult> {
  const igUserId =
    (credential.additionalData.instagram_user_id as string) || credential.externalAccountId
  const token = credential.accessToken
  const caption = buildCaption(post, 'instagram')

  try {
    let containerId: string

    if (post.media_type === 'video') {
      // Video container — requires publicly accessible video URL
      if (!post.media_url) {
        return { success: false, error: 'No video URL for Instagram video post', retriable: false }
      }
      const containerData = (await graphPost(`/${igUserId}/media`, token, {
        media_type: 'REELS',
        video_url: post.media_url,
        caption,
        share_to_feed: 'true',
      })) as { id: string }
      containerId = containerData.id

      // Poll until processing is complete (up to 60s)
      let ready = false
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        const status = (await graphGet(`/${containerId}?fields=status_code`, token)) as {
          status_code: string
        }
        if (status.status_code === 'FINISHED') {
          ready = true
          break
        }
        if (status.status_code === 'ERROR') {
          return { success: false, error: 'Instagram video processing failed', retriable: true }
        }
      }
      if (!ready) {
        return {
          success: false,
          error: 'Instagram video processing timed out — will retry',
          retriable: true,
        }
      }
    } else {
      // Photo container
      if (!post.media_url) {
        return { success: false, error: 'No image URL for Instagram photo post', retriable: false }
      }
      const containerData = (await graphPost(`/${igUserId}/media`, token, {
        image_url: post.media_url,
        caption,
      })) as { id: string }
      containerId = containerData.id
    }

    // Publish the container
    const publishData = (await graphPost(`/${igUserId}/media_publish`, token, {
      creation_id: containerId,
    })) as { id: string }

    return { success: true, externalId: publishData.id }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|temporarily/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

// ── Facebook ──────────────────────────────────────────────────────────────────

export async function publishFacebook(
  post: SocialPost,
  credential: PlatformCredential
): Promise<PublishResult> {
  const pageId =
    (credential.additionalData.facebook_page_id as string) || credential.externalAccountId
  const pageToken = credential.accessToken
  const caption = buildCaption(post, 'facebook')

  try {
    let data: { id: string }

    if (post.media_type === 'video') {
      if (!post.media_url) {
        return { success: false, error: 'No video URL for Facebook video post', retriable: false }
      }
      data = (await graphPost(`/${pageId}/videos`, pageToken, {
        file_url: post.media_url,
        description: caption,
      })) as { id: string }
    } else if (post.media_url) {
      // Photo post
      data = (await graphPost(`/${pageId}/photos`, pageToken, {
        url: post.media_url,
        message: caption,
      })) as { id: string }
    } else {
      // Text-only post
      data = (await graphPost(`/${pageId}/feed`, pageToken, {
        message: caption,
      })) as { id: string }
    }

    return { success: true, externalId: data.id }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|temporarily/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

// ── Token refresh (Meta long-lived tokens — exchange when near expiry) ────────

export async function refreshMetaToken(credential: PlatformCredential): Promise<{
  accessToken: string
  expiresAt: Date
} | null> {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${credential.accessToken}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return {
      accessToken: data.access_token as string,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    }
  } catch {
    return null
  }
}
