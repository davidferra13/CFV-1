'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  SocialAssetKind,
  SocialMediaAsset,
  SocialPlatform,
  SocialPillar,
  SocialPost,
  SocialPostAssetLink,
  SocialPostStatus,
  SocialQueueSettings,
  SocialQueueSummary,
} from './types'
import {
  SOCIAL_PILLAR_TARGETS,
  SOCIAL_PLATFORM_WINDOWS,
} from './types'

const DEFAULT_TIMEZONE = 'America/New_York'
const SOCIAL_MEDIA_BUCKET = 'social-media-vault'
const MAX_SOCIAL_ASSET_SIZE = 100 * 1024 * 1024
const ALLOWED_SOCIAL_ASSET_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]

const DEFAULT_QUEUE_DAYS = [1, 2, 3, 4, 5]
const DEFAULT_QUEUE_TIMES = ['11:00', '13:00', '11:00', '13:00', '11:00']

const QueueSettingsSchema = z.object({
  target_year: z.number().int().min(2020).max(2100),
  posts_per_week: z.number().int().min(1).max(7).default(5),
  timezone: z.string().min(2).max(64).default(DEFAULT_TIMEZONE),
  queue_days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  queue_times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(7),
  holdout_slots_per_month: z.number().int().min(0).max(10).default(2),
}).refine((value) => value.queue_days.length === value.queue_times.length, {
  message: 'Queue days and queue times must have equal length.',
})

const GenerateAnnualPlanSchema = QueueSettingsSchema.extend({
  force_regenerate: z.boolean().default(false),
}).refine((value) => value.posts_per_week === value.queue_days.length, {
  message: 'Posts per week must match the number of queue days.',
})

const UpdatePostSchema = z.object({
  status: z.enum(['idea', 'draft', 'approved', 'queued', 'published', 'archived']).optional(),
  pillar: z.enum(['recipe', 'behind_scenes', 'education', 'social_proof', 'offers', 'seasonal']).optional(),
  media_type: z.enum(['image', 'video', 'carousel', 'text']).optional(),
  title: z.string().max(140).optional(),
  caption_master: z.string().optional(),
  caption_instagram: z.string().optional(),
  caption_facebook: z.string().optional(),
  caption_tiktok: z.string().optional(),
  caption_linkedin: z.string().optional(),
  caption_x: z.string().optional(),
  caption_pinterest: z.string().optional(),
  caption_youtube_shorts: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  mention_handles: z.array(z.string()).optional(),
  collaborator_tags: z.array(z.string()).optional(),
  location_tag: z.string().optional(),
  alt_text: z.string().optional(),
  thumbnail_time_seconds: z.number().int().min(0).max(3600).nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  publish_checklist_notes: z.string().optional(),
  cta: z.string().optional(),
  offer_link: z.string().nullable().optional(),
  media_url: z.string().nullable().optional(),
  campaign: z.string().optional(),
  seasonal_flag: z.boolean().optional(),
  hot_swap_ready: z.boolean().optional(),
  notes: z.string().optional(),
  editable_until: z.string().nullable().optional(),
  platforms: z.array(z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'pinterest', 'youtube_shorts'])).optional(),
  queued_to_platforms: z.array(z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'pinterest', 'youtube_shorts'])).optional(),
  published_to_platforms: z.array(z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'pinterest', 'youtube_shorts'])).optional(),
})

const PlatformExportSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'x', 'pinterest', 'youtube_shorts']),
})

const HotSwapSchema = z.object({
  scheduled_post_id: z.string().uuid(),
  hot_swap_post_id: z.string().uuid(),
})

const AttachAssetSchema = z.object({
  post_id: z.string().uuid(),
  asset_id: z.string().uuid(),
  is_primary: z.boolean().default(false),
})

const DetachAssetSchema = z.object({
  link_id: z.string().uuid(),
})

const UpdateAssetSchema = z.object({
  asset_name: z.string().min(1).max(120).optional(),
  asset_tags: z.array(z.string()).optional(),
  usage_context: z.string().optional(),
  is_client_approved: z.boolean().optional(),
  is_archived: z.boolean().optional(),
})

type QueueSettingsInput = z.infer<typeof QueueSettingsSchema>
type AnnualGenerationInput = z.infer<typeof GenerateAnnualPlanSchema>
type UpdatePostInput = z.infer<typeof UpdatePostSchema>

const STATUS_KEYS: SocialPostStatus[] = ['idea', 'draft', 'approved', 'queued', 'published', 'archived']
const PILLAR_KEYS: SocialPillar[] = ['recipe', 'behind_scenes', 'education', 'social_proof', 'offers', 'seasonal']

const platformCaptionField: Record<SocialPlatform, keyof SocialPost> = {
  instagram: 'caption_instagram',
  facebook: 'caption_facebook',
  tiktok: 'caption_tiktok',
  linkedin: 'caption_linkedin',
  x: 'caption_x',
  pinterest: 'caption_pinterest',
  youtube_shorts: 'caption_youtube_shorts',
}

type PlannedSlot = {
  scheduleAt: string
  editableUntil: string
  month: number
  weekNumber: number
  slotNumber: number
}

type GeneratedContent = {
  title: string
  captionMaster: string
  captionInstagram: string
  captionFacebook: string
  captionTikTok: string
  captionLinkedIn: string
  captionX: string
  captionPinterest: string
  captionYouTubeShorts: string
  hashtags: string[]
  cta: string
  campaign: string
  mediaType: 'image' | 'video' | 'carousel' | 'text'
  seasonalFlag: boolean
}

const PILLAR_IDEA_TEMPLATES: Record<SocialPillar, string[]> = {
  recipe: [
    'Chef tip breakdown',
    '30-minute signature plate',
    'Ingredient spotlight recipe',
    'Elegant weeknight course',
    'Plating tutorial',
    'Sauce technique quick lesson',
    'Knife-skill prep moment',
    'High-protein prep recipe',
    'Family-style seasonal menu',
    'Date-night tasting idea',
  ],
  behind_scenes: [
    'Kitchen prep timeline',
    'What happens before guests arrive',
    'Mise en place snapshot',
    'Farmer market sourcing run',
    'Chef toolkit showcase',
    'Day-of service routine',
    'Cleanup and reset process',
    'What a private event setup looks like',
    'How menu decisions are made',
    'Taste testing workflow',
  ],
  education: [
    'How to choose produce by season',
    'Protein temperature basics',
    'Salt and acid balancing tip',
    'How to pair sides to mains',
    'Pan vs oven finishing method',
    'When to rest proteins',
    'Stock building fundamentals',
    'Menu pacing for multi-course meals',
    'Storage and shelf-life guide',
    'Budgeting premium ingredients',
  ],
  social_proof: [
    'Client testimonial spotlight',
    'Before/after table setup',
    'Favorite guest feedback moment',
    'Most requested menu item',
    'VIP dinner recap',
    'Repeat client success story',
    'Event recap with outcomes',
    'What clients say after service',
    'Top-rated menu experience',
    'Celebration highlight',
  ],
  offers: [
    'Monthly booking window reminder',
    'Holiday event booking push',
    'Chef table package spotlight',
    'Limited date availability update',
    'Weekend booking callout',
    'Corporate private dinner offer',
    'Tasting menu launch',
    'Seasonal package announcement',
    'Last-minute slot opening',
    'Referral incentive reminder',
  ],
  seasonal: [
    'Winter comfort special',
    'Spring produce showcase',
    'Summer grilling menu',
    'Fall harvest tasting',
    'Mother\'s Day menu angle',
    'Fourth of July prep idea',
    'Back-to-school meal prep',
    'Thanksgiving prep strategy',
    'Holiday hosting guide',
    'New Year entertaining tip',
  ],
}

function toIsoDay(date: Date): number {
  const day = date.getUTCDay()
  return day === 0 ? 7 : day
}

function parseClockValue(value: string): { hour: number; minute: number } {
  const [hourPart, minutePart] = value.split(':')
  return {
    hour: Number(hourPart),
    minute: Number(minutePart),
  }
}

function buildUtcDate(year: number, monthIndex: number, dayOfMonth: number, clock: string): Date {
  const { hour, minute } = parseClockValue(clock)
  return new Date(Date.UTC(year, monthIndex, dayOfMonth, hour, minute, 0, 0))
}

function formatPostCode(year: number, weekNumber: number, slotNumber: number): string {
  return `${year}-W${String(weekNumber).padStart(2, '0')}-P${slotNumber}`
}

function toSummary(posts: SocialPost[], postsPerWeek: number, targetYear: number): SocialQueueSummary {
  const byStatus: Record<SocialPostStatus, number> = {
    idea: 0,
    draft: 0,
    approved: 0,
    queued: 0,
    published: 0,
    archived: 0,
  }

  const byPillar: Record<SocialPillar, number> = {
    recipe: 0,
    behind_scenes: 0,
    education: 0,
    social_proof: 0,
    offers: 0,
    seasonal: 0,
  }

  const now = new Date()
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let next30Days = 0
  let editableNow = 0
  let hotSwapReady = 0

  for (const post of posts) {
    byStatus[post.status] = (byStatus[post.status] ?? 0) + 1
    byPillar[post.pillar] = (byPillar[post.pillar] ?? 0) + 1

    const scheduleAt = new Date(post.schedule_at)
    if (scheduleAt >= now && scheduleAt <= next30) {
      next30Days += 1
    }

    if (post.editable_until) {
      const editableUntil = new Date(post.editable_until)
      if (editableUntil >= now && post.status !== 'published' && post.status !== 'archived') {
        editableNow += 1
      }
    }

    if (post.hot_swap_ready) {
      hotSwapReady += 1
    }
  }

  return {
    totalPosts: posts.length,
    postsPerWeek,
    targetYear,
    byStatus,
    byPillar,
    next30Days,
    editableNow,
    hotSwapReady,
  }
}

function buildScaledPillarTargets(totalPosts: number): Record<SocialPillar, number> {
  const baseTotal = Object.values(SOCIAL_PILLAR_TARGETS).reduce((sum, value) => sum + value, 0)
  const scaled: Record<SocialPillar, number> = {
    recipe: 0,
    behind_scenes: 0,
    education: 0,
    social_proof: 0,
    offers: 0,
    seasonal: 0,
  }

  const fractions: Array<{ pillar: SocialPillar; remainder: number }> = []
  let allocated = 0

  for (const pillar of PILLAR_KEYS) {
    const exact = (SOCIAL_PILLAR_TARGETS[pillar] / baseTotal) * totalPosts
    const floored = Math.floor(exact)
    scaled[pillar] = floored
    allocated += floored
    fractions.push({ pillar, remainder: exact - floored })
  }

  fractions.sort((a, b) => b.remainder - a.remainder)
  let pointer = 0

  while (allocated < totalPosts) {
    const next = fractions[pointer]
    scaled[next.pillar] += 1
    allocated += 1
    pointer = (pointer + 1) % fractions.length
  }

  return scaled
}

function buildPillarSequence(totalPosts: number): SocialPillar[] {
  const remaining = buildScaledPillarTargets(totalPosts)
  const assigned: Record<SocialPillar, number> = {
    recipe: 0,
    behind_scenes: 0,
    education: 0,
    social_proof: 0,
    offers: 0,
    seasonal: 0,
  }

  const sequence: SocialPillar[] = []

  for (let index = 0; index < totalPosts; index += 1) {
    let selected: SocialPillar | null = null
    let selectedScore = -1

    for (const pillar of PILLAR_KEYS) {
      const left = remaining[pillar]
      if (left <= 0) continue
      const score = left / (assigned[pillar] + 1)
      if (score > selectedScore) {
        selected = pillar
        selectedScore = score
      }
    }

    if (!selected) {
      selected = 'recipe'
    }

    sequence.push(selected)
    remaining[selected] -= 1
    assigned[selected] += 1
  }

  return sequence
}

function buildGeneratedContent(
  pillar: SocialPillar,
  index: number,
  scheduleAtIso: string,
  reserved: boolean,
): GeneratedContent {
  if (reserved) {
    return {
      title: 'Reserved Slot - Timely Content',
      captionMaster: 'Reserved slot for timely updates, promotions, or local moments.',
      captionInstagram: 'Reserved slot for timely updates, promotions, or local moments.',
      captionFacebook: 'Reserved slot for timely updates, promotions, or local moments.',
      captionTikTok: 'Reserved slot for timely updates, promotions, or local moments.',
      captionLinkedIn: 'Reserved slot for timely updates, promotions, or local moments.',
      captionX: 'Reserved slot for timely updates, promotions, or local moments.',
      captionPinterest: 'Reserved slot for timely updates, promotions, or local moments.',
      captionYouTubeShorts: 'Reserved slot for timely updates, promotions, or local moments.',
      hashtags: ['#chef', '#seasonal', '#privatechef'],
      cta: 'Replace this slot with your timely promotion.',
      campaign: 'Reserved',
      mediaType: 'image',
      seasonalFlag: true,
    }
  }

  const templateList = PILLAR_IDEA_TEMPLATES[pillar]
  const idea = templateList[index % templateList.length]
  const scheduleDate = new Date(scheduleAtIso).toISOString().slice(0, 10)
  const ordinal = index + 1

  const baseTitle = `${idea} (${ordinal})`
  const baseCaption = `ChefFlow content vault post ${ordinal}: ${idea}. Publish date ${scheduleDate}.`

  return {
    title: baseTitle,
    captionMaster: `${baseCaption} Share one clear takeaway and invite engagement.`,
    captionInstagram: `${baseCaption}\n\nSave this for your next menu planning day.`,
    captionFacebook: `${baseCaption} Comment with what you want to see next.`,
    captionTikTok: `${idea}. Quick chef breakdown in 20 seconds.`,
    captionLinkedIn: `${baseCaption} This is how chefs systemize repeatable results.`,
    captionX: `${idea}. Short chef lesson for this week.`,
    captionPinterest: `${idea} - save for your next private dinner idea.`,
    captionYouTubeShorts: `${idea} in under 30 seconds with a chef workflow.`,
    hashtags: ['#privatechef', '#chefworkflow', '#cheflife'],
    cta: 'DM to book your next private dining experience.',
    campaign: pillar === 'offers' ? 'Booking Push' : 'Evergreen',
    mediaType: pillar === 'behind_scenes' ? 'video' : 'image',
    seasonalFlag: pillar === 'seasonal',
  }
}

function buildScheduleSlots(input: QueueSettingsInput): PlannedSlot[] {
  const yearStart = new Date(Date.UTC(input.target_year, 0, 1, 0, 0, 0, 0))
  const yearEnd = new Date(Date.UTC(input.target_year, 11, 31, 23, 59, 59, 999))
  const desired = input.posts_per_week * 52

  const dayToClock = new Map<number, string>()
  input.queue_days.forEach((day, index) => {
    dayToClock.set(day, input.queue_times[index])
  })

  const slots: PlannedSlot[] = []
  let cursor = new Date(yearStart)

  while (cursor <= yearEnd && slots.length < desired) {
    const day = toIsoDay(cursor)
    const clock = dayToClock.get(day)

    if (clock) {
      const plannedDate = buildUtcDate(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        cursor.getUTCDate(),
        clock,
      )
      const editableUntil = new Date(plannedDate.getTime() - 48 * 60 * 60 * 1000)

      const ordinal = slots.length
      const weekNumber = Math.floor(ordinal / input.posts_per_week) + 1
      const slotNumber = (ordinal % input.posts_per_week) + 1

      slots.push({
        scheduleAt: plannedDate.toISOString(),
        editableUntil: editableUntil.toISOString(),
        month: plannedDate.getUTCMonth() + 1,
        weekNumber,
        slotNumber,
      })
    }

    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }

  if (slots.length < desired) {
    throw new Error(`Could not build ${desired} slots. Increase queue days or reduce posts per week.`)
  }

  return slots
}

function getReservedIndexes(slots: PlannedSlot[], holdoutSlotsPerMonth: number): Set<number> {
  if (holdoutSlotsPerMonth <= 0) return new Set<number>()

  const monthToIndexes = new Map<number, number[]>()

  for (let index = 0; index < slots.length; index += 1) {
    const month = slots[index].month
    const list = monthToIndexes.get(month) ?? []
    list.push(index)
    monthToIndexes.set(month, list)
  }

  const reserved = new Set<number>()

  for (const indexes of monthToIndexes.values()) {
    const start = Math.max(indexes.length - holdoutSlotsPerMonth, 0)
    for (let cursor = start; cursor < indexes.length; cursor += 1) {
      reserved.add(indexes[cursor])
    }
  }

  return reserved
}

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const headerRow = headers.join(',')
  const bodyRows = rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? '')).join(','))
  return [headerRow, ...bodyRows].join('\n')
}

function normalizeSettingsRow(
  row: Partial<SocialQueueSettings> | null | undefined,
  tenantId: string,
  userId: string,
): SocialQueueSettings {
  const year = new Date().getUTCFullYear()
  return {
    tenant_id: row?.tenant_id ?? tenantId,
    created_by: row?.created_by ?? userId,
    target_year: row?.target_year ?? year,
    posts_per_week: row?.posts_per_week ?? 5,
    timezone: row?.timezone ?? DEFAULT_TIMEZONE,
    queue_days: row?.queue_days ?? DEFAULT_QUEUE_DAYS,
    queue_times: row?.queue_times ?? DEFAULT_QUEUE_TIMES,
    holdout_slots_per_month: row?.holdout_slots_per_month ?? 2,
    created_at: row?.created_at ?? new Date().toISOString(),
    updated_at: row?.updated_at ?? new Date().toISOString(),
  }
}

function mapPostRow(row: any): SocialPost {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    created_by: row.created_by,
    updated_by: row.updated_by ?? null,
    post_code: row.post_code,
    target_year: row.target_year,
    week_number: row.week_number,
    slot_number: row.slot_number,
    schedule_at: row.schedule_at,
    editable_until: row.editable_until ?? null,
    pillar: row.pillar,
    status: row.status,
    media_type: row.media_type,
    title: row.title ?? '',
    caption_master: row.caption_master ?? '',
    caption_instagram: row.caption_instagram ?? '',
    caption_facebook: row.caption_facebook ?? '',
    caption_tiktok: row.caption_tiktok ?? '',
    caption_linkedin: row.caption_linkedin ?? '',
    caption_x: row.caption_x ?? '',
    caption_pinterest: row.caption_pinterest ?? '',
    caption_youtube_shorts: row.caption_youtube_shorts ?? '',
    hashtags: row.hashtags ?? [],
    mention_handles: row.mention_handles ?? [],
    collaborator_tags: row.collaborator_tags ?? [],
    location_tag: row.location_tag ?? '',
    alt_text: row.alt_text ?? '',
    thumbnail_time_seconds: row.thumbnail_time_seconds ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    publish_checklist_notes: row.publish_checklist_notes ?? '',
    preflight_ready: Boolean(row.preflight_ready),
    preflight_missing_items: row.preflight_missing_items ?? [],
    cta: row.cta ?? '',
    offer_link: row.offer_link ?? null,
    media_url: row.media_url ?? null,
    platforms: row.platforms ?? [],
    campaign: row.campaign ?? '',
    seasonal_flag: Boolean(row.seasonal_flag),
    hot_swap_ready: Boolean(row.hot_swap_ready),
    notes: row.notes ?? '',
    queued_to_platforms: row.queued_to_platforms ?? [],
    published_to_platforms: row.published_to_platforms ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapAssetRow(row: any): SocialMediaAsset {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    created_by: row.created_by,
    updated_by: row.updated_by ?? null,
    asset_kind: row.asset_kind,
    asset_name: row.asset_name ?? '',
    original_filename: row.original_filename ?? '',
    mime_type: row.mime_type ?? '',
    storage_path: row.storage_path ?? '',
    public_url: row.public_url ?? '',
    file_size_bytes: Number(row.file_size_bytes ?? 0),
    duration_seconds: row.duration_seconds ?? null,
    width_px: row.width_px ?? null,
    height_px: row.height_px ?? null,
    asset_tags: row.asset_tags ?? [],
    usage_context: row.usage_context ?? '',
    is_client_approved: Boolean(row.is_client_approved),
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapPostAssetLinkRow(row: any): SocialPostAssetLink {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    post_id: row.post_id,
    asset_id: row.asset_id,
    is_primary: Boolean(row.is_primary),
    display_order: Number(row.display_order ?? 1),
    created_by: row.created_by,
    created_at: row.created_at,
  }
}

function parseTagInput(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function inferAssetKind(contentType: string): SocialAssetKind {
  return contentType.startsWith('video/') ? 'video' : 'image'
}

function inferExtension(file: File): string {
  const extFromName = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (extFromName) return extFromName
  if (file.type === 'video/mp4') return 'mp4'
  if (file.type === 'video/webm') return 'webm'
  if (file.type === 'video/quicktime') return 'mov'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

function computePreflight(post: SocialPost, linkedAssetCount: number) {
  const missing: string[] = []

  if (!post.title.trim()) missing.push('Title')
  if (!post.caption_master.trim()) missing.push('Master caption')
  if (!post.cta.trim()) missing.push('CTA')
  if ((post.hashtags ?? []).length === 0) missing.push('Hashtags')
  if ((post.mention_handles ?? []).length === 0) missing.push('Mention tags')
  if (!post.location_tag.trim()) missing.push('Location tag')
  if (!post.alt_text.trim()) missing.push('Alt text')
  if ((post.platforms ?? []).length === 0) missing.push('Platform selection')

  const hasMedia = Boolean(post.media_url?.trim()) || linkedAssetCount > 0
  if (!hasMedia) missing.push('Media asset')

  return {
    preflight_ready: missing.length === 0,
    preflight_missing_items: missing,
  }
}

async function getLinkedAssetCount(supabase: any, tenantId: string, postId: string): Promise<number> {
  const { count, error } = await supabase
    .from('social_post_assets' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('post_id', postId)

  if (error) {
    console.error('[getLinkedAssetCount] Query failed:', error)
    return 0
  }

  return count ?? 0
}

async function refreshPostPreflight(supabase: any, tenantId: string, postId: string, updatedBy: string): Promise<void> {
  const { data, error } = await supabase
    .from('social_posts' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', postId)
    .single()

  if (error || !data) return

  const current = mapPostRow(data)
  const linkedAssetCount = await getLinkedAssetCount(supabase, tenantId, postId)
  const preflight = computePreflight(current, linkedAssetCount)

  await supabase
    .from('social_posts' as any)
    .update({
      preflight_ready: preflight.preflight_ready,
      preflight_missing_items: preflight.preflight_missing_items,
      updated_by: updatedBy,
    })
    .eq('tenant_id', tenantId)
    .eq('id', postId)
}

export async function getSocialQueueSettings(): Promise<SocialQueueSettings> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('social_queue_settings' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  if (error) {
    console.error('[getSocialQueueSettings] Query failed:', error)
  }

  return normalizeSettingsRow(data as Partial<SocialQueueSettings> | null, user.tenantId!, user.id)
}

export async function upsertSocialQueueSettings(input: QueueSettingsInput): Promise<SocialQueueSettings> {
  const user = await requireChef()
  const validated = QueueSettingsSchema.parse(input)
  const supabase = createServerClient()

  const payload = {
    tenant_id: user.tenantId!,
    created_by: user.id,
    target_year: validated.target_year,
    posts_per_week: validated.posts_per_week,
    timezone: validated.timezone,
    queue_days: validated.queue_days,
    queue_times: validated.queue_times,
    holdout_slots_per_month: validated.holdout_slots_per_month,
  }

  const { data, error } = await supabase
    .from('social_queue_settings' as any)
    .upsert(payload, { onConflict: 'tenant_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[upsertSocialQueueSettings] Upsert failed:', error)
    throw new Error('Failed to save social queue settings.')
  }

  revalidatePath('/social')
  return normalizeSettingsRow(data as unknown as SocialQueueSettings, user.tenantId!, user.id)
}

export async function getSocialPosts(options?: {
  targetYear?: number
  status?: SocialPostStatus
  limit?: number
}): Promise<SocialPost[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('social_posts' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('schedule_at', { ascending: true })

  if (options?.targetYear) {
    query = query.eq('target_year', options.targetYear)
  }

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (typeof options?.limit === 'number') {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getSocialPosts] Query failed:', error)
    return []
  }

  return (data ?? []).map(mapPostRow)
}

export async function getSocialMediaAssets(): Promise<SocialMediaAsset[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('social_media_assets' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getSocialMediaAssets] Query failed:', error)
    return []
  }

  return (data ?? []).map(mapAssetRow)
}

export async function getSocialPostAssetLinks(): Promise<SocialPostAssetLink[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('social_post_assets' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[getSocialPostAssetLinks] Query failed:', error)
    return []
  }

  return (data ?? []).map(mapPostAssetLinkRow)
}

export async function getSocialPlannerData(targetYear?: number): Promise<{
  settings: SocialQueueSettings
  posts: SocialPost[]
  summary: SocialQueueSummary
  assets: SocialMediaAsset[]
  links: SocialPostAssetLink[]
}> {
  const settings = await getSocialQueueSettings()
  const year = targetYear ?? settings.target_year
  const [posts, assets, links] = await Promise.all([
    getSocialPosts({ targetYear: year }),
    getSocialMediaAssets(),
    getSocialPostAssetLinks(),
  ])
  const summary = toSummary(posts, settings.posts_per_week, year)

  return {
    settings: {
      ...settings,
      target_year: year,
    },
    posts,
    summary,
    assets,
    links,
  }
}

export async function generateAnnualSocialPlan(input: AnnualGenerationInput): Promise<{
  created: number
  reserved: number
  year: number
}> {
  const user = await requireChef()
  const validated = GenerateAnnualPlanSchema.parse(input)
  const supabase = createServerClient()

  await upsertSocialQueueSettings({
    target_year: validated.target_year,
    posts_per_week: validated.posts_per_week,
    timezone: validated.timezone,
    queue_days: validated.queue_days,
    queue_times: validated.queue_times,
    holdout_slots_per_month: validated.holdout_slots_per_month,
  })

  const { count: existingCount, error: existingError } = await supabase
    .from('social_posts' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('target_year', validated.target_year)

  if (existingError) {
    console.error('[generateAnnualSocialPlan] Existing count failed:', existingError)
    throw new Error('Failed to inspect existing social posts.')
  }

  if ((existingCount ?? 0) > 0 && !validated.force_regenerate) {
    throw new Error('Posts already exist for this year. Regenerate with force enabled.')
  }

  if ((existingCount ?? 0) > 0 && validated.force_regenerate) {
    const { error: deleteError } = await supabase
      .from('social_posts' as any)
      .delete()
      .eq('tenant_id', user.tenantId!)
      .eq('target_year', validated.target_year)

    if (deleteError) {
      console.error('[generateAnnualSocialPlan] Delete failed:', deleteError)
      throw new Error('Failed to replace existing yearly posts.')
    }
  }

  const slots = buildScheduleSlots(validated)
  const reservedIndexes = getReservedIndexes(slots, validated.holdout_slots_per_month)
  const pillars = buildPillarSequence(slots.length)

  const rows = slots.map((slot, index) => {
    const reserved = reservedIndexes.has(index)
    const pillar = pillars[index]
    const generated = buildGeneratedContent(pillar, index, slot.scheduleAt, reserved)

    const hashtagsText = generated.hashtags.join(' ')
    const instagramCaption = `${generated.captionInstagram}\n\n${hashtagsText}`.trim()
    const facebookCaption = `${generated.captionFacebook}\n\n${hashtagsText}`.trim()

    return {
      tenant_id: user.tenantId!,
      created_by: user.id,
      updated_by: user.id,
      post_code: formatPostCode(validated.target_year, slot.weekNumber, slot.slotNumber),
      target_year: validated.target_year,
      week_number: slot.weekNumber,
      slot_number: slot.slotNumber,
      schedule_at: slot.scheduleAt,
      editable_until: slot.editableUntil,
      pillar,
      status: reserved ? 'idea' : 'draft',
      media_type: generated.mediaType,
      title: generated.title,
      caption_master: generated.captionMaster,
      caption_instagram: instagramCaption,
      caption_facebook: facebookCaption,
      caption_tiktok: generated.captionTikTok,
      caption_linkedin: generated.captionLinkedIn,
      caption_x: generated.captionX,
      caption_pinterest: generated.captionPinterest,
      caption_youtube_shorts: generated.captionYouTubeShorts,
      hashtags: generated.hashtags,
      mention_handles: ['@yourbrand'],
      collaborator_tags: [],
      location_tag: '',
      alt_text: '',
      thumbnail_time_seconds: null,
      thumbnail_url: null,
      publish_checklist_notes: '',
      preflight_ready: false,
      preflight_missing_items: ['Media asset', 'Alt text', 'Location tag', 'Mention tags'],
      cta: generated.cta,
      offer_link: null,
      media_url: null,
      campaign: generated.campaign,
      seasonal_flag: generated.seasonalFlag,
      hot_swap_ready: reserved,
      notes: reserved
        ? 'Reserved slot for timely promotions or local moments.'
        : '',
      platforms: ['instagram', 'facebook', 'tiktok', 'linkedin', 'pinterest', 'youtube_shorts'],
      queued_to_platforms: [],
      published_to_platforms: [],
    }
  })

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100)
    const { error: insertError } = await supabase.from('social_posts' as any).insert(batch)

    if (insertError) {
      console.error('[generateAnnualSocialPlan] Insert failed:', insertError)
      throw new Error('Failed to create annual social plan rows.')
    }
  }

  revalidatePath('/social')

  return {
    created: rows.length,
    reserved: reservedIndexes.size,
    year: validated.target_year,
  }
}

export async function updateSocialPost(postId: string, input: UpdatePostInput): Promise<SocialPost> {
  const user = await requireChef()
  const validated = UpdatePostSchema.parse(input)
  const supabase = createServerClient()

  const { data: existingData, error: existingError } = await supabase
    .from('social_posts' as any)
    .select('*')
    .eq('id', postId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (existingError || !existingData) {
    throw new Error('Social post not found.')
  }

  const merged = mapPostRow({ ...(existingData as any), ...validated })
  const linkedAssetCount = await getLinkedAssetCount(supabase, user.tenantId!, postId)
  const preflight = computePreflight(merged, linkedAssetCount)

  if ((validated.status === 'queued' || validated.status === 'published') && !preflight.preflight_ready) {
    throw new Error(`Preflight incomplete: ${preflight.preflight_missing_items.join(', ')}`)
  }

  const payload: Record<string, unknown> = {
    ...validated,
    preflight_ready: preflight.preflight_ready,
    preflight_missing_items: preflight.preflight_missing_items,
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('social_posts' as any)
    .update(payload)
    .eq('id', postId)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[updateSocialPost] Update failed:', error)
    throw new Error('Failed to update social post.')
  }

  revalidatePath('/social')
  return mapPostRow(data)
}

export async function bulkUpdateSocialPostStatus(postIds: string[], status: SocialPostStatus) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (postIds.length === 0) return

  const validatedStatus = z.enum(['idea', 'draft', 'approved', 'queued', 'published', 'archived']).parse(status)

  if (validatedStatus === 'queued' || validatedStatus === 'published') {
    const { data: preflightRows, error: preflightError } = await supabase
      .from('social_posts' as any)
      .select('id, preflight_ready')
      .eq('tenant_id', user.tenantId!)
      .in('id', postIds)

    if (preflightError) {
      throw new Error('Could not validate preflight for bulk status update.')
    }

    const blockedCount = (preflightRows ?? []).filter((row: any) => !row.preflight_ready).length
    if (blockedCount > 0) {
      throw new Error(`${blockedCount} posts are blocked by preflight.`)
    }
  }

  const { error } = await supabase
    .from('social_posts' as any)
    .update({ status: validatedStatus, updated_by: user.id })
    .eq('tenant_id', user.tenantId!)
    .in('id', postIds)

  if (error) {
    console.error('[bulkUpdateSocialPostStatus] Update failed:', error)
    throw new Error('Failed to update post statuses.')
  }

  revalidatePath('/social')
}

export async function setSocialPostHotSwap(postId: string, hotSwapReady: boolean) {
  await updateSocialPost(postId, { hot_swap_ready: hotSwapReady })
}

export async function applyHotSwapToScheduledPost(input: z.infer<typeof HotSwapSchema>) {
  const user = await requireChef()
  const validated = HotSwapSchema.parse(input)
  const supabase = createServerClient()

  const { data: sourceRowData, error: sourceError } = await supabase
    .from('social_posts' as any)
    .select('*')
    .eq('id', validated.hot_swap_post_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  const sourceRow = sourceRowData as Record<string, any> | null

  if (sourceError || !sourceRow) {
    console.error('[applyHotSwapToScheduledPost] Source fetch failed:', sourceError)
    throw new Error('Hot-swap source post not found.')
  }

  const { error: updateTargetError } = await supabase
    .from('social_posts' as any)
    .update({
      updated_by: user.id,
      pillar: sourceRow.pillar,
      media_type: sourceRow.media_type,
      title: sourceRow.title,
      caption_master: sourceRow.caption_master,
      caption_instagram: sourceRow.caption_instagram,
      caption_facebook: sourceRow.caption_facebook,
      caption_tiktok: sourceRow.caption_tiktok,
      caption_linkedin: sourceRow.caption_linkedin,
      caption_x: sourceRow.caption_x,
      caption_pinterest: sourceRow.caption_pinterest,
      caption_youtube_shorts: sourceRow.caption_youtube_shorts,
      hashtags: sourceRow.hashtags,
      cta: sourceRow.cta,
      offer_link: sourceRow.offer_link,
      media_url: sourceRow.media_url,
      campaign: sourceRow.campaign,
      seasonal_flag: sourceRow.seasonal_flag,
      notes: `${sourceRow.notes ?? ''}\nApplied from hot-swap slot on ${new Date().toISOString().slice(0, 10)}.`.trim(),
    })
    .eq('id', validated.scheduled_post_id)
    .eq('tenant_id', user.tenantId!)

  if (updateTargetError) {
    console.error('[applyHotSwapToScheduledPost] Target update failed:', updateTargetError)
    throw new Error('Failed to apply hot-swap content.')
  }

  const { error: archiveSourceError } = await supabase
    .from('social_posts' as any)
    .update({
      status: 'archived',
      hot_swap_ready: false,
      updated_by: user.id,
      notes: `${sourceRow.notes ?? ''}\nUsed as hot-swap source on ${new Date().toISOString().slice(0, 10)}.`.trim(),
    })
    .eq('id', validated.hot_swap_post_id)
    .eq('tenant_id', user.tenantId!)

  if (archiveSourceError) {
    console.error('[applyHotSwapToScheduledPost] Source archive failed:', archiveSourceError)
    throw new Error('Hot-swap source could not be archived after apply.')
  }

  await refreshPostPreflight(supabase, user.tenantId!, validated.scheduled_post_id, user.id)
  revalidatePath('/social')
}

export async function uploadSocialAsset(formData: FormData): Promise<SocialMediaAsset> {
  const user = await requireChef()
  const supabase = createAdminClient() as any

  const file = formData.get('asset') as File | null
  if (!file) throw new Error('No asset file provided.')
  if (!ALLOWED_SOCIAL_ASSET_TYPES.includes(file.type)) throw new Error('Unsupported file type.')
  if (file.size > MAX_SOCIAL_ASSET_SIZE) throw new Error('File too large (max 100MB).')

  const ext = inferExtension(file)
  const storagePath = `${user.tenantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(SOCIAL_MEDIA_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[uploadSocialAsset] upload error:', uploadError)
    throw new Error('Failed to upload asset to media vault.')
  }

  const { data: publicData } = supabase.storage.from(SOCIAL_MEDIA_BUCKET).getPublicUrl(storagePath)

  const assetName = ((formData.get('assetName') as string | null) ?? '').trim()
  const usageContext = ((formData.get('usageContext') as string | null) ?? '').trim()
  const assetTags = parseTagInput((formData.get('assetTags') as string | null) ?? '')
  const isClientApproved = ((formData.get('isClientApproved') as string | null) ?? 'false') === 'true'

  const { data, error } = await supabase
    .from('social_media_assets')
    .insert({
      tenant_id: user.tenantId!,
      created_by: user.id,
      updated_by: user.id,
      asset_kind: inferAssetKind(file.type),
      asset_name: assetName || file.name,
      original_filename: file.name,
      mime_type: file.type,
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      file_size_bytes: file.size,
      asset_tags: assetTags,
      usage_context: usageContext,
      is_client_approved: isClientApproved,
      is_archived: false,
    })
    .select('*')
    .single()

  if (error || !data) {
    await supabase.storage.from(SOCIAL_MEDIA_BUCKET).remove([storagePath])
    throw new Error('Asset uploaded but metadata insert failed.')
  }

  revalidatePath('/social')
  return mapAssetRow(data)
}

export async function updateSocialAsset(assetId: string, input: z.infer<typeof UpdateAssetSchema>): Promise<SocialMediaAsset> {
  const user = await requireChef()
  const validated = UpdateAssetSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('social_media_assets' as any)
    .update({ ...validated, updated_by: user.id })
    .eq('id', assetId)
    .eq('tenant_id', user.tenantId!)
    .select('*')
    .single()

  if (error || !data) throw new Error('Failed to update media asset.')
  revalidatePath('/social')
  return mapAssetRow(data)
}

export async function deleteSocialAsset(assetId: string) {
  const user = await requireChef()
  const supabase = createAdminClient() as any

  const { data: assetData, error: assetError } = await supabase
    .from('social_media_assets')
    .select('*')
    .eq('id', assetId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (assetError || !assetData) throw new Error('Media asset not found.')

  const { data: links } = await supabase
    .from('social_post_assets')
    .select('post_id')
    .eq('tenant_id', user.tenantId!)
    .eq('asset_id', assetId)

  await supabase
    .from('social_post_assets')
    .delete()
    .eq('tenant_id', user.tenantId!)
    .eq('asset_id', assetId)

  await supabase
    .from('social_media_assets')
    .delete()
    .eq('tenant_id', user.tenantId!)
    .eq('id', assetId)

  await supabase.storage.from(SOCIAL_MEDIA_BUCKET).remove([assetData.storage_path])

  const affectedPosts = Array.from(new Set((links ?? []).map((row: any) => row.post_id).filter(Boolean))) as string[]
  for (const postId of affectedPosts) {
    await refreshPostPreflight(supabase, user.tenantId!, postId, user.id)
  }

  revalidatePath('/social')
}

export async function attachSocialAssetToPost(input: z.infer<typeof AttachAssetSchema>): Promise<SocialPostAssetLink> {
  const user = await requireChef()
  const validated = AttachAssetSchema.parse(input)
  const supabase = createServerClient()
  const db = supabase as any

  const { data: assetData, error: assetError } = await db
    .from('social_media_assets')
    .select('id, public_url')
    .eq('tenant_id', user.tenantId!)
    .eq('id', validated.asset_id)
    .single()

  if (assetError || !assetData) throw new Error('Asset not found.')

  const { data: existingLinks } = await db
    .from('social_post_assets')
    .select('display_order')
    .eq('tenant_id', user.tenantId!)
    .eq('post_id', validated.post_id)

  const nextOrder = (existingLinks ?? []).reduce((max: number, row: any) => Math.max(max, Number(row.display_order ?? 0)), 0) + 1

  const { data, error } = await db
    .from('social_post_assets')
    .upsert(
      {
        tenant_id: user.tenantId!,
        post_id: validated.post_id,
        asset_id: validated.asset_id,
        is_primary: validated.is_primary,
        display_order: nextOrder,
        created_by: user.id,
      },
      { onConflict: 'tenant_id,post_id,asset_id' },
    )
    .select('*')
    .single()

  if (error || !data) throw new Error('Failed to attach asset to post.')

  if (validated.is_primary) {
    await db
      .from('social_post_assets')
      .update({ is_primary: false })
      .eq('tenant_id', user.tenantId!)
      .eq('post_id', validated.post_id)
      .neq('id', data.id)

    await db
      .from('social_posts')
      .update({ media_url: assetData.public_url, updated_by: user.id })
      .eq('tenant_id', user.tenantId!)
      .eq('id', validated.post_id)
  }

  await refreshPostPreflight(supabase, user.tenantId!, validated.post_id, user.id)
  revalidatePath('/social')
  return mapPostAssetLinkRow(data)
}

export async function detachSocialAssetFromPost(input: z.infer<typeof DetachAssetSchema>) {
  const user = await requireChef()
  const validated = DetachAssetSchema.parse(input)
  const supabase = createServerClient()
  const db = supabase as any

  const { data: linkData, error: linkError } = await db
    .from('social_post_assets')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('id', validated.link_id)
    .single()

  if (linkError || !linkData) throw new Error('Post asset link not found.')

  await db
    .from('social_post_assets')
    .delete()
    .eq('tenant_id', user.tenantId!)
    .eq('id', validated.link_id)

  if (linkData.is_primary) {
    const { data: nextLink } = await db
      .from('social_post_assets')
      .select('id, asset_id')
      .eq('tenant_id', user.tenantId!)
      .eq('post_id', linkData.post_id)
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextLink?.id) {
      const { data: nextAsset } = await db
        .from('social_media_assets')
        .select('public_url')
        .eq('tenant_id', user.tenantId!)
        .eq('id', nextLink.asset_id)
        .single()

      await db
        .from('social_post_assets')
        .update({ is_primary: true })
        .eq('tenant_id', user.tenantId!)
        .eq('id', nextLink.id)

      await db
        .from('social_posts')
        .update({ media_url: nextAsset?.public_url ?? null, updated_by: user.id })
        .eq('tenant_id', user.tenantId!)
        .eq('id', linkData.post_id)
    } else {
      await db
        .from('social_posts')
        .update({ media_url: null, updated_by: user.id })
        .eq('tenant_id', user.tenantId!)
        .eq('id', linkData.post_id)
    }
  }

  await refreshPostPreflight(supabase, user.tenantId!, linkData.post_id, user.id)
  revalidatePath('/social')
}

export async function exportSocialPlatformWindowCsv(rawInput: z.infer<typeof PlatformExportSchema>): Promise<{
  csv: string
  filename: string
  count: number
  windowDays: number
}> {
  const user = await requireChef()
  const validated = PlatformExportSchema.parse(rawInput)
  const supabase = createServerClient()

  const windowConfig = SOCIAL_PLATFORM_WINDOWS.find((entry) => entry.platform === validated.platform)
  if (!windowConfig) {
    throw new Error('Unknown platform.')
  }

  const now = new Date()
  const end = new Date(now.getTime() + windowConfig.windowDays * 24 * 60 * 60 * 1000)

  let query = supabase
    .from('social_posts' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .contains('platforms', [validated.platform])
    .gte('schedule_at', now.toISOString())
    .lte('schedule_at', end.toISOString())
    .in('status', ['draft', 'approved', 'queued'])
    .order('schedule_at', { ascending: true })

  if (windowConfig.maxPostsPerExport) {
    query = query.limit(windowConfig.maxPostsPerExport)
  }

  const { data, error } = await query

  if (error) {
    console.error('[exportSocialPlatformWindowCsv] Query failed:', error)
    throw new Error('Failed to build export CSV.')
  }

  const posts = (data ?? []).map(mapPostRow)

  const csvRows = posts.map((post) => {
    const scheduleDate = new Date(post.schedule_at)
    const captionField = platformCaptionField[validated.platform]
    const platformCaption = (post[captionField] as string | undefined)?.trim() || post.caption_master

    return {
      post_code: post.post_code,
      schedule_date: scheduleDate.toISOString().slice(0, 10),
      schedule_time: scheduleDate.toISOString().slice(11, 16),
      title: post.title,
      caption: platformCaption,
      media_url: post.media_url ?? '',
      hashtags: post.hashtags.join(' '),
      mention_handles: post.mention_handles.join(' '),
      location_tag: post.location_tag,
      cta: post.cta ?? '',
      offer_link: post.offer_link ?? '',
      status: post.status,
    }
  })

  const csv = toCsv(csvRows)
  const dateToken = now.toISOString().slice(0, 10)
  const filename = `social-${validated.platform}-window-${dateToken}.csv`

  return {
    csv,
    filename,
    count: posts.length,
    windowDays: windowConfig.windowDays,
  }
}

export async function getSocialWindowCounts(targetYear?: number): Promise<Record<SocialPlatform, number>> {
  const settings = await getSocialQueueSettings()
  const year = targetYear ?? settings.target_year
  const posts = await getSocialPosts({ targetYear: year })
  const now = new Date()

  const counts: Record<SocialPlatform, number> = {
    instagram: 0,
    facebook: 0,
    tiktok: 0,
    linkedin: 0,
    x: 0,
    pinterest: 0,
    youtube_shorts: 0,
  }

  for (const config of SOCIAL_PLATFORM_WINDOWS) {
    const windowEnd = new Date(now.getTime() + config.windowDays * 24 * 60 * 60 * 1000)
    const candidates = posts.filter((post) => {
      if (!post.platforms.includes(config.platform)) return false
      if (post.status === 'archived' || post.status === 'published') return false
      if (!post.preflight_ready) return false
      const when = new Date(post.schedule_at)
      return when >= now && when <= windowEnd
    })

    counts[config.platform] = config.maxPostsPerExport
      ? Math.min(candidates.length, config.maxPostsPerExport)
      : candidates.length
  }

  return counts
}

export async function getSocialMeta(): Promise<{
  statusKeys: SocialPostStatus[]
  pillarKeys: SocialPillar[]
}> {
  return {
    statusKeys: STATUS_KEYS,
    pillarKeys: PILLAR_KEYS,
  }
}
