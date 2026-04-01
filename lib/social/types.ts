export type SocialPostStatus = 'idea' | 'draft' | 'approved' | 'queued' | 'published' | 'archived'

/**
 * How ChefFlow will deliver a post to a given platform.
 * - direct_publish: API posts directly to the live feed.
 * - upload_as_draft: API uploads as a draft for manual review before publication.
 * - manual_handoff: No safe API path; content is prepared for manual posting.
 * - blocked: Platform connection missing, content type unsupported, or policy violation.
 */
export type SocialDeliveryMode = 'direct_publish' | 'upload_as_draft' | 'manual_handoff' | 'blocked'

export type PlatformDeliveryAssessment = {
  platform: SocialPlatform
  mode: SocialDeliveryMode
  /** Human-readable reason, shown in UI for manual_handoff or blocked. */
  reason?: string
  /** Specific things the user can fix to unlock a better delivery mode. */
  blockers: string[]
  /** Non-blocking notes (e.g. caption will be truncated). */
  warnings: string[]
}

export type OpenClawSocialPackage = {
  /** Unique ID from OpenClaw for traceability. */
  provenance_id: string
  platform_targets: SocialPlatform[]
  media_type: SocialMediaType
  caption_master: string
  caption_overrides?: Partial<Record<SocialPlatform, string>>
  hashtags?: string[]
  cta?: string
  pillar?: SocialPillar
  campaign?: string
  notes?: string
  /** Publicly accessible URLs for media assets OpenClaw has already hosted. */
  asset_urls?: string[]
}

export type SocialPillar =
  | 'recipe'
  | 'behind_scenes'
  | 'education'
  | 'social_proof'
  | 'offers'
  | 'seasonal'

export type SocialMediaType = 'image' | 'video' | 'carousel' | 'text'
export type SocialAssetKind = 'image' | 'video'

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'linkedin'
  | 'x'
  | 'pinterest'
  | 'youtube_shorts'

export type SocialQueueSettings = {
  tenant_id: string
  created_by: string
  target_year: number
  posts_per_week: number
  timezone: string
  queue_days: number[]
  queue_times: string[]
  holdout_slots_per_month: number
  created_at: string
  updated_at: string
}

export type SocialPost = {
  id: string
  tenant_id: string
  created_by: string
  updated_by: string | null
  post_code: string
  target_year: number
  week_number: number
  slot_number: number
  schedule_at: string
  editable_until: string | null
  pillar: SocialPillar
  status: SocialPostStatus
  media_type: SocialMediaType
  title: string
  caption_master: string
  caption_instagram: string
  caption_facebook: string
  caption_tiktok: string
  caption_linkedin: string
  caption_x: string
  caption_pinterest: string
  caption_youtube_shorts: string
  hashtags: string[]
  cta: string
  offer_link: string | null
  media_url: string | null
  platforms: SocialPlatform[]
  campaign: string
  seasonal_flag: boolean
  hot_swap_ready: boolean
  notes: string
  mention_handles: string[]
  collaborator_tags: string[]
  location_tag: string
  alt_text: string
  thumbnail_time_seconds: number | null
  thumbnail_url: string | null
  publish_checklist_notes: string
  preflight_ready: boolean
  preflight_missing_items: string[]
  queued_to_platforms: SocialPlatform[]
  published_to_platforms: SocialPlatform[]
  created_at: string
  updated_at: string
}

export type SocialMediaAsset = {
  id: string
  tenant_id: string
  created_by: string
  updated_by: string | null
  asset_kind: SocialAssetKind
  asset_name: string
  original_filename: string
  mime_type: string
  storage_path: string
  public_url: string
  file_size_bytes: number
  duration_seconds: number | null
  width_px: number | null
  height_px: number | null
  asset_tags: string[]
  usage_context: string
  is_client_approved: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type SocialPostAssetLink = {
  id: string
  tenant_id: string
  post_id: string
  asset_id: string
  is_primary: boolean
  display_order: number
  created_by: string
  created_at: string
}

export type SocialQueueSummary = {
  totalPosts: number
  postsPerWeek: number
  targetYear: number
  byStatus: Record<SocialPostStatus, number>
  byPillar: Record<SocialPillar, number>
  next30Days: number
  editableNow: number
  hotSwapReady: number
}

export type SocialPlatformWindow = {
  platform: SocialPlatform
  label: string
  windowDays: number
  maxPostsPerExport: number | null
}

export const SOCIAL_PLATFORM_WINDOWS: SocialPlatformWindow[] = [
  { platform: 'instagram', label: 'Instagram', windowDays: 29, maxPostsPerExport: null },
  { platform: 'facebook', label: 'Facebook', windowDays: 29, maxPostsPerExport: null },
  { platform: 'linkedin', label: 'LinkedIn', windowDays: 90, maxPostsPerExport: null },
  { platform: 'pinterest', label: 'Pinterest', windowDays: 30, maxPostsPerExport: 10 },
  { platform: 'tiktok', label: 'TikTok', windowDays: 10, maxPostsPerExport: null },
  { platform: 'x', label: 'X', windowDays: 30, maxPostsPerExport: null },
  { platform: 'youtube_shorts', label: 'YouTube Shorts', windowDays: 180, maxPostsPerExport: null },
]

export const SOCIAL_PILLAR_TARGETS: Record<SocialPillar, number> = {
  recipe: 80,
  behind_scenes: 50,
  education: 40,
  social_proof: 35,
  offers: 35,
  seasonal: 20,
}

export const SOCIAL_STATUS_LABELS: Record<SocialPostStatus, string> = {
  idea: 'Idea',
  draft: 'Draft',
  approved: 'Approved',
  queued: 'Queued',
  published: 'Published',
  archived: 'Archived',
}

export const SOCIAL_PILLAR_LABELS: Record<SocialPillar, string> = {
  recipe: 'Recipes & How-To',
  behind_scenes: 'Behind the Scenes',
  education: 'Education',
  social_proof: 'Social Proof',
  offers: 'Offers & Events',
  seasonal: 'Seasonal',
}

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  x: 'X',
  pinterest: 'Pinterest',
  youtube_shorts: 'YouTube Shorts',
}
