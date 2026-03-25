// YouTube Shorts publishing adapter.
// Uses YouTube Data API v3 with a resumable upload.
// For Shorts: video must be vertical (9:16), ≤60 seconds, with #Shorts in description.
// Google access tokens expire in 1 hour; refresh tokens are permanent.

import type { SocialPost } from '@/lib/social/types'
import type { PlatformCredential } from '@/lib/social/oauth/token-store'
import type { PublishResult } from '../engine'

const UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3/videos'
const API = 'https://www.googleapis.com/youtube/v3'
const MAX_TITLE = 100
const MAX_DESCRIPTION = 5000

function buildTitle(post: SocialPost): string {
  return (post.title || 'New Short').slice(0, MAX_TITLE)
}

function buildDescription(post: SocialPost): string {
  const base = post.caption_youtube_shorts || post.caption_master || ''
  const tags = post.hashtags?.length ? '\n\n' + post.hashtags.join(' ') : ''
  // Add #Shorts to ensure YouTube classifies it as a Short
  const shorts = '\n\n#Shorts'
  return (base + tags + shorts).slice(0, MAX_DESCRIPTION)
}

export async function publishYouTube(
  post: SocialPost,
  credential: PlatformCredential
): Promise<PublishResult> {
  if (post.media_type !== 'video') {
    return {
      success: false,
      error:
        'YouTube Shorts only supports video content. Add a vertical video (≤60s) to this post.',
      retriable: false,
    }
  }

  if (!post.media_url) {
    return { success: false, error: 'No video URL for YouTube upload', retriable: false }
  }

  const token = credential.accessToken

  try {
    // Step 1: Fetch the video binary from the database storage
    const videoRes = await fetch(post.media_url)
    if (!videoRes.ok) {
      return {
        success: false,
        error: `Failed to fetch video from storage: ${videoRes.status}`,
        retriable: true,
      }
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
    const mimeType = videoRes.headers.get('content-type') || 'video/mp4'

    // Step 2: Initialize a resumable upload session
    const metadata = {
      snippet: {
        title: buildTitle(post),
        description: buildDescription(post),
        tags: post.hashtags?.map((h) => h.replace(/^#/, '')).filter(Boolean) ?? [],
        categoryId: '26', // How-to & Style
        defaultLanguage: 'en',
        defaultAudioLanguage: 'en',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    }

    const initRes = await fetch(`${UPLOAD_API}?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify(metadata),
    })

    if (!initRes.ok) {
      const err = await initRes.text()
      return {
        success: false,
        error: `YouTube init failed: ${err}`,
        retriable: initRes.status >= 500,
      }
    }

    const uploadUri = initRes.headers.get('location')
    if (!uploadUri) {
      return { success: false, error: 'YouTube did not return an upload URI', retriable: true }
    }

    // Step 3: Upload the video binary
    const uploadRes = await fetch(uploadUri, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(videoBuffer.length),
      },
      body: videoBuffer,
    })

    if (!uploadRes.ok && uploadRes.status !== 308) {
      const err = await uploadRes.text()
      return {
        success: false,
        error: `YouTube upload failed: ${err}`,
        retriable: uploadRes.status >= 500,
      }
    }

    const uploadData = await uploadRes.json().catch(() => ({}))
    const videoId = (uploadData as any)?.id ?? 'unknown'

    return { success: true, externalId: videoId }
  } catch (err) {
    const msg = (err as Error).message
    const retriable = /timeout|network|ECONNRESET/i.test(msg)
    return { success: false, error: msg, retriable }
  }
}

// ── Token refresh (Google access tokens expire in 1 hour) ────────────────────

export async function refreshYouTubeToken(credential: PlatformCredential): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date
} | null> {
  if (!credential.refreshToken) return null

  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
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
      // Google does not issue a new refresh token - keep the old one
      refreshToken: credential.refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    }
  } catch {
    return null
  }
}
