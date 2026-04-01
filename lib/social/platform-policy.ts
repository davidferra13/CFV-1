// Social Platform Policy
// Central capability matrix for each supported social platform.
// Defines delivery modes, supported media types, hard blockers, and warnings.
// This is the single source of truth for what ChefFlow can actually do per platform.

import type { SocialPlatform, SocialMediaType, SocialDeliveryMode } from './types'

export type PlatformCapability = {
  platform: SocialPlatform
  label: string
  /**
   * Default delivery mode when a valid credential + supported content combination exists.
   * Some platforms may downgrade to upload_as_draft or manual_handoff based on content.
   */
  defaultMode: SocialDeliveryMode
  /** Media types the API actually supports for direct publish or upload_as_draft. */
  supportedMediaTypes: SocialMediaType[]
  /** Media types that are unsupported and will result in blocked. */
  unsupportedMediaTypes: SocialMediaType[]
  /**
   * True if the platform API requires special app-level approval before auto-posting.
   * Causes default mode to downgrade to upload_as_draft or manual_handoff until proven.
   */
  requiresAppApproval: boolean
  /** Hard blockers that always cause mode=blocked regardless of content. */
  hardBlockers: string[]
  /** Warnings surfaced when the platform is connected and in use. */
  capabilityNotes: string[]
}

export const PLATFORM_CAPABILITIES: Record<SocialPlatform, PlatformCapability> = {
  instagram: {
    platform: 'instagram',
    label: 'Instagram',
    defaultMode: 'direct_publish',
    supportedMediaTypes: ['image', 'video', 'carousel'],
    unsupportedMediaTypes: ['text'],
    requiresAppApproval: false,
    hardBlockers: [],
    capabilityNotes: [
      'Text-only posts are not supported via the Instagram API.',
      'Carousels require at least 2 and at most 10 media items.',
      'Videos must be MP4, H.264 codec, under 100MB for Reels.',
    ],
  },
  facebook: {
    platform: 'facebook',
    label: 'Facebook',
    defaultMode: 'direct_publish',
    supportedMediaTypes: ['image', 'video', 'text'],
    unsupportedMediaTypes: ['carousel'],
    requiresAppApproval: false,
    hardBlockers: [],
    capabilityNotes: [
      'Carousel posts are not supported via the Facebook Pages API.',
      'Requires a Facebook Page connection, not a personal profile.',
    ],
  },
  tiktok: {
    platform: 'tiktok',
    label: 'TikTok',
    defaultMode: 'upload_as_draft',
    supportedMediaTypes: ['video'],
    unsupportedMediaTypes: ['image', 'carousel', 'text'],
    requiresAppApproval: true,
    hardBlockers: [],
    capabilityNotes: [
      'TikTok API only supports VIDEO content. Image and text posts are not available.',
      'Direct auto-publishing requires TikTok app-level approval that has not been granted yet.',
      'Posts upload as drafts for your review in the TikTok Creator Studio before publication.',
      'Video must be publicly accessible at the time of upload.',
    ],
  },
  linkedin: {
    platform: 'linkedin',
    label: 'LinkedIn',
    defaultMode: 'direct_publish',
    supportedMediaTypes: ['image', 'video', 'text'],
    unsupportedMediaTypes: ['carousel'],
    requiresAppApproval: false,
    hardBlockers: [],
    capabilityNotes: [
      'LinkedIn carousel posts require the Documents API, which requires additional approval.',
    ],
  },
  x: {
    platform: 'x',
    label: 'X',
    defaultMode: 'direct_publish',
    supportedMediaTypes: ['image', 'video', 'text'],
    unsupportedMediaTypes: ['carousel'],
    requiresAppApproval: false,
    hardBlockers: [],
    capabilityNotes: [
      'Carousel posts are not supported via the X API.',
      'Videos must be under 512MB and 2 minutes 20 seconds.',
    ],
  },
  pinterest: {
    platform: 'pinterest',
    label: 'Pinterest',
    defaultMode: 'direct_publish',
    supportedMediaTypes: ['image', 'video'],
    unsupportedMediaTypes: ['text', 'carousel'],
    requiresAppApproval: false,
    hardBlockers: [],
    capabilityNotes: [
      'Pinterest requires at least one image or video.',
      'Text-only and carousel posts are not supported.',
    ],
  },
  youtube_shorts: {
    platform: 'youtube_shorts',
    label: 'YouTube Shorts',
    defaultMode: 'upload_as_draft',
    supportedMediaTypes: ['video'],
    unsupportedMediaTypes: ['image', 'carousel', 'text'],
    requiresAppApproval: false,
    hardBlockers: [],
    capabilityNotes: [
      'Only video content is supported.',
      'Videos upload as unlisted drafts for your review before publication.',
      'Shorts must be under 60 seconds and in vertical (9:16) format for Shorts feed.',
    ],
  },
}

/**
 * Given a platform, whether it has a connected credential, and the current media type,
 * return the delivery mode that will actually be used.
 */
export function resolveDeliveryMode(
  platform: SocialPlatform,
  connected: boolean,
  mediaType: SocialMediaType
): SocialDeliveryMode {
  if (!connected) return 'blocked'

  const policy = PLATFORM_CAPABILITIES[platform]
  if (!policy) return 'blocked'

  if (policy.unsupportedMediaTypes.includes(mediaType)) return 'blocked'
  if (!policy.supportedMediaTypes.includes(mediaType)) return 'blocked'

  return policy.defaultMode
}
