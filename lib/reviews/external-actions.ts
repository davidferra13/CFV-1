'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  type ExternalReviewProvider,
  syncExternalReviewSourceById,
  validateOwnedWebsiteUrls,
} from '@/lib/reviews/external-sync'

const ProviderSchema = z.enum(['google_places', 'website_jsonld'])

const BaseSourceSchema = z.object({
  provider: ProviderSchema,
  label: z.string().trim().min(2).max(80),
  active: z.boolean().optional().default(true),
  sync_interval_minutes: z.number().int().min(15).max(10080).optional().default(360),
})

const GoogleSourceSchema = BaseSourceSchema.extend({
  provider: z.literal('google_places'),
  place_id: z.string().trim().min(2).max(255),
  place_url: z.string().trim().url().optional().or(z.literal('')),
})

const WebsiteSourceSchema = BaseSourceSchema.extend({
  provider: z.literal('website_jsonld'),
  urls: z.array(z.string().trim().url()).min(1).max(20),
})

const CreateExternalReviewSourceSchema = z.discriminatedUnion('provider', [
  GoogleSourceSchema,
  WebsiteSourceSchema,
])

export type CreateExternalReviewSourceInput = z.infer<typeof CreateExternalReviewSourceSchema>

export type ExternalReviewSourceSummary = {
  id: string
  provider: ExternalReviewProvider
  label: string
  active: boolean
  syncIntervalMinutes: number
  config: Record<string, unknown>
  lastSyncedAt: string | null
  lastError: string | null
  createdAt: string
}

function toSummary(row: any): ExternalReviewSourceSummary {
  return {
    id: row.id,
    provider: row.provider as ExternalReviewProvider,
    label: row.label,
    active: Boolean(row.active),
    syncIntervalMinutes: Number(row.sync_interval_minutes || 360),
    config: (row.config || {}) as Record<string, unknown>,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
    createdAt: row.created_at,
  }
}

async function getChefWebsiteUrl(db: any, chefId: string) {
  const { data, error } = await db.from('chefs').select('website_url').eq('id', chefId).single()

  if (error) {
    throw new Error('Failed to load chef website URL for validation')
  }

  return typeof data?.website_url === 'string' ? data.website_url : null
}

export async function getExternalReviewSources(): Promise<ExternalReviewSourceSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('external_review_sources')
    .select(
      'id, provider, label, active, sync_interval_minutes, config, last_synced_at, last_error, created_at'
    )
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') return []
    console.error('[getExternalReviewSources] Error:', error)
    throw new Error('Failed to load external review sources')
  }

  return ((data || []) as any[]).map(toSummary)
}

export async function createExternalReviewSource(input: CreateExternalReviewSourceInput) {
  const user = await requireChef()
  const validated = CreateExternalReviewSourceSchema.parse(input)
  const db: any = createServerClient()

  let config: Record<string, unknown>

  if (validated.provider === 'google_places') {
    config = {
      place_id: validated.place_id.trim(),
      place_url: validated.place_url?.trim() || null,
    }
  } else {
    const chefWebsiteUrl = await getChefWebsiteUrl(db, user.entityId)
    const normalized = validateOwnedWebsiteUrls(chefWebsiteUrl, validated.urls)

    config = {
      urls: normalized.urls,
    }
  }

  const { error } = await db.from('external_review_sources').insert({
    tenant_id: user.tenantId,
    provider: validated.provider,
    label: validated.label,
    config,
    active: validated.active,
    sync_interval_minutes: validated.sync_interval_minutes,
    created_by: user.id,
  })

  if (error) {
    console.error('[createExternalReviewSource] Error:', error)
    if (error.code === '23505') {
      throw new Error('A source with this label already exists')
    }
    throw new Error('Failed to create external review source')
  }

  revalidatePath('/reviews')
  return { success: true }
}

export async function toggleExternalReviewSource(sourceId: string, active: boolean) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('external_review_sources')
    .update({ active })
    .eq('id', sourceId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[toggleExternalReviewSource] Error:', error)
    throw new Error('Failed to update source status')
  }

  revalidatePath('/reviews')
  return { success: true }
}

export async function deleteExternalReviewSource(sourceId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('external_review_sources')
    .delete()
    .eq('id', sourceId)
    .eq('tenant_id', user.tenantId)

  if (error) {
    console.error('[deleteExternalReviewSource] Error:', error)
    throw new Error('Failed to delete source')
  }

  revalidatePath('/reviews')
  return { success: true }
}

export async function syncExternalReviewSourceNow(sourceId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: source, error: sourceError } = await db
    .from('external_review_sources')
    .select('id')
    .eq('id', sourceId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (sourceError || !source) {
    throw new Error('External review source not found')
  }

  const result = await syncExternalReviewSourceById(sourceId, {
    admin: true,
    skipIntervalCheck: true,
  })

  revalidatePath('/reviews')
  return result
}

export async function syncAllExternalReviewSourcesForChef() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('external_review_sources')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('active', true)

  if (error) {
    console.error('[syncAllExternalReviewSourcesForChef] Source load error:', error)
    throw new Error('Failed to load external review sources')
  }

  const sourceIds = ((data || []) as Array<{ id: string }>).map((row) => row.id)

  const results = []
  for (const sourceId of sourceIds) {
    const result = await syncExternalReviewSourceById(sourceId, {
      admin: true,
      skipIntervalCheck: true,
    })
    results.push(result)
  }

  revalidatePath('/reviews')

  return {
    attempted: sourceIds.length,
    failed: results.filter((item) => item.error).length,
    pulled: results.reduce((sum, item) => sum + item.pulled, 0),
    upserted: results.reduce((sum, item) => sum + item.upserted, 0),
    results,
  }
}
