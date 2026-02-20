// Pinterest publishing adapter.
// Uses Pinterest API v5 — creates a Pin on the chef's default board.
// Pinterest supports image_url directly (no binary upload needed).
// Tokens expire in 30 days; refresh tokens are supported.

import type { SocialPost } from '@/lib/social/types'
import type { PlatformCredential } from '@/lib/social/oauth/token-store'
import type { PublishResult } from '../engine'

const API = 'https://api.pinterest.com/v5'
const MAX_DESCRIPTION = 800
const MAX_TITLE = 100

function buildTitle(post: SocialPost): string {
  return (post.title || '').slice(0, MAX_TITLE)
}

function buildDescription(post: SocialPost): string {
  const base = post.caption_pinterest || post.caption_master || ''
  const tags = post.hashtags?.length ? '\n\n' + post.hashtags.join(' ') : ''
  return (base + tags).slice(0, MAX_DESCRIPTION)
}

export async function publishPinterest(
  post: SocialPost,
  credential: PlatformCredential
): Promise<PublishResult> {
  const token = credential.accessToken
  const boardId = credential.additionalData.default_board_id as string | null

  if (!boardId) {
    return {
      success: false,
      error:
        'No Pinterest board found. Please reconnect your Pinterest account — a default board is required.',
      retriable: false,
    }
  }

  if (!post.media_url) {
    return {
      success: false,
      error: 'Pinterest requires an image. Add media to this post.',
      retriable: false,
    }
  }

  const pinBody: Record<string, any> = {
    board_id: boardId,
    title: buildTitle(post),
    description: buildDescription(post),
    link: post.offer_link || undefined,
    alt_text: post.alt_text || undefined,
    media_source: {
      source_type: 'image_url',
      url: post.media_url,
    },
  }

  try {
    const res = await fetch(`${API}/pins`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pinBody),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = (err as any)?.message ?? `Pinterest API ${res.status}`
      const retriable = res.status === 429 || res.status >= 500
      return { success: false, error: msg, retriable }
    }

    const data = await res.json()
    return { success: true, externalId: data.id ?? 'unknown' }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /rate limit|timeout|network/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

// ── Token refresh (Pinterest tokens expire in ~30 days) ───────────────────────

export async function refreshPinterestToken(credential: PlatformCredential): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
} | null> {
  if (!credential.refreshToken) return null

  const appId = process.env.PINTEREST_APP_ID
  const appSecret = process.env.PINTEREST_APP_SECRET
  if (!appId || !appSecret) return null

  try {
    const res = await fetch(`${API}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${appId}:${appSecret}`).toString('base64'),
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
      expiresAt: new Date(Date.now() + (data.expires_in ?? 2592000) * 1000),
    }
  } catch {
    return null
  }
}
