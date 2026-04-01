// Social Post Publishability Assessment
// Pure logic: takes post data + connected platforms + policy rules.
// Returns a per-platform delivery assessment with mode, blockers, and warnings.
// No database access. No side effects.

import type { SocialPost, SocialPlatform, PlatformDeliveryAssessment } from './types'
import { PLATFORM_CAPABILITIES, resolveDeliveryMode } from './platform-policy'

/**
 * Assess publishability for every platform the post targets.
 * `connectedPlatforms` is the set of platforms with valid credentials.
 */
export function assessPublishability(
  post: SocialPost,
  connectedPlatforms: Set<SocialPlatform>
): PlatformDeliveryAssessment[] {
  return post.platforms.map((platform) => assessPlatform(post, platform, connectedPlatforms))
}

/**
 * Assess a single platform for a post.
 */
export function assessPlatform(
  post: SocialPost,
  platform: SocialPlatform,
  connectedPlatforms: Set<SocialPlatform>
): PlatformDeliveryAssessment {
  const connected = connectedPlatforms.has(platform)
  const policy = PLATFORM_CAPABILITIES[platform]
  const blockers: string[] = []
  const warnings: string[] = []

  if (!connected) {
    return {
      platform,
      mode: 'blocked',
      reason: `${policy?.label ?? platform} is not connected.`,
      blockers: [`Connect your ${policy?.label ?? platform} account in Platform Connections.`],
      warnings: [],
    }
  }

  // Media type check
  if (policy) {
    if (policy.unsupportedMediaTypes.includes(post.media_type)) {
      blockers.push(
        `${policy.label} does not support ${post.media_type} posts via the API. Change media type or remove ${policy.label} from this post.`
      )
    }

    // Hard blockers from policy
    policy.hardBlockers.forEach((b) => blockers.push(b))

    // App approval warning
    if (policy.requiresAppApproval && policy.defaultMode !== 'direct_publish') {
      warnings.push(
        `${policy.label} posts will upload as drafts. Full auto-publish requires platform-level app approval that has not been granted yet.`
      )
    }

    // Capability notes as warnings
    policy.capabilityNotes.forEach((note) => warnings.push(note))
  }

  // Caption length checks
  const captionLimits: Partial<Record<SocialPlatform, number>> = {
    instagram: 2200,
    tiktok: 2200,
    x: 280,
    linkedin: 3000,
    facebook: 63206,
    pinterest: 500,
    youtube_shorts: 5000,
  }
  const captionKey = `caption_${platform}` as keyof SocialPost
  const caption = (post[captionKey] as string | null) || post.caption_master || ''
  const limit = captionLimits[platform]
  if (limit && caption.length > limit) {
    warnings.push(
      `Caption is ${caption.length} chars. ${policy?.label ?? platform} limit is ${limit}. It will be truncated.`
    )
  }

  // No media when media is required
  const requiresMedia: SocialPlatform[] = ['instagram', 'tiktok', 'youtube_shorts', 'pinterest']
  if (requiresMedia.includes(platform) && !post.media_url) {
    blockers.push(`${policy?.label ?? platform} requires a media file. Attach a photo or video.`)
  }

  const mode =
    blockers.length > 0 ? 'blocked' : resolveDeliveryMode(platform, true, post.media_type)

  return {
    platform,
    mode,
    reason: blockers.length > 0 ? blockers[0] : undefined,
    blockers,
    warnings,
  }
}

/**
 * Returns true if a post can be queued to at least one platform in a publishable mode.
 */
export function isQueueable(assessments: PlatformDeliveryAssessment[]): boolean {
  return assessments.some((a) => a.mode !== 'blocked')
}

/**
 * Returns assessments for platforms that will actually be attempted by the engine.
 * blocked and manual_handoff platforms are excluded from engine dispatch.
 */
export function getEngineTargets(
  assessments: PlatformDeliveryAssessment[]
): PlatformDeliveryAssessment[] {
  return assessments.filter((a) => a.mode === 'direct_publish' || a.mode === 'upload_as_draft')
}
