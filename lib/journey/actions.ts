'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { logChefActivity } from '@/lib/activity/log-chef'
import type {
  ChefJourney,
  ChefJourneyEntry,
  ChefJourneyEntryType,
  ChefJourneyIdea,
  ChefJourneyIdeaArea,
  ChefJourneyIdeaStatus,
  ChefJourneyInsights,
  ChefJourneyMedia,
  ChefJourneyRecipeLink,
  ChefJournalMediaType,
  ChefJourneyStatus,
  ChefJourneyWithStats,
  JourneyLocationSummary,
  JourneyTopicSummary,
} from './types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const JourneyStatusSchema = z.enum(['planning', 'in_progress', 'completed', 'archived'])
const EntryTypeSchema = z.enum([
  'destination',
  'meal',
  'lesson',
  'experience',
  'idea',
  'reflection',
  'technique',
  'ingredient',
])
const IdeaStatusSchema = z.enum(['backlog', 'testing', 'adopted', 'parked'])
const IdeaAreaSchema = z.enum(['menu', 'technique', 'service', 'sourcing', 'team', 'operations'])
const JournalMediaTypeSchema = z.enum(['photo', 'video', 'document'])

const CHEF_JOURNAL_MEDIA_BUCKET = 'chef-journal-media'
const MAX_JOURNAL_PHOTO_SIZE = 15 * 1024 * 1024 // 15MB
const ALLOWED_JOURNAL_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]
const JOURNAL_PHOTO_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

const OptionalTextSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().max(300).nullable())

const OptionalLongTextSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}, z.string().max(6000))

const OptionalDateSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD').nullable())

const HttpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  }, 'Use an http(s) URL')

const OptionalNumberSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : value
  }
  return value
}, z.number().finite().nullable())

const StringListSchema = z.array(z.string().trim().min(1).max(220)).max(60).optional().default([])

const JourneySchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    destination_city: OptionalTextSchema,
    destination_region: OptionalTextSchema,
    destination_country: OptionalTextSchema,
    started_on: OptionalDateSchema,
    ended_on: OptionalDateSchema,
    status: JourneyStatusSchema.default('planning'),
    trip_summary: OptionalLongTextSchema.optional().default(''),
    favorite_meal: OptionalLongTextSchema.optional().default(''),
    favorite_experience: OptionalLongTextSchema.optional().default(''),
    key_learnings: StringListSchema,
    inspiration_ideas: StringListSchema,
    culinary_focus_tags: StringListSchema,
    collaborators: StringListSchema,
    cover_image_url: z.preprocess((value) => {
      if (typeof value !== 'string') return null
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }, z.string().url().nullable()),
  })
  .superRefine((value, ctx) => {
    if (value.started_on && value.ended_on && value.ended_on < value.started_on) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ended_on'],
        message: 'End date must be on or after start date',
      })
    }
  })

function validateCoordinates(
  latitude: number | null,
  longitude: number | null,
  ctx: z.RefinementCtx
): void {
  const hasLat = typeof latitude === 'number'
  const hasLng = typeof longitude === 'number'
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['latitude'],
      message: 'Latitude and longitude must be provided together',
    })
  }
  if (hasLat && latitude !== null && (latitude < -90 || latitude > 90)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['latitude'],
      message: 'Latitude must be between -90 and 90',
    })
  }
  if (hasLng && longitude !== null && (longitude < -180 || longitude > 180)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['longitude'],
      message: 'Longitude must be between -180 and 180',
    })
  }
}

const JourneyEntryCoreSchema = z.object({
  entry_type: EntryTypeSchema.default('reflection'),
  entry_date: OptionalDateSchema,
  location_label: z.string().trim().max(180).optional().default(''),
  formatted_address: z.string().trim().max(350).optional().default(''),
  latitude: OptionalNumberSchema,
  longitude: OptionalNumberSchema,
  title: z.string().trim().min(3).max(180),
  narrative: OptionalLongTextSchema.optional().default(''),
  favorite_meal: OptionalLongTextSchema.optional().default(''),
  favorite_experience: OptionalLongTextSchema.optional().default(''),
  what_i_learned: StringListSchema,
  inspiration_taken: StringListSchema,
  dishes_to_explore: StringListSchema,
  mistakes_made: StringListSchema,
  proud_moments: StringListSchema,
  what_to_change_next_time: StringListSchema,
  source_links: z.array(z.string().trim().max(500)).max(20).optional().default([]),
  is_highlight: z.boolean().optional().default(false),
})

const JourneyEntrySchema = JourneyEntryCoreSchema.extend({
  journey_id: z.string().uuid(),
}).superRefine((value, ctx) => {
  validateCoordinates(value.latitude, value.longitude, ctx)
})

const JourneyEntryUpdateSchema = JourneyEntryCoreSchema.superRefine((value, ctx) => {
  validateCoordinates(value.latitude, value.longitude, ctx)
})

const JourneyIdeaSchema = z.object({
  journey_id: z.string().uuid(),
  source_entry_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3).max(180),
  concept_notes: OptionalLongTextSchema.optional().default(''),
  application_area: IdeaAreaSchema.default('menu'),
  status: IdeaStatusSchema.default('backlog'),
  priority: z.number().int().min(1).max(5).default(3),
  expected_impact: OptionalLongTextSchema.optional().default(''),
  test_plan: OptionalLongTextSchema.optional().default(''),
  first_test_date: OptionalDateSchema,
  adopted_on: OptionalDateSchema,
  adopted_recipe_id: z.string().uuid().nullable().optional(),
})

const JourneyIdeaUpdateSchema = JourneyIdeaSchema.omit({ journey_id: true })

const JourneyMediaCoreSchema = z.object({
  entry_id: z.string().uuid().nullable().optional(),
  media_type: JournalMediaTypeSchema.default('photo'),
  media_url: HttpUrlSchema.max(2000),
  caption: z.string().trim().max(1000).optional().default(''),
  taken_on: OptionalDateSchema,
  location_label: z.string().trim().max(180).optional().default(''),
  latitude: OptionalNumberSchema,
  longitude: OptionalNumberSchema,
  is_cover: z.boolean().optional().default(false),
})

const JourneyMediaSchema = JourneyMediaCoreSchema.extend({
  journey_id: z.string().uuid(),
}).superRefine((value, ctx) => {
  validateCoordinates(value.latitude, value.longitude, ctx)
})

const JourneyMediaUpdateSchema = JourneyMediaCoreSchema.superRefine((value, ctx) => {
  validateCoordinates(value.latitude, value.longitude, ctx)
})

const JourneyRecipeLinkSchema = z.object({
  journey_id: z.string().uuid(),
  entry_id: z.string().uuid().nullable().optional(),
  recipe_id: z.string().uuid(),
  adaptation_notes: OptionalLongTextSchema.optional().default(''),
  outcome_notes: OptionalLongTextSchema.optional().default(''),
  outcome_rating: z.preprocess((value) => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : value
    }
    return value
  }, z.number().int().min(1).max(5).nullable()),
  first_tested_on: OptionalDateSchema,
  would_repeat: z.boolean().optional().default(true),
})

const JourneyRecipeLinkUpdateSchema = JourneyRecipeLinkSchema.omit({ journey_id: true })

export type CreateChefJourneyInput = z.input<typeof JourneySchema>
export type UpdateChefJourneyInput = z.input<typeof JourneySchema>

export type CreateChefJourneyEntryInput = z.input<typeof JourneyEntrySchema>
export type UpdateChefJourneyEntryInput = z.input<typeof JourneyEntryUpdateSchema>

export type CreateChefJourneyIdeaInput = z.input<typeof JourneyIdeaSchema>
export type UpdateChefJourneyIdeaInput = z.input<typeof JourneyIdeaUpdateSchema>

export type CreateChefJourneyMediaInput = z.input<typeof JourneyMediaSchema>
export type UpdateChefJourneyMediaInput = z.input<typeof JourneyMediaUpdateSchema>

export type CreateChefJourneyRecipeLinkInput = z.input<typeof JourneyRecipeLinkSchema>
export type UpdateChefJourneyRecipeLinkInput = z.input<typeof JourneyRecipeLinkUpdateSchema>

function fromChefJourneys(db: any): any {
  return db.from('chef_journeys')
}

function fromChefJourneyEntries(db: any): any {
  return db.from('chef_journey_entries')
}

function fromChefJourneyIdeas(db: any): any {
  return db.from('chef_journey_ideas')
}

function fromChefJournalMedia(db: any): any {
  return db.from('chef_journal_media')
}

function fromChefJournalRecipeLinks(db: any): any {
  return db.from('chef_journal_recipe_links')
}

function normalizeList(values: string[] | undefined, max = 40): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of values || []) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const dedupeKey = trimmed.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push(trimmed)
    if (normalized.length >= max) break
  }
  return normalized
}

function normalizeLinks(values: string[] | undefined): string[] {
  const links = normalizeList(values, 20)
  return links.filter((link) => {
    if (link.startsWith('http://') || link.startsWith('https://')) return true
    return false
  })
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function mapJourney(row: Record<string, unknown>): ChefJourney {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    created_by: String(row.created_by),
    title: String(row.title),
    destination_city: (row.destination_city as string) || null,
    destination_region: (row.destination_region as string) || null,
    destination_country: (row.destination_country as string) || null,
    started_on: (row.started_on as string) || null,
    ended_on: (row.ended_on as string) || null,
    status: row.status as ChefJourneyStatus,
    trip_summary: (row.trip_summary as string) || '',
    favorite_meal: (row.favorite_meal as string) || '',
    favorite_experience: (row.favorite_experience as string) || '',
    key_learnings: asStringArray(row.key_learnings),
    inspiration_ideas: asStringArray(row.inspiration_ideas),
    culinary_focus_tags: asStringArray(row.culinary_focus_tags),
    collaborators: asStringArray(row.collaborators),
    cover_image_url: (row.cover_image_url as string) || null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapEntry(row: Record<string, unknown>): ChefJourneyEntry {
  return {
    id: String(row.id),
    journey_id: String(row.journey_id),
    tenant_id: String(row.tenant_id),
    created_by: String(row.created_by),
    entry_type: row.entry_type as ChefJourneyEntryType,
    entry_date: String(row.entry_date),
    location_label: (row.location_label as string) || '',
    formatted_address: (row.formatted_address as string) || '',
    latitude: asNumberOrNull(row.latitude),
    longitude: asNumberOrNull(row.longitude),
    title: String(row.title),
    narrative: (row.narrative as string) || '',
    favorite_meal: (row.favorite_meal as string) || '',
    favorite_experience: (row.favorite_experience as string) || '',
    what_i_learned: asStringArray(row.what_i_learned),
    inspiration_taken: asStringArray(row.inspiration_taken),
    dishes_to_explore: asStringArray(row.dishes_to_explore),
    mistakes_made: asStringArray(row.mistakes_made),
    proud_moments: asStringArray(row.proud_moments),
    what_to_change_next_time: asStringArray(row.what_to_change_next_time),
    source_links: asStringArray(row.source_links),
    is_highlight: Boolean(row.is_highlight),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapIdea(row: Record<string, unknown>): ChefJourneyIdea {
  return {
    id: String(row.id),
    journey_id: String(row.journey_id),
    tenant_id: String(row.tenant_id),
    source_entry_id: (row.source_entry_id as string) || null,
    created_by: String(row.created_by),
    title: String(row.title),
    concept_notes: (row.concept_notes as string) || '',
    application_area: row.application_area as ChefJourneyIdeaArea,
    status: row.status as ChefJourneyIdeaStatus,
    priority: Number(row.priority) || 3,
    expected_impact: (row.expected_impact as string) || '',
    test_plan: (row.test_plan as string) || '',
    first_test_date: (row.first_test_date as string) || null,
    adopted_on: (row.adopted_on as string) || null,
    adopted_recipe_id: (row.adopted_recipe_id as string) || null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapMedia(row: Record<string, unknown>): ChefJourneyMedia {
  return {
    id: String(row.id),
    journey_id: String(row.journey_id),
    entry_id: (row.entry_id as string) || null,
    tenant_id: String(row.tenant_id),
    created_by: String(row.created_by),
    media_type: row.media_type as ChefJournalMediaType,
    media_url: String(row.media_url),
    caption: (row.caption as string) || '',
    taken_on: (row.taken_on as string) || null,
    location_label: (row.location_label as string) || '',
    latitude: asNumberOrNull(row.latitude),
    longitude: asNumberOrNull(row.longitude),
    is_cover: Boolean(row.is_cover),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapRecipeLink(row: Record<string, unknown>): ChefJourneyRecipeLink {
  const recipeRel = row.recipes as { name?: string } | null
  return {
    id: String(row.id),
    journey_id: String(row.journey_id),
    entry_id: (row.entry_id as string) || null,
    tenant_id: String(row.tenant_id),
    created_by: String(row.created_by),
    recipe_id: String(row.recipe_id),
    recipe_name: (recipeRel?.name as string) || null,
    adaptation_notes: (row.adaptation_notes as string) || '',
    outcome_notes: (row.outcome_notes as string) || '',
    outcome_rating: asNumberOrNull(row.outcome_rating),
    first_tested_on: (row.first_tested_on as string) || null,
    would_repeat: Boolean(row.would_repeat),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function toDestinationLabel(journey: ChefJourney): string {
  const parts = [
    journey.destination_city,
    journey.destination_region,
    journey.destination_country,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0))
  return parts.join(', ')
}

function toDestinationFromParts(city: unknown, region: unknown, country: unknown): string {
  const parts = [city, region, country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
  return parts.join(', ')
}

function buildTopCounts(values: string[], limit = 5): JourneyTopicSummary[] {
  const counts = new Map<string, { label: string; count: number }>()

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    counts.set(key, { label: trimmed, count: 1 })
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => ({ topic: item.label, count: item.count }))
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

async function ensureEntryBelongsToJourney(
  db: any,
  tenantId: string,
  journeyId: string,
  entryId: string
): Promise<void> {
  const { data, error } = await fromChefJourneyEntries(db)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('journey_id', journeyId)
    .eq('id', entryId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Selected entry is not part of this journal')
  }
}

async function ensureRecipeBelongsToTenant(
  db: any,
  tenantId: string,
  recipeId: string
): Promise<void> {
  const { data, error } = await db
    .from('recipes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', recipeId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Selected recipe does not belong to this chef account')
  }
}

async function ensureJourneyBelongsToTenant(
  db: any,
  tenantId: string,
  journeyId: string
): Promise<void> {
  const { data, error } = await fromChefJourneys(db)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', journeyId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Journal not found')
  }
}

function extractChefJournalMediaPath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${CHEF_JOURNAL_MEDIA_BUCKET}/`
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  const encodedPath = url
    .slice(markerIndex + marker.length)
    .split('?')[0]
    .split('#')[0]
  if (!encodedPath) return null
  return decodeURIComponent(encodedPath)
}

async function ensureChefJournalMediaBucket(db: any) {
  const { error: createError } = await db.storage.createBucket(CHEF_JOURNAL_MEDIA_BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_JOURNAL_PHOTO_TYPES,
    fileSizeLimit: `${MAX_JOURNAL_PHOTO_SIZE}`,
  } as any)

  if (!createError) return

  const message = String((createError as any)?.message || '').toLowerCase()
  const statusCode = Number((createError as any)?.statusCode || (createError as any)?.status || 0)
  const isConflict =
    statusCode === 409 ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('conflict')

  if (isConflict) return

  const { data: buckets, error: listError } = await db.storage.listBuckets()
  if (!listError) {
    const exists = (buckets || []).some((bucket: any) => bucket.id === CHEF_JOURNAL_MEDIA_BUCKET)
    if (exists) return
  }

  console.error('[ensureChefJournalMediaBucket] createBucket error:', createError)
  throw new Error('Storage bucket setup failed for Chef Journal media')
}

async function removeChefJournalMediaObject(
  db: any,
  mediaUrl: string | null | undefined
): Promise<void> {
  const storagePath = extractChefJournalMediaPath(mediaUrl)
  if (!storagePath) return

  const { error } = await db.storage.from(CHEF_JOURNAL_MEDIA_BUCKET).remove([storagePath])
  if (error) {
    console.error('[removeChefJournalMediaObject] remove error:', error)
  }
}

export async function getChefJourneys(
  options: {
    status?: ChefJourneyStatus | 'all'
    limit?: number
  } = {}
): Promise<ChefJourneyWithStats[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const limit = Math.max(1, Math.min(250, options.limit ?? 100))
  let query = fromChefJourneys(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (options.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getChefJourneys] Error:', error)
    return []
  }

  const journeys = ((data || []) as any[]).map(mapJourney)
  if (journeys.length === 0) return []

  const journeyIds = journeys.map((j) => j.id)
  const [{ data: entryRows }, { data: ideaRows }, { data: mediaRows }, { data: recipeLinkRows }] =
    await Promise.all([
      fromChefJourneyEntries(db)
        .select('journey_id, is_highlight')
        .eq('tenant_id', user.tenantId)
        .in('journey_id', journeyIds),
      fromChefJourneyIdeas(db)
        .select('journey_id, status')
        .eq('tenant_id', user.tenantId)
        .in('journey_id', journeyIds),
      fromChefJournalMedia(db)
        .select('journey_id')
        .eq('tenant_id', user.tenantId)
        .in('journey_id', journeyIds),
      fromChefJournalRecipeLinks(db)
        .select('journey_id')
        .eq('tenant_id', user.tenantId)
        .in('journey_id', journeyIds),
    ])

  const entryCounts = new Map<string, number>()
  const highlightCounts = new Map<string, number>()
  for (const row of (entryRows || []) as Array<{ journey_id: string; is_highlight: boolean }>) {
    entryCounts.set(row.journey_id, (entryCounts.get(row.journey_id) || 0) + 1)
    if (row.is_highlight) {
      highlightCounts.set(row.journey_id, (highlightCounts.get(row.journey_id) || 0) + 1)
    }
  }

  const ideaCounts = new Map<string, number>()
  const adoptedCounts = new Map<string, number>()
  for (const row of (ideaRows || []) as Array<{
    journey_id: string
    status: ChefJourneyIdeaStatus
  }>) {
    ideaCounts.set(row.journey_id, (ideaCounts.get(row.journey_id) || 0) + 1)
    if (row.status === 'adopted') {
      adoptedCounts.set(row.journey_id, (adoptedCounts.get(row.journey_id) || 0) + 1)
    }
  }

  const mediaCounts = new Map<string, number>()
  for (const row of (mediaRows || []) as Array<{ journey_id: string }>) {
    mediaCounts.set(row.journey_id, (mediaCounts.get(row.journey_id) || 0) + 1)
  }

  const recipeLinkCounts = new Map<string, number>()
  for (const row of (recipeLinkRows || []) as Array<{ journey_id: string }>) {
    recipeLinkCounts.set(row.journey_id, (recipeLinkCounts.get(row.journey_id) || 0) + 1)
  }

  return journeys.map((journey) => ({
    ...journey,
    entry_count: entryCounts.get(journey.id) || 0,
    highlight_count: highlightCounts.get(journey.id) || 0,
    idea_count: ideaCounts.get(journey.id) || 0,
    adopted_idea_count: adoptedCounts.get(journey.id) || 0,
    media_count: mediaCounts.get(journey.id) || 0,
    recipe_link_count: recipeLinkCounts.get(journey.id) || 0,
  }))
}

export async function getChefJourneyById(journeyId: string): Promise<ChefJourney | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromChefJourneys(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('id', journeyId)
    .single()

  if (error || !data) return null
  return mapJourney(data as Record<string, unknown>)
}

export async function getChefJourneyEntries(journeyId: string): Promise<ChefJourneyEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromChefJourneyEntries(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('journey_id', journeyId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getChefJourneyEntries] Error:', error)
    return []
  }

  return ((data || []) as any[]).map(mapEntry)
}

export async function getChefJourneyIdeas(journeyId: string): Promise<ChefJourneyIdea[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromChefJourneyIdeas(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('journey_id', journeyId)
    .order('priority', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[getChefJourneyIdeas] Error:', error)
    return []
  }

  return ((data || []) as any[]).map(mapIdea)
}

export async function getChefJourneyMedia(journeyId: string): Promise<ChefJourneyMedia[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromChefJournalMedia(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('journey_id', journeyId)
    .order('taken_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getChefJourneyMedia] Error:', error)
    return []
  }

  return ((data || []) as any[]).map(mapMedia)
}

export async function getChefJourneyRecipeLinks(
  journeyId: string
): Promise<ChefJourneyRecipeLink[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await fromChefJournalRecipeLinks(db)
    .select('*, recipes(name)')
    .eq('tenant_id', user.tenantId)
    .eq('journey_id', journeyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getChefJourneyRecipeLinks] Error:', error)
    return []
  }

  return ((data || []) as any[]).map(mapRecipeLink)
}

export async function getChefJourneyInsights(): Promise<ChefJourneyInsights> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [journeys, entries, ideas, media, recipeLinks] = await Promise.all([
    fromChefJourneys(db)
      .select('destination_city, destination_region, destination_country, status, key_learnings')
      .eq('tenant_id', user.tenantId),
    fromChefJourneyEntries(db)
      .select('is_highlight, what_i_learned, latitude, longitude, mistakes_made')
      .eq('tenant_id', user.tenantId),
    fromChefJourneyIdeas(db).select('status').eq('tenant_id', user.tenantId),
    fromChefJournalMedia(db).select('id').eq('tenant_id', user.tenantId),
    fromChefJournalRecipeLinks(db).select('id').eq('tenant_id', user.tenantId),
  ])

  const journeyRows = (journeys.data || []) as Array<Record<string, unknown>>
  const entryRows = (entries.data || []) as Array<Record<string, unknown>>
  const ideaRows = (ideas.data || []) as Array<Record<string, unknown>>
  const mediaRows = (media.data || []) as Array<Record<string, unknown>>
  const recipeLinkRows = (recipeLinks.data || []) as Array<Record<string, unknown>>

  const destinationCounts = new Map<string, number>()
  const learningTerms: string[] = []
  let completedJourneys = 0
  let activeJourneys = 0
  let mappedEntries = 0
  let documentedMistakes = 0

  for (const row of journeyRows) {
    const status = row.status as ChefJourneyStatus
    if (status === 'completed') completedJourneys += 1
    if (status === 'in_progress') activeJourneys += 1

    const destination = toDestinationFromParts(
      row.destination_city,
      row.destination_region,
      row.destination_country
    )
    if (destination) {
      destinationCounts.set(destination, (destinationCounts.get(destination) || 0) + 1)
    }

    learningTerms.push(...asStringArray(row.key_learnings))
  }

  let highlights = 0
  for (const row of entryRows) {
    if (Boolean(row.is_highlight)) highlights += 1
    if (asNumberOrNull(row.latitude) !== null && asNumberOrNull(row.longitude) !== null) {
      mappedEntries += 1
    }
    if (asStringArray(row.mistakes_made).length > 0) {
      documentedMistakes += 1
    }
    learningTerms.push(...asStringArray(row.what_i_learned))
  }

  let adoptedIdeas = 0
  for (const row of ideaRows) {
    if (row.status === 'adopted') adoptedIdeas += 1
  }

  const topDestinations: JourneyLocationSummary[] = Array.from(destinationCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([destination, count]) => ({ destination, count }))

  const topLearningTopics = buildTopCounts(learningTerms, 7)

  return {
    total_journeys: journeyRows.length,
    completed_journeys: completedJourneys,
    active_journeys: activeJourneys,
    total_entries: entryRows.length,
    highlights,
    total_ideas: ideaRows.length,
    adopted_ideas: adoptedIdeas,
    total_media: mediaRows.length,
    total_recipe_links: recipeLinkRows.length,
    mapped_entries: mappedEntries,
    documented_mistakes: documentedMistakes,
    top_destinations: topDestinations,
    top_learning_topics: topLearningTopics,
  }
}

export async function createChefJourney(
  input: CreateChefJourneyInput
): Promise<{ success: true; journey: ChefJourney }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneySchema.parse(input)

  const payload = {
    tenant_id: user.tenantId,
    created_by: user.id,
    title: validated.title.trim(),
    destination_city: validated.destination_city,
    destination_region: validated.destination_region,
    destination_country: validated.destination_country,
    started_on: validated.started_on,
    ended_on: validated.ended_on,
    status: validated.status,
    trip_summary: validated.trip_summary,
    favorite_meal: validated.favorite_meal,
    favorite_experience: validated.favorite_experience,
    key_learnings: normalizeList(validated.key_learnings, 40),
    inspiration_ideas: normalizeList(validated.inspiration_ideas, 40),
    culinary_focus_tags: normalizeList(validated.culinary_focus_tags, 30),
    collaborators: normalizeList(validated.collaborators, 30),
    cover_image_url: validated.cover_image_url,
  }

  const { data, error } = await fromChefJourneys(db).insert(payload).select('*').single()

  if (error || !data) {
    console.error('[createChefJourney] Error:', error)
    throw new Error('Failed to create journal')
  }

  const journey = mapJourney(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_created',
    domain: 'operational',
    entityType: 'chef_journey',
    entityId: journey.id,
    summary: `Started journal "${journey.title}"${toDestinationLabel(journey) ? ` (${toDestinationLabel(journey)})` : ''}`,
    context: {
      status: journey.status,
      destination: toDestinationLabel(journey),
    },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/journal')
  revalidatePath('/settings/journey')

  return { success: true, journey }
}

export async function updateChefJourney(
  journeyId: string,
  input: UpdateChefJourneyInput
): Promise<{ success: true; journey: ChefJourney }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneySchema.parse(input)

  const updatePayload = {
    title: validated.title.trim(),
    destination_city: validated.destination_city,
    destination_region: validated.destination_region,
    destination_country: validated.destination_country,
    started_on: validated.started_on,
    ended_on: validated.ended_on,
    status: validated.status,
    trip_summary: validated.trip_summary,
    favorite_meal: validated.favorite_meal,
    favorite_experience: validated.favorite_experience,
    key_learnings: normalizeList(validated.key_learnings, 40),
    inspiration_ideas: normalizeList(validated.inspiration_ideas, 40),
    culinary_focus_tags: normalizeList(validated.culinary_focus_tags, 30),
    collaborators: normalizeList(validated.collaborators, 30),
    cover_image_url: validated.cover_image_url,
  }

  const { data, error } = await fromChefJourneys(db)
    .update(updatePayload)
    .eq('id', journeyId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[updateChefJourney] Error:', error)
    throw new Error('Failed to update journal')
  }

  const journey = mapJourney(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_updated',
    domain: 'operational',
    entityType: 'chef_journey',
    entityId: journey.id,
    summary: `Updated journal "${journey.title}"`,
    context: {
      status: journey.status,
      destination: toDestinationLabel(journey),
      learning_count: journey.key_learnings.length,
      ideas_count: journey.inspiration_ideas.length,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${journeyId}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${journeyId}`)

  return { success: true, journey }
}

export async function deleteChefJourney(journeyId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await fromChefJourneys(db)
    .select('id, title')
    .eq('id', journeyId)
    .eq('tenant_id', user.tenantId)
    .single()

  const { error } = await fromChefJourneys(db)
    .delete()
    .eq('id', journeyId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[deleteChefJourney] Error:', error)
    throw new Error('Failed to delete journal')
  }

  if (existing?.id) {
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'journey_deleted',
      domain: 'operational',
      entityType: 'chef_journey',
      entityId: existing.id,
      summary: `Deleted journal "${existing.title || 'Untitled journal'}"`,
      context: {},
    })
  }

  revalidatePath('/settings/journal')
  revalidatePath('/settings/journey')
  return { success: true }
}

export async function createChefJourneyEntry(
  input: CreateChefJourneyEntryInput
): Promise<{ success: true; entry: ChefJourneyEntry }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyEntrySchema.parse(input)

  const payload = {
    journey_id: validated.journey_id,
    tenant_id: user.tenantId,
    created_by: user.id,
    entry_type: validated.entry_type,
    entry_date: validated.entry_date || todayDateString(),
    location_label: validated.location_label.trim(),
    formatted_address: validated.formatted_address.trim(),
    latitude: validated.latitude,
    longitude: validated.longitude,
    title: validated.title.trim(),
    narrative: validated.narrative,
    favorite_meal: validated.favorite_meal,
    favorite_experience: validated.favorite_experience,
    what_i_learned: normalizeList(validated.what_i_learned, 35),
    inspiration_taken: normalizeList(validated.inspiration_taken, 35),
    dishes_to_explore: normalizeList(validated.dishes_to_explore, 35),
    mistakes_made: normalizeList(validated.mistakes_made, 35),
    proud_moments: normalizeList(validated.proud_moments, 35),
    what_to_change_next_time: normalizeList(validated.what_to_change_next_time, 35),
    source_links: normalizeLinks(validated.source_links),
    is_highlight: validated.is_highlight,
  }

  const { data, error } = await fromChefJourneyEntries(db).insert(payload).select('*').single()

  if (error || !data) {
    console.error('[createChefJourneyEntry] Error:', error)
    throw new Error('Failed to save journal entry')
  }

  const entry = mapEntry(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_entry_added',
    domain: 'operational',
    entityType: 'chef_journey_entry',
    entityId: entry.id,
    summary: `Added ${entry.entry_type} entry: "${entry.title}"`,
    context: {
      journey_id: entry.journey_id,
      highlight: entry.is_highlight,
      learned_count: entry.what_i_learned.length,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${entry.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${entry.journey_id}`)

  return { success: true, entry }
}

export async function updateChefJourneyEntry(
  entryId: string,
  input: UpdateChefJourneyEntryInput
): Promise<{ success: true; entry: ChefJourneyEntry }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyEntryUpdateSchema.parse(input)

  const { data, error } = await fromChefJourneyEntries(db)
    .update({
      entry_type: validated.entry_type,
      entry_date: validated.entry_date || todayDateString(),
      location_label: validated.location_label.trim(),
      formatted_address: validated.formatted_address.trim(),
      latitude: validated.latitude,
      longitude: validated.longitude,
      title: validated.title.trim(),
      narrative: validated.narrative,
      favorite_meal: validated.favorite_meal,
      favorite_experience: validated.favorite_experience,
      what_i_learned: normalizeList(validated.what_i_learned, 35),
      inspiration_taken: normalizeList(validated.inspiration_taken, 35),
      dishes_to_explore: normalizeList(validated.dishes_to_explore, 35),
      mistakes_made: normalizeList(validated.mistakes_made, 35),
      proud_moments: normalizeList(validated.proud_moments, 35),
      what_to_change_next_time: normalizeList(validated.what_to_change_next_time, 35),
      source_links: normalizeLinks(validated.source_links),
      is_highlight: validated.is_highlight,
    })
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[updateChefJourneyEntry] Error:', error)
    throw new Error('Failed to update journal entry')
  }

  const entry = mapEntry(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_entry_updated',
    domain: 'operational',
    entityType: 'chef_journey_entry',
    entityId: entry.id,
    summary: `Updated journal entry: "${entry.title}"`,
    context: {
      journey_id: entry.journey_id,
      entry_type: entry.entry_type,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${entry.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${entry.journey_id}`)

  return { success: true, entry }
}

export async function deleteChefJourneyEntry(entryId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await fromChefJourneyEntries(db)
    .select('id, journey_id, title')
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId)
    .single()

  const { error } = await fromChefJourneyEntries(db)
    .delete()
    .eq('id', entryId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[deleteChefJourneyEntry] Error:', error)
    throw new Error('Failed to delete journal entry')
  }

  if (existing?.id) {
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'journey_entry_updated',
      domain: 'operational',
      entityType: 'chef_journey_entry',
      entityId: existing.id,
      summary: `Removed journal entry: "${existing.title || 'Untitled entry'}"`,
      context: {
        journey_id: existing.journey_id,
      },
    })
  }

  revalidatePath('/settings/journal')
  revalidatePath('/settings/journey')
  if (existing?.journey_id) {
    revalidatePath(`/settings/journal/${existing.journey_id}`)
    revalidatePath(`/settings/journey/${existing.journey_id}`)
  }
  return { success: true }
}

export async function createChefJourneyIdea(
  input: CreateChefJourneyIdeaInput
): Promise<{ success: true; idea: ChefJourneyIdea }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyIdeaSchema.parse(input)

  const adoptedOn =
    validated.status === 'adopted'
      ? validated.adopted_on || todayDateString()
      : validated.adopted_on

  const payload = {
    journey_id: validated.journey_id,
    tenant_id: user.tenantId,
    source_entry_id: validated.source_entry_id || null,
    created_by: user.id,
    title: validated.title.trim(),
    concept_notes: validated.concept_notes,
    application_area: validated.application_area,
    status: validated.status,
    priority: validated.priority,
    expected_impact: validated.expected_impact,
    test_plan: validated.test_plan,
    first_test_date: validated.first_test_date,
    adopted_on: adoptedOn,
    adopted_recipe_id: validated.adopted_recipe_id || null,
  }

  const { data, error } = await fromChefJourneyIdeas(db).insert(payload).select('*').single()

  if (error || !data) {
    console.error('[createChefJourneyIdea] Error:', error)
    throw new Error('Failed to create journal idea')
  }

  const idea = mapIdea(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: idea.status === 'adopted' ? 'journey_idea_adopted' : 'journey_idea_added',
    domain: 'operational',
    entityType: 'chef_journey_idea',
    entityId: idea.id,
    summary:
      idea.status === 'adopted'
        ? `Adopted journal idea: "${idea.title}"`
        : `Added journal idea: "${idea.title}"`,
    context: {
      journey_id: idea.journey_id,
      area: idea.application_area,
      status: idea.status,
      priority: idea.priority,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${idea.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${idea.journey_id}`)

  return { success: true, idea }
}

export async function updateChefJourneyIdea(
  ideaId: string,
  input: UpdateChefJourneyIdeaInput
): Promise<{ success: true; idea: ChefJourneyIdea }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyIdeaUpdateSchema.parse(input)

  const adoptedOn =
    validated.status === 'adopted' ? validated.adopted_on || todayDateString() : null

  const { data, error } = await fromChefJourneyIdeas(db)
    .update({
      source_entry_id: validated.source_entry_id || null,
      title: validated.title.trim(),
      concept_notes: validated.concept_notes,
      application_area: validated.application_area,
      status: validated.status,
      priority: validated.priority,
      expected_impact: validated.expected_impact,
      test_plan: validated.test_plan,
      first_test_date: validated.first_test_date,
      adopted_on: adoptedOn,
      adopted_recipe_id: validated.adopted_recipe_id || null,
    })
    .eq('id', ideaId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[updateChefJourneyIdea] Error:', error)
    throw new Error('Failed to update journal idea')
  }

  const idea = mapIdea(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: idea.status === 'adopted' ? 'journey_idea_adopted' : 'journey_idea_updated',
    domain: 'operational',
    entityType: 'chef_journey_idea',
    entityId: idea.id,
    summary:
      idea.status === 'adopted'
        ? `Marked idea as adopted: "${idea.title}"`
        : `Updated journal idea: "${idea.title}"`,
    context: {
      journey_id: idea.journey_id,
      area: idea.application_area,
      status: idea.status,
      priority: idea.priority,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${idea.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${idea.journey_id}`)

  return { success: true, idea }
}

export async function deleteChefJourneyIdea(ideaId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await fromChefJourneyIdeas(db)
    .select('id, journey_id, title')
    .eq('id', ideaId)
    .eq('tenant_id', user.tenantId)
    .single()

  const { error } = await fromChefJourneyIdeas(db)
    .delete()
    .eq('id', ideaId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[deleteChefJourneyIdea] Error:', error)
    throw new Error('Failed to delete journal idea')
  }

  if (existing?.journey_id) {
    revalidatePath(`/settings/journal/${existing.journey_id}`)
    revalidatePath(`/settings/journey/${existing.journey_id}`)
  }
  revalidatePath('/settings/journal')
  revalidatePath('/settings/journey')
  return { success: true }
}

export async function uploadChefJourneyPhoto(
  formData: FormData
): Promise<{ success: true; url: string }> {
  const user = await requireChef()
  const db = createServerClient({ admin: true })

  const file = formData.get('image') as File | null
  if (!file) throw new Error('No image file provided')

  if (!ALLOWED_JOURNAL_PHOTO_TYPES.includes(file.type)) {
    throw new Error('Invalid image type. Use JPEG, PNG, HEIC, or WebP')
  }
  if (file.size > MAX_JOURNAL_PHOTO_SIZE) {
    throw new Error(
      `Photo is too large. Maximum ${(MAX_JOURNAL_PHOTO_SIZE / 1024 / 1024).toFixed(0)}MB`
    )
  }

  const journeyIdRaw = formData.get('journey_id')
  if (typeof journeyIdRaw !== 'string') throw new Error('Missing journey id')
  const journeyId = z.string().uuid().parse(journeyIdRaw.trim())

  const entryIdRaw = formData.get('entry_id')
  const entryId =
    typeof entryIdRaw === 'string' && entryIdRaw.trim().length > 0
      ? z.string().uuid().parse(entryIdRaw.trim())
      : null

  await ensureJourneyBelongsToTenant(db, user.tenantId!, journeyId)
  if (entryId) {
    await ensureEntryBelongsToJourney(db, user.tenantId!, journeyId, entryId)
  }

  const ext = JOURNAL_PHOTO_MIME_TO_EXT[file.type] || 'jpg'
  const storagePath = `${user.tenantId}/${journeyId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const uploadFile = async () =>
    db.storage.from(CHEF_JOURNAL_MEDIA_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  let { error: uploadError } = await uploadFile()

  if (
    uploadError &&
    String((uploadError as any).message || '')
      .toLowerCase()
      .includes('bucket')
  ) {
    await ensureChefJournalMediaBucket(db)
    const retry = await uploadFile()
    uploadError = retry.error
  }

  if (uploadError) {
    console.error('[uploadChefJourneyPhoto] upload error:', uploadError)
    throw new Error('Failed to upload journal photo')
  }

  const { data: publicUrlData } = await db.storage
    .from(CHEF_JOURNAL_MEDIA_BUCKET)
    .getPublicUrl(storagePath)

  return { success: true, url: publicUrlData.publicUrl }
}

export async function createChefJourneyMedia(
  input: CreateChefJourneyMediaInput
): Promise<{ success: true; media: ChefJourneyMedia }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyMediaSchema.parse(input)

  if (validated.entry_id) {
    await ensureEntryBelongsToJourney(db, user.tenantId!, validated.journey_id, validated.entry_id)
  }

  const { data, error } = await fromChefJournalMedia(db)
    .insert({
      tenant_id: user.tenantId,
      created_by: user.id,
      journey_id: validated.journey_id,
      entry_id: validated.entry_id || null,
      media_type: validated.media_type,
      media_url: validated.media_url,
      caption: validated.caption,
      taken_on: validated.taken_on,
      location_label: validated.location_label.trim(),
      latitude: validated.latitude,
      longitude: validated.longitude,
      is_cover: validated.is_cover,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[createChefJourneyMedia] Error:', error)
    throw new Error('Failed to add journal media')
  }

  const media = mapMedia(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_media_added',
    domain: 'operational',
    entityType: 'chef_journal_media',
    entityId: media.id,
    summary: `Added ${media.media_type} to journal`,
    context: {
      journey_id: media.journey_id,
      entry_id: media.entry_id,
      has_location: media.latitude !== null && media.longitude !== null,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${media.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${media.journey_id}`)

  return { success: true, media }
}

export async function updateChefJourneyMedia(
  mediaId: string,
  input: UpdateChefJourneyMediaInput
): Promise<{ success: true; media: ChefJourneyMedia }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyMediaUpdateSchema.parse(input)

  const { data: existingMedia, error: existingMediaError } = await fromChefJournalMedia(db)
    .select('journey_id, media_url')
    .eq('id', mediaId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (existingMediaError || !existingMedia) {
    throw new Error('Journal media was not found')
  }

  if (validated.entry_id) {
    await ensureEntryBelongsToJourney(
      db,
      user.tenantId!,
      String((existingMedia as Record<string, unknown>).journey_id),
      validated.entry_id
    )
  }

  const { data, error } = await fromChefJournalMedia(db)
    .update({
      entry_id: validated.entry_id || null,
      media_type: validated.media_type,
      media_url: validated.media_url,
      caption: validated.caption,
      taken_on: validated.taken_on,
      location_label: validated.location_label.trim(),
      latitude: validated.latitude,
      longitude: validated.longitude,
      is_cover: validated.is_cover,
    })
    .eq('id', mediaId)
    .eq('tenant_id', user.tenantId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[updateChefJourneyMedia] Error:', error)
    throw new Error('Failed to update journal media')
  }

  const media = mapMedia(data as Record<string, unknown>)
  const previousUrl = String((existingMedia as Record<string, unknown>).media_url || '')
  if (previousUrl && previousUrl !== media.media_url) {
    const adminDb = createServerClient({ admin: true })
    await removeChefJournalMediaObject(adminDb, previousUrl)
  }

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_media_updated',
    domain: 'operational',
    entityType: 'chef_journal_media',
    entityId: media.id,
    summary: `Updated ${media.media_type} media in journal`,
    context: {
      journey_id: media.journey_id,
      entry_id: media.entry_id,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${media.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${media.journey_id}`)

  return { success: true, media }
}

export async function deleteChefJourneyMedia(mediaId: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await fromChefJournalMedia(db)
    .select('id, journey_id, media_type, media_url')
    .eq('id', mediaId)
    .eq('tenant_id', user.tenantId)
    .single()

  const { error } = await fromChefJournalMedia(db)
    .delete()
    .eq('id', mediaId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[deleteChefJourneyMedia] Error:', error)
    throw new Error('Failed to delete journal media')
  }

  if (existing?.id) {
    const adminDb = createServerClient({ admin: true })
    await removeChefJournalMediaObject(
      adminDb,
      String((existing as Record<string, unknown>).media_url || '')
    )

    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'journey_media_updated',
      domain: 'operational',
      entityType: 'chef_journal_media',
      entityId: existing.id,
      summary: `Removed ${existing.media_type || 'journal'} media`,
      context: {
        journey_id: existing.journey_id,
      },
    })
  }

  if (existing?.journey_id) {
    revalidatePath(`/settings/journal/${existing.journey_id}`)
    revalidatePath(`/settings/journey/${existing.journey_id}`)
  }
  revalidatePath('/settings/journal')
  revalidatePath('/settings/journey')

  return { success: true }
}

export async function createChefJourneyRecipeLink(
  input: CreateChefJourneyRecipeLinkInput
): Promise<{ success: true; recipeLink: ChefJourneyRecipeLink }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyRecipeLinkSchema.parse(input)

  await ensureRecipeBelongsToTenant(db, user.tenantId!, validated.recipe_id)
  if (validated.entry_id) {
    await ensureEntryBelongsToJourney(db, user.tenantId!, validated.journey_id, validated.entry_id)
  }

  const { data, error } = await fromChefJournalRecipeLinks(db)
    .insert({
      tenant_id: user.tenantId,
      created_by: user.id,
      journey_id: validated.journey_id,
      entry_id: validated.entry_id || null,
      recipe_id: validated.recipe_id,
      adaptation_notes: validated.adaptation_notes,
      outcome_notes: validated.outcome_notes,
      outcome_rating: validated.outcome_rating,
      first_tested_on: validated.first_tested_on,
      would_repeat: validated.would_repeat,
    })
    .select('*, recipes(name)')
    .single()

  if (error || !data) {
    console.error('[createChefJourneyRecipeLink] Error:', error)
    throw new Error('Failed to link recipe to journal')
  }

  const recipeLink = mapRecipeLink(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_recipe_linked',
    domain: 'operational',
    entityType: 'chef_journal_recipe_link',
    entityId: recipeLink.id,
    summary: `Linked recipe to journal: "${recipeLink.recipe_name || 'Recipe'}"`,
    context: {
      journey_id: recipeLink.journey_id,
      entry_id: recipeLink.entry_id,
      recipe_id: recipeLink.recipe_id,
      outcome_rating: recipeLink.outcome_rating,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${recipeLink.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${recipeLink.journey_id}`)

  return { success: true, recipeLink }
}

export async function updateChefJourneyRecipeLink(
  recipeLinkId: string,
  input: UpdateChefJourneyRecipeLinkInput
): Promise<{ success: true; recipeLink: ChefJourneyRecipeLink }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = JourneyRecipeLinkUpdateSchema.parse(input)

  const { data: existingRecipeLink, error: existingRecipeLinkError } =
    await fromChefJournalRecipeLinks(db)
      .select('journey_id')
      .eq('id', recipeLinkId)
      .eq('tenant_id', user.tenantId)
      .single()

  if (existingRecipeLinkError || !existingRecipeLink) {
    throw new Error('Journal recipe link was not found')
  }

  await ensureRecipeBelongsToTenant(db, user.tenantId!, validated.recipe_id)
  if (validated.entry_id) {
    await ensureEntryBelongsToJourney(
      db,
      user.tenantId!,
      String((existingRecipeLink as Record<string, unknown>).journey_id),
      validated.entry_id
    )
  }

  const { data, error } = await fromChefJournalRecipeLinks(db)
    .update({
      entry_id: validated.entry_id || null,
      recipe_id: validated.recipe_id,
      adaptation_notes: validated.adaptation_notes,
      outcome_notes: validated.outcome_notes,
      outcome_rating: validated.outcome_rating,
      first_tested_on: validated.first_tested_on,
      would_repeat: validated.would_repeat,
    })
    .eq('id', recipeLinkId)
    .eq('tenant_id', user.tenantId)
    .select('*, recipes(name)')
    .single()

  if (error || !data) {
    console.error('[updateChefJourneyRecipeLink] Error:', error)
    throw new Error('Failed to update journal recipe link')
  }

  const recipeLink = mapRecipeLink(data as Record<string, unknown>)

  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'journey_recipe_updated',
    domain: 'operational',
    entityType: 'chef_journal_recipe_link',
    entityId: recipeLink.id,
    summary: `Updated journal recipe link: "${recipeLink.recipe_name || 'Recipe'}"`,
    context: {
      journey_id: recipeLink.journey_id,
      recipe_id: recipeLink.recipe_id,
      outcome_rating: recipeLink.outcome_rating,
    },
  })

  revalidatePath('/settings/journal')
  revalidatePath(`/settings/journal/${recipeLink.journey_id}`)
  revalidatePath('/settings/journey')
  revalidatePath(`/settings/journey/${recipeLink.journey_id}`)

  return { success: true, recipeLink }
}

export async function deleteChefJourneyRecipeLink(
  recipeLinkId: string
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: existing } = await fromChefJournalRecipeLinks(db)
    .select('id, journey_id')
    .eq('id', recipeLinkId)
    .eq('tenant_id', user.tenantId)
    .single()

  const { error } = await fromChefJournalRecipeLinks(db)
    .delete()
    .eq('id', recipeLinkId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[deleteChefJourneyRecipeLink] Error:', error)
    throw new Error('Failed to delete journal recipe link')
  }

  if (existing?.journey_id) {
    revalidatePath(`/settings/journal/${existing.journey_id}`)
    revalidatePath(`/settings/journey/${existing.journey_id}`)
  }
  revalidatePath('/settings/journal')
  revalidatePath('/settings/journey')

  return { success: true }
}
