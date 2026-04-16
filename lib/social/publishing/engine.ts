// Social Publishing Engine
// Called by /api/scheduled/social-publish every 5 minutes.
// Queries posts that are: status=queued, preflight_ready=true, schedule_at <= now+5min.
// For each post x platform: fetches credential, refreshes token if needed, calls adapter.
// Updates post record with results. Sets status=published when all platforms succeed.

import { createAdminClient } from '@/lib/db/admin'
import {
  getCredential,
  updateTokens,
  recordPublishError,
  recordPublishSuccess,
} from '@/lib/social/oauth/token-store'
import type { SocialPost, SocialPlatform } from '@/lib/social/types'
import { PLATFORM_CAPABILITIES } from '@/lib/social/platform-policy'

// ── Public result types used by adapters ─────────────────────────────────────

export type PublishResult = {
  success: boolean
  externalId?: string
  error?: string
  /** true = transient error (rate limit, timeout) - will retry. false = permanent. */
  retriable?: boolean
}

// ── Engine result ─────────────────────────────────────────────────────────────

export type EngineRun = {
  processed: number
  succeeded: number
  failed: number
  skipped: number
  errors: string[]
}

// ── Token refresh ─────────────────────────────────────────────────────────────

type FreshCredential = Awaited<ReturnType<typeof getCredential>>

async function maybeRefreshToken(
  tenantId: string,
  platform: SocialPlatform,
  credential: FreshCredential
): Promise<FreshCredential> {
  if (!credential) return credential

  // Refresh if token expires within the next 30 minutes
  const expiresAt = credential.tokenExpiresAt
  if (!expiresAt || expiresAt.getTime() - Date.now() > 30 * 60 * 1000) {
    return credential
  }

  try {
    let refreshed: { accessToken: string; refreshToken: string | null; expiresAt: Date } | null =
      null

    if (platform === 'instagram' || platform === 'facebook') {
      const { refreshMetaToken } = await import('./adapters/meta')
      const r = await refreshMetaToken(credential)
      if (r) refreshed = { ...r, refreshToken: null }
    } else if (platform === 'tiktok') {
      const { refreshTikTokToken } = await import('./adapters/tiktok')
      refreshed = await refreshTikTokToken(credential)
    } else if (platform === 'linkedin') {
      const { refreshLinkedInToken } = await import('./adapters/linkedin')
      refreshed = await refreshLinkedInToken(credential)
    } else if (platform === 'x') {
      const { refreshXToken } = await import('./adapters/x')
      refreshed = await refreshXToken(credential)
    } else if (platform === 'pinterest') {
      const { refreshPinterestToken } = await import('./adapters/pinterest')
      refreshed = await refreshPinterestToken(credential)
    } else if (platform === 'youtube_shorts') {
      const { refreshYouTubeToken } = await import('./adapters/youtube')
      refreshed = await refreshYouTubeToken(credential)
    }

    if (refreshed) {
      await updateTokens(
        tenantId,
        platform,
        refreshed.accessToken,
        refreshed.refreshToken ?? credential.refreshToken,
        refreshed.expiresAt
      )
      return { ...credential, accessToken: refreshed.accessToken }
    }
  } catch (err) {
    console.warn(`[publishing-engine] Token refresh failed for ${platform}:`, err)
  }

  return credential
}

// ── Per-platform publish dispatch ─────────────────────────────────────────────

async function publishToPlatform(
  post: SocialPost,
  platform: SocialPlatform,
  tenantId: string
): Promise<PublishResult> {
  const credential = await getCredential(tenantId, platform)
  if (!credential) {
    return { success: false, error: `No active ${platform} connection`, retriable: false }
  }

  const fresh = await maybeRefreshToken(tenantId, platform, credential)
  if (!fresh) {
    return {
      success: false,
      error: `${platform} token expired and refresh failed`,
      retriable: false,
    }
  }

  if (platform === 'instagram') {
    const { publishInstagram } = await import('./adapters/meta')
    return publishInstagram(post, fresh)
  }
  if (platform === 'facebook') {
    const { publishFacebook } = await import('./adapters/meta')
    return publishFacebook(post, fresh)
  }
  if (platform === 'tiktok') {
    const { publishTikTok } = await import('./adapters/tiktok')
    return publishTikTok(post, fresh)
  }
  if (platform === 'linkedin') {
    const { publishLinkedIn } = await import('./adapters/linkedin')
    return publishLinkedIn(post, fresh)
  }
  if (platform === 'x') {
    const { publishX } = await import('./adapters/x')
    return publishX(post, fresh)
  }
  if (platform === 'pinterest') {
    const { publishPinterest } = await import('./adapters/pinterest')
    return publishPinterest(post, fresh)
  }
  if (platform === 'youtube_shorts') {
    const { publishYouTube } = await import('./adapters/youtube')
    return publishYouTube(post, fresh)
  }

  return { success: false, error: `Unknown platform: ${platform}`, retriable: false }
}

// ── Post-level update helpers ─────────────────────────────────────────────────

async function markPlatformPublished(
  db: any,
  postId: string,
  tenantId: string,
  platform: SocialPlatform,
  externalId: string
): Promise<void> {
  const { data } = await db
    .from('social_posts')
    .select('published_to_platforms, published_external_ids, platforms')
    .eq('id', postId)
    .eq('tenant_id', tenantId)
    .single()

  if (!data) return

  const publishedTo: SocialPlatform[] = data.published_to_platforms ?? []
  const externalIds: Record<string, string> = data.published_external_ids ?? {}
  const allPlatforms: SocialPlatform[] = data.platforms ?? []

  if (!publishedTo.includes(platform)) publishedTo.push(platform)
  externalIds[platform] = externalId

  const allDone = allPlatforms.every((p) => publishedTo.includes(p))

  await db
    .from('social_posts')
    .update({
      published_to_platforms: publishedTo,
      published_external_ids: externalIds,
      last_publish_at: new Date().toISOString(),
      last_publish_error: null,
      ...(allDone ? { status: 'published' } : {}),
    })
    .eq('id', postId)
    .eq('tenant_id', tenantId)
}

async function markPlatformError(
  db: any,
  postId: string,
  tenantId: string,
  platform: SocialPlatform,
  errorMsg: string,
  currentAttempts: number
): Promise<void> {
  const { data } = await db
    .from('social_posts')
    .select('publish_errors')
    .eq('id', postId)
    .eq('tenant_id', tenantId)
    .single()

  const errors: Record<string, string> = data?.publish_errors ?? {}
  errors[platform] = errorMsg

  await db
    .from('social_posts')
    .update({
      publish_errors: errors,
      publish_attempts: currentAttempts + 1,
      last_publish_error: errorMsg,
    })
    .eq('id', postId)
    .eq('tenant_id', tenantId)
}

// ── Main engine run ───────────────────────────────────────────────────────────

export async function runPublishingEngine(): Promise<EngineRun> {
  const db: any = createAdminClient()
  const run: EngineRun = { processed: 0, succeeded: 0, failed: 0, skipped: 0, errors: [] }

  // 5-minute lookahead so a post scheduled at :00 is caught by the :55 cron run
  const cutoff = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { data: posts, error: queryErr } = await db
    .from('social_posts')
    .select(
      'id, tenant_id, platforms, published_to_platforms, publish_attempts, title, ' +
        'caption_master, caption_instagram, caption_facebook, caption_tiktok, ' +
        'caption_linkedin, caption_x, caption_pinterest, caption_youtube_shorts, ' +
        'hashtags, media_url, media_type, offer_link, alt_text, cta, schedule_at'
    )
    .eq('status', 'queued')
    .eq('preflight_ready', true)
    .lte('schedule_at', cutoff)
    .lt('publish_attempts', 3) // posts that failed 3x are excluded until chef intervenes
    .order('schedule_at', { ascending: true })
    .limit(50) // cap per run to stay within self-hosted function timeout

  if (queryErr) {
    run.errors.push(`Query error: ${queryErr.message}`)
    return run
  }

  for (const row of (posts as any[]) ?? []) {
    const post = row as SocialPost & { publish_attempts: number }
    const tenantId = post.tenant_id
    const allPlatforms: SocialPlatform[] = post.platforms ?? []
    const publishedTo: SocialPlatform[] = (post as any).published_to_platforms ?? []
    const pending = allPlatforms.filter((p) => !publishedTo.includes(p))

    if (pending.length === 0) {
      run.skipped++
      continue
    }

    // CAS claim: atomically set status to 'publishing' so concurrent cron runs
    // skip this post (the eq('status', 'queued') filter excludes it once claimed).
    const { data: claimed } = await db
      .from('social_posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)
      .eq('status', 'queued')
      .select('id')
      .maybeSingle()

    if (!claimed) {
      run.skipped++
      continue // Another cron instance already claimed this post
    }

    run.processed++

    for (const platform of pending) {
      // Skip platforms that require manual posting - these are never attempted by the engine.
      const policy = PLATFORM_CAPABILITIES[platform]
      if (policy?.defaultMode === 'manual_handoff') {
        run.skipped++
        continue
      }

      // Skip platforms where media type is unsupported - these are policy violations, not failures.
      if (policy && policy.unsupportedMediaTypes.includes(post.media_type)) {
        run.skipped++
        continue
      }

      try {
        const result = await publishToPlatform(post, platform, tenantId)

        if (result.success) {
          await markPlatformPublished(
            db,
            post.id,
            tenantId,
            platform,
            result.externalId ?? 'unknown'
          )
          await recordPublishSuccess(tenantId, platform)
          run.succeeded++
        } else {
          await markPlatformError(
            db,
            post.id,
            tenantId,
            platform,
            result.error ?? 'Unknown error',
            post.publish_attempts
          )
          await recordPublishError(tenantId, platform, result.error ?? 'Unknown error')
          run.failed++

          // Notify chef when a post hits 3 failures
          if (post.publish_attempts + 1 >= 3) {
            try {
              const { sendChefPublishFailureNotification } = await import('./notify')
              await sendChefPublishFailureNotification(tenantId, post.id, post.title, platform)
            } catch {
              // Non-fatal - notification failure does not block publishing
            }
          }
        }
      } catch (err) {
        const msg = (err as Error).message
        run.errors.push(`Post ${post.id} / ${platform}: ${msg}`)
        run.failed++
      }
    }

    // Re-check: if not all platforms are published, reset to 'queued' so the next
    // cron run can retry remaining platforms. markPlatformPublished sets 'published'
    // when all platforms are done, so only reset if still in 'publishing'.
    const { data: postStatus } = await db
      .from('social_posts')
      .select('status')
      .eq('id', post.id)
      .single()

    if (postStatus?.status === 'publishing') {
      await db
        .from('social_posts')
        .update({ status: 'queued' })
        .eq('id', post.id)
        .eq('status', 'publishing')
    }
  }

  return run
}
